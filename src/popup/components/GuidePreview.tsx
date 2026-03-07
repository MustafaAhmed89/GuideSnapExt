import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RecordedStep, Guide } from '../../shared/types';

interface Props {
  guide: Guide;
  steps: RecordedStep[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export function GuidePreview({ guide, steps, currentIndex, onNavigate, onClose }: Props) {
  const step = steps[currentIndex];
  const total = steps.length;
  const imgSrc = step?.screenshotAnnotated || step?.screenshotRaw;

  const goPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, total, onNavigate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, onClose]);

  if (!step) return null;

  const dotCount = Math.min(total, 10);
  const showOverflow = total > 10;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 bg-gray-900 border-b border-gray-700">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{guide.title}</p>
          <p className="text-[11px] text-gray-400">
            Step {currentIndex + 1} of {total}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Close preview (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Screenshot */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-950 px-2 py-2 overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`Step ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain rounded shadow-lg"
          />
        ) : (
          <div className="text-gray-600 text-xs text-center">
            <p>No screenshot</p>
          </div>
        )}
      </div>

      {/* Description + page URL */}
      {(step.description || step.pageUrl) && (
        <div className="flex-shrink-0 px-3 py-2.5 bg-gray-800 border-t border-gray-700">
          {step.description && (
            <p className="text-xs text-gray-200 leading-relaxed line-clamp-2">{step.description}</p>
          )}
          {step.pageUrl && (
            <p className="text-[10px] text-gray-500 mt-1 truncate" title={step.pageUrl}>
              {step.pageUrl}
            </p>
          )}
        </div>
      )}

      {/* Navigation bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-gray-900 border-t border-gray-700">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
          Prev
        </button>

        {/* Step dot indicators */}
        <div className="flex items-center gap-1">
          {Array.from({ length: dotCount }, (_, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              title={`Step ${i + 1}`}
              className={`rounded-full transition-all ${
                i === currentIndex
                  ? 'w-3 h-1.5 bg-brand-500'
                  : 'w-1.5 h-1.5 bg-gray-600 hover:bg-gray-400'
              }`}
            />
          ))}
          {showOverflow && (
            <span className="text-[10px] text-gray-500 ml-0.5">+{total - 10}</span>
          )}
        </div>

        <button
          onClick={goNext}
          disabled={currentIndex === total - 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
