import React, { useState, useRef } from 'react';
import type { OCRProgress } from '../services/ocr';

interface OCRInputProps {
  onImageSelect: (imageData: Uint8Array, source: 'figma' | 'upload') => void;
  onProgress: (progress: OCRProgress) => void;
  isProcessing: boolean;
}

export function OCRInput({ onImageSelect, onProgress, isProcessing }: OCRInputProps) {
  const [inputMode, setInputMode] = useState<'figma' | 'upload'>('figma');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFigmaExport = () => {
    // Request image export from plugin code
    parent.postMessage({
      pluginMessage: {
        type: 'export-image'
      }
    }, '*');
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      onImageSelect(uint8Array, 'upload');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        handleFileSelect(file);
      }
    }
  };

  return (
    <div className="ocr-input">
      <div className="ocr-mode-selector">
        <button
          className={`mode-btn ${inputMode === 'figma' ? 'active' : ''}`}
          onClick={() => setInputMode('figma')}
          disabled={isProcessing}
        >
          📐 From Figma
        </button>
        <button
          className={`mode-btn ${inputMode === 'upload' ? 'active' : ''}`}
          onClick={() => setInputMode('upload')}
          disabled={isProcessing}
        >
          📎 Upload Image
        </button>
      </div>

      {inputMode === 'figma' && (
        <div className="figma-export-section">
          <p className="instruction-text">
            Select a layer with an image in Figma, then click the button below to extract text from it.
          </p>
          <button
            className="btn-export-figma"
            onClick={handleFigmaExport}
            disabled={isProcessing}
          >
            📷 Export & Analyze Selected Layer
          </button>
        </div>
      )}

      {inputMode === 'upload' && (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onPaste={handlePaste}
          tabIndex={0}
        >
          <div className="drop-zone-content">
            <div className="drop-icon">📷</div>
            <p className="drop-text">
              Drop an image here, paste from clipboard, or
            </p>
            <button
              className="btn-browse"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              Browse Files
            </button>
            <p className="supported-formats">
              Supports PNG, JPG, GIF, WebP
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      <div className="ocr-tips">
        <h4>Tips for Best Results:</h4>
        <ul>
          <li>Use high-resolution screenshots (2x or higher)</li>
          <li>Ensure text has good contrast with background</li>
          <li>Avoid blurry or low-quality images</li>
          <li>Crop to relevant text area if possible</li>
        </ul>
      </div>
    </div>
  );
}
