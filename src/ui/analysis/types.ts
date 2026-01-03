// Analysis types and interfaces

export type IssueSeverity = 'error' | 'warning' | 'suggestion';

export type IssueCategory = 'clarity' | 'tone' | 'structure' | 'accessibility';

export interface Issue {
  id: string;
  guidelineId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  message: string;
  suggestion?: string;
  guidelineSection?: string;
  explanation?: string;
  // Optional position information for highlighting
  sentenceIndex?: number;
  wordIndex?: number;
  problematicText?: string;
}

export interface ReadabilityMetrics {
  wordCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  passesReadabilityTarget: boolean; // Should be 6th-8th grade
}

export interface AnalysisResult {
  text: string;
  metrics: ReadabilityMetrics;
  issues: Issue[];
  overallScore: number; // 0-100
  passesGuidelines: boolean;
  timestamp: number;
}

export interface GuidelineRule {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  guidelineSection: string;
  checkFunction: (text: string) => Issue[];
}
