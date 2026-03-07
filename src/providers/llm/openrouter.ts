import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, Output } from 'ai';
import { LLMProvider, AnalysisResult, LLMDebugInfo } from './index.js';
import {
  AnalysisSchema,
  ScoringSchema,
  SYSTEM_PROMPT,
  getBatchPrompt,
  getScoringPrompt,
} from './common.js';
import { logger } from '../../core/logger.js';

export class OpenRouterProvider implements LLMProvider {
  private latestDebugInfo: LLMDebugInfo | null = null;
  private client: ReturnType<typeof createOpenRouter>;

  constructor(private options: { apiKey: string; model: string }) {
    this.client = createOpenRouter({
      apiKey: this.options.apiKey,
    });
  }

  async analyze(
    articles: { title: string; content?: string }[],
    _options?: { sequential?: boolean },
  ): Promise<AnalysisResult[]> {
    if (articles.length === 0) return [];

    const prompt = getBatchPrompt(articles);

    const startTime = Date.now();
    try {
      const { output } = await generateText({
        model: this.client.chat(this.options.model),
        output: Output.object({ schema: AnalysisSchema }),
        system: SYSTEM_PROMPT,
        prompt,
      });

      const latencyMs = Date.now() - startTime;
      this.latestDebugInfo = {
        prompt,
        rawResponse: JSON.stringify(output),
        latencyMs,
      };

      return output.signals;
    } catch (error: any) {
      const rawText: string | undefined = error?.text;
      const errMsg: string = error instanceof Error ? error.message : String(error);

      this.latestDebugInfo = {
        prompt,
        rawResponse: rawText ?? errMsg,
        latencyMs: Date.now() - startTime,
      };

      logger.error(`[OpenRouter] Error: ${errMsg}`);
      return articles.map(() => ({ summary: null, category: 'Uncategorized' }));
    }
  }

  async score(titles: string[]): Promise<number[]> {
    if (titles.length === 0) return [];
    const prompt = getScoringPrompt(titles);
    try {
      const { output } = await generateText({
        model: this.client.chat(this.options.model),
        output: Output.object({ schema: ScoringSchema }),
        system: SYSTEM_PROMPT,
        prompt,
      });
      return output.scores;
    } catch {
      return titles.map(() => 0);
    }
  }

  getLatestDebugInfo(): LLMDebugInfo | null {
    return this.latestDebugInfo;
  }
}
