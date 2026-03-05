import axios from 'axios';
import { BaseScraper, ScraperSource, ScraperResult, ScrapedArticle } from '../scraper-types.js';

export class JsonScraper extends BaseScraper {
  async scrape(source: ScraperSource): Promise<ScraperResult> {
    try {
      const response = await axios.get(source.url);
      const data = response.data;
      let items: ScrapedArticle[] = [];

      if (source.mapping) {
        // Generic JSON array mapping
        const list = Array.isArray(data) ? data : data[source.mapping.items || 'items'];
        if (Array.isArray(list)) {
          items = list.map((item: any, index: number) => ({
            id: item.id || `json-${source.id}-${index}`,
            title: item[source.mapping!.title || 'title'] || 'No Title',
            url: item[source.mapping!.url || 'url'] || source.url,
            content: item[source.mapping!.content || 'content'] || '',
            published_at: item[source.mapping!.published_at || 'date'] || new Date().toISOString(),
            source: source.id,
          }));
        }
      } else if (source.id.startsWith('reddit')) {
        items = data.data.children.map((child: any) => {
          const post = child.data;
          return {
            id: post.name,
            title: post.title,
            url: post.url.startsWith('/') ? `https://reddit.com${post.url}` : post.url,
            content: post.selftext || '',
            published_at: new Date(post.created_utc * 1000).toISOString(),
            source: source.id,
          };
        });
      } else {
        return {
          source: source.id,
          status: 'error',
          items: [],
          error: 'Unsupported JSON source or missing mapping',
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
