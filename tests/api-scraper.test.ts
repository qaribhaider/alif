import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiScraper } from '../src/core/scrapers/api-scraper.js';
import axios from 'axios';

vi.mock('axios');

describe('ApiScraper', () => {
  let scraper: ApiScraper;

  beforeEach(() => {
    vi.clearAllMocks();
    scraper = new ApiScraper();
  });

  it('should fetch and parse Hacker News API successfully', async () => {
    const mockResponse = {
      data: {
        hits: [
          {
            objectID: '12345',
            title: 'HN Article 1',
            url: 'https://example.com/hn/1',
            story_text: 'HN Content',
            created_at: '2024-03-06T13:00:00Z',
          },
        ],
      },
    };
    vi.mocked(axios.get).mockResolvedValue(mockResponse);

    const source = {
      id: 'hn',
      name: 'Hacker News',
      type: 'api' as const,
      url: 'https://hn.algolia.com/api/v1/search?tags=front_page',
    };

    const result = await scraper.scrape(source);

    expect(result.status).toBe('ok');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('HN Article 1');
  });

  it('should handle unsupported API source', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: {} });

    const source = {
      id: 'unknown-api',
      name: 'Unknown API',
      type: 'api' as const,
      url: 'https://example.com',
    };

    const result = await scraper.scrape(source);

    expect(result.status).toBe('error');
    expect(result.error).toBe('Unsupported API source');
  });
});
