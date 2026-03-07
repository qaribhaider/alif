import { Database } from 'better-sqlite3';
import { logger } from '../core/logger.js';

const MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    category TEXT,
    published_at TEXT,
    score INTEGER,
    digest_date TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS source_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    items_found INTEGER DEFAULT 0,
    error_message TEXT,
    last_check TEXT DEFAULT CURRENT_TIMESTAMP
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cron TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    last_run TEXT
  );
  `,
  `
  ALTER TABLE schedules ADD COLUMN scheduled_time TEXT;
  `,
  `
  ALTER TABLE articles ADD COLUMN delivered INTEGER DEFAULT 0;
  `,
];

export function runMigrations(db: Database) {
  db.transaction(() => {
    // Basic migration tracking
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `,
    ).run();

    const result = db.prepare('SELECT MAX(id) as lastId FROM migrations').get() as {
      lastId: number | null;
    };
    const lastId = result?.lastId ?? -1;

    for (let i = lastId + 1; i < MIGRATIONS.length; i++) {
      logger.info(`[Database] Running migration ${i}...`);
      db.prepare(MIGRATIONS[i]).run();
      db.prepare('INSERT INTO migrations (id) VALUES (?)').run(i);
    }
  })();
}
