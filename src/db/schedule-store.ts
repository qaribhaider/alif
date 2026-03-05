import { Database } from 'better-sqlite3';

export interface Schedule {
  id: string;
  name: string;
  cron: string;
  scheduled_time?: string | null; // HH:mm
  active: number;
  last_run?: string | null;
}

export class ScheduleStore {
  constructor(private db: Database) { }

  add(schedule: Schedule) {
    const stmt = this.db.prepare(`
      INSERT INTO schedules (id, name, cron, scheduled_time, active, last_run)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      schedule.id,
      schedule.name,
      schedule.cron,
      schedule.scheduled_time || null,
      schedule.active,
      schedule.last_run || null,
    );
  }

  getAll(): Schedule[] {
    return this.db.prepare('SELECT * FROM schedules').all() as Schedule[];
  }

  delete(id: string) {
    this.db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  }

  updateLastRun(id: string, timestamp: string) {
    this.db.prepare('UPDATE schedules SET last_run = ? WHERE id = ?').run(timestamp, id);
  }
}
