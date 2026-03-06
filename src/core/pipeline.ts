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
import { BASE_KEYWORDS } from './default-keywords.js';

export class Pipeline {
  private orchestrator: ScraperOrchestrator;
  private scorer: KeywordScorer;
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
    this.scorer = new KeywordScorer(mergedKeywords);

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

      // Filtering
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

      // Scoring & Deduplication
      const unique = this.deduplicator.process(newItems);
      const highSignal = unique
        .map((a) => ({ ...a, score: this.scorer.score(a) }))
        .filter((a) => a.score >= this.config.preferences.signalThreshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, this.config.preferences.maxItemsPerRun);

      console.log(`[Pipeline] ${highSignal.length} high-signal items selected.`);

      if (highSignal.length > 0) {
        // LLM Analysis
        console.log('[Pipeline] Analyzing high-signal items with LLM...');
        const analysisResults = await this.llm.analyze(
          highSignal.map((a) => ({ title: a.title, content: a.content })),
          { sequential: this.config.preferences.sequentialAnalysis },
        );

        enrichedItems = highSignal.map((article, idx) => ({
          ...article,
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

    // 5. Build Final Digest (Current + Pending from last 24h)
    const pendingItems = this.articleStore.getPendingHighSignal(
      this.config.preferences.signalThreshold,
      24,
    );

    // Merge and deduplicate by ID (latest run wins)
    const allToDeliverMap = new Map();
    for (const item of pendingItems) allToDeliverMap.set(item.id, item);
    for (const item of enrichedItems) allToDeliverMap.set(item.id, item);

    const finalItemsToDeliver = Array.from(allToDeliverMap.values());

    if (finalItemsToDeliver.length === 0) {
      console.log('[Pipeline] No high-signal items to deliver.');
      console.log('[Pipeline] Execution complete! 🚀');
      return [];
    }

    // Delivery
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

    // Only mark as delivered if at least one channel succeeded
    if (successCount > 0) {
      this.articleStore.markAsDelivered(finalItemsToDeliver.map((a) => a.id));
    }

    console.log('[Pipeline] Execution complete! 🚀');
    return finalItemsToDeliver;
  }
}
