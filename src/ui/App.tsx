import React, { useState, useEffect } from 'react';
import './App.css';
import { analyzeText } from './analysis/analyzer';
import type { AnalysisResult } from './analysis/types';
import type { AIAnalysisResult, OpenAISettings } from './analysis/aiTypes';
import type { CopywritingResult, TaskType } from './analysis/copywritingTypes';
import type { UIAnalysisResult } from './services/uiAnalysis';
import type { Theme, FontSize } from './types/accessibility';
import { Settings } from './components/Settings';
import { CopywritingPreview } from './components/CopywritingPreview';
import { UIAnalysisPreview } from './components/UIAnalysisPreview';
import { Icon } from './components/Icon';
import {
  loadAccessibilityPreferences,
  saveAccessibilityPreferences,
  initAccessibilityListener
} from './services/accessibility';
import { loadSettings, saveSettings, initSettingsListener } from './services/settings';
import { analyzeWithAI, estimateCost } from './services/openai';
import { generateCopy } from './services/copywriting';
import { extractTextFromImage } from './services/ocr';
import { analyzeUIStructure } from './services/uiAnalysis';
import { detectElementType } from './analysis/elementDetector';

interface TextData {
  allText: string;
  textNodes: TextNodeData[];
  selectionName: string;
  textCount: number;
  hasImage?: boolean; // True if selection contains exportable image nodes
  canExportAsImage?: boolean; // True if first selected node can be exported
}

interface TextNodeData {
  id: string;
  name: string;
  characters: string;
  fontSize: number;
  fontWeight: number;
}

type MessageType =
  | { type: 'no-selection'; message: string }
  | { type: 'text-extracted'; data: TextData };

