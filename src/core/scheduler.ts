import { ScheduleStore } from '../db/schedule-store.js';
import { Database } from 'better-sqlite3';

export class Scheduler {
  private store: ScheduleStore;

  constructor(db: Database) {
    this.store = new ScheduleStore(db);
  }

  async add(name: string, cron: string, scheduledTime?: string) {
    const id = Math.random().toString(36).substring(2, 9);
    this.store.add({
      id,
      name,
      cron,
      scheduled_time: scheduledTime,
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
    const currentHHmm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    for (const schedule of schedules) {
      if (!schedule.active) continue;

      const lastRun = schedule.last_run ? new Date(schedule.last_run) : new Date(0);
      const diffHours = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

      // Simple implementation:
      // 1. If never run, run it instantly.
      // 2. If it's a 'daily' schedule and has a scheduled_time, check if we've passed that time today and haven't run yet.
      // 3. Otherwise fallback to the 24h cooldown.

      let shouldRun = false;

      if (!schedule.last_run) {
        shouldRun = true;
      } else if (schedule.cron === 'daily' && schedule.scheduled_time) {
        // Run if:
        // - Current time >= scheduled time
        // - Last run was NOT today
        const lastRunDate = lastRun.toISOString().split('T')[0];
        const todayDate = now.toISOString().split('T')[0];

        if (currentHHmm >= schedule.scheduled_time && lastRunDate !== todayDate) {
          shouldRun = true;
        }
      } else if (diffHours >= 24) {
        // Fallback for non-daily or simple daily without time
        shouldRun = true;
      }

      if (shouldRun) {
        console.log(`[Scheduler] Running job: ${schedule.name}`);
        await runner();
        this.store.updateLastRun(schedule.id, now.toISOString());
      }
    }
  }
}
