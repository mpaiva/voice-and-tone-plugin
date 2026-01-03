/**
 * Accessibility preferences for theme and font size
 */

export type Theme = 'light' | 'dark';
export type FontSize = 'normal' | 'large';

export interface AccessibilityPreferences {
  theme: Theme;
  fontSize: FontSize;
}

export const DEFAULT_ACCESSIBILITY: AccessibilityPreferences = {
  theme: 'light',
  fontSize: 'normal'
};