function App() {
  const [message, setMessage] = useState<string>('Select a frame or text layer to analyze');
  const [textData, setTextData] = useState<TextData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [settings, setSettings] = useState<OpenAISettings>({
    apiKey: '',
    model: 'gpt-3.5-turbo',
    enabled: false
  });
  const [showSettings, setShowSettings] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
  const [applyingFix, setApplyingFix] = useState<string | null>(null);
  const [copywritingResult, setCopywritingResult] = useState<CopywritingResult | null>(null);
  const [copywritingLoading, setCopywritingLoading] = useState(false);
  const [copywritingError, setCopywritingError] = useState<string | null>(null);
  const [uiAnalysisResult, setUiAnalysisResult] = useState<UIAnalysisResult | null>(null);
  const [uiAnalysisLoading, setUiAnalysisLoading] = useState(false);
  const [uiAnalysisError, setUiAnalysisError] = useState<string | null>(null);
  const [lastExportedImage, setLastExportedImage] = useState<Uint8Array | null>(null);

  // Accessibility state
  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSize] = useState<FontSize>('normal');

  /**
   * Clear all analysis state when selection changes
   * Resets AI analysis, copywriting, UI components, and cached data
   */
  const clearAnalysisState = () => {
    // Clear AI analysis
    setAiAnalysis(null);
    setAiLoading(false);
    setAiError(null);

    // Clear copywriting
    setCopywritingResult(null);
    setCopywritingLoading(false);
    setCopywritingError(null);

    // Clear UI component analysis
    setUiAnalysisResult(null);
    setUiAnalysisLoading(false);
    setUiAnalysisError(null);

    // Clear fix application state
    setApplyingFix(null);

    // Clear cached data
    setLastExportedImage(null);
  };

  /**
   * Toggle between light and dark theme
   */
  const toggleTheme = async () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await saveAccessibilityPreferences({ theme: newTheme, fontSize });
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  /**
   * Toggle between normal and large font size
   */
  const toggleFontSize = async () => {
    const newFontSize: FontSize = fontSize === 'normal' ? 'large' : 'normal';
    setFontSize(newFontSize);
    try {
      await saveAccessibilityPreferences({ theme, fontSize: newFontSize });
    } catch (error) {
      console.error('Failed to save font size preference:', error);
    }
  };

  // Apply theme and font size to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-size', fontSize);
  }, [theme, fontSize]);

  useEffect(() => {
    // Initialize settings listener
    initSettingsListener();

    // Initialize accessibility listener
    initAccessibilityListener();

    // Load settings asynchronously
    loadSettings().then(loadedSettings => {
      setSettings(loadedSettings);
    }).catch(error => {
      console.error('Failed to load settings:', error);
    });

    // Load accessibility preferences asynchronously
    loadAccessibilityPreferences().then(prefs => {
      setTheme(prefs.theme);
      setFontSize(prefs.fontSize);
    }).catch(error => {
      console.error('Failed to load accessibility preferences:', error);
    });

    // Listen for messages from the plugin code
    window.onmessage = (event: MessageEvent<MessageType>) => {
      const msg = event.data.pluginMessage;

      console.log('Received message:', msg);

      if (!msg) return;

      if (msg.type === 'no-selection') {
        console.log('No selection, showing message:', msg.message);
        setMessage(msg.message);
        setTextData(null);
        setAnalysis(null);
        setAppliedFixes(new Set());
        clearAnalysisState(); // Clear all AI/copywriting/UI analysis state
      } else if (msg.type === 'text-extracted') {
        console.log('Text extracted:', msg.data);
        clearAnalysisState(); // Clear previous selection's analysis state
        setTextData(msg.data);
        setMessage('');
        setAppliedFixes(new Set());

        // Run analysis on the extracted text
        if (msg.data.allText) {
          const result = analyzeText(msg.data.allText);
          console.log('Analysis result:', result);
          setAnalysis(result);
        }
      } else if (msg.type === 'fix-applied') {
        const currentApplyingFix = applyingFix;
        setApplyingFix(null);
        if (msg.success && currentApplyingFix) {
          // Mark this issue as applied
          setAppliedFixes(prev => new Set(prev).add(currentApplyingFix));
        } else if (!msg.success) {
          // Show error
          alert(`Failed to apply fix: ${msg.error}`);
        }
      } else if (msg.type === 'image-exported') {
        // Store the exported image for UI analysis
        if (msg.success) {
          setLastExportedImage(msg.imageData);
        }
      } else if (msg.type === 'components-created') {
        if (msg.success) {
          // Success! Close the preview
          setUiAnalysisResult(null);
          const count = msg.componentCount || msg.nodeIds?.length || 0;
          alert(`Successfully created ${count} component${count === 1 ? '' : 's'} in Figma!`);
        } else {
          setUiAnalysisError(msg.error || 'Failed to create components');
        }
      }
    };

    // Request initial data from plugin
    console.log('UI mounted, requesting initial data');
    parent.postMessage({ pluginMessage: { type: 'ui-ready' } }, '*');
  }, []);

  const handleAIAnalysis = async () => {
    if (!textData) {
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      let textToAnalyze = textData.allText;

      // If no text but has image, run OCR first
      if (!textToAnalyze && textData.hasImage) {
        console.log('No text found, attempting OCR on image...');

        // Request image export from Figma
        parent.postMessage({ pluginMessage: { type: 'export-image' } }, '*');

        // Wait for image export response
        const imageData = await new Promise<Uint8Array>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Image export timeout')), 10000);

          const handler = (event: MessageEvent) => {
            const msg = event.data.pluginMessage;
            if (msg?.type === 'image-exported') {
              clearTimeout(timeout);
              window.removeEventListener('message', handler);

              if (msg.success) {
                resolve(msg.imageData);
              } else {
                reject(new Error(msg.error || 'Failed to export image'));
              }
            }
          };

          window.addEventListener('message', handler);
        });

        // Run OCR on the exported image
        const ocrResult = await extractTextFromImage(imageData, settings, (progress) => {
          console.log('OCR progress:', progress);
        });

        textToAnalyze = ocrResult.text;

        if (!textToAnalyze) {
          setAiError('No text found in the image. The image might be empty or too low quality for OCR.');
          setAiLoading(false);
          return;
        }

        console.log('OCR extracted text:', textToAnalyze);
      }

      if (!textToAnalyze) {
        setAiError('No text to analyze. Please select a text layer or image with text.');
        setAiLoading(false);
        return;
      }

      const elementType = detectElementType(textToAnalyze);
      const result = await analyzeWithAI(
        {
          text: textToAnalyze,
          elementType,
          context: `Text from ${textData.selectionName}`
        },
        settings
      );

      setAiAnalysis(result);
      console.log('AI analysis complete:', result);
    } catch (error) {
      console.error('AI analysis failed:', error);
      setAiError(error instanceof Error ? error.message : 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveSettings = async (newSettings: OpenAISettings) => {
    await saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleApplyFix = async (issueId: string, problematicText: string, suggestion: string) => {
    if (!textData) return;

    // Find the text node that contains the problematic text
    const targetNode = textData.textNodes.find(node =>
      node.characters.includes(problematicText)
    );

    if (!targetNode) {
      alert('Could not find the text to fix in the selected layers');
      return;
    }

    // Replace the problematic text with the suggestion
    const newText = targetNode.characters.replace(problematicText, suggestion);

    setApplyingFix(issueId);

    // Send message to plugin code to apply the fix
    parent.postMessage({
      pluginMessage: {
        type: 'apply-fix',
        nodeId: targetNode.id,
        newText
      }
    }, '*');
  };

  const handleFixAll = async () => {
    if (!analysis || !textData) return;

    // Get all fixable issues (those with both problematic text and suggestions)
    const fixableIssues = analysis.issues.filter(
      issue => issue.suggestion && issue.problematicText && !appliedFixes.has(issue.id)
    );

    if (fixableIssues.length === 0) {
      alert('No fixable issues found');
      return;
    }

    const confirmMessage = `Apply ${fixableIssues.length} fix${fixableIssues.length > 1 ? 'es' : ''}?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    // Apply fixes sequentially
    for (const issue of fixableIssues) {
      await new Promise<void>((resolve) => {
        handleApplyFix(issue.id, issue.problematicText!, issue.suggestion!);
        // Wait a bit for the fix to complete before applying the next one
        setTimeout(resolve, 300);
      });
    }
  };

  const handleCopywriting = async (taskType: TaskType) => {
    if (!textData || !textData.allText) {
      return;
    }

    setCopywritingLoading(true);
    setCopywritingError(null);
    setCopywritingResult(null);

    try {
      const elementType = detectElementType(textData.allText);
      const result = await generateCopy(
        {
          text: textData.allText,
          taskType,
          elementType,
          context: `Text from ${textData.selectionName}`,
          variantCount: taskType === 'variants' ? 3 : undefined
        },
        settings
      );

      setCopywritingResult(result);
      console.log('Copywriting complete:', result);
    } catch (error) {
      console.error('Copywriting failed:', error);
      setCopywritingError(error instanceof Error ? error.message : 'Copywriting failed');
    } finally {
      setCopywritingLoading(false);
    }
  };

  const handleApplyCopy = async (newText: string) => {
    if (!textData) return;

    // Find the first text node (or the one that best matches)
    const targetNode = textData.textNodes[0];

    if (!targetNode) {
      alert('Could not find a text layer to apply the copy to');
      return;
    }

    // Send message to plugin code to apply the fix
    parent.postMessage({
      pluginMessage: {
        type: 'apply-fix',
        nodeId: targetNode.id,
        newText
      }
    }, '*');

    // Close the preview after applying
    setCopywritingResult(null);
  };

  const handleRegenerateCopy = () => {
    if (copywritingResult) {
      handleCopywriting(copywritingResult.taskType);
    }
  };

  const handleAnalyzeUI = async () => {
    if (!textData) return;

    setUiAnalysisLoading(true);
    setUiAnalysisError(null);
    setUiAnalysisResult(null);

    try {
      let imageData: Uint8Array;

      // If we already have an exported image from OCR, use it
      if (lastExportedImage) {
        imageData = lastExportedImage;
      } else if (textData.hasImage || textData.canExportAsImage) {
        // Request image export from Figma
        parent.postMessage({ pluginMessage: { type: 'export-image' } }, '*');

        // Wait for image export response
        imageData = await new Promise<Uint8Array>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Image export timeout')), 10000);

          const handler = (event: MessageEvent) => {
            const msg = event.data.pluginMessage;
            if (msg?.type === 'image-exported') {
              clearTimeout(timeout);
              window.removeEventListener('message', handler);

              if (msg.success) {
                resolve(msg.imageData);
              } else {
                reject(new Error(msg.error || 'Failed to export image'));
              }
            }
          };

          window.addEventListener('message', handler);
        });
      } else {
        throw new Error('No image available for UI analysis');
      }

      // Analyze UI structure
      const result = await analyzeUIStructure(imageData, settings);
      setUiAnalysisResult(result);
      console.log('UI analysis complete:', result);
    } catch (error) {
      console.error('UI analysis failed:', error);
      setUiAnalysisError(error instanceof Error ? error.message : 'UI analysis failed');
    } finally {
      setUiAnalysisLoading(false);
    }
  };

  const handleCreateComponents = () => {
    if (!uiAnalysisResult) return;

    // Send message to plugin to create components
    parent.postMessage({
      pluginMessage: {
        type: 'create-components',
        analysisResult: uiAnalysisResult,
        position: undefined // Let plugin use default position
      }
    }, '*');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>ClearCopy</h1>
            <p className="subtitle">Voice & tone guideline checker</p>
          </div>
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            >
              <Icon name={theme === 'light' ? 'IconMoon' : 'IconSun'} size={20} />
            </button>

            <button
              className="icon-btn"
              onClick={toggleFontSize}
              title={fontSize === 'normal' ? 'Increase font size' : 'Reset font size'}
              aria-label={fontSize === 'normal' ? 'Increase font size' : 'Reset font size'}
            >
              <Icon name="IconTypography" size={20} />
              {fontSize === 'large' && <span className="active-indicator" />}
            </button>

            <button
              className="icon-btn"
              onClick={() => setShowSettings(true)}
              title="AI Settings"
              aria-label="Open settings"
            >
              <Icon name="IconSettings" size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        {message && (
          <div className="empty-state">
            <p>{message}</p>
          </div>
        )}

        {textData && (
          <div className="content">
            <div className="selection-info">
              <h2>{textData.selectionName}</h2>
              {analysis ? (
                <p className="meta">
                  {textData.textCount} text {textData.textCount === 1 ? 'layer' : 'layers'} • {' '}
                  {analysis.metrics.wordCount} words • {' '}
                  {analysis.metrics.sentenceCount} sentences
                </p>
              ) : textData.hasImage ? (
                <p className="meta">Image layer • Ready for OCR analysis</p>
              ) : (
                <p className="meta">{textData.textCount} text {textData.textCount === 1 ? 'layer' : 'layers'}</p>
              )}
            </div>

            {/* Show local analysis results only if available */}
            {analysis && (
              <>
                {/* Overall Score */}
                <div className={`score-card ${analysis.passesGuidelines ? 'pass' : 'needs-work'}`}>
                  <div className="score-value">{analysis.overallScore}/100</div>
                  <div className="score-label">
                    {analysis.passesGuidelines ? (
                      <><Icon name="IconCheck" size={16} /> Passes guidelines</>
                    ) : (
                      <><Icon name="IconAlertTriangle" size={16} /> Needs improvement</>
                    )}
                  </div>
                </div>

                {/* Readability Metrics */}
                <div className="metrics-card">
                  <h3>Readability</h3>
                  <div className="metrics-grid">
                    <div className="metric">
                      <div className="metric-label">Reading level</div>
                      <div className={`metric-value ${analysis.metrics.passesReadabilityTarget ? 'good' : 'warning'}`}>
                        Grade {analysis.metrics.fleschKincaidGrade}
                      </div>
                      <div className="metric-target">Target: 6-8th grade</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Flesch reading ease</div>
                      <div className="metric-value">{analysis.metrics.fleschReadingEase}</div>
                      <div className="metric-target">Higher is easier</div>
                    </div>
                    <div className="metric">
                      <div className="metric-label">Avg sentence length</div>
                      <div className={`metric-value ${analysis.metrics.averageSentenceLength <= 20 ? 'good' : 'warning'}`}>
                        {analysis.metrics.averageSentenceLength} words
                      </div>
                      <div className="metric-target">Target: ≤20 words</div>
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {analysis.issues.length > 0 && (
                  <div className="issues-card">
                    <div className="issues-header">
                      <h3>Issues ({analysis.issues.length})</h3>
                    </div>
                    <div className="issues-list">
                      {analysis.issues.map((issue) => (
                        <div key={issue.id} className={`issue issue-${issue.severity}`}>
                          <div className="issue-header">
                            <span className={`issue-badge ${issue.severity}`}>
                              {issue.severity}
                            </span>
                            <span className="issue-title">{issue.title}</span>
                          </div>
                          <p className="issue-message">{issue.message}</p>
                          {issue.suggestion && (
                            <p className="issue-suggestion">
                              <strong>Suggestion:</strong> {issue.suggestion}
                            </p>
                          )}
                          {issue.problematicText && (
                            <div className="issue-text">"{issue.problematicText}"</div>
                          )}
                          {issue.explanation && (
                            <details className="issue-explanation">
                              <summary>Why this matters</summary>
                              <p>{issue.explanation}</p>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.issues.length === 0 && (
                  <div className="success-card">
                    <h3><Icon name="IconCheck" size={18} /> No issues found</h3>
                    <p>This text follows the voice and tone guidelines!</p>
                  </div>
                )}
              </>
            )}

            {/* AI Analysis Section */}
            <div className="ai-section">
              {!aiAnalysis && !aiLoading && settings.enabled && settings.apiKey && (
                <button
                  className="btn-ai-analyze"
                  onClick={handleAIAnalysis}
                  disabled={aiLoading}
                >
                  {textData.hasImage && !textData.allText ? (
                    <><Icon name="IconSparkles" size={16} /> Analyze Image (OCR)</>
                  ) : (
                    <><Icon name="IconSparkles" size={16} /> Analyze</>
                  )}
                </button>
              )}

              {aiLoading && (
                <div className="ai-loading">
                  <div className="spinner"></div>
                  <p>Analyzing with AI...</p>
                </div>
              )}

              {aiError && (
                <div className="ai-error">
                  <h3>AI Analysis Error</h3>
                  <p>{aiError}</p>
                  <button onClick={() => setAiError(null)} className="btn-dismiss">
                    Dismiss
                  </button>
                </div>
              )}

              {aiAnalysis && (
                <div className="ai-results">
                  <h3><Icon name="IconSparkles" size={20} /> AI-Enhanced Analysis</h3>

                  <div className="ai-assessment">
                    <h4>Overall Assessment</h4>
                    <p>{aiAnalysis.overallAssessment}</p>
                  </div>

                  {aiAnalysis.strengthsIdentified.length > 0 && (
                    <div className="ai-strengths">
                      <h4>Strengths</h4>
                      <ul>
                        {aiAnalysis.strengthsIdentified.map((strength, idx) => (
                          <li key={idx}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiAnalysis.issuesFound.length > 0 && (
                    <div className="ai-issues">
                      <h4>AI-Detected Issues ({aiAnalysis.issuesFound.length})</h4>
                      <div className="issues-list">
                        {aiAnalysis.issuesFound.map((issue, idx) => (
                          <div key={idx} className={`issue issue-${issue.severity}`}>
                            <div className="issue-header">
                              <span className={`issue-badge ${issue.severity}`}>
                                {issue.severity}
                              </span>
                              <span className="issue-title">{issue.type}</span>
                            </div>
                            <p className="issue-message">{issue.description}</p>
                            {issue.suggestion && (
                              <p className="issue-suggestion">
                                <strong>Suggestion:</strong> {issue.suggestion}
                              </p>
                            )}
                            {issue.affectedText && (
                              <div className="issue-text">"{issue.affectedText}"</div>
                            )}
                            {issue.guidelineReference && (
                              <p className="issue-guideline">
                                <strong>Guideline:</strong> {issue.guidelineReference}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiAnalysis.suggestions.length > 0 && (
                    <div className="ai-suggestions">
                      <h4>Alternative Phrasings</h4>
                      <ul>
                        {aiAnalysis.suggestions.map((suggestion, idx) => (
                          <li key={idx}>"{suggestion}"</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiAnalysis.toneAnalysis && (
                    <div className="ai-tone">
                      <h4>Tone Analysis</h4>
                      <p>{aiAnalysis.toneAnalysis}</p>
                    </div>
                  )}

                  {aiAnalysis.readabilityFeedback && (
                    <div className="ai-readability">
                      <h4>Readability Feedback</h4>
                      <p>{aiAnalysis.readabilityFeedback}</p>
                    </div>
                  )}

                  {/* Copywriting Actions - show only if issues found */}
                  {aiAnalysis.issuesFound.length > 0 && settings.customGuidelines && (
                    <div className="copywriting-actions">
                      <h4><Icon name="IconSparkles" size={18} /> Improve This Copy</h4>
                      <p className="section-description">Generate improved versions using ClearCompany guidelines</p>
                      <div className="action-buttons">
                        <button
                          className="btn-copywriting"
                          onClick={() => handleCopywriting('rewrite')}
                          disabled={copywritingLoading}
                        >
                          Rewrite
                        </button>
                        <button
                          className="btn-copywriting"
                          onClick={() => handleCopywriting('summarize')}
                          disabled={copywritingLoading}
                        >
                          Summarize
                        </button>
                        <button
                          className="btn-copywriting"
                          onClick={() => handleCopywriting('variants')}
                          disabled={copywritingLoading}
                        >
                          Get variants
                        </button>
                      </div>

                      {copywritingLoading && (
                        <div className="copywriting-loading">
                          <div className="spinner"></div>
                          <p>Generating improved copy...</p>
                        </div>
                      )}

                      {copywritingError && (
                        <div className="copywriting-error">
                          <p>{copywritingError}</p>
                          <button onClick={() => setCopywritingError(null)} className="btn-dismiss-small">
                            Dismiss
                          </button>
                        </div>
                      )}

                      {copywritingResult && (
                        <CopywritingPreview
                          result={copywritingResult}
                          originalText={textData?.allText}
                          onApply={handleApplyCopy}
                          onRegenerate={handleRegenerateCopy}
                          onClose={() => setCopywritingResult(null)}
                        />
                      )}
                    </div>
                  )}

                  {/* UI Component Creation Section - only for actual image layers */}
                  {textData.hasImage && !uiAnalysisResult && (
                    <div className="ui-component-section">
                      <h4><Icon name="IconPalette" size={18} /> Create Figma Components</h4>
                      <p className="section-description">
                        Automatically recreate this UI in Figma with real text layers and auto-layout
                      </p>

                      {!uiAnalysisLoading && !uiAnalysisResult && (
                        <button
                          className="btn-analyze-ui"
                          onClick={handleAnalyzeUI}
                          disabled={uiAnalysisLoading}
                        >
                          Analyze UI Structure
                        </button>
                      )}

                      {uiAnalysisLoading && (
                        <div className="ui-analysis-loading">
                          <div className="spinner"></div>
                          <p>Analyzing UI structure...</p>
                        </div>
                      )}

                      {uiAnalysisError && (
                        <div className="ui-analysis-error">
                          <p>{uiAnalysisError}</p>
                          <button onClick={() => setUiAnalysisError(null)} className="btn-dismiss-small">
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show UI Analysis Preview */}
                  {uiAnalysisResult && (
                    <UIAnalysisPreview
                      analysis={uiAnalysisResult}
                      onApply={handleCreateComponents}
                      onCancel={() => setUiAnalysisResult(null)}
                    />
                  )}

                  <div className="ai-meta">
                    <p className="ai-cost">
                      Cost: ${aiAnalysis.estimatedCost.toFixed(4)} • {aiAnalysis.tokensUsed} tokens
                    </p>
                    <button onClick={() => setAiAnalysis(null)} className="btn-dismiss-small">
                      Clear AI analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>ClearCopy - Voice & tone guideline checker</p>
      </footer>

      {showSettings && (
        <Settings
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
