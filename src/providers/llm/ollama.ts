import axios from 'axios';
import { LLMProvider, AnalysisResult } from './index.js';
import { parseLLMJson } from './utils.js';

export class OllamaProvider implements LLMProvider {
  constructor(private options: { baseUrl: string; model: string }) { }

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
      const response = await axios.post(`${this.options.baseUrl}/api/generate`, {
        model: this.options.model,
        system:
          'You are an AI signal analyst. Provide direct, objective summaries and categories. Do NOT include any reasoning, thinking process, or <think> tags. Always return a JSON array of objects.',
        prompt: prompt,
        stream: false,
        format: 'json',
      });

      return parseLLMJson(response.data.response);
    } catch (error) {
      console.error(`[Ollama] Error: ${error instanceof Error ? error.message : String(error)}`);
      return articles.map(() => ({ summary: null, category: 'Uncategorized' }));
    }
  }
}
