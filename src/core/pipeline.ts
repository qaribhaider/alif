import { Config } from './config-schema.js';
import { ScraperOrchestrator } from './orchestrator.js';
import { ScraperSource } from './scraper-types.js';
import { KeywordScorer } from './filters/keywords.js';
import { Deduplicator } from './filters/deduplicator.js';
import { ArticleStore } from '../db/article-store.js';
import { SourceHealthStore } from '../db/source-health-store.js';
import { Database } from 'better-sqlite3';
import { ProviderFactory } from '../providers/factory.js';
import { LLMProvider } from '../providers/llm/index.js';
import { DeliveryProvider, Digest } from '../providers/delivery/index.js';

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
    // Hardcoded keywords for now, can be moved to config later
    this.scorer = new KeywordScorer({
      breakthrough: 20,
      'gpt-5': 30,
      o1: 20,
      deepseek: 25,
      'open source': 15,
      agi: 15,
      agent: 15,
    });
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

    if (activeSources.length === 0) {
      console.log('[Pipeline] All sources are cooled down. Nothing to scrape.');
      return [];
    }

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

    console.log(`[Pipeline] ${newItems.length} new items after incremental filter.`);

    // Scoring & Deduplication
    const unique = this.deduplicator.process(newItems);
    const highSignal = unique
      .map((a) => ({ ...a, score: this.scorer.score(a) }))
      .filter((a) => a.score >= this.config.preferences.signalThreshold)
      .sort((a, b) => b.score - a.score);

    console.log(`[Pipeline] ${highSignal.length} high-signal items selected.`);

    if (highSignal.length === 0) {
      console.log('[Pipeline] No high-signal items found today.');
      console.log('[Pipeline] Execution complete! 🥂');
      return [];
    }

    // LLM Analysis
    console.log('[Pipeline] Analyzing high-signal items with LLM...');
    const analysisResults = await this.llm.analyze(
      highSignal.map((a) => ({ title: a.title, content: a.content })),
    );

    const enrichedItems = highSignal.map((article, idx) => ({
      ...article,
      summary: analysisResults[idx]?.summary || null,
      category: analysisResults[idx]?.category || 'Uncategorized',
    }));

    // Persistence
    const digestDate = new Date().toISOString().split('T')[0];
    for (const item of enrichedItems) {
      this.articleStore.upsert({
        ...item,
        digest_date: digestDate,
      } as any); // still using any here because Article requires some DB-specific fields
    }

    // Delivery
    const digest: Digest = {
      items: enrichedItems.map((item) => ({
        title: item.title,
        url: item.url,
        summary: item.summary,
        category: item.category,
        source: item.source,
        score: item.score,
      })),
      metadata: {
        total_new_items: newItems.length,
        total_selected: enrichedItems.length,
        date: digestDate,
      },
    };

    console.log(`[Pipeline] Delivering to ${this.delivery.length} channels...`);
    await Promise.all(this.delivery.map((d) => d.send(digest)));

    console.log('[Pipeline] Execution complete! 🥂');
    return enrichedItems;
  }
}
