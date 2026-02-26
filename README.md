# GuideSnap – User Guide Recorder

> A Chrome extension that automatically records your browser actions and generates professional step-by-step user guides, exported as PDF, HTML, DOCX, or ZIP.

---

## Features

- **Automatic Step Capture** – Records clicks, form inputs, page navigations, and scrolls as you work
- **Annotated Screenshots** – Each step is paired with a screenshot that highlights the target element, adds a numbered badge, and marks click points
- **Live Recording Overlay** – A floating badge on every page shows your step count and lets you pause or stop without opening the popup
- **Guide Editor** – Edit descriptions, delete steps, or drag-and-drop to reorder before exporting
- **Multi-Format Export**
  - **PDF** – Landscape layout with cover page, branded header, and one step per page
  - **HTML** – Self-contained file with a sticky sidebar for easy navigation
  - **DOCX** – Professional Word document with headings, images, and page breaks
  - **ZIP** – Portable archive with raw JSON metadata, PNG screenshots, and an HTML viewer
- **Persistent Sessions** – Recording state survives browser restarts; resume where you left off
- **Privacy First** – All data stays in your browser (IndexedDB + chrome.storage). No external requests, no analytics. Password fields are never captured.

---

## Tech Stack

| Category | Technology |
|---|---|
| Language | TypeScript 5.3 |
| UI | React 18 + Tailwind CSS 3 |
| Build | Vite 5 + @crxjs/vite-plugin |
| Export | jsPDF · docx · jszip |
| Storage | IndexedDB + chrome.storage.local |
| Icons | lucide-react |

---

## Installation

### From Source

**Prerequisites:** Node.js 18+ and npm

```bash
# Clone the repository
git clone https://github.com/MustafaAhmed89/guidesnap.git
cd guidesnap

# Install dependencies
npm install

# Build the extension
npm run build
```

**Load in Chrome:**

1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder

The GuideSnap icon will appear in your toolbar.

---

## Development

```bash
npm run dev     # Start Vite in watch mode (auto-rebuilds on save)
npm run build   # Production build to dist/
```

After any code change in dev mode, go to `chrome://extensions/` and click the **reload** button on the GuideSnap card.

---

## How to Use

### Record a Guide

1. Click the **GuideSnap** icon in the toolbar
2. Enter a title for your guide and click **Start Recording**
3. Perform the steps on any webpage – every click, input, and navigation is captured automatically
4. Use the floating overlay badge to **Pause** or **Stop** recording at any time

### Edit Steps

1. Open the popup and select your guide
2. Click **Edit** to enter the step editor
3. Update descriptions, delete unwanted steps, or drag to reorder
4. Click **Done** when finished

### Export

1. Click **Export** on any saved guide
2. Choose a format: **PDF**, **HTML**, **DOCX**, or **ZIP**
3. The file is downloaded automatically to your default downloads folder

---

## Project Structure

```
src/
├── background/       # Service worker – recording state machine & screenshot capture
├── content/          # Content script – event capture & recording overlay UI
├── offscreen/        # Offscreen document – Canvas-based screenshot annotation
├── popup/            # React popup UI (HomeView, StepEditor, ExportPanel)
├── shared/           # Types, messages, and storage helpers
└── utils/            # Annotation, export, and CSS selector utilities
icons/                # Extension icons (16, 48, 128 px)
manifest.json         # Chrome Manifest V3
vite.config.ts        # Build configuration
```

---

## Permissions

| Permission | Reason |
|---|---|
| `tabs` | Identify the active tab during recording |
| `activeTab` | Access the current tab to inject content scripts |
| `scripting` | Inject the recording overlay and event listeners |
| `storage` | Persist guide metadata and recording state |
| `offscreen` | Run Canvas annotation in an offscreen document |
| `alarms` | Keep the service worker alive during long recordings |
| `<all_urls>` | Capture steps on any website |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT © 2025 GuideSnap
