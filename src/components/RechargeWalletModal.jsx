import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { formatCurrency, formatPhone, calculateWalletStats } from '../utils/formatters';
import { ArrowDownToLine, X, AlertTriangle, CheckCircle2, ShieldCheck, Wallet } from 'lucide-react';

export default function RechargeWalletModal() {
  const { activeModal, setActiveModal, modalData, addRecharge, transactions } = useCash();
  const dialogRef = useRef(null);

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wallet = modalData?.wallet;
  const clientName = modalData?.clientName || 'عميل';
  const stats = wallet ? calculateWalletStats(wallet, transactions) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'rechargeWallet' && wallet) {
      if (!dialog.open) dialog.showModal();
      setAmount('');
      setNotes('');
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, wallet]);

  const handleClose = () => {
    setActiveModal(null);
    setAmount('');
    setNotes('');
  };

  const handleDialogClick = (e) => {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  };

  const numAmount = Number(amount) || 0;
  const newBalance = stats ? Math.min(200000, stats.remainingLimit + numAmount) : 0;
  const maxDeposit = stats ? stats.maxAllowedDeposit : 0;
  const isOverDailyLimit = stats ? numAmount > stats.remainingDailyRecharge : false;
  const isOverMaxBalance = stats ? (stats.remainingLimit + numAmount) > 200000 : false;
  const isValidAmount = numAmount > 0 && !isOverDailyLimit && !isOverMaxBalance;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!wallet || !isValidAmount) return;

    setIsSubmitting(true);
    try {
      const res = addRecharge({
        walletId: wallet.id,
        amount: numAmount,
        notes
      });
      if (res) {
        handleClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeModal !== 'rechargeWallet' || !wallet || !stats) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      aria-labelledby="recharge-modal-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/60 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
            <ArrowDownToLine className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="recharge-modal-title" className="text-base sm:text-lg font-black">
              شحن وإضافة رصيد للمحفظة
            </h2>
            <p className="text-xs text-emerald-100 mt-0.5">
              {clientName} • <span dir="ltr" className="font-mono">{formatPhone(wallet.phoneNumber)}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
        
        {/* Rules & Status Summary Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Current Balance */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium">الرصيد المتاح الحالي:</span>
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
              {formatCurrency(stats.remainingLimit)}
            </span>
          </div>

          {/* Daily Recharge Remaining */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium">المتبقي للشحن اليوم:</span>
            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(stats.remainingDailyRecharge)}
            </span>
            <span className="text-[10px] text-slate-400 block">من أصل 120,000 ج.م/يوم</span>
          </div>

          {/* Max Capacity Cap Info */}
          <div className="col-span-2 p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-700 dark:text-slate-300 font-bold">
                السعة القصوى للمحفظة: 200,000 ج.م
              </span>
            </div>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
              المتاح إضافته الآن: {formatCurrency(maxDeposit)}
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>مبلغ الشحن المطلوب إضافته:</span>
            {numAmount > 0 && (
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                الرصيد بعد الشحن: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(newBalance)}</strong>
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={maxDeposit}
              step="500"
              required
              placeholder="اكتب المبلغ بالجنيه (مثال: 50000)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-base sm:text-lg font-black font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              ج.م
            </span>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-slate-400 font-bold block">مبالغ سريعة:</span>
          <div className="flex flex-wrap gap-1.5">
            {[10000, 20000, 30000, 50000, 100000].map(val => {
              const disabled = val > maxDeposit;
              return (
                <button
                  key={val}
                  type="button"
                  disabled={disabled}
                  onClick={() => setAmount(String(val))}
                  className={`btn-interactive px-2.5 py-1 rounded-xl text-xs font-bold font-mono border transition-all ${
                    disabled
                      ? 'opacity-40 bg-slate-100 dark:bg-slate-800 border-dashed text-slate-400 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  +{formatCurrency(val)}
                </button>
              );
            })}
            {maxDeposit > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(maxDeposit))}
                className="btn-interactive px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200"
              >
                الحد الأقصى المتاح (+{formatCurrency(maxDeposit)})
              </button>
            )}
          </div>
        </div>

        {/* Error / Alert Messages */}
        {isOverDailyLimit && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>تجاوزت الحد الأقصى للإيداع اليومي (120,000 ج.م في اليوم الواحد)! المتبقي اليوم: {formatCurrency(stats.remainingDailyRecharge)}</span>
          </div>
        )}

        {isOverMaxBalance && !isOverDailyLimit && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>الرقم لا يمكن أن يقبل أكثر من 200,000 ج.م (الحد الأقصى للسعة). أقصى مبلغ يمكن قبوله الآن: {formatCurrency(200000 - stats.remainingLimit)}</span>
          </div>
        )}

        {maxDeposit <= 0 && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>لا يمكن إضافة رصيد إضافي لهذا الرقم حالياً (المحفظة عند الحد الأقصى 200,000 ج.م أو اكتمل حد الإيداع اليومي 120,000 ج.م).</span>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ملاحظات أو مصدر الشحن (اختياري):
          </label>
          <input
            type="text"
            placeholder="مثال: شحن فوري من المحطة، إيداع بنكي، كاش من المحل..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl"
          >
            إلغاء
          </button>
          
          <button
            type="submit"
            disabled={!isValidAmount || isSubmitting || maxDeposit <= 0}
            className={`btn-interactive flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all ${
              isValidAmount && maxDeposit > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 ring-1 ring-emerald-500/40'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'جاري الإضافة...' : 'تأكيد إضافة الرصيد للمحفظة'}</span>
          </button>
        </div>

      </form>
    </dialog>
  );
}
