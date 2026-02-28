import { useState, useEffect } from 'react';
import { BookOpen, Pencil, Download, Trash2, Plus, ChevronRight, GraduationCap, Camera } from 'lucide-react';
import { listGuides, deleteGuide, loadStepsForGuide } from '../../shared/storage';
import { RecordingBadge } from './RecordingBadge';
import type { Guide, RecordingState, GuideType } from '../../shared/types';

interface Props {
  recordingState: RecordingState;
  stepCount: number;
  guideTitle: string;
  onStartRecording: (title: string, guideType: GuideType) => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onEditGuide: (guide: Guide) => void;
  onExportGuide: (guide: Guide) => void;
}

const GUIDE_TYPES: { id: GuideType; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'how-to-tutorial',   label: 'How to Tutorial',         description: 'Step-by-step with annotated screenshots', icon: BookOpen },
  { id: 'employee-training', label: 'Employee Training Guide', description: 'Structured training with highlights',      icon: GraduationCap },
  { id: 'capture-screens',   label: 'Capture Screens',         description: 'Plain screenshots, no annotations',       icon: Camera },
];

export function HomeView({
  recordingState,
  stepCount,
  guideTitle,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onEditGuide,
  onExportGuide,
}: Props) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<GuideType | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuides();
  }, [recordingState]);

  async function loadGuides() {
    setLoading(true);
    const all = await listGuides();
    setGuides(all);
    setLoading(false);
  }

  function handleStartClick() {
    if (recordingState !== 'idle') return;
    setShowTypeSelector(true);
    setShowTitleInput(false);
    setSelectedType(null);
    setNewTitle('');
  }

  function handleTypeSelect(type: GuideType) {
    setSelectedType(type);
    setShowTypeSelector(false);
    setShowTitleInput(true);
  }

  function handleStartConfirm() {
    const title = newTitle.trim() || `Guide — ${new Date().toLocaleDateString()}`;
    setShowTitleInput(false);
    onStartRecording(title, selectedType ?? 'how-to-tutorial');
  }

  async function handleDelete(guide: Guide) {
    if (!confirm(`Delete "${guide.title}"? This cannot be undone.`)) return;
    await deleteGuide(guide.id);
    await loadGuides();
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <BookOpen size={14} className="text-white" />
          </div>
          <h1 className="font-bold text-gray-900 text-base">GuideSnap</h1>
        </div>

        {/* Recording badge */}
        <RecordingBadge
          state={recordingState}
          stepCount={stepCount}
          guideTitle={guideTitle}
          onStop={onStopRecording}
          onPause={onPauseRecording}
        />

        {/* New guide button / type selector / title input */}
        {recordingState === 'idle' && !showTypeSelector && !showTitleInput && (
          <button
            onClick={handleStartClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            <Plus size={16} />
            Add New
          </button>
        )}

        {showTypeSelector && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Choose guide type</p>
            {GUIDE_TYPES.map(({ id, label, description, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleTypeSelect(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-gray-100 hover:border-brand-500 hover:bg-brand-50 text-left transition-colors group"
              >
                <Icon size={18} className="text-gray-400 group-hover:text-brand-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-500">{label}</p>
                  <p className="text-xs text-gray-400">{description}</p>
                </div>
              </button>
            ))}
            <button
              onClick={() => setShowTypeSelector(false)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {showTitleInput && (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStartConfirm();
                if (e.key === 'Escape') { setShowTitleInput(false); setShowTypeSelector(true); }
              }}
              placeholder="Guide title (e.g. How to create an invoice)"
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleStartConfirm}
              className="px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Start
            </button>
          </div>
        )}
      </div>

      {/* Guides list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
        ) : guides.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No guides yet</p>
            <p className="text-xs mt-1">Click "+ Add New" to create your first guide!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Saved Guides ({guides.length})
            </p>
            {guides.map((guide) => (
              <GuideCard
                key={guide.id}
                guide={guide}
                onEdit={() => onEditGuide(guide)}
                onExport={() => onExportGuide(guide)}
                onDelete={() => handleDelete(guide)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GuideCard({
  guide,
  onEdit,
  onExport,
  onDelete,
  formatDate,
}: {
  guide: Guide;
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
  formatDate: (ts: number) => string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
          <p className="font-medium text-gray-900 text-sm truncate">{guide.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {guide.stepIds.length} step{guide.stepIds.length !== 1 ? 's' : ''} · {formatDate(guide.updatedAt)}
          </p>
        </div>
        <ChevronRight size={16} className="text-gray-300 mt-0.5 flex-shrink-0" />
      </div>

      <div className="flex gap-1.5 mt-2.5 pt-2.5 border-t border-gray-50">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-600 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
        >
          <Pencil size={12} />
          Edit
        </button>
        <button
          onClick={onExport}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-600 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
        >
          <Download size={12} />
          Export
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  );
}
