import { Config } from './config-schema.js';
import { ScraperOrchestrator } from './orchestrator.js';
import { ScraperSource } from './scraper-types.js';
import { KeywordScorer } from './filters/keywords.js';
import { Deduplicator } from './filters/deduplicator.js';
import { ConsensusScorer } from './filters/consensus.js';
import { ArticleStore, AnalysedArticle } from '../db/article-store.js';
import { SourceHealthStore } from '../db/source-health-store.js';
import { Database } from 'better-sqlite3';
import { ProviderFactory } from '../providers/factory.js';
import { LLMProvider } from '../providers/llm/index.js';
import { DeliveryProvider, Digest } from '../providers/delivery/index.js';
import { BASE_KEYWORDS, NEGATIVE_KEYWORDS } from './default-keywords.js';

const LAYER2_CANDIDATE_LIMIT = 50;

export class Pipeline {
  private orchestrator: ScraperOrchestrator;
  private scorer: KeywordScorer;
  private negativeScorer: KeywordScorer;
  private consensus: ConsensusScorer;
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
    this.consensus = new ConsensusScorer();
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
        console.log(`[Pipeline] Skipping ${s.id} (last check was < ${cooldown}m ago)`);
        return false;
      }
      return true;
    });

    let enrichedItems: AnalysedArticle[] = [];
    const digestDate = new Date().toISOString().split('T')[0];
    let newItemsCount = 0;

    if (activeSources.length > 0) {
      console.log(`[Pipeline] Scraping ${activeSources.length} sources...`);
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
      console.log(`[Pipeline] Found ${allArticles.length} raw items.`);

      // Incremental filter
      const latestTimestamp = this.articleStore.getLatestTimestamp();
      let newItems = allArticles;
      if (latestTimestamp) {
        const lastTime = new Date(latestTimestamp).getTime();
        newItems = allArticles.filter((a) => {
          if (!a.published_at) return true;
          return new Date(a.published_at).getTime() > lastTime;
        });
      }
      newItemsCount = newItems.length;
      console.log(`[Pipeline] ${newItemsCount} new items after incremental filter.`);

      // Deduplication
      const unique = this.deduplicator.process(newItems);

      // --- LAYER 1: Keyword + Consensus - Negative ---
      const consensusBonuses = this.consensus.score(unique);
      const layer1Scored = unique.map((a) => {
        const positive = this.scorer.score(a);
        const negative = this.negativeScorer.score(a);
        const consensus = consensusBonuses.get(a.id) ?? 0;
        const layer1Score = Math.max(0, positive - negative + consensus);
        return { ...a, layer1Score };
      });

      console.log(`[Pipeline] Layer 1 scoring complete.`);

      // Select top candidates for Layer 2 (or final cut if Layer 2 disabled)
      const candidates = layer1Scored
        .sort((a, b) => b.layer1Score - a.layer1Score)
        .slice(0, LAYER2_CANDIDATE_LIMIT);

      let finalScored: ((typeof candidates)[0] & { finalScore: number })[];

      if (this.config.preferences.enableAIArticlesScoring) {
        // --- LAYER 2: LLM-based scoring ---
        console.log(`[Pipeline] Layer 2 AI scoring ${candidates.length} candidates...`);
        const layer2Scores = await this.llm.score(candidates.map((a) => a.title));

        // Log each title→score pair for auditability
        candidates.forEach((a, idx) => {
          const s = layer2Scores[idx] ?? 0;
          console.log(`  [L2] ${s.toString().padStart(3)}  ${a.title}`);
        });

        finalScored = candidates.map((a, idx) => {
          const layer2Score = layer2Scores[idx] ?? 0;
          // Average of both layers only when Layer 2 is enabled
          const finalScore = Math.round((a.layer1Score + layer2Score) / 2);
          return { ...a, finalScore };
        });
        console.log(`[Pipeline] Layer 2 complete.`);
      } else {
        // Layer 2 disabled — use Layer 1 score as-is
        finalScored = candidates.map((a) => ({ ...a, finalScore: a.layer1Score }));
      }

      // Apply signal threshold and take top N
      const highSignal = finalScored
        .filter((a) => a.finalScore >= this.config.preferences.signalThreshold)
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, this.config.preferences.maxItemsPerRun);

      console.log(`[Pipeline] ${highSignal.length} high-signal items selected.`);

      if (highSignal.length > 0) {
        // LLM Analysis (summarise + categorise)
        console.log('[Pipeline] Analyzing high-signal items with LLM...');
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

        // Persistence
        for (const item of enrichedItems) {
          this.articleStore.upsert({
            ...item,
            digest_date: digestDate,
            delivered: 0,
          });
        }
      } else {
        console.log('[Pipeline] No high-signal items in this batch.');
      }
    } else {
      console.log('[Pipeline] All sources are cooled down. Checking database for pending items...');
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
      console.log('[Pipeline] No high-signal items to deliver.');
      console.log('[Pipeline] Execution complete! 🚀');
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

    console.log(
      `[Pipeline] Delivering ${finalItemsToDeliver.length} items to ${this.delivery.length} channels...`,
    );

    const deliveryResults = await Promise.allSettled(this.delivery.map((d) => d.send(digest)));

    const successCount = deliveryResults.filter((r) => r.status === 'fulfilled').length;
    const failCount = deliveryResults.filter((r) => r.status === 'rejected').length;

    if (failCount > 0) {
      console.error(`[Pipeline] ${failCount} delivery channel(s) failed.`);
      deliveryResults.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[Pipeline] Channel ${i + 1} error:`, r.reason?.message ?? r.reason);
        }
      });
    }

    if (successCount > 0) {
      this.articleStore.markAsDelivered(finalItemsToDeliver.map((a) => a.id));
    }

    console.log('[Pipeline] Execution complete! 🚀');
    return finalItemsToDeliver;
  }
}
