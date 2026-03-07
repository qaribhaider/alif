import prompts from 'prompts';
import { ConfigManager } from '../../core/config-manager.js';
import { createDatabase } from '../../db/connection.js';
import { runMigrations } from '../../db/migrate.js';
import { Scheduler } from '../../core/scheduler.js';
import { runPipeline } from './run.js';
import { logger } from '../../core/logger.js';

export async function scheduleCommand(action: string) {
  const configManager = ConfigManager.getInstance();
  if (!configManager.exists()) {
    logger.error('Alif is not initialized. Run "alif init" first.');
    return;
  }

  const config = configManager.load();
  const db = createDatabase(config.dbPath);

  try {
    runMigrations(db);
    const scheduler = new Scheduler(db);

    if (action === 'add') {
      const response = await prompts([
        {
          type: 'text',
          name: 'name',
          message: 'Name for this schedule:',
          initial: 'Daily Digest',
        },
        {
          type: 'text',
          name: 'cron',
          message: 'Enter frequency (e.g. daily, hourly):',
          initial: 'daily',
        },
        {
          type: (prev) => (prev === 'daily' ? 'text' : null),
          name: 'time',
          message: 'At what time? (HH:mm format, 24h):',
          initial: '09:00',
          validate: (val) =>
            /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val) ? true : 'Please enter valid HH:mm time',
        },
      ]);

      if (response.name && response.cron) {
        const id = await scheduler.add(response.name, response.cron, response.time);
        logger.success(
          `Schedule added! ID: ${id} (Runs ${response.cron}${response.time ? ` at ${response.time}` : ''})`,
        );
      }
    } else if (action === 'list') {
      const schedules = scheduler.list();
      if (schedules.length === 0) {
        logger.info('No schedules found.');
      } else {
        // We use consola.log for the table to avoid prefixing every line of the table with icons
        logger.log('\n');
        console.table(
          schedules.map((s) => ({
            ID: s.id,
            Name: s.name,
            Frequency: s.cron,
            Time: s.scheduled_time || '-',
            Active: s.active ? 'Yes' : 'No',
            'Last Run': s.last_run || 'Never',
          })),
        );
      }
    } else if (action === 'delete') {
      const schedules = scheduler.list();
      if (schedules.length === 0) {
        logger.info('No schedules to delete.');
        return;
      }

      const { id } = await prompts({
        type: 'select',
        name: 'id',
        message: 'Select schedule to delete:',
        choices: schedules.map((s) => ({ title: s.name, value: s.id })),
      });

      if (id) {
        scheduler.remove(id);
        logger.success(`Schedule ${id} deleted.`);
      }
    } else if (action === 'check') {
      logger.info('[Scheduler] Checking for due tasks...');
      await scheduler.checkAndRun(async () => {
        await runPipeline(config, db);
      });
      logger.info('[Scheduler] Check complete.');
    } else {
      logger.error(`Unknown action: ${action}. Available: add, list, delete, check`);
    }
  } finally {
    db.close();
    process.exit(0);
  }
}
