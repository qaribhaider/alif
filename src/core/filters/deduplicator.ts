import { ScrapedArticle } from '../scraper-types.js';
// @ts-expect-error - no types available for talisman
import fingerprint from 'talisman/keyers/fingerprint';
// @ts-expect-error - no types available for talisman
import dice from 'talisman/metrics/dice';

export interface DeduplicatorOptions {
  similarityThreshold?: number; // Dice coefficient threshold (0 to 1). Default is 0.7.
}

export class Deduplicator {
  private threshold: number;

  constructor(options: DeduplicatorOptions = {}) {
    this.threshold = options.similarityThreshold ?? 0.7;
  }

  process<T extends ScrapedArticle>(articles: T[]): T[] {
    const exact = this.removeExactDuplicates(articles);
    return this.removeFuzzyDuplicates(exact);
  }

  removeExactDuplicates<T extends ScrapedArticle>(articles: T[]): T[] {
    // Pass 1: Deduplicate by URL
    const uniqueByUrl = new Map<string, T>();

    for (const article of articles) {
      const urlKey = this.normalizeUrl(article.url);
      const existing = uniqueByUrl.get(urlKey);

      if (!existing || (!existing.content && article.content)) {
        uniqueByUrl.set(urlKey, article);
      }
    }

    const urledArticles = Array.from(uniqueByUrl.values());

    // Pass 2: Deduplicate by Talisman fingerprint (O(N) clustering)
    // The fingerprint keyer normalizes, lowercases, unique-ifies, and sorts words.
    // E.g. "Tesla buys Twitter" -> "buys tesla twitter"
    // "Twitter bought by Tesla" might be different, but "Tesla buys Twitter!" is identical.
    const blocks = new Map<string, T[]>();

    for (const article of urledArticles) {
      const key = fingerprint(article.title) as string;
      if (!blocks.has(key)) blocks.set(key, []);
      blocks.get(key)!.push(article);
    }

    const fingerprintedUnique: T[] = [];
    for (const [, block] of blocks) {
      // Prefer one with content, otherwise take the first
      let best = block[0];
      if (!best.content) {
        const withContent = block.find((a) => !!a.content);
        if (withContent) best = withContent;
      }
      fingerprintedUnique.push(best);
    }

    return fingerprintedUnique;
  }

  removeFuzzyDuplicates<T extends ScrapedArticle>(articles: T[]): T[] {
    // Pass 3: Fuzzy Deduplicate by Title (using Talisman's Dice coefficient)
    // This is O(N^2), so Pipeline should only run this on the top N candidates.
    const finalUnique: T[] = [];
    const cache = new Map<string, string>(); // Cache normalized titles for dice

    for (const article of articles) {
      const normalizedTitle = this.normalizeTitle(article.title);
      cache.set(article.id, normalizedTitle);

      const duplicateIdx = finalUnique.findIndex((existing) => {
        const existingTitle = cache.get(existing.id)!;
        return dice(normalizedTitle, existingTitle) >= this.threshold;
      });

      if (duplicateIdx === -1) {
        finalUnique.push(article);
      } else {
        const saved = finalUnique[duplicateIdx];
        if (!saved.content && article.content) {
          finalUnique[duplicateIdx] = article;
        }
      }
    }

    return finalUnique;
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch {
      return url;
    }
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '') // Keep alphanumeric and spaces
      .replace(/\s+/g, ' ') // Condense multiple spaces
      .trim();
  }
}
