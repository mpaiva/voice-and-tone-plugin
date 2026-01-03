// Button label pattern checker
// Guideline 3.3: Use verb + noun format for buttons

import type { Issue } from './types';
import { detectElementType } from './elementDetector';

// Approved action verbs from guidelines Section 4
const APPROVED_VERBS = [
  'add', 'create', 'edit', 'update', 'remove', 'delete', 'save', 'submit',
  'view', 'search', 'find', 'filter', 'sort', 'browse', 'open', 'download',
  'upload', 'import', 'export', 'sync', 'approve', 'decline', 'cancel',
  'continue', 'back', 'next', 'finish', 'start', 'stop', 'enable', 'disable',
  'connect', 'disconnect', 'assign', 'schedule', 'complete', 'request', 'review'
];

// Vague/generic words that should be avoided
const VAGUE_LABELS = ['ok', 'yes', 'no', 'submit', 'click here', 'here'];

/**
 * Check button labels for proper patterns
 */
export function checkButtonLabels(text: string): Issue[] {
  const issues: Issue[] = [];
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed || trimmed.length === 0) {
    return issues;
  }

  const elementType = detectElementType(trimmed);

  // Only check if it's detected as a button
  if (elementType !== 'button') {
    return issues;
  }

  // Check for vague labels
  if (VAGUE_LABELS.includes(lower)) {
    issues.push({
      id: 'button-vague',
      guidelineId: 'button-specific',
      category: 'clarity',
      severity: 'warning',
      title: 'Button label too vague',
      message: `"${trimmed}" is too generic. Use a specific action.`,
      suggestion: 'Use verb + noun format. Example: "Save changes", "Delete account", "Add member"',
      guidelineSection: '3.3 Button Labels',
      explanation: 'Specific button labels make the consequence clear and improve accessibility.',
      problematicText: trimmed
    });
    return issues; // Don't check other patterns if it's vague
  }

  const words = trimmed.split(/\s+/);
  const firstWord = words[0].toLowerCase();

  // Check if starts with an action verb
  if (words.length >= 1 && !APPROVED_VERBS.includes(firstWord)) {
    // Check if it's a common exception (like "Cancel", "Back", "Next")
    const exceptions = ['cancel', 'back', 'next', 'close', 'done', 'got it'];
    if (!exceptions.includes(lower)) {
      issues.push({
        id: 'button-no-verb',
        guidelineId: 'button-verb-noun',
        category: 'structure',
        severity: 'suggestion',
        title: 'Button should start with action verb',
        message: 'Buttons should use verb + noun format for clarity.',
        suggestion: `Consider starting with an action verb: "Add ${trimmed}", "View ${trimmed}", etc.`,
        guidelineSection: '3.3 Button Labels',
        explanation: 'Verb + noun format makes the action clear and follows accessibility best practices.',
        problematicText: trimmed
      });
    }
  }

  // Check if button is just a verb without context (except standard ones)
  if (words.length === 1) {
    const standardSingleWord = ['cancel', 'close', 'done', 'back', 'next', 'ok', 'save'];
    if (!standardSingleWord.includes(lower) && APPROVED_VERBS.includes(firstWord)) {
      issues.push({
        id: 'button-no-noun',
        guidelineId: 'button-verb-noun',
        category: 'clarity',
        severity: 'suggestion',
        title: 'Add context to button label',
        message: `"${trimmed}" should specify what will be ${lower}.`,
        suggestion: `Try: "${trimmed} [item]" - Example: "Save changes", "Delete account"`,
        guidelineSection: '3.3 Button Labels',
        explanation: 'Adding a noun after the verb makes the button\'s purpose clearer.',
        problematicText: trimmed
      });
    }
  }

  return issues;
}
