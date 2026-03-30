import { Config } from './config-schema.js';
import { ScraperOrchestrator } from './orchestrator.js';
import { ScraperSource } from './scraper-types.js';
import { KeywordScorer } from './filters/keywords.js';
import { Deduplicator } from './filters/deduplicator.js';

import { ArticleStore, AnalysedArticle } from '../db/article-store.js';
import { SourceHealthStore } from '../db/source-health-store.js';
import { Database } from 'better-sqlite3';
import { ProviderFactory } from '../providers/factory.js';
import { LLMProvider } from '../providers/llm/index.js';
import { DeliveryProvider, Digest } from '../providers/delivery/index.js';
import { BASE_KEYWORDS, NEGATIVE_KEYWORDS } from './default-keywords.js';
import { logger } from './logger.js';

const LAYER2_CANDIDATE_LIMIT = 25;

export class Pipeline {
  private orchestrator: ScraperOrchestrator;
  private scorer: KeywordScorer;
  private negativeScorer: KeywordScorer;

  private deduplicator: Deduplicator;
  private articleStore: ArticleStore;
  private healthStore: SourceHealthStore;
  private llm: LLMProvider;
  private delivery: DeliveryProvider[];

  constructor(
    private config: Config,
    db: Database,
  ) {
    this.orchestrator = new ScraperOrchestrator();

    const mergedKeywords = {
      ...BASE_KEYWORDS,
      ...(config.preferences.customKeywords || {}),
    };
    const mergedNegative = {
      ...NEGATIVE_KEYWORDS,
      ...(config.preferences.negativeKeywords || {}),
    };

    this.scorer = new KeywordScorer(mergedKeywords);
    this.negativeScorer = new KeywordScorer(mergedNegative);

    this.deduplicator = new Deduplicator();
    this.articleStore = new ArticleStore(db);
    this.healthStore = new SourceHealthStore(db);
    this.llm = ProviderFactory.createLLM(config);
    this.delivery = ProviderFactory.createDelivery(config);
  }

