import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, FileText, Eye, ExternalLink } from 'lucide-react';
import { PdfViewer } from './PdfViewer';

interface InvoicePreviewProps {
  previewUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  previewUrl,
  fileUrl,
  fileName,
  mimeType,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const effectiveUrl = previewUrl || fileUrl;

  const isPdf =
    mimeType?.toLowerCase().includes('pdf') ||
    fileName?.toLowerCase().endsWith('.pdf') ||
    (effectiveUrl?.startsWith('blob:') && mimeType === 'application/pdf');

  if (!effectiveUrl) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 h-[650px] max-h-[75vh] flex flex-col items-center justify-center text-center text-slate-400 shadow-xs">
        <FileText className="w-10 h-10 stroke-[1.25] text-slate-300 mb-2.5" />
        <p className="text-sm font-semibold text-slate-700">No Document Selected</p>
        <p className="text-xs text-slate-400 max-w-xs mt-1">
          Upload or select a supplier invoice to view the original document here for side-by-side verification.
        </p>
      </div>
    );
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden w-full ${
      isFullscreen
        ? 'fixed inset-4 z-50 shadow-2xl border-slate-400'
        : 'min-h-[650px] max-h-[75vh] h-[650px]'
    }`}>
      {/* Document Header Toolbar */}
      <div className="bg-white text-slate-800 px-4 py-2.5 flex items-center justify-between border-b border-slate-200 shrink-0 gap-2">
        <div className="flex items-center space-x-2 truncate pr-2">
          <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 truncate" title={fileName || 'Original Document'}>
            {fileName || 'Original Invoice'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                title="Zoom Out"
                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 disabled:opacity-40 transition cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-500 px-1 select-none">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 2.5}
                title="Zoom In"
                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 disabled:opacity-40 transition cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="Rotate 90°"
                className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition ml-0.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand View'}
            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition ml-0.5 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Document View Area */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col relative bg-slate-100">
        {isPdf ? (
          <PdfViewer url={effectiveUrl} fileName={fileName} />
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-auto p-4 flex items-center justify-center">
            <img
              src={effectiveUrl}
              alt="Original Supplier Invoice"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out',
              }}
              className="max-w-full max-h-full object-contain rounded shadow-xs bg-white origin-center"
            />
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2 text-[11px] text-slate-600 flex items-center justify-between shrink-0">
        <span className="font-semibold text-slate-700">Original Invoice Document</span>
        {isPdf ? (
          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-bold transition"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open PDF in New Tab</span>
          </a>
        ) : (
          <span className="font-mono text-slate-500">Cross-check fields on right</span>
        )}
      </div>
    </div>
  );
};


