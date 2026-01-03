// OCR service with OpenAI Vision API (primary) and Tesseract.js (fallback)

import Tesseract from 'tesseract.js';
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
  method: 'openai' | 'tesseract';
}

export interface OCRProgress {
  status: string;
  progress: number;
}

/**
 * Extract text using Tesseract.js (local, free, no rate limits)
 */
export async function extractTextWithTesseract(
  imageData: string | Uint8Array,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  const startTime = Date.now();

  onProgress?.({ status: 'Initializing Tesseract OCR...', progress: 0.1 });

  // Convert Uint8Array to base64 data URL if needed
  let imageSource: string;
  if (typeof imageData === 'string') {
    imageSource = imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`;
  } else {
    const base64 = uint8ArrayToBase64(imageData);
    imageSource = `data:image/png;base64,${base64}`;
  }

  try {
    const result = await Tesseract.recognize(
      imageSource,
      'eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            onProgress?.({
              status: 'Recognizing text...',
              progress: 0.3 + (m.progress * 0.6)
            });
          } else if (m.status === 'loading language traineddata') {
            onProgress?.({ status: 'Loading language data...', progress: 0.2 });
          }
        }
      }
    );

    const processingTime = Date.now() - startTime;

    onProgress?.({ status: 'Complete', progress: 1.0 });

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
      language: 'eng',
      processingTime,
      method: 'tesseract'
    };
  } catch (error) {
    console.error('Tesseract OCR failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Tesseract OCR failed');
  }
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
    throw new Error('OpenAI API key not configured');
  }

  if (!settings.enabled) {
    throw new Error('AI analysis is disabled');
  }

  // Check if model supports vision
  const visionModels = ['gpt-4-vision-preview', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'];
  if (!visionModels.includes(settings.model)) {
    throw new Error(`Model ${settings.model} does not support vision. Please select a vision-capable model (gpt-4o, gpt-4-turbo, or gpt-4-vision-preview) in Settings.`);
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
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI Vision API request failed');
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
 * Extract text from image - tries OpenAI Vision first, falls back to Tesseract
 */
export async function extractTextFromImage(
  imageData: string | Uint8Array,
  settings: OpenAISettings,
  onProgress?: (progress: OCRProgress) => void
): Promise<OCRResult> {
  // Check if OpenAI is properly configured
  const openAIAvailable = settings.enabled &&
    settings.apiKey &&
    ['gpt-4-vision-preview', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'].includes(settings.model);

  if (openAIAvailable) {
    try {
      // Try OpenAI Vision first
      return await extractTextWithOpenAI(imageData, settings, onProgress);
    } catch (error) {
      console.warn('OpenAI Vision failed, falling back to Tesseract:', error);
      onProgress?.({ status: 'OpenAI failed, using local OCR...', progress: 0.1 });
      // Fall through to Tesseract
    }
  }

  // Use Tesseract as fallback (or primary if OpenAI not configured)
  return await extractTextWithTesseract(imageData, onProgress);
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
  // Tesseract takes longer than OpenAI for large images
  if (imageBytes > 1000000) return 10; // > 1MB
  if (imageBytes > 500000) return 6;   // > 500KB
  return 4;
}

/**
 * Initialize OCR (pre-load Tesseract if needed)
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
  // Tesseract workers are auto-terminated
}
