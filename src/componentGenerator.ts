// Component Generator - Creates Figma nodes from UI analysis
// Runs in Figma plugin context (has access to Figma API)

interface UIComponent {
  type: 'button' | 'text' | 'heading' | 'container' | 'icon' | 'link';
  text?: string;
  styling: {
    fontSize?: number;
    fontWeight?: 400 | 500 | 600 | 700;
    padding?: 'tight' | 'normal' | 'spacious';
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: 'none' | 'small' | 'medium' | 'large';
    fillWidth?: boolean;
    shape?: 'circle' | 'square';
    size?: number;
    iconContent?: string; // Icon type/content (user-silhouette, document, settings, etc.)
    isLink?: boolean;
    textDecoration?: 'none' | 'underline';
    shadow?: boolean;
  };
  children?: UIComponent[];
  hierarchy: number;
  subtype?: 'close' | 'user-avatar' | 'modal' | 'card';
  position?: 'left' | 'right' | 'top' | 'top-right';
  direction?: 'vertical' | 'horizontal'; // Layout direction for containers
}

interface LayoutStructure {
  direction: 'vertical' | 'horizontal';
  spacing: 'tight' | 'normal' | 'spacious';
  alignment: 'start' | 'center' | 'end';
}

interface UIAnalysisResult {
  components: UIComponent[];
  layout: LayoutStructure;
}

/**
 * Count total number of components including nested children
 */
function countTotalComponents(components: UIComponent[]): number {
  let count = 0;
  for (const comp of components) {
    count++; // Count this component
    if (comp.children) {
      count += countTotalComponents(comp.children); // Count children recursively
    }
  }
  return count;
}

/**
 * Create Figma components from UI analysis result
 */
export async function createComponentsFromAnalysis(
  analysis: UIAnalysisResult,
  position?: { x: number; y: number }
): Promise<{ success: boolean; nodeIds?: string[]; componentCount?: number; error?: string }> {
  try {
    const createdNodes: SceneNode[] = [];
    const errors: string[] = [];

    // Create main container frame with auto-layout
    const container = figma.createFrame();
    container.name = 'Recreated UI';

    // Mark as plugin-created to prevent re-analysis
    container.setPluginData('createdByPlugin', 'true');

    // Position the container
    if (position) {
      container.x = position.x;
      container.y = position.y;
    } else {
      // Default position: center of viewport
      container.x = figma.viewport.center.x - 200;
      container.y = figma.viewport.center.y - 300;
    }

    // Apply layout settings
    container.layoutMode = analysis.layout.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';
    container.itemSpacing = mapSpacing(analysis.layout.spacing);

    // Set padding
    const padding = 24;
    container.paddingLeft = padding;
    container.paddingRight = padding;
    container.paddingTop = padding;
    container.paddingBottom = padding;

    // Set background
    container.fills = [{
      type: 'SOLID',
      color: { r: 1, g: 1, b: 1 } // White background
    }];

    // Auto-size the container
    container.primaryAxisSizingMode = 'AUTO';
    container.counterAxisSizingMode = 'AUTO';

    // Create child components
    for (const component of analysis.components) {
      try {
        const node = await createUIComponent(component);
        if (node) {
          container.appendChild(node);

          // Apply layout properties after appending (only works when in auto-layout parent)
          if (component.styling.fillWidth && 'layoutGrow' in node) {
            node.layoutGrow = 1;
            if ('textAutoResize' in node) {
              node.textAutoResize = 'HEIGHT'; // Resize height to fit, fill width
            }
          }
        } else {
          console.warn('[Component Generator] createUIComponent returned null for:', {
            type: component.type,
            text: component.text,
            subtype: component.subtype
          });
        }
      } catch (error) {
        const errorMsg = `Failed to create ${component.type}${component.subtype ? ` (${component.subtype})` : ''}${component.text ? `: "${component.text}"` : ''}`;
        errors.push(errorMsg);
        console.error('[Component Generator] Failed to create component:', {
          type: component.type,
          text: component.text,
          subtype: component.subtype,
          hasChildren: !!component.children,
          childrenCount: component.children?.length,
          styling: component.styling,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined
        });
        // Continue with other components
      }
    }

    createdNodes.push(container);

    // Select the created frame
    figma.currentPage.selection = [container];
    figma.viewport.scrollAndZoomIntoView([container]);

    // Count total components created (including nested children)
    const totalComponents = countTotalComponents(analysis.components);

    // Return success only if no errors occurred
    if (errors.length > 0) {
      return {
        success: false,
        error: `Component creation errors:\n${errors.join('\n')}`,
        nodeIds: createdNodes.map(node => node.id),
        componentCount: totalComponents
      };
    }

    return {
      success: true,
      nodeIds: createdNodes.map(node => node.id),
      componentCount: totalComponents
    };
  } catch (error) {
    console.error('Component generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create components'
    };
  }
}

