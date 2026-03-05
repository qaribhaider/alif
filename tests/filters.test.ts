import { describe, it, expect } from 'vitest';
import { KeywordScorer } from '../src/core/filters/keywords.js';
import { Deduplicator } from '../src/core/filters/deduplicator.js';

describe('Filters', () => {
  describe('KeywordScorer', () => {
    it('should calculate score based on keywords', () => {
      const scorer = new KeywordScorer({ 'gpt-4': 50, ai: 10 });
      const article = {
        id: '1',
        title: 'New GPT-4 details',
        content: 'AI is changing the world',
        source: 'test',
        url: 'http://example.com',
      };
      expect(scorer.score(article)).toBe(60);
    });

    it('should prioritize overridden keywords and include new ones', () => {
      // Simulate merging mechanics from pipeline
      const BASE = { 'gpt-4': 50, ai: 10 };
      const CUSTOM = { 'gpt-4': 100, custom_tool: 30, ai: 0 };
      const merged = { ...BASE, ...CUSTOM };

      const scorer = new KeywordScorer(merged);
      const article = {
        id: '1',
        title: 'New GPT-4 details using custom_tool',
        content: 'AI is changing the world',
        source: 'test',
        url: 'http://example.com',
      };

      // GPT-4 (100) + custom_tool (30) + AI (0) = 130
      expect(scorer.score(article)).toBe(130);
    });
  });

  describe('Deduplicator', () => {
    it('should remove duplicate URLs', () => {
      const deduplicator = new Deduplicator();
      const articles = [
        { id: '1', title: 'A', url: 'http://example.com/', source: 's1' },
        { id: '2', title: 'A proxy', url: 'http://example.com', source: 's2' },
        { id: '3', title: 'B', url: 'http://other.com', source: 's1' },
      ];
      const result = deduplicator.process(articles);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });
  });
});
