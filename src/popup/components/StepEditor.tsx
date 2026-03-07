import { useState, useRef } from 'react';
import { ArrowLeft, Plus, Eye } from 'lucide-react';
import { StepCard } from './StepCard';
import { GuidePreview } from './GuidePreview';
import { saveStep, deleteStep, saveGuide } from '../../shared/storage';
import type { RecordedStep, Guide } from '../../shared/types';

interface Props {
  guide: Guide;
  initialSteps: RecordedStep[];
  onBack: () => void;
  onExport: (guide: Guide, steps: RecordedStep[]) => void;
}

export function StepEditor({ guide, initialSteps, onBack, onExport }: Props) {
  const [steps, setSteps] = useState<RecordedStep[]>(initialSteps);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  async function persistSteps(updated: RecordedStep[]) {
    setSaving(true);
    const reindexed = updated.map((s, i) => ({ ...s, index: i }));
    await Promise.all(reindexed.map(saveStep));
    const updatedGuide: Guide = {
      ...guide,
      stepIds: reindexed.map((s) => s.id),
      updatedAt: Date.now(),
    };
    await saveGuide(updatedGuide);
    setSaving(false);
    return reindexed;
  }

  function handleDescriptionChange(id: string, desc: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, description: desc } : s)));
  }

  async function handleDescriptionBlur(id: string, desc: string) {
    const step = steps.find((s) => s.id === id);
    if (step) await saveStep({ ...step, description: desc });
  }

  async function handleScreenshotUpload(id: string, dataUrl: string) {
    const step = steps.find((s) => s.id === id);
    if (!step) return;
    const updated = { ...step, screenshotRaw: dataUrl, screenshotAnnotated: dataUrl };
    await saveStep(updated);
    setSteps((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  async function handleDelete(id: string) {
    const updated = steps.filter((s) => s.id !== id);
    await deleteStep(id);
    const reindexed = await persistSteps(updated);
    setSteps(reindexed);
  }

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOver.current = index;
  }

  async function handleDragEnd() {
    if (dragItem.current === null || dragOver.current === null) return;
    const updated = [...steps];
    const [dragged] = updated.splice(dragItem.current, 1);
    updated.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    const reindexed = await persistSteps(updated);
    setSteps(reindexed);
  }

  async function addManualStep() {
    const newStep: RecordedStep = {
      id: `step-manual-${Date.now()}`,
      guideId: guide.id,
      index: steps.length,
      timestamp: Date.now(),
      eventType: 'manual',
      description: 'Describe this step',
      element: null,
      clickPoint: null,
      screenshotRaw: '',
      screenshotAnnotated: '',
      pageTitle: '',
      pageUrl: '',
    };
    const updated = [...steps, newStep];
    const reindexed = await persistSteps(updated);
    setSteps(reindexed);
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Guide preview overlay */}
      {previewing && (
        <GuidePreview
          guide={guide}
          steps={steps}
          currentIndex={previewIndex}
          onNavigate={setPreviewIndex}
          onClose={() => setPreviewing(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 truncate text-sm">{guide.title}</h2>
          <p className="text-xs text-gray-400">{steps.length} steps {saving ? '· Saving…' : ''}</p>
        </div>
        <button
          onClick={() => { setPreviewIndex(0); setPreviewing(true); }}
          disabled={steps.length === 0}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-30"
          title="Preview guide"
        >
          <Eye size={18} />
        </button>
        <button
          onClick={() => onExport(guide, steps)}
          className="px-3 py-1.5 bg-brand-500 text-white text-xs font-semibold rounded-lg hover:bg-brand-600 transition-colors"
        >
          Export
        </button>
      </div>

      {/* Steps list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {steps.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No steps recorded yet.</p>
            <p className="text-xs mt-1">Add a manual step or record new actions.</p>
          </div>
        )}
        {steps.map((step, i) => (
          <div
            key={step.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragEnter={() => handleDragEnter(i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            <StepCard
              step={step}
              index={i}
              onDescriptionChange={(id, desc) => {
                handleDescriptionChange(id, desc);
              }}
              onDelete={handleDelete}
              onScreenshotUpload={handleScreenshotUpload}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white">
        <button
          onClick={addManualStep}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-brand-500 hover:text-brand-500 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add manual step
        </button>
      </div>
    </div>
  );
}