/**
 * Create a single UI component based on type
 */
async function createUIComponent(component: UIComponent): Promise<SceneNode | null> {
  switch (component.type) {
    case 'button':
      return await createButton(component);
    case 'heading':
      return await createHeading(component);
    case 'text':
      return await createTextLayer(component);
    case 'link':
      return await createLink(component);
    case 'icon':
      return await createIcon(component);
    case 'container':
      return await createContainer(component);
    default:
      console.warn('Unknown component type:', component.type);
      return null;
  }
}

/**
 * Create a button component (frame with text)
 */
async function createButton(component: UIComponent): Promise<FrameNode> {
  const button = figma.createFrame();
  const isCloseButton = component.subtype === 'close';
  button.name = isCloseButton ? 'Close Button' : (component.text || 'Button');

  // Auto-layout for button
  button.layoutMode = 'HORIZONTAL';
  button.primaryAxisSizingMode = 'AUTO'; // Fit content width
  button.counterAxisSizingMode = 'AUTO'; // Fit content height

  // Set padding based on component styling
  const padding = isCloseButton
    ? { horizontal: 8, vertical: 8 } // Compact for close button
    : mapPadding(component.styling.padding);
  button.paddingLeft = padding.horizontal;
  button.paddingRight = padding.horizontal;
  button.paddingTop = padding.vertical;
  button.paddingBottom = padding.vertical;

  // Button background - ghost/transparent for close button
  if (isCloseButton) {
    button.fills = []; // No background for close button
  } else {
    const bgColor = component.styling.backgroundColor
      ? hexToRgb(component.styling.backgroundColor)
      : { r: 0.2, g: 0.5, b: 1 }; // Default blue

    button.fills = [{
      type: 'SOLID',
      color: bgColor
    }];
  }

  // Border radius
  button.cornerRadius = mapBorderRadius(component.styling.borderRadius);

  // Create button text
  if (component.text) {
    const text = figma.createText();

    // Load font - must be done before setting characters
    const fontStyle = getFontStyle(component.styling.fontWeight || 500);

    // Try multiple fonts in order of preference
    const fontsToTry = [
      { family: 'Inter', style: fontStyle },
      { family: 'Inter', style: 'Regular' },
      { family: 'Roboto', style: 'Regular' },
      { family: 'Arial', style: 'Regular' },
      { family: 'Helvetica', style: 'Regular' }
    ];

    let loadedFont: FontName | null = null;
    for (const font of fontsToTry) {
      try {
        await figma.loadFontAsync(font);
        loadedFont = font;
        break;
      } catch {
        continue; // Try next font
      }
    }

    if (!loadedFont) {
      console.warn('[Button] Could not load any font, creating button without text');
      return button; // Return button without text
    }

    // Set the loaded font on the text node
    text.fontName = loadedFont;

    text.characters = component.text;
    text.fontSize = component.styling.fontSize || (isCloseButton ? 18 : 14);

    // Text color - dark for close button, white for regular button
    const defaultTextColor = isCloseButton
      ? { r: 0.4, g: 0.4, b: 0.4 } // Gray for close button
      : { r: 1, g: 1, b: 1 }; // White for regular button

    const textColor = component.styling.textColor
      ? hexToRgb(component.styling.textColor)
      : defaultTextColor;

    text.fills = [{
      type: 'SOLID',
      color: textColor
    }];

    button.appendChild(text);
  }

  return button;
}

/**
 * Create a heading text layer
 */
