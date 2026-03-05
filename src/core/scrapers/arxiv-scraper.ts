import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, ScraperSource, ScraperResult, ScrapedArticle } from '../scraper-types.js';

export class ArxivScraper extends BaseScraper {
  async scrape(source: ScraperSource): Promise<ScraperResult> {
    try {
      const response = await axios.get(source.url);
      const $ = cheerio.load(response.data, { xmlMode: true });
      const items: ScrapedArticle[] = [];

      $('entry').each((_, el) => {
        const $el = $(el);
        const url = $el.find('id').text().trim();
        items.push({
          id: url,
          title: $el.find('title').text().trim().replace(/\s+/g, ' '),
          url,
          content: $el.find('summary').text().trim().replace(/\s+/g, ' '),
          published_at: $el.find('published').text().trim(),
          source: source.id,
        });
      });

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
