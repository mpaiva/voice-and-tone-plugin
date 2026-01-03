// Copywriting types for AI copywriting feature

export type TaskType =
  | 'new-microcopy'
  | 'rewrite'
  | 'summarize'
  | 'variants'
  | 'tone-shift';

export interface CopywritingRequest {
  text: string;
  taskType: TaskType;
  elementType?: string;
  context?: string;
  toneAdjustment?: string; // For tone-shift tasks
  variantCount?: number; // For variants tasks
}

export interface CopywritingResult {
  generatedCopy: string;
  variants?: string[];
  reasoning?: string;
  taskType: TaskType;
  estimatedCost: number;
  tokensUsed: number;
  timestamp: number;
}

export interface CopywritingSettings {
  enabled: boolean;
  customGuidelines?: string;
}