async function createHeading(component: UIComponent): Promise<TextNode> {
  const text = figma.createText();

  // Load font - must be done before setting characters
  const fontStyle = getFontStyle(component.styling.fontWeight || 700);

  // Try multiple fonts in order of preference
  const fontsToTry = [
    { family: 'Inter', style: fontStyle },
    { family: 'Inter', style: 'Regular' },
    { family: 'Roboto', style: 'Regular' },
    { family: 'Arial', style: 'Regular' },
    { family: 'Helvetica', style: 'Regular' }
  ];

  let loadedFont: FontName | null = null;
  for (const font of fontsToTry) {
    try {
      await figma.loadFontAsync(font);
      loadedFont = font;
      break;
    } catch {
      continue; // Try next font
    }
  }

  if (!loadedFont) {
    console.warn('[Heading] Could not load any font, skipping component');
    throw new Error('No available fonts');
  }

  // Set the loaded font on the text node
  text.fontName = loadedFont;

  text.characters = component.text || 'Heading';
  text.fontSize = component.styling.fontSize || 24;

  // Text color - use actual color if available
  const textColor = component.styling.textColor
    ? hexToRgb(component.styling.textColor)
    : { r: 0.15, g: 0.23, b: 0.35 }; // Default dark blue for headings

  text.fills = [{
    type: 'SOLID',
    color: textColor
  }];

  return text;
}

/**
 * Create a regular text layer
 */
async function createTextLayer(component: UIComponent): Promise<TextNode> {
  const text = figma.createText();

  // Load font - must be done before setting characters
  const fontStyle = getFontStyle(component.styling.fontWeight || 400);

  // Try multiple fonts in order of preference
  const fontsToTry = [
    { family: 'Inter', style: fontStyle },
    { family: 'Inter', style: 'Regular' },
    { family: 'Roboto', style: 'Regular' },
    { family: 'Arial', style: 'Regular' },
    { family: 'Helvetica', style: 'Regular' }
  ];

  let loadedFont: FontName | null = null;
  for (const font of fontsToTry) {
    try {
      await figma.loadFontAsync(font);
      loadedFont = font;
      break;
    } catch {
      continue; // Try next font
    }
  }

  if (!loadedFont) {
    console.warn('[Text] Could not load any font, skipping component');
    throw new Error('No available fonts');
  }

  // Set the loaded font on the text node
  text.fontName = loadedFont;

  text.characters = component.text || 'Text';
  text.fontSize = component.styling.fontSize || 14;

  // Text color - use actual color if available
  const textColor = component.styling.textColor
    ? hexToRgb(component.styling.textColor)
    : { r: 0.3, g: 0.3, b: 0.3 }; // Default gray

  text.fills = [{
    type: 'SOLID',
    color: textColor
  }];

  return text;
}

/**
 * Create a link text layer
 */
async function createLink(component: UIComponent): Promise<TextNode> {
  const text = figma.createText();

  // Load font - must be done before setting characters
  const fontStyle = getFontStyle(component.styling.fontWeight || 400);

  // Try multiple fonts in order of preference
  const fontsToTry = [
    { family: 'Inter', style: fontStyle },
    { family: 'Inter', style: 'Regular' },
    { family: 'Roboto', style: 'Regular' },
    { family: 'Arial', style: 'Regular' },
    { family: 'Helvetica', style: 'Regular' }
  ];

  let loadedFont: FontName | null = null;
  for (const font of fontsToTry) {
    try {
      await figma.loadFontAsync(font);
      loadedFont = font;
      break;
    } catch {
      continue; // Try next font
    }
  }

  if (!loadedFont) {
    console.warn('[Link] Could not load any font, skipping component');
    throw new Error('No available fonts');
  }

  // Set the loaded font on the text node
  text.fontName = loadedFont;

  text.characters = component.text || 'Link';
  text.fontSize = component.styling.fontSize || 14;

  // Link color - purple/blue
  const linkColor = component.styling.textColor
    ? hexToRgb(component.styling.textColor)
    : { r: 0.49, g: 0.23, b: 0.93 }; // Default purple

  text.fills = [{
    type: 'SOLID',
    color: linkColor
  }];

  // Underline if specified
  if (component.styling.textDecoration === 'underline') {
    text.textDecoration = 'UNDERLINE';
  }

  return text;
}

/**
 * Create an icon (circle or square shape with optional content)
 */
