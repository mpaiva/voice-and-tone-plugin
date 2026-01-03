// UI Analysis Service using OpenAI Vision API
// Analyzes screenshot UI structure for component recreation

import type { OpenAISettings } from '../analysis/aiTypes';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Token costs for cost estimation
const TOKEN_COSTS = {
  'gpt-4o': { input: 0.005, output: 0.015 }
};

export interface UIAnalysisResult {
  components: UIComponent[];
  layout: LayoutStructure;
  estimatedCost: number;
  tokensUsed: number;
  timestamp: number;
}

export interface UIComponent {
  type: 'button' | 'text' | 'heading' | 'container' | 'icon' | 'link';
  text?: string;
  styling: ComponentStyling;
  children?: UIComponent[];
  hierarchy: number; // Nesting level (0 = root)
  subtype?: 'close' | 'user-avatar' | 'modal' | 'card'; // Variant of component
  position?: 'left' | 'right' | 'top' | 'top-right'; // Relative positioning
  direction?: 'vertical' | 'horizontal'; // Layout direction for containers
}

export interface ComponentStyling {
  fontSize?: number; // Pixel size (12-32)
  fontWeight?: 400 | 500 | 600 | 700; // Regular, Medium, Semibold, Bold
  padding?: 'tight' | 'normal' | 'spacious';
  backgroundColor?: string; // Hex color code
  textColor?: string; // Hex color code
  borderRadius?: 'none' | 'small' | 'medium' | 'large';
  fillWidth?: boolean; // Should text fill container width?
  shape?: 'circle' | 'square'; // For icons
  size?: number; // Icon size in pixels
  iconContent?: string; // Icon type/content (user-silhouette, document, settings, etc.)
  isLink?: boolean; // Is this text a hyperlink?
  textDecoration?: 'none' | 'underline'; // Text decoration
  shadow?: boolean; // Has drop shadow (for modals/cards)
}

export interface LayoutStructure {
  direction: 'vertical' | 'horizontal';
  spacing: 'tight' | 'normal' | 'spacious';
  alignment: 'start' | 'center' | 'end';
}

