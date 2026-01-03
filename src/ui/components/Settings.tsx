import React, { useState } from 'react';
import type { OpenAISettings } from '../analysis/aiTypes';
import { validateApiKey } from '../services/settings';
import { DEFAULT_COPYWRITING_GUIDELINES, VOICE_GUIDELINES_SUMMARY } from '../constants/defaultGuidelines';
import { Icon } from './Icon';
import './Settings.css';

interface SettingsProps {
  settings: OpenAISettings;
  onSave: (settings: OpenAISettings) => void;
  onClose: () => void;
}

export function Settings({ settings, onSave, onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [guidelines, setGuidelines] = useState(settings.guidelines || '');
  const [enableCopywriting, setEnableCopywriting] = useState(settings.enableCopywriting || false);
  const [customGuidelines, setCustomGuidelines] = useState(settings.customGuidelines || '');
  const [showKey, setShowKey] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showCopyGuidelines, setShowCopyGuidelines] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');

    if ((enabled || enableCopywriting) && !apiKey) {
      setError('API key is required when AI features are enabled');
      return;
    }

    if (apiKey && !validateApiKey(apiKey)) {
      setError('Invalid API key format. OpenAI keys start with "sk-"');
      return;
    }

    try {
      await onSave({
        apiKey,
        model,
        enabled,
        guidelines,
        enableCopywriting,
        customGuidelines
      });
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to save settings. Check browser console for details.'
      );
    }
  };

  const loadDefaultCopyGuidelines = () => {
    setCustomGuidelines(DEFAULT_COPYWRITING_GUIDELINES + '\n\n' + VOICE_GUIDELINES_SUMMARY);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>AI Analysis Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <div className="setting-group">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>Enable AI-enhanced analysis</span>
            </label>
            <p className="setting-help">
              Uses OpenAI GPT for more nuanced, context-aware analysis
            </p>
          </div>

          <div className="setting-group">
            <label className="setting-label-text">OpenAI API Key</label>
            <div className="api-key-input">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                disabled={!enabled}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="toggle-visibility"
                disabled={!enabled}
              >
                {showKey ? <Icon name="IconEye" size={18} /> : <Icon name="IconEyeOff" size={18} />}
              </button>
            </div>
            <p className="setting-help">
              Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>
            </p>
          </div>

          <div className="setting-group">
            <label className="setting-label-text">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as OpenAISettings['model'])}
              disabled={!enabled}
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fastest, ~$0.001/analysis, text-only)</option>
              <option value="gpt-4-turbo-preview">GPT-4 Turbo Preview (~$0.01/analysis, text-only)</option>
              <option value="gpt-4">GPT-4 (Most capable text, ~$0.03/analysis, text-only)</option>
              <option value="gpt-4o">GPT-4o (Recommended, ~$0.015/analysis, supports images)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo (~$0.01/analysis, supports images)</option>
              <option value="gpt-4-vision-preview">GPT-4 Vision Preview (~$0.01/analysis, supports images)</option>
            </select>
            <p className="setting-help">
              Vision models (gpt-4o, gpt-4-turbo, gpt-4-vision-preview) support image analysis for OCR. Text-only models cannot analyze images.
            </p>
          </div>

          <div className="setting-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="setting-label-text">Voice & Tone Guidelines</label>
              <button
                type="button"
                onClick={() => setShowGuidelines(!showGuidelines)}
                className="btn-toggle-guidelines"
                disabled={!enabled}
              >
                {showGuidelines ? 'Hide' : 'Edit'}
              </button>
            </div>
            {showGuidelines && (
              <>
                <textarea
                  value={guidelines}
                  onChange={(e) => setGuidelines(e.target.value)}
                  placeholder="Enter your voice and tone guidelines..."
                  className="guidelines-textarea"
                  disabled={!enabled}
                  rows={12}
                />
                <div className="guidelines-footer">
                  <p className="setting-help">
                    These guidelines will be sent to the AI for analysis. Use markdown format for better readability.
                  </p>
                  <p className={`character-count ${guidelines.length > 3000 ? 'warning' : ''}`}>
                    {guidelines.length} / 3000 characters
                    {guidelines.length > 3000 && ' (will be truncated)'}
                  </p>
                </div>
              </>
            )}
            {!showGuidelines && (
              <p className="setting-help">
                Click "Edit" to customize the voice and tone guidelines used by AI analysis
              </p>
            )}
          </div>

          <div className="settings-divider"></div>

          <div className="setting-group">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={enableCopywriting}
                onChange={(e) => setEnableCopywriting(e.target.checked)}
              />
              <span>Enable AI copywriting</span>
            </label>
            <p className="setting-help">
              Generate and rewrite UI copy using voice & tone guidelines
            </p>
          </div>

          <div className="setting-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="setting-label-text">Copywriting guidelines</label>
              <div className="button-group">
                {!showCopyGuidelines && !customGuidelines && (
                  <button
                    type="button"
                    onClick={loadDefaultCopyGuidelines}
                    className="btn-load-defaults"
                    disabled={!enableCopywriting}
                  >
                    Load defaults
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCopyGuidelines(!showCopyGuidelines)}
                  className="btn-toggle-guidelines"
                  disabled={!enableCopywriting}
                >
                  {showCopyGuidelines ? 'Hide' : 'Edit'}
                </button>
              </div>
            </div>
            {showCopyGuidelines && (
              <>
                <textarea
                  value={customGuidelines}
                  onChange={(e) => setCustomGuidelines(e.target.value)}
                  placeholder="Enter copywriting guidelines or click 'Load defaults'..."
                  className="guidelines-textarea copywriting-guidelines"
                  disabled={!enableCopywriting}
                  rows={15}
                />
                <div className="guidelines-footer">
                  <p className="setting-help">
                    These guidelines define voice, tone, and copywriting standards for AI-generated content.
                  </p>
                  <div className="guidelines-actions">
                    <button
                      type="button"
                      onClick={loadDefaultCopyGuidelines}
                      className="btn-load-defaults-small"
                      disabled={!enableCopywriting}
                    >
                      Reset to defaults
                    </button>
                    <p className={`character-count ${customGuidelines.length > 6000 ? 'warning' : ''}`}>
                      {customGuidelines.length} characters
                      {customGuidelines.length > 6000 && ' (may affect performance)'}
                    </p>
                  </div>
                </div>
              </>
            )}
            {!showCopyGuidelines && (
              <p className="setting-help">
                {customGuidelines
                  ? 'Custom copywriting guidelines configured'
                  : 'Click "Load defaults" to use voice & tone guidelines'
                }
              </p>
            )}
          </div>

          {error && (
            <div className="settings-error">
              {error}
            </div>
          )}

          <div className="settings-info">
            <h3>Privacy & Cost</h3>
            <ul>
              <li>Your text is sent to OpenAI for analysis</li>
              <li>You'll be charged by OpenAI based on usage</li>
              <li>Typical cost: $0.001-0.03 per analysis</li>
              <li>Your API key is stored locally in your browser</li>
            </ul>
          </div>
        </div>

        <div className="settings-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
