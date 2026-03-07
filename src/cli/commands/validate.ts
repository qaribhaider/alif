import { ConfigManager } from '../../core/config-manager.js';
import { Validator } from '../../core/validator.js';
import { logger } from '../../core/logger.js';

export async function validateCommand() {
  const configManager = ConfigManager.getInstance();

  if (!configManager.exists()) {
    logger.error('Alif is not initialized. Run "alif init" first.');
    process.exit(1);
  }

  try {
    const config = configManager.load();
    const validator = new Validator(config, config.feedsPath);

    logger.info('Running pre-flight validation...');
    const failures = validator.validate();

    if (failures.length > 0) {
      logger.error(`Validation failed with ${failures.length} errors:`);
      failures.forEach((f) => logger.error(`  [${f.scope}] ${f.message}`));
      process.exit(1);
    } else {
      logger.success('All configurations and feeds are valid! 🎉');
      process.exit(0);
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Validation failed exception: ${error.message}`);
    } else {
      logger.error('An unknown error occurred during validation.');
    }
    process.exit(1);
  }
}
