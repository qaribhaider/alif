import { AnalysisResult } from './index.js';

/**
 * Robustly parses a JSON string from LLM output.
 * Handles markdown code blocks and attempts to find the first array/object if surrounded by text.
 */
export function parseLLMJson(text: string): AnalysisResult[] {
    if (!text || text.trim() === '') {
        throw new Error('Empty response from LLM');
    }

    // Clean up markdown blocks if present
    let cleanText = text.trim();
    if (cleanText.includes('```')) {
        const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
            cleanText = match[1].trim();
        }
    }

    // Find the first instance of [ or {
    const firstArray = cleanText.indexOf('[');
    const firstObject = cleanText.indexOf('{');

    let startIndex = -1;
    if (firstArray !== -1 && (firstObject === -1 || firstArray < firstObject)) {
        startIndex = firstArray;
    } else if (firstObject !== -1) {
        startIndex = firstObject;
    }

    if (startIndex === -1) {
        throw new Error('No JSON structure found in LLM response');
    }

    // Truncate to the last ] or }
    const lastArray = cleanText.lastIndexOf(']');
    const lastObject = cleanText.lastIndexOf('}');
    const endIndex = Math.max(lastArray, lastObject);

    if (endIndex === -1 || endIndex < startIndex) {
        throw new Error('Incomplete JSON structure in LLM response');
    }

    const jsonStr = cleanText.substring(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonStr);

    const results = Array.isArray(parsed) ? parsed : [parsed];

    return results.map((item: any) => ({
        summary: item.summary || null,
        category: item.category || 'Uncategorized',
    }));
}
