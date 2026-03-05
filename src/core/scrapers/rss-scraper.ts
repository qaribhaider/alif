import Parser from 'rss-parser';
import { BaseScraper, ScraperSource, ScraperResult, ScrapedArticle } from '../scraper-types.js';

export class RssScraper extends BaseScraper {
  private parser: Parser;

  constructor() {
    super();
    this.parser = new Parser();
  }

  async scrape(source: ScraperSource): Promise<ScraperResult> {
    try {
      const feed = await this.parser.parseURL(source.url);
      const items: ScrapedArticle[] = feed.items.map((item) => ({
        id: item.guid || item.link || `${source.id}-${item.title}`,
        title: item.title || 'No Title',
        url: item.link || '',
        content: item.contentSnippet || item.content || '',
        published_at: item.isoDate || item.pubDate,
        source: source.id,
      }));

      return { source: source.id, status: 'ok', items };
    } catch (error) {
      return {
        source: source.id,
        status: 'error',
        items: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
