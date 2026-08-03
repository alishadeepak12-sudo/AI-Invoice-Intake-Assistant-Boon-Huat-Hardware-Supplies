import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Link2, ExternalLink, ShieldCheck } from 'lucide-react';
import { SPREADSHEET_ID } from '../lib/sheetsService';

interface SheetsConnectionBannerProps {
  isConnected: boolean;
  userEmail?: string | null;
  onConnect: () => void;
  onTestConnection: () => Promise<{ success: boolean; message: string }>;
  isConnecting?: boolean;
}

export const SheetsConnectionBanner: React.FC<SheetsConnectionBannerProps> = ({
  isConnected,
  userEmail,
  onConnect,
  onTestConnection,
  isConnecting = false,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to test database connection.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs mb-5 overflow-hidden">
      {/* Header bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5 font-bold uppercase tracking-wider text-xs">
          <Database className="w-4 h-4 text-indigo-400" />
          <span>Boon Huat AP Database (Google Sheets Integration)</span>
        </div>
        <a
          href={sheetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-300 hover:text-white flex items-center space-x-1 font-medium underline"
        >
          <span>Open Spreadsheet</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Connection Status Indicator */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Sheets connected.</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-bold text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Google Sheets is not connected.</span>
              </span>
            )}
            {isConnected && userEmail && (
              <span className="text-xs font-semibold text-slate-600">({userEmail})</span>
            )}
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Target Spreadsheet ID: <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{SPREADSHEET_ID}</code> (Worksheets: <strong className="text-slate-700">Invoice Register</strong> &amp; <strong className="text-slate-700">Invoice Line Items</strong>)
          </p>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isConnected ? (
            <button
              type="button"
              onClick={onConnect}
              disabled={isConnecting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Connect Google Sheets</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition"
            >
              Re-authorize Connection
            </button>
          )}

          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Testing Connection...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Test Database Connection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Database Connection Outcome Callout */}
      {testResult && (
        <div
          className={`mx-4 sm:mx-5 mb-4 p-3.5 rounded-lg border text-xs flex items-start space-x-2.5 ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-950'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">
              {testResult.success ? 'Database Connection Verification' : 'Database Connection Test Failed'}
            </span>
            <p className="font-medium leading-relaxed">{testResult.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
