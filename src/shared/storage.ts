import type { Guide, RecordedStep, GuideType } from './types';

const DB_NAME = 'guidesnap';
const DB_VERSION = 1;
const STEPS_STORE = 'steps';
const GUIDES_KEY = 'guidesnap_guides';

// ── IndexedDB ────────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

export function initDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STEPS_STORE)) {
        const store = db.createObjectStore(STEPS_STORE, { keyPath: 'id' });
        store.createIndex('guideId', 'guideId', { unique: false });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveStep(step: RecordedStep): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STEPS_STORE, 'readwrite');
    tx.objectStore(STEPS_STORE).put(step);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadStep(id: string): Promise<RecordedStep | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STEPS_STORE, 'readonly')
      .objectStore(STEPS_STORE)
      .get(id);
    req.onsuccess = () => resolve(req.result as RecordedStep | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function loadStepsForGuide(guideId: string): Promise<RecordedStep[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(STEPS_STORE, 'readonly')
      .objectStore(STEPS_STORE)
      .index('guideId')
      .getAll(guideId);
    req.onsuccess = () => {
      const steps = (req.result as RecordedStep[]).sort((a, b) => a.index - b.index);
      resolve(steps);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteStep(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STEPS_STORE, 'readwrite');
    tx.objectStore(STEPS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteStepsForGuide(guideId: string): Promise<void> {
  const steps = await loadStepsForGuide(guideId);
  await Promise.all(steps.map((s) => deleteStep(s.id)));
}

// ── chrome.storage.local (Guide metadata) ───────────────────────────────────

async function getAllGuides(): Promise<Record<string, Guide>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(GUIDES_KEY, (result) => {
      resolve((result[GUIDES_KEY] as Record<string, Guide>) ?? {});
    });
  });
}

async function setAllGuides(guides: Record<string, Guide>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [GUIDES_KEY]: guides }, resolve);
  });
}

export async function saveGuide(guide: Guide): Promise<void> {
  const all = await getAllGuides();
  all[guide.id] = guide;
  await setAllGuides(all);
}

export async function loadGuide(id: string): Promise<Guide | undefined> {
  const all = await getAllGuides();
  return all[id];
}

export async function listGuides(): Promise<Guide[]> {
  const all = await getAllGuides();
  return Object.values(all).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteGuide(id: string): Promise<void> {
  await deleteStepsForGuide(id);
  const all = await getAllGuides();
  delete all[id];
  await setAllGuides(all);
}

// ── Recording state persistence ──────────────────────────────────────────────

export interface PersistedState {
  recordingState: 'idle' | 'recording' | 'paused';
  currentGuideId: string | null;
  currentGuideTitle: string;
  currentGuideType: GuideType | null;
  stepCount: number;
}

export async function saveRecordingState(state: PersistedState): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ guidesnap_state: state }, resolve);
  });
}

export async function loadRecordingState(): Promise<PersistedState> {
  return new Promise((resolve) => {
    chrome.storage.local.get('guidesnap_state', (result) => {
      resolve(
        result.guidesnap_state ?? {
          recordingState: 'idle',
          currentGuideId: null,
          currentGuideTitle: '',
          currentGuideType: null,
          stepCount: 0,
        }
      );
    });
  });
}
