import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { StepEditor } from '../popup/components/StepEditor';
import { ExportPanel } from '../popup/components/ExportPanel';
import { GuidesListView } from '../popup/components/GuidesListView';
import { loadGuide, loadStepsForGuide } from '../shared/storage';
import type { Guide, RecordedStep } from '../shared/types';

type TabView = 'guides' | 'editor' | 'export';

export function EditorPage() {
  const [view, setView] = useState<TabView>('guides');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [steps, setSteps] = useState<RecordedStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guideId = params.get('guideId');
    if (guideId) {
      async function load() {
        const g = await loadGuide(guideId!);
        if (g) {
          const s = await loadStepsForGuide(guideId!);
          setGuide(g);
          setSteps(s);
          setView('editor');
        }
        setLoading(false);
      }
      load();
    } else {
      setLoading(false);
    }
  }, []);

  async function openEditor(g: Guide) {
    const s = await loadStepsForGuide(g.id);
    setGuide(g);
    setSteps(s);
    setView('editor');
  }

  async function openExport(g: Guide) {
    const s = await loadStepsForGuide(g.id);
    setGuide(g);
    setSteps(s);
    setView('export');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-400">
          <BookOpen size={20} />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (view === 'export' && guide) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
          <ExportPanel
            guide={guide}
            steps={steps}
            onBack={() => setView('editor')}
          />
        </div>
      </div>
    );
  }

  if (view === 'editor' && guide) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
            <BookOpen size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base">GuideSnap</span>
          <span className="text-gray-300">·</span>
          <span className="text-sm text-gray-500 truncate">{guide.title}</span>
        </div>

        <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <StepEditor
              guide={guide}
              initialSteps={steps}
              large
              onBack={() => setView('guides')}
              onExport={(g, s) => {
                setGuide(g);
                setSteps(s);
                setView('export');
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Guides list view
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <BookOpen size={14} className="text-white" />
        </div>
        <span className="font-bold text-gray-900 text-base">GuideSnap</span>
      </div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <GuidesListView
            onBack={() => chrome.tabs.getCurrent((tab) => { if (tab?.id) chrome.tabs.remove(tab.id); })}
            onEditGuide={openEditor}
            onExportGuide={openExport}
          />
        </div>
      </div>
    </div>
  );
}
