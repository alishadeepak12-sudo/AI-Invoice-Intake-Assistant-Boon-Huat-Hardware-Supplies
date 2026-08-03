import React from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Database } from 'lucide-react';

interface ConfirmationPanelProps {
  hasCompared: boolean;
  onComparedChange: (checked: boolean) => void;
  isConfirmed: boolean;
  onConfirm: () => void;
  onReset: () => void;
  isLoading: boolean;
  isSavingToSheets: boolean;
  saveError: string | null;
  onRetrySave: () => void;
  savedRecordId: string | null;
  hasDocument: boolean;
  canConfirm: boolean;
  canConfirmWarningReason?: string;
  humanDecision?: string;
  reviewerName?: string;
}

export const ConfirmationPanel: React.FC<ConfirmationPanelProps> = ({
  hasCompared,
  onComparedChange,
  isConfirmed,
  onConfirm,
  onReset,
  isLoading,
  isSavingToSheets,
  saveError,
  onRetrySave,
  savedRecordId,
  hasDocument,
  canConfirm,
  canConfirmWarningReason,
  humanDecision,
  reviewerName,
}) => {
  const reviewerDisplay = reviewerName?.trim() || 'Madam Lim';
  const isHold = humanDecision === 'HOLD' || humanDecision === 'ON_HOLD';

  return (
    <div className="space-y-3">
      {/* Save Error Banner with Retry Button */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 flex items-start space-x-3 text-red-900 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-red-950 uppercase tracking-wider text-[10px] block mb-0.5">
              Google Sheets Write Error
            </span>
            <p className="text-red-800">{saveError}</p>
            <p className="text-slate-600 text-[11px] mt-1">
              Your edits and extracted information remain intact on screen. You can retry writing to Google Sheets below.
            </p>
            <button
              type="button"
              onClick={onRetrySave}
              className="mt-2 inline-flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded uppercase tracking-wider transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Save to Sheets</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Card / Footer */}
      <footer className="bg-slate-900 text-white p-4 px-6 sm:px-8 rounded-xl shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="compare-check"
              checked={hasCompared}
              onChange={(e) => onComparedChange(e.target.checked)}
              disabled={!hasDocument || isLoading || isSavingToSheets || isConfirmed}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-offset-slate-900 cursor-pointer disabled:opacity-40"
            />
            <label htmlFor="compare-check" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
              I have compared the extracted information with the original invoice. <span className="text-red-400">*</span>
            </label>
          </div>
          <p className="text-[10px] text-slate-400 italic uppercase tracking-wider">
            AI may misread unclear or handwritten invoices. Always compare with the original document before confirming.
          </p>

          {/* Validation Warning Hint if button disabled */}
          {!canConfirm && hasCompared && canConfirmWarningReason && !isConfirmed && (
            <p className="text-[11px] text-amber-300 font-medium">
              ⚠️ {canConfirmWarningReason}
            </p>
          )}

          {/* Confirmation & Save Status Success Message */}
          {isConfirmed && (
            <div className={`flex flex-col space-y-0.5 text-xs font-semibold mt-1 ${isHold ? 'text-amber-300' : 'text-emerald-400'}`}>
              <div className="flex items-center space-x-1.5">
                {isHold ? (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>
                  {isHold
                    ? `Invoice placed on hold by ${reviewerDisplay}. Further review is required before it can proceed.`
                    : humanDecision === 'CONFIRM_DUPLICATE'
                    ? `Invoice flagged as duplicate by ${reviewerDisplay}. Record saved for historical tracking.`
                    : `Information verified & confirmed for Boon Huat records by ${reviewerDisplay}.`}
                </span>
              </div>
              {savedRecordId && (
                <div className={`flex items-center space-x-1 text-[11px] font-mono ml-5 ${isHold ? 'text-amber-200' : 'text-emerald-300'}`}>
                  <Database className="w-3 h-3 text-emerald-400" />
                  <span>Recorded in Invoice Register (ID: {savedRecordId}{isHold ? ' | Status: ON_HOLD' : ''})</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 w-full md:w-auto">
          <div className="text-left md:text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
              Responsible AP Practice
            </p>
            <p className="text-[10px] text-slate-400">
              Standardises confirmed invoice information for the Invoice Register and the next-stage Three-Way Matching Assistant.
            </p>
          </div>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm || isLoading || isSavingToSheets || isConfirmed || !hasDocument}
            className={`px-6 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center space-x-2 ${
              isConfirmed
                ? 'bg-emerald-700 text-white cursor-default border border-emerald-600'
                : canConfirm && !isLoading && !isSavingToSheets
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer border border-indigo-500 shadow-md'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            {isSavingToSheets ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to Sheets...</span>
              </>
            ) : isConfirmed ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmed &amp; Saved</span>
              </>
            ) : (
              <span>Confirm Extracted Information</span>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};
