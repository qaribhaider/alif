import prompts from 'prompts';
import path from 'path';
import { ConfigManager } from '../../core/config-manager.js';
import { Config } from '../../core/config-schema.js';
import { logger } from '../../core/logger.js';

export async function initCommand(options?: { nonInteractive?: boolean }) {
  const configManager = ConfigManager.getInstance();
  const configDir = configManager.getConfigDir();

  logger.log('\n--- Alif Initialization ---');

  let config: Config;

  if (options?.nonInteractive) {
    logger.info('Running in non-interactive mode. Reading from environment variables...');

    const provider = (process.env.ALIF_LLM_PROVIDER || 'anthropic') as any;
    let apiKey = process.env.ALIF_LLM_API_KEY;
    if (!apiKey) {
      if (provider === 'anthropic') apiKey = process.env.ANTHROPIC_API_KEY;
      else if (provider === 'openrouter')
        apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    }

    const model =
      process.env.ALIF_LLM_MODEL ||
      (provider === 'ollama'
        ? 'llama3'
        : provider === 'anthropic'
          ? 'claude-3-5-sonnet-20240620'
          : 'meta-llama/llama-3-70b-instruct');
    const baseUrl =
      process.env.ALIF_LLM_BASE_URL ||
      (provider === 'ollama' ? 'http://localhost:11434' : undefined);

    const deliveryConfigs = [];
    if (process.env.SLACK_WEBHOOK_URL) {
      deliveryConfigs.push({ type: 'slack' as const, webhookUrl: process.env.SLACK_WEBHOOK_URL });
    }
    if (process.env.GENERIC_WEBHOOK_URL) {
      deliveryConfigs.push({
        type: 'webhook' as const,
        webhookUrl: process.env.GENERIC_WEBHOOK_URL,
      });
    }

    config = {
      llm: {
        provider,
        apiKey,
        model,
        baseUrl,
      },
      delivery: deliveryConfigs,
      preferences: {
        signalThreshold: process.env.ALIF_SIGNAL_THRESHOLD
          ? parseInt(process.env.ALIF_SIGNAL_THRESHOLD, 10)
          : 60,
        maxItemsPerRun: process.env.ALIF_MAX_ITEMS_PER_RUN
          ? parseInt(process.env.ALIF_MAX_ITEMS_PER_RUN, 10)
          : 10,
        sourceCooldownMinutes: process.env.ALIF_SOURCE_COOLDOWN_MINUTES
          ? parseInt(process.env.ALIF_SOURCE_COOLDOWN_MINUTES, 10)
          : 5,
        sequentialAnalysis:
          process.env.ALIF_SEQUENTIAL_ANALYSIS === 'true' || provider === 'ollama',
        enableAIArticlesScoring: process.env.ALIF_ENABLE_AI_SCORING !== 'false',
        customKeywords: process.env.ALIF_CUSTOM_KEYWORDS
          ? JSON.parse(process.env.ALIF_CUSTOM_KEYWORDS)
          : {},
        negativeKeywords: process.env.ALIF_NEGATIVE_KEYWORDS
          ? JSON.parse(process.env.ALIF_NEGATIVE_KEYWORDS)
          : {},
        logLevel: (process.env.ALIF_LOG_LEVEL as any) || 'normal',
        noColor: process.env.ALIF_NO_COLOR === 'true',
      },
      dbPath: path.join(configDir, 'alif.db'),
      feedsPath: path.join(configDir, 'feeds.json'),
    };
  } else {
    const response = await prompts([
      {
        type: 'select',
        name: 'llmProvider',
        message: 'Which LLM provider would you like to use?',
        choices: [
          { title: 'Ollama (Local)', value: 'ollama' },
          { title: 'Anthropic', value: 'anthropic' },
          { title: 'OpenRouter', value: 'openrouter' },
        ],
      },
      {
        type: (prev) => (prev !== 'ollama' ? 'text' : null),
        name: 'apiKey',
        message: 'Enter your API Key:',
      },
      {
        type: 'text',
        name: 'model',
        message: 'Enter the model name (e.g., llama3, claude-3-opus-20240229):',
        initial: (prev, values) => {
          if (values.llmProvider === 'ollama') return 'llama3';
          if (values.llmProvider === 'anthropic') return 'claude-3-5-sonnet-20240620';
          return 'meta-llama/llama-3-70b-instruct';
        },
      },
      {
        type: (prev, values) => (values.llmProvider === 'ollama' ? 'text' : null),
        name: 'baseUrl',
        message: 'Enter Ollama base URL:',
        initial: 'http://localhost:11434',
      },
      {
        type: 'toggle',
        name: 'sequentialAnalysis',
        message:
          'Enable sequential (one-by-one) LLM processing? (Recommended for small local models)',
        initial: (prev, values) => values.llmProvider === 'ollama',
        active: 'yes',
        inactive: 'no',
      },
      {
        type: 'toggle',
        name: 'enableAIArticlesScoring',
        message: 'Enable AI Article Scoring? (Uses your LLM to intelligently score articles)',
        initial: true,
        active: 'yes',
        inactive: 'no',
      },
      {
        type: 'multiselect',
        name: 'deliveryProviders',
        message: 'Where should we deliver the digest?',
        choices: [
          { title: 'Slack', value: 'slack' },
          { title: 'Generic Webhook', value: 'webhook' },
        ],
        min: 1,
      },
    ]);

    if (!response.llmProvider || !response.deliveryProviders) {
      logger.warn('Initialization cancelled.');
      return;
    }

    const deliveryConfigs = [];
    for (const provider of response.deliveryProviders) {
      const { webhookUrl } = await prompts({
        type: 'text',
        name: 'webhookUrl',
        message: `Enter ${provider} Webhook URL:`,
      });
      deliveryConfigs.push({ type: provider, webhookUrl });
    }

    config = {
      llm: {
        provider: response.llmProvider,
        apiKey: response.apiKey,
        model: response.model,
        baseUrl: response.baseUrl,
      },
      delivery: deliveryConfigs,
      preferences: {
        signalThreshold: 60,
        maxItemsPerRun: 10,
        sourceCooldownMinutes: 5,
        sequentialAnalysis: response.sequentialAnalysis,
        enableAIArticlesScoring: response.enableAIArticlesScoring,
        customKeywords: {},
        negativeKeywords: {},
        logLevel: 'normal' as const,
        noColor: false,
      },
      dbPath: path.join(configDir, 'alif.db'),
      feedsPath: path.join(configDir, 'feeds.json'),
    };
  }

  configManager.save(config);

  logger.success(`Configuration saved to ${configManager.getConfigFile()}`);
  logger.info(`Database will be located at ${config.dbPath}`);
  logger.success('\nAlif is ready! Run "alif run" to get started.');
}
