export interface AnalysisResult {
  summary: string | null;
  category: string;
}

export interface LLMProvider {
  analyze(articles: { title: string; content?: string }[]): Promise<AnalysisResult[]>;
}
