import React from 'react';
import { Info, AlertTriangle, ShieldAlert } from 'lucide-react';

export const NoticeBanner: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
      {/* Functional Scope Notice */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-start space-x-2.5 text-slate-700 text-xs shadow-xs">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-0.5">
            System Notice
          </span>
          <p className="text-slate-600 leading-snug">
            This app extracts and standardises invoice information. It does not approve invoices or make payments.
          </p>
        </div>
      </div>

      {/* Responsible AI Warning */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 flex items-start space-x-2.5 text-amber-900 text-xs shadow-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-950 uppercase tracking-wider text-[10px] block mb-0.5">
            Responsible AI Guidance
          </span>
          <p className="text-amber-800 leading-snug">
            AI may misread unclear or handwritten invoices. Always compare the extracted information with the original document.
          </p>
        </div>
      </div>
    </div>
  );
};
