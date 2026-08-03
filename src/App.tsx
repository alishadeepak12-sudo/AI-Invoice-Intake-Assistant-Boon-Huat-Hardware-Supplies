import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { NoticeBanner } from './components/NoticeBanner';
import { HistoricalRegisterSection } from './components/HistoricalRegisterSection';
import { InvoiceUploader } from './components/InvoiceUploader';
import { InvoicePreview } from './components/InvoicePreview';
import { InvoiceForm } from './components/InvoiceForm';
import { LineItemsTable } from './components/LineItemsTable';
import { ConfirmationPanel } from './components/ConfirmationPanel';
import { DuplicateCheckerCard } from './components/DuplicateCheckerCard';
import { ThreeWayHandoverCard } from './components/ThreeWayHandoverCard';
import {
  ExtractedInvoice,
  ExtractionResponse,
  LineItem,
  DuplicateCheckResult,
  HumanDecision,
  ExistingRegisterRecord,
} from './types';
import { SampleInvoice } from './data/sampleInvoices';
import { validateInvoiceCalculations } from './utils/calculationValidation';
import { performDuplicateCheck, generateInvoiceRecordId } from './lib/sheetsService';
import { FileText, AlertCircle, Sparkles, Check, Copy, RefreshCw, AlertTriangle } from 'lucide-react';

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractionDataUrl, setExtractionDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryDetails, setRetryDetails] = useState<string | null>(null);

  const [extractedData, setExtractedData] = useState<ExtractedInvoice | null>(null);
  const [hasCompared, setHasCompared] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Stage 2 Historical Invoice Register CSV state
  const [historicalRecords, setHistoricalRecords] = useState<ExistingRegisterRecord[]>([]);
  const [historicalFileName, setHistoricalFileName] = useState<string>('');

  // Duplicate check states
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Human Review & Decision states
  const [humanDecision, setHumanDecision] = useState<HumanDecision>('NONE');
  const [decisionReason, setDecisionReason] = useState('');
  const [reviewerName, setReviewerName] = useState('Madam Lim');

  // Confirmation & Saved status
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

  const activeBlobUrlRef = useRef<string | null>(null);

  const revokeBlobUrl = (url: string | null) => {
    if (url && url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Error revoking Object URL:', e);
      }
    }
  };

  // Run duplicate check against loaded historical records CSV
  const runDuplicateCheck = useCallback(
    (invoice: ExtractedInvoice, recordsOverride?: ExistingRegisterRecord[]) => {
      const records = recordsOverride !== undefined ? recordsOverride : historicalRecords;

      setIsCheckingDuplicates(true);
      setCheckError(null);

      try {
        const result = performDuplicateCheck(invoice, records);
        setDuplicateResult(result);
      } catch (err: any) {
        console.error('Duplicate check error:', err);
        setCheckError(err.message || 'Error occurred during duplicate check.');
        setDuplicateResult({
          status: 'CHECK_ERROR',
          explanation: 'An error occurred while checking for duplicates against the historical register.',
        });
      } finally {
        setIsCheckingDuplicates(false);
      }
    },
    [historicalRecords]
  );

  // Handle Loading Historical Register CSV
  const handleRegisterLoaded = (records: ExistingRegisterRecord[], name: string) => {
    setHistoricalRecords(records);
    setHistoricalFileName(name);
    if (extractedData) {
      runDuplicateCheck(extractedData, records);
    }
  };

  const handleClearRegister = () => {
    setHistoricalRecords([]);
    setHistoricalFileName('');
    if (extractedData) {
      runDuplicateCheck(extractedData, []);
    }
  };

  // Handle custom file upload (Stage 1 Invoice Upload)
  const handleFileSelect = async (file: File) => {
    revokeBlobUrl(activeBlobUrlRef.current);

    const objectUrl = URL.createObjectURL(file);
    activeBlobUrlRef.current = objectUrl;

    const detectedMime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png');

    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setFileName(file.name);
    setMimeType(detectedMime);
    setIsConfirmed(false);
    setHasCompared(false);
    setError(null);
    setRetryDetails(null);
    setSavedRecordId(null);
    setHumanDecision('NONE');
    setDecisionReason('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setExtractionDataUrl(dataUrl);
      await processExtraction(dataUrl, detectedMime, file.name);
    };
    reader.readAsDataURL(file);
  };

  // Handle sample invoice select
  const handleSampleSelect = (sample: SampleInvoice) => {
    revokeBlobUrl(activeBlobUrlRef.current);
    activeBlobUrlRef.current = null;

    setSelectedFile(null);
    setFileName(sample.fileName);
    setMimeType(sample.mimeType);
    setPreviewUrl(sample.previewUrl);
    setExtractionDataUrl(null);
    setIsConfirmed(false);
    setHasCompared(false);
    setError(null);
    setRetryDetails(null);
    setSavedRecordId(null);
    setHumanDecision('NONE');
    setDecisionReason('');

    const itemsWithIds = sample.mockExtractedData.lineItems.map((it, idx) => ({
      ...it,
      id: it.id || `item-sample-${idx}`,
    }));

    const validatedSampleData = validateInvoiceCalculations({
      ...sample.mockExtractedData,
      lineItems: itemsWithIds,
    });

    setExtractedData(validatedSampleData);
    runDuplicateCheck(validatedSampleData);
  };

  // Trigger server-side Gemini extraction
  const processExtraction = async (dataUrl: string, type: string, name: string) => {
    setIsLoading(true);
    setError(null);
    setRetryDetails(null);

    try {
      const response = await fetch('/api/extract-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: dataUrl,
          mimeType: type || 'application/pdf',
          fileName: name,
        }),
      });

      const resData: ExtractionResponse = await response.json();

      if (!response.ok || !resData.success || !resData.data) {
        throw new Error(resData.error || 'Failed to extract invoice data.');
      }

      const rawData = resData.data;
      const itemsWithIds: LineItem[] = (rawData.lineItems || []).map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        description: item.description || '',
        poReference: item.poReference || '',
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
        lineAmount: typeof item.lineAmount === 'number' ? item.lineAmount : 0,
      }));

      const validatedExtractedData = validateInvoiceCalculations({
        ...rawData,
        lineItems: itemsWithIds,
      });

      setExtractedData(validatedExtractedData);
      runDuplicateCheck(validatedExtractedData);
    } catch (err: any) {
      console.error('Extraction Error:', err);
      setError(err.message || 'Error occurred while processing invoice.');
      setRetryDetails('Please check that the document is legible and retry, or choose another file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualReExtract = () => {
    if (extractionDataUrl && mimeType && fileName) {
      processExtraction(extractionDataUrl, mimeType, fileName);
    }
  };

  const handleReset = () => {
    revokeBlobUrl(activeBlobUrlRef.current);
    activeBlobUrlRef.current = null;

    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractionDataUrl(null);
    setFileName(null);
    setMimeType(null);
    setExtractedData(null);
    setIsLoading(false);
    setError(null);
    setRetryDetails(null);
    setHasCompared(false);
    setIsConfirmed(false);
    setDuplicateResult(null);
    setHumanDecision('NONE');
    setDecisionReason('');
    setSavedRecordId(null);
  };

  const handleCopyJson = () => {
    if (!extractedData) return;
    const exportPayload = {
      ...extractedData,
      lineItems: extractedData.lineItems.map(({ id, ...rest }) => rest),
    };
    navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Validation before allowing confirmation
  const canConfirm = useMemo(() => {
    if (!hasCompared || !extractedData) return false;
    if (!reviewerName.trim()) return false;

    const status = duplicateResult?.status;
    const isDuplicateFlagged = status === 'EXACT_DUPLICATE' || status === 'POSSIBLE_DUPLICATE';

    if (isDuplicateFlagged && humanDecision === 'NONE') {
      return false;
    }

    if (humanDecision === 'HOLD' || humanDecision === 'ON_HOLD') {
      const cleanReason = decisionReason.trim().replace(/\s+/g, ' ');
      if (cleanReason.length < 10) return false;
    }

    if (humanDecision === 'NOT_DUPLICATE') {
      const cleanReason = decisionReason.trim().replace(/\s+/g, ' ');
      if (cleanReason.length < 10) return false;
    }

    return true;
  }, [hasCompared, extractedData, reviewerName, duplicateResult, humanDecision, decisionReason]);

  const canConfirmWarningReason = useMemo(() => {
    if (!reviewerName.trim()) return 'Please enter reviewer name (e.g. Madam Lim).';

    const status = duplicateResult?.status;
    const isDuplicateFlagged = status === 'EXACT_DUPLICATE' || status === 'POSSIBLE_DUPLICATE';

    if (isDuplicateFlagged && humanDecision === 'NONE') {
      return 'A duplicate warning was flagged. Madam Lim must select a review decision above.';
    }

    if (humanDecision === 'HOLD' || humanDecision === 'ON_HOLD') {
      const cleanReason = decisionReason.trim().replace(/\s+/g, ' ');
      if (cleanReason.length === 0) {
        return 'Please enter a reason for placing this invoice on hold.';
      }
      if (cleanReason.length < 10) {
        return 'Please enter a reason for placing this invoice on hold (at least 10 characters).';
      }
    }

    if (humanDecision === 'NOT_DUPLICATE') {
      const cleanReason = decisionReason.trim().replace(/\s+/g, ' ');
      if (cleanReason.length === 0 || cleanReason.length < 10) {
        return 'Please enter a written justification of at least 10 characters.';
      }
    }

    return '';
  }, [reviewerName, duplicateResult, humanDecision, decisionReason]);

  // Handle Confirmation
  const handleConfirmSave = () => {
    if (!extractedData || !canConfirm) return;
    const recId = generateInvoiceRecordId();
    setIsConfirmed(true);
    setSavedRecordId(recId);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        onReset={handleReset}
        onExtract={handleManualReExtract}
        isLoading={isLoading}
        hasDocument={!!previewUrl}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Notice and Warning Banners */}
        <NoticeBanner />

        {/* Upload & Quick Samples Section */}
        <InvoiceUploader
          onFileSelect={handleFileSelect}
          onSampleSelect={handleSampleSelect}
          isLoading={isLoading}
          selectedFileName={fileName || undefined}
          error={error}
        />

        {/* Extraction Retry Error Callout */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 mb-5 flex items-start space-x-3 text-red-900">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <span className="font-bold text-red-950 uppercase tracking-wider text-[10px] block mb-0.5">
                Extraction Error
              </span>
              <p className="text-red-800">{error}</p>
              {retryDetails && <p className="text-red-700 text-xs mt-1">{retryDetails}</p>}
              <button
                type="button"
                onClick={handleManualReExtract}
                className="mt-2.5 inline-flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs uppercase tracking-wider transition"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Extraction</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay State */}
        {isLoading && (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center mb-5 flex flex-col items-center justify-center space-y-2 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center animate-spin">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Reading &amp; Standardising Invoice...
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-sm mx-auto">
                Extracting supplier name, invoice number, due date, PO reference, line items, and checking review rules.
              </p>
            </div>
          </div>
        )}

        {/* Historical Invoice Register Section (Stage 2 Database) */}
        <HistoricalRegisterSection
          records={historicalRecords}
          onRegisterLoaded={handleRegisterLoaded}
          fileName={historicalFileName}
          onClearRegister={handleClearRegister}
        />

        {/* Main Work Area: Side-by-Side Original Preview vs Extracted Standardised Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Original Invoice */}
          <div className="min-w-0 space-y-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Original Invoice</span>
            </h2>
            <InvoicePreview previewUrl={previewUrl} fileName={fileName} mimeType={mimeType} />
          </div>

          {/* Right Column: Extracted and Standardised Information */}
          <div className="min-w-0 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Extracted and Standardised Information</span>
            </h2>

            {extractedData ? (
              <>
                {/* Extracted Invoice Form */}
                <InvoiceForm
                  data={extractedData}
                  onChange={(updated) => {
                    const revalidated = validateInvoiceCalculations(updated);
                    setExtractedData(revalidated);
                    setIsConfirmed(false);
                    runDuplicateCheck(revalidated);
                  }}
                />

                {/* Line Items Table */}
                <LineItemsTable
                  lineItems={extractedData.lineItems}
                  fieldValidation={extractedData.fieldValidation?.lineItems}
                  onChange={(updatedItems) => {
                    const updatedInvoice = { ...extractedData, lineItems: updatedItems };
                    const revalidated = validateInvoiceCalculations(updatedInvoice);
                    setExtractedData(revalidated);
                    setIsConfirmed(false);
                    runDuplicateCheck(revalidated);
                  }}
                  currency={extractedData.currency}
                  totalDue={extractedData.totalDue}
                />

                {/* Stage 2 Duplicate Checking Card */}
                <DuplicateCheckerCard
                  checkResult={duplicateResult}
                  isChecking={isCheckingDuplicates}
                  checkError={checkError}
                  onRetryCheck={() => extractedData && runDuplicateCheck(extractedData)}
                  humanDecision={humanDecision}
                  onDecisionChange={setHumanDecision}
                  decisionReason={decisionReason}
                  onReasonChange={setDecisionReason}
                  reviewerName={reviewerName}
                  onReviewerNameChange={setReviewerName}
                  isDatabaseLoaded={historicalRecords.length > 0}
                  onTriggerCsvUpload={() => {
                    const el = document.getElementById('csv-register-upload');
                    if (el) el.click();
                  }}
                />

                {/* Human Confirmation Panel */}
                <ConfirmationPanel
                  hasCompared={hasCompared}
                  onComparedChange={setHasCompared}
                  isConfirmed={isConfirmed}
                  onConfirm={handleConfirmSave}
                  onReset={handleReset}
                  isLoading={isLoading}
                  isSavingToSheets={false}
                  saveError={null}
                  onRetrySave={handleConfirmSave}
                  savedRecordId={savedRecordId}
                  hasDocument={!!previewUrl}
                  canConfirm={canConfirm}
                  canConfirmWarningReason={canConfirmWarningReason}
                  humanDecision={humanDecision}
                  reviewerName={reviewerName}
                />

                {/* Handover Stage: Three-Way Matching Handover Card */}
                <ThreeWayHandoverCard
                  invoice={extractedData}
                  savedRecordId={savedRecordId}
                  fileName={fileName}
                  isConfirmed={isConfirmed}
                  hasCompared={hasCompared}
                  reviewerName={reviewerName}
                  duplicateResult={duplicateResult}
                  isCheckingDuplicates={isCheckingDuplicates}
                  humanDecision={humanDecision}
                  decisionReason={decisionReason}
                />

                {/* Json Copy / Export Bar */}
                {humanDecision === 'HOLD' || humanDecision === 'ON_HOLD' ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-950">
                    <div className="flex items-center space-x-2 font-bold uppercase tracking-wider text-[11px] text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Invoice On Hold — Export &amp; Three-Way Matching Disabled</span>
                    </div>
                    <span className="text-[11px] font-medium text-amber-800">
                      Invoices on hold cannot be downloaded or passed to the Three-Way Matching Assistant until resolved.
                    </span>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Standardised JSON Data Payload
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg border border-dashed border-slate-300 p-10 text-center text-slate-400 flex flex-col items-center justify-center min-h-[380px]">
                <Sparkles className="w-8 h-8 text-indigo-400 stroke-[1.5] mb-2.5" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Awaiting Invoice Extraction
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                  Upload an invoice above or select a quick demo invoice. The extracted information will appear here in a standardized format for Madam Lim to review.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-3 text-[11px] mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p>© {new Date().getFullYear()} Boon Huat Hardware &amp; Supplies Pte Ltd. Accounts Payable Assistant.</p>
          <p className="text-slate-500 text-[10px]">
            Extracts &amp; standardises invoice information. Does not approve payments.
          </p>
        </div>
      </footer>
    </div>
  );
}
