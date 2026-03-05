import { Database } from 'better-sqlite3';

export interface SourceHealth {
  source: string;
  status: 'ok' | 'error';
  items_found: number;
  error_message?: string | null;
}

export class SourceHealthStore {
  constructor(private db: Database) {}

  record(health: SourceHealth) {
    const stmt = this.db.prepare(`
      INSERT INTO source_health (source, status, items_found, error_message)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(health.source, health.status, health.items_found, health.error_message || null);
  }

  getLatest(source: string) {
    return this.db
      .prepare(
        `
      SELECT * FROM source_health WHERE source = ? ORDER BY last_check DESC LIMIT 1
    `,
      )
      .get(source) as { last_check: string } | undefined;
  }

  isThrottled(source: string, minutes: number): boolean {
    const latest = this.getLatest(source);
    if (!latest) return false;

    // SQLite CURRENT_TIMESTAMP is UTC
    const lastCheck = new Date(latest.last_check + 'Z').getTime();
    const now = Date.now();
    const diffMinutes = (now - lastCheck) / (1000 * 60);

    return diffMinutes < minutes;
  }
}
