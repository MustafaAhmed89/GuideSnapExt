export interface ElementInfo {
  tag: string;
  text: string;
  cssSelector: string;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface RecordedStep {
  id: string;
  guideId: string;
  index: number;
  timestamp: number;
  eventType: 'click' | 'input' | 'navigate' | 'scroll' | 'manual';
  description: string;
  element: ElementInfo | null;
  clickPoint: { x: number; y: number } | null;
  screenshotRaw: string;
  screenshotAnnotated: string;
  pageTitle: string;
  pageUrl: string;
}

export interface Guide {
  id: string;
  title: string;
  type?: GuideType;
  createdAt: number;
  updatedAt: number;
  stepIds: string[];
}

export type RecordingState = 'idle' | 'recording' | 'paused';

export type GuideType = 'how-to-tutorial' | 'employee-training' | 'capture-screens';

export interface UserEventPayload {
  eventType: 'click' | 'input' | 'navigate' | 'scroll';
  element: ElementInfo | null;
  clickPoint: { x: number; y: number } | null;
  inputValue?: string;
  pageTitle: string;
  pageUrl: string;
}

export interface AnnotatePayload {
  screenshotRaw: string;
  stepNumber: number;
  element: ElementInfo | null;
  clickPoint: { x: number; y: number } | null;
}
