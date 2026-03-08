#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { scheduleCommand } from './commands/schedule.js';
import { debugCommand } from './commands/debug.js';
import { configCommand } from './commands/config.js';
import { validateCommand } from './commands/validate.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const program = new Command();

program.name('alif').description('Alif - Daily AI Signal Digest CLI').version(version);

program
  .command('init')
  .description('Initialize Alif configuration')
  .option('--non-interactive', 'Run without interactive prompts using environment variables')
  .action(async (options) => {
    await initCommand(options);
  });

program
  .command('run')
  .description('Run the AI Signal Digest pipeline')
  .option('-f, --force', 'Bypass source cooldown')
  .option('-v, --verbose', 'Show detailed debug output')
  .option('-q, --quiet', 'Suppress all output except errors')
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

program
  .command('validate')
  .description('Run a pre-flight configuration check')
  .action(async () => {
    await validateCommand();
  });

program.addCommand(debugCommand);
program.addCommand(configCommand);

program.parse(process.argv);
