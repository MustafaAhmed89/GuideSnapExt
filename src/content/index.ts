import { generateCSSSelector } from '../utils/selector';
import { createOverlay, updateOverlay, removeOverlay } from './overlay';
import type { UserEventPayload, ElementInfo } from '../shared/types';

let isRecording = false;
let isPaused = false;
let scrollTimer: ReturnType<typeof setTimeout> | null = null;
let lastScrollY = window.scrollY;
const SCROLL_THRESHOLD = 300;

// Device pixel ratio: captureVisibleTab() returns physical pixels; CSS APIs return
// CSS pixels. Multiply all coordinates by dpr so annotations land in the right spot
// on both standard (1×) and HiDPI/Retina (2×+) displays.
const dpr = window.devicePixelRatio || 1;

// ── Bootstrap: ask background for current state ───────────────────────────────

chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
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

chrome.runtime.onMessage.addListener((message) => {
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
  }
});

// ── Event capture ─────────────────────────────────────────────────────────────

function getElementInfo(el: Element): ElementInfo {
  const rect = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
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
  };
}

function sendEvent(payload: UserEventPayload) {
  chrome.runtime.sendMessage({ type: 'USER_EVENT', payload }).catch(() => {});
}

function onClickCapture(e: MouseEvent) {
  if (!isRecording || isPaused) return;

  const target = e.target as Element | null;
  if (!target || isOwnOverlay(target)) return;

  const payload: UserEventPayload = {
    eventType: 'click',
    element: getElementInfo(target),
    clickPoint: { x: e.clientX * dpr, y: e.clientY * dpr },
    pageTitle: document.title,
    pageUrl: location.href,
  };
  sendEvent(payload);
}

function onChangeCapture(e: Event) {
  if (!isRecording || isPaused) return;

  const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  if (!target) return;
  if ((target as HTMLInputElement).type === 'password') return; // never log passwords

  const payload: UserEventPayload = {
    eventType: 'input',
    element: getElementInfo(target),
    clickPoint: null,
    inputValue: target.value.substring(0, 80),
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
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('change', onChangeCapture, true);
  window.addEventListener('popstate', onNavigation);
  window.addEventListener('hashchange', onNavigation);
  window.addEventListener('scroll', onScrollDebounced, { passive: true });
}

function detachListeners() {
  document.removeEventListener('click', onClickCapture, true);
  document.removeEventListener('change', onChangeCapture, true);
  window.removeEventListener('popstate', onNavigation);
  window.removeEventListener('hashchange', onNavigation);
  window.removeEventListener('scroll', onScrollDebounced);
}
