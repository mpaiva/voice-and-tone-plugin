// Word choice checker
// Guideline 1.0: "Use everyday words" - Word Substitution List

import type { Issue } from './types';

// Word substitution dictionary from the guidelines
const WORD_SUBSTITUTIONS: Record<string, string> = {
  'commence': 'start or begin',
  'commencing': 'starting',
  'commenced': 'started',
  'utilize': 'use',
  'utilizes': 'uses',
  'utilizing': 'using',
  'utilized': 'used',
  'utilization': 'use',
  'terminate': 'end',
  'terminates': 'ends',
  'terminating': 'ending',
  'terminated': 'ended',
  'termination': 'ending',
  'modification': 'change',
  'modifications': 'changes',
  'modify': 'change',
  'modifies': 'changes',
  'modifying': 'changing',
  'modified': 'changed',
  'remuneration': 'payment',
  'implement': 'put in place',
  'implements': 'puts in place',
  'implementing': 'putting in place',
  'implemented': 'put in place',
  'implementation': 'putting in place',
  'facilitate': 'help',
  'facilitates': 'helps',
  'facilitating': 'helping',
  'facilitated': 'helped',
  'personnel': 'people or employees',
  'inquire': 'ask',
  'inquires': 'asks',
  'inquiring': 'asking',
  'inquired': 'asked',
  'inquiry': 'question',
  'sufficient': 'enough',
  'prior to': 'before',
  'subsequent to': 'after',
  'regarding': 'about',
  'demonstrate': 'show',
  'demonstrates': 'shows',
  'demonstrating': 'showing',
  'demonstrated': 'showed',
  'expedite': 'speed up',
  'expedites': 'speeds up',
  'expediting': 'speeding up',
  'expedited': 'sped up'
};

/**
 * Check for complex words that should be replaced with simpler alternatives
 */
export function checkWordChoice(text: string): Issue[] {
  const issues: Issue[] = [];
  const lowerText = text.toLowerCase();

  // Check for each complex word
  Object.entries(WORD_SUBSTITUTIONS).forEach(([complexWord, simpleWord]) => {
    // Create a regex that matches the word with word boundaries
    const regex = new RegExp(`\\b${complexWord}\\b`, 'gi');
    const matches = text.match(regex);

    if (matches) {
      // Find the position of each match
      let lastIndex = 0;
      matches.forEach((match, matchIndex) => {
        const position = text.indexOf(match, lastIndex);
        lastIndex = position + match.length;

        issues.push({
          id: `word-choice-${complexWord}-${matchIndex}`,
          guidelineId: 'word-choice-simple',
          category: 'clarity',
          severity: 'suggestion',
          title: 'Use simpler word',
          message: `"${match}" is complex. Use "${simpleWord}" instead.`,
          suggestion: `Replace "${match}" with "${simpleWord}"`,
          guidelineSection: '1.0 Plain Language Guidelines - Word Substitution List',
          explanation: 'Simple, everyday words improve readability and accessibility for all users.',
          problematicText: match,
          wordIndex: position
        });
      });
    }
  });

  return issues;
}
