// Clear-Co Copy AI copywriting service

import type { CopywritingRequest, CopywritingResult } from '../analysis/copywritingTypes';
import type { OpenAISettings } from '../analysis/aiTypes';
import { DEFAULT_CLEARCOPY_GUIDELINES, VOICE_GUIDELINES_SUMMARY } from '../constants/defaultGuidelines';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Cost per 1K tokens (approximate, as of 2024)
const TOKEN_COSTS = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 }
};

/**
 * Generate copy using Clear-Co Copy AI assistant
 */
export async function generateCopy(
  request: CopywritingRequest,
  settings: OpenAISettings
): Promise<CopywritingResult> {
  if (!settings.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  if (!settings.enabled) {
    throw new Error('AI features are disabled');
  }

  const systemPrompt = buildSystemPrompt(settings.customGuidelines);
  const userPrompt = buildUserPrompt(request);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7, // Higher temperature for more creative copywriting
        max_tokens: 500 // Reasonable for most UI copy
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content.trim();

    // Parse variants if this was a variants task
    const variants = request.taskType === 'variants'
      ? parseVariants(generatedText)
      : undefined;

    // Calculate cost
    const tokensUsed = data.usage.total_tokens;
    const costs = TOKEN_COSTS[settings.model];
    const estimatedCost = (
      (data.usage.prompt_tokens / 1000) * costs.input +
      (data.usage.completion_tokens / 1000) * costs.output
    );

    return {
      generatedCopy: variants ? variants[0] : generatedText,
      variants,
      taskType: request.taskType,
      estimatedCost,
      tokensUsed,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Copywriting error:', error);
    throw error;
  }
}

/**
 * Build system prompt with Clear-Co Copy guidelines
 */
function buildSystemPrompt(customGuidelines?: string): string {
  const guidelines = customGuidelines || DEFAULT_CLEARCOPY_GUIDELINES;

  return `${guidelines}

${VOICE_GUIDELINES_SUMMARY}

Remember: Output only the final copy, no explanations unless explicitly requested. Be concise, clear, and helpful.`;
}

/**
 * Build user prompt based on task type
 */
function buildUserPrompt(request: CopywritingRequest): string {
  const { text, taskType, elementType, context, toneAdjustment, variantCount } = request;

  switch (taskType) {
    case 'new-microcopy':
      return `Create new microcopy for this UI element.

${elementType ? `ELEMENT TYPE: ${elementType}` : ''}
${context ? `CONTEXT: ${context}` : ''}
${text ? `REFERENCE TEXT: "${text}"` : ''}

Provide concise, clear UI copy that follows ClearCompany voice and tone guidelines.`;

    case 'rewrite':
      return `Rewrite this UI copy to better align with ClearCompany voice and tone guidelines.

CURRENT TEXT: "${text}"
${elementType ? `ELEMENT TYPE: ${elementType}` : ''}
${context ? `CONTEXT: ${context}` : ''}

Provide improved copy that is clearer, more accessible, and follows the guidelines.`;

    case 'summarize':
      return `Shorten this text into concise UI microcopy while preserving the key message.

ORIGINAL TEXT: "${text}"
${elementType ? `ELEMENT TYPE: ${elementType}` : ''}
${context ? `CONTEXT: ${context}` : ''}

Provide a shortened version suitable for UI display.`;

    case 'variants':
      const count = variantCount || 3;
      return `Provide ${count} alternative versions of this UI copy.

ORIGINAL TEXT: "${text}"
${elementType ? `ELEMENT TYPE: ${elementType}` : ''}
${context ? `CONTEXT: ${context}` : ''}

Output ${count} numbered variants, each on its own line:
1. [variant 1]
2. [variant 2]
3. [variant 3]${count > 3 ? '\n...' : ''}`;

    case 'tone-shift':
      return `Adjust the tone of this UI copy.

ORIGINAL TEXT: "${text}"
${elementType ? `ELEMENT TYPE: ${elementType}` : ''}
${context ? `CONTEXT: ${context}` : ''}
TONE ADJUSTMENT: ${toneAdjustment || 'more friendly and conversational'}

Provide copy with the adjusted tone while maintaining clarity and following guidelines.`;

    default:
      return `Improve this UI copy: "${text}"`;
  }
}

/**
 * Parse numbered variants from AI response
 */
function parseVariants(text: string): string[] {
  const lines = text.split('\n').filter(line => line.trim());
  const variants: string[] = [];

  for (const line of lines) {
    // Match lines that start with numbers: "1.", "2)", "1 -", etc.
    const match = line.match(/^\s*\d+[\.\)\-\:]\s*(.+)$/);
    if (match && match[1]) {
      variants.push(match[1].trim());
    }
  }

  // If parsing failed, return the whole text as a single variant
  return variants.length > 0 ? variants : [text];
}

/**
 * Estimate cost before making request
 */
export function estimateCopywritingCost(
  textLength: number,
  model: OpenAISettings['model'],
  customGuidelines?: string
): number {
  const guidelinesLength = customGuidelines?.length || DEFAULT_CLEARCOPY_GUIDELINES.length;
  const estimatedTokens = Math.ceil((textLength + guidelinesLength + 200) / 4);
  const costs = TOKEN_COSTS[model];

  // Assume 60% input, 40% output for copywriting
  return (estimatedTokens * 0.6 / 1000) * costs.input +
         (estimatedTokens * 0.4 / 1000) * costs.output;
}
