// AI analysis types

import type { Issue } from './types';

export interface AIAnalysisResult {
  overallAssessment: string;
  issuesFound: AIIssue[];
  suggestions: string[];
  toneAnalysis: string;
  readabilityFeedback: string;
  strengthsIdentified: string[];
  estimatedCost: number;
  tokensUsed: number;
  timestamp: number;
}

export interface AIIssue {
  type: 'guideline-violation' | 'tone-issue' | 'clarity-issue' | 'accessibility-concern';
  severity: 'critical' | 'moderate' | 'minor';
  description: string;
  suggestion: string;
  guidelineReference?: string;
  affectedText?: string;
}

export interface OpenAISettings {
  apiKey: string;
  model: 'gpt-4' | 'gpt-4-turbo-preview' | 'gpt-3.5-turbo' | 'gpt-4-vision-preview' | 'gpt-4-turbo' | 'gpt-4o';
  enabled: boolean;
  guidelines?: string; // For AI analysis
  customGuidelines?: string; // For Clear-Co Copy copywriting
  enableCopywriting?: boolean; // Enable Clear-Co Copy feature
}

export interface AIAnalysisRequest {
  text: string;
  elementType?: string;
  context?: string;
}
