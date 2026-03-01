import { useState } from 'react';
import { BookOpen, Plus, GraduationCap, ArrowLeft, Download } from 'lucide-react';
import { RecordingBadge } from './RecordingBadge';
import type { RecordingState, GuideType } from '../../shared/types';

interface Props {
  recordingState: RecordingState;
  stepCount: number;
  guideTitle: string;
  onStartRecording: (title: string, guideType: GuideType) => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onOpenGuides: () => void;
}

const GUIDE_TYPES: { id: GuideType; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'how-to-tutorial',   label: 'How to Tutorial',         description: 'Step-by-step with annotated screenshots', icon: BookOpen },
  { id: 'employee-training', label: 'Employee Training Guide', description: 'Structured training with highlights',      icon: GraduationCap },
];

export function HomeView({
  recordingState,
  stepCount,
  guideTitle,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onOpenGuides,
}: Props) {
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedType, setSelectedType] = useState<GuideType | null>(null);
  const [newTitle, setNewTitle] = useState('');

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

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <BookOpen size={14} className="text-white" />
            </div>
            <h1 className="font-bold text-gray-900 text-base">GuideSnap</h1>
          </div>
          <button
            onClick={onOpenGuides}
            title="Saved guides"
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
          >
            <Download size={16} />
          </button>
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
          <div className="space-y-2">
            <button
              onClick={() => { setShowTitleInput(false); setShowTypeSelector(true); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={13} />
              Back
            </button>
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
          </div>
        )}
      </div>
    </div>
  );
}
