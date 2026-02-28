# GuideSnap — Chrome Web Store Listing Copy

Paste each section into the corresponding field in the
[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## Name (max 45 characters)
```
GuideSnap - User Guide Recorder
```
*(32 characters)*

---

## Short Description (max 132 characters)
```
Record your browser actions and instantly generate annotated step-by-step guides in PDF, Word, HTML, or ZIP.
```
*(107 characters)*

---

## Detailed Description (max 16 000 characters)

```
GuideSnap turns any browser workflow into a professional step-by-step guide — automatically.

Just click "Add New", choose a guide type, give it a title, and start clicking. GuideSnap captures every action with annotated screenshots (highlighted element, step badge, click point) and generates a polished document you can share with your team.

──────────────────────────────────────
 KEY FEATURES
──────────────────────────────────────

▸ Three guide types
  • How to Tutorial — annotated screenshots with orange highlight box and step numbers
  • Employee Training Guide — same annotated flow, structured for onboarding
  • Capture Screens — clean screenshots with no annotations, for visual documentation

▸ Smart step capture
  • Clicks, form inputs, navigation, and scrolling are all captured automatically
  • Password fields are always skipped — your credentials are never recorded
  • Semantic target resolution finds the meaningful element (button, link, input) even when you click on a child icon or span

▸ Full editing suite
  • Drag-and-drop step reordering
  • Edit any step description inline
  • Delete steps you don't need
  • Add manual steps at any point

▸ Four export formats
  • PDF — landscape A4, branded header, one step per page
  • HTML — self-contained single file with sticky sidebar navigation
  • Word (DOCX) — professional document with headings and page breaks
  • ZIP — raw PNG screenshots + guide.json + README viewer

▸ 100% local — zero cloud
  • All data is stored in your browser (IndexedDB + chrome.storage)
  • No account required, no servers, no analytics, no tracking
  • Works completely offline

──────────────────────────────────────
 HOW TO USE
──────────────────────────────────────

1. Click the GuideSnap icon in your toolbar
2. Click "Add New" and choose a guide type
3. Enter a title and click Start
4. Click through your workflow on any web page
5. Return to the popup to stop recording
6. Review, reorder, and edit your steps
7. Export to PDF, Word, HTML, or ZIP

──────────────────────────────────────
 PRIVACY
──────────────────────────────────────

GuideSnap is privacy-first by design:
• All guide data stays in your browser — nothing is ever sent to a server
• No analytics, no crash reporting, no telemetry
• Password fields (type="password") are explicitly excluded from capture
• The recording overlay is hidden before each screenshot so it never appears in your guides

──────────────────────────────────────
 PERMISSIONS EXPLAINED
──────────────────────────────────────

• tabs / activeTab — required to capture a screenshot of the current tab when you click
• scripting — required to inject the recording overlay into web pages
• storage — required to save your guides and recording state locally in your browser
• offscreen — required to annotate screenshots using the Canvas API (service workers cannot access Canvas directly)
• alarms — required to keep the background service worker alive during long recordings
• Access to all sites — required so you can record on any website you visit

──────────────────────────────────────
 SUPPORT
──────────────────────────────────────

Found a bug or have a feature request? Open an issue on GitHub:
https://github.com/MustafaAhmed89/GuideSnapExt
```

---

## Category
```
Productivity
```

---

## Language
```
English
```

---

## Screenshots to capture (1 required, 3–5 recommended)
Screenshots must be **1280×800 px** or **640×400 px**, PNG or JPEG.

| # | What to show | How to capture |
|---|---|---|
| 1 | The popup with a guide list showing 2–3 saved guides | Open popup after recording a couple of guides |
| 2 | The type selector (3 cards: How to Tutorial, Employee Training, Capture Screens) | Click "Add New" and screenshot the popup |
| 3 | The Step Editor with annotated screenshots visible | Open a completed guide and screenshot the editor |
| 4 | An exported PDF open in a browser tab | Export a guide as PDF and screenshot the result |
| 5 | The recording overlay on a real website (the badge showing "3 steps") | Start a recording on any page and screenshot it |

---

## Promotional Images (optional but recommended)
- **Small promo tile:** 440×280 px — use the 128px icon centered on a brand-colored background (#6366f1)
- **Large promo tile:** 920×680 px — same style with tagline "Turn clicks into guides. Automatically."
- **Marquee promo:** 1400×560 px — for featured placement (only needed if applying for featuring)
