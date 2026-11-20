import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  formatPhone, 
  calculateWalletStats, 
  getTodayString,
  cleanEgyptianPhone,
  isValidEgyptianPhone,
  getEgyptianPhoneError,
  getEgyptianCarrier
} from '../utils/formatters';
import { 
  Send, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Phone, 
  User, 
  FileText, 
  Hash, 
  ArrowDownRight,
  Lock,
  Calendar
} from 'lucide-react';

export default function NewTransferModal() {
  const { 
    clients, 
    transactions, 
    activeModal, 
    setActiveModal, 
    modalData, 
    addTransaction,
    showToast,
    askConfirm 
  } = useCash();

  const dialogRef = useRef(null);

  // Form states
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate transaction code on modal open
  useEffect(() => {
    if (activeModal === 'transfer') {
      const randomCode = `VF-${Math.floor(100000 + Math.random() * 900000)}`;
      setTransactionCode(randomCode);

      // Pre-fill from modalData if opened from a specific wallet
      if (modalData?.clientId) {
        setSelectedClientId(modalData.clientId);
        if (modalData?.walletId) {
          setSelectedWalletId(modalData.walletId);
        }
      } else if (clients.length > 0) {
        setSelectedClientId(clients[0].id);
        if (clients[0].wallets?.length > 0) {
          setSelectedWalletId(clients[0].wallets[0].id);
        }
      }

      // Default date to now
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setCustomDate(localIso);
    }
  }, [activeModal, modalData, clients]);

  // When selected client changes, auto-select first wallet if current is not in client
  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      const wallets = client?.wallets || [];
      if (!wallets.some(w => w.id === selectedWalletId)) {
        if (wallets.length > 0) {
          setSelectedWalletId(wallets[0].id);
        } else {
          setSelectedWalletId('');
        }
      }
    }
  }, [selectedClientId, clients, selectedWalletId]);

  // Manage native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'transfer') {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [activeModal]);

  // Light dismiss on backdrop click adhering to modern-web-guidance
  const handleDialogClick = (e) => {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  };

  const handleClose = () => {
    setActiveModal(null);
    setAmount('');
    setRecipientPhone('');
    setNotes('');
    setFee('');
  };

  // Find currently selected wallet and client
  const currentClient = clients.find(c => c.id === selectedClientId);
  const currentWallet = currentClient?.wallets?.find(w => w.id === selectedWalletId);
  const walletStats = currentWallet ? calculateWalletStats(currentWallet, transactions) : null;

  // Real-time limit math
  const numAmount = Number(amount) || 0;
  const currentRemaining = walletStats ? walletStats.remainingLimit : 0;
  const remainingAfter = currentRemaining - numAmount;
  const isOverLimit = numAmount > currentRemaining;
  const isLocked = walletStats ? walletStats.isLocked : false;
  const isDailyTransferExhausted = walletStats ? walletStats.isDailyTransferExhausted : false;
  const isOverDailyLimit = walletStats ? numAmount > walletStats.remainingDailyTransfer : false;
  const isBlocked = isLocked || isDailyTransferExhausted || isOverDailyLimit || isOverLimit;

  // Recipient phone validation
  const recipientCarrier = getEgyptianCarrier(recipientPhone);
  const recipientPhoneError = recipientPhone.length >= 3 ? getEgyptianPhoneError(recipientPhone) : null;
  const isRecipientValid = isValidEgyptianPhone(recipientPhone);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWalletId) {
      showToast('يرجى اختيار رقم المحفظة المحول منها', 'error');
      return;
    }

    if (numAmount <= 0) {
      showToast('يرجى إدخال مبلغ تحويل صحيح أكبر من 0', 'error');
      return;
    }

    if (recipientPhone.trim()) {
      const cleanRecipient = cleanEgyptianPhone(recipientPhone);
      if (!isValidEgyptianPhone(cleanRecipient)) {
        showToast(
          getEgyptianPhoneError(cleanRecipient) || 'رقم المحول إليه غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً',
          'error'
        );
        return;
      }
    }

    if (isLocked) {
      showToast('هذا الرقم مقفول لتجاوز الحد الشهري (200,000 ج.م). لا يمكن إجراء تحويلات جديدة.', 'error');
      return;
    }

    if (isDailyTransferExhausted) {
      showToast('تم بلوغ الحد الأقصى للتحويل اليومي من هذا الرقم (60,000 ج.م في اليوم).', 'error');
      return;
    }

    if (isOverDailyLimit) {
      showToast(`عفواً، المبلغ يتجاوز المتبقي من الحد اليومي المسموح به لهذا الرقم (${formatCurrency(walletStats?.remainingDailyTransfer || 0)} من أصل 60,000 ج.م)`, 'error');
      return;
    }

    if (isOverLimit) {
      showToast(`عفواً، لا يمكن التحويل لأن المبلغ يتجاوز الليميت الشهري المتبقي (${formatCurrency(currentRemaining)})`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      addTransaction({
        walletId: selectedWalletId,
        amount: numAmount,
        recipientPhone,
        transactionCode,
        fee: Number(fee) || 0,
        notes,
        date: customDate ? new Date(customDate).toISOString() : new Date().toISOString()
      });
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeModal !== 'transfer') return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      aria-labelledby="transfer-modal-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/60 overflow-hidden"
    >
      {/* Modal Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
            <Send className="w-5 h-5 rotate-180" />
          </div>
          <div>
            <h2 id="transfer-modal-title" className="text-lg sm:text-xl font-black">
              تسجيل تحويل فودافون كاش جديد
            </h2>
            <p className="text-xs text-red-100 mt-0.5">
              يتم خصم المبلغ مباشرة وتحديث المتبقي من الليميت فوراً
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
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        
        {/* Step 1: Select Client & Wallet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          
          {/* Customer select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-red-600" />
              <span>العميل</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50"
              required
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.wallets?.length || 0} أرقام)
                </option>
              ))}
            </select>
          </div>

          {/* Wallet Number select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-red-600" />
              <span>الرقم المحول منه (المحفظة)</span>
            </label>
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50"
              required
            >
              {currentClient?.wallets?.map(w => {
                const s = calculateWalletStats(w, transactions);
                return (
                  <option key={w.id} value={w.id}>
                    {w.phoneNumber} - {w.label} {s.isExhausted ? `[⛔ منتهي 0 ج.م - يتجدد ${s.nextResetDateShort}]` : `(متبقي: ${formatCurrency(s.remainingLimit)})`}
                  </option>
                );
              })}
            </select>
          </div>

        </div>

        {/* Live Calculation Banner - Deduct directly from limit & display remaining */}
        {walletStats && (
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
              <span>الحساب المباشر لليميت المحفظة:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                الليميت الكلي: {formatCurrency(walletStats.totalLimit)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">الليميت الشهري المتبقي</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {formatCurrency(currentRemaining)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">متاح تحويله اليوم (من 60 ألف)</span>
                <span className={`text-xs sm:text-sm font-bold font-mono ${walletStats.isDailyTransferExhausted ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(walletStats.remainingDailyTransfer)}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-rose-500 block">المبلغ المخصوم (-)</span>
                <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                  {numAmount > 0 ? formatCurrency(numAmount) : '0 ج.م'}
                </span>
              </div>

              <div className={`p-2 rounded-xl border transition-colors ${
                isOverLimit || isOverDailyLimit
                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
              }`}>
                <span className={`text-[10px] block font-bold ${
                  isOverLimit || isOverDailyLimit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  المتبقي بعد الخصم
                </span>
                <span className={`text-xs sm:text-sm font-black font-mono ${
                  isOverLimit || isOverDailyLimit ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                }`}>
                  {formatCurrency(remainingAfter)}
                </span>
              </div>

            </div>

            {isLocked ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 text-xs font-bold border border-rose-300 dark:border-rose-800">
                <Lock className="w-4 h-4 shrink-0 text-rose-600" />
                <span>تم قفل هذا الرقم لتجاوز الحد الشهري (200,000 ج.م). لا يمكن إجراء تحويلات منه حتى 1/{walletStats.nextResetDateShort.split('/')[1]}!</span>
              </div>
            ) : isDailyTransferExhausted ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-800">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>تم الوصول للحد الأقصى للتحويل اليومي من هذا الرقم (60,000 ج.م في اليوم). لا يمكن تحويل المزيد اليوم.</span>
              </div>
            ) : isOverDailyLimit ? (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>تنبيه: المبلغ المدخل يتجاوز المتبقي من الحد اليومي المسموح به لهذا الرقم ({formatCurrency(walletStats.remainingDailyTransfer)} متبقية من أصل 60,000 ج.م اليوم).</span>
              </div>
            ) : isOverLimit ? (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>تنبيه: المبلغ المدخل يتجاوز الليميت الشهري المتبقي في هذه المحفظة بمقدار {formatCurrency(Math.abs(remainingAfter))}.</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Step 2: Amount and Recipient Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          
          {/* Transfer Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              مبلغ التحويل (ج.م) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="any"
                autoFocus
                placeholder="مثال: 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full pl-3 pr-4 py-2.5 text-lg font-black bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none transition-all ${
                  isOverLimit
                    ? 'text-rose-600 border-2 border-rose-500 focus:ring-2 focus:ring-rose-500/50'
                    : 'text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500/50'
                }`}
                required
              />
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                isOverLimit ? 'text-rose-500' : 'text-slate-400'
              }`}>
                ج.م
              </span>
            </div>
            {isOverLimit && (
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>المبلغ يتجاوز الليميت المتاح ({formatCurrency(currentRemaining)}). قم بتقليل المبلغ لتفعيل الزر.</span>
              </p>
            )}
          </div>

          {/* Recipient Phone */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                رقم المحول إليه (المستلم - 11 رقم مصري)
              </label>
              {recipientCarrier ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                  {recipientCarrier.name} ({recipientCarrier.code})
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
                maxLength={11}
                placeholder="010XXXXXXXX"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(cleanEgyptianPhone(e.target.value))}
                className={`w-full px-3.5 py-2.5 text-base font-bold font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                  isRecipientValid
                    ? 'border-emerald-500 focus:ring-emerald-500/40'
                    : recipientPhoneError
                    ? 'border-rose-400 focus:ring-rose-500/40'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-red-500/40'
                }`}
                dir="ltr"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                {recipientPhone.length}/11
              </span>
            </div>
            {recipientPhoneError && (
              <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                <span>{recipientPhoneError}</span>
              </p>
            )}
            {isRecipientValid && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                <span>✓ رقم مصري صحيح ({recipientCarrier?.name})</span>
              </p>
            )}
          </div>

        </div>

        {/* Step 3: Transaction Ref Code and Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>كود العملية / المرجع</span>
            </label>
            <input
              type="text"
              value={transactionCode}
              onChange={(e) => setTransactionCode(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              رسوم / عمولة (اختياري)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              تاريخ وتوقيت التحويل
            </label>
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full px-2 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>ملاحظات أو بيان التحويل</span>
          </label>
          <input
            type="text"
            placeholder="مثال: دفعة مشتريات بضاعة، توريد عميل..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !numAmount || isBlocked}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              isBlocked
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700 shadow-none'
                : 'btn-interactive bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            title={isBlocked ? 'الزر معطل لتجاوز الحد المسموح' : 'تأكيد وخصم التحويلة'}
          >
            {isLocked ? (
              <>
                <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                <span>الرقم مقفول شهرياً (معطل)</span>
              </>
            ) : isDailyTransferExhausted ? (
              <>
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>اكتمل حد اليوم 60 ألف (معطل)</span>
              </>
            ) : isOverDailyLimit ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>يتجاوز حد اليوم (معطل)</span>
              </>
            ) : isOverLimit ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>المبلغ يتجاوز الليميت (معطل)</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 rotate-180" />
                <span>تأكيد وخصم التحويلة</span>
              </>
            )}
          </button>
        </div>

      </form>
    </dialog>
  );
}
