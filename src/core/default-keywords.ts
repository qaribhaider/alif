export const BASE_KEYWORDS: Record<string, number> = {
  breakthrough: 20,
  'gpt-5': 30,
  o1: 20,
  deepseek: 25,
  'open source': 15,
  agi: 15,
  agent: 15,
};

/**
 * Negative keywords that penalise low-signal, clickbait, or promotional content.
 * Scores are positive numbers — they will be *subtracted* from the article score.
 */
export const NEGATIVE_KEYWORDS: Record<string, number> = {
  sponsored: 25,
  advertisement: 25,
  'top 10': 15,
  'top 5': 15,
  newsletter: 10,
  roundup: 10,
  waitlist: 15,
  discount: 20,
  'how to': 10,
  tutorial: 5,
  'sign up': 15,
  recap: 10,
};
