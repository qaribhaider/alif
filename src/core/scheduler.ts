import { ScheduleStore } from '../db/schedule-store.js';
import { Database } from 'better-sqlite3';

export class Scheduler {
  private store: ScheduleStore;

  constructor(db: Database) {
    this.store = new ScheduleStore(db);
  }

  async add(name: string, cron: string) {
    const id = Math.random().toString(36).substring(2, 9);
    this.store.add({
      id,
      name,
      cron,
      active: 1,
    });
    return id;
  }

  list() {
    return this.store.getAll();
  }

  remove(id: string) {
    this.store.delete(id);
  }

  // This would be called by a background daemon or a frequent cron
  async checkAndRun(runner: () => Promise<void>) {
    const schedules = this.store.getAll();
    const now = new Date();

    for (const schedule of schedules) {
      if (!schedule.active) continue;

      // Simple logic: if never run or last run was > 23 hours ago and it's morning
      // In a real CLI we'd use a cron parser like `cron-parser`
      // For this MVP, we'll just check if it's been more than 24h
      const lastRun = schedule.last_run ? new Date(schedule.last_run) : new Date(0);
      const diffHours = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

      if (diffHours >= 24) {
        console.log(`[Scheduler] Running job: ${schedule.name}`);
        await runner();
        this.store.updateLastRun(schedule.id, now.toISOString());
      }
    }
  }
}
