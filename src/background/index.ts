import type { RecordingState, UserEventPayload, Guide, RecordedStep } from '../shared/types';
import {
  saveGuide,
  loadGuide,
  saveStep,
  saveRecordingState,
  loadRecordingState,
} from '../shared/storage';

// ── In-memory state (backed by chrome.storage.local for persistence) ──────────

let recordingState: RecordingState = 'idle';
let currentGuideId: string | null = null;
let currentGuideTitle = '';
let stepCount = 0;
let offscreenReady = false;

// ── Initialise on service-worker startup ─────────────────────────────────────

async function restoreState() {
  const persisted = await loadRecordingState();
  recordingState = persisted.recordingState;
  currentGuideId = persisted.currentGuideId;
  currentGuideTitle = persisted.currentGuideTitle;
  stepCount = persisted.stepCount;
}

restoreState();

// ── Offscreen document helpers ────────────────────────────────────────────────

async function ensureOffscreen() {
  if (offscreenReady) return;
  const existing = await chrome.offscreen.hasDocument();
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('src/offscreen/offscreen.html'),
      reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
      justification: 'Annotate screenshots with canvas',
    });
  }
  offscreenReady = true;
}

async function closeOffscreen() {
  const existing = await chrome.offscreen.hasDocument();
  if (existing) await chrome.offscreen.closeDocument();
  offscreenReady = false;
}

// ── Broadcast state to all listeners ─────────────────────────────────────────

function broadcastState() {
  const payload = {
    state: recordingState,
    stepCount,
    guideId: currentGuideId,
    guideTitle: currentGuideTitle,
  };

  // To popup (may not be open — errors are safe to ignore)
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', payload }).catch(() => {});

  // To all content scripts
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: 'UPDATE_OVERLAY',
            payload: { stepCount, state: recordingState },
          })
          .catch(() => {});
      }
    }
  });
}

async function persistState() {
  await saveRecordingState({ recordingState, currentGuideId, currentGuideTitle, stepCount });
}

// ── Auto-description from event data ─────────────────────────────────────────

function generateDescription(event: UserEventPayload): string {
  const text = event.element?.text?.trim().substring(0, 50) ?? '';
  const tag = event.element?.tag?.toLowerCase() ?? '';

  if (event.eventType === 'click') {
    if (tag === 'button') return `Click the "${text || 'button'}" button`;
    if (tag === 'a') return `Click the "${text || 'link'}" link`;
    if (tag === 'input') return `Click on input field`;
    if (tag === 'select') return `Open dropdown`;
    if (tag === 'li') return `Click "${text || 'menu item'}"`;
    return `Click on ${tag || 'element'}${text ? ` "${text}"` : ''}`;
  }
  if (event.eventType === 'input') {
    const label = text || tag || 'field';
    if (event.inputValue) return `Type "${event.inputValue}" in the ${label}`;
    return `Enter text in the ${label}`;
  }
  if (event.eventType === 'navigate') {
    return `Navigate to: ${event.pageUrl}`;
  }
  if (event.eventType === 'scroll') {
    return `Scroll down the page`;
  }
  return 'Perform action';
}

// ── Screenshot → offscreen annotation ────────────────────────────────────────

