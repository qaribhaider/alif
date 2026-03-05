import { Config } from '../core/config-schema.js';
import { LLMProvider } from './llm/index.js';
import { OllamaProvider } from './llm/ollama.js';
import { AnthropicProvider } from './llm/anthropic.js';
import { OpenRouterProvider } from './llm/openrouter.js';
import { DeliveryProvider } from './delivery/index.js';
import { SlackDelivery } from './delivery/slack.js';
import { WebhookDelivery } from './delivery/webhook.js';

export class ProviderFactory {
  static createLLM(config: Config): LLMProvider {
    const { provider, apiKey, model, baseUrl } = config.llm;
    switch (provider) {
      case 'ollama':
        return new OllamaProvider({ baseUrl: baseUrl || 'http://localhost:11434', model });
      case 'anthropic':
        return new AnthropicProvider({ apiKey: apiKey || '', model });
      case 'openrouter':
        return new OpenRouterProvider({ apiKey: apiKey || '', model });
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  static createDelivery(config: Config): DeliveryProvider[] {
    return config.delivery.map((d) => {
      switch (d.type) {
        case 'slack':
          return new SlackDelivery(d.webhookUrl);
        case 'webhook':
          return new WebhookDelivery(d.webhookUrl);
        default:
          throw new Error(`Unsupported delivery type: ${d.type}`);
      }
    });
  }
}
