# LexiQ – AI‑Powered XLQA System

LexiQ is an AI‑assisted eXperiential Linguistic Quality Assurance (XLQA) interface for translators, editors, and reviewers. It provides live bilingual alignment, grammar/spelling analysis, term validation, and workflow‑friendly UX designed for focus and speed.

![LexiQ Demo](docs/lexiq-demo.gif)

---

## Overview

- **Goal**: Faster, more precise translation QA with immediate feedback and multilingual support.
- **Core**: Source Editor + Term Validator share analysis context across panels.
- **AI**: Supabase Edge Functions power grammar/spelling checks and term analysis.
- **UX**: Waveform QA button with liquid fill, focus‑preserving editor, responsive panels.

---

## Key Features

- **Live Bilingual Alignment**
  - Language‑aware sentence splitting for Western and CJK scripts.
  - 1:1 positional matching; flags only extra segments (no false mismatches when counts align).
  - Implemented in `src/components/lexiq/EnhancedMainInterface.tsx` via `calculateContentDifferences()`.

- **Source Editor with Inline Analysis**
  - Grammar (purple wavy underline) and spelling (orange dotted underline).
  - Unmatched source spans: amber background + dashed underline.
  - Hover tooltips explaining issue type and significance (bilingual‑only).
  - File: `src/components/lexiq/SourceEditor.tsx`.

- **Term Validator (GTV/LQA)**
  - Contextual badges, icons, and classification ribbons.
  - Tooltip popovers with structured explanations and suggested actions.
  - File: `src/components/lexiq/EnhancedLiveAnalysisPanel.tsx`.

- **Waveform QA Button**
  - “Transparent basin” liquid fill animation; no background distractions.
  - Dual‑mask SVG text: black above wave, white in liquid; masks activate after 1% progress so text is always visible.
  - Files: `src/components/lexiq/WaveformQAButton.tsx`, `src/components/lexiq/WaveformSVG.tsx`.

- **Consistent, Responsive UI**
  - Standardized bottom bars across panels; Lucide icons; dark/light compatible.
  - `flex-wrap` patterns and `whitespace-nowrap` to prevent awkward wrapping.

- **Resilience**
  - Retry logic with exponential backoff for analysis calls.
  - Graceful degradation when the backend is unavailable.

---

## Architecture

```mermaid
flowchart LR
  A[User] --> B[Source Editor]
  A --> C[Term Validator]
  B <--> C
  B -->|content + flags| D[UI Renderers]
  C -->|terms + classifications| D
  D --> E[Supabase Edge Functions (analyze-translation)]
  E -->|analysis terms & rationale| D
  D --> F[Waveform QA Button]
  F -->|progress| D
```

- **Front‑end**: React + TypeScript, Tailwind, Lucide icons.
- **Backend (external)**: Supabase Edge Functions for analysis (grammar/spelling/terms).
- **State/Data**: Local component state; spans rendered with data indices for precise hover UX.

---

## Tech Stack

- React, TypeScript, Vite
- TailwindCSS, Radix UI (Tooltip/Tabs), Lucide React
- Supabase Functions (`supabase.functions.invoke`)

---

## Notable UI/UX Implementations

- **Waveform QA Button** (`src/components/lexiq/WaveformQAButton.tsx`)
  - True transparent basin (no gradients/shimmers).
  - Dual SVG masks: `wave-text-mask-above` (black above), `wave-text-mask-below` (white in liquid).
  - Masks enabled only when `progress > 0.01` to guarantee text visibility at start.

- **Source Editor Tooltips (Bilingual Only)** (`SourceEditor.tsx`)
  - Tooltip sections: type badge (Grammar=purple, Spelling=orange), issue text, significance, suggestions.
  - Hover persistence: tooltip stays when moving from text to tooltip.

- **Bottom Bar Standardization**
  - Containers: `flex flex-wrap items-center justify-between gap-3`.
  - Labels `text-xs`, badges `text-[10px]`, counts `text-[10px]`, `whitespace-nowrap` throughout.

- **Language‑Aware Matching**
  - CJK detection via `/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/`.
  - CJK terminators: `。！？`; Western: `.?!` with capital lookahead.

---

## Getting Started

### Requirements
- Node.js 18+
- Package manager: pnpm/yarn/npm
- Supabase project and Edge Function for analysis

### Install
```bash
pnpm install
# or
yarn
# or
npm install
```

### Environment
Create `.env` with your Supabase keys:
```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

### Run Dev
```bash
pnpm dev
# or
yarn dev
# or
npm run dev
```

### Build
```bash
pnpm build
# or
yarn build
# or
npm run build
```

---

## Supabase Edge Function

Invoked from `src/components/lexiq/SourceEditor.tsx`:
- Function: `analyze-translation`
- Payload:
  - `translationContent`, `glossaryContent`, `language`, `domain`
  - `sourceTextOnly`, `checkGrammar`, `checkSpelling`
- Behavior: retries with backoff on failure; graceful fallback to zero issues.

---

## Project Structure

```
src/
  components/lexiq/
    EnhancedMainInterface.tsx
    EnhancedLiveAnalysisPanel.tsx
    SourceEditor.tsx
    WaveformQAButton.tsx
    WaveformSVG.tsx
  hooks/
  providers/
  types/
  utils/
index.css
```

---

## Development Notes

- **Caret preservation** during re‑render.
- **Accessibility**: high‑contrast tooltips; focus retention.
- **Performance**: GPU‑accelerated masking; conditional rendering; debounced analysis.

---

## Contributing

Fork → feature branch → PR. Follow patterns in `SourceEditor.tsx`, `EnhancedLiveAnalysisPanel.tsx`, and `WaveformQAButton.tsx`.

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.