  async run(sources: ScraperSource[], force = false) {
    const cooldown = this.config.preferences.sourceCooldownMinutes;
    const activeSources = sources.filter((s) => {
      if (!force && this.healthStore.isThrottled(s.id, cooldown)) {
        logger.debug(`Skipping ${s.id} (last check was < ${cooldown}m ago)`);
        return false;
      }
      return true;
    });

    let enrichedItems: AnalysedArticle[] = [];
    const digestDate = new Date().toISOString().split('T')[0];
    let newItemsCount = 0;

    if (activeSources.length > 0) {
      logger.info(`Scraping ${activeSources.length} sources...`);
      const results = await this.orchestrator.runAll(activeSources);

      // Record health
      for (const res of results) {
        this.healthStore.record({
          source: res.source,
          status: res.status,
          items_found: res.items.length,
          error_message: res.error,
        });
      }

      const allArticles = results.flatMap((r) => r.items);
      logger.info(`Found ${allArticles.length} raw items.`);

      // --- Freshness & Incremental Filter ---
      const now = Date.now();
      const maxAgeMs = (this.config.preferences.maxArticleAgeDays ?? 14) * 24 * 60 * 60 * 1000;
      const latestTimestamp = this.articleStore.getLatestTimestamp();
      const lastTime = latestTimestamp ? new Date(latestTimestamp).getTime() : 0;

      const freshItems = allArticles.filter((a) => {
        if (!a.published_at) return true; // Keep if unknown, but prioritize fresh
        const pubTime = new Date(a.published_at).getTime();
        const ageMs = now - pubTime;

        // Must be newer than max allowed age AND newer than what we already have in DB
        return ageMs <= maxAgeMs && pubTime > lastTime;
      });

      newItemsCount = freshItems.length;
      logger.info(`${newItemsCount} items passed freshness filter.`);

      // Deduplication (Exact URL/Title mapping)
      const unique = this.deduplicator.removeExactDuplicates(freshItems);

      // --- LAYER 1: Keyword Scoring + Normalization ---
      const SCORE_CAP = 150; // Normalize raw points to 0-100 range
      const ELITE_SOURCES = ['openai', 'deepmind', 'anthropic', 'google_ai', 'meta'];

      const layer1Scored = unique.map((a) => {
        const positive = this.scorer.score(a);
        const negative = this.negativeScorer.score(a);

        // Find curation boost (base curationScore + elite bonus)
        const sourceConfig = activeSources.find((f) => f.id === a.source);
        let curationBase = sourceConfig?.curationScore ?? 50;
        if (ELITE_SOURCES.includes(a.source)) curationBase += 10;

        const curationBoost = curationBase / 10;

        const rawNet = Math.max(0, positive - negative + curationBoost);
        // Map raw score to 0-100 (Normalization)
        const layer1Score = Math.round(Math.min(100, (rawNet / SCORE_CAP) * 100));

        return { ...a, layer1Score };
      });

      logger.info(`Layer 1 scoring complete — ${layer1Scored.length} candidates ranked.`);

      // --- Semantic (Fuzzy) Deduplication (All items) ---
      // We perform deduplication across ALL candidates before pruning to ensure
      // an authoritative (but subtle) title from an elite source isn't
      // accidentally pruned while its noisy synonym is kept.
      const authoritySorted = [...layer1Scored].sort((a, b) => {
        const aConfig = activeSources.find((f) => f.id === a.source);
        const bConfig = activeSources.find((f) => f.id === b.source);
        const aCuration =
          (aConfig?.curationScore ?? 0) + (ELITE_SOURCES.includes(a.source) ? 10 : 0);
        const bCuration =
          (bConfig?.curationScore ?? 0) + (ELITE_SOURCES.includes(b.source) ? 10 : 0);
        return bCuration - aCuration || b.layer1Score - a.layer1Score;
      });

      const uniqueSemantic = this.deduplicator.removeFuzzyDuplicates(authoritySorted);
      logger.info(`Fuzzy deduplication complete — ${uniqueSemantic.length} unique topics found.`);

      // --- Pruning to Top Candidates ---
      // Take top 150 strictly by Layer 1 score for the final topic-claiming pass
      const sortedL1 = uniqueSemantic.sort((a, b) => b.layer1Score - a.layer1Score).slice(0, 150);
      logger.info(`Pruned to top ${sortedL1.length} candidates for final topic-claiming pass.`);

      // --- Advanced Topic Deduplication (Source-Aware) ---
      // Re-sort by source quality so elite sources "claim" topics first in the final batch.
      const topicSourceSorted = sortedL1.sort((a, b) => {
        const aConfig = activeSources.find((f) => f.id === a.source);
        const bConfig = activeSources.find((f) => f.id === b.source);
        const aCuration =
          (aConfig?.curationScore ?? 0) + (ELITE_SOURCES.includes(a.source) ? 10 : 0);
        const bCuration =
          (bConfig?.curationScore ?? 0) + (ELITE_SOURCES.includes(b.source) ? 10 : 0);
        return bCuration - aCuration || b.layer1Score - a.layer1Score;
      });

      const uniqueCandidates: typeof topicSourceSorted = [];
      const seenKeywords = new Set<string>();
      const keywordList = Object.keys(this.scorer.getKeywords());

      for (const item of topicSourceSorted) {
        if (uniqueCandidates.length >= LAYER2_CANDIDATE_LIMIT) break;

        const text = `${item.title} ${item.content || ''}`.toLowerCase();
        const matches = keywordList.filter((kw) => text.includes(kw.toLowerCase()));

        // If it only matches keywords we already saw from BETTER sources, skip it.
        const isTopicDupe = matches.length > 0 && matches.every((kw) => seenKeywords.has(kw));

        if (!isTopicDupe) {
          uniqueCandidates.push(item);
          matches.forEach((kw) => seenKeywords.add(kw));
        } else {
          logger.debug(
            `[Dedupe] Avoiding "${item.title}" (topic already claimed by high-score source)`,
          );
        }
      }

      const candidates = uniqueCandidates;

      let finalScored: ((typeof candidates)[0] & { finalScore: number })[];

      if (this.config.preferences.enableAIArticlesScoring) {
        // --- LAYER 2: LLM-based reasoning ---
        // We allow some "meta-heavy" items to pass to LLM if they are borderline (rawNeg <= 20)
        const needsLLM = candidates.filter((a) => this.negativeScorer.score(a) <= 20);
        const preZeroed = candidates.filter((a) => this.negativeScorer.score(a) > 20);

        logger.info(
          `Layer 2 AI scoring ${needsLLM.length} candidates (${preZeroed.length} pre-zeroed by negative keywords)...`,
        );

        const layer2Map = new Map<string, number>(preZeroed.map((a) => [a.id, 0]));

        if (needsLLM.length > 0) {
          const layer2Scores: number[] = [];
          const BATCH_SIZE = 10;

          for (let i = 0; i < needsLLM.length; i += BATCH_SIZE) {
            const batch = needsLLM.slice(i, i + BATCH_SIZE);
            try {
              const batchScores = await this.llm.score(batch.map((a) => a.title));
              // Ensure we align scores, padding with 0 if LLM returned too few
              layer2Scores.push(...batch.map((_, idx) => batchScores[idx] ?? 0));
            } catch (err: any) {
              logger.error(`!!! LLM Scoring Failed for batch: ${err?.message || String(err)}`);
              layer2Scores.push(...batch.map(() => 0));
            }
          }

          needsLLM.forEach((a, idx) => {
            const s = layer2Scores[idx] ?? 0;
            logger.debug(`  [L2] ${s.toString().padStart(3)}  ${a.title}`);
            layer2Map.set(a.id, s);
          });
        }

        finalScored = candidates.map((a) => {
          const layer2Score = layer2Map.get(a.id) ?? 0;
          // Final Weight: 40% Keywords (L1) / 60% AI Reasoning (L2)
          const finalScore = Math.round(a.layer1Score * 0.4 + layer2Score * 0.6);
          return { ...a, finalScore };
        });
        logger.success(`Layer 2 reasoning complete.`);
      } else {
        finalScored = candidates.map((a) => ({ ...a, finalScore: a.layer1Score }));
        logger.info(`Layer 2 skipped (AI scoring disabled).`);
      }

      // Apply signal threshold and take top N
      const highSignal = finalScored
        .filter((a) => a.finalScore >= this.config.preferences.signalThreshold)
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, this.config.preferences.maxItemsPerRun);

      logger.info(`${highSignal.length} high-signal items selected.`);

      if (highSignal.length > 0) {
        logger.info(`Analyzing ${highSignal.length} items with LLM...`);
        const analysisResults = await this.llm.analyze(
          highSignal.map((a) => ({ title: a.title, content: a.content })),
          { sequential: this.config.preferences.sequentialAnalysis },
        );

        enrichedItems = highSignal.map((article, idx) => ({
          ...article,
          score: article.finalScore,
          summary: analysisResults[idx]?.summary || null,
          category: analysisResults[idx]?.category || 'Uncategorized',
        }));

        for (const item of enrichedItems) {
          this.articleStore.upsert({
            ...item,
            digest_date: digestDate,
            delivered: 0,
          });
        }
      } else {
        logger.warn(`No high-signal items in this batch.`);
      }
    } else {
      logger.info(`All sources cooled down — checking database for pending items...`);
    }

