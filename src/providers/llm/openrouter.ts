import OpenAI from 'openai';
import { LLMProvider, AnalysisResult, LLMDebugInfo } from './index.js';
import { parseLLMJson } from './utils.js';

export class OpenRouterProvider implements LLMProvider {
  private client: OpenAI;
  private latestDebugInfo: LLMDebugInfo | null = null;

  constructor(private options: { apiKey: string; model: string }) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.options.apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/qarib/alif',
        'X-Title': 'Alif CLI',
      },
    });
  }

  async analyze(
    articles: { title: string; content?: string }[],
    options?: { sequential?: boolean },
  ): Promise<AnalysisResult[]> {
    if (articles.length === 0) return [];

    if (options?.sequential) {
      // For now, OpenRouter doesn't strictly need sequential for stability,
      // but we satisfy the interface. We could implement it later if needed.
    }

    const prompt = `
Analyze the following AI-related news items. For each item, provide:
1. A concise, one-sentence summary (max 30 words).
2. A category (e.g., "Model Release", "Research", "Tool/SDK", "Policy", "Industry News", "Tutorial").

Return ONLY a JSON array of objects with keys "summary" and "category". Match the order of the input items.

Items:
${articles.map((a, idx) => `${idx + 1}. TITLE: ${a.title}\nCONTENT: ${a.content || 'None'}`).join('\n\n')}
`;

    const startTime = Date.now();
    try {
      const response = await this.client.chat.completions.create({
        model: this.options.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an AI signal analyst. Provide direct, objective summaries and categories. Do NOT include any reasoning, thinking process, or <think> tags. Always return a raw JSON array of objects. No intro, no outro, no markdown backticks.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      this.latestDebugInfo = {
        prompt,
        rawResponse: content || '<<< EMPTY >>>',
        latencyMs: Date.now() - startTime,
      };

      if (!content) throw new Error('Empty response from OpenRouter');
      return parseLLMJson(content);
    } catch (error) {
      console.error(
        `[OpenRouter] Error: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (!this.latestDebugInfo) {
        this.latestDebugInfo = {
          prompt,
          rawResponse: error instanceof Error ? error.message : String(error),
          latencyMs: Date.now() - startTime,
        };
      }

      return articles.map(() => ({ summary: null, category: 'Uncategorized' }));
    }
  }

  getLatestDebugInfo(): LLMDebugInfo | null {
    return this.latestDebugInfo;
  }
}
