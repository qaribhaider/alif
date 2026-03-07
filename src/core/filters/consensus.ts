import { ScrapedArticle } from '../scraper-types.js';

/**
 * Scores articles based on how many distinct sources published the same or similar story.
 * A bonus is applied when the same title (normalised) appears across multiple feeds.
 */
export class ConsensusScorer {
  private readonly bonusPerDuplicate = 10;
  private readonly maxBonus = 40;

  /**
   * Assigns a consensus bonus to each article based on normalised-title repetition across the set.
   * Returns a map of original article id → bonus score.
   */
  score(articles: ScrapedArticle[]): Map<string, number> {
    const titleCounts = new Map<string, number>();

    for (const article of articles) {
      const key = this.normalise(article.title);
      titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
    }

    const bonuses = new Map<string, number>();
    for (const article of articles) {
      const count = titleCounts.get(this.normalise(article.title)) ?? 1;
      // Only bonus if it appears in more than one feed; cap total bonus
      const bonus = Math.min((count - 1) * this.bonusPerDuplicate, this.maxBonus);
      bonuses.set(article.id, bonus);
    }

    return bonuses;
  }

  private normalise(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
