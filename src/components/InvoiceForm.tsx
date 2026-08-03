import React from 'react';
import { ExtractedInvoice, FieldStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { AlertCircle, CheckCircle2, FileCheck } from 'lucide-react';

interface InvoiceFormProps {
  data: ExtractedInvoice;
  onChange: (updated: ExtractedInvoice) => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ data, onChange }) => {
  const handleFieldChange = (field: keyof ExtractedInvoice, value: any) => {
    onChange({
      ...data,
      [field]: field === 'totalDue' ? parseFloat(value) || 0 : value,
    });
  };

  const valMap = data.fieldValidation;

  const renderFieldBadge = (status?: FieldStatus) => {
    if (!status) return null;
    if (status === 'CLEAR') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
          CLEAR
        </span>
      );
    }
    if (status === 'MISSING') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-800 uppercase tracking-wider">
          MISSING
        </span>
      );
    }
    if (status === 'UNCLEAR') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
          UNCLEAR
        </span>
      );
    }
    return null;
  };

  const getFieldInputClass = (status?: FieldStatus, defaultBg = 'bg-slate-50') => {
    if (status === 'MISSING') {
      return 'bg-red-50 border-red-300 text-red-900 placeholder:text-red-400 focus:border-red-500 focus:bg-white';
    }
    if (status === 'UNCLEAR') {
      return 'bg-amber-50 border-amber-300 text-amber-900 focus:border-amber-500 focus:bg-white';
    }
    return `${defaultBg} border-slate-200 text-slate-900 focus:border-indigo-500 focus:bg-white`;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Status Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">
            Extracted Invoice Details
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            ({data.sourceFileName || 'Invoice'})
          </span>
        </div>

        <div>
          <StatusBadge status={data.extractionStatus} size="sm" />
        </div>
      </div>

      {/* Review Explanations Bar */}
      {data.reviewReasons && data.reviewReasons.length > 0 && (
        <div
          className={`px-4 sm:px-6 py-2.5 border-b text-xs flex items-start space-x-2 ${
            data.extractionStatus === 'UNABLE_TO_PROCESS'
              ? 'bg-red-50 border-red-100 text-red-900'
              : data.extractionStatus === 'MANUAL_REVIEW_REQUIRED'
              ? 'bg-amber-50 border-amber-100 text-amber-900'
              : 'bg-emerald-50 border-emerald-100 text-emerald-900'
          }`}
        >
          {data.extractionStatus === 'READY_FOR_REVIEW' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                data.extractionStatus === 'UNABLE_TO_PROCESS' ? 'text-red-600' : 'text-amber-600'
              }`}
            />
          )}
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">
              Review Guidance / Validation Reasons
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-xs font-medium">
              {data.reviewReasons.map((reason, idx) => (
                <li key={idx}>“{reason}”</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* High Density Form Grid */}
      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3.5">
        {/* Supplier Name */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            {renderFieldBadge(valMap?.supplierName)}
          </div>
          <input
            type="text"
            value={data.supplierName || ''}
            onChange={(e) => handleFieldChange('supplierName', e.target.value)}
            placeholder="Official Supplier Name"
            className={`w-full px-3 py-1.5 border rounded text-sm font-medium outline-none transition-all ${getFieldInputClass(
              valMap?.supplierName
            )}`}
          />
        </div>

        {/* Invoice Number */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Invoice Number <span className="text-red-500">*</span>
            </label>
            {renderFieldBadge(valMap?.invoiceNumber)}
          </div>
          <input
            type="text"
            value={data.invoiceNumber || ''}
            onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
            placeholder="e.g. ST-INV-88219"
            className={`w-full px-3 py-1.5 border rounded text-sm font-mono font-semibold outline-none transition-all ${getFieldInputClass(
              valMap?.invoiceNumber
            )}`}
          />
        </div>

        {/* Supplier Address */}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Supplier Address
          </label>
          <input
            type="text"
            value={data.supplierAddress || ''}
            onChange={(e) => handleFieldChange('supplierAddress', e.target.value)}
            placeholder="Full physical address"
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
          />
        </div>

        {/* Bill-To Company */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Bill-To Entity
          </label>
          <input
            type="text"
            value={data.billToCompany || ''}
            onChange={(e) => handleFieldChange('billToCompany', e.target.value)}
            placeholder="Boon Huat Hardware & Supplies Pte Ltd"
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
          />
        </div>

        {/* Currency */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Currency <span className="text-red-500">*</span>
            </label>
            {renderFieldBadge(valMap?.currency)}
          </div>
          <input
            type="text"
            value={data.currency || ''}
            onChange={(e) => handleFieldChange('currency', e.target.value)}
            placeholder="SGD"
            className={`w-full px-3 py-1.5 border rounded text-sm font-mono uppercase outline-none transition-all ${getFieldInputClass(
              valMap?.currency
            )}`}
          />
        </div>

        {/* Invoice Date */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Invoice Date <span className="text-red-500">*</span>
            </label>
            {renderFieldBadge(valMap?.invoiceDate)}
          </div>
          <input
            type="text"
            value={data.invoiceDate || ''}
            onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
            placeholder="YYYY-MM-DD"
            className={`w-full px-3 py-1.5 border rounded text-sm font-mono outline-none transition-all ${getFieldInputClass(
              valMap?.invoiceDate
            )}`}
          />
        </div>

        {/* Due Date */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Due Date <span className="text-red-500">*</span>
            </label>
            {renderFieldBadge(valMap?.dueDate)}
          </div>
          <input
            type="text"
            value={data.dueDate || ''}
            onChange={(e) => handleFieldChange('dueDate', e.target.value)}
            placeholder="YYYY-MM-DD"
            className={`w-full px-3 py-1.5 border rounded text-sm font-mono outline-none transition-all ${getFieldInputClass(
              valMap?.dueDate
            )}`}
          />
        </div>

        {/* Purchase Order Reference */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              PO Reference <span className="text-red-500">*</span>
            </label>
            {renderFieldBadge(valMap?.poReference)}
          </div>
          <input
            type="text"
            value={data.poReference || ''}
            onChange={(e) => handleFieldChange('poReference', e.target.value)}
            placeholder="e.g. BH-2026-0891"
            className={`w-full px-3 py-1.5 border rounded text-sm font-mono outline-none transition-all ${getFieldInputClass(
              valMap?.poReference
            )}`}
          />
        </div>

        {/* Total Due */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Due ({data.currency || 'SGD'}) <span className="text-red-500">*</span>
            </label>
            {renderFieldBadge(valMap?.totalDue)}
          </div>
          <input
            type="number"
            step="any"
            value={data.totalDue || 0}
            onChange={(e) => handleFieldChange('totalDue', e.target.value)}
            placeholder="0.00"
            className={`w-full px-3 py-1.5 border rounded text-sm font-bold outline-none transition-all ${
              valMap?.totalDue === 'MISSING' || valMap?.totalDue === 'UNCLEAR'
                ? getFieldInputClass(valMap?.totalDue)
                : 'bg-green-50 border-green-200 text-green-900 focus:border-green-500'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
