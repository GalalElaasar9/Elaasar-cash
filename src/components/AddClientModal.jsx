import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { 
  cleanEgyptianPhone, 
  isValidEgyptianPhone, 
  getEgyptianPhoneError, 
  getEgyptianCarrier 
} from '../utils/formatters';
import { UserPlus, X, Plus, Trash2, Smartphone, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';

export default function AddClientModal() {
  const { activeModal, setActiveModal, addClient, showToast } = useCash();
  const dialogRef = useRef(null);

  const [name, setName] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [clientType, setClientType] = useState('عادي');
  const [wallets, setWallets] = useState([
    { phoneNumber: '', label: 'محفظة 1', totalLimit: 200000 }
  ]);

  const whatsappCarrier = getEgyptianCarrier(whatsappPhone);
  const whatsappPhoneError = whatsappPhone.length >= 3 ? getEgyptianPhoneError(whatsappPhone) : null;
  const isWhatsappValid = isValidEgyptianPhone(whatsappPhone);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'addClient') {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal]);

  const handleClose = () => {
    setActiveModal(null);
    setName('');
    setWhatsappPhone('');
    setNotes('');
    setClientType('عادي');
    setWallets([{ phoneNumber: '', label: 'محفظة 1', totalLimit: 200000 }]);
  };

  const handleAddWalletRow = () => {
    setWallets(prev => [
      ...prev,
      { phoneNumber: '', label: `محفظة ${prev.length + 1}`, totalLimit: 200000 }
    ]);
  };

  const handleRemoveWalletRow = (index) => {
    setWallets(prev => prev.filter((_, i) => i !== index));
  };

  const handleWalletChange = (index, field, value) => {
    const finalVal = field === 'phoneNumber' ? cleanEgyptianPhone(value) : value;
    setWallets(prev =>
      prev.map((w, i) => (i === index ? { ...w, [field]: finalVal } : w))
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Filter out rows where phone is empty
    const filledWallets = wallets.filter(w => w.phoneNumber.trim().length > 0);

    // Validate that all entered wallets are strictly valid 11-digit Egyptian numbers
    for (let i = 0; i < filledWallets.length; i++) {
      const clean = cleanEgyptianPhone(filledWallets[i].phoneNumber);
      if (!isValidEgyptianPhone(clean)) {
        showToast(
          `رقم المحفظة #${i + 1} (${filledWallets[i].phoneNumber}) غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً`,
          'error'
        );
        return;
      }
      filledWallets[i].phoneNumber = clean;
    }

    // Validate WhatsApp number if entered
    const cleanWhatsapp = whatsappPhone.trim() ? cleanEgyptianPhone(whatsappPhone) : '';
    if (cleanWhatsapp && !isValidEgyptianPhone(cleanWhatsapp)) {
      showToast(
        getEgyptianPhoneError(cleanWhatsapp) || 'رقم الواتساب غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً',
        'error'
      );
      return;
    }

    addClient({
      name,
      notes,
      clientType,
      whatsappPhone: cleanWhatsapp,
      wallets: filledWallets
    });

    handleClose();
  };

  if (activeModal !== 'addClient') return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="add-client-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/60 overflow-hidden"
    >
      <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/10">
            <UserPlus className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 id="add-client-title" className="text-lg font-bold">
              إضافة عميل جديد
            </h2>
            <p className="text-xs text-slate-400">
              يمكنك إضافة أكثر من رقم محمول وتعيين الليميت لكل رقم
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            اسم العميل / الشركة *
          </label>
          <input
            type="text"
            required
            autoFocus
            placeholder="مثال: الحاج محمود الأعصر"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
        </div>

        {/* WhatsApp Phone */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>رقم الواتساب (للمطالبات والتقارير المباشرة)</span>
              <span className="text-[10px] text-slate-400 font-normal">(اختياري)</span>
            </label>
            {whatsappCarrier ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {whatsappCarrier.name}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono" dir="ltr">010 / 011 / 012 / 015</span>
            )}
          </div>
          <div className="relative">
            <input
              type="tel"
              maxLength={11}
              placeholder="010XXXXXXXX (اختياري - لو ترك فارغاً يعتمد أول رقم محفظة)"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(cleanEgyptianPhone(e.target.value))}
              className={`w-full px-3.5 py-2.5 text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${
                isWhatsappValid
                  ? 'border-emerald-500 focus:ring-emerald-500/40 bg-emerald-50/10'
                  : whatsappPhoneError
                  ? 'border-rose-400 focus:ring-rose-500/40'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500/40'
              }`}
              dir="ltr"
            />
          </div>
          {whatsappPhoneError && (
            <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
              <span>{whatsappPhoneError}</span>
            </p>
          )}
          {isWhatsappValid && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <span>✓ رقم واتساب مصري صحيح ({whatsappCarrier?.name})</span>
            </p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            يُستخدم هذا الرقم لإرسال كشف الحساب والمطالبات المالية مباشرة إلى شات العميل على الواتساب بضغطة زر واحدة.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ملاحظات أو تفاصيل عن العميل
          </label>
          <input
            type="text"
            placeholder="مثال: تاجر أجهزة، مورد أغذية..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
        </div>

        {/* Client classification: عادي أو مدين */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            تصنيف نوع العميل الأولي
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setClientType('عادي')}
              className={`btn-interactive py-2.5 px-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1 transition-all ${
                clientType === 'عادي'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <span>عادي (حساب خالص)</span>
            </button>
            <button
              type="button"
              onClick={() => setClientType('مدين')}
              className={`btn-interactive py-2.5 px-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1 transition-all ${
                clientType === 'مدين'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <span>مدين (عليه آجل)</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            ملاحظة: يتحول العميل تلقائياً إلى «دائن» في حالة واحدة فقط: عندما يقوم بسداد مبلغ أكبر من الدين المستحق عليه.
          </p>
        </div>

        {/* Wallets / Phone numbers list */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-red-600" />
              <span>أرقام المحافظ الخاصة بالعميل والليميت</span>
            </label>
            <button
              type="button"
              onClick={handleAddWalletRow}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة رقم إضافي</span>
            </button>
          </div>

          <div className="space-y-3">
            {wallets.map((wallet, idx) => {
              const carrier = getEgyptianCarrier(wallet.phoneNumber);
              const isValid = isValidEgyptianPhone(wallet.phoneNumber);
              const hasInput = wallet.phoneNumber.length > 0;
              const hasError = hasInput && !isValid && wallet.phoneNumber.length >= 3;

              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/70 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">الرقم #{idx + 1}</span>
                      {carrier && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                          {carrier.name} ({carrier.code})
                        </span>
                      )}
                    </div>
                    {wallets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWalletRow(idx)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <input
                        type="tel"
                        maxLength={11}
                        placeholder="010XXXXXXXX"
                        value={wallet.phoneNumber}
                        onChange={(e) => handleWalletChange(idx, 'phoneNumber', e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs font-bold font-mono bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white transition-colors ${
                          isValid
                            ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                            : hasError
                            ? 'border-rose-400 ring-1 ring-rose-400/30'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                        dir="ltr"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <input
                        type="text"
                        placeholder="تسمية المحفظة (اختياري)"
                        value={wallet.label}
                        onChange={(e) => handleWalletChange(idx, 'label', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <input
                        type="number"
                        step="any"
                        placeholder="الليميت (افتراضي 200000)"
                        value={wallet.totalLimit}
                        onChange={(e) => handleWalletChange(idx, 'totalLimit', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        title="الليميت الأقصى (افتراضي 200,000 ج.م)"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            * الليميت الافتراضي لأي رقم هو 200,000 ج.م شهرياً مع إمكانية تحويل حتى 60,000 ج.م يومياً.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="btn-interactive px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md"
          >
            حفظ العميل
          </button>
        </div>
      </form>
    </dialog>
  );
}
