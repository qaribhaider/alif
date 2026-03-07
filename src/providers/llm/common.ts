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
  return `You are an AI news relevance scorer for a developer and researcher audience.
Rate each title from 0 to 100 based on genuine importance and novelty to the AI/ML industry.

FIRST — AUTOMATIC ZERO (score must be exactly 0):
Assign 0 immediately if the title contains any of these signals:
- Words: sponsored, advertisement, waitlist, discount, deal, coupon, giveaway
- Patterns: "How [Company] saved", "Top N [things]", "N tools/tips/ways"
- Any call-to-action: sign up, subscribe, register, join now

SCORING BANDS (for everything else):
- 80-100: Groundbreaking (major model release like GPT-5, AGI milestone, critical security breach)
- 50-79:  Significant (new useful developer tool or AI agent release, notable open-source model, major funding round, key hardware launch)
- 20-49:  Mildly interesting (policy update, incremental improvement, workshop or conference result)
- 1-19:   Low signal (tutorial, opinion piece, beginner guide)

IMPORTANT: Return EXACTLY ${titles.length} integer scores, one per title, in the same order. No missing values.

Titles:
${titles.map((t, i) => `${i}: ${t}`).join('\n')}
`;
}
