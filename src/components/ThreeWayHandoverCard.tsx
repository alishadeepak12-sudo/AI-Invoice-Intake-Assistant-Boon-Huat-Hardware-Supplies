import React, { useState } from 'react';
import { Download, CheckCircle2, AlertTriangle, ArrowRight, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { ExtractedInvoice, DuplicateCheckResult, HumanDecision } from '../types';
import { evaluateFieldStatus } from '../utils/calculationValidation';

interface ThreeWayHandoverCardProps {
  invoice: ExtractedInvoice | null;
  savedRecordId: string | null;
  fileName: string | null;
  isConfirmed: boolean;
  hasCompared: boolean;
  reviewerName: string;
  duplicateResult: DuplicateCheckResult | null;
  isCheckingDuplicates: boolean;
  humanDecision: HumanDecision;
  decisionReason: string;
}

export function checkCanDownloadForThreeWayMatching(
  invoice: ExtractedInvoice | null,
  isConfirmed: boolean,
  hasCompared: boolean,
  reviewerName: string,
  duplicateResult: DuplicateCheckResult | null,
  isCheckingDuplicates: boolean,
  humanDecision: HumanDecision,
  decisionReason: string
): { canDownload: boolean; reason: string } {
  if (!invoice) {
    return { canDownload: false, reason: 'No invoice loaded.' };
  }

  // 1. Confirm Extracted Information must be completed
  if (!isConfirmed) {
    return { canDownload: false, reason: 'Please complete "Confirm Extracted Information" above first.' };
  }

  // 2. Human comparison checkbox must be ticked
  if (!hasCompared) {
    return { canDownload: false, reason: 'Human document comparison check must be completed.' };
  }

  // 3. Reviewer name must be entered
  if (!reviewerName || !reviewerName.trim()) {
    return { canDownload: false, reason: 'Reviewer name is required.' };
  }

  // 4. Do NOT enable when invoice is placed on hold
  if (humanDecision === 'HOLD') {
    return { canDownload: false, reason: 'Invoice is placed on hold. Invoices on hold cannot be downloaded for Three-Way Matching.' };
  }

  // 5. Do NOT enable when confirmed as duplicate
  if (humanDecision === 'CONFIRM_DUPLICATE') {
    return { canDownload: false, reason: 'Invoice is confirmed as a duplicate. Duplicate invoices cannot be handed over for Three-Way Matching.' };
  }

  // 6. Duplicate checking must be completed
  if (isCheckingDuplicates) {
    return { canDownload: false, reason: 'Duplicate checking is currently in progress.' };
  }

  const dupStatus = duplicateResult?.status;
  const isDuplicateFlagged = dupStatus === 'EXACT_DUPLICATE' || dupStatus === 'POSSIBLE_DUPLICATE';

  if (isDuplicateFlagged) {
    if (humanDecision !== 'NOT_DUPLICATE') {
      return { canDownload: false, reason: 'A duplicate warning was flagged. Madam Lim must select "Mark it as not a duplicate" with written justification.' };
    }
    const cleanReason = decisionReason.trim().replace(/\s+/g, ' ');
    if (cleanReason.length < 10) {
      return { canDownload: false, reason: 'Written justification of at least 10 characters is required to resolve the duplicate warning.' };
    }
  }

  // 7. Check required fields completion
  const suppStatus = evaluateFieldStatus(invoice.supplierName);
  const invNumStatus = evaluateFieldStatus(invoice.invoiceNumber);
  const invDateStatus = evaluateFieldStatus(invoice.invoiceDate);
  const dueDateStatus = evaluateFieldStatus(invoice.dueDate);
  const poRefStatus = evaluateFieldStatus(invoice.poReference);
  const currStatus = evaluateFieldStatus(invoice.currency);
  const totalStatus = evaluateFieldStatus(invoice.totalDue, true);

  let isComplete =
    suppStatus === 'CLEAR' &&
    invNumStatus === 'CLEAR' &&
    invDateStatus === 'CLEAR' &&
    dueDateStatus === 'CLEAR' &&
    poRefStatus === 'CLEAR' &&
    currStatus === 'CLEAR' &&
    totalStatus === 'CLEAR';

  if (!invoice.lineItems || invoice.lineItems.length === 0) {
    isComplete = false;
  } else {
    for (const item of invoice.lineItems) {
      if (
        evaluateFieldStatus(item.description) !== 'CLEAR' ||
        evaluateFieldStatus(item.quantity, true) !== 'CLEAR' ||
        evaluateFieldStatus(item.unitPrice, true) !== 'CLEAR' ||
        evaluateFieldStatus(item.lineAmount, true) !== 'CLEAR'
      ) {
        isComplete = false;
        break;
      }
    }
  }

  if (!isComplete) {
    return { canDownload: false, reason: 'Required fields remain missing or unresolved.' };
  }

  // 8. Check arithmetic validity
  let isArithmeticValid = true;
  if (invoice.lineItems && invoice.lineItems.length > 0) {
    for (const item of invoice.lineItems) {
      const qty = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const statedLineAmt = Number(item.lineAmount) || 0;
      const calcLineAmt = Math.round(qty * unitPrice * 100) / 100;
      if (Math.abs(calcLineAmt - statedLineAmt) > 0.01) {
        isArithmeticValid = false;
        break;
      }
    }

    const lineTotalSum = invoice.lineItems.reduce((sum, item) => sum + (Number(item.lineAmount) || 0), 0);
    const roundedLineSum = Math.round(lineTotalSum * 100) / 100;
    const statedTotal = Number(invoice.totalDue) || 0;
    if (Math.abs(roundedLineSum - statedTotal) > 0.01) {
      isArithmeticValid = false;
    }
  }

  if (!isArithmeticValid) {
    return { canDownload: false, reason: 'Invoice arithmetic differences remain unresolved.' };
  }

  return { canDownload: true, reason: '' };
}

export function generateThreeWayMatchingCsv(
  invoice: ExtractedInvoice,
  savedRecordId: string | null,
  fileName: string | null,
  duplicateResult: DuplicateCheckResult | null,
  humanDecision: HumanDecision,
  decisionReason: string,
  reviewerName: string
): string {
  const headers = [
    'Invoice Record ID',
    'Source File Name',
    'Supplier Name',
    'Invoice Number',
    'Invoice Date',
    'Due Date',
    'PO Reference',
    'Currency',
    'Total Due',
    'Line Number',
    'Item Description',
    'Line PO Reference',
    'Quantity',
    'Unit Price',
    'Line Amount',
    'Extraction Status',
    'Validation Status',
    'Duplicate Status',
    'Human Decision',
    'Review Notes',
    'Reviewed By',
    'Next Stage Status',
  ];

  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = [headers.map(escapeCell).join(',')];

  const recId = savedRecordId || 'BH-REC-CONFIRMED';
  const srcFile = fileName || 'invoice.pdf';
  const suppName = invoice.supplierName || '';
  const invNum = invoice.invoiceNumber || '';
  const invDate = invoice.invoiceDate || '';
  const dueDate = invoice.dueDate || '';
  const poRef = invoice.poReference || '';
  const curr = invoice.currency || 'SGD';
  const totDue = typeof invoice.totalDue === 'number' ? invoice.totalDue.toFixed(2) : String(invoice.totalDue || '0.00');

  const extStatus = invoice.extractionStatus || 'READY_FOR_REVIEW';
  const valStatus = 'VALIDATED';
  const dupStatus = duplicateResult?.status || 'NO_DUPLICATE_FOUND';
  const humDecision = humanDecision === 'NONE' ? 'NO_DUPLICATE_FOUND' : humanDecision;
  const revNotes =
    humanDecision === 'CONFIRM_DUPLICATE'
      ? 'Duplicate confirmed after comparison with the historical invoice record.'
      : decisionReason || '';
  const revBy = reviewerName || 'Madam Lim';
  const nextStage = 'READY_FOR_THREE_WAY_MATCHING';

  if (invoice.lineItems && invoice.lineItems.length > 0) {
    invoice.lineItems.forEach((item, idx) => {
      const lineNum = idx + 1;
      const desc = item.description || '';
      const linePo = item.poReference || poRef;
      const qty = item.quantity;
      const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice.toFixed(2) : String(item.unitPrice || '0.00');
      const lineAmt = typeof item.lineAmount === 'number' ? item.lineAmount.toFixed(2) : String(item.lineAmount || '0.00');

      const rowValues = [
        recId,
        srcFile,
        suppName,
        invNum,
        invDate,
        dueDate,
        poRef,
        curr,
        totDue,
        lineNum,
        desc,
        linePo,
        qty,
        unitPrice,
        lineAmt,
        extStatus,
        valStatus,
        dupStatus,
        humDecision,
        revNotes,
        revBy,
        nextStage,
      ];
      rows.push(rowValues.map(escapeCell).join(','));
    });
  } else {
    const rowValues = [
      recId,
      srcFile,
      suppName,
      invNum,
      invDate,
      dueDate,
      poRef,
      curr,
      totDue,
      1,
      'General Invoice Total',
      poRef,
      1,
      totDue,
      totDue,
      extStatus,
      valStatus,
      dupStatus,
      humDecision,
      revNotes,
      revBy,
      nextStage,
    ];
    rows.push(rowValues.map(escapeCell).join(','));
  }

  return rows.join('\n');
}

export const ThreeWayHandoverCard: React.FC<ThreeWayHandoverCardProps> = ({
  invoice,
  savedRecordId,
  fileName,
  isConfirmed,
  hasCompared,
  reviewerName,
  duplicateResult,
  isCheckingDuplicates,
  humanDecision,
  decisionReason,
}) => {
  const [downloaded, setDownloaded] = useState(false);

  const { canDownload, reason } = checkCanDownloadForThreeWayMatching(
    invoice,
    isConfirmed,
    hasCompared,
    reviewerName,
    duplicateResult,
    isCheckingDuplicates,
    humanDecision,
    decisionReason
  );

  const handleDownload = () => {
    if (!invoice || !canDownload) return;

    const csvContent = generateThreeWayMatchingCsv(
      invoice,
      savedRecordId,
      fileName,
      duplicateResult,
      humanDecision,
      decisionReason,
      reviewerName
    );

    const cleanInvNum = (invoice.invoiceNumber || 'Invoice').replace(/[/\\?%*:|"<>]/g, '-').trim();
    const downloadFileName = `${cleanInvNum}_Three_Way_Matching.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', downloadFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
  };

  if (!invoice) return null;

  return (
    <div className="bg-white rounded-xl border border-indigo-100 p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <span>Next Stage: AI Three-Way Matching Handover</span>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-mono font-semibold">
                STAGE 3
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Export Madam Lim’s confirmed invoice data formatted for PO &amp; Delivery Order reconciliation.
            </p>
          </div>
        </div>

        {/* Download Button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={!canDownload}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shrink-0 ${
            canDownload
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm hover:shadow-md'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Download for Three-Way Matching</span>
        </button>
      </div>

      {/* Helper text or Warning explaining why disabled */}
      {!canDownload && reason && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-0.5">
              Handover Prerequisites
            </span>
            <p className="text-[11px] text-slate-600">{reason}</p>
          </div>
        </div>
      )}

      {/* Success Notification Message after download */}
      {downloaded && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-start space-x-3 text-emerald-950 text-xs shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-900 block">
              Handover File Downloaded
            </span>
            <p className="font-semibold text-emerald-800 text-xs">
              “Confirmed invoice information is ready for the Three-Way Matching Assistant.”
            </p>
            <p className="text-[10px] text-emerald-700 font-mono mt-1">
              File: {invoice.invoiceNumber?.replace(/[/\\?%*:|"<>]/g, '-')}_Three_Way_Matching.csv
            </p>
          </div>
        </div>
      )}

      {/* Process note */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
        <span className="flex items-center space-x-1">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>Formatted with 22 standardised data columns including line-item references.</span>
        </span>
        <span className="hidden sm:inline italic">Does not perform matching inside this intake tool.</span>
      </div>
    </div>
  );
};
