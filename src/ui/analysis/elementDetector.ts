// Detect UI element type from text patterns
// Helps apply appropriate guidelines to different UI contexts

export type UIElementType =
  | 'button'
  | 'form-label'
  | 'navigation'
  | 'error-message'
  | 'heading'
  | 'body-text'
  | 'unknown';

/**
 * Detect the likely UI element type from text content
 */
export function detectElementType(text: string): UIElementType {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Button detection patterns
  if (isLikelyButton(trimmed, lower)) {
    return 'button';
  }

  // Error message patterns
  if (isLikelyErrorMessage(trimmed, lower)) {
    return 'error-message';
  }

  // Form label patterns
  if (isLikelyFormLabel(trimmed, lower)) {
    return 'form-label';
  }

  // Navigation patterns
  if (isLikelyNavigation(trimmed, lower)) {
    return 'navigation';
  }

  // Heading patterns
  if (isLikelyHeading(trimmed, lower)) {
    return 'heading';
  }

  // Short text is likely UI element
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount <= 3) {
    return 'button'; // Short text often buttons/labels
  }

  return 'body-text';
}

/**
 * Check if text looks like a button label
 */
function isLikelyButton(text: string, lower: string): boolean {
  // Action verbs common in buttons
  const buttonVerbs = [
    'add', 'create', 'save', 'submit', 'send', 'delete', 'remove', 'cancel',
    'edit', 'update', 'view', 'download', 'upload', 'export', 'import',
    'open', 'close', 'confirm', 'approve', 'decline', 'continue', 'back',
    'next', 'finish', 'start', 'stop', 'search', 'filter', 'sort'
  ];

  const firstWord = lower.split(/\s+/)[0];
  if (buttonVerbs.includes(firstWord)) {
    return true;
  }

  // Common button patterns
  const buttonPatterns = [
    /^(save|submit|send|create|add|delete|cancel|ok|yes|no)\b/i,
    /^(learn more|get started|sign up|log in|sign out)\b/i,
    /\b(and (continue|close|send|save))\b/i, // Two-action buttons
  ];

  return buttonPatterns.some(pattern => pattern.test(text));
}

/**
 * Check if text looks like an error message
 */
function isLikelyErrorMessage(text: string, lower: string): boolean {
  const errorKeywords = [
    'error', 'invalid', 'required', 'must', 'cannot', 'unable',
    'failed', 'incorrect', 'missing', 'not found', 'try again'
  ];

  return errorKeywords.some(keyword => lower.includes(keyword));
}

/**
 * Check if text looks like a form label
 */
function isLikelyFormLabel(text: string, lower: string): boolean {
  // Common form field keywords
  const formKeywords = [
    'name', 'email', 'phone', 'address', 'password', 'username',
    'date', 'time', 'message', 'comment', 'description', 'title',
    'first name', 'last name', 'company', 'job title', 'department'
  ];

  // Short text with these keywords
  const wordCount = text.split(/\s+/).length;
  if (wordCount <= 4) {
    return formKeywords.some(keyword => lower.includes(keyword));
  }

  // Ends with colon (old pattern, but still indicates form label)
  if (text.endsWith(':')) {
    return true;
  }

  return false;
}

/**
 * Check if text looks like navigation
 */
function isLikelyNavigation(text: string, lower: string): boolean {
  const navKeywords = [
    'dashboard', 'home', 'settings', 'profile', 'help', 'about',
    'contact', 'reports', 'analytics', 'people', 'projects', 'tasks'
  ];

  const wordCount = text.split(/\s+/).length;
  if (wordCount <= 2) {
    return navKeywords.some(keyword => lower.includes(keyword));
  }

  return false;
}

/**
 * Check if text looks like a heading
 */
function isLikelyHeading(text: string, lower: string): boolean {
  const wordCount = text.split(/\s+/).length;

  // Headings are usually short
  if (wordCount > 6) {
    return false;
  }

  // All caps or Title Case might be a heading
  const hasMultipleCaps = (text.match(/[A-Z]/g) || []).length > 1;
  if (hasMultipleCaps && wordCount <= 4) {
    return true;
  }

  return false;
}
