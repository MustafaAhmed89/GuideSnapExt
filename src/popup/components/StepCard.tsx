import { useRef } from 'react';
import { Trash2, GripVertical, ExternalLink, ImagePlus } from 'lucide-react';
import type { RecordedStep, GuideType } from '../../shared/types';

interface Props {
  step: RecordedStep;
  index: number;
  guideType?: GuideType;
  large?: boolean;
  onDescriptionChange: (id: string, desc: string) => void;
  onExtraFieldChange?: (id: string, value: string) => void;
  onExtraFieldBlur?: (id: string, value: string) => void;
  onDelete: (id: string) => void;
  onScreenshotUpload?: (id: string, dataUrl: string) => void;
  isDragging?: boolean;
}

export function StepCard({ step, index, guideType, large, onDescriptionChange, onExtraFieldChange, onExtraFieldBlur, onDelete, onScreenshotUpload, isDragging }: Props) {
  const thumb = step.screenshotAnnotated || step.screenshotRaw;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openFullSize() {
    if (!thumb) return;
    const w = window.open();
    if (w) {
      w.document.write(`<img src="${thumb}" style="max-width:100%" />`);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onScreenshotUpload) return;
    const reader = new FileReader();
    reader.onload = () => onScreenshotUpload(step.id, reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const extraField = (guideType === 'how-to-tutorial' || guideType === 'employee-training') && (
    <textarea
      rows={2}
      className="w-full text-xs text-gray-600 border border-gray-100 rounded px-2 py-1.5 mt-2 focus:outline-none focus:ring-1 focus:ring-brand-400 placeholder-gray-300 resize-none"
      value={guideType === 'how-to-tutorial' ? (step.tip ?? '') : (step.whyItMatters ?? '')}
      onChange={(e) => onExtraFieldChange?.(step.id, e.target.value)}
      onBlur={(e) => onExtraFieldBlur?.(step.id, e.target.value)}
      placeholder={guideType === 'how-to-tutorial' ? 'Tip (optional)…' : 'Why this matters (optional)…'}
    />
  );

  if (large) {
    return (
      <div
        className={`flex flex-col bg-white rounded-xl border border-gray-100 p-4 transition-shadow ${
          isDragging ? 'shadow-lg ring-2 ring-brand-500 opacity-80' : 'shadow-sm hover:shadow-md'
        }`}
        data-step-id={step.id}
      >
        {/* Header row */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex-shrink-0 flex items-center text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
            data-drag-handle
          >
            <GripVertical size={16} />
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-bold">
            {index + 1}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => onDelete(step.id)}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete step"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Screenshot — full card width */}
        {thumb ? (
          <div className="relative group cursor-pointer mb-3" onClick={openFullSize}>
            <img
              src={thumb}
              alt={`Step ${index + 1}`}
              className="w-full rounded-lg border border-gray-100 object-contain"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
              <ExternalLink size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ) : (
          <>
            <div
              onClick={() => onScreenshotUpload && fileInputRef.current?.click()}
              className={`w-full h-48 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 mb-3 transition-colors ${
                onScreenshotUpload
                  ? 'border-gray-200 hover:border-brand-500 hover:text-brand-500 cursor-pointer text-gray-400'
                  : 'border-gray-200 text-gray-300'
              }`}
            >
              <ImagePlus size={24} />
              <span className="text-xs font-medium">Upload image</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </>
        )}

        {/* Description */}
        <textarea
          className="w-full text-sm text-gray-800 resize-none border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          rows={3}
          value={step.description}
          onChange={(e) => onDescriptionChange(step.id, e.target.value)}
          placeholder="Describe this step…"
        />

        {extraField}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-white rounded-xl border border-gray-100 p-3 transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-brand-500 opacity-80' : 'shadow-sm hover:shadow-md'
      }`}
      data-step-id={step.id}
    >
      {/* Main row */}
      <div className="flex gap-3">
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
        <div className="flex-shrink-0 relative group">
          {thumb ? (
            <div className="cursor-pointer" onClick={openFullSize}>
              <img
                src={thumb}
                alt={`Step ${index + 1}`}
                className="w-28 h-20 object-cover rounded-lg border border-gray-100"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                <ExternalLink size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ) : (
            <>
              <div
                onClick={() => onScreenshotUpload && fileInputRef.current?.click()}
                className={`w-28 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                  onScreenshotUpload
                    ? 'border-gray-200 hover:border-brand-500 hover:text-brand-500 cursor-pointer text-gray-400'
                    : 'border-gray-200 text-gray-300'
                }`}
              >
                <ImagePlus size={16} />
                <span className="text-[10px] font-medium">Upload image</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </>
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

      {extraField}
    </div>
  );
}
