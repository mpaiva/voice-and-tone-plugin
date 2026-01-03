// This plugin runs in the Figma sandbox and has access to the Figma API
// It extracts text from selected frames and sends it to the UI for analysis

import { createComponentsFromAnalysis } from './componentGenerator';

// Show the plugin UI with resize enabled
figma.showUI(__html__, {
  width: 400,
  height: 600,
  title: 'ClearCopy',
  themeColors: true
});

// Listen for selection changes
figma.on('selectionchange', () => {
  extractAndSendText();
});

// Initial extraction when plugin loads
extractAndSendText();

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'close') {
    figma.closePlugin();
  } else if (msg.type === 'ui-ready') {
    // UI is ready, send current selection state
    console.log('UI ready, sending initial state');
    extractAndSendText();

    // Also send stored settings
    const settings = await figma.clientStorage.getAsync('clearcopy-settings');
    figma.ui.postMessage({
      type: 'settings-loaded',
      settings: settings || null
    });
  } else if (msg.type === 'save-settings') {
    // Save settings to clientStorage
    try {
      await figma.clientStorage.setAsync('clearcopy-settings', msg.settings);
      figma.ui.postMessage({
        type: 'settings-saved',
        success: true
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'settings-saved',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save settings'
      });
    }
  } else if (msg.type === 'load-settings') {
    // Load settings from clientStorage
    try {
      const settings = await figma.clientStorage.getAsync('clearcopy-settings');
      figma.ui.postMessage({
        type: 'settings-loaded',
        settings: settings || null
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'settings-loaded',
        settings: null,
        error: error instanceof Error ? error.message : 'Failed to load settings'
      });
    }
  } else if (msg.type === 'load-accessibility') {
    // Load accessibility preferences from clientStorage
    const preferences = await figma.clientStorage.getAsync('accessibility-preferences');
    figma.ui.postMessage({
      type: 'accessibility-loaded',
      preferences: preferences || null
    });
  } else if (msg.type === 'save-accessibility') {
    // Save accessibility preferences to clientStorage
    try {
      await figma.clientStorage.setAsync('accessibility-preferences', msg.preferences);
      figma.ui.postMessage({
        type: 'accessibility-saved',
        success: true
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'accessibility-saved',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save accessibility preferences'
      });
    }
  } else if (msg.type === 'export-image') {
    // Export image from selected node
    try {
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.ui.postMessage({
          type: 'image-exported',
          success: false,
          error: 'Please select a layer with an image'
        });
        return;
      }

      const node = selection[0];

      // Check if node can be exported as image
      if (!('exportAsync' in node)) {
        figma.ui.postMessage({
          type: 'image-exported',
          success: false,
          error: 'Selected layer cannot be exported as an image'
        });
        return;
      }

      // Export as PNG
      const bytes = await node.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 2 } // 2x for better OCR accuracy
      });

      figma.ui.postMessage({
        type: 'image-exported',
        success: true,
        imageData: bytes,
        nodeName: node.name
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'image-exported',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export image'
      });
    }
  } else if (msg.type === 'apply-fix') {
    // Apply a fix to a text node
    try {
      const node = figma.getNodeById(msg.nodeId) as TextNode;

      if (!node) {
        figma.ui.postMessage({
          type: 'fix-applied',
          success: false,
          nodeId: msg.nodeId,
          error: 'Text layer no longer exists'
        });
        return;
      }

      if (node.type !== 'TEXT') {
        figma.ui.postMessage({
          type: 'fix-applied',
          success: false,
          nodeId: msg.nodeId,
          error: 'Selected node is not a text layer'
        });
        return;
      }

      // Load font before modifying text
      await figma.loadFontAsync(node.fontName as FontName);

      // Apply the fix
      node.characters = msg.newText;

      figma.ui.postMessage({
        type: 'fix-applied',
        success: true,
        nodeId: msg.nodeId
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'fix-applied',
        success: false,
        nodeId: msg.nodeId,
        error: error instanceof Error ? error.message : 'Failed to apply fix'
      });
    }
  } else if (msg.type === 'resize') {
    // Resize the plugin window
    const width = Math.max(300, Math.min(800, msg.width));
    const height = Math.max(400, Math.min(1000, msg.height));
    figma.ui.resize(width, height);
  } else if (msg.type === 'create-components') {
    // Create Figma components from UI analysis
    try {
      const result = await createComponentsFromAnalysis(
        msg.analysisResult,
        msg.position
      );

      figma.ui.postMessage({
        type: 'components-created',
        success: result.success,
        nodeIds: result.nodeIds,
        componentCount: result.componentCount,
        error: result.error
      });
    } catch (error) {
      figma.ui.postMessage({
        type: 'components-created',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create components'
      });
    }
  }
};

/**
 * Extract text from current selection and send to UI
 */
function extractAndSendText() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'no-selection',
      message: 'Select a frame or text layer to analyze'
    });
    return;
  }

  // Skip plugin-created containers to prevent re-analyzing our own creations
  if (selection.length === 1) {
    const node = selection[0];
    const isPluginCreated = node.getPluginData('createdByPlugin') === 'true';
    const isRecreatedUI = node.name === 'Recreated UI';

    if (isPluginCreated || isRecreatedUI) {
      console.log('[ClearCopy] Skipping analysis of plugin-created container:', node.name);
      return;
    }
  }

  const textData = extractTextFromNodes(selection);

  figma.ui.postMessage({
    type: 'text-extracted',
    data: textData
  });
}

/**
 * Recursively extract all text from nodes
 */
function extractTextFromNodes(nodes: readonly SceneNode[]): TextData {
  const allText: string[] = [];
  const textNodes: TextNodeData[] = [];

  function traverse(node: SceneNode) {
    if (node.type === 'TEXT') {
      const textContent = node.characters;
      if (textContent.trim().length > 0) {
        allText.push(textContent);
        textNodes.push({
          id: node.id,
          name: node.name,
          characters: textContent,
          fontSize: typeof node.fontSize === 'number' ? node.fontSize : 12,
          fontWeight: typeof node.fontWeight === 'number' ? node.fontWeight : 400
        });
      }
    }

    // Recursively traverse children if the node has them
    if ('children' in node) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  // Traverse all selected nodes
  for (const node of nodes) {
    traverse(node);
  }

  // Check if selection can be exported as image (for OCR)
  const canExportAsImage = nodes.length > 0 && 'exportAsync' in nodes[0];

  // Consider it an "image" if there's no text but the node can be exported
  const hasImage = textNodes.length === 0 && canExportAsImage;

  return {
    allText: allText.join('\n\n'),
    textNodes,
    selectionName: nodes.length === 1 ? nodes[0].name : `${nodes.length} items`,
    textCount: textNodes.length,
    hasImage,
    canExportAsImage
  };
}

// Type definitions
interface TextData {
  allText: string;
  textNodes: TextNodeData[];
  selectionName: string;
  textCount: number;
  hasImage: boolean; // True if selection contains exportable image nodes
  canExportAsImage: boolean; // True if first selected node can be exported
}

interface TextNodeData {
  id: string;
  name: string;
  characters: string;
  fontSize: number;
  fontWeight: number;
}
