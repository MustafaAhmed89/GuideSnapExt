import type { RecordingState, UserEventPayload, Guide, RecordedStep, GuideType } from '../shared/types';
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
let currentGuideType: GuideType | null = null;
let stepCount = 0;
let offscreenReady = false;

// ── Initialise on service-worker startup ─────────────────────────────────────

async function restoreState() {
  const persisted = await loadRecordingState();
  recordingState = persisted.recordingState;
  currentGuideId = persisted.currentGuideId;
  currentGuideTitle = persisted.currentGuideTitle;
  currentGuideType = persisted.currentGuideType ?? null;
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
  await saveRecordingState({ recordingState, currentGuideId, currentGuideTitle, currentGuideType, stepCount });
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
  console.log('[GuideSnap] Received user event:', event.eventType, 'recordingState:', recordingState);
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

  // 2. Annotate (skip for capture-screens mode)
  const stepNumber = stepCount + 1;
  let screenshotAnnotated: string;
  if (currentGuideType === 'capture-screens') {
    screenshotAnnotated = screenshotRaw;
  } else {
    await ensureOffscreen();
    screenshotAnnotated = screenshotRaw
      ? await annotateScreenshot(screenshotRaw, stepNumber, event)
      : '';
  }

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
      const guideType: GuideType = message.payload.guideType ?? 'how-to-tutorial';
      const guide: Guide = {
        id: guideId,
        title,
        type: guideType,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stepIds: [],
      };

      // ── 1. Update in-memory state immediately (zero cost) ──────────────
      // Must happen before broadcastState() reads these variables.
      recordingState = 'recording';
      currentGuideId = guideId;
      currentGuideTitle = title;
      currentGuideType = guideType;
      stepCount = 0;

      // ── 2. Ensure content script is active and notify tab ──────────────
      async function ensureContentScriptAndNotify(tabId: number) {
        try {
          // Try to send message first to check if content script is already loaded
          await chrome.tabs.sendMessage(tabId, {
            type: 'UPDATE_OVERLAY',
            payload: { stepCount, state: recordingState },
          });
        } catch (err) {
          // Content script not responding — inject it manually using the
          // built path from the manifest (avoids hardcoding the hashed filename)
          console.log('[GuideSnap] Injecting content script into tab', tabId);
          try {
            const csFiles: string[] | undefined = (chrome.runtime.getManifest() as any).content_scripts?.[0]?.js;
            if (!csFiles?.length) throw new Error('No content script files found in manifest');
            await chrome.scripting.executeScript({
              target: { tabId, allFrames: false },
              files: csFiles,
            });
            // Wait for content script to initialize
            await new Promise(resolve => setTimeout(resolve, 150));
            // Try sending message again
            await chrome.tabs.sendMessage(tabId, {
              type: 'UPDATE_OVERLAY',
              payload: { stepCount, state: recordingState },
            });
          } catch (injectErr) {
            console.warn('[GuideSnap] Cannot inject content script:', injectErr);
          }
        }
      }

      // Determine which tab to notify
      const tabToNotify = sender.tab?.id;
      if (tabToNotify) {
        // Message came from a tab
        ensureContentScriptAndNotify(tabToNotify);
      } else {
        // Message came from popup — get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (tabs[0]?.id) {
            await ensureContentScriptAndNotify(tabs[0].id);
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
      if (currentGuideType !== 'capture-screens') {
        ensureOffscreen().catch(() => {});
      }
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