async function createIcon(component: UIComponent): Promise<FrameNode> {
  const size = component.styling.size || 40;
  const shape = component.styling.shape || 'circle';
  const iconContent = component.styling.iconContent;

  // Create container frame
  const container = figma.createFrame();
  container.name = component.subtype === 'user-avatar' ? 'User Avatar' : 'Icon';
  container.resize(size, size);

  // Make frame behave like the icon shape
  container.clipsContent = true;
  container.cornerRadius = shape === 'circle' ? size / 2 : 4;

  // Icon background color
  const bgColor = component.styling.backgroundColor
    ? hexToRgb(component.styling.backgroundColor)
    : { r: 0.23, g: 0.51, b: 0.96 }; // Default blue

  container.fills = [{
    type: 'SOLID',
    color: bgColor
  }];

  // Add icon content if specified
  if (iconContent && iconContent !== 'empty') {
    const contentChar = getIconCharacter(iconContent);
    if (contentChar) {
      const text = figma.createText();

      // Load font - try multiple fonts in order of preference
      const fontsToTry = [
        { family: 'Inter', style: 'Regular' },
        { family: 'Roboto', style: 'Regular' },
        { family: 'Arial', style: 'Regular' },
        { family: 'Helvetica', style: 'Regular' }
      ];

      let loadedFont: FontName | null = null;
      for (const font of fontsToTry) {
        try {
          await figma.loadFontAsync(font);
          loadedFont = font;
          break;
        } catch {
          continue; // Try next font
        }
      }

      if (!loadedFont) {
        console.warn('[Icon] Could not load any font, creating icon without content');
        return container; // Return container without icon content
      }

      // Set the loaded font on the text node
      text.fontName = loadedFont;

      text.characters = contentChar;
      text.fontSize = Math.floor(size * 0.6); // Icon content is 60% of container size
      text.fills = [{
        type: 'SOLID',
        color: { r: 1, g: 1, b: 1 } // White content
      }];

      // Center the text in the container
      text.textAlignHorizontal = 'CENTER';
      text.textAlignVertical = 'CENTER';
      text.resize(size, size);

      container.appendChild(text);
    }
  }

  return container;
}

/**
 * Map icon content type to display character
 */
function getIconCharacter(iconContent: string): string {
  const iconMap: Record<string, string> = {
    'user-silhouette': '👤',
    'user': '👤',
    'document': '📄',
    'file': '📄',
    'settings': '⚙️',
    'gear': '⚙️',
    'email': '✉️',
    'mail': '✉️',
    'check': '✓',
    'checkmark': '✓',
    'star': '⭐',
    'heart': '❤️',
    'home': '🏠',
    'search': '🔍',
  };

  return iconMap[iconContent.toLowerCase()] || iconContent.charAt(0).toUpperCase();
}

/**
 * Create a container frame (for grouped elements)
 */
