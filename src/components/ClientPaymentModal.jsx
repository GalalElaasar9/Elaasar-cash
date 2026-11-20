import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { formatCurrency, formatTimeArabic, formatDateArabic } from '../utils/formatters';
import {
  Wallet,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowDownCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function ClientPaymentModal() {
  const {
    activeModal,
    setActiveModal,
    modalData,
    addClientPayment,
    updateClient,
    showToast
  } = useCash();

  const dialogRef = useRef(null);

  const client = modalData?.client;
  const currentDebt = Number(modalData?.currentDebt) || 0;
  const clientType = modalData?.clientType || client?.clientType || 'مدين';

  // Current date and time helpers
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const getCurrentTimeStr = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [time, setTime] = useState(getCurrentTimeStr());
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'vodafone_cash' | 'instapay' | 'bank'
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'clientPayment' && client) {
      if (!dialog.open) dialog.showModal();
      setAmount('');
      setDate(getTodayISO());
      setTime(getCurrentTimeStr());
      setPaymentMethod('cash');
      setNotes('');
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, client]);

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
  const isValidAmount = numAmount > 0;

  // Real-time calculation
  const isPayingMoreThanDebt = currentDebt > 0 && numAmount > currentDebt;
  const creditExcess = isPayingMoreThanDebt ? numAmount - currentDebt : 0;
  const isExactPayment = currentDebt > 0 && numAmount === currentDebt;
  const remainingDebtAfter = currentDebt > numAmount ? currentDebt - numAmount : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!client || !isValidAmount) return;

    setIsSubmitting(true);
    try {
      // Build ISO Date with custom time
      let paymentDate = new Date();
      if (date && time) {
        paymentDate = new Date(`${date}T${time}:00`);
      } else if (date) {
        paymentDate = new Date(`${date}T12:00:00`);
      }

      // Add Payment Transaction
      const paymentTx = addClientPayment({
        clientId: client.id,
        amount: numAmount,
        paymentMethod,
        notes: notes.trim(),
        date: paymentDate,
        time: time
      });

      if (!paymentTx) return;

      // Check if amount paid is GREATER than what was owed
      if (isPayingMoreThanDebt) {
        // Automatically switch client status from مدين to دائن
        updateClient(client.id, { clientType: 'دائن' });
        try {
          localStorage.setItem(`elaasar_client_type_${client.id}`, 'دائن');
        } catch (err) {
          console.error(err);
        }
        showToast(
          `🎉 تم تسجيل سداد ${formatCurrency(numAmount)} في تمام ${time}! المبلغ أكبر من المستحق بمقدار ${formatCurrency(creditExcess)}. تم تحويل العميل تلقائياً إلى "دائن" وله رصيد مستحق: ${formatCurrency(creditExcess)}!`,
          'success'
        );
      } else if (isExactPayment) {
        showToast(
          `تم سداد كامل المبلغ المستحق (${formatCurrency(numAmount)}) في تمام ${time} بنجاح! رصيد الحساب الآن: 0 ج.م`,
          'success'
        );
      } else {
        showToast(
          `تم تسجيل سداد جزئي بقيمة ${formatCurrency(numAmount)} في تمام ${time}. المتبقي على العميل: ${formatCurrency(remainingDebtAfter)}`,
          'info'
        );
      }

      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeModal !== 'clientPayment' || !client) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      aria-labelledby="client-payment-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/60 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="client-payment-title" className="text-lg font-bold">
              تسجيل سداد لحساب العميل
            </h2>
            <p className="text-xs text-emerald-100 mt-0.5">
              سداد دفعة نقدية أو بنكية وخصمها من الرصيد الآجل
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

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        
        {/* Client Current Balance Summary Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">اسم العميل:</span>
            <strong className="text-base font-black text-slate-900 dark:text-white">
              {client.name}
            </strong>
            <span className="text-[11px] block text-slate-400 mt-0.5">
              الحالة الحالية: <span className={`font-bold ${clientType === 'مدين' ? 'text-rose-600' : 'text-emerald-600'}`}>{clientType}</span>
            </span>
          </div>

          <div className="text-left">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">
              {currentDebt > 0 ? 'المطلوب سداده حالياً:' : 'الرصيد المستحق:'}
            </span>
            <div className={`font-mono text-xl font-black ${currentDebt > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} dir="ltr">
              {formatCurrency(currentDebt)}
            </div>
          </div>
        </div>

        {/* Input: Payment Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            مبلغ السداد (ج.م) *
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="1"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مثال: 5000"
              className="w-full pl-14 pr-4 py-3 text-lg font-black font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
              ج.م
            </span>
          </div>

          {/* Quick Selection Buttons */}
          {currentDebt > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setAmount(String(currentDebt))}
                className="btn-interactive px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              >
                سداد كامل المبلغ ({formatCurrency(currentDebt)})
              </button>

              {currentDebt > 200 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(currentDebt / 2)))}
                  className="btn-interactive px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  نصف المبلغ ({formatCurrency(Math.round(currentDebt / 2))})
                </button>
              )}

              <button
                type="button"
                onClick={() => setAmount('1000')}
                className="btn-interactive px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                1,000 ج.م
              </button>

              <button
                type="button"
                onClick={() => setAmount('5000')}
                className="btn-interactive px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                5,000 ج.م
              </button>
            </div>
          )}
        </div>

        {/* Date and Time Fields (وقت وتاريخ السداد) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>تاريخ السداد</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>وقت السداد</span>
            </label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            طريقة السداد
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                paymentMethod === 'cash'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>نقدي (كاش)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('vodafone_cash')}
              className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                paymentMethod === 'vodafone_cash'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>فودافون كاش</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('instapay')}
              className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                paymentMethod === 'instapay'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>إنستاباي</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('bank')}
              className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                paymentMethod === 'bank'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>تحويل بنكي</span>
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ملاحظات السداد (اختياري)
          </label>
          <input
            type="text"
            placeholder="مثال: استلمت باليد في المحل، تحويل من رقم..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* LIVE CALCULATION & AUTO-CONVERSION ALERT BOX */}
        {isValidAmount && (
          <div className="pt-2 animate-in fade-in duration-200">
            {isPayingMoreThanDebt ? (
              /* Case 1: Payment exceeds debt -> Automatic conversion to 'دائن' */
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-2 border-emerald-400 dark:border-emerald-700 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm">
                  <Sparkles className="w-5 h-5 text-emerald-600 animate-bounce" />
                  <span>المبلغ المسدد أكبر من المطلوب! (تحويل تلقائي لدائن)</span>
                </div>
                <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <p>
                    المبلغ المطلوب حالياً: <strong>{formatCurrency(currentDebt)}</strong> • المبلغ المسدد: <strong>{formatCurrency(numAmount)}</strong>
                  </p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    ✨ الزيادة المستحقة للعميل: <strong className="font-mono text-base font-black text-emerald-800 dark:text-emerald-100">{formatCurrency(creditExcess)}</strong>
                  </p>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                    سيتم تلقائياً تحويل تصنيف العميل من <strong>مدين</strong> إلى <strong>دائن</strong> ونقله إلى كشف الدائنين برصيد دائن: {formatCurrency(creditExcess)}.
                  </p>
                </div>
              </div>
            ) : isExactPayment ? (
              /* Case 2: Exact full payment */
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <strong>سداد كامل المبلغ المطلوب ({formatCurrency(numAmount)})</strong>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                    سيصبح حساب العميل خالصاً تماماً بعد هذا السداد (المتبقي: 0 ج.م).
                  </p>
                </div>
              </div>
            ) : (
              /* Case 3: Partial payment */
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <strong>سداد جزء من المبلغ</strong>
                    <span className="block text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                      المتبقي على العميل بعد السداد:
                    </span>
                  </div>
                </div>
                <strong className="font-mono text-base font-black text-amber-800 dark:text-amber-200" dir="ltr">
                  {formatCurrency(remainingDebtAfter)}
                </strong>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            className="btn-interactive px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={!isValidAmount || isSubmitting}
            className={`btn-interactive flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all ${
              !isValidAmount || isSubmitting
                ? 'opacity-50 cursor-not-allowed bg-slate-400'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد وتسجيل السداد</span>
          </button>
        </div>

      </form>
    </dialog>
  );
}