function annotateScreenshot(
  screenshotRaw: string,
  stepNumber: number,
  event: UserEventPayload
): Promise<string> {
  return new Promise((resolve) => {
    const payload = {
      screenshotRaw,
      stepNumber,
      element: event.element,
      clickPoint: event.clickPoint,
    };

    const listener = (msg: { type: string; payload: { annotated: string } }) => {
      if (msg.type === 'ANNOTATION_DONE') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(msg.payload.annotated);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({ type: 'ANNOTATE_SCREENSHOT', payload }).catch(() => {
      chrome.runtime.onMessage.removeListener(listener);
      resolve(screenshotRaw); // fallback: use raw
    });
  });
}

// ── Handle USER_EVENT ─────────────────────────────────────────────────────────

async function handleUserEvent(event: UserEventPayload, senderTabId: number) {
  if (recordingState !== 'recording' || !currentGuideId) return;

  // 1. Hide overlay so it doesn't appear in the screenshot, then capture
  try {
    await chrome.tabs.sendMessage(senderTabId, { type: 'HIDE_OVERLAY' });
    // Give the browser one paint cycle to actually hide the element
    await new Promise<void>((resolve) => setTimeout(resolve, 60));
  } catch {
    // Tab may not have a content script (e.g. chrome:// pages) — safe to ignore
  }

  let screenshotRaw = '';
  try {
    screenshotRaw = await chrome.tabs.captureVisibleTab({ format: 'png' });
  } catch {
    // Tab might not be capturable (e.g. chrome:// pages)
    screenshotRaw = '';
  }

  // Restore overlay immediately after capture (fire-and-forget)
  chrome.tabs.sendMessage(senderTabId, { type: 'SHOW_OVERLAY' }).catch(() => {});

  // 2. Annotate
  await ensureOffscreen();
  const stepNumber = stepCount + 1;
  const screenshotAnnotated = screenshotRaw
    ? await annotateScreenshot(screenshotRaw, stepNumber, event)
    : '';

  // 3. Build step
  const stepId = `step-${currentGuideId}-${Date.now()}`;
  const step: RecordedStep = {
    id: stepId,
    guideId: currentGuideId,
    index: stepCount,
    timestamp: Date.now(),
    eventType: event.eventType,
    description: generateDescription(event),
    element: event.element,
    clickPoint: event.clickPoint,
    screenshotRaw,
    screenshotAnnotated,
    pageTitle: event.pageTitle,
    pageUrl: event.pageUrl,
  };

  await saveStep(step);

  // 4. Update guide stepIds
  const guide = await loadGuide(currentGuideId);
  if (guide) {
    guide.stepIds.push(stepId);
    guide.updatedAt = Date.now();
    await saveGuide(guide);
  }

  stepCount++;
  await persistState();
  broadcastState();
}

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === 'GET_STATE') {
      sendResponse({
        state: recordingState,
        stepCount,
        guideId: currentGuideId,
        guideTitle: currentGuideTitle,
      });
      return;
    }

    if (message.type === 'START_RECORDING') {
      const guideId = `guide-${Date.now()}`;
      const title: string = message.payload.guideTitle || 'Untitled Guide';
      const guide: Guide = {
        id: guideId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stepIds: [],
      };

      // ── 1. Update in-memory state immediately (zero cost) ──────────────
      // Must happen before broadcastState() reads these variables.
      recordingState = 'recording';
      currentGuideId = guideId;
      currentGuideTitle = title;
      stepCount = 0;

      // ── 2. Notify the active tab directly — fastest path to attachListeners
      // When called from popup, sender.tab is undefined, so query for active tab
      const tabToNotify = sender.tab?.id;
      if (tabToNotify) {
        // Message came from a tab (e.g., content script)
        chrome.tabs
          .sendMessage(tabToNotify, {
            type: 'UPDATE_OVERLAY',
            payload: { stepCount, state: recordingState },
          })
          .catch(() => {});
      } else {
        // Message came from popup — get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs
              .sendMessage(tabs[0].id, {
                type: 'UPDATE_OVERLAY',
                payload: { stepCount, state: recordingState },
              })
              .catch(() => {});
          }
        });
      }

      // ── 3. Broadcast to popup + all other tabs (fire-and-forget) ────────
      broadcastState();

      // ── 4. Respond immediately — no need to wait for storage ────────────
      sendResponse({ ok: true, guideId });

      // ── 5. Persist asynchronously (durability, not on the critical path) ─
      await saveGuide(guide);
      await persistState();

      // ── 6. Pre-warm offscreen doc as a background task ──────────────────
      // Not awaited: handleUserEvent() already calls ensureOffscreen() before
      // annotation, so first-click capture is unaffected. This gives it a
      // head-start so the first screenshot annotation is faster.
      ensureOffscreen().catch(() => {});
    }

    if (message.type === 'STOP_RECORDING') {
      recordingState = 'idle';
      await persistState();
      await closeOffscreen();
      broadcastState();
      sendResponse({ ok: true });
    }

    if (message.type === 'PAUSE_RECORDING') {
      recordingState = recordingState === 'paused' ? 'recording' : 'paused';
      await persistState();
      broadcastState();
      sendResponse({ ok: true });
    }

    if (message.type === 'USER_EVENT' && sender.tab?.id !== undefined) {
      await handleUserEvent(message.payload as UserEventPayload, sender.tab.id);
      sendResponse({ ok: true });
    }
  })();

  // Return true to keep message channel open for async response
  return true;
});

// Keep service worker alive during active recording via alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive' && recordingState === 'recording') {
    // Just waking up — nothing to do
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('keepAlive', { periodInMinutes: 0.4 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('keepAlive', { periodInMinutes: 0.4 });
});
