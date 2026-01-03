// Readability calculation using Flesch-Kincaid and other metrics

import type { ReadabilityMetrics } from './types';

/**
 * Calculate readability metrics for the given text
 * Target: 6th-8th grade reading level per guidelines
 */
export function calculateReadability(text: string): ReadabilityMetrics {
  const cleanText = text.trim();

  if (!cleanText) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      averageSentenceLength: 0,
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      passesReadabilityTarget: false
    };
  }

  // Count words
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;

  // Count sentences (split on period, exclamation, question mark)
  const sentences = cleanText
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;

  // Calculate average sentence length
  const averageSentenceLength = wordCount / sentenceCount;

  // Count syllables for readability formulas
  const syllableCount = countSyllables(cleanText);

  // Calculate Flesch Reading Ease (0-100, higher is easier)
  // Formula: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const fleschEase = 206.835 - 1.015 * averageSentenceLength - 84.6 * (syllableCount / wordCount);

  // Calculate Flesch-Kincaid Grade Level
  // Formula: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const gradeLevel = 0.39 * averageSentenceLength + 11.8 * (syllableCount / wordCount) - 15.59;

  // Check if it passes the readability target (6th-8th grade)
  const passesReadabilityTarget = gradeLevel >= 6 && gradeLevel <= 8;

  return {
    wordCount,
    sentenceCount,
    averageSentenceLength: Math.round(averageSentenceLength * 10) / 10,
    fleschReadingEase: Math.round(fleschEase * 10) / 10,
    fleschKincaidGrade: Math.round(gradeLevel * 10) / 10,
    passesReadabilityTarget
  };
}

/**
 * Count syllables in text
 * Simple algorithm: count vowel groups
 */
function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let totalSyllables = 0;

  for (const word of words) {
    if (word.length === 0) continue;

    // Remove non-alphabetic characters
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (cleanWord.length === 0) continue;

    // Count vowel groups
    let syllables = 0;
    let previousWasVowel = false;

    for (const char of cleanWord) {
      const isVowel = /[aeiouy]/.test(char);

      if (isVowel && !previousWasVowel) {
        syllables++;
      }

      previousWasVowel = isVowel;
    }

    // Adjust for silent 'e' at the end
    if (cleanWord.endsWith('e') && syllables > 1) {
      syllables--;
    }

    // Every word has at least one syllable
    if (syllables === 0) {
      syllables = 1;
    }

    totalSyllables += syllables;
  }

  return totalSyllables;
}
