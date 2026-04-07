import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, PageBreak, AlignmentType, BorderStyle, Footer, Header } from 'docx';
import type { Guide, RecordedStep } from '../shared/types';

export interface ExportOptions {
  includeDescriptions: boolean;
  includeStepNumbers: boolean;
  useAnnotated: boolean;
  includeUrls: boolean;
  headerImage?: string; // base64 data URL — used in PDF and DOCX headers
  footerText?: string;  // plain text — used in PDF and DOCX footers
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

/** Convert a base64 data URL to a Uint8Array for the docx ImageRun. */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
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

  // Cover page - professional centered design
  const centerX = pageW / 2;
  const centerY = pageH / 2;

  // Top brand bar
  doc.setFillColor(255, 107, 53);
  doc.rect(0, 0, pageW, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');

  // If a header image is provided, place it left-aligned in the brand bar; otherwise show app name
  if (options.headerImage) {
    try {
      const { w: iw, h: ih } = await getImageDimensions(options.headerImage);
      const logoH = 18;
      const logoW = iw * (logoH / ih);
      doc.addImage(options.headerImage, margin, 3.5, logoW, logoH, undefined, 'FAST');
    } catch {
      doc.text('GuideSnap', centerX, 16, { align: 'center' });
    }
  } else {
    doc.text('GuideSnap', centerX, 16, { align: 'center' });
  }

  // Main title - centered and prominent
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(guide.title, pageW - margin * 4);
  doc.text(titleLines, centerX, centerY - 10, { align: 'center' });

  // Subtitle
  const pdfSubtitle = guide.type === 'employee-training'
    ? 'Training & Implementation Guide'
    : 'Step-by-Step User Guide';
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(pdfSubtitle, centerX, centerY + 15, { align: 'center' });

  // Decorative line
  doc.setDrawColor(255, 107, 53);
  doc.setLineWidth(0.5);
  doc.line(centerX - 30, centerY + 25, centerX + 30, centerY + 25);

  // Learning objectives block (employee-training only)
  if (guide.type === 'employee-training' && guide.learningObjectives) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Learning Objectives', centerX, centerY + 36, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 90);
    const objLines = doc.splitTextToSize(guide.learningObjectives, pageW - margin * 8);
    doc.text(objLines.slice(0, 3), centerX, centerY + 43, { align: 'center' });
  }

  // Metadata - centered at bottom
  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  const dateStr = new Date(guide.createdAt).toLocaleDateString();
  doc.text(`Created: ${dateStr}`, centerX, pageH - 40, { align: 'center' });
  doc.text(`${steps.length} step${steps.length !== 1 ? 's' : ''}`, centerX, pageH - 32, { align: 'center' });

  // Step pages
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    doc.addPage();

