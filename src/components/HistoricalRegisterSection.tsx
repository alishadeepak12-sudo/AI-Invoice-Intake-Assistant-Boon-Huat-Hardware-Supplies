import React, { useRef } from 'react';
import { Database, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import { ExistingRegisterRecord } from '../types';
import { parseInvoiceRegisterCSV, SAMPLE_INVOICE_REGISTER_CSV } from '../utils/csvParser';

interface HistoricalRegisterSectionProps {
  records: ExistingRegisterRecord[];
  onRegisterLoaded: (records: ExistingRegisterRecord[], fileName: string) => void;
  fileName?: string;
  onClearRegister?: () => void;
}

export const HistoricalRegisterSection: React.FC<HistoricalRegisterSectionProps> = ({
  records,
  onRegisterLoaded,
  fileName,
  onClearRegister,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseInvoiceRegisterCSV(text);
        onRegisterLoaded(parsed, file.name);
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-selected if needed
    e.target.value = '';
  };

  const handleLoadSample = () => {
    const parsed = parseInvoiceRegisterCSV(SAMPLE_INVOICE_REGISTER_CSV);
    onRegisterLoaded(parsed, 'Sample_Invoice_Register.csv');
  };

  const isLoaded = records.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs mb-6 overflow-hidden">
      {/* Section Header */}
      <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <Database className="w-4 h-4 text-amber-400" />
          <h2 className="font-bold text-sm uppercase tracking-wider">Historical Invoice Register</h2>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          Stage 2 Database
        </span>
      </div>

      <div className="p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center space-x-2">
              {isLoaded ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Historical Register Loaded ({records.length} records)</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-bold text-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Register Not Loaded</span>
                </span>
              )}
              {fileName && <span className="text-xs text-slate-500 font-medium">({fileName})</span>}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload a CSV file containing historical invoice records to perform duplicate checking against newly extracted supplier invoices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-register-upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Invoice Register CSV</span>
            </button>

            {!isLoaded ? (
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                <span>Load Sample Register CSV</span>
              </button>
            ) : (
              onClearRegister && (
                <button
                  type="button"
                  onClick={onClearRegister}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition"
                >
                  Unload CSV
                </button>
              )
            )}
          </div>
        </div>

        {/* Display Register Records Summary Table if loaded */}
        {isLoaded ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Loaded Historical Invoices ({records.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Columns: Invoice Record ID, Supplier Name, Invoice No, Date, PO Ref, Total Due, Currency, Decision
              </span>
            </div>

            <div className="overflow-x-auto max-h-48 border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Record ID</th>
                    <th className="py-2 px-3">Supplier Name</th>
                    <th className="py-2 px-3">Invoice No</th>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">PO Reference</th>
                    <th className="py-2 px-3 text-right">Total Due</th>
                    <th className="py-2 px-3">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                  {records.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-1.5 px-3 font-mono font-medium text-slate-900">{rec.invoiceRecordId}</td>
                      <td className="py-1.5 px-3 font-semibold text-slate-800">{rec.supplierName}</td>
                      <td className="py-1.5 px-3 font-mono">{rec.invoiceNumber}</td>
                      <td className="py-1.5 px-3">{rec.invoiceDate}</td>
                      <td className="py-1.5 px-3">{rec.poReference || '—'}</td>
                      <td className="py-1.5 px-3 text-right font-semibold">
                        {rec.currency} {rec.totalDue.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-3 font-medium text-emerald-700">{rec.humanDecision || 'Verified'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3.5 text-center">
            <p className="text-xs text-slate-600 font-medium">
              Invoice extraction works independently. Upload an Invoice Register CSV above at any time to run Stage 2 duplicate detection.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
