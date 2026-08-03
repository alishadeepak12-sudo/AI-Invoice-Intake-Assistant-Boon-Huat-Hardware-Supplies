import React from 'react';
import {
  DuplicateStatus,
  DuplicateCheckResult,
  HumanDecision,
} from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CopyCheck,
  UserCheck,
  Info,
  Database,
  Upload,
} from 'lucide-react';

interface DuplicateCheckerCardProps {
  checkResult: DuplicateCheckResult | null;
  isChecking: boolean;
  checkError: string | null;
  onRetryCheck: () => void;
  humanDecision: HumanDecision;
  onDecisionChange: (decision: HumanDecision) => void;
  decisionReason: string;
  onReasonChange: (reason: string) => void;
  reviewerName: string;
  onReviewerNameChange: (name: string) => void;
  isDatabaseLoaded: boolean;
  onTriggerCsvUpload?: () => void;
}

export const DuplicateCheckerCard: React.FC<DuplicateCheckerCardProps> = ({
  checkResult,
  isChecking,
  checkError,
  onRetryCheck,
  humanDecision,
  onDecisionChange,
  decisionReason,
  onReasonChange,
  reviewerName,
  onReviewerNameChange,
  isDatabaseLoaded,
  onTriggerCsvUpload,
}) => {
  if (isChecking) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex items-center space-x-3 text-xs text-slate-700 mb-6">
        <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
        <div>
          <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
            Performing Stage 2 Duplicate Check...
          </span>
          <span className="text-slate-500">Checking against loaded Historical Invoice Register CSV records.</span>
        </div>
      </div>
    );
  }

  const status: DuplicateStatus = checkResult?.status || (isDatabaseLoaded ? 'NO_DUPLICATE_FOUND' : 'DATABASE_NOT_LOADED');
  const matchedRec = checkResult?.matchedRecord;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mb-6">
      {/* Header Banner */}
      <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-[11px]">
          <CopyCheck className="w-4 h-4 text-amber-400" />
          <span>Stage 2 — Duplicate Checking Result</span>
        </div>
        {isDatabaseLoaded && (
          <button
            type="button"
            onClick={onRetryCheck}
            className="text-[10px] text-slate-300 hover:text-white flex items-center space-x-1 font-semibold uppercase tracking-wider"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Re-check</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Status Callout Box */}
        {status === 'DATABASE_NOT_LOADED' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wider text-[11px] block text-amber-900 mb-0.5">
                  Invoice Register Not Loaded
                </span>
                <p className="font-medium text-amber-900 leading-relaxed">
                  “Invoice extraction completed. Upload the Invoice Register CSV to perform duplicate checking.”
                </p>
              </div>
            </div>
            {onTriggerCsvUpload && (
              <button
                type="button"
                onClick={onTriggerCsvUpload}
                className="px-3.5 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-amber-300" />
                <span>Upload CSV</span>
              </button>
            )}
          </div>
        )}

        {status === 'NO_DUPLICATE_FOUND' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-xs text-emerald-950 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[11px] block text-emerald-900 mb-0.5">
                NO DUPLICATE FOUND
              </span>
              <p className="font-medium text-emerald-800">
                “No duplicate was found in the current Invoice Register.”
              </p>
            </div>
          </div>
        )}

        {status === 'EXACT_DUPLICATE' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-950 flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[11px] block text-red-900 mb-0.5">
                EXACT DUPLICATE DETECTED
              </span>
              <p className="font-semibold text-red-900">
                “An invoice with the same supplier name and invoice number already exists in the Invoice Register.”
              </p>
            </div>
          </div>
        )}

        {status === 'POSSIBLE_DUPLICATE' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-950 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-[11px] block text-amber-900 mb-0.5">
                POSSIBLE DUPLICATE WARNING
              </span>
              <p className="font-semibold text-amber-900">
                “This invoice shares several details with a previous invoice. Madam Lim must compare both records.”
              </p>
              {checkResult?.matchedDetails && checkResult.matchedDetails.length > 0 && (
                <div className="mt-1 text-[11px] text-amber-800">
                  <span className="font-bold">Matching Criteria Identified: </span>
                  {checkResult.matchedDetails.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'CHECK_ERROR' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-950 flex items-start space-x-3">
            <Info className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="font-bold uppercase tracking-wider text-[11px] block text-red-900 mb-0.5">
                DUPLICATE CHECK ERROR
              </span>
              <p className="text-red-900 font-medium">
                An error occurred while checking for duplicates against the historical register.
              </p>
              {checkError && <p className="text-red-700 text-[11px] mt-0.5">{checkError}</p>}
              <button
                type="button"
                onClick={onRetryCheck}
                className="mt-2 px-3.5 py-1.5 bg-red-900 hover:bg-red-800 text-white text-xs font-bold rounded uppercase tracking-wider"
              >
                Retry Check
              </button>
            </div>
          </div>
        )}

        {/* Matched Record Comparison (for Exact / Possible Duplicate) */}
        {matchedRec && (status === 'EXACT_DUPLICATE' || status === 'POSSIBLE_DUPLICATE') && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Historical Invoice Record Comparison ({matchedRec.invoiceRecordId || 'Registered Record'})
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Supplier Name</span>
                <span className="font-semibold text-slate-900">{matchedRec.supplierName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Invoice Number</span>
                <span className="font-mono font-bold text-indigo-700">{matchedRec.invoiceNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Invoice Date</span>
                <span className="font-mono text-slate-800">{matchedRec.invoiceDate || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">PO Reference</span>
                <span className="font-mono text-slate-800">{matchedRec.poReference || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Total Due</span>
                <span className="font-mono font-bold text-slate-900">
                  {matchedRec.currency || 'SGD'} {(Number(matchedRec.totalDue) || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Previous Human Decision</span>
                <span className="font-semibold text-slate-800">{matchedRec.humanDecision || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Human Review Decision Controls */}
        <div className="border-t border-slate-200 pt-3.5 space-y-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Madam Lim's Review &amp; Duplicate Decision <span className="text-red-500">*</span></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <label
              className={`p-2.5 border rounded-lg cursor-pointer flex items-center space-x-2 transition-all ${
                humanDecision === 'HOLD' || humanDecision === 'ON_HOLD'
                  ? 'bg-amber-50 border-amber-400 text-amber-950 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="humanDecision"
                value="HOLD"
                checked={humanDecision === 'HOLD' || humanDecision === 'ON_HOLD'}
                onChange={() => onDecisionChange('HOLD')}
                className="text-amber-600 focus:ring-amber-500"
              />
              <span>Place invoice on hold</span>
            </label>

            <label
              className={`p-2.5 border rounded-lg cursor-pointer flex items-center space-x-2 transition-all ${
                humanDecision === 'CONFIRM_DUPLICATE'
                  ? 'bg-red-50 border-red-400 text-red-950 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="humanDecision"
                value="CONFIRM_DUPLICATE"
                checked={humanDecision === 'CONFIRM_DUPLICATE'}
                onChange={() => onDecisionChange('CONFIRM_DUPLICATE')}
                className="text-red-600 focus:ring-red-500"
              />
              <span>Confirm it is a duplicate</span>
            </label>

            <label
              className={`p-2.5 border rounded-lg cursor-pointer flex items-center space-x-2 transition-all ${
                humanDecision === 'NOT_DUPLICATE'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="radio"
                name="humanDecision"
                value="NOT_DUPLICATE"
                checked={humanDecision === 'NOT_DUPLICATE'}
                onChange={() => onDecisionChange('NOT_DUPLICATE')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>Mark it as not a duplicate</span>
            </label>
          </div>

          {/* Place Invoice On Hold Textarea */}
          {(humanDecision === 'HOLD' || humanDecision === 'ON_HOLD') && (
            <div className="bg-amber-50/80 border border-amber-300 rounded-lg p-3 space-y-1.5">
              <label className="text-[10px] font-bold text-amber-950 uppercase tracking-wider block">
                Reason for placing invoice on hold <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-amber-800 font-medium">
                Explain what must be checked or resolved before this invoice can continue.
              </p>
              <textarea
                rows={2}
                value={decisionReason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="e.g. Unit price for galvanized steel angle brackets differs from PO quotation. Pending confirmation from purchasing team."
                className="w-full border border-amber-300 rounded p-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {decisionReason.trim().replace(/\s+/g, ' ').length < 10 && (
                <p className="text-[11px] text-red-600 font-semibold">
                  Please enter a reason for placing this invoice on hold.
                </p>
              )}
            </div>
          )}

          {/* Confirm Duplicate Automatic Note */}
          {humanDecision === 'CONFIRM_DUPLICATE' && (
            <div className="bg-red-50/80 border border-red-300 rounded-lg p-3 space-y-1">
              <span className="font-bold text-red-950 uppercase tracking-wider text-[10px] block">
                Automatic Review Note
              </span>
              <p className="text-[11px] text-red-900 font-medium italic">
                “Duplicate confirmed after comparison with the historical invoice record.”
              </p>
            </div>
          )}

          {/* Mark As Not Duplicate Textarea */}
          {humanDecision === 'NOT_DUPLICATE' && (
            <div className="bg-emerald-50/80 border border-emerald-300 rounded-lg p-3 space-y-1.5">
              <label className="text-[10px] font-bold text-emerald-950 uppercase tracking-wider block">
                Written Explanation / Justification <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-emerald-800 font-medium">
                Explain why this invoice is not a duplicate despite the warning.
              </p>
              <textarea
                rows={2}
                value={decisionReason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="e.g. Verified with Seng Tat; this invoice covers different materials under a separate purchase order."
                className="w-full border border-emerald-300 rounded p-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {decisionReason.trim().replace(/\s+/g, ' ').length < 10 && (
                <p className="text-[11px] text-red-600 font-semibold">
                  Please enter a written justification of at least 10 characters.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Reviewer Name Field */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
            Reviewer Name <span className="text-red-500">*</span>
          </label>
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => onReviewerNameChange(e.target.value)}
              placeholder="Madam Lim"
              className="w-full border border-slate-200 rounded px-2.5 py-1 text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
            />
            {!reviewerName.trim() && (
              <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                * Reviewer name is required.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
