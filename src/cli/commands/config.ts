import { Command } from 'commander';
import { ConfigManager } from '../../core/config-manager.js';
import { logger } from '../../core/logger.js';

export const configCommand = new Command('config').description('Manage Alif configuration');

configCommand
  .command('show')
  .description('Display current configuration')
  .action(() => {
    const cm = ConfigManager.getInstance();
    if (!cm.exists()) {
      logger.error('Alif is not initialized. Run "alif init" first.');
      process.exit(1);
    }
    const config = cm.load();
    logger.log(JSON.stringify(config, null, 2));
  });

configCommand
  .command('set <key> <value>')
  .description('Update a preference value (e.g. alif config set signalThreshold 70)')
  .action((key: string, value: string) => {
    const cm = ConfigManager.getInstance();
    if (!cm.exists()) {
      logger.error('Alif is not initialized. Run "alif init" first.');
      process.exit(1);
    }
    const config = cm.load();
    const prefs = config.preferences as Record<string, unknown>;

    if (!(key in prefs)) {
      logger.error(`Unknown preference key: "${key}"`);
      process.exit(1);
    }

    const current = prefs[key];
    if (typeof current === 'boolean') {
      prefs[key] = value === 'true' || value === '1';
    } else if (typeof current === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        logger.error(`Value "${value}" is not a valid number.`);
        process.exit(1);
      }
      prefs[key] = num;
    } else {
      prefs[key] = value;
    }

    cm.save({ ...config, preferences: prefs as typeof config.preferences });
    logger.success(`Set ${key} = ${prefs[key]}`);
  });

configCommand
  .command('toggle-ai-scoring')
  .description('Toggle AI Article Scoring (Layer 2) on or off')
  .action(() => {
    const cm = ConfigManager.getInstance();
    if (!cm.exists()) {
      logger.error('Alif is not initialized. Run "alif init" first.');
      process.exit(1);
    }
    const config = cm.load();
    const current = config.preferences.enableAIArticlesScoring;
    const updated = !current;

    cm.save({
      ...config,
      preferences: { ...config.preferences, enableAIArticlesScoring: updated },
    });

    logger.success(`AI Article Scoring is now ${updated ? 'ENABLED ✅' : 'DISABLED ❌'}`);
  });