const UI_ANALYSIS_PROMPT = `Analyze this UI screenshot and provide a detailed structured breakdown of all UI components with accurate colors, typography, and layout information.

Focus on identifying:
1. UI element types (buttons, headings, body text, containers)
2. Text content for each element
3. **Actual colors** - Extract hex color codes from the screenshot
4. **Font sizes** - Estimate pixel sizes (12-32px range)
5. **Font weights** - Detect if text is regular (400), medium (500), semibold (600), or bold (700)
6. **Layout behavior** - Should text fill width or hug content?
7. Layout direction and spacing

Return a JSON object with this exact schema:
{
  "layout": {
    "direction": "vertical" | "horizontal",
    "spacing": "tight" | "normal" | "spacious",
    "alignment": "start" | "center" | "end"
  },
  "components": [
    {
      "type": "button" | "text" | "heading" | "container",
      "text": "extracted text content",
      "styling": {
        "fontSize": 14,  // pixel size (12-32)
        "fontWeight": 400,  // 400=regular, 500=medium, 600=semibold, 700=bold
        "padding": "normal",
        "backgroundColor": "#3B82F6",  // hex color (for buttons/containers)
        "textColor": "#1F2937",  // hex color
        "borderRadius": "small",
        "fillWidth": true  // true if text should fill container width, false if it should hug content
      },
      "hierarchy": 0
    }
  ]
}

**Color Extraction Guidelines:**
- Extract actual hex colors from the screenshot (#RRGGBB format)
- For buttons: background color and text color
- For text: text color only
- For containers: background color
- Common UI color reference (use exact match if present):
  * Headings (dark blue): #1E3A8A, #1F2937, #2563EB
  * Body text (gray): #6B7280, #4B5563, #374151
  * Muted text (light gray): #9CA3AF, #D1D5DB
  * Primary buttons (blue): #3B82F6, #2563EB, #1D4ED8
  * Links (blue/purple): #3B82F6, #7C3AED, #6366F1
  * Success (green): #10B981, #059669
  * Warning (amber): #F59E0B, #D97706
  * White/light backgrounds: #FFFFFF, #F9FAFB, #F3F4F6

**Typography Guidelines:**
- fontSize: Estimate in pixels (typical: 12, 14, 16, 18, 20, 24, 32)
- fontWeight:
  - 400 = normal/regular text
  - 500 = slightly bold (medium)
  - 600 = semibold (emphasized text)
  - 700 = bold (headings, important text)
- fillWidth:
  - true = text should stretch to fill container width (paragraphs, labels in forms)
  - false = text should be as wide as content (buttons, compact labels)

**Component Types:**
- "heading" = large, prominent text (titles, h1-h3)
  * Detection criteria:
    - Font size >= 18px OR
    - Font weight >= 600 (semibold/bold) OR
    - Positioned at top of content area OR
    - Visually distinct from surrounding text (larger, bolder, different color)
  * Examples: "Product Enhancement", "Welcome", "Settings", "Dashboard"
  * NOT headings: body text, labels, descriptions, small text even if bold
- "text" = normal body text, labels, descriptions
  * Font size typically 12-16px
  * Font weight 400-500 (regular/medium)
  * Informational, descriptive content
- "button" = clickable buttons (with subtype "close" for X buttons)
- "container" = groups of related elements (with subtype "modal" or "card" for cards/modals)
- "icon" = icons, avatars, small graphics (with subtype "user-avatar" for profile icons)
- "link" = hyperlinks, underlined or colored text links

**Special Component Detection:**
1. **Icons/Avatars**:
   - Type: "icon"
   - Subtype: "user-avatar" for profile pictures/icons
   - Shape: "circle" or "square"
   - Size: approximate pixel size
   - Position: "left", "right", "top" (relative to sibling text)
   - BackgroundColor: fill color of icon
   - IconContent: Identify what's displayed inside the icon
     * "user-silhouette" - user/person icon (head and shoulders silhouette)
     * "document" - file/document icon
     * "settings" - gear/cog icon
     * "email" - envelope icon
     * "check" - checkmark icon
     * "empty" - solid color circle/square with no content
     * Describe any visible content inside the icon shape

**Horizontal Grouping (Icon + Text)**:
When icon and text appear side-by-side, create a horizontal container:
{
  "type": "container",
  "styling": { "backgroundColor": "transparent" },
  "hierarchy": 1,
  "direction": "horizontal",
  "children": [
    { "type": "icon", "subtype": "user-avatar", "styling": { "size": 32, "shape": "circle", "backgroundColor": "#3B82F6", "iconContent": "user-silhouette" }, "hierarchy": 2 },
    { "type": "text", "text": "John Doe", "hierarchy": 2 }
  ]
}
- Set container direction to horizontal in layout (see below)
- Use transparent background for grouping containers
- Nest icon and text as children with hierarchy 2

2. **Links**:
   - Type: "link" (NOT "button" - links are text-based clickable elements)
   - Text: link text content
   - TextColor: link color (often blue, purple, or underlined text)
   - TextDecoration: "underline" if underlined
   - IsLink: true
   - Detection criteria:
     * Underlined text = ALWAYS a link
     * Blue/purple text without button background = link
     * Small clickable text labels = link
     * Text that says "Learn more", "Read more", tabs = link
     * NO background fill or minimal padding = link
   - Links vs Buttons:
     * Link: text-only, may be underlined, no solid background
     * Button: solid background fill, prominent padding, call-to-action style

3. **Close Buttons**:
   - Type: "button"
   - Subtype: "close"
   - Text: "×" or "X"
   - Position: "top-right"
   - Styling: minimal/ghost style

4. **Modal/Card Containers**:
   - Type: "container"
   - Subtype: "modal" or "card"
   - BackgroundColor: usually white or light color
   - Shadow: true (if has drop shadow or floating appearance)
   - Children: ALL other UI elements should be nested inside as children
   - Detect: elevated white/light cards, modals, dialogs with drop shadows

**Critical Hierarchy Rules:**
1. If you detect a modal/card container, it should be the FIRST and ONLY root-level component
2. ALL other elements (headings, text, buttons, icons, links) should be nested as "children" of the modal container
3. The container should have "hierarchy": 0, all children should have "hierarchy": 1
4. Close buttons should still be marked with position: "top-right" but nested in the container

**Example for Modal:**
{
  "components": [
    {
      "type": "container",
      "subtype": "modal",
      "styling": {
        "backgroundColor": "#FFFFFF",
        "borderRadius": "medium",
        "shadow": true
      },
      "hierarchy": 0,
      "children": [
        { "type": "button", "subtype": "close", "text": "×", "position": "top-right", "hierarchy": 1 },
        { "type": "heading", "text": "Modal Title", "hierarchy": 1 },
        { "type": "text", "text": "Description...", "hierarchy": 1 }
      ]
    }
  ]
}

Preserve the order of elements from top to bottom.

CRITICAL: Return ONLY valid JSON - no explanations, no markdown code blocks, no trailing commas.
Ensure all JSON syntax is correct: proper quotes, no trailing commas in arrays/objects, all brackets closed.`;

