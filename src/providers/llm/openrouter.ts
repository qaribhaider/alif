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

const LLM_TIMEOUT_MS = 300 * 1000; // 5 minutes timeout

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
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), LLM_TIMEOUT_MS);

    try {
      const { output } = await generateText({
        model: this.client.chat(this.options.model),
        output: Output.object({ schema: AnalysisSchema }),
        system: SYSTEM_PROMPT,
        prompt,
        abortSignal: abortController.signal,
      });

      clearTimeout(timeoutId);
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
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), LLM_TIMEOUT_MS);

    try {
      const { output } = await generateText({
        model: this.client.chat(this.options.model),
        output: Output.object({ schema: ScoringSchema }),
        system: SYSTEM_PROMPT,
        prompt,
        abortSignal: abortController.signal,
      });
      clearTimeout(timeoutId);
      return output.scores;
    } catch (error: any) {
      clearTimeout(timeoutId);
      logger.error(`[OpenRouter] Scoring Error: ${error?.message || String(error)}`);
      return titles.map(() => 0);
    }
  }

  getLatestDebugInfo(): LLMDebugInfo | null {
    return this.latestDebugInfo;
  }
}
