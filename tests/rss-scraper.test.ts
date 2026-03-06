import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RssScraper } from '../src/core/scrapers/rss-scraper.js';

// Mock the class for vitest
vi.mock('rss-parser', () => {
  return {
    default: class {
      parseURL = vi.fn();
    },
  };
});

describe('RssScraper', () => {
  let scraper: RssScraper;

  beforeEach(() => {
    vi.clearAllMocks();
    scraper = new RssScraper();
  });

  it('should parse RSS feed successfully', async () => {
    const mockFeed = {
      items: [
        {
          title: 'Article 1',
          link: 'https://example.com/1',
          contentSnippet: 'Summary 1',
          isoDate: '2024-03-06T12:00:00Z',
        },
      ],
    };

    const mockParser = (scraper as any).parser;
    mockParser.parseURL.mockResolvedValue(mockFeed);

    const source = {
      id: 'test-rss',
      name: 'Test RSS',
      type: 'rss' as const,
      url: 'https://example.com/rss',
    };

    const result = await scraper.scrape(source);

    expect(result.status).toBe('ok');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Article 1');
  });

  it('should handle scraper errors', async () => {
    const mockParser = (scraper as any).parser;
    mockParser.parseURL.mockRejectedValue(new Error('Network error'));

    const source = {
      id: 'test-rss',
      name: 'Test RSS',
      type: 'rss' as const,
      url: 'https://example.com/rss',
    };

    const result = await scraper.scrape(source);

    expect(result.status).toBe('error');
    expect(result.error).toBe('Network error');
  });
});
