// OpenAI service for AI-enhanced analysis

import type { AIAnalysisResult, AIAnalysisRequest, OpenAISettings } from '../analysis/aiTypes';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Cost per 1K tokens (approximate, as of 2024)
const TOKEN_COSTS = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-4-vision-preview': { input: 0.01, output: 0.03 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 } // gpt-4o is cheaper
};

/**
 * Analyze text using OpenAI GPT
 */
export async function analyzeWithAI(
  request: AIAnalysisRequest,
  settings: OpenAISettings
): Promise<AIAnalysisResult> {
  if (!settings.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  if (!settings.enabled) {
    throw new Error('AI analysis is disabled');
  }

  const prompt = buildPrompt(request);

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
            content: getSystemPrompt(settings.guidelines)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 1000 // Reduced to leave room for guidelines in context
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const analysis = parseAIResponse(data.choices[0].message.content);

    // Calculate cost
    const tokensUsed = data.usage.total_tokens;
    const costs = TOKEN_COSTS[settings.model];
    const estimatedCost = (
      (data.usage.prompt_tokens / 1000) * costs.input +
      (data.usage.completion_tokens / 1000) * costs.output
    );

    return {
      ...analysis,
      estimatedCost,
      tokensUsed,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

/**
 * Build the prompt for AI analysis
 */
function buildPrompt(request: AIAnalysisRequest): string {
  return `Analyze the following UI text against voice and tone guidelines for accessibility and plain language:

TEXT TO ANALYZE:
"${request.text}"

${request.elementType ? `DETECTED ELEMENT TYPE: ${request.elementType}` : ''}
${request.context ? `CONTEXT: ${request.context}` : ''}

Provide analysis in the following JSON format:
{
  "overallAssessment": "Brief overall assessment",
  "issuesFound": [
    {
      "type": "guideline-violation | tone-issue | clarity-issue | accessibility-concern",
      "severity": "critical | moderate | minor",
      "description": "What's wrong",
      "suggestion": "How to fix it",
      "guidelineReference": "Which guideline",
      "affectedText": "The problematic part"
    }
  ],
  "suggestions": ["Alternative phrasing 1", "Alternative phrasing 2"],
  "toneAnalysis": "Analysis of tone (professional, helpful, accessible)",
  "readabilityFeedback": "Feedback on readability and cognitive load",
  "strengthsIdentified": ["What this text does well"]
}`;
}

/**
 * System prompt with guidelines
 */
function getSystemPrompt(customGuidelines?: string): string {
  const defaultGuidelines = `KEY GUIDELINES TO CHECK:
1. Plain Language (6th-8th grade reading level, active voice, simple words)
2. Sentence case capitalization (not Title Case or ALL CAPS)
3. No periods on buttons/labels, no colons after form fields
4. Button labels use verb + noun format
5. Error messages are specific, helpful, and solution-oriented
6. Avoid passive voice
7. Use everyday words (e.g., "use" not "utilize")
8. Sentences under 20 words
9. Direct address ("you" not "the user")
10. Accessibility for users with cognitive disabilities`;

  // Limit guidelines to ~3000 characters to avoid token limits
  // Roughly 1 token = 4 characters, so 3000 chars ≈ 750 tokens
  const MAX_GUIDELINE_LENGTH = 3000;
  let guidelines = customGuidelines || defaultGuidelines;

  if (guidelines.length > MAX_GUIDELINE_LENGTH) {
    guidelines = guidelines.substring(0, MAX_GUIDELINE_LENGTH) + '\n\n[Guidelines truncated to fit token limit]';
  }

  return `You are an expert in UX writing, accessibility, and plain language guidelines.

VOICE & TONE GUIDELINES:
${guidelines}

RESPONSE FORMAT: Always respond with valid JSON only, no markdown formatting or additional text.`;
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(content: string): Omit<AIAnalysisResult, 'estimatedCost' | 'tokensUsed' | 'timestamp'> {
  try {
    // Remove markdown code blocks if present
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      overallAssessment: parsed.overallAssessment || 'No assessment provided',
      issuesFound: parsed.issuesFound || [],
      suggestions: parsed.suggestions || [],
      toneAnalysis: parsed.toneAnalysis || '',
      readabilityFeedback: parsed.readabilityFeedback || '',
      strengthsIdentified: parsed.strengthsIdentified || []
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return {
      overallAssessment: 'Error parsing AI response',
      issuesFound: [],
      suggestions: [],
      toneAnalysis: '',
      readabilityFeedback: '',
      strengthsIdentified: []
    };
  }
}

/**
 * Estimate cost before making request
 */
export function estimateCost(text: string, model: OpenAISettings['model']): number {
  // Rough estimation: ~4 characters per token
  const estimatedTokens = Math.ceil((text.length + 500) / 4); // +500 for system prompt
  const costs = TOKEN_COSTS[model];

  // Assume 70% input, 30% output
  return (estimatedTokens * 0.7 / 1000) * costs.input +
         (estimatedTokens * 0.3 / 1000) * costs.output;
}
