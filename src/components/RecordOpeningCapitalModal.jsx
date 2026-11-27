import React, { useState, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import { getTodayString } from '../utils/formatters';
import {
  X,
  Sun,
  Coins,
  Wallet,
  Smartphone,
  Building2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function RecordOpeningCapitalModal() {
  const {
    activeModal,
    setActiveModal,
    treasury,
    shopWallets,
    instapayAccounts,
    dailyOpeningBalances,
    recordDailyOpeningBalance,
    getOpeningBalanceForDate,
    selectedDate
  } = useCash();

  if (activeModal !== 'recordOpeningCapital') return null;

  const todayStr = getTodayString();
  const [targetDate, setTargetDate] = useState(selectedDate || todayStr);
  const [recordedBy, setRecordedBy] = useState('محمود الأعصر (صاحب المحل)');
  const [notes, setNotes] = useState('');
  const [applyToLive, setApplyToLive] = useState(true);

  // Balances
  const [drawerCash, setDrawerCash] = useState(0);
  const [bankAccounts, setBankAccounts] = useState(0);

  // Line-by-line Vodafone Cash shop lines
  const [walletsState, setWalletsState] = useState([]);

  // Account-by-account InstaPay accounts
  const [instapayState, setInstapayState] = useState([]);

  // Load balances when modal opens or date changes
  useEffect(() => {
    const existing = getOpeningBalanceForDate ? getOpeningBalanceForDate(targetDate) : null;
    
    if (existing) {
      setDrawerCash(existing.drawerCash || 0);
      setBankAccounts(existing.bankAccounts || 0);
      setNotes(existing.notes || '');
      if (existing.recordedBy) setRecordedBy(existing.recordedBy);

      // Pre-fill wallets from saved record if present
      if (Array.isArray(existing.shopWallets) && existing.shopWallets.length > 0) {
        setWalletsState(
          (shopWallets || []).map(sw => {
            const match = existing.shopWallets.find(ew => ew.id === sw.id);
            return {
              id: sw.id,
              name: sw.name,
              phoneNumber: sw.phoneNumber,
              currentBalance: sw.balance || 0,
              openingBalance: match ? Number(match.balance || match.openingBalance || 0) : Number(sw.balance || 0)
            };
          })
        );
      } else {
        setWalletsState(
          (shopWallets || []).map(sw => ({
            id: sw.id,
            name: sw.name,
            phoneNumber: sw.phoneNumber,
            currentBalance: sw.balance || 0,
            openingBalance: Number(sw.balance || 0)
          }))
        );
      }

      // Pre-fill instapay
      if (Array.isArray(existing.instapayAccounts) && existing.instapayAccounts.length > 0) {
        setInstapayState(
          (instapayAccounts || []).map(acc => {
            const match = existing.instapayAccounts.find(ea => ea.id === acc.id);
            return {
              id: acc.id,
              name: acc.name,
              phoneOrHandle: acc.phoneOrHandle,
              bankName: acc.bankName,
              currentBalance: acc.balance || 0,
              openingBalance: match ? Number(match.balance || match.openingBalance || 0) : Number(acc.balance || 0)
            };
          })
        );
      } else {
        setInstapayState(
          (instapayAccounts || []).map(acc => ({
            id: acc.id,
            name: acc.name,
            phoneOrHandle: acc.phoneOrHandle,
            bankName: acc.bankName,
            currentBalance: acc.balance || 0,
            openingBalance: Number(acc.balance || 0)
          }))
        );
      }
    } else {
      // Default to live balances
      setDrawerCash(treasury?.drawerCash || 0);
      setBankAccounts(treasury?.bankAccounts || 0);
      setNotes('');

      setWalletsState(
        (shopWallets || []).map(sw => ({
          id: sw.id,
          name: sw.name,
          phoneNumber: sw.phoneNumber,
          currentBalance: sw.balance || 0,
          openingBalance: Number(sw.balance || 0)
        }))
      );

      setInstapayState(
        (instapayAccounts || []).map(acc => ({
          id: acc.id,
          name: acc.name,
          phoneOrHandle: acc.phoneOrHandle,
          bankName: acc.bankName,
          currentBalance: acc.balance || 0,
          openingBalance: Number(acc.balance || 0)
        }))
      );
    }
  }, [targetDate, activeModal]);

  const totalVodafoneCash = walletsState.reduce((sum, w) => sum + (Number(w.openingBalance) || 0), 0);
  const totalInstapay = instapayState.reduce((sum, a) => sum + (Number(a.openingBalance) || 0), 0);
  const totalCapital = (Number(drawerCash) || 0) + totalVodafoneCash + totalInstapay + (Number(bankAccounts) || 0);

  const existingRecord = dailyOpeningBalances?.find(o => o.dateOnly === targetDate);

  const handleWalletBalanceChange = (id, val) => {
    const num = Math.max(0, Number(val) || 0);
    setWalletsState(prev => prev.map(w => w.id === id ? { ...w, openingBalance: num } : w));
  };

  const handleInstapayBalanceChange = (id, val) => {
    const num = Math.max(0, Number(val) || 0);
    setInstapayState(prev => prev.map(a => a.id === id ? { ...a, openingBalance: num } : a));
  };

  const handleAutoFillFromCurrent = () => {
    setDrawerCash(treasury?.drawerCash || 0);
    setBankAccounts(treasury?.bankAccounts || 0);
    setWalletsState(prev => prev.map(w => ({ ...w, openingBalance: w.currentBalance })));
    setInstapayState(prev => prev.map(a => ({ ...a, openingBalance: a.currentBalance })));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formattedWallets = walletsState.map(w => ({
      id: w.id,
      name: w.name,
      phoneNumber: w.phoneNumber,
      balance: Number(w.openingBalance) || 0
    }));

    const formattedInstapay = instapayState.map(a => ({
      id: a.id,
      name: a.name,
      phoneOrHandle: a.phoneOrHandle,
      bankName: a.bankName,
      balance: Number(a.openingBalance) || 0
    }));

    recordDailyOpeningBalance({
      date: targetDate,
      recordedBy,
      drawerCash: Number(drawerCash) || 0,
      vodafoneCash: totalVodafoneCash,
      instapay: totalInstapay,
      bankAccounts: Number(bankAccounts) || 0,
      shopWallets: formattedWallets,
      instapayAccounts: formattedInstapay,
      notes,
      applyToLive: targetDate === todayStr ? applyToLive : false
    });

    setActiveModal(null);
  };

  return (
    <div data-modal-overlay="true" className="fixed inset-0 z-50 overflow-hidden lg:flex lg:items-center lg:justify-center lg:p-4" dir="rtl" onClick={() => setActiveModal(null)}>
      <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs animate-right-sheet-backdrop" />
      <div 
        className="fixed inset-y-0 right-0 z-10 h-full w-full max-w-full sm:max-w-2xl bg-white dark:bg-slate-900 sm:rounded-l-3xl border-l border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-responsive-sheet lg:relative lg:inset-auto lg:h-auto lg:max-h-[90dvh] lg:rounded-3xl lg:border"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-500/10 via-red-500/10 to-rose-500/10 dark:from-amber-950/30 dark:via-red-950/20 dark:to-rose-950/30 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Sun className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  تسجيل وتثبيت رصيد بداية اليومية والافتتاح
                </h3>
                {existingRecord && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    تم التسجيل مسبقاً (تعديل)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تثبيت رأس المال وأرصدة المحل الفعلية (كاش الدرج، خطوط فودافون كاش، إنستاباي، البنوك) لبداية يوم جديد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 lg:flex-auto flex flex-col overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0">
          
          {/* Top Control Bar: Date & Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                تاريخ اليومية المستهدفة
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handleAutoFillFromCurrent}
                className="w-full btn-interactive flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-xs transition-all"
                title="تعبئة كل الحقول فوراً بالأرصدة الفعلية الحالية في السيستم"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>تعبئة تلقائية من الأرصدة الحالية في السيستم</span>
              </button>
            </div>
          </div>

          {/* Section 1: Cash in Drawer (كاش الدرج والخزينة) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>1. كاش الدرج والخزينة (السيولة النقدية الحاضرة بالمحل)</span>
              </label>
              <span className="text-xs text-slate-500">
                الرصيد الحالي: {Number(treasury?.drawerCash || 0).toLocaleString()} ج.م
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={drawerCash}
                onChange={e => setDrawerCash(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="w-full pl-16 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base sm:text-lg font-black focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                ج.م
              </span>
            </div>
          </div>

          {/* Section 2: Vodafone Cash Lines (خطوط فودافون كاش للمحل - خط بخط) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-red-600" />
                <span>2. أرصدة خطوط فودافون كاش للمحل (خط بخط)</span>
              </label>
              <span className="text-xs font-bold text-red-600 dark:text-red-400">
                إجمالي الخطوط: {totalVodafoneCash.toLocaleString()} ج.م
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto p-1">
              {walletsState.length === 0 ? (
                <div className="p-4 rounded-xl text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                  لا توجد خطوط محل مضافة بعد
                </div>
              ) : (
                walletsState.map(w => (
                  <div
                    key={w.id}
                    className="p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center font-black text-xs">
                        VF
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {w.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {w.phoneNumber} • الحالي: {Number(w.currentBalance).toLocaleString()} ج.م
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-36 sm:w-44">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={w.openingBalance}
                          onChange={e => handleWalletBalanceChange(w.id, e.target.value)}
                          className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-black focus:ring-2 focus:ring-red-500 focus:outline-hidden"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          ج.م
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleWalletBalanceChange(w.id, w.currentBalance)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-[11px] font-bold"
                        title="نسخ الرصيد الحالي"
                      >
                        الحالي
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 3: InstaPay Accounts (حسابات إنستاباي للمحل - حساب بحساب) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-600" />
                <span>3. أرصدة حسابات إنستاباي للمحل (حساب بحساب)</span>
              </label>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                إجمالي إنستاباي: {totalInstapay.toLocaleString()} ج.م
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto p-1">
              {instapayState.length === 0 ? (
                <div className="p-4 rounded-xl text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                  لا توجد حسابات إنستاباي مسجلة بعد
                </div>
              ) : (
                instapayState.map(acc => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-black text-xs">
                        IP
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {acc.bankName} • {acc.phoneOrHandle} • الحالي: {Number(acc.currentBalance).toLocaleString()} ج.م
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-36 sm:w-44">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={acc.openingBalance}
                          onChange={e => handleInstapayBalanceChange(acc.id, e.target.value)}
                          className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm font-black focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                          ج.م
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInstapayBalanceChange(acc.id, acc.currentBalance)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-[11px] font-bold"
                        title="نسخ الرصيد الحالي"
                      >
                        الحالي
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 4: Bank Accounts (الحسابات البنكية) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>4. رصيد الحسابات البنكية للمحل</span>
              </label>
              <span className="text-xs text-slate-500">
                الرصيد الحالي: {Number(treasury?.bankAccounts || 0).toLocaleString()} ج.م
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={bankAccounts}
                onChange={e => setBankAccounts(Math.max(0, Number(e.target.value) || 0))}
                placeholder="0"
                className="w-full pl-16 pr-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base sm:text-lg font-black focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                ج.م
              </span>
            </div>
          </div>

          {/* Master Summary Card */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-red-500/10 to-purple-500/10 dark:from-amber-950/40 dark:via-red-950/30 dark:to-purple-950/40 border-2 border-amber-500/30 dark:border-amber-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  إجمالي رأس مال بداية اليومية والافتتاح لتاريخ ({targetDate})
                </span>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {totalCapital.toLocaleString()} <span className="text-base font-bold text-amber-600">ج.م</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <span className="px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-800/80">
                  درج: {Number(drawerCash).toLocaleString()}
                </span>
                <span className="px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-800/80">
                  فودافون: {totalVodafoneCash.toLocaleString()}
                </span>
                <span className="px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-800/80">
                  إنستاباي: {totalInstapay.toLocaleString()}
                </span>
                <span className="px-2 py-1 rounded-lg bg-white/70 dark:bg-slate-800/80">
                  بنوك: {Number(bankAccounts).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Options & Notes */}
          <div className="space-y-3">
            {targetDate === todayStr && (
              <label className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToLive}
                  onChange={e => setApplyToLive(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded-sm border-slate-300 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  تطبيق هذه الأرصدة كأرصدة فعلية حية في الخزينة والخطوط الآن لبدء العمل اليوم
                </span>
              </label>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  القائم بالتسجيل والافتتاح
                </label>
                <input
                  type="text"
                  value={recordedBy}
                  onChange={e => setRecordedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  ملاحظات افتتاحية (اختياري)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="مثال: تم إضافة 5,000 ج.م كاش للدرج في الصباح"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn-interactive flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-red-600 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-amber-500/25 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تثبيت رصيد بداية اليومية والافتتاح</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
