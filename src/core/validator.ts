import fs from 'fs';
import { Config } from './config-schema.js';
import { logger } from './logger.js';

export interface ValidationFailure {
  scope: 'LLM' | 'Delivery' | 'Feeds' | 'Config';
  message: string;
}

export class Validator {
  constructor(
    private config: Config,
    private feedsPath: string,
  ) {}

  public validate(): ValidationFailure[] {
    const failures: ValidationFailure[] = [];

    // 1. Validate LLM
    if (this.config.llm.provider === 'anthropic' || this.config.llm.provider === 'openrouter') {
      if (!this.config.llm.apiKey || this.config.llm.apiKey.trim() === '') {
        failures.push({
          scope: 'LLM',
          message: `Provider '${this.config.llm.provider}' requires an API key. Check 'alif config'.`,
        });
      }
    }

    // 2. Validate Delivery Channels
    if (this.config.delivery && this.config.delivery.length > 0) {
      this.config.delivery.forEach((d, idx) => {
        if (!d.webhookUrl || d.webhookUrl.trim() === '') {
          failures.push({
            scope: 'Delivery',
            message: `Delivery channel [${idx}] (${d.type}) is missing a webhookUrl.`,
          });
        } else {
          try {
            new URL(d.webhookUrl);
          } catch {
            failures.push({
              scope: 'Delivery',
              message: `Delivery channel [${idx}] (${d.type}) has a malformed webhook URL: ${d.webhookUrl}`,
            });
          }
        }
      });
    }

    // 3. Validate Feeds JSON
    if (!fs.existsSync(this.feedsPath)) {
      // Not strictly a failure since `run` auto-creates it, but we warn about it normally.
      // For validation purposes, if it's missing, we inform the user it will be generated.
    } else {
      try {
        const raw = fs.readFileSync(this.feedsPath, 'utf-8');
        const feeds = JSON.parse(raw);

        if (!Array.isArray(feeds)) {
          failures.push({
            scope: 'Feeds',
            message: `The feeds.json file must contain an array of sources. Found ${typeof feeds}.`,
          });
        } else {
          feeds.forEach((feed: any, idx: number) => {
            if (!feed.url) {
              failures.push({
                scope: 'Feeds',
                message: `Feed at index ${idx} is missing a 'url'.`,
              });
            } else {
              try {
                new URL(feed.url);
              } catch {
                failures.push({
                  scope: 'Feeds',
                  message: `Feed at index ${idx} has a malformed URL: ${feed.url}`,
                });
              }
            }

            if (!feed.type || !['rss', 'api', 'scrape', 'json'].includes(feed.type)) {
              failures.push({
                scope: 'Feeds',
                message: `Feed '${feed.name || feed.url}' has an invalid or missing 'type' (must be rss, api, scrape, or json).`,
              });
            }
          });
        }
      } catch (err: any) {
        failures.push({
          scope: 'Feeds',
          message: `Failed to parse feeds.json: ${err.message}`,
        });
      }
    }

    return failures;
  }

  public printAndExitIfFailed(): void {
    const failures = this.validate();
    if (failures.length > 0) {
      logger.error('Pre-flight validation failed. Please fix the following errors:');
      failures.forEach((f) => {
        logger.error(`[${f.scope}] ${f.message}`);
      });
      process.exit(1);
    }
  }
}
