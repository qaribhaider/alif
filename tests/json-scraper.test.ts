import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JsonScraper } from '../src/core/scrapers/json-scraper.js';
import axios from 'axios';

vi.mock('axios');

describe('JsonScraper', () => {
  let scraper: JsonScraper;

  beforeEach(() => {
    vi.clearAllMocks();
    scraper = new JsonScraper();
  });

  it('should parse generic JSON with mapping', async () => {
    const mockResponse = {
      data: {
        results: [
          {
            heading: 'Json 1',
            link: 'https://example.com/json/1',
            desc: 'Content 1',
            date: '2024-03-06T14:00:00Z',
          },
        ],
      },
    };
    vi.mocked(axios.get).mockResolvedValue(mockResponse);

    const source = {
      id: 'test-json',
      name: 'Test JSON',
      type: 'json' as const,
      url: 'https://example.com/json',
      mapping: {
        items: 'results',
        title: 'heading',
        url: 'link',
        content: 'desc',
        published_at: 'date',
      },
    };

    const result = await scraper.scrape(source);

    expect(result.status).toBe('ok');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Json 1');
  });

  it('should parse Reddit specifically', async () => {
    const mockResponse = {
      data: {
        data: {
          children: [
            {
              data: {
                name: 't3_1',
                title: 'Reddit Title',
                url: '/r/test/comments/1',
                selftext: 'Reddit Text',
                created_utc: 1709730000,
              },
            },
          ],
        },
      },
    };
    vi.mocked(axios.get).mockResolvedValue(mockResponse);

    const source = {
      id: 'reddit-test',
      name: 'Reddit Test',
      type: 'json' as const,
      url: 'https://reddit.com/r/ai.json',
    };

    const result = await scraper.scrape(source);

    expect(result.status).toBe('ok');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Reddit Title');
  });
});
