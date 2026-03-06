import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '../src/providers/llm/ollama.js';
import { AnthropicProvider } from '../src/providers/llm/anthropic.js';
import { generateText, Output } from 'ai';

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: {
    object: vi.fn().mockReturnValue({}),
  },
}));

vi.mock('ollama-ai-provider-v2', () => ({
  createOllama: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn().mockReturnValue(vi.fn()),
}));

describe('LLM Providers (AI SDK)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure Output.object mock is reset
    vi.mocked(Output.object).mockReturnValue({} as any);
  });

  describe('OllamaProvider', () => {
    const provider = new OllamaProvider({ baseUrl: 'http://localhost:11434', model: 'test-model' });

    it('should parse valid response using generateText', async () => {
      vi.mocked(generateText).mockResolvedValue({
        output: {
          signals: [{ summary: 'AI breakthrough.', category: 'Research' }],
        },
      } as any);

      const result = await provider.analyze([{ title: 'Article 1' }]);
      expect(result).toHaveLength(1);
      expect(result[0].summary).toBe('AI breakthrough.');
      expect(generateText).toHaveBeenCalled();
    });

    it('should handle sequential processing', async () => {
      vi.mocked(generateText).mockResolvedValue({
        output: { summary: 'Seq 1', category: 'Research' },
      } as any);

      const result = await provider.analyze([{ title: 'A1' }, { title: 'A2' }], {
        sequential: true,
      });
      expect(result).toHaveLength(2);
      expect(generateText).toHaveBeenCalledTimes(2);
    });
  });

  describe('AnthropicProvider', () => {
    const provider = new AnthropicProvider({ apiKey: 'test-key', model: 'claude-3' });

    it('should use generateText for analysis', async () => {
      vi.mocked(generateText).mockResolvedValue({
        output: {
          signals: [{ summary: 'Anthropic result.', category: 'Model Release' }],
        },
      } as any);

      const result = await provider.analyze([{ title: 'Article 1' }]);
      expect(result[0].summary).toBe('Anthropic result.');
    });
  });
});
