import { ScrapedArticle } from '../scraper-types.js';

export interface DeduplicatorOptions {
  similarityThreshold?: number;
}

export class Deduplicator {
  constructor(private options: DeduplicatorOptions = {}) {}

  process(articles: ScrapedArticle[]): ScrapedArticle[] {
    const unique = new Map<string, ScrapedArticle>();

    for (const article of articles) {
      // Primary key: URL (simplified)
      const urlKey = this.normalizeUrl(article.url);

      if (!unique.has(urlKey)) {
        unique.set(urlKey, article);
      } else {
        // If we have an existing one, keep the one with content if possible
        const existing = unique.get(urlKey)!;
        if (!existing.content && article.content) {
          unique.set(urlKey, article);
        }
      }
    }

    return Array.from(unique.values());
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch {
      return url;
    }
  }
}
