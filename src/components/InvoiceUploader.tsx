import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, AlertCircle, FileUp, Sparkles, Check } from 'lucide-react';
import { SAMPLE_INVOICES, SampleInvoice } from '../data/sampleInvoices';

interface InvoiceUploaderProps {
  onFileSelect: (file: File) => void;
  onSampleSelect: (sample: SampleInvoice) => void;
  isLoading: boolean;
  selectedFileName?: string;
  error?: string | null;
}

export const InvoiceUploader: React.FC<InvoiceUploaderProps> = ({
  onFileSelect,
  onSampleSelect,
  isLoading,
  selectedFileName,
  error: parentError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

  const validateAndHandleFile = (file: File) => {
    setLocalError(null);
    const mime = file.type.toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase();

    const isValidMime = acceptedMimeTypes.includes(mime);
    const isValidExt = ['pdf', 'png', 'jpg', 'jpeg'].includes(ext || '');

    if (!isValidMime && !isValidExt) {
      setLocalError(`Unsupported file format ".${ext || 'unknown'}". Please upload a PDF, PNG, JPG, or JPEG invoice.`);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setLocalError('File size exceeds 20MB limit. Please upload a smaller file.');
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndHandleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndHandleFile(e.target.files[0]);
    }
  };

  const displayError = parentError || localError;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
            <FileUp className="w-5 h-5 text-slate-700" />
            <span>Upload Supplier Invoice</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload a supplier invoice to extract and standardise its information.
          </p>
        </div>

        <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start md:self-auto font-medium">
          Supported: <span className="font-semibold text-slate-700">PDF, PNG, JPG, JPEG</span> (Max 20MB)
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-150 ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]'
            : selectedFileName
            ? 'border-emerald-500 bg-emerald-50/40'
            : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            selectedFileName ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-indigo-600'
          }`}>
            {selectedFileName ? (
              <FileText className="w-5 h-5" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </div>

          <div>
            {selectedFileName ? (
              <div>
                <p className="text-xs font-semibold text-slate-900 flex items-center justify-center space-x-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Selected File: {selectedFileName}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click or drop another file to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-slate-700">
                  Drop invoice here or <span className="text-indigo-600 font-semibold underline underline-offset-2">browse</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PDF, PNG, JPG, JPEG (Max 20MB)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner if invalid file */}
      {displayError && (
        <div className="mt-3.5 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start space-x-2.5 text-xs text-rose-800 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Upload Error</span>
            <span>{displayError}</span>
          </div>
        </div>
      )}

      {/* Sample Invoices Quick Selector */}
      <div className="mt-5 pt-4 border-t border-slate-200">
        <div className="flex items-center space-x-2 mb-2.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Quick Demo Invoices (Click to load test file)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SAMPLE_INVOICES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSampleSelect(sample);
              }}
              disabled={isLoading}
              className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg p-2.5 transition-all text-xs group focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-800 truncate group-hover:text-slate-900">
                  {sample.title}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                    sample.badgeColor === 'green'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : sample.badgeColor === 'amber'
                      ? 'bg-amber-100 text-amber-900 border-amber-200'
                      : 'bg-blue-100 text-blue-900 border-blue-200'
                  }`}
                >
                  {sample.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{sample.subtitle}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
