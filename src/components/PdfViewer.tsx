import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  fileName?: string | null;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, fileName }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Load PDF document
  useEffect(() => {
    if (!url || typeof url !== 'string' || !url.trim()) {
      setIsLoading(false);
      setError('The PDF preview could not be displayed. Use Open PDF in New Tab to review the original document.');
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setPdfDoc(null);
    setPageNum(1);

    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    try {
      let source: { url?: string; data?: Uint8Array } = { url };

      if (url.includes(';base64,')) {
        try {
          const rawBase64 = url.split(',')[1] || '';
          const cleanedBase64 = rawBase64.replace(/\s/g, '');
          const binaryString = window.atob(cleanedBase64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          source = { data: bytes };
        } catch (e) {
          console.warn('PDF base64 decode fallback to URL:', e);
          source = { url };
        }
      }

      loadingTask = pdfjsLib.getDocument(source as any);
    } catch (err) {
      console.error('Error initializing PDF document loading task:', err);
      setError('The PDF preview could not be displayed. Use Open PDF in New Tab to review the original document.');
      setIsLoading(false);
      return;
    }

    loadingTask.promise
      .then((doc) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error loading PDF with pdfjs-dist:', err);
        setError('The PDF preview could not be displayed. Use Open PDF in New Tab to review the original document.');
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      try {
        loadingTask?.destroy();
      } catch {
        // ignore cleanup error
      }
    };
  }, [url]);

  // Render current page onto canvas whenever pageNum, scale, or pdfDoc changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isMounted = true;

    // Cancel any previous active render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    pdfDoc
      .getPage(pageNum)
      .then((page) => {
        if (!isMounted || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        return renderTask.promise;
      })
      .catch((err) => {
        if (err?.name === 'RenderingCancelledException') {
          // Expected cancellation when switching page or scale quickly
          return;
        }
        if (isMounted) {
          console.error('Error rendering PDF page:', err);
          setError('The PDF preview could not be displayed. Use Open PDF in New Tab to review the original document.');
        }
      });

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNum, scale]);

  const handlePrevPage = () => setPageNum((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setPageNum((prev) => Math.min(prev + 1, numPages));
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.6));

  return (
    <div className="w-full h-full flex flex-col min-h-0 relative bg-slate-100">
      {/* PDF Controls Sub-toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-10">
        {/* Page Navigation */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={pageNum <= 1 || isLoading || !!error}
            className="p-1 rounded text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-medium text-slate-600 px-1 select-none">
            Page <span className="font-bold text-slate-800">{numPages > 0 ? pageNum : 0}</span> of{' '}
            <span className="font-bold text-slate-800">{numPages}</span>
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={pageNum >= numPages || isLoading || !!error}
            className="p-1 rounded text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.6 || isLoading || !!error}
            className="p-1 rounded text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-slate-500 min-w-[36px] text-center select-none">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 2.5 || isLoading || !!error}
            className="p-1 rounded text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Open in New Tab Button */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold transition"
          title="Open PDF in new browser tab"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open PDF in New Tab</span>
        </a>
      </div>

      {/* PDF Canvas Viewport Area */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-4 flex items-center justify-center relative min-h-[500px]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-700">Loading document preview…</p>
          </div>
        )}

        {error ? (
          <div className="p-6 text-center flex flex-col items-center justify-center space-y-3 bg-white rounded-lg border border-slate-200 max-w-md mx-auto shadow-xs my-auto">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              The PDF preview could not be displayed. Use Open PDF in New Tab to review the original document.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open PDF in New Tab</span>
            </a>
          </div>
        ) : (
          <canvas ref={canvasRef} className="shadow-md rounded bg-white max-w-full my-auto" />
        )}
      </div>
    </div>
  );
};
