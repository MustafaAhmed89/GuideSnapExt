import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import type { Guide, RecordedStep } from '../shared/types';

export interface ExportOptions {
  includeDescriptions: boolean;
  useAnnotated: boolean;
}

// ── Helpers (defined early so they can be used by all exporters) ─────────────

/** Decode the natural pixel dimensions of a data URL without rendering it. */
function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1920, h: 1080 }); // sensible fallback
    img.src = dataUrl;
  });
}

// ── PDF ──────────────────────────────────────────────────────────────────────

export async function exportToPDF(
  guide: Guide,
  steps: RecordedStep[],
  options: ExportOptions
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;

  // Cover page
  doc.setFillColor(255, 107, 53);
  doc.rect(0, 0, pageW, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GuideSnap', margin, 13);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(22);
  doc.text(guide.title, margin, 50);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Created: ${new Date(guide.createdAt).toLocaleDateString()} · ${steps.length} steps`,
    margin,
    60
  );

  // Step pages
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    doc.addPage();

    // Header strip
    doc.setFillColor(255, 107, 53);
    doc.rect(0, 0, pageW, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Step ${i + 1} of ${steps.length}`, margin, 8);
    doc.text(guide.title, pageW / 2, 8, { align: 'center' });

    // Screenshot — placed with correct aspect ratio so it is never stretched
    const imgData = options.useAnnotated ? step.screenshotAnnotated : step.screenshotRaw;
    if (imgData) {
      const areaW = contentW;
      const areaH = options.includeDescriptions ? pageH - 50 : pageH - 20;
      try {
        const { w: naturalW, h: naturalH } = await getImageDimensions(imgData);
        const imgAspect = naturalW / naturalH;
        const areaAspect = areaW / areaH;

        let displayW: number, displayH: number;
        if (imgAspect > areaAspect) {
          // Image is wider relative to its height — constrain by width
          displayW = areaW;
          displayH = areaW / imgAspect;
        } else {
          // Image is taller relative to its width — constrain by height
          displayH = areaH;
          displayW = areaH * imgAspect;
        }

        // Centre horizontally within the content area
        const imgX = margin + (areaW - displayW) / 2;
        doc.addImage(imgData, 'PNG', imgX, 16, displayW, displayH, undefined, 'FAST');
      } catch {
        // skip broken image
      }
    }

    // Description
    if (options.includeDescriptions && step.description) {
      const descY = pageH - 26;
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, descY - 4, pageW - margin, descY - 4);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(step.description, contentW);
      doc.text(lines.slice(0, 2), margin, descY);
    }
  }

  doc.save(`${sanitizeFilename(guide.title)}.pdf`);
}

// ── HTML ─────────────────────────────────────────────────────────────────────

export function exportToHTML(
  guide: Guide,
  steps: RecordedStep[],
  options: ExportOptions
): void {
  const stepsHTML = steps
    .map(
      (step, i) => `
    <section class="step" id="step-${i + 1}">
      <div class="step-header">
        <span class="step-num">${i + 1}</span>
        ${options.includeDescriptions ? `<p class="step-desc">${escapeHtml(step.description)}</p>` : ''}
      </div>
      <img class="step-img" src="${options.useAnnotated ? step.screenshotAnnotated : step.screenshotRaw}" alt="Step ${i + 1}" loading="lazy" />
      <div class="step-meta">${escapeHtml(step.pageTitle)} — ${escapeHtml(step.pageUrl)}</div>
    </section>`
    )
    .join('\n');

  const sidebarLinks = steps
    .map((_, i) => `<a href="#step-${i + 1}" class="nav-link">Step ${i + 1}</a>`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(guide.title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; min-height: 100vh; background: #f8f8f8; color: #1a1a1a; }
  .sidebar { width: 220px; flex-shrink: 0; background: #1e1e2e; color: #e0e0e0; padding: 24px 0; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .sidebar h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #FF6B35; padding: 0 20px 16px; }
  .nav-link { display: block; padding: 8px 20px; color: #ccc; text-decoration: none; font-size: 13px; border-left: 3px solid transparent; transition: all .15s; }
  .nav-link:hover { background: rgba(255,107,53,.1); color: #fff; border-left-color: #FF6B35; }
  .main { flex: 1; padding: 40px; max-width: 960px; }
  .guide-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
  .guide-meta { font-size: 13px; color: #888; margin-bottom: 40px; }
  .step { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.08); margin-bottom: 32px; overflow: hidden; }
  .step-header { display: flex; align-items: flex-start; gap: 14px; padding: 20px 24px 16px; }
  .step-num { background: #FF6B35; color: #fff; font-size: 13px; font-weight: 700; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .step-desc { font-size: 15px; line-height: 1.5; padding-top: 4px; }
  .step-img { width: 100%; display: block; border-top: 1px solid #f0f0f0; }
  .step-meta { font-size: 11px; color: #aaa; padding: 10px 24px; border-top: 1px solid #f0f0f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
</head>
<body>
<nav class="sidebar">
  <h2>${escapeHtml(guide.title)}</h2>
  ${sidebarLinks}
</nav>
<main class="main">
  <h1 class="guide-title">${escapeHtml(guide.title)}</h1>
  <p class="guide-meta">Created ${new Date(guide.createdAt).toLocaleDateString()} &middot; ${steps.length} steps &middot; Generated by GuideSnap</p>
  ${stepsHTML}
</main>
</body>
</html>`;

  downloadBlob(html, `${sanitizeFilename(guide.title)}.html`, 'text/html');
}

// ── ZIP ──────────────────────────────────────────────────────────────────────

export async function exportToZIP(
  guide: Guide,
  steps: RecordedStep[]
): Promise<void> {
  const zip = new JSZip();

  // guide.json
  zip.file(
    'guide.json',
    JSON.stringify(
      {
        id: guide.id,
        title: guide.title,
        createdAt: new Date(guide.createdAt).toISOString(),
        steps: steps.map((s, i) => ({
          step: i + 1,
          description: s.description,
          pageTitle: s.pageTitle,
          pageUrl: s.pageUrl,
          eventType: s.eventType,
          image: `step-${String(i + 1).padStart(2, '0')}.png`,
        })),
      },
      null,
      2
    )
  );

  // images
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const dataUrl = step.screenshotAnnotated || step.screenshotRaw;
    if (dataUrl) {
      const base64 = dataUrl.split(',')[1];
      zip.file(`step-${String(i + 1).padStart(2, '0')}.png`, base64, { base64: true });
    }
  }

  // Simple README viewer
  const readmeLinks = steps
    .map((s, i) => `<li><a href="step-${String(i + 1).padStart(2, '0')}.png">Step ${i + 1}</a>: ${escapeHtml(s.description)}</li>`)
    .join('\n');
  zip.file(
    'README.html',
    `<!DOCTYPE html><html><head><title>${escapeHtml(guide.title)}</title></head><body><h1>${escapeHtml(guide.title)}</h1><ol>${readmeLinks}</ol></body></html>`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${sanitizeFilename(guide.title)}.zip`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '_') || 'guide';
}
