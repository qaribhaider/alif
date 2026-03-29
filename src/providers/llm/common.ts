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
  return `You are an AI signal analyst for a developer/researcher audience.
Rate each article title from 0 to 100 based on its grounding in major, structural AI/ML breakthroughs.

SCORING RUBRIC (BE RUTHLESS):
- 90-100: INDUSTRY SHIFTS. Major lab model releases (e.g. GPT-5, SOTA Reasoning), massive M&A/IPOs, paradigm-shifting local agent tools (e.g. Cline, Cursor, OpenClaw updates), or AGI-critical safety/infrastructure milestones.
- 70-89:  SOTA ADVANCEMENTS. High-quality research on inference scaling, new agentic orchestration patterns (MCP, Multi-agent swarms), hardware breakthroughs (e.g. Blackwell, Rubin), or major open-source weights (Llama 4, Mistral SOTA).
- 40-69:  TECHNICAL/PRACTICAL. Useful AI engineering guides, policy updates with real impact, niche research in specific domains (medical/physics AI), or notable startup funding rounds.
- 10-39:  NOISE/INCREMENTAL. Minor app updates, incremental wrapper news, general think-pieces, or "how-to" tutorials.
- 0:      ZERO SIGNAL. MUST be 0 for: sponsored/paid content, deals/discounts, "Top 10" listicles, terminal/CLI toy projects not related to AI, bypassing/jailbreaking news, or dating apps.

IMPORTANT: You MUST return exactly ${titles.length} scores, one per title, in the exact same order. DO NOT output index numbers. Output the actual computed score for each title.

Titles to score:
${titles.map((t) => `- ${t}`).join('\n')}
`;
}
