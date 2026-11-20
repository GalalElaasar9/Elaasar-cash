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
  const isShopWallet = Boolean(modalData?.isShopWallet || wallet?.isShopWallet);
  const isClientWallet = !isShopWallet;

  // Shop line balance calculations
  const newBalance = stats ? (stats.remainingLimit + numAmount) : 0;
  const isOverMaxBalance = stats ? (stats.remainingLimit + numAmount) > (stats.totalLimit || 200000) : false;
  const overBalanceAmount = isOverMaxBalance ? (stats.remainingLimit + numAmount) - (stats.totalLimit || 200000) : 0;

  // Client line limits (60k daily recharge, 200k monthly recharge)
  const clientDailyCap = 60000;
  const clientMonthlyCap = wallet?.totalLimit || 200000;
  const newClientDailyTotal = stats ? stats.todayRecharges + numAmount : 0;
  const newClientMonthTotal = stats ? stats.totalRecharges + numAmount : 0;
  const isOverClientDaily = isClientWallet && numAmount > 0 && newClientDailyTotal > clientDailyCap;
  const overClientDailyAmount = isOverClientDaily ? newClientDailyTotal - clientDailyCap : 0;
  const isOverClientMonthly = isClientWallet && numAmount > 0 && newClientMonthTotal > clientMonthlyCap;
  const overClientMonthlyAmount = isOverClientMonthly ? newClientMonthTotal - clientMonthlyCap : 0;

  const hasWarning = isShopWallet 
    ? isOverMaxBalance 
    : (isOverClientDaily || isOverClientMonthly);

  const isValidAmount = numAmount > 0;

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
              {isClientWallet ? 'شحن رصيد لخط العميل' : 'شحن وإضافة رصيد للمحفظة'}
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
        {isClientWallet ? (
          <div className="grid grid-cols-2 gap-2.5">
            {/* Monthly Limit Card */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium">الليميت الشهري (200,000 ج.م):</span>
              <span className={`text-sm sm:text-base font-black font-mono block ${
                stats.totalRecharges > clientMonthlyCap ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
              }`}>
                {formatCurrency(stats.totalRecharges)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                متبقي للشحن: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(Math.max(0, clientMonthlyCap - stats.totalRecharges))}</strong>
              </span>
            </div>

            {/* Daily Limit Card */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium">الحد اليومي (60,000 ج.م/يوم):</span>
              <span className={`text-sm sm:text-base font-black font-mono block ${
                stats.todayRecharges > clientDailyCap ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {formatCurrency(stats.todayRecharges)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                متبقي اليوم: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(Math.max(0, clientDailyCap - stats.todayRecharges))}</strong>
              </span>
            </div>

            {/* Client rules banner */}
            <div className="col-span-2 p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between font-bold">
              <span>شحن خط العميل: حد يومي 60,000 ج.م • حد شهري 200,000 ج.م</span>
              <span className="text-[10px] text-emerald-600 font-medium">يقبل الزيادة مع التنبيه</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {/* Current Balance */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium">الرصيد المتاح الحالي:</span>
              <span className={`text-sm sm:text-base font-black font-mono ${
                stats.remainingLimit > (stats.totalLimit || 200000)
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white'
              }`}>
                {formatCurrency(stats.remainingLimit)}
              </span>
            </div>

            {/* Today's Total Recharges */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium">إجمالي شحن اليوم:</span>
              <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(stats.todayRecharges)}
              </span>
              <span className="text-[10px] text-slate-400 block">استقبال مفتوح (بدون حد يومي)</span>
            </div>

            {/* Max Capacity Cap Info */}
            <div className={`col-span-2 p-3 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
              stats.remainingLimit >= (stats.totalLimit || 200000)
                ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50'
                : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 shrink-0 ${stats.remainingLimit >= (stats.totalLimit || 200000) ? 'text-amber-600' : 'text-emerald-600'}`} />
                <span className="text-slate-700 dark:text-slate-300 font-bold">
                  الحد الأقصى للمحفظة: {formatCurrency(stats.totalLimit || 200000)}
                </span>
              </div>
              <div className="flex items-center gap-1 font-bold">
                {stats.remainingLimit >= (stats.totalLimit || 200000) ? (
                  <span className="text-amber-700 dark:text-amber-400 font-medium text-[11px]">
                    ⚠️ مكتمل الليميت (يقبل رصيد إضافي بتنبيه)
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-300">
                    المتبقي للحد: <strong className="font-mono">{formatCurrency((stats.totalLimit || 200000) - stats.remainingLimit)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>مبلغ الشحن المطلوب إضافته:</span>
            {numAmount > 0 && (
              <span className="text-[11px] font-bold text-slate-500">
                {isClientWallet ? (
                  <>شحن اليوم بعد العملية: <strong className={`font-mono ${isOverClientDaily ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatCurrency(newClientDailyTotal)}</strong></>
                ) : (
                  <>الرصيد بعد الشحن: <strong className={`font-mono ${isOverMaxBalance ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatCurrency(newBalance)}</strong></>
                )}
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="any"
              required
              placeholder="اكتب المبلغ بالجنيه (مثال: 5000)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-base sm:text-lg font-black font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
            {(isClientWallet ? [1000, 2000, 5000, 10000, 20000, 60000] : [10000, 20000, 30000, 50000, 100000, 200000]).map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className="btn-interactive px-2.5 py-1 rounded-xl text-xs font-bold border transition-all bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
              >
                <span className="font-mono">+{formatCurrency(val)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Alerts & Warnings for Client Lines */}
        {isClientWallet && isOverClientDaily && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-bold space-y-1">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>⚠️ تنبيه: تم تجاوز الحد اليومي للشحن (60,000 ج.م/يوم)</span>
            </div>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 pr-6">
              إجمالي شحن اليوم لهذا الرقم سيصبح <strong className="font-mono text-slate-900 dark:text-white underline">{formatCurrency(newClientDailyTotal)}</strong> (زيادة بمقدار <strong className="font-mono">{formatCurrency(overClientDailyAmount)}</strong> عن الحد اليومي 60 ألف). سيتم تسجيل الشحن بنجاح.
            </p>
          </div>
        )}

        {isClientWallet && isOverClientMonthly && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-bold space-y-1">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>⚠️ تنبيه: تم تجاوز الليميت الشهري للشحن (200,000 ج.م شهرياً)</span>
            </div>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 pr-6">
              إجمالي الشحن هذا الشهر لهذا الرقم سيصبح <strong className="font-mono text-slate-900 dark:text-white underline">{formatCurrency(newClientMonthTotal)}</strong> (زيادة بمقدار <strong className="font-mono">{formatCurrency(overClientMonthlyAmount)}</strong> عن الليميت الشهري 200 ألف). سيتم تسجيل الشحن بنجاح.
            </p>
          </div>
        )}

        {/* Alerts & Warnings for Shop Lines */}
        {isShopWallet && isOverMaxBalance && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-bold space-y-1">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>⚠️ تنبيه: تم تجاوز الحد المسموح للمحفظة ({formatCurrency(stats.totalLimit || 200000)})</span>
            </div>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 pr-6">
              إجمالي الرصيد سيصبح <strong className="font-mono text-slate-900 dark:text-white underline">{formatCurrency(newBalance)}</strong> (زيادة بمقدار <strong className="font-mono">{formatCurrency(overBalanceAmount)}</strong> عن الليميت المسموح). سيتم تسجيل الرصيد بنجاح.
            </p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ملاحظات أو مصدر الشحن (اختياري):
          </label>
          <input
            type="text"
            placeholder="مثال: شحن فوري من المحطة، إيداع كاش من العميل..."
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
            disabled={!isValidAmount || isSubmitting}
            className={`btn-interactive flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all ${
              isValidAmount && !isSubmitting
                ? hasWarning
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30 ring-1 ring-amber-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 ring-1 ring-emerald-500/40'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'جاري الإضافة...'
                : hasWarning
                ? 'تأكيد شحن الرصيد (مع تنبيه التجاوز)'
                : isClientWallet
                ? 'تأكيد شحن الرصيد للعميل'
                : 'تأكيد إضافة الرصيد للمحفظة'}
            </span>
          </button>
        </div>

      </form>
    </dialog>
  );
}
}
