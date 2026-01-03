/**
 * Accessibility service for managing theme and font size preferences
 * Stores preferences in Figma's clientStorage
 */

import type { AccessibilityPreferences } from '../types/accessibility';
import { DEFAULT_ACCESSIBILITY } from '../types/accessibility';

const pendingOperations = new Map<string, {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}>();

/**
 * Initialize listener for accessibility preference messages from plugin backend
 */
export function initAccessibilityListener() {
  window.addEventListener('message', (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    if (msg.type === 'accessibility-saved') {
      const pending = pendingOperations.get('save-accessibility');
      if (pending) {
        pendingOperations.delete('save-accessibility');
        if (msg.success) {
          pending.resolve(undefined);
        } else {
          pending.reject(new Error(msg.error || 'Failed to save accessibility preferences'));
        }
      }
    } else if (msg.type === 'accessibility-loaded') {
      const pending = pendingOperations.get('load-accessibility');
      if (pending) {
        pendingOperations.delete('load-accessibility');
        const preferences = msg.preferences
          ? { ...DEFAULT_ACCESSIBILITY, ...msg.preferences }
          : { ...DEFAULT_ACCESSIBILITY };
        pending.resolve(preferences);
      }
    }
  });
}

/**
 * Load accessibility preferences from Figma clientStorage
 */
export function loadAccessibilityPreferences(): Promise<AccessibilityPreferences> {
  return new Promise((resolve, reject) => {
    pendingOperations.set('load-accessibility', { resolve, reject });
    parent.postMessage({ pluginMessage: { type: 'load-accessibility' } }, '*');

    // Timeout fallback - use defaults if no response
    setTimeout(() => {
      if (pendingOperations.has('load-accessibility')) {
        pendingOperations.delete('load-accessibility');
        console.warn('Accessibility preferences load timeout, using defaults');
        resolve({ ...DEFAULT_ACCESSIBILITY });
      }
    }, 5000);
  });
}

/**
 * Save accessibility preferences to Figma clientStorage
 */
export function saveAccessibilityPreferences(preferences: AccessibilityPreferences): Promise<void> {
  return new Promise((resolve, reject) => {
    pendingOperations.set('save-accessibility', { resolve, reject });
    parent.postMessage({
      pluginMessage: {
        type: 'save-accessibility',
        preferences
      }
    }, '*');

    // Timeout fallback
    setTimeout(() => {
      if (pendingOperations.has('save-accessibility')) {
        pendingOperations.delete('save-accessibility');
        reject(new Error('Accessibility preferences save timeout'));
      }
    }, 5000);
  });
}