/**
 * Analyze UI structure from screenshot using OpenAI Vision
 */
export async function analyzeUIStructure(
  imageData: string | Uint8Array,
  settings: OpenAISettings
): Promise<UIAnalysisResult> {
  if (!settings.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  if (!settings.enabled) {
    throw new Error('AI analysis is disabled');
  }

  // Check if model supports vision
  const visionModels = ['gpt-4-vision-preview', 'gpt-4-turbo', 'gpt-4o'];
  if (!visionModels.includes(settings.model)) {
    throw new Error(`Model ${settings.model} does not support vision. Please select gpt-4o in Settings.`);
  }

  // Convert image data to base64 if needed
  let base64Image: string;
  if (typeof imageData === 'string') {
    base64Image = imageData;
  } else {
    base64Image = uint8ArrayToBase64(imageData);
  }

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
            role: 'user',
            content: [
              {
                type: 'text',
                text: UI_ANALYSIS_PROMPT
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
        max_tokens: 2000,
        response_format: { type: 'json_object' } // Request JSON response
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[UI Analysis] OpenAI API error response:', error);
      throw new Error(error.error?.message || 'OpenAI Vision API request failed');
    }

    const data = await response.json();
    console.log('[UI Analysis] OpenAI API success response:', data);
    const analysisText = data.choices[0].message.content.trim();
    console.log('[UI Analysis] Extracted content:', analysisText);

    // Parse JSON response
    const parsedAnalysis = parseAnalysisResponse(analysisText);

    // Calculate cost
    const tokensUsed = data.usage.total_tokens;
    const costs = TOKEN_COSTS['gpt-4o']; // Use gpt-4o pricing for all vision models
    const estimatedCost = (
      (data.usage.prompt_tokens / 1000) * costs.input +
      (data.usage.completion_tokens / 1000) * costs.output
    );

    return {
      components: parsedAnalysis.components,
      layout: parsedAnalysis.layout,
      estimatedCost,
      tokensUsed,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[UI Analysis] Analysis failed with error:', error);
    if (error instanceof Error) {
      console.error('[UI Analysis] Error message:', error.message);
      console.error('[UI Analysis] Error stack:', error.stack);
    }
    throw error instanceof Error ? error : new Error('Failed to analyze UI structure. Please try again.');
  }
}

/**
 * Normalize a component and recursively normalize its children
 */
function normalizeComponent(comp: any): UIComponent {
  return {
    type: validateComponentType(comp.type),
    text: comp.text || '',
    styling: {
      fontSize: comp.styling?.fontSize || getDefaultFontSize(comp.type),
      fontWeight: comp.styling?.fontWeight || getDefaultFontWeight(comp.type),
      padding: comp.styling?.padding || 'normal',
      backgroundColor: comp.styling?.backgroundColor,
      textColor: comp.styling?.textColor,
      borderRadius: comp.styling?.borderRadius || (comp.type === 'button' ? 'small' : 'none'),
      fillWidth: comp.styling?.fillWidth ?? (comp.type === 'text' || comp.type === 'heading'),
      shape: comp.styling?.shape,
      size: comp.styling?.size,
      iconContent: comp.styling?.iconContent,
      isLink: comp.styling?.isLink,
      textDecoration: comp.styling?.textDecoration,
      shadow: comp.styling?.shadow
    },
    children: comp.children ? comp.children.map(normalizeComponent) : undefined,
    hierarchy: comp.hierarchy ?? 0,
    subtype: comp.subtype,
    position: comp.position,
    direction: comp.direction
  };
}

/**
 * Parse and validate the JSON response from Vision API
 */
function parseAnalysisResponse(text: string): { components: UIComponent[]; layout: LayoutStructure } {
  try {
    console.log('[UI Analysis] Raw response text:', text);

    // Clean up common JSON issues from AI responses
    let cleanedText = text.trim();

    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    // Try to parse
    const parsed = JSON.parse(cleanedText);
    console.log('[UI Analysis] Parsed JSON:', parsed);

    // Validate that components exist
    if (!parsed.components || !Array.isArray(parsed.components)) {
      console.error('[UI Analysis] Invalid structure. Expected components array, got:', {
        hasComponents: !!parsed.components,
        isArray: Array.isArray(parsed.components),
        keys: Object.keys(parsed),
        parsed
      });
      throw new Error('Invalid response structure: missing or invalid components array');
    }

    // Set defaults for layout (make it optional)
    const layout: LayoutStructure = {
      direction: parsed.layout?.direction || 'vertical',
      spacing: parsed.layout?.spacing || 'normal',
      alignment: parsed.layout?.alignment || 'start'
    };

    // Validate and normalize components (recursively normalizes children)
    const components: UIComponent[] = parsed.components.map(normalizeComponent);

    // Debug logging
    console.log('[UI Analysis] Vision API raw response:', JSON.stringify(parsed, null, 2));
    console.log('[UI Analysis] Normalized components:', JSON.stringify(components, null, 2));

    return { components, layout };
  } catch (error) {
    console.error('[UI Analysis] Failed to parse analysis response:', error);

    if (error instanceof SyntaxError) {
      // Extract position from error message (e.g., "position 9423")
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        const start = Math.max(0, position - 100);
        const end = Math.min(text.length, position + 100);
        const snippet = text.substring(start, end);

        console.error('[UI Analysis] JSON error near position', position);
        console.error('[UI Analysis] Problematic section:', snippet);
        console.error('[UI Analysis] Character at error:', text.charAt(position));
      }
    }

    if (error instanceof Error) {
      console.error('[UI Analysis] Parse error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    throw new Error(`Failed to parse UI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate component type
 */
function validateComponentType(type: string): UIComponent['type'] {
  const validTypes = ['button', 'text', 'heading', 'container', 'icon', 'link'];
  return validTypes.includes(type) ? type as UIComponent['type'] : 'text';
}

/**
 * Get default font size based on component type
 */
function getDefaultFontSize(type: string): number {
  switch (type) {
    case 'heading':
      return 24;
    case 'button':
      return 14;
    case 'text':
    default:
      return 14;
  }
}

/**
 * Get default font weight based on component type
 */
function getDefaultFontWeight(type: string): 400 | 500 | 600 | 700 {
  switch (type) {
    case 'heading':
      return 700; // Bold
    case 'button':
      return 500; // Medium
    case 'text':
    default:
      return 400; // Regular
  }
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
 * Estimate cost before making request
 */
export function estimateUIAnalysisCost(): number {
  // Rough estimate: ~1500 tokens for UI analysis
  const costs = TOKEN_COSTS['gpt-4o'];
  const estimatedInputTokens = 1200; // Image + prompt
  const estimatedOutputTokens = 500; // JSON response

  return (estimatedInputTokens / 1000) * costs.input +
         (estimatedOutputTokens / 1000) * costs.output;
}
