import { describe, it, expect } from 'vitest';
import { Deduplicator } from '../src/core/filters/deduplicator.js';
import { ScrapedArticle } from '../src/core/scraper-types.js';

describe('Deduplicator', () => {
  const createMockArticle = (
    id: string,
    url: string,
    title: string,
    content?: string,
  ): ScrapedArticle => ({
    id,
    url,
    title,
    content,
    source: 'test-source',
    published_at: undefined,
  });

  it('deduplicates based on exact URL matches', () => {
    const deduper = new Deduplicator();
    const articles = [
      createMockArticle(
        '1',
        'https://example.com/article1',
        'OpenAI unveils their new massive language model',
        'Content 1',
      ),
      createMockArticle(
        '2',
        'https://example.com/article1/',
        'This should be deduplicated by URL',
        'Content 2',
      ), // Trailing slash variation
      createMockArticle(
        '3',
        'https://example.com/article2',
        'NVIDIA stock rallies after earning report',
        'Content 3',
      ),
    ];

    const result = deduper.process(articles);
    expect(result).toHaveLength(2);
    expect(result.find((a) => a.id === '3')).toBeDefined();
  });

  it('keeps the article with content when deduplicating', () => {
    const deduper = new Deduplicator();
    const articles = [
      createMockArticle('1', 'https://example.com/a', 'Same Title'), // No content
      createMockArticle('2', 'https://example.com/b', 'Same Title', 'Actual content here'),
    ];

    const result = deduper.process(articles);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2'); // Should keep the one with content
  });

  it('deduplicates using fuzzy string similarity (Dice Coefficient)', () => {
    const deduper = new Deduplicator({ similarityThreshold: 0.7 });
    const articles = [
      createMockArticle('1', 'https://a.com', 'Recent honors and awards for Amazon scientists'),
      createMockArticle('2', 'https://b.com', 'Amazon scientists receive recent honors and awards'),
      createMockArticle('3', 'https://c.com', 'Completely different article about AI'),
    ];

    const result = deduper.process(articles);
    expect(result).toHaveLength(2);
    // 1 and 2 are semantically identical based on bigrams, should merge into 1
    const ids = result.map((a) => a.id);
    expect(ids).toContain('3');
    expect(ids.some((id) => id === '1' || id === '2')).toBe(true);
  });

  it('does not over-deduplicate distinct titles', () => {
    const deduper = new Deduplicator({ similarityThreshold: 0.7 });
    const articles = [
      createMockArticle('1', 'https://a.com', 'OpenAI announces GPT-5 release date'),
      createMockArticle('2', 'https://b.com', 'Anthropic announces Claude 3.5 release date'),
    ];

    const result = deduper.process(articles);
    expect(result).toHaveLength(2); // Titles are too different (only share skeleton structural words)
  });

  it('handles empty titles gracefully', () => {
    const deduper = new Deduplicator({ similarityThreshold: 0.7 });
    const articles = [
      createMockArticle('1', 'https://a.com', ''),
      createMockArticle('2', 'https://b.com', ''),
    ];

    // Empty strings are identical, so they should deduplicate
    const result = deduper.process(articles);
    expect(result).toHaveLength(1);
  });

  it('deduplicates based on exact title regardless of URL', () => {
    const deduper = new Deduplicator();
    const articles = [
      createMockArticle('1', 'https://a.com', 'A very specific exact title that is syndicated'),
      createMockArticle('2', 'https://b.com', 'A very specific exact title that is syndicated'),
    ];

    const result = deduper.process(articles);
    expect(result).toHaveLength(1);
  });

  it('keeps distinct but similarly-worded short titles', () => {
    const deduper = new Deduplicator({ similarityThreshold: 0.85 });
    const articles = [
      createMockArticle('1', 'https://a.com', 'GPT-4 released'),
      createMockArticle('2', 'https://b.com', 'GPT-5 released'),
    ];
    // "gpt4 released" vs "gpt5 released"
    const result = deduper.process(articles);
    expect(result).toHaveLength(2);
  });

  describe('Performance Benchmark', () => {
    it('processes 1000 items in under 50ms', () => {
      const deduper = new Deduplicator({ similarityThreshold: 0.7 });

      const baseTitles = [
        'OpenAI announces new agentic model',
        'Anthropic raises series D funding',
        'DeepSeek open sources new reasoning model',
        'Google releases Antigravity update',
        'The EU AI Act takes effect tomorrow',
      ];

      const bigList: ScrapedArticle[] = [];
      for (let i = 0; i < 1000; i++) {
        // Create mostly duplicates with slight variations
        const base = baseTitles[i % baseTitles.length];
        const title = i % 5 === 0 ? `${base} and it changes everything` : base;
        bigList.push(
          createMockArticle(i.toString(), `https://example.com/mock-article-${i}`, title),
        );
      }

      const start = performance.now();
      const result = deduper.process(bigList);
      const end = performance.now();
      const elapsed = end - start;

      // Ensure we actually deduplicated down to roughly the unique topics
      expect(result.length).toBeLessThan(20);

      // The performance check
      // 50ms is very generous; Talisman usually does this in <5ms for 1000 items
      expect(elapsed).toBeLessThan(50);

      console.log(`Deduplicated 1000 items into ${result.length} in ${elapsed.toFixed(2)}ms`);
    });
  });
});
