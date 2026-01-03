// Punctuation validator
// Guideline 2.2: Punctuation rules for UI elements

import type { Issue } from './types';
import { detectElementType } from './elementDetector';

/**
 * Check punctuation rules for UI elements
 */
export function checkPunctuation(text: string): Issue[] {
  const issues: Issue[] = [];
  const trimmed = text.trim();

  if (!trimmed || trimmed.length === 0) {
    return issues;
  }

  const elementType = detectElementType(trimmed);

  // Check for periods at end of labels, buttons, headings
  if (shouldNotHavePeriod(elementType) && trimmed.endsWith('.')) {
    issues.push({
      id: 'punctuation-period',
      guidelineId: 'punctuation-no-periods',
      category: 'structure',
      severity: 'warning',
      title: 'Remove period',
      message: `${getElementName(elementType)} should not end with a period.`,
      suggestion: `Remove the period: "${trimmed.slice(0, -1)}"`,
      guidelineSection: '2.2 Punctuation',
      explanation: 'Labels, headings, and button text should not have periods at the end.',
      problematicText: trimmed
    });
  }

  // Check for colons after form labels
  if (elementType === 'form-label' && trimmed.endsWith(':')) {
    issues.push({
      id: 'punctuation-colon',
      guidelineId: 'punctuation-no-colons',
      category: 'structure',
      severity: 'warning',
      title: 'Remove colon',
      message: 'Form labels should not end with a colon.',
      suggestion: `Remove the colon: "${trimmed.slice(0, -1)}"`,
      guidelineSection: '2.2 Punctuation',
      explanation: 'Modern UI design omits colons after form labels for a cleaner look.',
      problematicText: trimmed
    });
  }

  // Check for excessive exclamation marks
  const exclamationCount = (trimmed.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    issues.push({
      id: 'punctuation-excessive-exclamation',
      guidelineId: 'punctuation-exclamation',
      category: 'tone',
      severity: 'warning',
      title: 'Excessive exclamation marks',
      message: 'Avoid using multiple exclamation marks.',
      suggestion: 'Use a single exclamation mark or remove it entirely.',
      guidelineSection: '2.2 Punctuation',
      explanation: 'Multiple exclamation marks appear unprofessional and can be overwhelming.',
      problematicText: trimmed
    });
  }

  // Check for exclamation marks in error messages
  if (elementType === 'error-message' && trimmed.includes('!')) {
    issues.push({
      id: 'punctuation-error-exclamation',
      guidelineId: 'punctuation-exclamation',
      category: 'tone',
      severity: 'suggestion',
      title: 'Avoid exclamation in errors',
      message: 'Error messages should not use exclamation marks.',
      suggestion: 'Remove the exclamation mark. Error styling provides enough emphasis.',
      guidelineSection: '2.2 Punctuation',
      explanation: 'Exclamation marks can make errors feel more severe and alarming than necessary.',
      problematicText: trimmed
    });
  }

  return issues;
}

/**
 * Determine if this element type should not have a period at the end
 */
function shouldNotHavePeriod(elementType: string): boolean {
  return [
    'button',
    'form-label',
    'navigation',
    'heading'
  ].includes(elementType);
}

/**
 * Get a friendly name for the element type
 */
function getElementName(elementType: string): string {
  const names: Record<string, string> = {
    'button': 'Button labels',
    'form-label': 'Form labels',
    'navigation': 'Navigation items',
    'heading': 'Headings',
    'error-message': 'Error messages'
  };

  return names[elementType] || 'UI elements';
}
