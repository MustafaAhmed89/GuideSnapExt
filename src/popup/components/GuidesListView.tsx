import { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Pencil, Download, Trash2 } from 'lucide-react';
import { listGuides, deleteGuide } from '../../shared/storage';
import type { Guide } from '../../shared/types';

interface Props {
  onBack: () => void;
  onEditGuide: (guide: Guide) => void;
  onExportGuide: (guide: Guide) => void;
}

export function GuidesListView({ onBack, onEditGuide, onExportGuide }: Props) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuides();
  }, []);

  async function loadGuides() {
    setLoading(true);
    const all = await listGuides();
    setGuides(all);
    setLoading(false);
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="font-semibold text-gray-900 text-sm flex-1">Saved Guides</h2>
        {!loading && (
          <span className="text-xs text-gray-400">{guides.length} guide{guides.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
        ) : guides.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No guides yet</p>
            <p className="text-xs mt-1">Go back and click "+ Add New" to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
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
    <div className="flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
      {/* Icon */}
      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-brand-50 flex items-center justify-center">
        <BookOpen size={13} className="text-brand-500" />
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <p className="text-sm font-medium text-gray-800 truncate leading-tight">{guide.title}</p>
        <p className="text-[11px] text-gray-400 leading-tight">
          {guide.stepIds.length} step{guide.stepIds.length !== 1 ? 's' : ''} · {formatDate(guide.updatedAt)}
        </p>
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={onEdit}
          title="Edit"
          className="p-1.5 rounded-md text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={onExport}
          title="Export"
          className="p-1.5 rounded-md text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
        >
          <Download size={13} />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
