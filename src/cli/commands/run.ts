import fs from 'fs';
import { ConfigManager } from '../../core/config-manager.js';
import { createDatabase } from '../../db/connection.js';
import { runMigrations } from '../../db/migrate.js';
import { Pipeline } from '../../core/pipeline.js';
import { configureLogger, logger } from '../../core/logger.js';

export async function runPipeline(config: any, db: any, force = false) {
  const pipeline = new Pipeline(config, db);

  // Load feeds
  if (!fs.existsSync(config.feedsPath)) {
    logger.warn(
      `Feeds file not found at ${config.feedsPath}. Initializing with default sources...`,
    );
    const { defaultFeeds } = await import('../../resources/index.js');
    fs.writeFileSync(config.feedsPath, JSON.stringify(defaultFeeds, null, 2));
    logger.success(`Created feeds.json with ${defaultFeeds.length} default sources.`);
  }

  const feeds = JSON.parse(fs.readFileSync(config.feedsPath, 'utf-8'));
  await pipeline.run(feeds, force);
}

export async function runCommand(
  options: { force?: boolean; verbose?: boolean; quiet?: boolean } = {},
) {
  const configManager = ConfigManager.getInstance();

  if (!configManager.exists()) {
    logger.error('Alif is not initialized. Run "alif init" first.');
    process.exit(1);
  }

  let db;
  try {
    const config = configManager.load();

    // Apply log level: per-run flag overrides persisted config
    configureLogger({
      level: config.preferences.logLevel,
      noColor: config.preferences.noColor,
      override: options.verbose ? 'verbose' : options.quiet ? 'quiet' : undefined,
    });

    db = createDatabase(config.dbPath);
    runMigrations(db);

    await runPipeline(config, db, options.force);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error: ${error.message}`);
    } else {
      logger.error('An unknown error occurred.');
    }
    process.exit(1);
  } finally {
    if (db) db.close();
    process.exit(0);
  }
}
