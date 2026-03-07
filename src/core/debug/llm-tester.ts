import { LLMProvider } from '../../providers/llm/index.js';
import { logger } from '../logger.js';

export interface TestArticle {
  title: string;
  content: string;
}

export const GOLDEN_SET: TestArticle[] = [
  {
    title: 'Claude Code is Now Available',
    content:
      'Anthropic has released Claude Code, a CLI tool that helps developers write code faster using Claude 3.5 Sonnet. It works directly in your terminal.',
  },
  {
    title: 'DeepSeek-V3 Open Source Release',
    content:
      'DeepSeek has open-sourced its latest model, DeepSeek-V3, claiming performance parity with GPT-4o while being significantly more efficient to train.',
  },
  {
    title: 'NVIDIA Unveils Next-Gen Blackwell GPUs',
    content:
      'At its annual conference, NVIDIA announced the Blackwell architecture, designed for the trillion-parameter scale of generative AI.',
  },
  {
    title: 'New EU AI Act Regulations Finalized',
    content:
      "European Union officials have finalized the text of the AI Act, the world's first comprehensive legal framework for artificial intelligence.",
  },
];

export class LLMTester {
  constructor(private provider: LLMProvider) {}

  async runTest(options?: { sequential?: boolean }) {
    logger.log('\n');
    logger.info(
      `[LLM Tester] Starting diagnostic test with ${GOLDEN_SET.length} articles (Mode: ${options?.sequential ? 'Sequential' : 'Batch'})...`,
    );

    const startTime = Date.now();
    const results = await this.provider.analyze(GOLDEN_SET, options);
    const totalLatency = Date.now() - startTime;

    const debugInfo = this.provider.getLatestDebugInfo?.();

    return {
      results,
      debugInfo,
      totalLatency,
    };
  }
}
