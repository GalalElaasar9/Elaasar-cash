import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { 
  cleanEgyptianPhone, 
  isValidEgyptianPhone, 
  getEgyptianPhoneError, 
  getEgyptianCarrier 
} from '../utils/formatters';
import { Edit2, X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function EditLimitModal() {
  const { activeModal, setActiveModal, modalData, updateWallet, showToast } = useCash();
  const dialogRef = useRef(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [label, setLabel] = useState('');
  const [totalLimit, setTotalLimit] = useState(200000);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'editLimit' && modalData?.wallet) {
      if (!dialog.open) dialog.showModal();
      setPhoneNumber(modalData.wallet.phoneNumber || '');
      setLabel(modalData.wallet.label || '');
      setTotalLimit(modalData.wallet.totalLimit || 200000);
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, modalData]);

  const handleClose = () => {
    setActiveModal(null);
  };

  const carrier = getEgyptianCarrier(phoneNumber);
  const phoneError = phoneNumber.length >= 3 ? getEgyptianPhoneError(phoneNumber) : null;
  const isPhoneValid = isValidEgyptianPhone(phoneNumber);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!modalData?.clientId || !modalData?.wallet?.id) return;

    const clean = cleanEgyptianPhone(phoneNumber);
    if (!isValidEgyptianPhone(clean)) {
      showToast(getEgyptianPhoneError(clean) || 'يجب أن يبدأ الرقم بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً', 'error');
      return;
    }

    updateWallet(modalData.clientId, modalData.wallet.id, {
      phoneNumber: clean,
      label,
      totalLimit: Number(totalLimit) || 200000
    });

    handleClose();
  };

  if (activeModal !== 'editLimit') return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="edit-wallet-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/60 overflow-hidden"
    >
      <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-600/20 text-red-500">
            <Edit2 className="w-5 h-5" />
          </div>
          <div>
            <h2 id="edit-wallet-title" className="text-base font-bold">
              تعديل بيانات المحفظة والليميت
            </h2>
            <p className="text-xs text-slate-400">
              العميل: {modalData?.clientName}
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="p-1 text-slate-400 hover:text-white rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              رقم المحفظة (رقم مصري 11 رقم) *
            </label>
            {carrier ? (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                {carrier.name} ({carrier.code})
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono">
                010 / 011 / 012 / 015
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="tel"
              required
              maxLength={11}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(cleanEgyptianPhone(e.target.value))}
              className={`w-full px-3.5 py-2.5 text-base font-bold font-mono bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white transition-colors ${
                isPhoneValid
                  ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/40'
                  : phoneError
                  ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/40'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500/40'
              }`}
              dir="ltr"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
              {phoneNumber.length}/11
            </span>
          </div>
          {phoneError && (
            <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{phoneError}</span>
            </p>
          )}
          {isPhoneValid && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>رقم مصري صحيح ({carrier?.name})</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            تسمية المحفظة
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              الليميت الإجمالي (الحد الأقصى للرصيد)
            </label>
            <button
              type="button"
              onClick={() => setTotalLimit(200000)}
              className="text-[11px] text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>إعادة للـ 200,000 القياسي</span>
            </button>
          </div>
          <input
            type="number"
            min="1000"
            step="1000"
            required
            value={totalLimit}
            onChange={(e) => setTotalLimit(e.target.value)}
            className="w-full px-3.5 py-2 text-lg font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-bold text-slate-500"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="btn-interactive px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md"
          >
            حفظ التعديلات
          </button>
        </div>
      </form>
    </dialog>
  );
}
