import { ScrapedArticle } from '../scraper-types.js';

export class KeywordScorer {
  constructor(private keywords: Record<string, number>) {}

  score(article: ScrapedArticle): number {
    let score = 0;
    const text = `${article.title} ${article.content || ''}`.toLowerCase();

    for (const [keyword, weight] of Object.entries(this.keywords)) {
      if (text.includes(keyword.toLowerCase())) {
        score += weight;
      }
    }

    return score;
  }
}
