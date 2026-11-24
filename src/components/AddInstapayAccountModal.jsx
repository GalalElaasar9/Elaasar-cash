import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { CreditCard, X, AlertCircle, Building2, Smartphone, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { cleanEgyptianPhone, isValidEgyptianPhone, formatCurrency } from '../utils/formatters';

const EGYPTIAN_BANKS = [
  'البنك الأهلي المصري (NBE)',
  'بنك مصر (Banque Misr)',
  'البنك التجاري الدولي (CIB)',
  'بنك القاهرة (BDC)',
  'بنك الإسكندرية (AlexBank)',
  'بنك قطر الوطني (QNB)',
  'بنك فيصل الإسلامي المصري',
  'مصرف أبو ظبي الإسلامي (ADIB)',
  'البنك العربي الأفريقي الدولي (AAIB)',
  'بنك التعمير والإسكان (HDB)',
  'بنك saib',
  'البنك الأهلي الكويتي (ABK)',
  'بنك البركة مصر',
  'محفظة ذكية / بطاقة ميزة الوطنية',
  'بنك آخر'
];

export default function AddInstapayAccountModal() {
  const { 
    activeModal, 
    setActiveModal, 
    modalData, 
    addInstapayAccount, 
    updateInstapayAccount,
    showToast 
  } = useCash();

  const dialogRef = useRef(null);
  const isEdit = activeModal === 'editInstapayAccount';
  const editingAccount = modalData?.account;

  const [accountName, setAccountName] = useState('');
  const [handle, setHandle] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState(EGYPTIAN_BANKS[0]);
  const [customBankName, setCustomBankName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'addInstapayAccount' || activeModal === 'editInstapayAccount') {
      if (!dialog.open) dialog.showModal();

      if (isEdit && editingAccount) {
        setAccountName(editingAccount.accountName || '');
        setHandle(editingAccount.handle || '');
        setPhone(editingAccount.phone || '');
        if (EGYPTIAN_BANKS.includes(editingAccount.bankName)) {
          setBankName(editingAccount.bankName);
          setCustomBankName('');
        } else {
          setBankName('بنك آخر');
          setCustomBankName(editingAccount.bankName || '');
        }
        setInitialBalance(String(editingAccount.balance || 0));
        setIsDefault(Boolean(editingAccount.isDefault));
        setNotes(editingAccount.notes || '');
      } else {
        setAccountName('');
        setHandle('');
        setPhone('');
        setBankName(EGYPTIAN_BANKS[0]);
        setCustomBankName('');
        setInitialBalance('0');
        setIsDefault(false);
        setNotes('');
      }
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, isEdit, editingAccount]);

  const handleClose = () => {
    setActiveModal(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const cleanH = handle.trim();
    if (!cleanH) {
      showToast('يرجى كتابة عنوان الدفع أو رقم الهاتف لحساب إنستاباي', 'error');
      return;
    }

    const effectiveBank = bankName === 'بنك آخر' && customBankName.trim() 
      ? customBankName.trim() 
      : bankName;

    const effectiveTitle = accountName.trim() || `إنستاباي - ${effectiveBank}`;

    if (isEdit && editingAccount) {
      updateInstapayAccount(editingAccount.id, {
        accountName: effectiveTitle,
        handle: cleanH,
        phone: phone.trim() || (cleanEgyptianPhone(cleanH) || ''),
        bankName: effectiveBank,
        balance: Math.max(0, Number(initialBalance) || 0),
        isDefault,
        notes: notes.trim()
      });
      handleClose();
      return;
    }

    // Add New
    const res = addInstapayAccount({
      accountName: effectiveTitle,
      handle: cleanH,
      phone: phone.trim() || (cleanEgyptianPhone(cleanH) || ''),
      bankName: effectiveBank,
      initialBalance: Math.max(0, Number(initialBalance) || 0),
      isDefault,
      notes: notes.trim()
    });

    if (res) {
      handleClose();
    }
  };

  if (activeModal !== 'addInstapayAccount' && activeModal !== 'editInstapayAccount') {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="add-instapay-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/60 overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 id="add-instapay-title" className="text-base sm:text-lg font-black">
              {isEdit ? 'تعديل بيانات حساب إنستاباي' : 'إضافة حساب إنستاباي جديد للمحل'}
            </h2>
            <p className="text-xs text-purple-100">
              ربط مباشر مع خزينة رأس المال وعمليات التحويل وسداد العملاء
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="p-1 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        
        {/* Account Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            اسم الحساب / التسمية التوضيحية <span className="text-rose-500 font-black">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="مثال: إنستاباي - البنك الأهلي المصري (الرئيسي)"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            اسم الحساب الذي سيظهر لك في القوائم عند التحويل أو سداد العملاء
          </p>
        </div>

        {/* Handle / IPA Address & Phone in 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              عنوان الدفع اللحظي (IPA) أو رقم الهاتف <span className="text-rose-500 font-black">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                dir="ltr"
                placeholder="name@instapay أو 010XXXXXXXX"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              رقم الهاتف المرتبط (اختياري)
            </label>
            <input
              type="tel"
              dir="ltr"
              maxLength={11}
              placeholder="010XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(cleanEgyptianPhone(e.target.value))}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* Bank Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            البنك التابع له الحساب
          </label>
          <div className="relative">
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {EGYPTIAN_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {bankName === 'بنك آخر' && (
            <input
              type="text"
              placeholder="اكتب اسم البنك يدوياً..."
              value={customBankName}
              onChange={(e) => setCustomBankName(e.target.value)}
              className="w-full mt-2 px-3.5 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              required
            />
          )}
        </div>

        {/* Initial / Current Balance */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            {isEdit ? 'الرصيد الحالي للحساب (ج.م)' : 'الرصيد الافتتاحي للحساب (ج.م)'}
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="any"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0"
              className="w-full pl-12 pr-4 py-2.5 text-base font-black font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              ج.م
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {!isEdit && 'سيتم ضخ وإضافة هذا الرصيد تلقائياً إلى خزينة إنستاباي في رأس المال'}
          </p>
        </div>

        {/* Set as Default Checkbox */}
        <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200/80 dark:border-purple-900/40">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500/30 border-slate-300 dark:border-slate-600 accent-purple-600"
            />
            <div>
              <span className="text-xs font-black text-purple-950 dark:text-purple-200 block">
                تعيين كحساب إنستاباي افتراضي للمحل
              </span>
              <span className="text-[10px] text-purple-700/80 dark:text-purple-300/80 block">
                سيتم اختياره تلقائياً عند فتح شاشات التحويل أو سداد العملاء
              </span>
            </div>
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ملاحظات أو بيان إضافي (اختياري)
          </label>
          <input
            type="text"
            placeholder="مثال: مخصص لفرع المحطة، كارت ميزة، شحن فوري..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 text-xs sm:text-sm font-black rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/25 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isEdit ? 'حفظ التعديلات' : 'إضافة الحساب الآن'}</span>
          </button>
        </div>

      </form>
    </dialog>
  );
}
