import { Database } from 'better-sqlite3';

export interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  content?: string | null;
  summary?: string | null;
  category?: string;
  published_at?: string;
  score?: number;
  digest_date: string;
}

export class ArticleStore {
  constructor(private db: Database) {}

  upsert(article: Article) {
    const stmt = this.db.prepare(`
      INSERT INTO articles (id, title, url, source, content, summary, category, published_at, score, digest_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        category = excluded.category,
        score = excluded.score
    `);

    stmt.run(
      article.id,
      article.title,
      article.url,
      article.source,
      article.content || null,
      article.summary || null,
      article.category || 'Uncategorized',
      article.published_at || null,
      article.score || 0,
      article.digest_date,
    );
  }

  getLatestTimestamp(): string | null {
    const result = this.db.prepare('SELECT MAX(published_at) as latest FROM articles').get() as {
      latest: string | null;
    };
    return result?.latest || null;
  }
}
