// Capitalization checker
// Guideline 2.1: Use sentence case for all UI elements

import type { Issue } from './types';
import { detectElementType } from './elementDetector';

/**
 * Check if text follows sentence case rules
 * Sentence case = only first word and proper nouns capitalized
 */
export function checkCapitalization(text: string): Issue[] {
  const issues: Issue[] = [];
  const trimmed = text.trim();

  if (!trimmed || trimmed.length === 0) {
    return issues;
  }

  const elementType = detectElementType(trimmed);

  // Skip body text (longer content can have different capitalization for emphasis)
  if (elementType === 'body-text') {
    return issues;
  }

  // Check for Title Case (multiple words with capital letters)
  if (isTitleCase(trimmed)) {
    const sentenceCaseVersion = toSentenceCase(trimmed);

    issues.push({
      id: `capitalization-title-case`,
      guidelineId: 'capitalization-sentence-case',
      category: 'structure',
      severity: 'warning',
      title: 'Use sentence case',
      message: 'UI elements should use sentence case, not Title Case.',
      suggestion: `Try: "${sentenceCaseVersion}"`,
      guidelineSection: '2.1 Capitalization',
      explanation: 'Sentence case (only first word capitalized) is easier to read and more accessible than Title Case.',
      problematicText: trimmed
    });
  }

  // Check for ALL CAPS (except single-letter acronyms)
  if (isAllCaps(trimmed) && trimmed.length > 3) {
    issues.push({
      id: `capitalization-all-caps`,
      guidelineId: 'capitalization-sentence-case',
      category: 'structure',
      severity: 'warning',
      title: 'Avoid all caps',
      message: 'Avoid using ALL CAPS. Use sentence case instead.',
      suggestion: `Try: "${toSentenceCase(trimmed)}"`,
      guidelineSection: '2.1 Capitalization',
      explanation: 'ALL CAPS text is harder to read and can be perceived as shouting.',
      problematicText: trimmed
    });
  }

  return issues;
}

/**
 * Check if text is in Title Case
 * (Multiple words with each word capitalized)
 */
function isTitleCase(text: string): boolean {
  const words = text.split(/\s+/);

  // Need at least 2 words to be Title Case
  if (words.length < 2) {
    return false;
  }

  // Count capitalized words (excluding small words that might be lowercase)
  const capitalizedCount = words.filter(word => {
    // Skip articles and prepositions that are often lowercase in Title Case
    const smallWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of'];
    if (smallWords.includes(word.toLowerCase())) {
      return false;
    }

    return word.length > 0 && /^[A-Z]/.test(word);
  }).length;

  // If more than half the words are capitalized, it's likely Title Case
  return capitalizedCount >= Math.ceil(words.length / 2);
}

/**
 * Check if text is ALL CAPS
 */
function isAllCaps(text: string): boolean {
  // Remove non-letter characters for checking
  const letters = text.replace(/[^a-zA-Z]/g, '');

  if (letters.length === 0) {
    return false;
  }

  // Check if all letters are uppercase
  return letters === letters.toUpperCase();
}

/**
 * Convert text to sentence case
 * First word capitalized, rest lowercase (except proper nouns/acronyms)
 */
function toSentenceCase(text: string): string {
  if (!text) return text;

  const words = text.split(/\s+/);

  return words
    .map((word, index) => {
      // Keep acronyms (all caps words of 2-5 letters) as is
      if (word.length >= 2 && word.length <= 5 && word === word.toUpperCase()) {
        return word;
      }

      // Capitalize first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }

      // Lowercase other words
      return word.toLowerCase();
    })
    .join(' ');
}
