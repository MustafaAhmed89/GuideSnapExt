import { generateCSSSelector } from '../utils/selector';
import { createOverlay, updateOverlay, removeOverlay, hideOverlay, showOverlay } from './overlay';
import type { UserEventPayload, ElementInfo } from '../shared/types';

// ── Prevent duplicate initialization ─────────────────────────────────────────
// If content script is injected multiple times (manifest + programmatic),
// only initialize once per page load
if ((window as any).__guidesnap_initialized__) {
  throw new Error('GuideSnap content script already initialized');
}
(window as any).__guidesnap_initialized__ = true;

let isRecording = false;
let isPaused = false;
let scrollTimer: ReturnType<typeof setTimeout> | null = null;
let lastScrollY = window.scrollY;
const SCROLL_THRESHOLD = 300;

// Device pixel ratio: captureVisibleTab() returns physical pixels; CSS APIs return
// CSS pixels. Multiply all coordinates by dpr so annotations land in the right spot
// on both standard (1×) and HiDPI/Retina (2×+) displays.
const dpr = window.devicePixelRatio || 1;

console.log('[GuideSnap] Content script initialized');

// ── Bootstrap: ask background for current state ───────────────────────────────

chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
  console.log('[GuideSnap] Initial state:', response);
  if (response?.state === 'recording') {
    isRecording = true;
    isPaused = false;
    createOverlay();
    updateOverlay(response.stepCount, 'recording');
    attachListeners();
  } else if (response?.state === 'paused') {
    isRecording = true;
    isPaused = true;
    createOverlay();
    updateOverlay(response.stepCount, 'paused');
  }
});

// ── Listen for commands from background ──────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[GuideSnap] Content script received message:', message);

  if (message.type === 'UPDATE_OVERLAY') {
    const { stepCount, state } = message.payload;

    if (state === 'idle') {
      isRecording = false;
      isPaused = false;
      detachListeners();
      removeOverlay();
      return;
    }

    if (state === 'recording' && !isRecording) {
      console.log('[GuideSnap] Starting recording, attaching listeners');
      isRecording = true;
      isPaused = false;
      createOverlay();
      attachListeners();
    } else if (state === 'paused') {
      isPaused = true;
    } else if (state === 'recording' && isPaused) {
      isPaused = false;
    }

    updateOverlay(stepCount, state);
    sendResponse({ ok: true });
  }

  // Hide the overlay bar so it doesn't appear in screenshots
  if (message.type === 'HIDE_OVERLAY') {
    hideOverlay();
    sendResponse({ ok: true });
    return;
  }

  // Restore the overlay bar after screenshot is taken
  if (message.type === 'SHOW_OVERLAY') {
    showOverlay();
    sendResponse({ ok: true });
  }

  return true; // Keep message channel open for async responses
});

// ── Event capture ─────────────────────────────────────────────────────────────

function getElementInfo(el: Element): ElementInfo {
  const rect = el.getBoundingClientRect();
  const tag = el.tagName.toLowerCase();

  const ariaLabel = el.getAttribute('aria-label')?.trim() || undefined;
  const placeholder = el.getAttribute('placeholder')?.trim() || undefined;
  const name = el.getAttribute('name')?.trim() || undefined;
  const title = el.getAttribute('title')?.trim() || undefined;
  const inputType = tag === 'input' ? ((el as HTMLInputElement).type || undefined) : undefined;

  // Find associated <label> text: first by for/id, then by ancestor walk (max 3 levels)
  let labelText: string | undefined;
  if (el.id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lbl) labelText = (lbl as HTMLElement).innerText.trim() || undefined;
  }
  if (!labelText) {
    let p = el.parentElement;
    for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
      if (p.tagName.toLowerCase() === 'label') {
        labelText = (p as HTMLElement).innerText.trim() || undefined;
        break;
      }
    }
  }
  // Strategy 3: previous siblings of element (label adjacent to field in same container)
  if (!labelText) {
    let sib = el.previousElementSibling;
    for (let i = 0; i < 3 && sib; i++, sib = sib.previousElementSibling) {
      const t = (sib as HTMLElement).innerText?.trim();
      if (t && t.length > 0 && t.length < 60) { labelText = t; break; }
    }
  }
  // Strategy 4: previous siblings of element's parent (table/grid: label in prior cell)
  if (!labelText && el.parentElement) {
    let sib = el.parentElement.previousElementSibling;
    for (let i = 0; i < 3 && sib; i++, sib = sib.previousElementSibling) {
      const t = (sib as HTMLElement).innerText?.trim();
      if (t && t.length > 0 && t.length < 60) { labelText = t; break; }
    }
  }

  return {
    tag,
    text: (el as HTMLElement).innerText?.trim().substring(0, 80) ?? '',
    cssSelector: generateCSSSelector(el),
    boundingBox: {
      // Keep coords viewport-relative (no scrollX/Y) to match captureVisibleTab's
      // coordinate space, then scale to physical pixels via dpr.
      x: rect.left * dpr,
      y: rect.top * dpr,
      width: rect.width * dpr,
      height: rect.height * dpr,
    },
    ariaLabel,
    placeholder,
    name,
    inputType,
    title,
    labelText,
  };
}

