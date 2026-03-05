import axios from 'axios';
import { BaseScraper, ScraperSource, ScraperResult, ScrapedArticle } from '../scraper-types.js';

export class ApiScraper extends BaseScraper {
  async scrape(source: ScraperSource): Promise<ScraperResult> {
    try {
      const response = await axios.get(source.url);
      const data = response.data;
      let items: ScrapedArticle[] = [];

      // Specialized logic based on source ID for common APIs
      if (source.id === 'hn') {
        items = data.hits.map((hit: any) => ({
          id: hit.objectID,
          title: hit.title,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          content: hit.story_text || '',
          published_at: hit.created_at,
          source: source.id,
        }));
      } else if (source.id.startsWith('arxiv')) {
        // ArXiv returns XML/Atom, but we'll assume the URL handles it or use a specific XML parser if needed.
        // For brevity in this generic API scraper, we'll keep it simple.
        // In a real scenario, we'd use a dedicated library or cheerio for XML.
        return {
          source: source.id,
          status: 'error',
          items: [],
          error: 'ArXiv requires specialized XML parsing',
        };
      } else {
        return { source: source.id, status: 'error', items: [], error: 'Unsupported API source' };
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
