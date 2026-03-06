import { createOllama } from 'ollama-ai-provider-v2';
import { generateText, Output } from 'ai';
import { LLMProvider, AnalysisResult, LLMDebugInfo } from './index.js';
import {
  AnalysisSchema,
  SingleArticleSchema,
  SYSTEM_PROMPT,
  getBatchPrompt,
  getSinglePrompt,
} from './common.js';

export class OllamaProvider implements LLMProvider {
  private model: any;
  private latestDebugInfo: LLMDebugInfo | null = null;

  constructor(private options: { baseUrl: string; model: string }) {
    // ollama-ai-provider-v2 expects the /api prefix (default: http://localhost:11434/api)
    const ollama = createOllama({ baseURL: `${options.baseUrl}/api` });
    this.model = ollama(options.model);
  }

  async analyze(
    articles: { title: string; content?: string }[],
    options?: { sequential?: boolean },
  ): Promise<AnalysisResult[]> {
    if (articles.length === 0) return [];

    if (options?.sequential) {
      return this.analyzeSequential(articles);
    }

    return this.analyzeBatch(articles);
  }

  private async analyzeBatch(
    articles: { title: string; content?: string }[],
  ): Promise<AnalysisResult[]> {
    const prompt = getBatchPrompt(articles);

    const startTime = Date.now();
    try {
      const { output } = await generateText({
        model: this.model,
        output: Output.object({ schema: AnalysisSchema }),
        system: SYSTEM_PROMPT,
        prompt,
        providerOptions: { ollama: { think: false } },
      });

      const latencyMs = Date.now() - startTime;
      this.latestDebugInfo = {
        prompt,
        rawResponse: JSON.stringify(output),
        latencyMs,
      };

      return output.signals;
    } catch (error) {
      this.handleError(error, prompt, startTime);
      return this.getFallbackResults(articles);
    }
  }

  private async analyzeSequential(
    articles: { title: string; content?: string }[],
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];
    let combinedRawResponse = '';
    const startTime = Date.now();

    for (const article of articles) {
      const prompt = getSinglePrompt([article]);

      try {
        const { output } = await generateText({
          model: this.model,
          output: Output.object({ schema: SingleArticleSchema }),
          prompt,
          providerOptions: { ollama: { think: false } },
        });

        results.push(output);
        combinedRawResponse += `\n--- Item ${results.length} ---\n${JSON.stringify(output)}`;
      } catch (error: any) {
        // Small models may ignore JSON schema and return markdown text instead.
        // NoObjectGeneratedError includes the raw .text from the model, so we can recover.
        const rawText: string | undefined = error?.text;
        if (rawText) {
          const summaryMatch = rawText.match(/\*{0,2}summary\*{0,2}:?\*{0,2}\s*(.+)/i);
          const categoryMatch = rawText.match(/\*{0,2}category\*{0,2}:?\*{0,2}\s*(.+)/i);
          if (summaryMatch || categoryMatch) {
            const recovered: AnalysisResult = {
              summary: summaryMatch?.[1]?.trim() ?? null,
              category: categoryMatch?.[1]?.replace(/[.*]/g, '').trim() ?? 'Uncategorized',
            };
            results.push(recovered);
            combinedRawResponse += `\n--- Item ${results.length} (recovered from text) ---\n${rawText}`;
            continue;
          }
        }
        console.error(`[Ollama] Sequential Error for "${article.title}":`, error?.message ?? error);
        results.push(this.getFallbackResults([article])[0]);
      }
    }

    this.latestDebugInfo = {
      prompt: 'Sequential Processing (Multiple Prompts)',
      rawResponse: combinedRawResponse,
      latencyMs: Date.now() - startTime,
    };

    return results;
  }

  private handleError(error: any, prompt: string, startTime: number) {
    console.error(`[Ollama] Error: ${error instanceof Error ? error.message : String(error)}`);
    this.latestDebugInfo = {
      prompt,
      rawResponse: error instanceof Error ? error.stack || error.message : String(error),
      latencyMs: Date.now() - startTime,
    };
  }

  private getFallbackResults(articles: { title: string; content?: string }[]): AnalysisResult[] {
    return articles.map((a) => {
      const title = a.title.toLowerCase();
      let category = 'Uncategorized';
      if (title.includes('research') || title.includes('paper')) category = 'Research';
      else if (title.includes('release') || title.includes('version') || title.includes('new'))
        category = 'Model Release';
      else if (title.includes('tool') || title.includes('sdk') || title.includes('api'))
        category = 'Tool/SDK';
      else if (title.includes('policy') || title.includes('law') || title.includes('regulation'))
        category = 'Policy';

      return { summary: null, category };
    });
  }

  getLatestDebugInfo(): LLMDebugInfo | null {
    return this.latestDebugInfo;
  }
}
