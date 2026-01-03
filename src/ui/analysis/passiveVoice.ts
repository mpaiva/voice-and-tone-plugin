// Passive voice detection
// Guideline 1.0: "Use active voice"

import nlp from 'compromise';
import type { Issue } from './types';

/**
 * Check for passive voice constructions
 * Examples:
 * - "The form was submitted" → "Submit the form" or "You submitted the form"
 * - "The button was clicked" → "Click the button"
 */
export function checkPassiveVoice(text: string): Issue[] {
  const issues: Issue[] = [];

  try {
    const doc = nlp(text);
    const sentences = doc.sentences().out('array');

    sentences.forEach((sentence, index) => {
      const sentenceDoc = nlp(sentence);

      // Look for passive voice patterns: "was/were + past participle"
      const hasPassive = sentenceDoc.match('(was|were|is|are|been|be) (#Verb && #PastTense)').found;

      // Also check for common passive patterns
      const passivePatterns = [
        '(was|were) #Verb',
        '(is|are) #Verb',
        'been #Verb',
        'be #Verb'
      ];

      let foundPassive = hasPassive;
      for (const pattern of passivePatterns) {
        if (sentenceDoc.match(pattern).found) {
          foundPassive = true;
          break;
        }
      }

      if (foundPassive) {
        issues.push({
          id: `passive-voice-${index}`,
          guidelineId: 'passive-voice',
          category: 'clarity',
          severity: 'warning',
          title: 'Passive voice detected',
          message: 'Consider using active voice for clearer, more direct communication.',
          suggestion: 'Rewrite to use active voice. Example: "Submit the form" instead of "The form was submitted"',
          guidelineSection: '1.0 Plain Language Guidelines',
          explanation: 'Active voice makes it clear who does what, reducing ambiguity and cognitive load.',
          sentenceIndex: index,
          problematicText: sentence
        });
      }
    });
  } catch (error) {
    console.error('Error checking passive voice:', error);
  }

  return issues;
}
