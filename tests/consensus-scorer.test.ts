import { describe, it, expect } from 'vitest';
import { ConsensusScorer } from '../src/core/filters/consensus.js';
import { ScrapedArticle } from '../src/core/scraper-types.js';

const makeArticle = (
  overrides: Partial<ScrapedArticle> & { id: string; title: string },
): ScrapedArticle => ({
  url: `https://example.com/${overrides.id}`,
  source: 'test-source',
  ...overrides,
});

describe('ConsensusScorer', () => {
  it('should return 0 bonus for unique articles', () => {
    const scorer = new ConsensusScorer();
    const articles = [
      makeArticle({ id: 'a1', title: 'OpenAI releases GPT-5' }),
      makeArticle({ id: 'a2', title: 'DeepSeek V4 announced' }),
    ];
    const bonuses = scorer.score(articles);
    expect(bonuses.get('a1')).toBe(0);
    expect(bonuses.get('a2')).toBe(0);
  });

  it('should give a bonus to articles with duplicate titles across feeds', () => {
    const scorer = new ConsensusScorer();
    const articles = [
      makeArticle({ id: 'a1', title: 'OpenAI releases GPT-5', source: 'techcrunch' }),
      makeArticle({ id: 'a2', title: 'OpenAI releases GPT-5', source: 'verge' }),
      makeArticle({ id: 'a3', title: 'OpenAI releases GPT-5', source: 'hn' }),
    ];
    const bonuses = scorer.score(articles);
    // 2 duplicates × 10 bonus per duplicate = 20
    expect(bonuses.get('a1')).toBe(20);
    expect(bonuses.get('a2')).toBe(20);
    expect(bonuses.get('a3')).toBe(20);
  });

  it('should cap the bonus at 40', () => {
    const scorer = new ConsensusScorer();
    // 10 articles with the same title = 9 duplicates × 10 = 90, but capped at 40
    const articles = Array.from({ length: 10 }, (_, i) =>
      makeArticle({ id: `a${i}`, title: 'Same title', source: `source-${i}` }),
    );
    const bonuses = scorer.score(articles);
    expect(bonuses.get('a0')).toBe(40);
  });

  it('should normalise titles before comparing (punctuation/casing)', () => {
    const scorer = new ConsensusScorer();
    const articles = [
      makeArticle({ id: 'a1', title: 'OpenAI Releases GPT-5!' }),
      makeArticle({ id: 'a2', title: 'openai releases gpt5' }),
    ];
    const bonuses = scorer.score(articles);
    // Both normalise to the same string
    expect(bonuses.get('a1')).toBe(10);
    expect(bonuses.get('a2')).toBe(10);
  });
});
