import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '../src/providers/llm/ollama.js';

vi.mock('ollama', () => {
  return {
    Ollama: class {
      generate = vi.fn();
    },
  };
});

describe('OllamaProvider', () => {
  const options = { baseUrl: 'http://localhost:11434', model: 'test-model' };
  let provider: OllamaProvider;
  let mockOllamaInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OllamaProvider(options);
    // @ts-expect-error - access private for testing
    mockOllamaInstance = provider.ollama;
  });

  it('should return empty array if no articles provided', async () => {
    const result = await provider.analyze([]);
    expect(result).toEqual([]);
  });

  it('should parse valid JSON response from Ollama', async () => {
    mockOllamaInstance.generate.mockResolvedValue({
      response: JSON.stringify([
        { summary: 'AI reaches breakthrough.', category: 'Research' },
        { summary: 'New model released.', category: 'Model Release' },
      ]),
    });

    const articles = [{ title: 'Article 1' }, { title: 'Article 2' }];
    const result = await provider.analyze(articles);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ summary: 'AI reaches breakthrough.', category: 'Research' });
    expect(result[1]).toEqual({ summary: 'New model released.', category: 'Model Release' });
  });

  it('should handle single object response by wrapping in array', async () => {
    mockOllamaInstance.generate.mockResolvedValue({
      response: JSON.stringify({ summary: 'Single breakthrough.', category: 'Research' }),
    });

    const result = await provider.analyze([{ title: 'Article 1' }]);
    expect(result).toHaveLength(1);
    expect(result[0].summary).toBe('Single breakthrough.');
  });

  it('should return default objects on parse error', async () => {
    mockOllamaInstance.generate.mockResolvedValue({
      response: 'Invalid JSON',
    });

    const articles = [{ title: 'Article 1' }];
    const result = await provider.analyze(articles);

    expect(result).toHaveLength(1);
    // Should fallback to keyword based categorization since parse failed
    expect(result[0].category).toBe('Uncategorized');
  });

  it('should handle empty response from Ollama', async () => {
    mockOllamaInstance.generate.mockResolvedValue({
      response: '',
    });

    const result = await provider.analyze([{ title: 'Article 1' }]);
    expect(result[0]).toEqual({ summary: null, category: 'Uncategorized' });
  });

  it('should handle markdown-wrapped JSON response', async () => {
    mockOllamaInstance.generate.mockResolvedValue({
      response:
        'Here is the analysis:\n```json\n[{"summary": "Markdown works.", "category": "Test"}]\n```',
    });

    const result = await provider.analyze([{ title: 'Article 1' }]);
    expect(result[0].summary).toBe('Markdown works.');
  });

  it('should handle text-wrapped JSON response', async () => {
    mockOllamaInstance.generate.mockResolvedValue({
      response: 'The result is: [{"summary": "Text wrapped.", "category": "Test"}] end of message.',
    });

    const result = await provider.analyze([{ title: 'Article 1' }]);
    expect(result[0].summary).toBe('Text wrapped.');
  });

  it('should support sequential processing', async () => {
    mockOllamaInstance.generate
      .mockResolvedValueOnce({
        response: JSON.stringify([{ summary: 'Seq 1', category: 'Research' }]),
      })
      .mockResolvedValueOnce({
        response: JSON.stringify([{ summary: 'Seq 2', category: 'Tool/SDK' }]),
      });

    const articles = [{ title: 'Article 1' }, { title: 'Article 2' }];
    const result = await provider.analyze(articles, { sequential: true });

    expect(result).toHaveLength(2);
    expect(result[0].summary).toBe('Seq 1');
    expect(result[1].summary).toBe('Seq 2');
    expect(mockOllamaInstance.generate).toHaveBeenCalledTimes(2);
  });
});
