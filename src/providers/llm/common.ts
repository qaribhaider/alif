import { z } from 'zod';

/**
 * Common schema for article analysis results.
 * Used by all LLM providers to ensure consistent structured output.
 */
export const AnalysisSchema = z.object({
  signals: z.array(
    z.object({
      summary: z.string().nullable(),
      category: z.string(),
    }),
  ),
});

/**
 * Schema for a single article (used in sequential mode).
 */
export const SingleArticleSchema = z.object({
  summary: z.string().nullable(),
  category: z.string(),
});

/**
 * Schema for Layer 2 batch scoring — returns one score per title.
 */
export const ScoringSchema = z.object({
  scores: z.array(z.number().min(0).max(100)),
});

/**
 * Common system prompt for all signal analysis tasks.
 */
export const SYSTEM_PROMPT =
  'You are an AI signal analyst. Provide direct, objective summaries and categories for each input item.';

/**
 * Generates the standard batch analysis prompt.
 */
export function getBatchPrompt(articles: { title: string; content?: string }[]): string {
  return `
Analyze these AI news items.
For each, provide: "summary" (one sentence, max 20 words) and "category" (e.g. Model Release, Research, Tool/SDK, Policy).

Items:
${articles.map((a, idx) => `ID ${idx}: ${a.title}`).join('\n')}
`;
}

/**
 * Generates the standard sequential analysis prompt.
 */
export function getSinglePrompt(article: { title: string; content?: string }[]): string {
  const a = article[0]; // Usually passed as array of one
  return `Analyze this AI news item: "${a.title}". Provide a "summary" (one sentence) and a "category".`;
}

/**
 * Generates the scoring prompt for Layer 2 — batches all titles and asks for a score per item.
 */
export function getScoringPrompt(titles: string[]): string {
  return `You are an AI news relevance scorer. For each title, rate its importance and novelty to the AI/ML industry on a scale from 0 to 100.
100 = groundbreaking (e.g. GPT-5 launch, AGI announcement).
50  = significant (e.g. a notable new open-source model).
0   = noise/irrelevant (e.g. a sponsored post or "top 10 tips").

Return ONLY a JSON array of integers, one per title, in the same order.

Titles:
${titles.map((t, i) => `${i}: ${t}`).join('\n')}
`;
}
