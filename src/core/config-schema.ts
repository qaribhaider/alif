import { z } from 'zod';

export const LlmProviderType = z.enum(['ollama', 'anthropic', 'openrouter']);
export const DeliveryProviderType = z.enum(['slack', 'webhook']);

export const ConfigSchema = z.object({
  llm: z.object({
    provider: LlmProviderType,
    apiKey: z.string().optional(),
    model: z.string(),
    baseUrl: z.string().url().optional(),
  }),
  delivery: z.array(
    z.object({
      type: DeliveryProviderType,
      webhookUrl: z.string().url(),
    }),
  ),
  preferences: z.object({
    signalThreshold: z.number().min(0).max(100).default(60),
    maxItemsPerRun: z.number().min(1).default(10),
    /** @deprecated Use maxItemsPerRun instead */
    maxItemsPerCategory: z.number().optional(),
    sourceCooldownMinutes: z.number().min(0).default(5),
    sequentialAnalysis: z.boolean().default(false),
    enableAIArticlesScoring: z.boolean().default(true),
    customKeywords: z.record(z.string(), z.number()).default({}),
    negativeKeywords: z.record(z.string(), z.number()).default({}),
  }),
  dbPath: z.string(),
  feedsPath: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;
export type LlmProvider = z.infer<typeof LlmProviderType>;
export type DeliveryProvider = z.infer<typeof DeliveryProviderType>;
