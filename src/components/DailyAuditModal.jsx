import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  formatDateArabic, 
  formatTimeArabic, 
  getTodayString, 
  getLocalDateString 
} from '../utils/formatters';
import { 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Wallet, 
  DollarSign, 
  Building2, 
  Calendar, 
  User, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  Scale, 
  Check, 
  RotateCcw,
  Zap
} from 'lucide-react';

export default function DailyAuditModal() {
  const { 
    activeModal, 
    setActiveModal, 
    treasury = {}, 
    shopWallets = [], 
    instapayAccounts = [], 
    transactions = [], 
    purchases = [], 
    clients = [], 
    recordDailyAudit, 
    showToast 
  } = useCash();

  const dialogRef = useRef(null);

  // Form State
  const [auditDate, setAuditDate] = useState(getTodayString());
  const [auditorName, setAuditorName] = useState('محمود الأعصر (صاحب المحل)');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Actual Count States
  const [actualDrawerCash, setActualDrawerCash] = useState('');
  const [actualBankAccounts, setActualBankAccounts] = useState('');
  
  // Per-shop-wallet actual counts: { [walletId]: number|string }
  const [actualShopWallets, setActualShopWallets] = useState({});
  
  // Per-instapay-account actual counts: { [accountId]: number|string }
  const [actualInstapayAccounts, setActualInstapayAccounts] = useState({});

  // Initialize/Reset values when modal opens
  useEffect(() => {
    const dialog = dialogRef.current;
    if (activeModal === 'dailyAudit') {
      if (dialog && !dialog.open) dialog.showModal();
      
      // Default to today
      setAuditDate(getTodayString());
      setAuditorName('محمود الأعصر (صاحب المحل)');
      setNotes('');
      
      // Default actual values to current system balances for ease of use
      setActualDrawerCash(String(Number(treasury?.drawerCash) || 0));
      setActualBankAccounts(String(Number(treasury?.bankAccounts) || 0));

      const initialWallets = {};
      (shopWallets || []).forEach(w => {
        initialWallets[w.id] = String(Number(w.balance) || 0);
      });
      setActualShopWallets(initialWallets);

      const initialInstapay = {};
      (instapayAccounts || []).forEach(a => {
        initialInstapay[a.id] = String(Number(a.balance) || 0);
      });
      setActualInstapayAccounts(initialInstapay);
    } else {
      if (dialog && dialog.open) dialog.close();
    }
  }, [activeModal, treasury, shopWallets, instapayAccounts]);

  const handleClose = () => {
    setActiveModal(null);
  };

  // Today's Activity Metrics
  const todayStr = getTodayString();
  const dayTx = useMemo(() => {
    return (transactions || []).filter(t => t.dateOnly === (auditDate || todayStr));
  }, [transactions, auditDate, todayStr]);

  const dayPurchases = useMemo(() => {
    return (purchases || []).filter(p => {
      const pDate = p.date ? getLocalDateString(p.date) : '';
      return pDate === (auditDate || todayStr);
    });
  }, [purchases, auditDate, todayStr]);

  const dayTotalTransfersOut = useMemo(() => {
    return (dayTx || []).filter(t => t.type === 'transfer_out').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [dayTx]);

  const dayTotalRecharges = useMemo(() => {
    return (dayTx || []).filter(t => t.type === 'recharge' || t.type === 'limit_reset').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [dayTx]);

  const dayTotalPurchases = useMemo(() => {
    return (dayPurchases || []).reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  }, [dayPurchases]);

  const dayTotalClientCollections = useMemo(() => {
    return (dayTx || []).filter(t => t.type === 'client_payment' && !t.isCreditorPayout).reduce((sum, t) => sum + (Number(t.rawAmount || t.amount) || 0), 0);
  }, [dayTx]);

  // System Calculated Balances
  const systemDrawerCash = Number(treasury?.drawerCash) || 0;
  const systemBankAccounts = Number(treasury?.bankAccounts) || 0;
  
  // Total system for all shop wallets
  const systemShopWalletsTotal = (shopWallets || []).reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
  
  // Total system for all instapay accounts
  const systemInstapayTotal = (instapayAccounts || []).reduce((sum, a) => sum + (Number(a.balance) || 0), 0);

  const systemTotalLiquid = systemDrawerCash + systemShopWalletsTotal + systemInstapayTotal + systemBankAccounts;

  // Actual Counted Totals
  const numActualDrawer = Number(actualDrawerCash) || 0;
  const numActualBank = Number(actualBankAccounts) || 0;
  
  const numActualShopWalletsTotal = (shopWallets || []).reduce((sum, w) => {
    const val = actualShopWallets[w.id];
    return sum + (val !== undefined && val !== '' ? (Number(val) || 0) : (Number(w.balance) || 0));
  }, 0);

  const numActualInstapayTotal = (instapayAccounts || []).reduce((sum, a) => {
    const val = actualInstapayAccounts[a.id];
    return sum + (val !== undefined && val !== '' ? (Number(val) || 0) : (Number(a.balance) || 0));
  }, 0);

  const actualTotalLiquid = numActualDrawer + numActualShopWalletsTotal + numActualInstapayTotal + numActualBank;
  const totalVariance = actualTotalLiquid - systemTotalLiquid;

  // Variances
  const drawerVariance = numActualDrawer - systemDrawerCash;
  const bankVariance = numActualBank - systemBankAccounts;
  const walletsVariance = numActualShopWalletsTotal - systemShopWalletsTotal;
  const instapayVariance = numActualInstapayTotal - systemInstapayTotal;

  // Status computation
  let auditStatus = 'matched';
  if (Math.abs(totalVariance) > 0.01) {
    auditStatus = totalVariance > 0 ? 'surplus' : 'deficit';
  }

  // Quick Action Helpers
  const handleMatchDrawer = () => {
    setActualDrawerCash(String(systemDrawerCash));
  };

  const handleMatchBank = () => {
    setActualBankAccounts(String(systemBankAccounts));
  };

  const handleMatchWallet = (walletId, balance) => {
    setActualShopWallets(prev => ({ ...prev, [walletId]: String(balance) }));
  };

  const handleMatchAllWallets = () => {
    const matched = {};
    (shopWallets || []).forEach(w => {
      matched[w.id] = String(Number(w.balance) || 0);
    });
    setActualShopWallets(matched);
    showToast('تمت مطابقة جميع خطوط فودافون كاش دفعة واحدة', 'success');
  };

  const handleMatchInstapay = (accId, balance) => {
    setActualInstapayAccounts(prev => ({ ...prev, [accId]: String(balance) }));
  };

  const handleMatchAllInstapay = () => {
    const matched = {};
    (instapayAccounts || []).forEach(a => {
      matched[a.id] = String(Number(a.balance) || 0);
    });
    setActualInstapayAccounts(matched);
    showToast('تمت مطابقة جميع حسابات إنستاباي دفعة واحدة', 'success');
  };

  const handleMatchEverything = () => {
    setActualDrawerCash(String(systemDrawerCash));
    setActualBankAccounts(String(systemBankAccounts));
    handleMatchAllWallets();
    handleMatchAllInstapay();
    showToast('تمت مطابقة كامل الأرصدة والسيولة مع السيستم بنجاح!', 'success');
  };

  // Submit Audit
  const handleSubmitAudit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!auditorName.trim()) {
      showToast('يرجى كتابة اسم القائم بالجرد أو المسؤول', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build actual balances payload
      const shopWalletsPayload = (shopWallets || []).map(w => ({
        id: w.id,
        phoneNumber: w.phoneNumber,
        label: w.label,
        systemBalance: Number(w.balance) || 0,
        balance: actualShopWallets[w.id] !== undefined ? Number(actualShopWallets[w.id]) || 0 : Number(w.balance) || 0,
        variance: (actualShopWallets[w.id] !== undefined ? Number(actualShopWallets[w.id]) || 0 : Number(w.balance) || 0) - (Number(w.balance) || 0)
      }));

      const instapayAccountsPayload = (instapayAccounts || []).map(a => ({
        id: a.id,
        accountName: a.accountName,
        handle: a.handle,
        systemBalance: Number(a.balance) || 0,
        balance: actualInstapayAccounts[a.id] !== undefined ? Number(actualInstapayAccounts[a.id]) || 0 : Number(a.balance) || 0,
        variance: (actualInstapayAccounts[a.id] !== undefined ? Number(actualInstapayAccounts[a.id]) || 0 : Number(a.balance) || 0) - (Number(a.balance) || 0)
      }));

      const systemBalances = {
        drawerCash: systemDrawerCash,
        vodafoneCash: systemShopWalletsTotal,
        instapay: systemInstapayTotal,
        bankAccounts: systemBankAccounts,
        totalLiquidCash: systemTotalLiquid,
        shopWallets: (shopWallets || []).map(w => ({ id: w.id, phoneNumber: w.phoneNumber, label: w.label, balance: Number(w.balance) || 0 })),
        instapayAccounts: (instapayAccounts || []).map(a => ({ id: a.id, accountName: a.accountName, balance: Number(a.balance) || 0 }))
      };

      const actualBalances = {
        drawerCash: numActualDrawer,
        vodafoneCash: numActualShopWalletsTotal,
        instapay: numActualInstapayTotal,
        bankAccounts: numActualBank,
        totalLiquidCash: actualTotalLiquid,
        shopWallets: shopWalletsPayload,
        instapayAccounts: instapayAccountsPayload
      };

      const variances = {
        drawerCash: drawerVariance,
        vodafoneCash: walletsVariance,
        instapay: instapayVariance,
        bankAccounts: bankVariance,
        totalLiquidCash: totalVariance
      };

      const daySummary = {
        date: auditDate,
        totalTransfersOut: dayTotalTransfersOut,
        totalRecharges: dayTotalRecharges,
        totalPurchases: dayTotalPurchases,
        totalClientCollections: dayTotalClientCollections,
        transactionsCount: dayTx.length
      };

      recordDailyAudit({
        date: auditDate ? `${auditDate}T23:59:59.000Z` : new Date().toISOString(),
        auditorName: auditorName.trim(),
        notes: notes.trim(),
        systemBalances,
        actualBalances,
        variances,
        daySummary,
        status: auditStatus
      });

      handleClose();
    } catch (err) {
      console.error('Error submitting daily audit:', err);
      showToast('حدث خطأ أثناء حفظ الجرد اليومي', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="p-0 rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl border border-slate-200 dark:border-slate-800 backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm max-w-4xl w-[96vw] overflow-hidden transition-all animate-dialog-zoom"
    >
      <div className="flex flex-col max-h-[92vh]">
        {/* 1. Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  جرد نهاية اليوم وإقفال اليومية وبدء يوم جديد
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold backdrop-blur-sm">
                  مطابقة وإقفال مالي
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                جرد ومطابقة كاش الدرج، أرصدة خطوط فودافون كاش، وحسابات إنستاباي لتسليم واستلام وردية جديدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMatchEverything}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black shadow-sm transition-all"
              title="مطابقة كل الأرصدة مع السيستم فوراً"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>مطابقة الكل دفعة واحدة</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Modal Body */}
        <form onSubmit={handleSubmitAudit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Audit Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>تاريخ يومية الجرد</span>
              </label>
              <input
                type="date"
                value={auditDate}
                onChange={(e) => setAuditDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>المسؤول القائم بالجرد والاعتماد</span>
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                placeholder="اسم صاحب المحل أو المشرف المسؤول"
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Today's Activity Summary Pills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>ملخص حركة اليومية حتى الآن ({formatDateArabic(auditDate)}):</span>
              </span>
              <span className="text-[11px] text-slate-400 font-bold">
                {dayTx.length} حركة مسجلة
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block mb-0.5">
                  تحويلات صادرة اليوم
                </span>
                <span className="text-sm sm:text-base font-black text-rose-700 dark:text-rose-300">
                  {formatCurrency(dayTotalTransfersOut)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                  شحن رصيد وإيداعات للخطوط
                </span>
                <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(dayTotalRecharges)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mb-0.5">
                  مشتريات ومصروفات اليوم
                </span>
                <span className="text-sm sm:text-base font-black text-amber-700 dark:text-amber-300">
                  {formatCurrency(dayTotalPurchases)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40">
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mb-0.5">
                  تحصيلات وسداد عملاء اليوم
                </span>
                <span className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-300">
                  {formatCurrency(dayTotalClientCollections)}
                </span>
              </div>
            </div>
          </div>

          {/* Comparative Audit Form Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span>جدول الجرد المقارن (الرصيد الدفتري بالسيستم vs العد الفعلي على الطبيعة)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  اكتب المبلغ الفعلي المتواجد في الدرج وفي كل خط وحساب، أو اضغط "مطابق" إذا كان العد مطابقاً تماماً
                </p>
              </div>
            </div>

            {/* 1. Cash Drawer (كاش الدرج / الخزينة) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                      كاش الدرج والخزينة (العد الورقي الفعلي بالدرج)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      النقدية السائلة الموجودة في درج المحل
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMatchDrawer}
                  className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 text-[11px] font-bold transition-all flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>مطابق للسيستم</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">
                    الرصيد الدفتري المسجل:
                  </span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                    {formatCurrency(systemDrawerCash)}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">
                    الرصيد الفعلي المعدود (ج.م):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={actualDrawerCash}
                    onChange={(e) => setActualDrawerCash(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-black rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                    placeholder="ادخل المبلغ الفعلي"
                    required
                  />
                </div>

                <div className="p-2.5 rounded-xl text-center border transition-all flex flex-col justify-center items-center h-full"
                  style={{
                    backgroundColor: Math.abs(drawerVariance) < 0.01 
                      ? 'rgba(16, 185, 129, 0.08)' 
                      : drawerVariance > 0 
                      ? 'rgba(59, 130, 246, 0.08)' 
                      : 'rgba(239, 68, 68, 0.08)',
                    borderColor: Math.abs(drawerVariance) < 0.01 
                      ? 'rgba(16, 185, 129, 0.3)' 
                      : drawerVariance > 0 
                      ? 'rgba(59, 130, 246, 0.3)' 
                      : 'rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <span className="text-[10px] font-bold block mb-0.5 text-slate-500 dark:text-slate-400">
                    فرق جرد كاش الدرج:
                  </span>
                  <span className={`text-xs font-black ${
                    Math.abs(drawerVariance) < 0.01 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : drawerVariance > 0 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {Math.abs(drawerVariance) < 0.01 
                      ? '✓ مطابق تماماً' 
                      : `${drawerVariance > 0 ? '+ زيادة: ' : '- عجز: '}${formatCurrency(Math.abs(drawerVariance))}`}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Shop Vodafone Cash Lines (خطوط فودافون كاش للمحل) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>خطوط وأرقام فودافون كاش للمحل (جرد خط بخط)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold">
                        {shopWallets.length} خطوط
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      إجمالي رصيد الخطوط بالسيستم: {formatCurrency(systemShopWalletsTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMatchAllWallets}
                  className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 hover:bg-rose-200 text-[11px] font-bold transition-all flex items-center gap-1 self-start sm:self-auto"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>مطابقة كل الخطوط دفعة واحدة</span>
                </button>
              </div>

              {/* Line by line list */}
              <div className="space-y-2">
                {(shopWallets || []).map((wallet, idx) => {
                  const sysBal = Number(wallet.balance) || 0;
                  const actVal = actualShopWallets[wallet.id] !== undefined ? actualShopWallets[wallet.id] : String(sysBal);
                  const numAct = Number(actVal) || 0;
                  const diff = numAct - sysBal;
                  const isMatch = Math.abs(diff) < 0.01;

                  return (
                    <div 
                      key={wallet.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      {/* Info */}
                      <div className="sm:col-span-5 flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate">
                            {wallet.label}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block" dir="ltr">
                            {wallet.phoneNumber}
                          </span>
                        </div>
                      </div>

                      {/* System Bal */}
                      <div className="sm:col-span-2 text-right sm:text-center">
                        <span className="text-[10px] text-slate-400 block sm:hidden">الرصيد بالسيستم:</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                          {formatCurrency(sysBal)}
                        </span>
                      </div>

                      {/* Actual Input */}
                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={actVal}
                          onChange={(e) => setActualShopWallets(prev => ({ ...prev, [wallet.id]: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-xs font-black rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 text-center"
                          placeholder="العد الفعلي"
                        />
                        <button
                          type="button"
                          onClick={() => handleMatchWallet(wallet.id, sysBal)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors shrink-0"
                          title="مطابقة هذا الخط"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line Variance Badge */}
                      <div className="sm:col-span-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                          isMatch 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40' 
                            : diff > 0 
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40' 
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                        }`}>
                          {isMatch ? '✓ مطابق' : `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vodafone lines total footer */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/30 text-xs">
                <span className="font-bold text-rose-800 dark:text-rose-300">
                  إجمالي خطوط فودافون كاش: (دفتري: {formatCurrency(systemShopWalletsTotal)}) | (فعلي: {formatCurrency(numActualShopWalletsTotal)})
                </span>
                <span className={`font-black ${
                  Math.abs(walletsVariance) < 0.01 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : walletsVariance > 0 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {Math.abs(walletsVariance) < 0.01 ? '✓ مطابق تماماً' : `الفرق: ${walletsVariance > 0 ? '+' : ''}${formatCurrency(walletsVariance)}`}
                </span>
              </div>
            </div>

            {/* 3. Shop InstaPay Accounts (حسابات إنستاباي المحل) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>حسابات إنستاباي المحل (InstaPay)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 font-bold">
                        {instapayAccounts.length} حسابات
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      مطابقة الأرصدة المباشرة مع تطبيق إنستاباي
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMatchAllInstapay}
                  className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 hover:bg-purple-200 text-[11px] font-bold transition-all flex items-center gap-1 self-start sm:self-auto"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>مطابقة كل حسابات إنستاباي</span>
                </button>
              </div>

              {/* InstaPay accounts list */}
              <div className="space-y-2">
                {(instapayAccounts || []).map((acc, idx) => {
                  const sysBal = Number(acc.balance) || 0;
                  const actVal = actualInstapayAccounts[acc.id] !== undefined ? actualInstapayAccounts[acc.id] : String(sysBal);
                  const numAct = Number(actVal) || 0;
                  const diff = numAct - sysBal;
                  const isMatch = Math.abs(diff) < 0.01;

                  return (
                    <div 
                      key={acc.id}
                      className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      {/* Info */}
                      <div className="sm:col-span-5 flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate">
                            {acc.accountName}
                          </span>
                          <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 block truncate" dir="ltr">
                            {acc.handle}
                          </span>
                        </div>
                      </div>

                      {/* System Bal */}
                      <div className="sm:col-span-2 text-right sm:text-center">
                        <span className="text-[10px] text-slate-400 block sm:hidden">الرصيد بالسيستم:</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                          {formatCurrency(sysBal)}
                        </span>
                      </div>

                      {/* Actual Input */}
                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={actVal}
                          onChange={(e) => setActualInstapayAccounts(prev => ({ ...prev, [acc.id]: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-xs font-black rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-center"
                          placeholder="العد الفعلي"
                        />
                        <button
                          type="button"
                          onClick={() => handleMatchInstapay(acc.id, sysBal)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors shrink-0"
                          title="مطابقة هذا الحساب"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Account Variance Badge */}
                      <div className="sm:col-span-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                          isMatch 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40' 
                            : diff > 0 
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40' 
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                        }`}>
                          {isMatch ? '✓ مطابق' : `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* InstaPay Total Footer */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/30 text-xs">
                <span className="font-bold text-purple-800 dark:text-purple-300">
                  إجمالي حسابات إنستاباي: (دفتري: {formatCurrency(systemInstapayTotal)}) | (فعلي: {formatCurrency(numActualInstapayTotal)})
                </span>
                <span className={`font-black ${
                  Math.abs(instapayVariance) < 0.01 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : instapayVariance > 0 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {Math.abs(instapayVariance) < 0.01 ? '✓ مطابق تماماً' : `الفرق: ${instapayVariance > 0 ? '+' : ''}${formatCurrency(instapayVariance)}`}
                </span>
              </div>
            </div>

            {/* 4. Bank Accounts (الحسابات البنكية) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                      الحسابات البنكية للمحل (الأهلي، مصر، CIB)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      إجمالي الأرصدة المودعة في الحسابات البنكية
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMatchBank}
                  className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 hover:bg-blue-200 text-[11px] font-bold transition-all flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>مطابق للسيستم</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold block mb-0.5">
                    الرصيد الدفتري المسجل:
                  </span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                    {formatCurrency(systemBankAccounts)}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">
                    الرصيد الفعلي المعدود (ج.م):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={actualBankAccounts}
                    onChange={(e) => setActualBankAccounts(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-black rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    placeholder="ادخل المبلغ الفعلي"
                    required
                  />
                </div>

                <div className="p-2.5 rounded-xl text-center border transition-all flex flex-col justify-center items-center h-full"
                  style={{
                    backgroundColor: Math.abs(bankVariance) < 0.01 
                      ? 'rgba(16, 185, 129, 0.08)' 
                      : bankVariance > 0 
                      ? 'rgba(59, 130, 246, 0.08)' 
                      : 'rgba(239, 68, 68, 0.08)',
                    borderColor: Math.abs(bankVariance) < 0.01 
                      ? 'rgba(16, 185, 129, 0.3)' 
                      : bankVariance > 0 
                      ? 'rgba(59, 130, 246, 0.3)' 
                      : 'rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <span className="text-[10px] font-bold block mb-0.5 text-slate-500 dark:text-slate-400">
                    فرق جرد البنوك:
                  </span>
                  <span className={`text-xs font-black ${
                    Math.abs(bankVariance) < 0.01 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : bankVariance > 0 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {Math.abs(bankVariance) < 0.01 
                      ? '✓ مطابق تماماً' 
                      : `${bankVariance > 0 ? '+ زيادة: ' : '- عجز: '}${formatCurrency(Math.abs(bankVariance))}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Grand Reconciliation Banner (المحصلة الكلية للجرد) */}
          <div className="p-5 rounded-3xl border space-y-4 transition-all"
            style={{
              backgroundColor: auditStatus === 'matched' 
                ? 'rgba(16, 185, 129, 0.08)' 
                : auditStatus === 'surplus' 
                ? 'rgba(59, 130, 246, 0.08)' 
                : 'rgba(239, 68, 68, 0.08)',
              borderColor: auditStatus === 'matched' 
                ? 'rgba(16, 185, 129, 0.3)' 
                : auditStatus === 'surplus' 
                ? 'rgba(59, 130, 246, 0.3)' 
                : 'rgba(239, 68, 68, 0.3)'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl text-white ${
                  auditStatus === 'matched' 
                    ? 'bg-emerald-600 shadow-md shadow-emerald-600/30' 
                    : auditStatus === 'surplus' 
                    ? 'bg-blue-600 shadow-md shadow-blue-600/30' 
                    : 'bg-rose-600 shadow-md shadow-rose-600/30'
                }`}>
                  {auditStatus === 'matched' ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>
                <div>
                  <h5 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>
                      {auditStatus === 'matched' 
                        ? 'الجرد مطابق تماماً بالمليم (100% متوازن)' 
                        : auditStatus === 'surplus' 
                        ? 'توجد زيادة في الجرد الفعلي عن الدفتري' 
                        : 'يوجد عجز في الجرد الفعلي عن الدفتري'}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      auditStatus === 'matched' 
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                        : auditStatus === 'surplus' 
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400' 
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                    }`}>
                      {auditStatus === 'matched' ? 'مطابق' : auditStatus === 'surplus' ? 'زيادة' : 'عجز'}
                    </span>
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {auditStatus === 'matched'
                      ? 'جميع الأرصدة النقدية والإلكترونية مطابقة لحسابات السيستم وجاهزة للإغلاق وبدء يوم جديد.'
                      : auditStatus === 'surplus'
                      ? `تم احتساب زيادة بقيمة ${formatCurrency(totalVariance)} وسيتم قيدها كتسوية فائض جرد عند الاعتماد.`
                      : `تم احتساب عجز بقيمة ${formatCurrency(Math.abs(totalVariance))} وسيتم قيدها كتسوية عجز جرد عند الاعتماد.`}
                  </p>
                </div>
              </div>

              {/* Total Variance Pill */}
              <div className="text-right sm:text-left shrink-0">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mb-0.5">
                  صافي فرق الجرد الإجمالي:
                </span>
                <span className={`text-xl sm:text-2xl font-black ${
                  auditStatus === 'matched' 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : auditStatus === 'surplus' 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {auditStatus === 'matched' ? '0.00 ج.م' : `${totalVariance > 0 ? '+' : ''}${formatCurrency(totalVariance)}`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">إجمالي الدفتري بالسيستم:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(systemTotalLiquid)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">إجمالي العد الفعلي:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(actualTotalLiquid)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">رصيد بداية اليوم التالي:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(actualTotalLiquid)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">حالة اليومية:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">جاهزة للإقفال والتسليم</span>
              </div>
            </div>
          </div>

          {/* Audit Notes & Observations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>ملاحظات الجرد وتقفيل اليومية (اختياري)</span>
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تم الجرد بالكامل ومطابقة الدرج والمحافظ، يوجد فرق بسيط فكة معلقة، إلخ..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 3. Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-bold transition-all"
            >
              إلغاء والعودة
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-interactive flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-black shadow-lg transition-all ${
                auditStatus === 'deficit'
                  ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 shadow-amber-600/30'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/30'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>
                {isSubmitting 
                  ? 'جاري الاعتماد وبدء يوم جديد...' 
                  : 'اعتماد الجرد وتقفيل اليومية وبدء يوم جديد'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
