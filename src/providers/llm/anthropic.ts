import axios from 'axios';
import { LLMProvider, AnalysisResult } from './index.js';
import { parseLLMJson } from './utils.js';

export class AnthropicProvider implements LLMProvider {
  constructor(private options: { apiKey: string; model: string }) { }

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
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.options.model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
          system:
            'You are an AI signal analyst. Be precise and objective. You respond ONLY with valid JSON array.',
        },
        {
          headers: {
            'x-api-key': this.options.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
        },
      );

      const content = response.data.content[0].text;
      return parseLLMJson(content);
    } catch (error) {
      console.error(`[Anthropic] Error: ${error instanceof Error ? error.message : String(error)}`);
      return articles.map(() => ({ summary: null, category: 'Uncategorized' }));
    }
  }
}
