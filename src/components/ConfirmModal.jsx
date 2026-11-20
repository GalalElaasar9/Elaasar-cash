import React, { useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X } from 'lucide-react';

export default function ConfirmModal() {
  const { confirmModal, handleConfirmClose } = useCash();
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (confirmModal.isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [confirmModal.isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      handleConfirmClose(false);
    }
  };

  if (!confirmModal.isOpen) return null;

  const isDanger = confirmModal.type === 'danger';
  const isWarning = confirmModal.type === 'warning';
  const isInfo = confirmModal.type === 'info';
  const isSuccess = confirmModal.type === 'success';

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/65 overflow-hidden animate-scale-in"
    >
      <div className="p-6 text-center space-y-4">
        
        {/* Animated Icon Badge */}
        <div className="flex justify-center">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform animate-pulse-glow ${
              isDanger
                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 shadow-rose-500/20 ring-4 ring-rose-50 dark:ring-rose-950/40'
                : isWarning
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 shadow-amber-500/20 ring-4 ring-amber-50 dark:ring-amber-950/40'
                : isSuccess
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20 ring-4 ring-emerald-50 dark:ring-emerald-950/40'
                : 'bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 shadow-blue-500/20 ring-4 ring-blue-50 dark:ring-blue-950/40'
            }`}
          >
            {isDanger && <AlertTriangle className="w-7 h-7" />}
            {isWarning && <AlertCircle className="w-7 h-7" />}
            {isSuccess && <CheckCircle2 className="w-7 h-7" />}
            {isInfo && <Info className="w-7 h-7" />}
          </div>
        </div>

        {/* Title & Message */}
        <div className="space-y-1.5">
          <h3
            id="confirm-modal-title"
            className="text-lg font-black text-slate-900 dark:text-white"
          >
            {confirmModal.title}
          </h3>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
            {confirmModal.message}
          </p>
          {confirmModal.details && (
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mt-2">
              {confirmModal.details}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {confirmModal.cancelText && (
            <button
              type="button"
              autoFocus
              onClick={() => handleConfirmClose(false)}
              className="btn-interactive flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-colors"
            >
              {confirmModal.cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleConfirmClose(true)}
            className={`btn-interactive flex-1 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition-all ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30 ring-1 ring-rose-500'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                : isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
            }`}
          >
            {confirmModal.confirmText}
          </button>
        </div>

      </div>
    </dialog>
  );
}
