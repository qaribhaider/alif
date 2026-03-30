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
  return `Analyze this technical news item title: "${a.title}". 

INSTRUCTION (STRICT):
- Provide a "summary" (exactly one sentence, max 20 words).
- Extract information ONLY from the provided title.
- DO NOT invent facts (e.g., do not name projects, leads, or specs unless explicitly in the title).
- Provide a "category" (e.g. Model Release, Open Source, Event, Research, Tool/SDK, Policy).
`;
}

/**
 * Generates the scoring prompt for Layer 2 — batches all titles and asks for a score per item.
 */
export function getScoringPrompt(titles: string[]): string {
  return `You are an elite technology signal reviewer for a high-performance engineering audience.
Rate each title on its genuine relevance and "happenstance" (is something actually happening?).

SCORING PHILOSOPHY (BE RUTHLESS):
- 80-100: DISRUPTIVE EVENTS. Major model releases (GPT-5, Llama 4), M&A (acquisitions), new hardware (Blackwell), societal impacts (bans/laws), or GROUNDBREAKING OPEN-SOURCE (Trending AI repo launches).
- 50-79:  HIGH NOVELTY & ADVANCEMENTS. Exceptional technical breakthroughs (including legacy tech history like Voyager 1), or major research papers with proven SOTA results.
- 0-49:   TRASH (Zero Signal). MUST be 0-49 for:
    - Incremental marketing (e.g. "Now expanding to iOS", "Flash Live updates", "New regional availability").
    - Theoretical meta-discussion (Frameworks, Specs, System Cards, Research "Approaches").
    - Internal process PR (Safety Spec, Policy Blueprint, Team culture posts).
    - Generic tutorials, listicles, or terminal toy projects.

IMPORTANT: You MUST return exactly ${titles.length} scores, one per title, in the exact same order. DO NOT output index numbers. Output ONLY the computed score for each title.

Titles to score:
${titles.map((t) => `- ${t}`).join('\n')}
`;
}
