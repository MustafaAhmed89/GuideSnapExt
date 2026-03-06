import { useState, useRef } from 'react';
import { ArrowLeft, FileText, Code2, Archive, FileType2, Download, Upload, X } from 'lucide-react';
import { exportToPDF, exportToHTML, exportToZIP, exportToDOCX } from '../../utils/export';
import type { Guide, RecordedStep } from '../../shared/types';

interface Props {
  guide: Guide;
  steps: RecordedStep[];
  onBack: () => void;
}

type Format = 'pdf' | 'html' | 'zip' | 'docx';

export function ExportPanel({ guide, steps, onBack }: Props) {
  const [format, setFormat] = useState<Format>('pdf');
  const [includeDescriptions, setIncludeDescriptions] = useState(true);
  const [includeStepNumbers, setIncludeStepNumbers] = useState(true);
  const [useAnnotated, setUseAnnotated] = useState(true);
  const [headerImage, setHeaderImage] = useState<string | undefined>(undefined);
  const [footerText, setFooterText] = useState('');
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setHeaderImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeHeaderImage() {
    setHeaderImage(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleExport() {
    setExporting(true);
    try {
      const options = {
        includeDescriptions,
        includeStepNumbers,
        useAnnotated,
        headerImage: headerImage,
        footerText: footerText.trim() || undefined,
      };
      if (format === 'pdf') await exportToPDF(guide, steps, options);
      else if (format === 'html') exportToHTML(guide, steps, options);
      else if (format === 'zip') await exportToZIP(guide, steps, options);
      else if (format === 'docx') await exportToDOCX(guide, steps, options);
    } finally {
      setExporting(false);
    }
  }

  const formats: { id: Format; label: string; desc: string; Icon: typeof FileText }[] = [
    { id: 'pdf', label: 'PDF Document', desc: 'A4 landscape, one step per page', Icon: FileText },
    { id: 'docx', label: 'Word Document', desc: '.docx — opens in Microsoft Word', Icon: FileType2 },
    { id: 'html', label: 'Interactive HTML', desc: 'Self-contained single file with sidebar', Icon: Code2 },
    { id: 'zip', label: 'Image ZIP', desc: 'PNG images + guide.json', Icon: Archive },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Export Guide</h2>
          <p className="text-xs text-gray-400">{steps.length} steps · {guide.title}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
        {/* Format */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Format</h3>
          <div className="space-y-2">
            {formats.map(({ id, label, desc, Icon }) => (
              <label
                key={id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  format === id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={id}
                  checked={format === id}
                  onChange={() => setFormat(id)}
                  className="sr-only"
                />
                <Icon size={18} className={format === id ? 'text-brand-500' : 'text-gray-400'} />
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Header image + footer — only for PDF & DOCX */}
        {(format === 'pdf' || format === 'docx') && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Branding <span className="normal-case font-normal text-gray-400">(optional)</span>
            </h3>
            <div className="space-y-3">
              {/* Header image upload */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Header logo / image</p>
                {headerImage ? (
                  <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
                    <img
                      src={headerImage}
                      alt="Header preview"
                      className="h-8 max-w-[120px] object-contain rounded"
                    />
                    <button
                      onClick={removeHeaderImage}
                      className="ml-auto p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors"
                  >
                    <Upload size={13} />
                    Upload image (PNG, JPG, SVG)
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="sr-only"
                  onChange={handleImageUpload}
                />
              </div>

              {/* Footer text */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Footer text</p>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="e.g. © 2025 Acme Corp · Confidential"
                  maxLength={120}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 placeholder-gray-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Options */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Options</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDescriptions}
                onChange={(e) => setIncludeDescriptions(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <span className="text-sm text-gray-700">Include step descriptions</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStepNumbers}
                onChange={(e) => setIncludeStepNumbers(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <span className="text-sm text-gray-700">Include step numbering</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useAnnotated}
                onChange={(e) => setUseAnnotated(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-500"
              />
              <span className="text-sm text-gray-700">Use annotated screenshots</span>
            </label>
          </div>
        </div>

        {/* Preview summary */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 font-medium mb-1">Export summary</p>
          <p className="text-xs text-gray-600">
            {steps.length} step{steps.length !== 1 ? 's' : ''} ·{' '}
            {useAnnotated ? 'Annotated' : 'Raw'} screenshots ·{' '}
            {includeStepNumbers ? 'Numbered' : 'No numbering'} ·{' '}
            {includeDescriptions ? 'With' : 'Without'} descriptions
            {(format === 'pdf' || format === 'docx') && headerImage ? ' · Custom header logo' : ''}
            {(format === 'pdf' || format === 'docx') && footerText.trim() ? ' · Footer included' : ''}
          </p>
        </div>
      </div>

      {/* Export button */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
        <button
          onClick={handleExport}
          disabled={exporting || steps.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          <Download size={16} />
          {exporting ? 'Exporting…' : `Export as ${format.toUpperCase()}`}
        </button>
        {steps.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-2">No steps to export</p>
        )}
      </div>
    </div>
  );
}
