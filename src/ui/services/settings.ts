// Settings storage service using Figma's clientStorage API

import type { OpenAISettings } from '../analysis/aiTypes';

const DEFAULT_GUIDELINES = `# Voice & Tone Guidelines

## Plain Language
- Target 6th-8th grade reading level
- Use active voice (not passive)
- Use everyday words ("use" not "utilize")
- Keep sentences under 20 words
- Use "you" not "the user"

## Capitalization & Punctuation
- Use sentence case (not Title Case or ALL CAPS)
- No periods on buttons, labels, or headings
- No colons after form field labels
- Avoid excessive exclamation marks

## Button Labels
- Use verb + noun format
- Be specific and action-oriented
- Examples: "Save draft" not "OK", "Delete account" not "Submit"

## Error Messages
- Be specific about what went wrong
- Provide a solution or next step
- Avoid blaming the user
- Avoid technical jargon
- Example: "Your password must be at least 8 characters" not "Invalid input"

## Accessibility
- Keep sentences short and simple
- Use clear, concrete language
- Break complex tasks into steps
- Provide examples when helpful

## Tone
- Professional but friendly
- Helpful and supportive
- Clear and concise
- Never condescending`;

const DEFAULT_SETTINGS: OpenAISettings = {
  apiKey: '',
  model: 'gpt-3.5-turbo',
  enabled: false,
  guidelines: DEFAULT_GUIDELINES,
  customGuidelines: '',
  enableCopywriting: false
};

// Store for pending operations
const pendingOperations = new Map<string, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}>();

/**
 * Initialize settings listener
 */
export function initSettingsListener() {
  window.addEventListener('message', (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    if (msg.type === 'settings-saved') {
      const pending = pendingOperations.get('save');
      if (pending) {
        pendingOperations.delete('save');
        if (msg.success) {
          pending.resolve(undefined);
        } else {
          pending.reject(new Error(msg.error || 'Failed to save settings'));
        }
      }
    } else if (msg.type === 'settings-loaded') {
      const pending = pendingOperations.get('load');
      if (pending) {
        pendingOperations.delete('load');
        const settings = msg.settings
          ? { ...DEFAULT_SETTINGS, ...msg.settings }
          : { ...DEFAULT_SETTINGS };
        pending.resolve(settings);
      }
    }
  });
}

/**
 * Load settings from Figma clientStorage
 */
export function loadSettings(): Promise<OpenAISettings> {
  return new Promise((resolve, reject) => {
    pendingOperations.set('load', { resolve, reject });
    parent.postMessage({ pluginMessage: { type: 'load-settings' } }, '*');

    // Timeout after 5 seconds
    setTimeout(() => {
      if (pendingOperations.has('load')) {
        pendingOperations.delete('load');
        console.warn('Settings load timeout, using defaults');
        resolve({ ...DEFAULT_SETTINGS });
      }
    }, 5000);
  });
}

/**
 * Save settings to Figma clientStorage
 */
export function saveSettings(settings: OpenAISettings): Promise<void> {
  return new Promise((resolve, reject) => {
    pendingOperations.set('save', { resolve, reject });
    parent.postMessage({
      pluginMessage: {
        type: 'save-settings',
        settings
      }
    }, '*');

    // Timeout after 5 seconds
    setTimeout(() => {
      if (pendingOperations.has('save')) {
        pendingOperations.delete('save');
        reject(new Error('Settings save timeout'));
      }
    }, 5000);
  });
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<void> {
  await saveSettings({ ...DEFAULT_SETTINGS });
}

/**
 * Validate API key format (basic check)
 */
export function validateApiKey(apiKey: string): boolean {
  // OpenAI API keys start with 'sk-' and are ~51 characters
  return apiKey.startsWith('sk-') && apiKey.length > 20;
}
