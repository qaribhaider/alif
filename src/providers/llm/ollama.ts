import { Ollama } from 'ollama';
import { LLMProvider, AnalysisResult, LLMDebugInfo } from './index.js';
import { parseLLMJson } from './utils.js';

export class OllamaProvider implements LLMProvider {
  private ollama: Ollama;
  private latestDebugInfo: LLMDebugInfo | null = null;

  constructor(private options: { baseUrl: string; model: string }) {
    this.ollama = new Ollama({ host: options.baseUrl });
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
    const prompt = `
Analyze these AI news items.
For each, provide: "summary" (one sentence, max 20 words) and "category" (e.g. Model Release, Research, Tool/SDK, Policy).

Return ONLY a raw JSON array of objects. No intro, no outro, no markdown backticks.

Items:
${articles.map((a, idx) => `ID ${idx}: ${a.title}`).join('\n')}
`;

    const startTime = Date.now();
    try {
      const response = await this.ollama.generate({
        model: this.options.model,
        system:
          'You are an AI signal analyst. Provide direct, objective summaries and categories. Always return a JSON array of objects.',
        prompt: prompt,
        stream: false,
        format: 'json',
        think: false,
      });

      const latencyMs = Date.now() - startTime;
      const finalResponse = response.response || '';

      this.latestDebugInfo = {
        prompt,
        rawResponse: finalResponse,
        latencyMs,
      };

      return parseLLMJson(finalResponse);
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
      const prompt = `Analyze this AI news item: "${article.title}". Provide a "summary" (one sentence) and a "category". Return JSON.`;

      try {
        const response = await this.ollama.generate({
          model: this.options.model,
          prompt,
          format: 'json',
          stream: false,
          think: false,
        });

        const parsed = parseLLMJson(response.response);
        results.push(parsed[0] || { summary: null, category: 'Uncategorized' });
        combinedRawResponse += `\n--- Item ${results.length} ---\n${response.response}`;
      } catch (error) {
        console.error(`[Ollama] Sequential Error for "${article.title}":`, error);
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