    // Header bar — logo (left) + guide title (centre); step number moves below
    {
      const hasHeaderImg = !!options.headerImage;
      if (options.includeStepNumbers || hasHeaderImg) {
        doc.setFillColor(255, 107, 53);
        doc.rect(0, 0, pageW, 12, 'F');
      }
      if (hasHeaderImg) {
        try {
          const { w: iw, h: ih } = await getImageDimensions(options.headerImage!);
          const logoH = 8;
          const logoW = iw * (logoH / ih);
          doc.addImage(options.headerImage!, margin, 2, logoW, logoH, undefined, 'FAST');
        } catch { /* skip */ }
      }
      // Guide title centred in bar (contextual, always shown when bar is visible)
      if (options.includeStepNumbers || hasHeaderImg) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(guide.title, pageW / 2, 8, { align: 'center' });
      }
    }

    // Step label — rendered below the header bar, NOT inside it
    if (options.includeStepNumbers) {
      doc.setTextColor(255, 107, 53);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Step ${i + 1} of ${steps.length}`, margin, 20);
    }

    // Screenshot — placed with correct aspect ratio so it is never stretched
    const imgData = options.useAnnotated ? step.screenshotAnnotated : step.screenshotRaw;
    if (imgData) {
      const areaW = contentW;
      const hasHeader = options.includeStepNumbers || !!options.headerImage;
      const hasFooter = options.includeDescriptions || !!options.footerText;
      // imgTop pushed to 24 to clear both the header bar (12mm) and step label (20mm)
      const imgTop = hasHeader ? 24 : margin;
      const footerReserve = hasFooter ? 36 : margin;
      const areaH = pageH - imgTop - footerReserve;
      try {
        const { w: naturalW, h: naturalH } = await getImageDimensions(imgData);
        const imgAspect = naturalW / naturalH;
        const areaAspect = areaW / areaH;

        let displayW: number, displayH: number;
        if (imgAspect > areaAspect) {
          displayW = areaW;
          displayH = areaW / imgAspect;
        } else {
          displayH = areaH;
          displayW = areaH * imgAspect;
        }

        const imgX = margin + (areaW - displayW) / 2;
        doc.addImage(imgData, 'PNG', imgX, imgTop, displayW, displayH, undefined, 'FAST');
      } catch {
        // skip broken image
      }
    }

    // Footer area — separator line, then description and footer text on separate rows
    const hasDesc = options.includeDescriptions && !!step.description;
    const hasFooterText = !!options.footerText;
    if (hasDesc || hasFooterText) {
      // Separator
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, pageH - 34, pageW - margin, pageH - 34);

      // Row 1: step description (left-aligned)
      if (hasDesc) {
        doc.setTextColor(30, 30, 30);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(step.description!, contentW * 0.75);
        doc.text(lines.slice(0, 2), margin, pageH - 26);
      }

      // Row 2: footer text (right-aligned, own line — no collision with description)
      if (hasFooterText) {
        doc.setTextColor(140, 140, 140);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(options.footerText!, pageW - margin, pageH - 10, { align: 'right' });
      }
    }

    // Type-specific callout box at bottom of step page
    if (guide.type === 'how-to-tutorial' && step.tip) {
      const boxY = pageH - 11;
      doc.setFillColor(255, 247, 237);
      doc.roundedRect(margin, boxY - 5, contentW * 0.65, 9, 1.5, 1.5, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(194, 65, 12);
      doc.text('TIP', margin + 3, boxY + 1.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(124, 45, 18);
      const tipLine = doc.splitTextToSize(step.tip, contentW * 0.55)[0];
      doc.text(tipLine, margin + 14, boxY + 1.5);
    }

    if (guide.type === 'employee-training' && step.whyItMatters) {
      const boxY = pageH - 11;
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(margin, boxY - 5, contentW * 0.75, 9, 1.5, 1.5, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(29, 78, 216);
      doc.text('WHY THIS MATTERS', margin + 3, boxY + 1.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 58, 138);
      const whyLine = doc.splitTextToSize(step.whyItMatters, contentW * 0.5)[0];
      doc.text(whyLine, margin + 46, boxY + 1.5);
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
  const isTraining = guide.type === 'employee-training';
  const guideSubtitle = isTraining ? 'Training &amp; Implementation Guide' : 'Step-by-Step User Guide';

  const objectivesHTML = isTraining && guide.learningObjectives
    ? `<div class="objectives-box">
        <p class="objectives-title">Learning Objectives</p>
        <p class="objectives-body">${escapeHtml(guide.learningObjectives)}</p>
      </div>`
    : '';

  const stepsHTML = steps
    .map(
      (step, i) => `
    <section class="step" id="step-${i + 1}">
      ${options.includeStepNumbers || options.includeDescriptions
        ? `<div class="step-header">${options.includeStepNumbers ? `<span class="step-num">${i + 1}</span>` : ''}${options.includeDescriptions && step.description ? `<p class="step-desc">${escapeHtml(step.description)}</p>` : ''}</div>`
        : ''
      }
      <img class="step-img" src="${options.useAnnotated ? step.screenshotAnnotated : step.screenshotRaw}" alt="Step ${i + 1}" loading="lazy" />
      ${options.includeUrls ? `<div class="step-meta">${escapeHtml(step.pageTitle)} — ${escapeHtml(step.pageUrl)}</div>` : ''}
      ${guide.type === 'how-to-tutorial' && step.tip ? `<div class="step-tip"><strong>Tip:</strong> ${escapeHtml(step.tip)}</div>` : ''}
      ${guide.type === 'employee-training' && step.whyItMatters ? `<div class="step-why"><strong>Why this matters:</strong> ${escapeHtml(step.whyItMatters)}</div>` : ''}
    </section>`
    )
    .join('\n');

  const sidebarLinks = steps
    .map((_, i) => `<a href="#step-${i + 1}" class="nav-link">${options.includeStepNumbers ? `Step ${i + 1}` : `${i + 1}`}</a>`)
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
  .cover { background: linear-gradient(135deg, #FF6B35 0%, #ff8555 100%); border-radius: 16px; padding: 60px 40px; text-align: center; margin-bottom: 48px; box-shadow: 0 8px 24px rgba(255,107,53,.25); }
  .cover-brand { font-size: 16px; font-weight: 700; color: rgba(255,255,255,.9); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px; }
  .guide-title { font-size: 36px; font-weight: 700; margin-bottom: 16px; color: #fff; line-height: 1.2; }
  .guide-subtitle { font-size: 18px; color: rgba(255,255,255,.85); margin-bottom: 32px; font-style: italic; }
  .guide-divider { width: 80px; height: 2px; background: rgba(255,255,255,.5); margin: 0 auto 32px; }
  .guide-meta { font-size: 14px; color: rgba(255,255,255,.8); }
  .objectives-box { background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px 24px; margin-bottom: 32px; }
  .objectives-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #2563eb; margin-bottom: 8px; }
  .objectives-body { font-size: 14px; color: #1e3a8a; line-height: 1.6; }
  .step { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.08); margin-bottom: 32px; overflow: hidden; }
  .step-header { display: flex; align-items: flex-start; gap: 14px; padding: 20px 24px 16px; }
  .step-num { background: #FF6B35; color: #fff; font-size: 13px; font-weight: 700; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .step-desc { font-size: 15px; line-height: 1.5; padding-top: 4px; }
  .step-img { width: 100%; display: block; border-top: 1px solid #f0f0f0; }
  .step-meta { font-size: 11px; color: #aaa; padding: 10px 24px; border-top: 1px solid #f0f0f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .step-tip { background: #fff7ed; border-left: 3px solid #f97316; padding: 10px 16px; font-size: 13px; color: #9a3412; }
  .step-why { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 10px 16px; font-size: 13px; color: #1e40af; }

</style>
</head>
<body>
<nav class="sidebar">
  <h2>${escapeHtml(guide.title)}</h2>
  ${sidebarLinks}
</nav>
<main class="main">
  <div class="cover">
    <div class="cover-brand">GuideSnap</div>
    <h1 class="guide-title">${escapeHtml(guide.title)}</h1>
    <p class="guide-subtitle">${guideSubtitle}</p>
    <div class="guide-divider"></div>
    <p class="guide-meta">Created ${new Date(guide.createdAt).toLocaleDateString()} &middot; ${steps.length} step${steps.length !== 1 ? 's' : ''}</p>
  </div>
  ${objectivesHTML}
  ${stepsHTML}
</main>
</body>
</html>`;

  downloadBlob(html, `${sanitizeFilename(guide.title)}.html`, 'text/html');
}

