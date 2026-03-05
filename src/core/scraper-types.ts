export interface ScrapedArticle {
  id: string;
  title: string;
  url: string;
  content?: string;
  published_at?: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface ScraperSource {
  id: string;
  name: string;
  type: 'rss' | 'api' | 'scrape' | 'json';
  url: string;
  tier?: number;
  tags?: string[];
  mapping?: Record<string, string>;
}

export interface ScraperResult {
  source: string;
  status: 'ok' | 'error';
  items: ScrapedArticle[];
  error?: string;
}

export abstract class BaseScraper {
  abstract scrape(source: ScraperSource): Promise<ScraperResult>;
}
