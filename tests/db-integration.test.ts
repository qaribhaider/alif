import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase } from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import { ArticleStore } from '../src/db/article-store.js';
import { SourceHealthStore } from '../src/db/source-health-store.js';
import fs from 'fs';
import path from 'path';

describe('Database Integration', () => {
  const testDbPath = path.join('/tmp', `alif-test-${Date.now()}.db`);
  let db: any;

  beforeEach(() => {
    db = createDatabase(testDbPath);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should run migrations and create tables', () => {
    runMigrations(db);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map((t: any) => t.name);

    expect(tableNames).toContain('articles');
    expect(tableNames).toContain('source_health');
    expect(tableNames).toContain('schedules');
    expect(tableNames).toContain('migrations');
  });

  it('should upsert articles and retrieve latest timestamp', () => {
    runMigrations(db);
    const store = new ArticleStore(db);

    const article = {
      id: 'test-1',
      title: 'Test Article',
      url: 'https://example.com',
      source: 'test',
      digest_date: '2024-03-05',
      published_at: '2024-03-05T10:00:00Z',
    };

    store.upsert(article);
    expect(store.getLatestTimestamp()).toBe('2024-03-05T10:00:00Z');

    // Update
    store.upsert({ ...article, title: 'Updated Title' });
    const saved = db.prepare('SELECT title FROM articles WHERE id = ?').get('test-1');
    expect(saved.title).toBe('Updated Title');
  });

  it('should record source health', () => {
    runMigrations(db);
    const healthStore = new SourceHealthStore(db);

    healthStore.record({
      source: 'hn',
      status: 'ok',
      items_found: 10,
    });

    const latest = healthStore.getLatest('hn') as any;
    expect(latest.status).toBe('ok');
    expect(latest.items_found).toBe(10);
  });
});
