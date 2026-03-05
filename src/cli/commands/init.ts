import prompts from 'prompts';
import path from 'path';
import { ConfigManager } from '../../core/config-manager.js';
import { Config } from '../../core/config-schema.js';

export async function initCommand() {
  const configManager = ConfigManager.getInstance();
  const configDir = configManager.getConfigDir();

  console.log('--- Alif Initialization ---');

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

  if (!response.llmProvider) {
    console.log('Initialization cancelled.');
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

  const config: Config = {
    llm: {
      provider: response.llmProvider,
      apiKey: response.apiKey,
      model: response.model,
      baseUrl: response.baseUrl,
    },
    delivery: deliveryConfigs,
    preferences: {
      signalThreshold: 60,
      maxItemsPerCategory: 5,
      sourceCooldownMinutes: 5,
    },
    dbPath: path.join(configDir, 'alif.db'),
    feedsPath: path.join(configDir, 'feeds.json'),
  };

  configManager.save(config);

  console.log(`\nConfiguration saved to ${configManager.getConfigFile()}`);
  console.log(`Database will be located at ${config.dbPath}`);
  console.log('\nAlif is ready! Run "alif run" to start (after adding feeds).');
}
