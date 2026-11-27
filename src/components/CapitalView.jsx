import React, { useState, useMemo } from 'react';
import { useCash } from '../context/CashContext';
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

  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'history' | 'daily_audits'
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'transfer' | 'adjustment' | 'deposit' | 'withdraw'
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setCurrentPage] = useState(1);
  const [auditFilter, setAuditFilter] = useState('all'); // 'all' | 'matched' | 'deficit' | 'surplus'
  const [auditSearch, setAuditSearch] = useState('');

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* 1. Cash in Drawer (كاش الدرج والخزينة) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3 relative group hover:border-emerald-300 dark:hover:border-emerald-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">
                    كاش الدرج (الخزينة)
                  </h3>
                  <span className="text-[10px] text-slate-400">نقدية فعلية باليد</span>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                {drawerPercent}% من السيولة
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {formatCurrency(treasury.drawerCash || 0)}
            </div>

            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleOpenAdjust('drawerCash')}
                className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors text-center"
              >
                جرد وتسوية
              </button>
              <button
                type="button"
                onClick={() => handleOpenTransfer('drawerCash')}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-slate-50 transition-colors"
                title="تحويل منه"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Vodafone Cash (فودافون كاش ومحافظ المحمول) */}
          {(() => {
            const linkedWalletsTotal = shopWallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
            const vfTreasury = Number(treasury.vodafoneCash) || 0;
            const vfDiff = vfTreasury - linkedWalletsTotal;
            return (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3 relative group hover:border-rose-300 dark:hover:border-rose-900/50 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">
                          فودافون كاش والمحافظ
                        </h3>
                        <span className="text-[10px] text-slate-400">{shopWallets.length} خطوط مربوطة بالخزينة</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                      {vodafonePercent}% من السيولة
                    </span>
                  </div>

                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {formatCurrency(vfTreasury)}
                  </div>

                  {/* Linked shop lines mini list */}
                  {shopWallets.length > 0 && (
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1 text-[11px] border-t border-slate-100 dark:border-slate-800 pt-2">
                      {shopWallets.slice(0, 4).map(w => (
                        <div key={w.id} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="truncate max-w-[130px]">{w.label}</span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrency(w.balance || 0)}</span>
                        </div>
                      ))}
                      {shopWallets.length > 4 && (
                        <div className="text-[10px] text-slate-400 text-center">
                          + {shopWallets.length - 4} خطوط أخرى (مجموعها: {formatCurrency(linkedWalletsTotal)})
                        </div>
                      )}
                      {Math.abs(vfDiff) > 0 && (
                        <button
                          type="button"
                          onClick={() => syncTreasuryWithSubAccounts('vodafoneCash')}
                          className="w-full mt-1 py-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold hover:bg-amber-100 border border-amber-200 dark:border-amber-800/50"
                        >
                          مزامنة الإجمالي مع مجموع الخطوط ({formatCurrency(linkedWalletsTotal)})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenAdjust('vodafoneCash')}
                    className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors text-center"
                  >
                    تسوية الرصيد
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenTransfer('vodafoneCash')}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition-colors"
                    title="تحويل منه"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 3. InstaPay (إنستاباي) */}
          {(() => {
            const linkedInstaTotal = instapayAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
            const instaTreasury = Number(treasury.instapay) || 0;
            const instaDiff = instaTreasury - linkedInstaTotal;
            return (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3 relative group hover:border-amber-300 dark:hover:border-amber-900/50 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">
                          إنستاباي (InstaPay)
                        </h3>
                        <span className="text-[10px] text-slate-400">{instapayAccounts.length} حسابات مربوطة</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                      {instapayPercent}% من السيولة
                    </span>
                  </div>

                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {formatCurrency(instaTreasury)}
                  </div>

                  {/* Linked InstaPay accounts mini list */}
                  {instapayAccounts.length > 0 && (
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1 text-[11px] border-t border-slate-100 dark:border-slate-800 pt-2">
                      {instapayAccounts.slice(0, 4).map(acc => (
                        <div key={acc.id} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="truncate max-w-[130px]">{acc.accountName}</span>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(acc.balance || 0)}</span>
                        </div>
                      ))}
                      {Math.abs(instaDiff) > 0 && (
                        <button
                          type="button"
                          onClick={() => syncTreasuryWithSubAccounts('instapay')}
                          className="w-full mt-1 py-1 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold hover:bg-amber-100 border border-amber-200 dark:border-amber-800/50"
                        >
                          مزامنة الإجمالي مع مجموع الحسابات ({formatCurrency(linkedInstaTotal)})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenAdjust('instapay')}
                    className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors text-center"
                  >
                    تحديث الرصيد
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenTransfer('instapay')}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:bg-slate-50 transition-colors"
                    title="تحويل منه"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 4. Bank Accounts (الحسابات البنكية) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3 relative group hover:border-blue-300 dark:hover:border-blue-900/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">
                    الحسابات البنكية والفيزا
                  </h3>
                  <span className="text-[10px] text-slate-400">أرصدة بنك مصر / الأهلي</span>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                {bankPercent}% من السيولة
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {formatCurrency(treasury.bankAccounts || 0)}
            </div>

            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleOpenAdjust('bankAccounts')}
                className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors text-center"
              >
                تحديث الرصيد
              </button>
              <button
                type="button"
                onClick={() => handleOpenTransfer('bankAccounts')}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-colors"
                title="تحويل منه"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

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
                          onClick={() => {
                            askConfirm({
                              title: 'حذف سجل الجرد اليومي',
                              message: `هل أنت متأكد من حذف سجل جرد يومية (${formatDateArabic(audit.dateOnly || audit.date)})؟`,
                              confirmText: 'نعم، احذف السجل',
                              isDangerous: true,
                              onConfirm: () => deleteDailyAudit(audit.id)
                            });
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
