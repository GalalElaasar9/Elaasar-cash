import React, { useState, useMemo, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import { getPersistedNavValue, setPersistedNavValue } from '../utils/storage';
import { 
  formatCurrency, 
  formatDateArabic, 
  formatTimeArabic,
  formatDateTimeArabic, 
  formatPhone,
  getTodayString 
} from '../utils/formatters';
import { 
  Coins, 
  Wallet, 
  DollarSign, 
  Building2, 
  ArrowRightLeft, 
  Scale, 
  PlusCircle, 
  MinusCircle, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  PieChart, 
  ArrowUpRight, 
  History, 
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function CapitalView({ onNavigateToTab }) {
  const { 
    treasury, 
    shopWallets = [],
    instapayAccounts = [],
    syncTreasuryWithSubAccounts,
    transactions,
    inventory,
    clients,
    purchases,
    dailyAudits = [],
    deleteDailyAudit,
    askConfirm,
    totalLiquidCash, 
    clientsTotalReceivables, 
    totalCapitalNetWorth,
    totalInventoryCost,
    totalSupplierDebt,
    setActiveModal, 
    setModalData,
    showToast 
  } = useCash();

  const [activeSubTab, setActiveSubTab] = useState(() =>
    getPersistedNavValue('elaasar_capital_subtab', 'overview', ['overview', 'history', 'daily_audits'])
  );

  useEffect(() => {
    setPersistedNavValue('elaasar_capital_subtab', activeSubTab);
  }, [activeSubTab]);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'transfer' | 'adjustment' | 'deposit' | 'withdraw'
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setCurrentPage] = useState(1);
  const [auditFilter, setAuditFilter] = useState('all'); // 'all' | 'matched' | 'deficit' | 'surplus'
  const [auditSearch, setAuditSearch] = useState('');
  const [expandedChannels, setExpandedChannels] = useState({});

  const ITEMS_PER_PAGE = 8;

  // Channel helper labels & icons
  const channelInfo = {
    drawerCash: { label: 'كاش الدرج / الخزينة', color: 'from-emerald-600 to-teal-700', text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-900/40' },
    vodafoneCash: { label: 'فودافون كاش ومحافظ المحمول', color: 'from-rose-600 to-red-700', text: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-900/40' },
    instapay: { label: 'إنستاباي (InstaPay)', color: 'from-amber-500 to-orange-600', text: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-900/40' },
    bankAccounts: { label: 'الحسابات البنكية', color: 'from-blue-600 to-indigo-700', text: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-900/40' }
  };

  // Percentage calculations
  const drawerPercent = totalLiquidCash > 0 ? Math.round(((Number(treasury.drawerCash) || 0) / totalLiquidCash) * 100) : 0;
  const vodafonePercent = totalLiquidCash > 0 ? Math.round(((Number(treasury.vodafoneCash) || 0) / totalLiquidCash) * 100) : 0;
  const instapayPercent = totalLiquidCash > 0 ? Math.round(((Number(treasury.instapay) || 0) / totalLiquidCash) * 100) : 0;
  const bankPercent = totalLiquidCash > 0 ? Math.round(((Number(treasury.bankAccounts) || 0) / totalLiquidCash) * 100) : 0;

  // Filtered History
  const filteredHistory = useMemo(() => {
    return (treasury.history || []).filter(item => {
      if (historyFilter !== 'all') {
        if (historyFilter === 'client_ops') {
          if (item.type !== 'client_payout' && item.type !== 'client_collection') return false;
        } else if (item.type !== historyFilter) {
          return false;
        }
      }
      if (historySearch.trim()) {
        const q = historySearch.trim().toLowerCase();
        const n = (item.notes || '').toLowerCase();
        if (!n.includes(q)) return false;
      }
      return true;
    });
  }, [treasury.history, historyFilter, historySearch]);

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE) || 1;
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE;
    return filteredHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredHistory, historyPage]);

  // Filtered Daily Audits
  const filteredDailyAudits = useMemo(() => {
    return (dailyAudits || []).filter(audit => {
      if (auditFilter !== 'all') {
        if (audit.status !== auditFilter) return false;
      }
      if (auditSearch.trim()) {
        const q = auditSearch.trim().toLowerCase();
        const n = (audit.notes || '').toLowerCase();
        const a = (audit.auditorName || '').toLowerCase();
        const d = (audit.dateOnly || '').toLowerCase();
        if (!n.includes(q) && !a.includes(q) && !d.includes(q)) return false;
      }
      return true;
    });
  }, [dailyAudits, auditFilter, auditSearch]);

  // Quick Open Modal Helpers
  const handleOpenTransfer = (from = null) => {
    setModalData({ mode: 'transfer', channel: from });
    setActiveModal('adjustCapital');
  };

  const handleOpenAdjust = (channel = null) => {
    setModalData({ mode: 'adjust', channel });
    setActiveModal('adjustCapital');
  };

  const handleOpenDepositWithdraw = (channel = null) => {
    setModalData({ mode: 'deposit_withdraw', channel });
    setActiveModal('adjustCapital');
  };

  const handleExportHistory = () => {
    if (filteredHistory.length === 0) {
      showToast('لا توجد حركات لتصديرها', 'info');
      return;
    }
    const headers = ['التاريخ', 'نوع الحركة', 'المبلغ', 'البيان والملاحظات'];
    const rows = filteredHistory.map(h => [
      `"${h.date}"`,
      `"${h.type === 'transfer' ? 'تحويل بين الخزائن' : h.type === 'adjustment' ? 'تسوية وجرد' : h.type === 'deposit' ? 'إيداع وضخ' : 'سحب'}"`,
      h.amount,
      `"${(h.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `elaasar-treasury-history-${getTodayString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير سجل حركات رأس المال بنجاح!');
  };

  return (
    <div className="space-y-6 animate-view-fade">
      
      {/* 1. Header & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        {/* Top Row: Title Identity + Primary Daily Closing CTA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 text-white shadow-md shadow-amber-500/25 flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 leading-snug">
                  إدارة رأس المال والسيولة النقدية والخزائن
                </h1>
                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold whitespace-nowrap shrink-0 border border-amber-200/70 dark:border-amber-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>مركز مالي مباشر</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                متابعة دقيقة لكاش الدرج، أرصدة فودافون كاش، حسابات إنستاباي، وأصول بضاعة المحل
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('dailyAudit')}
            className="btn-interactive shrink-0 whitespace-nowrap flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/25 transition-all border border-emerald-500/30"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-100 shrink-0" />
            <span>جرد نهاية اليوم وإقفال اليومية</span>
          </button>
        </div>

        {/* Bottom Row: Organized Quick Treasury Toolbar */}
        <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setModalData({ type: 'cash_liquidity' });
              setActiveModal('addCashLiquidity');
            }}
            className="btn-interactive whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-900/60 transition-all"
          >
            <Coins className="w-3.5 h-3.5 shrink-0" />
            <span>+ شراء وتغذية رصيد كاش</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenTransfer()}
            className="btn-interactive whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-900/60 transition-all"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
            <span>تحويل بين الخزائن</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdjust()}
            className="btn-interactive whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/90 dark:border-slate-700 transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>تسوية وجرد رصيد</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenDepositWithdraw()}
            className="btn-interactive whitespace-nowrap flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/90 dark:border-slate-700 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>إيداع / سحب سيولة</span>
          </button>
        </div>
      </div>

      {/* 2. Master Capital & Net Worth Hero Banner */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden space-y-6">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-amber-300">
                المركز المالي الشامل لمنظومة الأعصر كاش
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {formatCurrency(totalCapitalNetWorth)}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              إجمالي القيمة المالية الشاملة للمحل (السيولة النقدية + بضاعة المخزن + ديون العملاء - ديون الموردين)
            </p>
          </div>

          {/* Liquid Cash Quick Box */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0 text-right">
            <span className="text-[11px] text-emerald-300 font-bold block mb-0.5">
              إجمالي السيولة الجاهزة الفورية (كاش + محافظ + إنستاباي):
            </span>
            <span className="text-xl sm:text-2xl font-black text-white">
              {formatCurrency(totalLiquidCash)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              جاهزة للتصرف الفوري في أي وقت
            </span>
          </div>
        </div>

        {/* Liquidity Breakdown Horizontal Meter */}
        <div className="space-y-2 relative z-10">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-amber-400" />
              <span>توزيع السيولة النقدية الفورية بين الخزائن:</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">100% سيولة موزعة</span>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex p-0.5 gap-0.5">
            {drawerPercent > 0 && (
              <div 
                style={{ width: `${drawerPercent}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all"
                title={`كاش الدرج: ${drawerPercent}%`}
              />
            )}
            {vodafonePercent > 0 && (
              <div 
                style={{ width: `${vodafonePercent}%` }}
                className="h-full bg-rose-500 rounded-full transition-all"
                title={`فودافون كاش: ${vodafonePercent}%`}
              />
            )}
            {instapayPercent > 0 && (
              <div 
                style={{ width: `${instapayPercent}%` }}
                className="h-full bg-amber-500 rounded-full transition-all"
                title={`إنستاباي: ${instapayPercent}%`}
              />
            )}
            {bankPercent > 0 && (
              <div 
                style={{ width: `${bankPercent}%` }}
                className="h-full bg-blue-500 rounded-full transition-all"
                title={`الحسابات البنكية: ${bankPercent}%`}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300">كاش الدرج: <span className="font-bold text-white">{drawerPercent}%</span></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-300">فودافون كاش: <span className="font-bold text-white">{vodafonePercent}%</span></span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-300">إنستاباي: <span className="font-bold text-white">{instapayPercent}%</span></span>
            </span>
            {bankPercent > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-300">البنوك: <span className="font-bold text-white">{bankPercent}%</span></span>
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
            activeSubTab === 'overview'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>نظرة عامة والمركز المالي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('daily_audits')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
            activeSubTab === 'daily_audits'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>سجل الجرد اليومي وتقفيل اليوميات ({dailyAudits.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
            activeSubTab === 'history'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل حركات الخزينة والسيولة ({filteredHistory.length})</span>
        </button>
      </div>

      {activeSubTab === 'overview' && (
        <>
          {/* 3. The 4 Liquidity Channels Cards (الأوعية النقدية الأربعة) */}
          <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-500" />
            <span>خزائن وأوعية السيولة النقدية الحالية</span>
          </h2>
          <span className="text-xs text-slate-400">
            آخر تحديث: {formatDateTimeArabic(treasury.lastUpdated || new Date().toISOString())}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
          {[
            {
              id: 'drawerCash',
              title: 'كاش الدرج (الخزينة)',
              subtitle: 'نقدية فعلية باليد',
              percent: drawerPercent,
              amount: treasury.drawerCash || 0,
              icon: DollarSign,
              accent: {
                bar: 'bg-emerald-500',
                iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
                badge: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/50',
                hover: 'hover:border-emerald-300 dark:hover:border-emerald-800',
                btn: 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white dark:bg-emerald-950/40 dark:hover:bg-emerald-600 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-900/50',
                subText: 'text-emerald-600 dark:text-emerald-400'
              },
              adjustLabel: 'جرد وتسوية',
              emptyHint: 'نقدية حاضرة في الدرج متاحة فوراً للعمليات والمصروفات',
              subItems: [],
              diff: 0,
              linkedSum: 0
            },
            {
              id: 'vodafoneCash',
              title: 'فودافون كاش والمحافظ',
              subtitle: `${shopWallets.length} خطوط مربوطة بالخزينة`,
              percent: vodafonePercent,
              amount: Number(treasury.vodafoneCash) || 0,
              icon: Wallet,
              accent: {
                bar: 'bg-rose-500',
                iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
                badge: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-900/50',
                hover: 'hover:border-rose-300 dark:hover:border-rose-800',
                btn: 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white dark:bg-rose-950/40 dark:hover:bg-rose-600 dark:text-rose-300 border-rose-200/70 dark:border-rose-900/50',
                subText: 'text-rose-600 dark:text-rose-400'
              },
              adjustLabel: 'تسوية الرصيد',
              emptyHint: 'لا توجد خطوط محل مضافة بعد',
              subItems: shopWallets.map(w => ({ id: w.id, name: w.label || w.phoneNumber, balance: Number(w.balance) || 0 })),
              linkedSum: shopWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0),
              diff: (Number(treasury.vodafoneCash) || 0) - shopWallets.reduce((s, w) => s + (Number(w.balance) || 0), 0)
            },
            {
              id: 'instapay',
              title: 'إنستاباي (InstaPay)',
              subtitle: `${instapayAccounts.length} حسابات مربوطة`,
              percent: instapayPercent,
              amount: Number(treasury.instapay) || 0,
              icon: Coins,
              accent: {
                bar: 'bg-amber-500',
                iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
                badge: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-900/50',
                hover: 'hover:border-amber-300 dark:hover:border-amber-800',
                btn: 'bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white dark:bg-amber-950/40 dark:hover:bg-amber-600 dark:text-amber-300 border-amber-200/70 dark:border-amber-900/50',
                subText: 'text-amber-600 dark:text-amber-400'
              },
              adjustLabel: 'تحديث الرصيد',
              emptyHint: 'لا توجد حسابات إنستاباي مضافة بعد',
              subItems: instapayAccounts.map(a => ({ id: a.id, name: a.accountName, balance: Number(a.balance) || 0 })),
              linkedSum: instapayAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0),
              diff: (Number(treasury.instapay) || 0) - instapayAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)
            },
            {
              id: 'bankAccounts',
              title: 'الحسابات البنكية والفيزا',
              subtitle: 'أرصدة بنك مصر / الأهلي',
              percent: bankPercent,
              amount: treasury.bankAccounts || 0,
              icon: Building2,
              accent: {
                bar: 'bg-blue-500',
                iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
                badge: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200/70 dark:border-blue-900/50',
                hover: 'hover:border-blue-300 dark:hover:border-blue-800',
                btn: 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-950/40 dark:hover:bg-blue-600 dark:text-blue-300 border-blue-200/70 dark:border-blue-900/50',
                subText: 'text-blue-600 dark:text-blue-400'
              },
              adjustLabel: 'تحديث الرصيد',
              emptyHint: 'رصيد الحسابات البنكية والإيداعات الجاهز للتحويل',
              subItems: [],
              diff: 0,
              linkedSum: 0
            }
          ].map(card => {
            const Icon = card.icon;
            const isExpanded = Boolean(expandedChannels[card.id]);
            const visibleSubItems = isExpanded ? card.subItems : card.subItems.slice(0, 3);
            const hiddenCount = Math.max(0, card.subItems.length - 3);

            return (
              <div
                key={card.id}
                className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm ${card.accent.hover} transition-all flex flex-col overflow-hidden`}
              >
                {/* Top Colored Hairline Accent */}
                <div className={`h-1 w-full ${card.accent.bar}`} />

                <div className="p-4 flex flex-col flex-1 justify-between gap-3.5">
                  {/* Top Header & Balance */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${card.accent.iconBg} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                            {card.title}
                          </h3>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {card.subtitle}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border whitespace-nowrap shrink-0 ${card.accent.badge}`}>
                        {card.percent}%
                      </span>
                    </div>

                    {/* Amount + Share Bar */}
                    <div className="space-y-1.5">
                      <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                        {formatCurrency(card.amount)}
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${card.accent.bar} transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(2, card.percent))}%` }}
                        />
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      {card.subItems.length > 0 ? (
                        <div className="space-y-1.5">
                          {visibleSubItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-slate-600 dark:text-slate-400 truncate flex-1 min-w-0">
                                {item.name}
                              </span>
                              <span className={`font-mono font-bold whitespace-nowrap shrink-0 ${card.accent.subText}`}>
                                {formatCurrency(item.balance)}
                              </span>
                            </div>
                          ))}

                          {hiddenCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedChannels(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                              className="w-full pt-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-center"
                            >
                              {isExpanded ? 'عرض أقل ▲' : `+ ${hiddenCount} أخرى (عرض الكل) ▼`}
                            </button>
                          )}

                          {Math.abs(card.diff) > 0 && (
                            <button
                              type="button"
                              onClick={() => syncTreasuryWithSubAccounts(card.id)}
                              className="w-full mt-1 py-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold hover:bg-amber-100 border border-amber-200 dark:border-amber-800/50"
                            >
                              مزامنة مع المجموع ({formatCurrency(card.linkedSum)})
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                          {card.emptyHint}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pinned Footer Actions */}
                  <div className="flex items-center gap-1.5 pt-3 mt-auto border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleOpenAdjust(card.id)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${card.accent.btn}`}
                    >
                      {card.adjustLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenTransfer(card.id)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      title="تحويل منه"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Assets & Liabilities Balance Sheet Row (الأصول غير النقدية والديون) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-red-600" />
            <span>باقي أصول رأس المال والالتزامات (المخزون وحسابات الآجل)</span>
          </h2>
          <span className="text-xs text-slate-400">تحديث لحظي من دفاتر المنظومة</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          
          {/* Asset 1: Inventory Stock Value */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-500" />
                <span>قيمة بضاعة المخزن (أصل مالي)</span>
              </span>
              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                + أصل مملوك
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(totalInventoryCost)}
            </div>
            <p className="text-[11px] text-slate-400">
              إجمالي تكلفة {inventory.length} صنف مسجل بمخزن الأجهزة والإكسسوارات
            </p>
          </div>

          {/* Asset 2: Clients Receivables (ديون العملاء للمحل) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>مستحقات المحل عند العملاء (آجل له)</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                + مطلوب تحصيله
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600">
              {formatCurrency(clientsTotalReceivables)}
            </div>
            <p className="text-[11px] text-slate-400">
              أموال المحل بالخارج مستحقة السداد من العملاء المدينين
            </p>
          </div>

          {/* Liability: Supplier Payables (ديون الموردين على المحل) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-red-500" />
                <span>ديون الموردين والشركات (آجل عليه)</span>
              </span>
              <span className="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                - مستحق سداده
              </span>
            </div>
            <div className={`text-xl sm:text-2xl font-black ${totalSupplierDebt > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {totalSupplierDebt > 0 ? formatCurrency(totalSupplierDebt) : '0 (خالص)'}
            </div>
            <p className="text-[11px] text-slate-400">
              المبالغ الآجلة الواجب سدادها لموردي البضاعة والمصروفات
            </p>
          </div>

        </div>
      </div>
      </>
      )}

      {/* SUB-TAB: DAILY AUDITS (سجل الجرد اليومي وتقفيل اليوميات) */}
      {activeSubTab === 'daily_audits' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-4 sm:p-5">
          {/* Header & New Audit CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>سجل الجرد اليومي وتقفيل اليوميات ({dailyAudits.length})</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
                    معتمد رسمياً
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  أرشيف كامل لجرد نهاية اليوم ومطابقة كاش الدرج والخطوط وحسابات إنستاباي لبدء أيام جديدة
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal('dailyAudit')}
              className="btn-interactive flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/25 transition-all self-start sm:self-auto"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>+ جرد نهاية اليوم وإقفال اليومية</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-8 relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="بحث بتاريخ اليومية (مثال: 2026-11-23)، اسم المسؤول، أو الملاحظات..."
                className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:outline-none"
              >
                <option value="all">جميع حالات الجرد ({dailyAudits.length})</option>
                <option value="matched">المطابقة تماماً فقط (100%)</option>
                <option value="deficit">التي بها عجز جرد</option>
                <option value="surplus">التي بها زيادة جرد</option>
              </select>
            </div>
          </div>

          {/* Audits List */}
          {filteredDailyAudits.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                لا توجد سجلات جرد تطابق البحث أو الفلتر المحدد
              </p>
              <button
                type="button"
                onClick={() => setActiveModal('dailyAudit')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>إجراء جرد نهاية اليوم الآن</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDailyAudits.map((audit) => {
                const isMatched = audit.status === 'matched' || Math.abs(audit.variances?.totalLiquidCash || 0) < 0.01;
                const isSurplus = audit.status === 'surplus' || (audit.variances?.totalLiquidCash || 0) > 0.01;
                const isDeficit = audit.status === 'deficit' || (audit.variances?.totalLiquidCash || 0) < -0.01;
                const totalVar = audit.variances?.totalLiquidCash || (Number(audit.actualBalances?.totalLiquidCash || 0) - Number(audit.systemBalances?.totalLiquidCash || 0));

                return (
                  <div
                    key={audit.id}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3.5"
                  >
                    {/* Top Row: Date, Auditor & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/70 dark:border-slate-700/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl text-white ${
                          isMatched ? 'bg-emerald-600' : isSurplus ? 'bg-blue-600' : 'bg-rose-600'
                        }`}>
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                              يومية: {formatDateArabic(audit.dateOnly || audit.date)}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                              isMatched 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40' 
                                : isSurplus 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40' 
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                            }`}>
                              {isMatched ? '✓ مطابق بالمليم' : isSurplus ? '+ يوجد زيادة' : '- يوجد عجز'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            المسؤول: <strong className="text-slate-700 dark:text-slate-300">{audit.auditorName || 'صاحب المحل'}</strong> | توقيت الإقفال: {audit.time || formatTimeArabic(audit.date)}
                          </span>
                        </div>
                      </div>

                      {/* Variance Amount Pill */}
                      <div className="text-right sm:text-left">
                        <span className="text-[10px] text-slate-400 font-bold block">صافي فرق الجرد:</span>
                        <span className={`text-base sm:text-lg font-black ${
                          isMatched 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : isSurplus 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isMatched ? '0.00 ج.م' : `${totalVar > 0 ? '+' : ''}${formatCurrency(totalVar)}`}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Summary Metrics comparison */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">دفتري السيستم:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(audit.systemBalances?.totalLiquidCash || 0)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">العد الفعلي المعدود:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(audit.actualBalances?.totalLiquidCash || 0)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">كاش الدرج الفعلي:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(audit.actualBalances?.drawerCash || 0)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-0.5">رصيد الخطوط الفعلي:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(audit.actualBalances?.vodafoneCash || 0)}</span>
                      </div>
                    </div>

                    {/* Notes if any */}
                    {audit.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 line-clamp-2">
                        💬 <span className="font-bold">ملاحظات:</span> {audit.notes}
                      </p>
                    )}

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        {audit.actualBalances?.shopWallets?.length || 0} خطوط فودافون كاش | {audit.actualBalances?.instapayAccounts?.length || 0} حسابات إنستاباي
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = await askConfirm({
                              title: 'حذف سجل الجرد اليومي',
                              message: `هل أنت متأكد من حذف سجل جرد يومية (${formatDateArabic(audit.dateOnly || audit.date)})؟`,
                              details: 'سيتم إزالة سجل الجرد من الأرشيف فقط دون تعديل الأرصدة الحالية.',
                              type: 'danger',
                              confirmText: 'نعم، احذف السجل',
                              cancelText: 'إلغاء'
                            });
                            if (confirmed) {
                              deleteDailyAudit(audit.id);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all"
                        >
                          حذف
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setModalData({ audit });
                            setActiveModal('auditDetails');
                          }}
                          className="btn-interactive flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm transition-all"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>عرض تفاصيل الجرد والطباعة</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: HISTORY OR OVERVIEW RECENT MOVEMENTS */}
      {(activeSubTab === 'history' || activeSubTab === 'overview') && (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-4 sm:p-5">
        
        {/* Log Title & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                سجل حركات وتغيرات رأس المال والسيولة ({filteredHistory.length})
              </h3>
              <p className="text-xs text-slate-400">
                توثيق كامل لكافة التحويلات بين الخزائن، تسويات الجرد، والإيداعات والسحوبات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>تصدير السجل</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => { setHistorySearch(e.target.value); setCurrentPage(1); }}
              placeholder="بحث في ملاحظات وبيان الحركات..."
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={historyFilter}
              onChange={(e) => { setHistoryFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:outline-none"
            >
              <option value="all">جميع أنواع الحركات</option>
              <option value="transfer">التحويلات بين الخزائن فقط</option>
              <option value="client_ops">حركات العملاء (صرف وتحصيل)</option>
              <option value="client_payout">صرف مستحقات عملاء</option>
              <option value="client_collection">تحصيل من عملاء</option>
              <option value="product_sale_income">إيرادات مبيعات الأجهزة</option>
              <option value="purchase_deduction">خصومات المشتريات والمصروفات</option>
              <option value="cash_stock_in">تغذية وشراء رصيد كاش</option>
              <option value="supplier_payment">سدادات ديون الموردين</option>
              <option value="adjustment">تسويات الجرد فقط</option>
              <option value="deposit">الإيداعات وضخ السيولة</option>
              <option value="withdraw">المسحوبات</option>
            </select>
          </div>
        </div>

        {/* Table of Movements */}
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            لا توجد حركات مسجلة حالياً تطابق البحث
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">التاريخ والوقت</th>
                  <th className="py-2.5 px-3">نوع الحركة</th>
                  <th className="py-2.5 px-3 text-center">المبلغ</th>
                  <th className="py-2.5 px-3">البيان والملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedHistory.map((mov, i) => {
                  const isTransfer = mov.type === 'transfer';
                  const isAdjust = mov.type === 'adjustment';
                  const isDeposit = mov.type === 'deposit';
                  const isPurchaseDeduct = mov.type === 'purchase_deduction';
                  const isCashStockIn = mov.type === 'cash_stock_in';
                  const isSupplierPay = mov.type === 'supplier_payment';
                  const isClientPayout = mov.type === 'client_payout';
                  const isClientCollection = mov.type === 'client_collection';
                  const isProductSale = mov.type === 'product_sale_income';

                  return (
                    <tr key={mov.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {formatDateTimeArabic(mov.date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          isTransfer
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : isAdjust
                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            : isDeposit || isCashStockIn || isClientCollection || isProductSale
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : isPurchaseDeduct || isClientPayout
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                            : isSupplierPay
                            ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}>
                          {
                            isTransfer ? 'تحويل بين الخزائن' :
                            isAdjust ? 'تسوية وجرد' :
                            isDeposit ? 'إيداع سيولة' :
                            isCashStockIn ? 'تغذية رصيد كاش' :
                            isPurchaseDeduct ? 'خصم مشتريات' :
                            isSupplierPay ? 'سداد مورد' :
                            isClientPayout ? 'صرف مستحقات عميل' :
                            isClientCollection ? 'تحصيل من عميل' :
                            isProductSale ? 'إيراد مبيعات' :
                            'سحب سيولة'
                          }
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-center font-black font-mono ${
                        (isDeposit || isCashStockIn || isClientCollection || isProductSale || mov.isIncrease) ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {(isDeposit || isCashStockIn || isClientCollection || isProductSale || mov.isIncrease) ? '+' : '-'}{formatCurrency(mov.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        {mov.notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-400">
              صفحة {historyPage} من {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={historyPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={historyPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
      )}

    </div>
  );
}
