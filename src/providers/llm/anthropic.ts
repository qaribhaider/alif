import axios from 'axios';
import { LLMProvider, AnalysisResult, LLMDebugInfo } from './index.js';
import { parseLLMJson } from './utils.js';

export class AnthropicProvider implements LLMProvider {
  private latestDebugInfo: LLMDebugInfo | null = null;

  constructor(private options: { apiKey: string; model: string }) {}

  async analyze(
    articles: { title: string; content?: string }[],
    options?: { sequential?: boolean },
  ): Promise<AnalysisResult[]> {
    if (articles.length === 0) return [];

    if (options?.sequential) {
      // Anthropic is robust enough for batching, so we satisfy the interface.
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
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.options.model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
          system:
            'You are an AI signal analyst. Provide direct, objective summaries and categories. Do NOT include any reasoning, thinking process, or <think> tags. Always return a raw JSON array of objects. No intro, no outro, no markdown backticks.',
        },
        {
          headers: {
            'x-api-key': this.options.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
        },
      );

      const latencyMs = Date.now() - startTime;
      const content = response.data.content[0].text;
      if (!content) throw new Error('Empty response from Anthropic');

      this.latestDebugInfo = {
        prompt,
        rawResponse: content,
        latencyMs,
      };

      return parseLLMJson(content);
    } catch (error) {
      console.error(`[Anthropic] Error: ${error instanceof Error ? error.message : String(error)}`);

      if (!this.latestDebugInfo || this.latestDebugInfo.latencyMs !== Date.now() - startTime) {
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
