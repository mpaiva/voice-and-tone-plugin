// Sentence length checker
// Guideline 1.0: "Aim for 15-20 words maximum per sentence"

import type { Issue } from './types';

const MAX_SENTENCE_LENGTH = 20;

/**
 * Check for sentences that exceed the recommended length
 */
export function checkSentenceLength(text: string): Issue[] {
  const issues: Issue[] = [];

  // Split into sentences
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  sentences.forEach((sentence, index) => {
    const words = sentence.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    if (wordCount > MAX_SENTENCE_LENGTH) {
      issues.push({
        id: `sentence-length-${index}`,
        guidelineId: 'sentence-length',
        category: 'clarity',
        severity: 'warning',
        title: 'Sentence too long',
        message: `This sentence has ${wordCount} words. Keep sentences under ${MAX_SENTENCE_LENGTH} words.`,
        suggestion: 'Break this into shorter sentences. Each sentence should express one main idea.',
        guidelineSection: '1.0 Plain Language Guidelines',
        explanation: 'Shorter sentences reduce cognitive load and improve readability for all users, especially those with cognitive disabilities.',
        sentenceIndex: index,
        problematicText: sentence.substring(0, 100) + (sentence.length > 100 ? '...' : '')
      });
    }
  });

  return issues;
}
