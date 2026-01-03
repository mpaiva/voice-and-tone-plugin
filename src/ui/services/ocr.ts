// OCR service using OpenAI Vision API
// Note: Local OCR (Tesseract.js) is not available in Figma plugins due to CSP
// restrictions that prevent loading WASM modules inside web workers.

import type { OpenAISettings } from '../analysis/aiTypes';

export interface APIKeyStatus {
  valid: boolean;
  error?: string;
  quotaExceeded?: boolean;
}

/**
 * Validate OpenAI API key by making a lightweight request to /v1/models
 * This endpoint is free and doesn't consume credits
 */
export async function validateApiKey(apiKey: string): Promise<APIKeyStatus> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (response.ok) {
      return { valid: true };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

    // Check for quota exceeded
    if (response.status === 429 || errorMessage.toLowerCase().includes('quota')) {
      return {
        valid: false,
        error: 'API quota exceeded. Please check your billing.',
        quotaExceeded: true
      };
    }

    // Check for invalid key
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    return { valid: false, error: errorMessage };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  processingTime: number;
  method: 'openai';
}

export interface OCRProgress {
  status: string;
  progress: number;
}

/**
 * Convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/**
 * Extract text using OpenAI Vision API
 */
export async function extractTextWithOpenAI(
  imageData: string | Uint8Array,
  settings: OpenAISettings,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  const startTime = Date.now();

  if (!settings.apiKey) {
    throw new Error('OpenAI API key not configured. Go to Settings to add your API key.');
  }

  if (!settings.enabled) {
    throw new Error('AI analysis is disabled. Enable it in Settings to use OCR.');
  }

  // Check if model supports vision
  const visionModels = ['gpt-4-vision-preview', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
  if (!visionModels.includes(settings.model)) {
    throw new Error(`Model "${settings.model}" does not support vision. Select gpt-4o or gpt-4o-mini in Settings.`);
  }

  onProgress?.({ status: 'Converting image...', progress: 0.1 });

  // Convert image data to base64 if needed
  let base64Image: string;
  if (typeof imageData === 'string') {
    base64Image = imageData;
  } else {
    base64Image = uint8ArrayToBase64(imageData);
  }

  onProgress?.({ status: 'Sending to OpenAI Vision...', progress: 0.3 });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this image. Return only the extracted text, preserving the original layout and formatting as much as possible. If there is no text in the image, return an empty response.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;

    // Provide helpful error messages
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a minute and try again, or check your OpenAI billing.');
    }
    if (response.status === 401) {
      throw new Error('Invalid API key. Check your API key in Settings.');
    }
    if (response.status === 400 && errorMessage.includes('billing')) {
      throw new Error('Billing issue. Add a payment method at platform.openai.com/billing.');
    }

    throw new Error(errorMessage);
  }

  onProgress?.({ status: 'Processing response...', progress: 0.8 });

  const data = await response.json();
  const extractedText = data.choices[0].message.content.trim();

  const processingTime = Date.now() - startTime;

  onProgress?.({ status: 'Complete', progress: 1.0 });

  return {
    text: extractedText,
    confidence: extractedText.length > 0 ? 95 : 50,
    language: 'eng',
    processingTime,
    method: 'openai'
  };
}

/**
 * Extract text from image using OpenAI Vision
 */
export async function extractTextFromImage(
  imageData: string | Uint8Array,
  settings: OpenAISettings,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  // Check if OpenAI is properly configured
  const visionModels = ['gpt-4-vision-preview', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];

  if (!settings.enabled) {
    throw new Error('AI analysis is disabled. Enable it in Settings to use OCR.');
  }

  if (!settings.apiKey) {
    throw new Error('OpenAI API key not configured. Go to Settings to add your API key.');
  }

  if (!visionModels.includes(settings.model)) {
    throw new Error(`Model "${settings.model}" does not support vision. Select gpt-4o or gpt-4o-mini in Settings.`);
  }

  return await extractTextWithOpenAI(imageData, settings, onProgress);
}

/**
 * Check if image has sufficient quality for OCR
 */
export function validateImageQuality(
  imageData: Uint8Array,
  minSize: number = 100
): { valid: boolean; message?: string } {
  if (imageData.length < minSize) {
    return {
      valid: false,
      message: 'Image is too small. Please use a higher resolution image.'
    };
  }
  return { valid: true };
}

/**
 * Estimate OCR processing time based on image size
 */
export function estimateProcessingTime(imageBytes: number): number {
  // OpenAI Vision typically takes 2-5 seconds
  if (imageBytes > 1000000) return 5; // > 1MB
  if (imageBytes > 500000) return 4;   // > 500KB
  return 3;
}

/**
 * Initialize OCR
 */
export async function initializeOCR(
  onProgress?: (progress: OCRProgress) => void
): Promise<void> {
  onProgress?.({ status: 'Ready', progress: 1.0 });
}

/**
 * Clean up OCR resources
 */
export async function terminateOCR(): Promise<void> {
  // No cleanup needed for OpenAI-only OCR
}
