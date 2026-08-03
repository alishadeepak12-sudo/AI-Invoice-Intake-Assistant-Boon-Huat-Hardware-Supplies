import React from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { ExtractionStatus } from '../types';

interface StatusBadgeProps {
  status: ExtractionStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  switch (status) {
    case 'READY_FOR_REVIEW':
      return (
        <span
          className={`inline-flex items-center space-x-1 font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 tracking-wider ${
            size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[10px]'
          }`}
        >
          <CheckCircle2 className={`${size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-emerald-700`} />
          <span>READY FOR REVIEW</span>
        </span>
      );

    case 'MANUAL_REVIEW_REQUIRED':
      return (
        <span
          className={`inline-flex items-center space-x-1 font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 tracking-wider ${
            size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[10px]'
          }`}
        >
          <AlertCircle className={`${size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-amber-700`} />
          <span>MANUAL REVIEW REQUIRED</span>
        </span>
      );

    case 'UNABLE_TO_PROCESS':
      return (
        <span
          className={`inline-flex items-center space-x-1 font-bold rounded-full bg-red-100 text-red-800 border border-red-200 tracking-wider ${
            size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[10px]'
          }`}
        >
          <XCircle className={`${size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} text-red-700`} />
          <span>UNABLE TO PROCESS</span>
        </span>
      );

    default:
      return null;
  }
};
