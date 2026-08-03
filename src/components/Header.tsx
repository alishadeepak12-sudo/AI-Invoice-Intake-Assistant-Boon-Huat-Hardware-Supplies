import React from 'react';
import { UserCheck, ShieldCheck, Wrench } from 'lucide-react';

interface HeaderProps {
  onReset?: () => void;
  onExtract?: () => void;
  isLoading?: boolean;
  hasDocument?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  onExtract,
  isLoading,
  hasDocument,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 font-bold">
          <Wrench className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
              Boon Huat Smart Invoice Capture
            </h1>
            <span className="hidden md:inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">
              Boon Huat Hardware &amp; Supplies
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Upload a supplier invoice to extract and standardise its information.
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 self-end sm:self-auto">
        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 font-medium">
          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Reviewer: <strong className="text-slate-800 font-semibold">Madam Lim</strong></span>
        </div>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Reset
          </button>
        )}

        {onExtract && (
          <button
            type="button"
            onClick={onExtract}
            disabled={isLoading || !hasDocument}
            className="px-4 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Extracting...' : 'Extract Invoice'}
          </button>
        )}
      </div>
    </header>
  );
};

