// Error message quality checker
// Guideline 3.7: Be specific, suggest fixes, use helpful tone

import type { Issue } from './types';
import { detectElementType } from './elementDetector';

/**
 * Check error messages for quality and helpfulness
 */
export function checkErrorMessages(text: string): Issue[] {
  const issues: Issue[] = [];
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed || trimmed.length === 0) {
    return issues;
  }

  const elementType = detectElementType(trimmed);

  // Only check if it's detected as an error message
  if (elementType !== 'error-message') {
    return issues;
  }

  // Check for vague error messages
  if (isVagueError(lower)) {
    issues.push({
      id: 'error-vague',
      guidelineId: 'error-specific',
      category: 'clarity',
      severity: 'error',
      title: 'Error message too vague',
      message: 'Error messages should be specific about what went wrong.',
      suggestion: 'Explain exactly what the problem is. Example: "Enter a valid email address" not "Invalid input"',
      guidelineSection: '3.7 Error Messages',
      explanation: 'Specific error messages help users understand and fix problems quickly.',
      problematicText: trimmed
    });
  }

  // Check if error suggests a solution
  if (!hasSolution(lower)) {
    issues.push({
      id: 'error-no-solution',
      guidelineId: 'error-solution',
      category: 'clarity',
      severity: 'warning',
      title: 'Error should suggest solution',
      message: 'Error messages should tell users how to fix the problem.',
      suggestion: 'Add guidance: "Enter a date in MM/DD/YYYY format" or "Choose a start date before the end date"',
      guidelineSection: '3.7 Error Messages',
      explanation: 'Actionable error messages reduce frustration and help users complete tasks faster.',
      problematicText: trimmed
    });
  }

  // Check for blaming language
  if (hasBlame(lower)) {
    issues.push({
      id: 'error-blame',
      guidelineId: 'error-helpful-tone',
      category: 'tone',
      severity: 'warning',
      title: 'Error uses blaming language',
      message: 'Avoid blaming the user in error messages.',
      suggestion: 'Use neutral language: "Email not found" instead of "You entered a wrong email"',
      guidelineSection: '3.7 Error Messages',
      explanation: 'Helpful, blame-free language creates a better user experience.',
      problematicText: trimmed
    });
  }

  // Check for technical jargon
  if (hasTechnicalJargon(lower)) {
    issues.push({
      id: 'error-jargon',
      guidelineId: 'error-user-friendly',
      category: 'clarity',
      severity: 'warning',
      title: 'Error uses technical jargon',
      message: 'Error messages should avoid technical terms.',
      suggestion: 'Use plain language: "Something went wrong" instead of "Server error 500"',
      guidelineSection: '3.7 Error Messages',
      explanation: 'Non-technical language makes errors accessible to all users.',
      problematicText: trimmed
    });
  }

  return issues;
}

/**
 * Check if error message is vague
 */
function isVagueError(text: string): boolean {
  const vaguePatterns = [
    /^error$/,
    /^invalid$/,
    /^invalid input$/,
    /^error occurred$/,
    /^something went wrong$/,
    /^failed$/,
    /^validation error$/,
    /^incorrect$/
  ];

  return vaguePatterns.some(pattern => pattern.test(text));
}

/**
 * Check if error message suggests a solution
 */
function hasSolution(text: string): boolean {
  const solutionIndicators = [
    'enter', 'choose', 'select', 'click', 'try', 'use', 'provide',
    'must', 'should', 'need to', 'format', 'example', 'contact'
  ];

  return solutionIndicators.some(indicator => text.includes(indicator));
}

/**
 * Check for blaming language
 */
function hasBlame(text: string): boolean {
  const blamePatterns = [
    /\byou (entered|typed|selected|chose|clicked|made) (a |an )?(wrong|incorrect|invalid)/,
    /\byou must\b/,
    /\byour (entry|input|selection|choice) (is|was) (wrong|incorrect|invalid)/,
    /\byou forgot\b/,
    /\byou failed\b/
  ];

  return blamePatterns.some(pattern => pattern.test(text));
}

/**
 * Check for technical jargon
 */
function hasTechnicalJargon(text: string): boolean {
  const technicalTerms = [
    'server error', 'error 500', 'error 404', 'exception', 'null', 'undefined',
    'database', 'query', 'timeout', 'api', 'endpoint', 'validation failed',
    'syntax error', 'parse error', 'runtime error'
  ];

  return technicalTerms.some(term => text.includes(term));
}
