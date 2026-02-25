import type { RecordingState } from '../../shared/types';

interface Props {
  state: RecordingState;
  stepCount: number;
  guideTitle: string;
  onStop: () => void;
  onPause: () => void;
}

export function RecordingBadge({ state, stepCount, guideTitle, onStop, onPause }: Props) {
  if (state === 'idle') return null;

  return (
    <div className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl mb-3">
      {/* Animated dot */}
      <span
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          state === 'paused' ? 'bg-amber-400' : 'bg-red-500 animate-pulse'
        }`}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-500 leading-none mb-0.5">
          {state === 'paused' ? 'Paused' : 'Recording'}
        </p>
        <p className="text-xs text-gray-300 truncate">{guideTitle}</p>
        <p className="text-xs text-gray-400">{stepCount} step{stepCount !== 1 ? 's' : ''} captured</p>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          onClick={onPause}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 transition-colors"
        >
          {state === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button
          onClick={onStop}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-600 transition-colors"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
