import { ScraperSource, ScraperResult, BaseScraper } from './scraper-types.js';
import { RssScraper } from './scrapers/rss-scraper.js';
import { ArxivScraper } from './scrapers/arxiv-scraper.js';
import { ApiScraper } from './scrapers/api-scraper.js';
import { ScrapeScraper } from './scrapers/scrape-scraper.js';
import { JsonScraper } from './scrapers/json-scraper.js';

export class ScraperOrchestrator {
  private scrapers: Record<string, BaseScraper> = {};

  constructor() {
    this.scrapers.rss = new RssScraper();
    this.scrapers.arxiv = new ArxivScraper();
    this.scrapers.api = new ApiScraper();
    this.scrapers.scrape = new ScrapeScraper();
    this.scrapers.json = new JsonScraper();
  }

  async runAll(sources: ScraperSource[]): Promise<ScraperResult[]> {
    const tasks = sources.map((source) => {
      let scraper: BaseScraper | undefined;

      // Priority 1: Match by ID for specialized logic in reference
      if (source.id === 'hn') scraper = this.scrapers.api;
      else if (source.id === 'github_trending') scraper = this.scrapers.scrape;
      else if (source.id.startsWith('arxiv')) scraper = this.scrapers.arxiv;
      else if (source.id.startsWith('reddit')) scraper = this.scrapers.json;

      // Priority 2: Use explicitly defined type
      if (!scraper) {
        scraper = this.scrapers[source.type];
      }

      if (!scraper) {
        return Promise.resolve({
          source: source.id,
          status: 'error',
          items: [],
          error: `No scraper found for type: ${source.type}`,
        } as ScraperResult);
      }
      return scraper.scrape(source);
    });

    return Promise.all(tasks);
  }
}
