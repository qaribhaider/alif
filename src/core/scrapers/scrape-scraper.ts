import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseScraper, ScraperSource, ScraperResult, ScrapedArticle } from '../scraper-types.js';

export class ScrapeScraper extends BaseScraper {
  async scrape(source: ScraperSource): Promise<ScraperResult> {
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AlifBot/1.0)',
        },
      });
      const $ = cheerio.load(response.data);
      const items: ScrapedArticle[] = [];

      if (source.id === 'github_trending') {
        $('.Box-row').each((_, el) => {
          const $el = $(el);
          const title = $el.find('h2 a').text().trim().replace(/\s+/g, ' ');
          const url = 'https://github.com' + $el.find('h2 a').attr('href');
          const content = $el.find('p').text().trim();

          items.push({
            id: url,
            title,
            url,
            content,
            source: source.id,
          });
        });
      } else {
        return {
          source: source.id,
          status: 'error',
          items: [],
          error: 'Unsupported scraping source',
        };
      }

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
