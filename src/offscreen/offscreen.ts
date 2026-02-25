import { annotateScreenshot } from '../utils/annotation';
import type { AnnotatePayload } from '../shared/types';

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== 'ANNOTATE_SCREENSHOT') return;

  const payload = message.payload as AnnotatePayload;

  annotateScreenshot(payload)
    .then((annotated) => {
      chrome.runtime.sendMessage({ type: 'ANNOTATION_DONE', payload: { annotated } });
    })
    .catch((err) => {
      console.error('[GuideSnap offscreen] annotation failed:', err);
      // Send raw as fallback
      chrome.runtime.sendMessage({
        type: 'ANNOTATION_DONE',
        payload: { annotated: payload.screenshotRaw },
      });
    });
});
