# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClearCopy is a Figma plugin that analyzes UI text against voice and tone guidelines to ensure plain language, accessibility, and consistency for users with cognitive disabilities. Features include rule-based analysis, AI-enhanced analysis via OpenAI, AI copywriting (Clear-Co Copy), and OCR text extraction from images.

**Current Status**: Phase 7 complete (OCR analysis).

## Build & Development Commands

```bash
npm run build              # Build both plugin code and UI
npm run build:code         # Build plugin code only (code.ts → dist/code.js)
npm run build:ui           # Build UI only (ui.html + React → dist/ui.html)
npm run dev                # Build and watch for UI changes (auto-rebuild)
```

**No lint or test commands are configured.**

After rebuilding, close and reopen the plugin in Figma to see changes (no hot reload).

### Testing in Figma

1. In Figma Desktop: **Plugins** → **Development** → **Import plugin from manifest**
2. Select `manifest.json` from project root
3. Run: **Plugins** → **Development** → **ClearCopy**
4. Debug: **Plugins** → **Development** → **Open Console**

## Architecture

### Dual-Context Build System

The plugin has **two separate JavaScript contexts** that communicate via message passing:

| Context | Entry Point | Output | Access |
|---------|-------------|--------|--------|
| **Plugin Code** | `src/code.ts` | `dist/code.js` | Figma API (`figma.*`), `figma.clientStorage` |
| **UI Code** | `src/ui/` | `dist/ui.html` | DOM, React, OpenAI API, OCR |

**Critical**: You cannot use Figma API in UI code or DOM/React in plugin code. All data exchange goes through message passing.

### Vite Build Configuration

Mode-based builds in `vite.config.ts`:
- `vite build --mode code` → IIFE bundle for Figma sandbox
- `vite build` (default) → Single-file HTML via `vite-plugin-singlefile`

### Source Structure

```
src/
├── code.ts                    # Plugin code (Figma sandbox)
├── ui/
│   ├── App.tsx                # Main React component
│   ├── analysis/              # Rule-based analyzers
│   │   ├── analyzer.ts        # Orchestrator - runs all checks
│   │   ├── types.ts           # Issue structure definitions
│   │   ├── aiTypes.ts         # AI analysis types
│   │   ├── copywritingTypes.ts
│   │   ├── readability.ts     # Flesch-Kincaid scoring
│   │   ├── sentenceLength.ts  # >20 word detection
│   │   ├── passiveVoice.ts    # Uses compromise NLP
│   │   ├── wordChoice.ts      # Complex word detection
│   │   ├── capitalization.ts  # Sentence case validation
│   │   ├── punctuation.ts     # Button/label punctuation
│   │   ├── buttonLabels.ts    # Verb + noun format
│   │   ├── errorMessages.ts   # Error message validation
│   │   └── elementDetector.ts # UI element type detection
│   ├── services/
│   │   ├── openai.ts          # AI analysis integration
│   │   ├── copywriting.ts     # Clear-Co Copy generation
│   │   ├── ocr.ts             # Tesseract.js integration
│   │   └── settings.ts        # Settings management
│   ├── components/
│   │   ├── Settings.tsx       # API key configuration
│   │   ├── CopywritingPreview.tsx
│   │   ├── OCRInput.tsx
│   │   └── OCRPreview.tsx
│   └── constants/
│       └── defaultGuidelines.ts  # Clear-Co Copy system prompt
```

## Message Passing Protocol

### Plugin → UI

```typescript
{ type: 'no-selection', message: string }
{ type: 'text-extracted', data: TextData }
{ type: 'settings-loaded', settings: OpenAISettings | null }
{ type: 'fix-applied', success: boolean, nodeId: string, error?: string }
{ type: 'image-exported', data: string }  // Base64 PNG for OCR
```

### UI → Plugin

```typescript
{ type: 'ui-ready' }
{ type: 'close' }
{ type: 'save-settings', settings: OpenAISettings }
{ type: 'load-settings' }
{ type: 'apply-fix', nodeId: string, newText: string }
{ type: 'export-image' }  // Request image export for OCR
```

## Analysis System

### Adding a New Checker

1. Create file in `src/ui/analysis/` returning `Issue[]`
2. Import and call in `analyzer.ts` within `analyzeText()`
3. Issues auto-display with color-coding based on severity

### Issue Structure

```typescript
interface Issue {
  severity: 'error' | 'warning' | 'suggestion';
  category: string;
  title: string;
  message: string;
  suggestion?: string;        // Replacement text
  problematicText?: string;   // Text to replace
  explanation?: string;       // "Why this matters"
}
```

Issues with both `suggestion` and `problematicText` can be auto-fixed.

### Scoring

- Base: 100 points
- Readability penalty: -20 if not 6th-8th grade level
- Per issue: error (-10), warning (-5), suggestion (-2)
- Pass threshold: score ≥ 70 AND passes readability

## Key Dependencies

- **React 18** - UI framework
- **Vite** + **vite-plugin-singlefile** - Bundling
- **compromise** - NLP for passive voice detection
- **text-readability** - Flesch-Kincaid scoring
- **@tabler/icons-react** - UI icons
- **@figma/plugin-typings** - Figma API types

## Guidelines Source

The voice and tone guidelines are based on:
https://gist.github.com/mpaiva/e754fccb7596628ed84ea72cbe1b3d02

Key principles are summarized in `src/ui/constants/defaultGuidelines.ts`.

## OCR Implementation

OCR uses **OpenAI Vision API** (not local Tesseract.js) for text extraction from images.

**Requirements:**
- OpenAI API key configured
- AI analysis enabled in settings
- Vision-capable model selected: `gpt-4o`, `gpt-4-turbo`, or `gpt-4-vision-preview`

Service: `src/ui/services/ocr.ts`

## Modifying Text in Figma

```typescript
// Always load font before modifying text
await figma.loadFontAsync(node.fontName as FontName);
node.characters = newText;
```

**Critical**: Font loading is required or changes fail silently.

## Network Access

Configured in `manifest.json`:
```json
"networkAccess": {
  "allowedDomains": ["https://api.openai.com"]
}
```
