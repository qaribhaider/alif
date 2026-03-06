import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrapeScraper } from '../src/core/scrapers/scrape-scraper.js';
import { ArxivScraper } from '../src/core/scrapers/arxiv-scraper.js';
import axios from 'axios';

vi.mock('axios');

describe('Scrapers - HTML & ArXiv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ScrapeScraper (HTML)', () => {
    let scraper: ScrapeScraper;

    beforeEach(() => {
      scraper = new ScrapeScraper();
    });

    it('should parse HTML successfully using selectors', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="post">
              <h2 class="title">Article A</h2>
              <a href="/article-a">Link</a>
              <p class="summary">Content A</p>
            </div>
          </body>
        </html>
      `;
      vi.mocked(axios.get).mockResolvedValue({ data: mockHtml });

      const source = {
        id: 'test-html',
        name: 'Test HTML',
        type: 'scrape' as const,
        url: 'https://example.com/blog',
        selector: '.post',
        mapping: {
          title: '.title',
          url: 'a',
          content: '.summary',
        },
      };

      const result = await scraper.scrape(source);

      expect(result.status).toBe('ok');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Article A');
    });
  });

  describe('ArxivScraper', () => {
    let scraper: ArxivScraper;

    beforeEach(() => {
      scraper = new ArxivScraper();
    });

    it('should parse ArXiv XML successfully', async () => {
      const mockXml = `
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <id>http://arxiv.org/abs/1.1</id>
            <title>ArXiv Paper 1</title>
            <summary>Paper Abstract</summary>
            <published>2024-03-06T15:00:00Z</published>
            <link href="http://arxiv.org/abs/1.1" rel="alternate" type="text/html"/>
          </entry>
        </feed>
      `;
      vi.mocked(axios.get).mockResolvedValue({ data: mockXml });

      const source = {
        id: 'arxiv-ai',
        name: 'ArXiv AI',
        type: 'api' as const,
        url: 'https://export.arxiv.org/api/query?search_query=cat:cs.AI',
      };

      const result = await scraper.scrape(source);

      expect(result.status).toBe('ok');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('ArXiv Paper 1');
    });
  });
});
