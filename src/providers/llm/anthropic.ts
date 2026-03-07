import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, Output } from 'ai';
import { LLMProvider, AnalysisResult, LLMDebugInfo } from './index.js';
import {
  AnalysisSchema,
  ScoringSchema,
  SYSTEM_PROMPT,
  getBatchPrompt,
  getScoringPrompt,
} from './common.js';

export class AnthropicProvider implements LLMProvider {
  private latestDebugInfo: LLMDebugInfo | null = null;
  private provider: ReturnType<typeof createAnthropic>;

  constructor(private options: { apiKey: string; model: string }) {
    this.provider = createAnthropic({
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
        model: this.provider(this.options.model),
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
    } catch (error) {
      console.error(`[Anthropic] Error: ${error instanceof Error ? error.message : String(error)}`);

      this.latestDebugInfo = {
        prompt,
        rawResponse: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startTime,
      };

      return articles.map(() => ({ summary: null, category: 'Uncategorized' }));
    }
  }

  async score(titles: string[]): Promise<number[]> {
    if (titles.length === 0) return [];
    const prompt = getScoringPrompt(titles);
    try {
      const { output } = await generateText({
        model: this.provider(this.options.model),
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