// ── ZIP ──────────────────────────────────────────────────────────────────────

export async function exportToZIP(
  guide: Guide,
  steps: RecordedStep[],
  options: ExportOptions
): Promise<void> {
  const zip = new JSZip();

  // guide.json
  zip.file(
    'guide.json',
    JSON.stringify(
      {
        id: guide.id,
        title: guide.title,
        type: guide.type ?? 'how-to-tutorial',
        createdAt: new Date(guide.createdAt).toISOString(),
        updatedAt: new Date(guide.updatedAt).toISOString(),
        ...(guide.learningObjectives ? { learningObjectives: guide.learningObjectives } : {}),
        steps: steps.map((s, i) => ({
          step: i + 1,
          description: s.description,
          pageTitle: s.pageTitle,
          pageUrl: s.pageUrl,
          eventType: s.eventType,
          image: `step-${String(i + 1).padStart(2, '0')}.png`,
          ...(s.tip ? { tip: s.tip } : {}),
          ...(s.whyItMatters ? { whyItMatters: s.whyItMatters } : {}),
        })),
      },
      null,
      2
    )
  );

  // images
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const dataUrl = options.useAnnotated ? step.screenshotAnnotated : step.screenshotRaw;
    if (dataUrl) {
      const base64 = dataUrl.split(',')[1];
      zip.file(`step-${String(i + 1).padStart(2, '0')}.png`, base64, { base64: true });
    }
  }

  // README viewer
  const isTraining = guide.type === 'employee-training';
  const readmeSteps = steps.map((s, i) => {
    const img = `step-${String(i + 1).padStart(2, '0')}.png`;
    const extra = isTraining && s.whyItMatters
      ? `<p style="margin:6px 0 0;font-size:13px;color:#1e40af;background:#eff6ff;border-left:3px solid #3b82f6;padding:6px 10px"><strong>Why this matters:</strong> ${escapeHtml(s.whyItMatters)}</p>`
      : !isTraining && s.tip
        ? `<p style="margin:6px 0 0;font-size:13px;color:#9a3412;background:#fff7ed;border-left:3px solid #f97316;padding:6px 10px"><strong>Tip:</strong> ${escapeHtml(s.tip)}</p>`
        : '';
    return `<li style="margin-bottom:32px">
      <p style="font-weight:600;margin:0 0 8px">${options.includeStepNumbers ? `Step ${i + 1}: ` : ''}${escapeHtml(s.description)}</p>
      <img src="${img}" style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb" />
      ${extra}
    </li>`;
  }).join('\n');

  const objectivesBlock = isTraining && guide.learningObjectives
    ? `<div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;padding:16px 20px;margin-bottom:28px"><p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#2563eb;margin:0 0 6px">Learning Objectives</p><p style="font-size:14px;color:#1e3a8a;margin:0">${escapeHtml(guide.learningObjectives)}</p></div>`
    : '';

  zip.file(
    'README.html',
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(guide.title)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#1a1a1a;background:#f8f8f8}
  h1{font-size:28px;margin-bottom:4px}
  .subtitle{font-size:14px;color:#6b7280;margin-bottom:28px}
  ol{padding-left:24px}
</style>
</head>
<body>
  <h1>${escapeHtml(guide.title)}</h1>
  <p class="subtitle">${isTraining ? 'Training &amp; Implementation Guide' : 'Step-by-Step User Guide'} &middot; ${steps.length} step${steps.length !== 1 ? 's' : ''}</p>
  ${objectivesBlock}
  <ol>${readmeSteps}</ol>
</body>
</html>`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${sanitizeFilename(guide.title)}.zip`);
}

