import type { RecordingState, UserEventPayload, AnnotatePayload, GuideType } from './types';

export type ExtensionMessage =
  | { type: 'START_RECORDING'; payload: { guideTitle: string; guideType: GuideType } }
  | { type: 'STOP_RECORDING' }
  | { type: 'PAUSE_RECORDING' }
  | { type: 'USER_EVENT'; payload: UserEventPayload }
  | { type: 'GET_STATE' }
  | { type: 'STATE_UPDATE'; payload: { state: RecordingState; stepCount: number; guideId: string | null; guideTitle: string } }
  | { type: 'ANNOTATE_SCREENSHOT'; payload: AnnotatePayload }
  | { type: 'ANNOTATION_DONE'; payload: { annotated: string } }
  | { type: 'UPDATE_OVERLAY'; payload: { stepCount: number; state: RecordingState } };

export type StateUpdatePayload = {
  state: RecordingState;
  stepCount: number;
  guideId: string | null;
  guideTitle: string;
};
