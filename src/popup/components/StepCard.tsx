import { Trash2, GripVertical, ExternalLink } from 'lucide-react';
import type { RecordedStep } from '../../shared/types';

interface Props {
  step: RecordedStep;
  index: number;
  onDescriptionChange: (id: string, desc: string) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

export function StepCard({ step, index, onDescriptionChange, onDelete, isDragging }: Props) {
  const thumb = step.screenshotAnnotated || step.screenshotRaw;

  function openFullSize() {
    if (!thumb) return;
    const w = window.open();
    if (w) {
      w.document.write(`<img src="${thumb}" style="max-width:100%" />`);
    }
  }

  return (
    <div
      className={`flex gap-3 bg-white rounded-xl border border-gray-100 p-3 transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-brand-500 opacity-80' : 'shadow-sm hover:shadow-md'
      }`}
      data-step-id={step.id}
    >
      {/* Drag handle */}
      <div
        className="flex-shrink-0 flex items-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
        data-drag-handle
      >
        <GripVertical size={16} />
      </div>

      {/* Step number badge */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">
        {index + 1}
      </div>

      {/* Thumbnail */}
      <div className="flex-shrink-0 relative group cursor-pointer" onClick={openFullSize}>
        {thumb ? (
          <>
            <img
              src={thumb}
              alt={`Step ${index + 1}`}
              className="w-28 h-20 object-cover rounded-lg border border-gray-100"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
              <ExternalLink
                size={16}
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </>
        ) : (
          <div className="w-28 h-20 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs">
            No screenshot
          </div>
        )}
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 mb-1 truncate">{step.pageTitle}</p>
        <textarea
          className="w-full text-sm text-gray-800 resize-none border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          rows={3}
          value={step.description}
          onChange={(e) => onDescriptionChange(step.id, e.target.value)}
          placeholder="Describe this step…"
        />
        <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{step.eventType}</p>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(step.id)}
        className="flex-shrink-0 self-start p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Delete step"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
