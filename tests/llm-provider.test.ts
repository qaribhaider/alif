import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { OllamaProvider } from '../src/providers/llm/ollama.js';

vi.mock('axios');

describe('OllamaProvider', () => {
    const options = { baseUrl: 'http://localhost:11434', model: 'test-model' };
    const provider = new OllamaProvider(options);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return empty array if no articles provided', async () => {
        const result = await provider.analyze([]);
        expect(result).toEqual([]);
    });

    it('should parse valid JSON response from Ollama', async () => {
        const mockResponse = {
            data: {
                response: JSON.stringify([
                    { summary: 'AI reaches breakthrough.', category: 'Research' },
                    { summary: 'New model released.', category: 'Model Release' }
                ])
            }
        };
        vi.mocked(axios.post).mockResolvedValue(mockResponse);

        const articles = [{ title: 'Article 1' }, { title: 'Article 2' }];
        const result = await provider.analyze(articles);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ summary: 'AI reaches breakthrough.', category: 'Research' });
        expect(result[1]).toEqual({ summary: 'New model released.', category: 'Model Release' });
    });

    it('should handle single object response by wrapping in array', async () => {
        const mockResponse = {
            data: {
                response: JSON.stringify({ summary: 'Single breakthrough.', category: 'Research' })
            }
        };
        vi.mocked(axios.post).mockResolvedValue(mockResponse);

        const result = await provider.analyze([{ title: 'Article 1' }]);
        expect(result).toHaveLength(1);
        expect(result[0].summary).toBe('Single breakthrough.');
    });

    it('should return default objects on parse error', async () => {
        const mockResponse = {
            data: {
                response: 'Invalid JSON'
            }
        };
        vi.mocked(axios.post).mockResolvedValue(mockResponse);

        const articles = [{ title: 'Article 1' }];
        const result = await provider.analyze(articles);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ summary: null, category: 'Uncategorized' });
    });

    it('should handle empty response from Ollama', async () => {
        const mockResponse = {
            data: {
                response: ''
            }
        };
        vi.mocked(axios.post).mockResolvedValue(mockResponse);

        const result = await provider.analyze([{ title: 'Article 1' }]);
        expect(result[0]).toEqual({ summary: null, category: 'Uncategorized' });
    });
    it('should handle markdown-wrapped JSON response', async () => {
        const mockResponse = {
            data: {
                response: 'Here is the analysis:\n```json\n[{"summary": "Markdown works.", "category": "Test"}]\n```'
            }
        };
        vi.mocked(axios.post).mockResolvedValue(mockResponse);

        const result = await provider.analyze([{ title: 'Article 1' }]);
        expect(result[0].summary).toBe('Markdown works.');
    });

    it('should handle text-wrapped JSON response', async () => {
        const mockResponse = {
            data: {
                response: 'The result is: [{"summary": "Text wrapped.", "category": "Test"}] end of message.'
            }
        };
        vi.mocked(axios.post).mockResolvedValue(mockResponse);

        const result = await provider.analyze([{ title: 'Article 1' }]);
        expect(result[0].summary).toBe('Text wrapped.');
    });
});
