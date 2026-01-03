import React from 'react';
import type { UIAnalysisResult, UIComponent } from '../services/uiAnalysis';
import { Icon } from './Icon';
import './UIAnalysisPreview.css';

interface UIAnalysisPreviewProps {
  analysis: UIAnalysisResult;
  onApply: () => void;
  onCancel: () => void;
}

export function UIAnalysisPreview({ analysis, onApply, onCancel }: UIAnalysisPreviewProps) {
  // Count all components including nested children
  const totalComponents = countComponents(analysis.components);

  return (
    <div className="ui-analysis-preview">
      <div className="preview-header">
        <h4><Icon name="IconSparkles" size={18} /> Detected UI Components</h4>
        <p className="preview-description">
          Review the components we'll create in Figma
        </p>
      </div>

      <div className="layout-info">
        <div className="layout-badge">
          <strong>Layout:</strong> {analysis.layout.direction} • {analysis.layout.spacing} spacing
        </div>
      </div>

      <div className="component-list">
        {analysis.components.map((comp, idx) => renderComponent(comp, idx, 0))}
      </div>

      {analysis.components.length === 0 && (
        <div className="no-components">
          <p>No UI components detected in this image.</p>
          <p className="help-text">Try a different screenshot with clear UI elements.</p>
        </div>
      )}

      <div className="preview-cost">
        <p>Cost: ${analysis.estimatedCost.toFixed(4)} • {analysis.tokensUsed} tokens</p>
      </div>

      <div className="preview-actions">
        <button onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={onApply}
          className="btn-primary"
          disabled={totalComponents === 0}
        >
          Create in Figma ({totalComponents} {totalComponents === 1 ? 'component' : 'components'})
        </button>
      </div>
    </div>
  );
}

/**
 * Recursively count all components including nested children
 */
function countComponents(components: UIComponent[]): number {
  let count = 0;
  for (const comp of components) {
    count++; // Count this component
    if (comp.children) {
      count += countComponents(comp.children); // Count children recursively
    }
  }
  return count;
}

/**
 * Recursively render a component and its children with visual hierarchy
 */
function renderComponent(comp: UIComponent, idx: number, depth: number): React.ReactNode {
  return (
    <React.Fragment key={`${depth}-${idx}`}>
      <div className={`component-item component-${comp.type} depth-${depth}`}>
        <div className="component-icon">
          {getComponentIcon(comp.type, comp.subtype)}
        </div>
        <div className="component-details">
          <div className="component-type-label">
            {comp.subtype ? `${comp.type} (${comp.subtype})` : comp.type}
          </div>
          {comp.text && (
            <div className="component-text">"{comp.text}"</div>
          )}
          <div className="component-meta">
            {comp.type === 'icon' ? (
              <>
                {comp.styling.size && (
                  <span className="meta-item">{comp.styling.size}px</span>
                )}
                {comp.styling.shape && (
                  <span className="meta-item">{comp.styling.shape}</span>
                )}
              </>
            ) : (
              <>
                {comp.styling.fontSize && (
                  <span className="meta-item">{comp.styling.fontSize}px</span>
                )}
                {comp.styling.fontWeight && (
                  <span className="meta-item font-weight">{getFontWeightLabel(comp.styling.fontWeight)}</span>
                )}
                {comp.styling.fillWidth !== undefined && (
                  <span className="meta-item">{comp.styling.fillWidth ? 'Fill width' : 'Hug content'}</span>
                )}
                {comp.styling.isLink && (
                  <span className="meta-item link-badge">Link</span>
                )}
              </>
            )}
            {comp.position && (
              <span className="meta-item position-badge">{comp.position}</span>
            )}
          </div>
          {(comp.styling.backgroundColor || comp.styling.textColor) && (
            <div className="component-colors">
              {comp.styling.backgroundColor && (
                <div className="color-swatch">
                  <div
                    className="color-chip"
                    style={{ backgroundColor: comp.styling.backgroundColor }}
                  ></div>
                  <span>BG: {comp.styling.backgroundColor}</span>
                </div>
              )}
              {comp.styling.textColor && (
                <div className="color-swatch">
                  <div
                    className="color-chip"
                    style={{ backgroundColor: comp.styling.textColor }}
                  ></div>
                  <span>Text: {comp.styling.textColor}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recursively render children if they exist */}
      {comp.children && comp.children.map((child, childIdx) => renderComponent(child, childIdx, depth + 1))}
    </React.Fragment>
  );
}

function getComponentIcon(type: string, subtype?: string): React.ReactNode {
  if (type === 'button' && subtype === 'close') {
    return <Icon name="IconX" size={16} />;
  }
  if (type === 'icon' && subtype === 'user-avatar') {
    return <Icon name="IconUser" size={16} />;
  }

  switch (type) {
    case 'heading':
      return <Icon name="IconFileText" size={16} />;
    case 'text':
      return <Icon name="IconFile" size={16} />;
    case 'button':
      return <Icon name="IconCircleDot" size={16} />;
    case 'container':
      return <Icon name="IconBox" size={16} />;
    case 'icon':
      return <Icon name="IconPalette" size={16} />;
    case 'link':
      return <Icon name="IconLink" size={16} />;
    default:
      return '•';
  }
}

function getFontWeightLabel(weight: number): string {
  switch (weight) {
    case 400:
      return 'Regular';
    case 500:
      return 'Medium';
    case 600:
      return 'Semibold';
    case 700:
      return 'Bold';
    default:
      return `${weight}`;
  }
}
