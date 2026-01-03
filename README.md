# Voice & Tone - Figma Plugin

A Figma plugin that analyzes UI text against voice and tone guidelines to ensure plain language, accessibility, and consistency for users with cognitive disabilities.

## Current Status: Phase 7 Complete

### Features
- **Rule-based analysis** - Readability, sentence length, passive voice, word choice, capitalization, punctuation, button labels, error messages
- **AI-enhanced analysis** - Deeper analysis via OpenAI integration
- **Clear-Co Copy** - AI copywriting assistant that generates brand-compliant UI copy
- **OCR text extraction** - Analyze text from screenshots and images

### What's Working
- Text extraction from selected frames
- Reading level calculation (Flesch-Kincaid grade level)
- Readability scoring (Flesch Reading Ease)
- Sentence length analysis (flags sentences >20 words)
- Passive voice detection
- Word choice checker (simple vs complex words)
- Capitalization validation (sentence case)
- Punctuation rules (no periods on buttons/labels)
- Button label patterns (verb + noun format)
- Error message validation
- UI element type detection
- Overall score (0-100) with color-coded feedback
- Auto-fix suggestions with "Apply fix" buttons
- OpenAI-powered AI analysis (optional)
- AI copywriting with rewrite, summarize, and variants
- OCR text extraction from images via OpenAI Vision

## Getting Started

### Install Dependencies
```bash
npm install
```

### Build
```bash
npm run build           # Build both code and UI
npm run build:code      # Build plugin code only
npm run build:ui        # Build UI only
```

### Development Mode
```bash
npm run dev             # Build and watch for changes
```

Note: Close and reopen the plugin in Figma after each rebuild to see changes.

## Testing in Figma

1. Open Figma Desktop App
2. Go to **Plugins** → **Development** → **Import plugin from manifest**
3. Navigate to this project folder and select `manifest.json`
4. Run: **Plugins** → **Development** → **Voice & Tone**

### Test Examples

**Simple text (should pass):**
```
Get started
Click save
Add a name
```

**Complex text (should flag issues):**
```
The form was submitted by the user.
Please utilize the comprehensive documentation to facilitate your understanding.
```

## Technologies

- **TypeScript** - Type-safe development
- **React 18** - UI framework
- **Vite** - Build tool and bundler
- **Figma Plugin API** - Access to Figma's design data
- **Compromise** - NLP for passive voice detection
- **text-readability** - Readability scoring (Flesch-Kincaid)
- **@tabler/icons-react** - UI icons

## Guidelines Reference

This plugin implements voice and tone guidelines from:
https://gist.github.com/mpaiva/e754fccb7596628ed84ea72cbe1b3d02

Key categories:
1. Plain Language (6th-8th grade reading level, active voice, simple words)
2. Text Foundations (capitalization, punctuation)
3. UI Element Guidelines (forms, buttons, navigation, errors)
4. Action Verb Standards (consistent terminology)
5. Accessibility & Inclusion (cognitive disabilities, WCAG compliance)

## Troubleshooting

### Plugin doesn't load
- Run `npm run build` first
- Check that `dist/code.js` and `dist/ui.html` exist
- Verify `manifest.json` is in the project root

### UI doesn't show text
- Ensure text layers or frames are selected
- Check browser console: **Plugins** → **Development** → **Open Console**

### Changes not appearing
- Rebuild: `npm run build`
- Close and reopen the plugin in Figma

### OpenAI features not working
- Configure API key in plugin settings (gear icon)
- Verify API key has credits

### OCR not working
- OCR requires OpenAI Vision API (same API key as AI analysis)
- Select a vision-capable model: `gpt-4o`, `gpt-4-turbo`, or `gpt-4-vision-preview`
- `gpt-3.5-turbo` does not support vision
