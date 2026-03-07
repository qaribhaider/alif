export interface AnalysisResult {
  summary: string | null;
  category: string;
}

export interface LLMDebugInfo {
  prompt: string;
  rawResponse: string;
  latencyMs: number;
}

export interface LLMProvider {
  analyze(
    articles: { title: string; content?: string }[],
    options?: { sequential?: boolean },
  ): Promise<AnalysisResult[]>;
  score(titles: string[]): Promise<number[]>;
  getLatestDebugInfo?(): LLMDebugInfo | null;
}
