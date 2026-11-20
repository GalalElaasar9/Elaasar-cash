import React from 'react';
import { useCash } from '../context/CashContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast() {
  const { toast } = useCash();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-auto z-50 max-w-md animate-toast pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md text-sm font-semibold transition-all ${
          isSuccess
            ? 'bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-800'
            : isError
            ? 'bg-rose-50/95 dark:bg-rose-950/90 text-rose-900 dark:text-rose-100 border-rose-300 dark:border-rose-800'
            : 'bg-blue-50/95 dark:bg-blue-950/90 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-800'
        }`}
      >
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
        {isError && <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />}
        {isInfo && <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />}
        
        <p className="flex-1 leading-snug">{toast.message}</p>
      </div>
    </div>
  );
}
