import OpenAI from 'openai';
import { LLMProvider, AnalysisResult } from './index.js';
import { parseLLMJson } from './utils.js';

export class OpenRouterProvider implements LLMProvider {
  private client: OpenAI;

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

  async analyze(articles: { title: string; content?: string }[]): Promise<AnalysisResult[]> {
    if (articles.length === 0) return [];

    const prompt = `
Analyze the following AI-related news items. For each item, provide:
1. A concise, one-sentence summary (max 30 words).
2. A category (e.g., "Model Release", "Research", "Tool/SDK", "Policy", "Industry News", "Tutorial").

Return ONLY a JSON array of objects with keys "summary" and "category". Match the order of the input items.

Items:
${articles.map((a, idx) => `${idx + 1}. TITLE: ${a.title}\nCONTENT: ${a.content || 'None'}`).join('\n\n')}
`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.options.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('Empty response from OpenRouter');

      return parseLLMJson(content);
    } catch (error) {
      console.error(`[OpenRouter] Error: ${error instanceof Error ? error.message : String(error)}`);
      return articles.map(() => ({ summary: null, category: 'Uncategorized' }));
    }
  }
}
