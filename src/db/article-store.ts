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
  delivered?: number;
}

export class ArticleStore {
  constructor(private db: Database) {}

  upsert(article: Article) {
    const stmt = this.db.prepare(`
      INSERT INTO articles (id, title, url, source, content, summary, category, published_at, score, digest_date, delivered)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      article.delivered || 0,
    );
  }

  getPendingHighSignal(threshold: number, hours: number = 24): Article[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return this.db
      .prepare(
        `
      SELECT * FROM articles 
      WHERE score >= ? 
      AND delivered = 0 
      AND summary IS NOT NULL
      AND (published_at > ? OR digest_date > ?)
    `,
      )
      .all(threshold, cutoff, cutoff.split('T')[0]) as Article[];
  }

  markAsDelivered(articleIds: string[]) {
    const stmt = this.db.prepare('UPDATE articles SET delivered = 1 WHERE id = ?');
    const transaction = this.db.transaction((ids: string[]) => {
      for (const id of ids) stmt.run(id);
    });
    transaction(articleIds);
  }

  getLatestTimestamp(): string | null {
    // Use published_at where available, fall back to digest_date when feeds omit it
    const result = this.db
      .prepare('SELECT MAX(COALESCE(published_at, digest_date)) as latest FROM articles')
      .get() as { latest: string | null };
    return result?.latest || null;
  }
}
