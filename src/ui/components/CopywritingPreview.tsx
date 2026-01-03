import React, { useState } from 'react';
import type { CopywritingResult } from '../analysis/copywritingTypes';
import { Icon } from './Icon';

interface CopywritingPreviewProps {
  result: CopywritingResult;
  originalText?: string;
  onApply: (text: string) => void;
  onRegenerate: () => void;
  onClose: () => void;
}

export function CopywritingPreview({
  result,
  originalText,
  onApply,
  onRegenerate,
  onClose
}: CopywritingPreviewProps) {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [editedCopy, setEditedCopy] = useState(result.generatedCopy);
  const [isEditing, setIsEditing] = useState(false);

  const currentCopy = result.variants && result.variants.length > 0
    ? result.variants[selectedVariant] || result.generatedCopy
    : result.generatedCopy;

  const displayCopy = isEditing ? editedCopy : currentCopy;

  const handleApply = () => {
    onApply(isEditing ? editedCopy : currentCopy);
  };

  const handleEdit = () => {
    if (!isEditing) {
      setEditedCopy(currentCopy);
    }
    setIsEditing(!isEditing);
  };

  const handleVariantSelect = (index: number) => {
    setSelectedVariant(index);
    setIsEditing(false);
    setEditedCopy(result.variants![index]);
  };

  const taskTypeLabels = {
    'new-microcopy': 'New Microcopy',
    'rewrite': 'Rewrite',
    'summarize': 'Summarized',
    'variants': 'Variants',
    'tone-shift': 'Tone Adjusted'
  };

  return (
    <div className="copywriting-preview">
      <div className="preview-header">
        <h3><Icon name="IconSparkles" size={18} /> {taskTypeLabels[result.taskType]}</h3>
        <button className="close-btn-small" onClick={onClose} title="Close preview">×</button>
      </div>

      {originalText && result.taskType !== 'new-microcopy' && (
        <div className="original-text">
          <div className="text-label">Original:</div>
          <div className="text-content">{originalText}</div>
        </div>
      )}

      {result.variants && result.variants.length > 1 && (
        <div className="variants-selector">
          <div className="text-label">Choose variant:</div>
          <div className="variant-buttons">
            {result.variants.map((_, index) => (
              <button
                key={index}
                className={`variant-btn ${selectedVariant === index ? 'active' : ''}`}
                onClick={() => handleVariantSelect(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="generated-text">
        <div className="text-label">
          {result.variants && result.variants.length > 1 ? `Variant ${selectedVariant + 1}:` : 'Generated:'}
        </div>
        {isEditing ? (
          <textarea
            className="edit-textarea"
            value={editedCopy}
            onChange={(e) => setEditedCopy(e.target.value)}
            rows={4}
            autoFocus
          />
        ) : (
          <div className="text-content generated">{displayCopy}</div>
        )}
      </div>

      {result.reasoning && (
        <details className="reasoning-details">
          <summary>Why this copy?</summary>
          <p>{result.reasoning}</p>
        </details>
      )}

      <div className="preview-meta">
        <span className="cost-info">
          ${result.estimatedCost.toFixed(4)} • {result.tokensUsed} tokens
        </span>
      </div>

      <div className="preview-actions">
        <button onClick={onClose} className="btn-secondary-small">
          Cancel
        </button>
        <button onClick={handleEdit} className="btn-secondary-small">
          {isEditing ? 'Cancel edit' : 'Edit'}
        </button>
        <button onClick={onRegenerate} className="btn-secondary-small">
          Regenerate
        </button>
        <button onClick={handleApply} className="btn-primary-small">
          Apply to Figma
        </button>
      </div>
    </div>
  );
}
