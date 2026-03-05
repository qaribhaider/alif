#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { scheduleCommand } from './commands/schedule.js';

const program = new Command();

program.name('alif').description('Alif - Daily AI Signal Digest CLI').version('1.0.0');

program
  .command('init')
  .description('Initialize Alif configuration')
  .action(async () => {
    await initCommand();
  });

program
  .command('run')
  .description('Run the AI Signal Digest pipeline')
  .option('-f, --force', 'Bypass source cooldown')
  .action(async (options) => {
    await runCommand(options);
  });

program
  .command('schedule <action>')
  .description('Manage digest schedules')
  .addHelpText('after', '\nActions: add, list, delete, check')
  .action(async (action) => {
    await scheduleCommand(action);
  });

program.parse(process.argv);