function sendEvent(payload: UserEventPayload) {
  chrome.runtime.sendMessage({ type: 'USER_EVENT', payload }).catch(() => {});
}

/** Semantic tags that are meaningful click targets.
 *  Walking up to one of these prevents "Click on span" / "Click on div" descriptions. */
const SEMANTIC_TAGS = new Set([
  'a', 'button', 'input', 'select', 'textarea',
  'label', 'li', 'summary', 'details', 'option',
]);
const MAX_CLIMB = 5;

/** Walk up from the raw click target to the nearest semantically useful ancestor.
 *  Falls back to the original element if nothing meaningful is found within MAX_CLIMB steps. */
function resolveClickTarget(el: Element): Element {
  let cur: Element | null = el;
  for (let i = 0; i < MAX_CLIMB && cur; i++) {
    if (SEMANTIC_TAGS.has(cur.tagName.toLowerCase())) return cur;
    if (cur.hasAttribute('placeholder')) return cur;
    cur = cur.parentElement;
  }
  return el;
}

// Fired on mousedown (not click) so the screenshot is captured before the browser
// processes the click event — this means dropdown/popup states are still visible
// in the screenshot rather than already closed by the time we capture.
function onMousedownCapture(e: MouseEvent) {
  if (e.button !== 0) return; // left-click only; ignore right/middle
  console.log('[GuideSnap] Mousedown detected, isRecording:', isRecording, 'isPaused:', isPaused);
  if (!isRecording || isPaused) return;

  const raw = e.target as Element | null;
  if (!raw || isOwnOverlay(raw)) return;

  const target = resolveClickTarget(raw);

  const payload: UserEventPayload = {
    eventType: 'click',
    element: getElementInfo(target),
    clickPoint: { x: e.clientX * dpr, y: e.clientY * dpr },
    pageTitle: document.title,
    pageUrl: location.href,
  };
  console.log('[GuideSnap] Sending mousedown event:', payload);
  sendEvent(payload);
}

function onChangeCapture(e: Event) {
  if (!isRecording || isPaused) return;

  const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (!target) return;
  if ((target as HTMLInputElement).type === 'password') return; // never log passwords
  // Checkboxes and radio buttons are already captured by the mousedown handler with
  // correct "Check / Select" descriptions — skip them here to avoid duplicate steps
  // with wrong "Type '...' in ..." descriptions derived from the value attribute.
  const itype = (target as HTMLInputElement).type;
  if (itype === 'checkbox' || itype === 'radio') return;

  // For <select>, use the option's visible display text, not its value attribute
  const inputValue = target.tagName.toLowerCase() === 'select'
    ? ((target as HTMLSelectElement).options[(target as HTMLSelectElement).selectedIndex]?.text || target.value).substring(0, 80)
    : target.value.substring(0, 80);

  const payload: UserEventPayload = {
    eventType: 'input',
    element: getElementInfo(target),
    clickPoint: null,
    inputValue,
    pageTitle: document.title,
    pageUrl: location.href,
  };
  sendEvent(payload);
}

function onNavigation() {
  if (!isRecording || isPaused) return;

  const payload: UserEventPayload = {
    eventType: 'navigate',
    element: null,
    clickPoint: null,
    pageTitle: document.title,
    pageUrl: location.href,
  };
  sendEvent(payload);
}

function onScrollDebounced() {
  if (!isRecording || isPaused) return;

  const delta = Math.abs(window.scrollY - lastScrollY);
  if (delta < SCROLL_THRESHOLD) return;

  lastScrollY = window.scrollY;

  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    const payload: UserEventPayload = {
      eventType: 'scroll',
      element: null,
      clickPoint: null,
      pageTitle: document.title,
      pageUrl: location.href,
    };
    sendEvent(payload);
  }, 500);
}

function isOwnOverlay(el: Element): boolean {
  return el.closest('#__guidesnap_overlay_host__') !== null;
}

function attachListeners() {
  document.addEventListener('mousedown', onMousedownCapture, true);
  document.addEventListener('change', onChangeCapture, true);
  window.addEventListener('popstate', onNavigation);
  window.addEventListener('hashchange', onNavigation);
  window.addEventListener('scroll', onScrollDebounced, { passive: true });
}

function detachListeners() {
  document.removeEventListener('mousedown', onMousedownCapture, true);
  document.removeEventListener('change', onChangeCapture, true);
  window.removeEventListener('popstate', onNavigation);
  window.removeEventListener('hashchange', onNavigation);
  window.removeEventListener('scroll', onScrollDebounced);
}
