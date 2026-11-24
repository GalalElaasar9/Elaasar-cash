import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { formatCurrency, formatTimeArabic, formatDateArabic, getTodayString, calculateWalletStats } from '../utils/formatters';
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
  ArrowRight,
  HandCoins,
  Coins,
  Store
} from 'lucide-react';

export default function ClientPaymentModal() {
  const {
    transactions,
    activeModal,
    setActiveModal,
    modalData,
    addClientPayment,
    updateClient,
    archiveClientCycle,
    treasury,
    shopWallets,
    instapayAccounts,
    showToast
  } = useCash();

  const dialogRef = useRef(null);

  const client = modalData?.client;
  const currentBalance = Number(modalData?.currentDebt) || 0;
  const clientType = modalData?.clientType || client?.clientType || 'مدين';
  const isCreditor = Boolean(modalData?.isCreditor || clientType === 'دائن');

  // Current date and time helpers
  const getTodayISO = () => getTodayString();
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
  const [selectedShopWalletId, setSelectedShopWalletId] = useState('');
  const [selectedInstapayAccountId, setSelectedInstapayAccountId] = useState('');
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
      setSelectedShopWalletId('');
      setSelectedInstapayAccountId(instapayAccounts?.find(a => a.isDefault)?.id || instapayAccounts?.[0]?.id || '');
      setNotes('');
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, client, instapayAccounts]);

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

  const rawInputAmount = Number(amount) || 0;
  const isVodafoneCash = paymentMethod === 'vodafone_cash';
  // عند التسديد فودافون كاش يتم ضرب المبلغ المسدد المكتوب بالإنبوت في 0.99
  const effectiveAmount = isVodafoneCash ? (rawInputAmount * 0.99) : rawInputAmount;
  const isValidAmount = rawInputAmount > 0;

  // Real-time calculation based on effective credited amount
  const isPayingMore = currentBalance > 0 && effectiveAmount > currentBalance;
  const excess = isPayingMore ? (effectiveAmount - currentBalance) : 0;
  const isExactPayment = currentBalance > 0 && Math.abs(effectiveAmount - currentBalance) < 0.01;
  const remainingAfter = currentBalance > effectiveAmount ? (currentBalance - effectiveAmount) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!client || !isValidAmount) return;

    setIsSubmitting(true);
    try {
      // Build ISO Date with custom time
      let paymentDate = new Date();
      const todayStr = getTodayISO();
      const now = new Date();
      const currentTimeStr = getCurrentTimeStr();

      if (date === todayStr && time === currentTimeStr) {
        // Real-time payment happening right now: keep full precision timestamp (Date.now())
        // This guarantees that any payment done after a recharge preserves its exact chronological order
        paymentDate = now;
      } else if (date && time) {
        paymentDate = new Date(`${date}T${time}:00`);
        // If today and within the current minute, ensure it doesn't artificially regress behind now
        if (date === todayStr && Math.abs(now.getTime() - paymentDate.getTime()) < 60000) {
          paymentDate = now;
        }
      } else if (date) {
        paymentDate = new Date(`${date}T12:00:00`);
      }

      // Add Payment Transaction
      const defaultNote = isCreditor
        ? (isVodafoneCash
            ? `صرف مستحقات للعميل الدائن فودافون كاش (${formatCurrency(rawInputAmount)} × 0.99 = ${formatCurrency(effectiveAmount)})`
            : 'صرف وسداد مستحقات للعميل الدائن من المحل')
        : (isVodafoneCash
            ? `سداد فودافون كاش (${formatCurrency(rawInputAmount)} × 0.99 = ${formatCurrency(effectiveAmount)})`
            : 'سداد دفعة من الحساب الآجل');

      const paymentTx = addClientPayment({
        clientId: client.id,
        amount: effectiveAmount,
        rawAmount: rawInputAmount,
        paymentMethod,
        shopWalletId: paymentMethod === 'vodafone_cash' && selectedShopWalletId ? selectedShopWalletId : null,
        instapayAccountId: paymentMethod === 'instapay' && selectedInstapayAccountId ? selectedInstapayAccountId : null,
        isCreditorPayout: isCreditor,
        excessDebt: (isCreditor && isPayingMore) ? excess : 0,
        excessCredit: (!isCreditor && isPayingMore) ? excess : 0,
        creditBefore: isCreditor ? currentBalance : 0,
        debtBefore: !isCreditor ? currentBalance : 0,
        notes: notes.trim() || defaultNote,
        date: paymentDate,
        time: time
      });

      if (!paymentTx) return;

      // Safe cutoff timestamp representing the moment of settlement
      const safeSettledTime = Math.max(Date.now(), paymentDate.getTime());
      const safeSettledISO = new Date(safeSettledTime).toISOString();

      if (isCreditor) {
        // ========================================================
        // الحالة الأولى: العميل دائن (صاحب المحل يسدد للعميل فلوسه)
        // ========================================================
        if (isPayingMore) {
          // دفع للعميل أكثر من رصيده الدائن -> يتحول إلى مدين بالمبلغ الزائد فقط!
          const excessAmount = excess;
          const payoutISO = safeSettledISO;

          updateClient(client.id, {
            clientType: 'مدين',
            excessDebt: excessAmount,
            excessDebtDate: payoutISO,
            settledAt: payoutISO,
            excessCredit: 0,
            excessCreditDate: null,
            commissionPercent: 1,
            commissionMode: 'none'
          });

          try {
            localStorage.setItem(`elaasar_client_type_${client.id}`, 'مدين');
            localStorage.setItem(`elaasar_client_excess_debt_${client.id}`, String(excessAmount));
            localStorage.setItem(`elaasar_client_excess_debt_date_${client.id}`, payoutISO);
            localStorage.setItem(`elaasar_client_settled_at_${client.id}`, payoutISO);
            localStorage.removeItem(`elaasar_client_excess_credit_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_credit_date_${client.id}`);
            localStorage.setItem(`elaasar_client_commission_${client.id}`, '1');
            localStorage.setItem(`elaasar_client_commission_mode_${client.id}`, 'none');
            window.dispatchEvent(new CustomEvent('elaasar_client_type_changed', { detail: { resultingType: 'مدين', clientId: client.id } }));
          } catch (err) {
            console.error(err);
          }

          archiveClientCycle({
            transactionId: paymentTx?.id,
            clientId: client.id,
            clientName: client.name,
            cycleType: 'صرف مستحقات دائن بزيادة (تحويل لمدين)',
            creditBefore: currentBalance,
            debtBefore: 0,
            amountPaid: effectiveAmount,
            rawAmount: rawInputAmount,
            paymentMethod,
            excessAmount: excessAmount,
            finalBalance: excessAmount,
            resultingType: 'مدين',
            isClosedCycle: true,
            notes: notes.trim() || `صرف مستحقات للعميل الدائن (${formatCurrency(effectiveAmount)}) وتجاوز رصيده الدائن بمقدار ${formatCurrency(excessAmount)} ج.م، تم تحويله إلى مدين بالمبلغ الزائد فقط`,
            date: paymentDate,
            time
          });

          showToast(
            isVodafoneCash
              ? `⚠️ تم صرف ${formatCurrency(rawInputAmount)} فودافون كاش (الصافي بعد × 0.99: ${formatCurrency(effectiveAmount)}) للعميل! المبلغ أكبر من رصيده الدائن بمقدار ${formatCurrency(excess)}. تم تحويل العميل تلقائياً إلى "مدين" والدين المستحق عليه هو المبلغ الزائد: ${formatCurrency(excess)} فقط!`
              : `⚠️ تم صرف ${formatCurrency(effectiveAmount)} للعميل في تمام ${time}! المبلغ أكبر من رصيده الدائن بمقدار ${formatCurrency(excess)}. تم تحويل العميل تلقائياً إلى "مدين" والدين المستحق عليه هو المبلغ الزائد: ${formatCurrency(excess)} فقط!`,
            'warning'
          );
        } else if (isExactPayment || remainingAfter === 0) {
          const settledISO = safeSettledISO;
          updateClient(client.id, {
            clientType: 'عادي',
            settledAt: settledISO,
            excessDebt: 0,
            excessDebtDate: null,
            excessCredit: 0,
            excessCreditDate: null
          });
          try {
            localStorage.setItem(`elaasar_client_type_${client.id}`, 'عادي');
            localStorage.setItem(`elaasar_client_settled_at_${client.id}`, settledISO);
            localStorage.removeItem(`elaasar_client_excess_debt_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_debt_date_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_credit_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_credit_date_${client.id}`);
            window.dispatchEvent(new CustomEvent('elaasar_client_type_changed', { detail: { resultingType: 'عادي', clientId: client.id } }));
          } catch (e) {
            console.error(e);
          }

          archiveClientCycle({
            transactionId: paymentTx?.id,
            clientId: client.id,
            clientName: client.name,
            cycleType: 'صرف مستحقات دائن وتصفير الحساب',
            creditBefore: currentBalance,
            debtBefore: 0,
            amountPaid: effectiveAmount,
            rawAmount: rawInputAmount,
            paymentMethod,
            excessAmount: 0,
            finalBalance: 0,
            resultingType: 'عادي',
            isClosedCycle: true,
            notes: notes.trim() || `صرف كامل مستحقات العميل الدائن (${formatCurrency(effectiveAmount)}) وتصفير حسابه بالكامل ليصبح عميل عادي (0 ج.م)`,
            date: paymentDate,
            time
          });

          showToast(
            isVodafoneCash
              ? `تم صرف كامل مستحقات العميل الدائن بنجاح (${formatCurrency(rawInputAmount)} فودافون كاش × 0.99 = ${formatCurrency(effectiveAmount)}) في تمام ${time}! رصيد الحساب أصبح 0 ج.م وتم تحويله تلقائياً إلى "عميل عادي"`
              : `تم صرف كامل مستحقات العميل الدائن (${formatCurrency(effectiveAmount)}) في تمام ${time} بنجاح! رصيد الحساب أصبح 0 ج.م وتم تحويله تلقائياً إلى "عميل عادي"`,
            'success'
          );
        } else {
          // Partial Payout for Creditor
          archiveClientCycle({
            transactionId: paymentTx?.id,
            clientId: client.id,
            clientName: client.name,
            cycleType: 'صرف دفعة لمستحق دائن',
            creditBefore: currentBalance,
            debtBefore: 0,
            amountPaid: effectiveAmount,
            rawAmount: rawInputAmount,
            paymentMethod,
            excessAmount: 0,
            finalBalance: remainingAfter,
            resultingType: 'دائن',
            isClosedCycle: false,
            notes: notes.trim() || `صرف دفعة جزئية (${formatCurrency(effectiveAmount)}) للعميل الدائن، المتبقي له في رصيده: ${formatCurrency(remainingAfter)} ج.م`,
            date: paymentDate,
            time
          });

          showToast(
            isVodafoneCash
              ? `تم صرف ${formatCurrency(rawInputAmount)} فودافون كاش (الصافي: ${formatCurrency(effectiveAmount)}) للعميل الدائن في تمام ${time}. المتبقي له في رصيده: ${formatCurrency(remainingAfter)}`
              : `تم صرف ${formatCurrency(effectiveAmount)} للعميل الدائن في تمام ${time}. المتبقي له في رصيده: ${formatCurrency(remainingAfter)}`,
            'info'
          );
        }
      } else {
        // ========================================================
        // الحالة الثانية: العميل مدين (العميل يسدد للمحل دينه)
        // يتحول إلى دائن في حالة واحدة: سدد مبلغ أكبر من الدين المستحق عليه
        // ========================================================
        if (isPayingMore) {
          // سداد أكبر من الدين -> يتحول إلى دائن بالمبلغ الزائد فقط!
          const excessCreditAmount = excess;
          const paymentISO = safeSettledISO;

          updateClient(client.id, {
            clientType: 'دائن',
            excessCredit: excessCreditAmount,
            excessCreditDate: paymentISO,
            settledAt: paymentISO,
            excessDebt: null,
            excessDebtDate: null
          });
          try {
            localStorage.setItem(`elaasar_client_type_${client.id}`, 'دائن');
            localStorage.setItem(`elaasar_client_excess_credit_${client.id}`, String(excessCreditAmount));
            localStorage.setItem(`elaasar_client_excess_credit_date_${client.id}`, paymentISO);
            localStorage.setItem(`elaasar_client_settled_at_${client.id}`, paymentISO);
            localStorage.removeItem(`elaasar_client_excess_debt_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_debt_date_${client.id}`);
            window.dispatchEvent(new CustomEvent('elaasar_client_type_changed', { detail: { resultingType: 'دائن', clientId: client.id } }));
          } catch (err) {
            console.error(err);
          }

          archiveClientCycle({
            transactionId: paymentTx?.id,
            clientId: client.id,
            clientName: client.name,
            cycleType: 'سداد مديونية مع فائض (تحويل لدائن)',
            debtBefore: currentBalance,
            creditBefore: 0,
            amountPaid: effectiveAmount,
            rawAmount: rawInputAmount,
            paymentMethod,
            excessAmount: excessCreditAmount,
            finalBalance: excessCreditAmount,
            resultingType: 'دائن',
            isClosedCycle: true,
            notes: notes.trim() || `سداد كامل المديونية السابقة (${formatCurrency(currentBalance)}) ودفع زيادة بمقدار ${formatCurrency(excessCreditAmount)} ج.م، تم تحويله إلى دائن برصيد الفائض فقط`,
            date: paymentDate,
            time
          });

          showToast(
            isVodafoneCash
              ? `🎉 تم سداد ${formatCurrency(rawInputAmount)} فودافون كاش (الصافي بعد × 0.99: ${formatCurrency(effectiveAmount)}) في تمام ${time}! المبلغ أكبر من المستحق بمقدار ${formatCurrency(excess)}. تم تحويل العميل تلقائياً إلى "دائن" وله رصيد مستحق: ${formatCurrency(excess)}!`
              : `🎉 تم تسجيل سداد ${formatCurrency(effectiveAmount)} في تمام ${time}! المبلغ أكبر من المستحق بمقدار ${formatCurrency(excess)}. تم تحويل العميل تلقائياً إلى "دائن" وله رصيد مستحق: ${formatCurrency(excess)}!`,
            'success'
          );
        } else if (isExactPayment || remainingAfter === 0) {
          const settledISO = safeSettledISO;
          updateClient(client.id, {
            clientType: 'عادي',
            settledAt: settledISO,
            excessDebt: 0,
            excessDebtDate: null,
            excessCredit: 0,
            excessCreditDate: null
          });
          try {
            localStorage.setItem(`elaasar_client_type_${client.id}`, 'عادي');
            localStorage.setItem(`elaasar_client_settled_at_${client.id}`, settledISO);
            localStorage.removeItem(`elaasar_client_excess_debt_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_debt_date_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_credit_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_credit_date_${client.id}`);
            window.dispatchEvent(new CustomEvent('elaasar_client_type_changed', { detail: { resultingType: 'عادي', clientId: client.id } }));
          } catch (e) {
            console.error(e);
          }

          archiveClientCycle({
            transactionId: paymentTx?.id,
            clientId: client.id,
            clientName: client.name,
            cycleType: 'سداد كامل المديونية وتصفير الحساب',
            debtBefore: currentBalance,
            creditBefore: 0,
            amountPaid: effectiveAmount,
            rawAmount: rawInputAmount,
            paymentMethod,
            excessAmount: 0,
            finalBalance: 0,
            resultingType: 'عادي',
            isClosedCycle: true,
            notes: notes.trim() || `سداد كامل المبلغ المطلوب (${formatCurrency(effectiveAmount)}) وتصفير الحساب ليصبح عميل عادي (0 ج.م)`,
            date: paymentDate,
            time
          });

          showToast(
            isVodafoneCash
              ? `تم سداد كامل المطلوب بنجاح (${formatCurrency(rawInputAmount)} فودافون كاش × 0.99 = ${formatCurrency(effectiveAmount)}) في تمام ${time}! رصيد الحساب الآن: 0 ج.م وتم تحويل العميل تلقائياً إلى "عميل عادي"`
              : `تم سداد كامل المبلغ المستحق (${formatCurrency(effectiveAmount)}) في تمام ${time} بنجاح! رصيد الحساب الآن: 0 ج.م وتم تحويل العميل تلقائياً إلى "عميل عادي"`,
            'success'
          );
        } else {
          if (client.excessDebt) {
            const nextExcess = Math.max(0, client.excessDebt - effectiveAmount);
            if (nextExcess === 0) {
              const settledISO = safeSettledISO;
              updateClient(client.id, {
                clientType: 'عادي',
                settledAt: settledISO,
                excessDebt: 0,
                excessDebtDate: null
              });
              try {
                localStorage.setItem(`elaasar_client_type_${client.id}`, 'عادي');
                localStorage.setItem(`elaasar_client_settled_at_${client.id}`, settledISO);
                localStorage.removeItem(`elaasar_client_excess_debt_${client.id}`);
                localStorage.removeItem(`elaasar_client_excess_debt_date_${client.id}`);
                window.dispatchEvent(new CustomEvent('elaasar_client_type_changed', { detail: { resultingType: 'عادي', clientId: client.id } }));
              } catch (e) {
                console.error(e);
              }

              archiveClientCycle({
                transactionId: paymentTx?.id,
                clientId: client.id,
                clientName: client.name,
                cycleType: 'سداد كامل المبلغ الزائد وتصفير الحساب',
                debtBefore: client.excessDebt,
                creditBefore: 0,
                amountPaid: effectiveAmount,
                rawAmount: rawInputAmount,
                paymentMethod,
                excessAmount: 0,
                finalBalance: 0,
                resultingType: 'عادي',
                isClosedCycle: true,
                notes: notes.trim() || `سداد كامل المبلغ الزائد المطلوب (${formatCurrency(effectiveAmount)}) وتصفير الحساب ليصبح عميل عادي (0 ج.م)`,
                date: paymentDate,
                time
              });
            } else {
              updateClient(client.id, { excessDebt: nextExcess });
              try {
                localStorage.setItem(`elaasar_client_excess_debt_${client.id}`, String(nextExcess));
              } catch (e) {
                console.error(e);
              }

              archiveClientCycle({
                transactionId: paymentTx?.id,
                clientId: client.id,
                clientName: client.name,
                cycleType: 'سداد دفعة من المبلغ الزائد',
                debtBefore: client.excessDebt,
                creditBefore: 0,
                amountPaid: effectiveAmount,
                rawAmount: rawInputAmount,
                paymentMethod,
                excessAmount: 0,
                finalBalance: nextExcess,
                resultingType: 'مدين',
                isClosedCycle: false,
                notes: notes.trim() || `سداد دفعة (${formatCurrency(effectiveAmount)}) من المبلغ الزائد، المتبقي: ${formatCurrency(nextExcess)} ج.م`,
                date: paymentDate,
                time
              });
            }
          } else {
            // Standard debtor paying a partial amount (سداد دفعة جزئية من الحساب الآجل)
            archiveClientCycle({
              transactionId: paymentTx?.id,
              clientId: client.id,
              clientName: client.name,
              cycleType: 'سداد دفعة من الحساب',
              debtBefore: currentBalance,
              creditBefore: 0,
              amountPaid: effectiveAmount,
              rawAmount: rawInputAmount,
              paymentMethod,
              excessAmount: 0,
              finalBalance: remainingAfter,
              resultingType: 'مدين',
              isClosedCycle: false,
              notes: notes.trim() || `سداد دفعة جزئية (${formatCurrency(effectiveAmount)}) من الحساب الآجل، المتبقي على العميل: ${formatCurrency(remainingAfter)} ج.م`,
              date: paymentDate,
              time
            });
          }

          const displayTime12 = formatTimeArabic(time || paymentDate);
          showToast(
            isVodafoneCash
              ? `تم سداد ${formatCurrency(rawInputAmount)} فودافون كاش (الصافي المسدد: ${formatCurrency(effectiveAmount)}) في تمام ${displayTime12}. المتبقي على العميل: ${formatCurrency(remainingAfter)}`
              : `تم تسجيل سداد جزئي بقيمة ${formatCurrency(effectiveAmount)} في تمام ${displayTime12}. المتبقي على العميل: ${formatCurrency(remainingAfter)}`,
            'info'
          );
        }
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
      <div className={`p-5 sm:p-6 text-white flex items-center justify-between transition-all ${
        isCreditor
          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700'
          : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
            {isCreditor ? (
              <HandCoins className="w-5 h-5 text-white" />
            ) : (
              <Wallet className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="client-payment-title" className="text-lg font-bold">
                {isCreditor ? 'صرف وسداد مستحقات للعميل الدائن' : 'تسجيل سداد لحساب العميل المدين'}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-black">
                {isCreditor ? 'عميل دائن' : 'عميل مدين'}
              </span>
            </div>
            <p className="text-xs text-white/90 mt-0.5">
              {isCreditor
                ? 'صاحب المحل يسدد للعميل رصيده المستحق لديه (صرف مستحقات)'
                : 'سداد دفعة نقدية أو بنكية وخصمها من الرصيد الآجل المطلوب من العميل'}
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
        
        {/* Notice Banner for Creditor */}
        {isCreditor && (
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center gap-3 text-xs text-blue-900 dark:text-blue-200 animate-in fade-in">
            <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 shadow-xs">
              <ArrowDownCircle className="w-4 h-4" />
            </div>
            <div>
              <strong className="block font-bold text-blue-950 dark:text-blue-100">
                صاحب المحل هو الذي يقوم بسداد الفلوس للعميل (صرف مستحقات):
              </strong>
              <span className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5 block">
                هذا العميل له رصيد دائن طرف المحل. سيتم خصم هذا المبلغ من رصيده المستحق لديك.
              </span>
            </div>
          </div>
        )}

        {/* Client Current Balance Summary Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">اسم العميل:</span>
            <strong className="text-base font-black text-slate-900 dark:text-white">
              {client.name}
            </strong>
            <span className="text-[11px] block text-slate-400 mt-0.5">
              الحالة الحالية:{' '}
              <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                isCreditor
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
              }`}>
                {isCreditor ? 'دائن (له فلوس عند المحل)' : 'مدين (عليه فلوس للمحل)'}
              </span>
            </span>
          </div>

          <div className="text-left">
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold">
              {isCreditor ? 'الرصيد الدائن المستحق للعميل:' : 'المطلوب سداده من العميل حالياً:'}
            </span>
            <div className={`font-mono text-xl font-black ${
              isCreditor ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`} dir="ltr">
              {formatCurrency(currentBalance)}
            </div>
          </div>
        </div>

        {/* Input: Payment Amount */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            {isCreditor
              ? 'المبلغ المصروف / المسدد للعميل من المحل (ج.م) *'
              : 'مبلغ السداد المستلم من العميل (ج.م) *'}
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
              placeholder="مثال: 10000"
              className="w-full pl-14 pr-4 py-3 text-lg font-black font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
              ج.م
            </span>
          </div>

          {/* Live Calculation Strip for Vodafone Cash */}
          {isVodafoneCash && rawInputAmount > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs mt-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-200">
                <Smartphone className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-bold">حساب فودافون كاش (المبلغ المدخل × 0.99):</span>
              </div>
              <div className="font-mono font-bold text-rose-900 dark:text-rose-100 flex items-center gap-1.5" dir="ltr">
                <span>{formatCurrency(rawInputAmount)} × 0.99</span>
                <span>=</span>
                <span className="text-sm font-black text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 shadow-2xs">
                  {formatCurrency(effectiveAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Quick Selection Buttons */}
          {currentBalance > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setAmount(String(currentBalance))}
                className="btn-interactive px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              >
                {isCreditor ? `صرف كامل الرصيد (${formatCurrency(currentBalance)})` : `سداد كامل المبلغ (${formatCurrency(currentBalance)})`}
              </button>

              {currentBalance > 200 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.round(currentBalance / 2)))}
                  className="btn-interactive px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  نصف المبلغ ({formatCurrency(Math.round(currentBalance / 2))})
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

              <button
                type="button"
                onClick={() => setAmount('10000')}
                className="btn-interactive px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                10,000 ج.م
              </button>
            </div>
          )}
        </div>

        {/* Date and Time Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>تاريخ العملية</span>
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
              <span>وقت العملية</span>
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

        {/* Payment Method Selector & Treasury Integration */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              طريقة الدفع / التحويل (مرتبطة مباشرة برأس المال)
            </label>
            <span className="text-[10px] text-slate-400 font-bold">
              تأثير لحظي في الخزائن
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                paymentMethod === 'cash'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" />
                <span>نقدي (كاش)</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                paymentMethod === 'cash' ? 'bg-black/20 text-white' : 'text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700'
              }`}>
                {formatCurrency(treasury?.drawerCash || 0)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('vodafone_cash')}
              className={`p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all relative ${
                paymentMethod === 'vodafone_cash'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>فودافون كاش</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-mono font-black ${
                    paymentMethod === 'vodafone_cash'
                      ? 'bg-black/20 text-white'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                  dir="ltr"
                >
                  ×0.99
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                paymentMethod === 'vodafone_cash' ? 'bg-black/20 text-white' : 'text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700'
              }`}>
                {formatCurrency(treasury?.vodafoneCash || 0)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('instapay')}
              className={`p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                paymentMethod === 'instapay'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>إنستاباي</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                paymentMethod === 'instapay' ? 'bg-black/20 text-white' : 'text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700'
              }`}>
                {formatCurrency(treasury?.instapay || 0)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('bank')}
              className={`p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                paymentMethod === 'bank'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>تحويل بنكي</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                paymentMethod === 'bank' ? 'bg-black/20 text-white' : 'text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700'
              }`}>
                {formatCurrency(treasury?.bankAccounts || 0)}
              </span>
            </button>
          </div>

          {/* Shop Line Selector if Vodafone Cash */}
          {paymentMethod === 'vodafone_cash' && (
            <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-rose-600" />
                  <span>
                    {isCreditor ? 'اختر خط المحل المحول منه (لتحديث ليميت الخط أيضاً):' : 'اختر خط المحل المستلم (لتحديث ليميت الخط أيضاً):'}
                  </span>
                </label>
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  {shopWallets?.length || 0} خط مسجل
                </span>
              </div>
              <select
                value={selectedShopWalletId}
                onChange={(e) => setSelectedShopWalletId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold font-mono bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <option value="">-- اختياري: بدون تحديد خط محدد (خصم/إيداع بخزينة رأس المال فقط) --</option>
                {(shopWallets || []).map(w => {
                  const stats = calculateWalletStats(w, transactions);
                  return (
                    <option key={w.id} value={w.id}>
                      {w.phoneNumber} - {w.label || 'خط المحل'} (المتاح بالخط: {formatCurrency(stats.remainingLimit)})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* InstaPay Account Selector if InstaPay */}
          {paymentMethod === 'instapay' && (
            <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                  <span>
                    {isCreditor ? 'اختر حساب إنستاباي المحول منه لمستحقات العميل:' : 'اختر حساب إنستاباي المستلم لتحصيل المديونية:'}
                  </span>
                </label>
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                  {instapayAccounts?.length || 0} حساب مسجل
                </span>
              </div>
              <select
                value={selectedInstapayAccountId}
                onChange={(e) => setSelectedInstapayAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold font-mono bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {(instapayAccounts || []).map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} - ({acc.handle}) [المتاح: {formatCurrency(acc.balance || 0)}] {acc.isDefault ? '★ افتراضي' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Treasury Impact Live Banner */}
          {(() => {
            const channelNamesMap = {
              cash: 'كاش الدرج',
              vodafone_cash: 'فودافون كاش',
              instapay: 'إنستاباي',
              bank: 'الحسابات البنكية'
            };
            const channelBalMap = {
              cash: Number(treasury?.drawerCash) || 0,
              vodafone_cash: Number(treasury?.vodafoneCash) || 0,
              instapay: Number(treasury?.instapay) || 0,
              bank: Number(treasury?.bankAccounts) || 0
            };
            const chName = channelNamesMap[paymentMethod] || 'الخزينة';
            const chBal = channelBalMap[paymentMethod] || 0;
            const inputVal = Number(amount) || 0;
            const isShort = isCreditor && inputVal > chBal;

            return (
              <div className="space-y-1.5">
                <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
                  isCreditor
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                }`}>
                  <div className="flex items-center gap-2">
                    <Coins className={`w-4 h-4 shrink-0 ${isCreditor ? 'text-rose-600' : 'text-emerald-600'}`} />
                    <span className="text-slate-700 dark:text-slate-300">
                      {isCreditor ? (
                        <>
                          سيتم صرف <b className="text-rose-600 font-mono font-black">{inputVal > 0 ? formatCurrency(inputVal) : '0 ج.م'}</b> وخصمها تلقائياً من رصيد <b>{chName}</b> برأس المال
                        </>
                      ) : (
                        <>
                          سيتم تحصيل <b className="text-emerald-600 font-mono font-black">{inputVal > 0 ? formatCurrency(inputVal) : '0 ج.م'}</b> وإيداعها مباشرة في رصيد <b>{chName}</b> برأس المال
                        </>
                      )}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">رصيد {chName}</span>
                    <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                      {formatCurrency(chBal)}
                    </span>
                  </div>
                </div>

                {isShort && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      تنبيه سيولة: الرصيد المسجل في {chName} ({formatCurrency(chBal)}) أقل من المبلغ المطلوب صرفه ({formatCurrency(inputVal)}). سيتم إتمام العملية وتحديث الخزينة.
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ملاحظات العملية (اختياري)
          </label>
          <input
            type="text"
            placeholder={isCreditor ? 'مثال: صرف رصيد دائن باليد، تحويل لمحفظة العميل...' : 'مثال: استلمت باليد في المحل، تحويل من رقم...'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* LIVE CALCULATION & AUTO-CONVERSION ALERT BOX */}
        {isValidAmount && (
          <div className="pt-2 animate-in fade-in duration-200">
            {isCreditor ? (
              /* ========================================================
                 حالة العميل الدائن: صاحب المحل يصرف ويسدد له
                 ======================================================== */
              isPayingMore ? (
                /* Case 1: Payout exceeds credit -> Auto-convert to 'مدين'! */
                <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/50 dark:to-orange-950/50 border-2 border-rose-400 dark:border-rose-700 space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-black text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-600 animate-bounce" />
                    <span>المبلغ المصروف أكبر من رصيد العميل الدائن! (تحويل تلقائي لـ مدين)</span>
                  </div>
                  <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                    <p>
                      رصيد العميل الدائن الحالي: <strong>{formatCurrency(currentBalance)}</strong> •{' '}
                      {isVodafoneCash ? (
                        <>المصروف للعميل: <strong>{formatCurrency(rawInputAmount)}</strong> (الصافي بعد × 0.99: <strong>{formatCurrency(effectiveAmount)}</strong>)</>
                      ) : (
                        <>المصروف للعميل: <strong>{formatCurrency(effectiveAmount)}</strong></>
                      )}
                    </p>
                    <p className="font-bold text-rose-700 dark:text-rose-300 text-sm">
                      ⚠️ المبلغ الزائد على العميل (دين للمحل): <strong className="font-mono text-base font-black text-rose-800 dark:text-rose-100">{formatCurrency(excess)}</strong>
                    </p>
                    <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 pt-1 border-t border-rose-200 dark:border-rose-800">
                      سيتم تلقائياً تحويل تصنيف العميل من <strong>دائن</strong> إلى <strong>مدين</strong> ونقله إلى كشف المدينين ومطالبته بمبلغ <strong>{formatCurrency(excess)}</strong>.
                    </p>
                  </div>
                </div>
              ) : isExactPayment ? (
                /* Case 2: Exact full credit payout */
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-200">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <strong>
                      {isVodafoneCash ? (
                        <>صرف كامل مستحقات العميل الدائن (الصافي بعد × 0.99: {formatCurrency(effectiveAmount)})</>
                      ) : (
                        <>صرف كامل مستحقات العميل الدائن ({formatCurrency(effectiveAmount)})</>
                      )}
                    </strong>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                      تمت تسوية حساب العميل بالكامل وأصبح رصيده خالصاً (0 ج.م).
                    </p>
                  </div>
                </div>
              ) : (
                /* Case 3: Partial credit payout */
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <strong>صرف جزء من مستحقات العميل الدائن</strong>
                      {isVodafoneCash && (
                        <span className="block text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-0.5" dir="rtl">
                          الصافي المصروف للعميل ({formatCurrency(rawInputAmount)} × 0.99): {formatCurrency(effectiveAmount)}
                        </span>
                      )}
                      <span className="block text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                        المتبقي للعميل في حسابه الدائن:
                      </span>
                    </div>
                  </div>
                  <strong className="font-mono text-base font-black text-blue-800 dark:text-blue-200" dir="ltr">
                    {formatCurrency(remainingAfter)}
                  </strong>
                </div>
              )
            ) : (
              /* ========================================================
                 حالة العميل المدين: العميل يسدد للمحل دينه
                 ======================================================== */
              isPayingMore ? (
                /* Case 1: Payment exceeds debt -> Automatic conversion to 'دائن' */
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-2 border-emerald-400 dark:border-emerald-700 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm">
                    <Sparkles className="w-5 h-5 text-emerald-600 animate-bounce" />
                    <span>المبلغ المسدد أكبر من المطلوب! (تحويل تلقائي لدائن)</span>
                  </div>
                  <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                    <p>
                      المبلغ المطلوب حالياً: <strong>{formatCurrency(currentBalance)}</strong> •{' '}
                      {isVodafoneCash ? (
                        <>المدخل: <strong>{formatCurrency(rawInputAmount)}</strong> (الصافي بعد × 0.99: <strong>{formatCurrency(effectiveAmount)}</strong>)</>
                      ) : (
                        <>المبلغ المسدد: <strong>{formatCurrency(effectiveAmount)}</strong></>
                      )}
                    </p>
                    <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                      ✨ الزيادة المستحقة للعميل: <strong className="font-mono text-base font-black text-emerald-800 dark:text-emerald-100">{formatCurrency(excess)}</strong>
                    </p>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                      سيتم تلقائياً تحويل تصنيف العميل من <strong>مدين</strong> إلى <strong>دائن</strong> ونقله إلى كشف الدائنين برصيد دائن: {formatCurrency(excess)}.
                    </p>
                  </div>
                </div>
              ) : isExactPayment ? (
                /* Case 2: Exact full payment */
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong>
                      {isVodafoneCash ? (
                        <>سداد كامل المبلغ المطلوب (الصافي بعد × 0.99: {formatCurrency(effectiveAmount)})</>
                      ) : (
                        <>سداد كامل المبلغ المطلوب ({formatCurrency(effectiveAmount)})</>
                      )}
                    </strong>
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
                      {isVodafoneCash && (
                        <span className="block text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-0.5" dir="rtl">
                          الصافي المخصوم من الحساب ({formatCurrency(rawInputAmount)} × 0.99): {formatCurrency(effectiveAmount)}
                        </span>
                      )}
                      <span className="block text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                        المتبقي على العميل بعد السداد:
                      </span>
                    </div>
                  </div>
                  <strong className="font-mono text-base font-black text-amber-800 dark:text-amber-200" dir="ltr">
                    {formatCurrency(remainingAfter)}
                  </strong>
                </div>
              )
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
                : isCreditor
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
            }`}
          >
            {isCreditor ? <ArrowDownCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{isCreditor ? 'تأكيد وصرف المبلغ للعميل' : 'تأكيد وتسجيل السداد'}</span>
          </button>
        </div>

      </form>
    </dialog>
  );
}
