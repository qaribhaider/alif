export const BASE_KEYWORDS: Record<string, number> = {
  // Frontier & AGI
  agi: 50,
  superintelligence: 45,
  'foundation model': 40,
  'scaling laws': 40,
  'arc-agi': 35,
  reasoning: 30,

  // Architectural Paradigms
  'inference scaling': 45,
  'test-time compute': 45,
  multimodal: 40,
  moe: 35,
  'mixture of experts': 35,
  mcts: 35,
  mamba: 30,
  ssm: 30,
  quantization: 25,
  distillation: 25,

  // The Agentic Stack
  agentic: 50,
  orchestration: 40,
  autonomous: 40,
  'model context protocol': 40,
  mcp: 35,
  'agent swarm': 35,
  'tool use': 30,
  'self-correction': 30,
  'vibe coding': 25,

  // Industry & Corporate Shifts
  layoffs: 50,
  restructuring: 45,
  acquisition: 40,
  merger: 40,
  ipo: 40,
  antitrust: 35,
  investment: 30,
  funding: 30,

  // Compute & Infrastructure
  compute: 45,
  gpu: 40,
  tpu: 40,
  blackwell: 40,
  h100: 35,
  b200: 35,
  nvlink: 30,
  vram: 25,
  latency: 25,

  // Models & Ecosystem
  llm: 35,
  'open source': 40,
  'open weights': 30,
  github: 25,
  repo: 25,
  repository: 25,
  traction: 20,
  acquire: 40,
  launch: 30,
  ban: 30,
  broken: 30,
  llama: 25,
  deepseek: 25,
  mistral: 25,
  qwen: 25,
  claude: 20,
  gemini: 20,
  gpt: 20,
};

/**
 * Negative keywords that penalise low-signal, clickbait, or promotional content.
 * These are substantial penalties to ensure high signal density.
 */
export const NEGATIVE_KEYWORDS: Record<string, number> = {
  // Promotional
  sponsored: 50,
  advertisement: 50,
  deals: 45,
  discount: 45,
  coupon: 40,
  'limited time': 35,
  bundle: 30,

  // Noise & Fluff
  'dating app': 60,
  'mac apps': 50,
  'best apps': 45,
  'top 10': 40,
  'top 5': 40,
  waitlist: 35,
  'sign up': 35,
  newsletter: 30,
  roundup: 30,
  recap: 30,

  // Entry-level / Low-signal Technical
  tutorial: 45,
  'how to': 45,
  beginner: 40,
  basics: 40,
  'for everyone': 35,

  // Misaligned Technical
  terminal: 30,
  bash: 30,
  bypassing: 40,
  'red team': 35,
  leak: 30,
  rumor: 30,

  // Meta-discussion & PR Noise
  framework: 20,
  spec: 20,
  approach: 15,
  measuring: 15,
  insight: 10,
  'system card': 40,
  expanding: 15,
  'now on': 15,
  blueprint: 15,
};