async function createContainer(component: UIComponent): Promise<FrameNode> {
  const container = figma.createFrame();
  const isModal = component.subtype === 'modal' || component.subtype === 'card';
  const isGrouping = component.styling.backgroundColor === 'transparent' ||
                     (!component.styling.backgroundColor && !isModal);

  container.name = isModal
    ? (component.subtype === 'modal' ? 'Modal' : 'Card')
    : isGrouping ? 'Group' : 'Container';

  // Auto-layout - use direction from component if specified
  const layoutDirection = component.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL';
  container.layoutMode = layoutDirection;

  // Spacing - tighter for grouping containers (icon + text)
  container.itemSpacing = isGrouping ? 8 : (isModal ? 16 : 12);

  // Padding - minimal for grouping containers, generous for modal/card
  const padding = isGrouping ? 0 : (isModal ? 24 : 16);
  container.paddingLeft = padding;
  container.paddingRight = padding;
  container.paddingTop = padding;
  container.paddingBottom = padding;

  // Auto-size
  container.primaryAxisSizingMode = 'AUTO';
  container.counterAxisSizingMode = 'AUTO';

  // Background - transparent for grouping, white for modal/card, light gray for regular
  if (component.styling.backgroundColor === 'transparent' || isGrouping) {
    container.fills = []; // No background
  } else {
    const bgColor = component.styling.backgroundColor
      ? hexToRgb(component.styling.backgroundColor)
      : isModal ? { r: 1, g: 1, b: 1 } : { r: 0.97, g: 0.97, b: 0.97 };

    container.fills = [{
      type: 'SOLID',
      color: bgColor
    }];
  }

  // Border radius - none for grouping, more for modal/card
  container.cornerRadius = isGrouping ? 0 : (isModal ? 12 : 8);

  // Note: Drop shadow disabled due to Figma API limitations in plugin context
  // The effect type works but may cause issues during component creation
  // Consider adding shadow manually in Figma after component creation

  // Create children if any
  if (component.children) {
    // Separate close buttons from other children for absolute positioning
    const closeButtons: UIComponent[] = [];
    const regularChildren: UIComponent[] = [];

    component.children.forEach(child => {
      if (child.type === 'button' && child.subtype === 'close' && child.position === 'top-right') {
        closeButtons.push(child);
      } else {
        regularChildren.push(child);
      }
    });

    // Create regular children first
    for (const child of regularChildren) {
      try {
        const childNode = await createUIComponent(child);
        if (childNode) {
          container.appendChild(childNode);

          // Apply layout properties after appending (only works when in auto-layout parent)
          if (child.styling.fillWidth && 'layoutGrow' in childNode) {
            childNode.layoutGrow = 1;
            if ('textAutoResize' in childNode) {
              childNode.textAutoResize = 'HEIGHT'; // Resize height to fit, fill width
            }
          }
        } else {
          console.warn('[Container] Failed to create child component (returned null):', {
            type: child.type,
            text: child.text,
            subtype: child.subtype
          });
        }
      } catch (error) {
        console.error('[Container] Error creating child component:', {
          type: child.type,
          text: child.text,
          subtype: child.subtype,
          error: error instanceof Error ? error.message : error
        });
      }
    }

    // Create close buttons with absolute positioning
    for (const closeBtn of closeButtons) {
      try {
        const btnNode = await createUIComponent(closeBtn);
        if (btnNode && 'layoutPositioning' in btnNode) {
          container.appendChild(btnNode);

          // Position absolutely in top-right corner
          btnNode.layoutPositioning = 'ABSOLUTE';

          // Use a fixed position - will be adjusted manually
          // Position from top-left, accounting for typical modal width
          btnNode.x = 300; // Temporary position, will adjust based on container
          btnNode.y = 16; // 16px from top edge

          // Try to set constraints (may not work in all cases)
          try {
            btnNode.constraints = {
              horizontal: 'MAX',
              vertical: 'MIN'
            };
          } catch (e) {
            console.warn('[Container] Could not set constraints on close button:', e);
          }
        } else {
          console.warn('[Container] Close button creation failed or not a frame node');
        }
      } catch (error) {
        console.error('[Container] Error creating close button:', {
          text: closeBtn.text,
          error: error instanceof Error ? error.message : error
        });
      }
    }
  }

  return container;
}

/**
 * Map spacing value to pixels
 */
function mapSpacing(spacing: string | undefined): number {
  switch (spacing) {
    case 'tight':
      return 8;
    case 'spacious':
      return 24;
    case 'normal':
    default:
      return 16;
  }
}

/**
 * Map border radius to pixels
 */
function mapBorderRadius(radius: string | undefined): number {
  switch (radius) {
    case 'none':
      return 0;
    case 'small':
      return 4;
    case 'medium':
      return 8;
    case 'large':
      return 16;
    default:
      return 8;
  }
}

/**
 * Map padding to pixel values
 */
function mapPadding(padding: string | undefined): { horizontal: number; vertical: number } {
  switch (padding) {
    case 'tight':
      return { horizontal: 16, vertical: 8 };
    case 'spacious':
      return { horizontal: 32, vertical: 16 };
    case 'normal':
    default:
      return { horizontal: 24, vertical: 12 };
  }
}

/**
 * Convert hex color to RGB (0-1 range for Figma)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  return { r, g, b };
}

/**
 * Map font-weight to Inter font style
 */
function getFontStyle(weight: number): string {
  switch (weight) {
    case 400:
      return 'Regular';
    case 500:
      return 'Medium';
    case 600:
      return 'SemiBold';
    case 700:
      return 'Bold';
    default:
      return 'Regular';
  }
}
