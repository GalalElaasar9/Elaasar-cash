import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  calculateWalletStats, 
  formatPhone 
} from '../utils/formatters';
import { 
  CreditCard, 
  X, 
  DollarSign, 
  Wallet, 
  CheckCircle2, 
  Building2, 
  Clock, 
  FileText,
  Smartphone,
  Landmark
} from 'lucide-react';

export default function SupplierPaymentModal() {
  const { 
    activeModal, 
    setActiveModal, 
    modalData, 
    shopWallets = [], 
    instapayAccounts = [],
    treasury = {},
    transactions, 
    recordSupplierPayment, 
    showToast 
  } = useCash();

  const dialogRef = useRef(null);
  const purchase = modalData?.purchase;

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'instapay' | 'bank' | 'wallet'
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedInstapayAccountId, setSelectedInstapayAccountId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'supplierPayment') {
      if (!dialog.open) dialog.showModal();

      if (purchase) {
        setAmount(purchase.remainingAmount || '');
        setPaymentMethod('cash');
        setSelectedWalletId(shopWallets?.[0]?.id || '');
        setSelectedInstapayAccountId(instapayAccounts?.find(a => a.isDefault)?.id || instapayAccounts?.[0]?.id || '');
        setNotes('');
      }
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, modalData, purchase, shopWallets, instapayAccounts]);

  const handleClose = () => {
    setActiveModal(null);
  };

  if (activeModal !== 'supplierPayment' || !purchase) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const payAmt = Number(amount) || 0;
    if (payAmt <= 0) {
      showToast('يرجى إدخال مبلغ سداد صحيح أكبر من صفر', 'error');
      return;
    }

    if (payAmt > purchase.remainingAmount) {
      showToast(`مبلغ السداد (${formatCurrency(payAmt)}) أكبر من إجمالي الدين المتبقي (${formatCurrency(purchase.remainingAmount)})`, 'error');
      return;
    }

    if (paymentMethod === 'wallet') {
      if (!selectedWalletId) {
        showToast('يرجى اختيار خط ومحفظة المحل للتحويل منها', 'error');
        return;
      }
      const walletObj = shopWallets.find(w => w.id === selectedWalletId);
      if (walletObj) {
        const wBal = Number(walletObj.balance) || 0;
        if (payAmt > wBal) {
          showToast(`رصيد السيولة في خط ${walletObj.label} (${formatCurrency(wBal)}) لا يكفي لسداد ${formatCurrency(payAmt)}!`, 'error');
          return;
        }
        const stats = calculateWalletStats(walletObj, transactions);
        if (payAmt > stats.remainingLimit) {
          showToast(`ليميت محفظة ${walletObj.label} المتبقي (${formatCurrency(stats.remainingLimit)}) لا يكفي لسداد ${formatCurrency(payAmt)}!`, 'error');
          return;
        }
      }
    }

    if (paymentMethod === 'instapay' && instapayAccounts.length > 0) {
      if (!selectedInstapayAccountId) {
        showToast('يرجى اختيار حساب إنستاباي للتحويل منه', 'error');
        return;
      }
      const accObj = instapayAccounts.find(a => a.id === selectedInstapayAccountId);
      if (accObj && payAmt > (Number(accObj.balance) || 0)) {
        showToast(`الرصيد المتاح في حساب (${accObj.accountName}) هو (${formatCurrency(accObj.balance || 0)}) وهو أقل من المبلغ المطلوب سداده!`, 'error');
        return;
      }
    }

    const channelMap = {
      cash: 'drawerCash',
      wallet: 'vodafoneCash',
      instapay: 'instapay',
      bank: 'bankAccounts'
    };

    const success = recordSupplierPayment(purchase.id, {
      amount: payAmt,
      paymentMethod,
      paidChannel: channelMap[paymentMethod] || 'drawerCash',
      walletId: paymentMethod === 'wallet' ? selectedWalletId : null,
      instapayAccountId: paymentMethod === 'instapay' ? selectedInstapayAccountId : null,
      notes: notes.trim()
    });

    if (success) {
      handleClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="supplier-payment-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/70 overflow-hidden animate-scale-in"
    >
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 id="supplier-payment-title" className="text-base sm:text-lg font-black leading-tight">
                سداد دفعة للمورد / الديون الآجلة
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                تسوية وسداد دفعة وخصمها من الخزينة ورأس المال
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">

          {/* Invoice & Supplier Overview Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                  {purchase.supplierName}
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {purchase.invoiceNumber}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">إجمالي الفاتورة:</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(purchase.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">المسدد سابقاً:</span>
                <span className="text-xs font-bold text-emerald-600">
                  {formatCurrency(purchase.paidAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">المتبقي المطلوب:</span>
                <span className="text-xs font-black text-red-600 dark:text-red-400">
                  {formatCurrency(purchase.remainingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                مبلغ الدفعة المسددة (ج.م) *
              </label>
              <button
                type="button"
                onClick={() => setAmount(purchase.remainingAmount)}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black hover:underline"
              >
                سداد كامل المتبقي ({formatCurrency(purchase.remainingAmount)})
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                min="1"
                max={purchase.remainingAmount}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="أدخل المبلغ..."
                className="w-full pl-3 pr-9 py-2.5 text-sm sm:text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-black text-emerald-600 dark:text-emerald-400"
                required
              />
              <DollarSign className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Payment Method Selector Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              وسيلة السداد والخزينة المخصوم منها:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-black ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <DollarSign className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <span className="text-xs block font-bold">كاش الدرج</span>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{formatCurrency(treasury?.drawerCash || 0)}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('instapay')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  paymentMethod === 'instapay'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-black ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Smartphone className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                <span className="text-xs block font-bold">إنستاباي</span>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{formatCurrency(treasury?.instapay || 0)}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  paymentMethod === 'bank'
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-black ring-2 ring-cyan-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Landmark className="w-4 h-4 mx-auto mb-1 text-cyan-600" />
                <span className="text-xs block font-bold">حساب بنكي</span>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{formatCurrency(treasury?.bankAccounts || 0)}</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('wallet')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  paymentMethod === 'wallet'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-black ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Wallet className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                <span className="text-xs block font-bold">فودافون كاش</span>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{formatCurrency(treasury?.vodafoneCash || 0)}</span>
              </button>
            </div>
          </div>

          {/* Wallet selection if wallet method selected */}
          {paymentMethod === 'wallet' && (
            <div className="p-3 bg-rose-50/50 dark:bg-rose-950/30 rounded-xl border border-rose-200/80 dark:border-rose-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-rose-900 dark:text-rose-200">
                  اختر خط فودافون كاش المحول منه (يخصم من الخط ومن إجمالي فودافون كاش):
                </label>
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  {shopWallets.length} خط
                </span>
              </div>
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl focus:outline-none font-bold"
                required
              >
                {shopWallets.map(w => {
                  const stats = calculateWalletStats(w, transactions);
                  return (
                    <option key={w.id} value={w.id}>
                      {w.label} ({formatPhone(w.phoneNumber)}) - رصيد الخط: {formatCurrency(w.balance || 0)} | متبقي ليميت: {formatCurrency(stats.remainingLimit)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* InstaPay Account selection if instapay method selected */}
          {paymentMethod === 'instapay' && (
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 rounded-xl border border-purple-200/80 dark:border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-purple-900 dark:text-purple-200">
                  اختر حساب إنستاباي المحول منه (يخصم من الحساب ومن إجمالي إنستاباي):
                </label>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  {instapayAccounts.length} حساب
                </span>
              </div>
              {instapayAccounts.length === 0 ? (
                <div className="text-xs text-amber-600 font-bold py-2">
                  لا توجد حسابات إنستاباي مسجلة حالياً — سيتم الخصم من إجمالي رصيد إنستاباي العام فقط.
                </div>
              ) : (
                <select
                  value={selectedInstapayAccountId}
                  onChange={(e) => setSelectedInstapayAccountId(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl focus:outline-none font-bold"
                  required
                >
                  {instapayAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.bankName}) - المتاح: {formatCurrency(acc.balance || 0)} {acc.isDefault ? '★ افتراضي' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات السداد (اختياري)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تحويل إنستاباي مرجعي 98451، إيصال نقدية..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="btn-interactive flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/25 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد خصم وسداد الدفعة</span>
            </button>
          </div>

        </form>
      </div>
    </dialog>
  );
}