    // Build Final Digest (Current + Pending from last 24h)
    const pendingItems = this.articleStore.getPendingHighSignal(
      this.config.preferences.signalThreshold,
      24,
    );

    const allToDeliverMap = new Map();
    for (const item of pendingItems) allToDeliverMap.set(item.id, item);
    for (const item of enrichedItems) allToDeliverMap.set(item.id, item);

    const finalItemsToDeliver = Array.from(allToDeliverMap.values());

    if (finalItemsToDeliver.length === 0) {
      logger.warn(`Nothing to deliver.`);
      logger.success(`Execution complete! 🚀`);
      return [];
    }

    const digest: Digest = {
      items: finalItemsToDeliver.map((item) => ({
        title: item.title,
        url: item.url,
        summary: item.summary,
        category: item.category,
        source: item.source,
        score: item.score,
      })),
      metadata: {
        total_new_items: newItemsCount,
        total_selected: finalItemsToDeliver.length,
        date: digestDate,
      },
    };

    logger.info(
      `Delivering ${finalItemsToDeliver.length} items to ${this.delivery.length} channel(s)...`,
    );

    const deliveryResults = await Promise.allSettled(this.delivery.map((d) => d.send(digest)));

    const successCount = deliveryResults.filter((r) => r.status === 'fulfilled').length;
    const failCount = deliveryResults.filter((r) => r.status === 'rejected').length;

    if (failCount > 0) {
      deliveryResults.forEach((r, i) => {
        if (r.status === 'rejected') {
          logger.error(`Channel ${i + 1} failed: ${r.reason?.message ?? r.reason}`);
        }
      });
    }

    if (successCount > 0) {
      this.articleStore.markAsDelivered(finalItemsToDeliver.map((a) => a.id));
      logger.success(`Delivered to ${successCount} channel(s) successfully.`);
    }

    logger.success(`Execution complete! 🚀`);
    return finalItemsToDeliver;
  }
}
