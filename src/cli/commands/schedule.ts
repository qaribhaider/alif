import prompts from 'prompts';
import { ConfigManager } from '../../core/config-manager.js';
import { createDatabase } from '../../db/connection.js';
import { runMigrations } from '../../db/migrate.js';
import { Scheduler } from '../../core/scheduler.js';

export async function scheduleCommand(action: string) {
  const configManager = ConfigManager.getInstance();
  if (!configManager.exists()) {
    console.error('Alif is not initialized. Run "alif init" first.');
    return;
  }

  const config = configManager.load();
  const db = createDatabase(config.dbPath);
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
    ]);

    if (response.name && response.cron) {
      const id = await scheduler.add(response.name, response.cron);
      console.log(`Schedule added! ID: ${id}`);
    }
  } else if (action === 'list') {
    const schedules = scheduler.list();
    if (schedules.length === 0) {
      console.log('No schedules found.');
    } else {
      console.table(
        schedules.map((s) => ({
          ID: s.id,
          Name: s.name,
          Cron: s.cron,
          Active: s.active ? 'Yes' : 'No',
          'Last Run': s.last_run || 'Never',
        })),
      );
    }
  } else if (action === 'delete') {
    const schedules = scheduler.list();
    if (schedules.length === 0) {
      console.log('No schedules to delete.');
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
      console.log(`Schedule ${id} deleted.`);
    }
  }
}
