import React, { useState } from 'react';
import type { OCRResult } from '../services/ocr';
import { Icon } from './Icon';

interface OCRPreviewProps {
  result: OCRResult;
  onAnalyze: (text: string) => void;
  onRewrite: (text: string) => void;
  onClose: () => void;
}

export function OCRPreview({ result, onAnalyze, onRewrite, onClose }: OCRPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(result.text);

  const currentText = isEditing ? editedText : result.text;

  const handleEdit = () => {
    if (!isEditing) {
      setEditedText(result.text);
    }
    setIsEditing(!isEditing);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'confidence-high';
    if (confidence >= 70) return 'confidence-medium';
    return 'confidence-low';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 90) return 'Excellent';
    if (confidence >= 70) return 'Good';
    return 'Fair';
  };

  return (
    <div className="ocr-preview">
      <div className="preview-header">
        <div className="header-left">
          <h3><Icon name="IconCamera" size={18} /> Extracted Text</h3>
          <span className={`confidence-badge ${getConfidenceColor(result.confidence)}`}>
            {getConfidenceLabel(result.confidence)} ({result.confidence.toFixed(0)}%)
          </span>
        </div>
        <button className="close-btn-small" onClick={onClose} title="Close preview">
          ×
        </button>
      </div>

      <div className="extraction-info">
        <span className="info-item"><Icon name="IconClock" size={14} /> {(result.processingTime / 1000).toFixed(1)}s</span>
        <span className="info-item"><Icon name="IconFileText" size={14} /> {result.text.split(/\s+/).length} words</span>
        <span className="info-item"><Icon name="IconLetterCase" size={14} /> {result.text.length} characters</span>
      </div>

      <div className="extracted-text-container">
        <div className="text-label">
          {isEditing ? 'Edit extracted text:' : 'Extracted text:'}
        </div>
        {isEditing ? (
          <textarea
            className="edit-textarea"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={8}
            autoFocus
          />
        ) : (
          <div className="text-content ocr-text">{result.text}</div>
        )}
      </div>

      {result.confidence < 70 && (
        <div className="ocr-warning">
          <strong><Icon name="IconAlertTriangle" size={16} /> Low confidence</strong>
          <p>
            The OCR accuracy may be limited. Please review the extracted text carefully.
            Consider using a higher quality image for better results.
          </p>
        </div>
      )}

      <div className="preview-actions">
        <button onClick={onClose} className="btn-secondary-small">
          Cancel
        </button>
        <button onClick={handleEdit} className="btn-secondary-small">
          {isEditing ? 'Cancel edit' : 'Edit text'}
        </button>
        <button
          onClick={() => onAnalyze(currentText)}
          className="btn-secondary-small"
        >
          <Icon name="IconChartBar" size={16} /> Analyze
        </button>
        <button
          onClick={() => onRewrite(currentText)}
          className="btn-primary-small"
        >
          <Icon name="IconSparkles" size={16} /> Rewrite
        </button>
      </div>
    </div>
  );
}