// ── DOCX ─────────────────────────────────────────────────────────────────────

export async function exportToDOCX(
  guide: Guide,
  steps: RecordedStep[],
  options: ExportOptions
): Promise<void> {
  const MAX_W = 600; // px — fits A4 portrait content width (~6.27 in at 96 DPI)
  const MAX_H = 720; // px — generous height budget per step page

  const children: Paragraph[] = [];

  // Cover page: optional header image or brand name
  if (options.headerImage) {
    try {
      const { w: iw, h: ih } = await getImageDimensions(options.headerImage);
      const maxLogoW = 200;
      const logoW = Math.min(iw, maxLogoW);
      const logoH = Math.round(ih * (logoW / iw));
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: dataUrlToUint8Array(options.headerImage),
              transformation: { width: logoW, height: logoH },
              type: 'png',
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 1200, after: 600 },
        })
      );
    } catch {
      // fall through to brand name
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'GuideSnap', bold: true, size: 32, color: 'FF6B35' })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 2000, after: 800 },
        })
      );
    }
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'GuideSnap', bold: true, size: 32, color: 'FF6B35' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000, after: 800 },
      })
    );
  }

  // Cover page: rest of professional centered design
  children.push(
    // Main title - large and centered
    new Paragraph({
      text: guide.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
    }),
    // Subtitle
    new Paragraph({
      children: [
        new TextRun({
          text: 'Step-by-Step User Guide',
          size: 28,
          color: '666666',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 },
    }),
    // Decorative separator
    new Paragraph({
      children: [
        new TextRun({
          text: '───────────',
          color: 'FF6B35',
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 },
    }),
    // Metadata
    new Paragraph({
      children: [
        new TextRun({
          text: `Created: ${new Date(guide.createdAt).toLocaleDateString()}`,
          color: '888888',
          size: 22,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${steps.length} step${steps.length !== 1 ? 's' : ''}`,
          color: '888888',
          size: 22,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generated by GuideSnap',
          color: 'AAAAAA',
          size: 18,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Step heading (skipped when step numbering is off)
    if (options.includeStepNumbers) {
      children.push(
        new Paragraph({
          text: `Step ${i + 1} of ${steps.length}`,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 120 },
          keepNext: true,
        })
      );
    }

    // Description
    if (options.includeDescriptions && step.description) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: step.description, size: 24 })],
          spacing: { after: 120 },
          keepNext: true,
        })
      );
    }

    // Page URL / title metadata
    if (options.includeUrls) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${step.pageTitle} — ${step.pageUrl}`,
              color: 'AAAAAA',
              size: 16,
              italics: true,
            }),
          ],
          spacing: { after: 120 },
          keepNext: true,
        })
      );
    }

    // Screenshot image
    const imgData = options.useAnnotated ? step.screenshotAnnotated : step.screenshotRaw;
    if (imgData) {
      try {
        const { w: nw, h: nh } = await getImageDimensions(imgData);
        let dw = Math.min(nw, MAX_W);
        let dh = nh * (dw / nw);
        if (dh > MAX_H) {
          dh = MAX_H;
          dw = nw * (dh / nh);
        }

        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: dataUrlToUint8Array(imgData),
                transformation: { width: Math.round(dw), height: Math.round(dh) },
                type: 'png',
              }),
            ],
            spacing: { after: 200 },
          })
        );
      } catch {
        // skip broken image
      }
    }

    // Horizontal divider between steps (not after the last one)
    if (i < steps.length - 1) {
      children.push(
        new Paragraph({
          spacing: { before: 240, after: 240 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E0E0E0', space: 1 },
          },
        })
      );
    }
  }

  // Build optional DOCX header (logo image)
  let docxHeader: Header | undefined;
  if (options.headerImage) {
    try {
      const { w: iw, h: ih } = await getImageDimensions(options.headerImage);
      const maxLogoW = 160;
      const logoW = Math.min(iw, maxLogoW);
      const logoH = Math.round(ih * (logoW / iw));
      docxHeader = new Header({
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: dataUrlToUint8Array(options.headerImage),
                transformation: { width: logoW, height: logoH },
                type: 'png',
              }),
            ],
          }),
        ],
      });
    } catch { /* skip */ }
  }

  // Build optional DOCX footer (plain text)
  let docxFooter: Footer | undefined;
  if (options.footerText) {
    docxFooter = new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: options.footerText,
              color: '888888',
              size: 18,
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    });
  }

  const doc = new Document({
    creator: 'GuideSnap',
    title: guide.title,
    sections: [
      {
        properties: {},
        headers: docxHeader ? { default: docxHeader } : undefined,
        footers: docxFooter ? { default: docxFooter } : undefined,
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${sanitizeFilename(guide.title)}.docx`);
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
