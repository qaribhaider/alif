import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { Scheduler } from '../src/core/scheduler.js';
import { ScheduleStore } from '../src/db/schedule-store.js';

describe('Scheduler & ScheduleStore', () => {
  let db: Database.Database;
  let scheduler: Scheduler;
  let store: ScheduleStore;

  beforeEach(() => {
    // Scaffold an in-memory DB for pure unit testing
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE schedules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cron TEXT NOT NULL,
        scheduled_time TEXT,
        active INTEGER DEFAULT 1,
        last_run TEXT
      )
    `);

    // We can test Scheduler which composes ScheduleStore
    scheduler = new Scheduler(db);
    store = new ScheduleStore(db);

    // Tell Vitest to use fake timers so we can control time
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    db.close();
  });

  it('adds and lists schedules correctly', async () => {
    const id = await scheduler.add('Morning Digest', 'daily', '08:00');
    expect(id).toBeDefined();

    const list = scheduler.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(id);
    expect(list[0].name).toBe('Morning Digest');
    expect(list[0].cron).toBe('daily');
    expect(list[0].scheduled_time).toBe('08:00');
    expect(list[0].active).toBe(1);
    expect(list[0].last_run).toBeNull();
  });

  it('removes schedules correctly', async () => {
    const id = await scheduler.add('To Be Removed', 'daily');
    expect(scheduler.list()).toHaveLength(1);

    scheduler.remove(id);
    expect(scheduler.list()).toHaveLength(0);
  });

  describe('checkAndRun logic', () => {
    it('runs immediately if the schedule has never run before', async () => {
      await scheduler.add('New Job', 'daily', '08:00');

      let ran = false;
      const runner = async () => {
        ran = true;
      };

      await scheduler.checkAndRun(runner);
      expect(ran).toBe(true);

      // Verify the last_run timestamp was updated
      const updated = scheduler.list()[0];
      expect(updated.last_run).toBeDefined();
      expect(updated.last_run).not.toBeNull();
    });

    it('does not run if it is not time yet for a daily schedule', async () => {
      // System time is 06:00
      const mockDate = new Date('2026-03-07T06:00:00Z');
      vi.setSystemTime(mockDate);

      // Added test schedule
      const id = await scheduler.add('Morning Job', 'daily', '08:00');

      // Fake that it ran the previous day at 08:30
      store.updateLastRun(id, new Date('2026-03-06T08:30:00Z').toISOString());

      let ran = false;
      await scheduler.checkAndRun(async () => {
        ran = true;
      });

      // Should not run because current time (06:00) is < scheduled time (08:00)
      expect(ran).toBe(false);
    });

    it('runs a daily schedule if the time has passed and it has not run today', async () => {
      // System time is 09:00
      const mockDate = new Date('2026-03-07T09:00:00.000Z');
      vi.setSystemTime(mockDate);

      const id = await scheduler.add('Morning Job', 'daily', '08:00');

      // Fake that it ran the previous day
      store.updateLastRun(id, new Date('2026-03-06T08:30:00.000Z').toISOString());

      let ran = false;
      await scheduler.checkAndRun(async () => {
        ran = true;
      });

      // It's 09:00, target was 08:00, hasn't run today => should run
      expect(ran).toBe(true);

      const updated = scheduler.list()[0];
      expect(updated.last_run).toBe(mockDate.toISOString());
    });

    it('does not run a daily schedule twice in the same day', async () => {
      // System time is 11:00
      const mockDate = new Date('2026-03-07T11:00:00.000Z');
      vi.setSystemTime(mockDate);

      const id = await scheduler.add('Morning Job', 'daily', '08:00');

      // Fake that it ALREADY ran today at 08:15
      store.updateLastRun(id, new Date('2026-03-07T08:15:00.000Z').toISOString());

      let ranCount = 0;
      await scheduler.checkAndRun(async () => {
        ranCount++;
      });

      expect(ranCount).toBe(0);
    });

    it('runs fallback schedules based on 24h cooldown if no scheduled_time is provided', async () => {
      const mockDate = new Date('2026-03-07T14:00:00.000Z');
      vi.setSystemTime(mockDate);

      const id = await scheduler.add('Simple Daily', 'daily'); // No 08:00 specified

      // Last run was exactly 24 hours ago
      store.updateLastRun(id, new Date('2026-03-06T14:00:00.000Z').toISOString());

      let ranCount = 0;
      await scheduler.checkAndRun(async () => {
        ranCount++;
      });

      expect(ranCount).toBe(1);

      // System time moves ahead 23 hours only
      vi.setSystemTime(new Date('2026-03-08T13:00:00.000Z'));

      await scheduler.checkAndRun(async () => {
        ranCount++;
      });
      // Should STILL be 1 because not 24 hours yet
      expect(ranCount).toBe(1);
    });
  });
});
