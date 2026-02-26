# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
```bash
npm run dev      # Start Vite in watch mode (auto-rebuilds on save)
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

After any code change in dev mode, reload the extension at `chrome://extensions/` by clicking the reload button on the GuideSnap card.

### Loading the Extension
1. Build the extension: `npm run build`
2. Open `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `dist/` folder

## Architecture Overview

### Extension Structure (Chrome Manifest V3)

This is a Chrome extension that records browser interactions and generates documentation. It uses **four separate contexts** that communicate via message passing:

1. **Background Service Worker** (`src/background/index.ts`)
   - Central state machine managing recording state (`idle` | `recording` | `paused`)
   - Orchestrates screenshot capture and annotation workflow
   - Handles all `chrome.runtime.onMessage` events from other contexts
   - Uses `chrome.alarms` (0.4 min interval) to keep service worker alive during recording
   - State persisted to `chrome.storage.local` for browser restart survival

2. **Content Script** (`src/content/index.ts`)
   - Injected into every webpage (`<all_urls>`, `document_idle`)
   - Captures user events (click, input, navigate, scroll) and sends to background
   - Manages the recording overlay UI (floating badge with step count, pause/stop buttons)
   - Uses **device pixel ratio** (`window.devicePixelRatio`) to convert CSS pixels to physical pixels for HiDPI/Retina displays
   - Implements semantic target resolution: walks up DOM tree (max 5 levels) to find meaningful elements (button, a, input, etc.) instead of raw click targets (e.g., span, div)

3. **Offscreen Document** (`src/offscreen/offscreen.ts` + HTML)
   - Provides Canvas API access for screenshot annotation (service workers lack Canvas)
   - Created on-demand via `chrome.offscreen.createDocument()` when recording starts
   - Receives raw screenshots + element bounds, returns annotated PNGs via message passing
   - Closed when recording stops to free resources

4. **React Popup UI** (`src/popup/`)
   - User-facing UI for starting/stopping recordings, editing steps, exporting guides
   - Components: `HomeView` (guide list), `StepEditor` (drag-to-reorder, edit descriptions), `ExportPanel` (PDF/HTML/DOCX/ZIP)

### Data Flow (Recording a Step)

1. User clicks on page → content script captures event
2. Content script sends `USER_EVENT` message to background
3. Background:
   - Sends `HIDE_OVERLAY` to content script
   - Waits 60ms for DOM paint cycle
   - Calls `chrome.tabs.captureVisibleTab()` to get raw screenshot
   - Sends `SHOW_OVERLAY` to content script (fire-and-forget)
   - Forwards raw screenshot + element bounds to offscreen document via `ANNOTATE_SCREENSHOT`
4. Offscreen document annotates screenshot (highlight box, numbered badge, click point)
5. Offscreen sends `ANNOTATION_DONE` with annotated PNG back to background
6. Background:
   - Creates `RecordedStep` object with both raw and annotated screenshots
   - Saves step to IndexedDB (`steps` object store)
   - Updates guide's `stepIds` array in `chrome.storage.local`
   - Increments step count and broadcasts `STATE_UPDATE` to all tabs + popup

### Storage Architecture

**IndexedDB** (`guidesnap` database):
- `steps` object store: stores full `RecordedStep` objects (includes base64 screenshots)
- Indexed by `guideId` for efficient retrieval
- Base64 screenshots stored directly in step records (no separate blob storage)

**chrome.storage.local**:
- `guidesnap_guides`: Guide metadata (id, title, createdAt, updatedAt, stepIds array)
- `guidesnap_state`: Recording state (recordingState, currentGuideId, currentGuideTitle, stepCount) for persistence across browser restarts

### Critical Timing Fix (Recording Start Lag)

The background service worker applies a performance optimization to eliminate recording lag:

1. Updates in-memory state **immediately** (zero cost)
2. Sends `UPDATE_OVERLAY` **directly** to sender tab (~1ms, bypasses async `chrome.tabs.query()`)
3. Broadcasts to popup + other tabs (fire-and-forget)
4. Responds to popup immediately
5. Persists to storage **asynchronously** (off critical path)
6. Pre-warms offscreen document in background

This ensures the content script attaches event listeners before the user's first interaction.

### Screenshot Annotation Pipeline

- **Content script** captures element bounding boxes in **viewport-relative CSS pixels**
- **Multiplies by `devicePixelRatio`** to convert to physical pixels (matches `captureVisibleTab` coordinate space)
- **Offscreen document** (`src/utils/annotation.ts`):
  - Loads raw screenshot into Canvas
  - Draws translucent orange overlay on entire screenshot
  - Draws opaque "cutout" of target element's bounding box
  - Adds numbered badge (step number) at top-left of element
  - Adds red crosshair dot at click point (if present)
  - Returns base64 PNG data URL

### Export Formats

All implemented in `src/utils/export.ts`:

- **PDF** (jsPDF): Landscape A4, one step per page, branded header, aspect-ratio-aware image scaling
- **HTML**: Self-contained single file, sticky sidebar navigation, embedded base64 images
- **DOCX** (docx library): Professional Word document, headings per step, page breaks between steps
- **ZIP** (JSZip): Contains `guide.json` (metadata), PNG images, and `README.html` viewer

## Key Patterns & Conventions

### Message Passing
- All messages typed in `src/shared/messages.ts` as discriminated unions
- Background is the **only message receiver** for cross-context communication
- Content script and popup send messages; background broadcasts state updates

### CSS Selector Generation
- `src/utils/selector.ts`: Generates unique CSS selectors for elements
- Prefers IDs, then semantic attributes (name, aria-label), then nth-child
- Used for element identification in step descriptions

### Overlay Implementation
- Uses **Shadow DOM** (`mode: 'closed'`) to isolate styles from host page
- Fixed position (bottom-right), highest z-index (2147483647)
- Hidden before screenshots via inline style (`visibility: hidden`) to prevent appearing in captures

### Password Field Protection
- Content script explicitly skips input events from `type="password"` fields (see `src/content/index.ts:139`)

## Build Configuration

- **Vite** with `@crxjs/vite-plugin` for Chrome extension hot-reload support
- **TypeScript 5.3** with strict mode
- **React 18** + **Tailwind CSS 3** for popup UI
- **Rollup** handles bundling with explicit `offscreen.html` entry point (see `vite.config.ts`)
- **PostCSS** + **Autoprefixer** for CSS processing

## Development Notes

- Service worker may restart during long recordings; state restoration in `restoreState()` ensures continuity
- Scroll events are debounced (500ms) and require 300px minimum delta to avoid noise
- Navigation events captured via both `popstate` and `hashchange` listeners
- The offscreen document is **not** created until first recording starts (lazy initialization)
- Content script uses **capture phase** (`addEventListener(..., true)`) for click/change events to intercept before page handlers
