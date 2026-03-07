export const BASE_KEYWORDS: Record<string, number> = {
  // Vision & Concepts
  agi: 45,
  breakthrough: 30,

  // Future / Highly Speculative Models
  'gpt-6': 60,
  'claude 5': 60,
  'gemini 4': 60,
  'openai o4': 60,
  'sora 3': 60,
  'grok 5': 50,

  // High-Signal Current Models
  'gpt-5': 45,
  'claude 4': 40,
  'gemini 3': 40,
  'openai o3': 40,
  sora: 40,
  deepseek: 35,
  'grok 4': 30,

  // Hardware & Chips
  'nvidia rubin': 45,
  'nvidia blackwell': 35,
  'google antigravity': 45,

  // Architectural Trends / Techniques
  'test-time compute': 35,
  'inference scaling': 35,
  'model context protocol': 30,
  mcp: 20,
  agentic: 30,
  mcts: 25,
  'self-verification': 25,

  // Prominent AI Agents & Workflow Tools
  agent: 15,
  'claude code': 30,
  qwen: 25,
  kimi: 25,
  mistral: 25,
  devstral: 25,
  kilocode: 20,
  cline: 20,
  cursor: 20,
  windsurf: 20,
  roocode: 20,
  openclaw: 20,
  'vibe coding': 20,
  'deepl agent': 20,
  parl: 20,
  flux: 20,
  aider: 20,

  // Specific Dev Tools & Hubs
  'github copilot': 15,
  zencoder: 15,
  'aws kiro': 15,
  'jetbrains junie': 15,
  augment: 15,
  'nvidia vera': 15,
  'spectrum-x': 15,
  bluefield: 15,
  nvlink: 15,
  hbm4: 15,
  'arc-agi': 15,
  lmarena: 15,
  'open source': 10,
  't2i-corebench': 10,
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
