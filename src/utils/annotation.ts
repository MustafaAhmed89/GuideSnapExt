import type { AnnotatePayload } from '../shared/types';

const BRAND = '#FF6B35';
const BRAND_ALPHA = 'rgba(255, 107, 53, 0.18)';
const BADGE_BG = '#FF6B35';
const BADGE_TEXT = '#ffffff';
const CLICK_DOT = 'rgba(255, 107, 53, 0.7)';

/**
 * Annotates a raw screenshot (base64 data URL) and returns an annotated one.
 * Runs inside the offscreen document where Image + Canvas are available.
 */
export function annotateScreenshot(payload: AnnotatePayload): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No 2d context'));

      // Draw base screenshot
      ctx.drawImage(img, 0, 0);

      const { element, clickPoint, stepNumber } = payload;

      if (element) {
        const { x, y, width, height } = element.boundingBox;

        // Semi-transparent fill
        ctx.fillStyle = BRAND_ALPHA;
        roundRect(ctx, x, y, width, height, 6);
        ctx.fill();

        // Stroke
        ctx.strokeStyle = BRAND;
        ctx.lineWidth = 3;
        roundRect(ctx, x, y, width, height, 6);
        ctx.stroke();

        // Step number badge — top-left corner of element
        drawBadge(ctx, x, y, stepNumber);
      }

      if (clickPoint) {
        // Ripple dot at click position
        ctx.fillStyle = CLICK_DOT;
        ctx.beginPath();
        ctx.arc(clickPoint.x, clickPoint.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = BRAND;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(clickPoint.x, clickPoint.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      resolve(canvas.toDataURL('image/png', 0.92));
    };
    img.onerror = () => reject(new Error('Failed to load screenshot image'));
    img.src = payload.screenshotRaw;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  step: number
) {
  const radius = 14;
  const cx = x + radius;
  const cy = y - radius;

  // Ensure badge is within canvas
  const safeCx = Math.max(cx, radius + 2);
  const safeCy = Math.max(cy, radius + 2);

  ctx.fillStyle = BADGE_BG;
  ctx.beginPath();
  ctx.arc(safeCx, safeCy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = BADGE_TEXT;
  ctx.font = `bold ${radius}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(step), safeCx, safeCy);
}
