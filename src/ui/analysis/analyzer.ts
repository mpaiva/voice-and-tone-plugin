// Main analysis engine that runs all checks

import type { AnalysisResult, Issue, ReadabilityMetrics } from './types';
import { calculateReadability } from './readability';
import { checkSentenceLength } from './sentenceLength';
import { checkPassiveVoice } from './passiveVoice';
import { checkWordChoice } from './wordChoice';
import { checkCapitalization } from './capitalization';
import { checkPunctuation } from './punctuation';
import { checkButtonLabels } from './buttonLabels';
import { checkErrorMessages } from './errorMessages';

/**
 * Analyze text against voice and tone guidelines
 */
export function analyzeText(text: string): AnalysisResult {
  if (!text || text.trim().length === 0) {
    return {
      text: '',
      metrics: {
        wordCount: 0,
        sentenceCount: 0,
        averageSentenceLength: 0,
        fleschReadingEase: 0,
        fleschKincaidGrade: 0,
        passesReadabilityTarget: false
      },
      issues: [],
      overallScore: 0,
      passesGuidelines: false,
      timestamp: Date.now()
    };
  }

  // Calculate readability metrics
  const metrics = calculateReadability(text);

  // Run all checks
  const issues: Issue[] = [
    // Phase 3: Plain language checks
    ...checkSentenceLength(text),
    ...checkPassiveVoice(text),
    ...checkWordChoice(text),
    // Phase 4: UI element-specific checks
    ...checkCapitalization(text),
    ...checkPunctuation(text),
    ...checkButtonLabels(text),
    ...checkErrorMessages(text)
  ];

  // Calculate overall score
  const overallScore = calculateOverallScore(metrics, issues);
  const passesGuidelines = overallScore >= 70 && metrics.passesReadabilityTarget;

  return {
    text,
    metrics,
    issues,
    overallScore,
    passesGuidelines,
    timestamp: Date.now()
  };
}

/**
 * Calculate overall score based on metrics and issues
 */
function calculateOverallScore(metrics: ReadabilityMetrics, issues: Issue[]): number {
  let score = 100;

  // Deduct points for readability issues
  if (!metrics.passesReadabilityTarget) {
    score -= 20;
  }

  // Deduct points for issues by severity
  for (const issue of issues) {
    if (issue.severity === 'error') {
      score -= 10;
    } else if (issue.severity === 'warning') {
      score -= 5;
    } else if (issue.severity === 'suggestion') {
      score -= 2;
    }
  }

  return Math.max(0, Math.min(100, score));
}
