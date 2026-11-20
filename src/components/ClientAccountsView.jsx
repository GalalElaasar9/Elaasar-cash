import React, { useState, useMemo } from 'react';
import { useCash } from '../context/CashContext';
import {
  formatCurrency,
  formatNumber,
  formatPhone,
  formatTimeArabic,
  formatDateArabic,
  getEgyptianCarrier,
  calculateWalletStats
} from '../utils/formatters';
import {
  Users,
  Search,
  Calculator,
  Percent,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  ArrowDownToLine,
  Phone,
  Smartphone,
  Eye,
  Copy,
  Check,
  Calendar,
  X,
  Share2,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';

export default function ClientAccountsView() {
  const {
    clients,
    transactions,
    updateClient,
    setActiveModal,
    setModalData,
    showToast
  } = useCash();

  // Selected time range for recharges: 'today' | 'month' | 'all'
  const [timeRange, setTimeRange] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [selectedClientForStatement, setSelectedClientForStatement] = useState(null);
  const [copiedClientId, setCopiedClientId] = useState(null);

  const todayKey = new Date().toISOString().split('T')[0];
  const currentMonthKey = todayKey.slice(0, 7);

  // Compute live accounting metrics for every client
  const clientAccountsData = useMemo(() => {
    return clients.map(client => {
      const wallets = client.wallets || [];
      const walletIds = new Set(wallets.map(w => w.id));

      // 1. Wallets breakdown
      const walletsBreakdown = wallets.map(wallet => {
        const stats = calculateWalletStats(wallet, transactions);
        const carrier = getEgyptianCarrier(wallet.phoneNumber);

        // Get transactions for this specific wallet in selected period
        const walletRechargeTx = transactions.filter(t => 
          t.walletId === wallet.id && (t.type === 'recharge' || t.type === 'limit_reset')
        );

        const walletTodayRecharge = stats.todayRecharges || 0;
        const walletMonthRecharge = stats.totalRecharges || 0;
        const walletAllRecharge = walletRechargeTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const walletActiveAmount = timeRange === 'today'
          ? walletTodayRecharge
          : timeRange === 'month'
          ? walletMonthRecharge
          : walletAllRecharge;

        return {
          id: wallet.id,
          phoneNumber: wallet.phoneNumber,
          label: wallet.label,
          carrier,
          todayRecharges: walletTodayRecharge,
          monthRecharges: walletMonthRecharge,
          allRecharges: walletAllRecharge,
          amount: walletActiveAmount
        };
      });

      // 2. Client-level sums
      const clientTodayRecharges = walletsBreakdown.reduce((sum, w) => sum + w.todayRecharges, 0);
      const clientMonthRecharges = walletsBreakdown.reduce((sum, w) => sum + w.monthRecharges, 0);
      const clientAllRecharges = walletsBreakdown.reduce((sum, w) => sum + w.allRecharges, 0);

      const baseAmount = timeRange === 'today'
        ? clientTodayRecharges
        : timeRange === 'month'
        ? clientMonthRecharges
        : clientAllRecharges;

      // 3. Commission settings (persisted per client or fallback to localStorage)
      let commissionMode = client.commissionMode;
      if (!commissionMode) {
        try {
          commissionMode = localStorage.getItem(`elaasar_client_commission_mode_${client.id}`) || 'add';
        } catch {
          commissionMode = 'add';
        }
      }

      let commissionPercent = client.commissionPercent;
      if (commissionPercent === undefined || commissionPercent === null) {
        try {
          const saved = localStorage.getItem(`elaasar_client_commission_${client.id}`);
          commissionPercent = saved !== null ? Number(saved) : 1;
        } catch {
          commissionPercent = 1;
        }
      }

      const commissionNum = Math.max(0, Number(commissionPercent) || 0);
      // قيمة العمولة = المبلغ قبل العمولة مضروب في نسبة العمولة
      const commissionAmount = (baseAmount * commissionNum) / 100;

      // المبلغ بعد خصم أو إضافة العمولة (الآجل المستحق)
      const finalAmount = commissionMode === 'add'
        ? baseAmount + commissionAmount
        : Math.max(0, baseAmount - commissionAmount);

      // Relevant transactions for statement modal
      const clientTxList = transactions.filter(t => {
        if (!walletIds.has(t.walletId)) return false;
        if (t.type !== 'recharge' && t.type !== 'limit_reset') return false;
        if (timeRange === 'today') {
          return (t.dateOnly || t.date || '').startsWith(todayKey);
        }
        if (timeRange === 'month') {
          return (t.dateOnly || t.date || '').slice(0, 7) === currentMonthKey;
        }
        return true;
      });

      return {
        client,
        wallets: walletsBreakdown,
        todayRecharges: clientTodayRecharges,
        monthRecharges: clientMonthRecharges,
        allRecharges: clientAllRecharges,
        baseAmount,
        commissionMode,
        commissionPercent: commissionNum,
        commissionAmount,
        finalAmount,
        transactionsCount: clientTxList.length,
        transactions: clientTxList
      };
    });
  }, [clients, transactions, timeRange, todayKey, currentMonthKey]);

  // Filter clients based on search query & active debt filter
  const filteredAccounts = useMemo(() => {
    return clientAccountsData.filter(item => {
      // Filter active only (> 0)
      if (filterActiveOnly && item.baseAmount <= 0) {
        return false;
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.client.name?.toLowerCase().includes(q);
      const matchNotes = item.client.notes?.toLowerCase().includes(q);
      const matchPhone = item.wallets.some(w => 
        w.phoneNumber?.includes(q) || w.label?.toLowerCase().includes(q)
      );

      return matchName || matchNotes || matchPhone;
    });
  }, [clientAccountsData, searchQuery, filterActiveOnly]);

  // Global Totals across filtered clients
  const summaryTotals = useMemo(() => {
    return filteredAccounts.reduce(
      (acc, item) => {
        acc.totalBase += item.baseAmount;
        acc.totalCommission += item.commissionMode === 'add' ? item.commissionAmount : -item.commissionAmount;
        acc.totalFinal += item.finalAmount;
        if (item.baseAmount > 0) acc.activeClientsCount += 1;
        acc.totalWalletsCount += item.wallets.length;
        return acc;
      },
      {
        totalBase: 0,
        totalCommission: 0,
        totalFinal: 0,
        activeClientsCount: 0,
        totalWalletsCount: 0
      }
    );
  }, [filteredAccounts]);

  // Quick action: Change Commission Mode
  const handleToggleCommissionMode = (client, currentMode) => {
    const nextMode = currentMode === 'add' ? 'deduct' : 'add';
    updateClient(client.id, { commissionMode: nextMode });
    try {
      localStorage.setItem(`elaasar_client_commission_mode_${client.id}`, nextMode);
    } catch (e) {
      console.error(e);
    }
    showToast(`تم تغيير طريقة العمولة للعميل (${client.name}) إلى ${nextMode === 'add' ? 'إضافة (+)' : 'خصم (-)'}`);
  };

  // Quick action: Change Commission Percent
  const handleChangeCommissionPercent = (client, newPercent) => {
    const num = Math.max(0, Number(newPercent) || 0);
    updateClient(client.id, { commissionPercent: num });
    try {
      localStorage.setItem(`elaasar_client_commission_${client.id}`, String(num));
    } catch (e) {
      console.error(e);
    }
  };

  // Quick action: Open recharge modal for a wallet
  const handleQuickRecharge = (client, wallet) => {
    setModalData({
      clientId: client.id,
      clientName: client.name,
      wallet: {
        id: wallet.id,
        phoneNumber: wallet.phoneNumber,
        label: wallet.label
      }
    });
    setActiveModal('rechargeWallet');
  };

  // Quick action: Copy WhatsApp Statement message
  const handleCopyWhatsAppMessage = (item) => {
    const modeText = item.commissionMode === 'add' ? 'إضافة' : 'خصم';
    const periodLabel = timeRange === 'today' ? 'اليوم' : timeRange === 'month' ? 'هذا الشهر' : 'الإجمالي';

    const text = `السلام عليكم ورحمة الله،
كشف حساب الآجل (${periodLabel}) - محلات الأعصر:
العميل: ${item.client.name}
عدد الخطوط المشحونة: ${item.wallets.filter(w => w.amount > 0).length || item.wallets.length}
-----------------------------
المبلغ قبل العمولة: ${formatNumber(item.baseAmount)} ج.م
نسبة العمولة: ${item.commissionPercent}% (${modeText} ${formatNumber(item.commissionAmount)} ج.م)
-----------------------------
المطلوب سداده بعد العمولة: ${formatNumber(item.finalAmount)} ج.م
-----------------------------
شاكرين لحضرتك، نسعد بخدمتك دائماً.`;

    navigator.clipboard.writeText(text);
    setCopiedClientId(item.client.id);
    showToast(`تم نسخ رسالة المطالبة لحساب ${item.client.name}`);
    setTimeout(() => setCopiedClientId(null), 2500);
  };

  // Export full table to CSV / Excel
  const handleExportCSV = () => {
    if (filteredAccounts.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'info');
      return;
    }

    const periodLabel = timeRange === 'today' ? 'شحن اليوم' : timeRange === 'month' ? 'شحن هذا الشهر' : 'الإجمالي العام';
    const headers = [
      'م',
      'اسم العميل',
      'عدد الخطوط',
      'أرقام الهواتف',
      'إجمالي الشحن (قبل العمولة)',
      'طريقة العمولة',
      'نسبة العمولة %',
      'قيمة العمولة',
      'المبلغ الآجل المستحق (بعد العمولة)'
    ];

    const rows = filteredAccounts.map((item, idx) => [
      idx + 1,
      `"${item.client.name.replace(/"/g, '""')}"`,
      item.wallets.length,
      `"${item.wallets.map(w => w.phoneNumber).join(' - ')}"`,
      item.baseAmount,
      item.commissionMode === 'add' ? 'إضافة (+)' : 'خصم (-)',
      `${item.commissionPercent}%`,
      item.commissionMode === 'add' ? item.commissionAmount : -item.commissionAmount,
      item.finalAmount
    ]);

    rows.push([]);
    rows.push([`كشف حسابات العملاء والآجل - فترة: ${periodLabel}`, '', '', '', '', '', '', '', '']);
    rows.push(['الإجمالي العام', '', '', '', summaryTotals.totalBase, '', '', summaryTotals.totalCommission, summaryTotals.totalFinal]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `كشف-حسابات-العملاء-${todayKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير كشف حسابات العملاء إلى ملف إكسل بنجاح');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center shadow-md shadow-emerald-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                حسابات العملاء والآجل
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                متابعة المستحقات
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              رصد رصيد الشحن الآجل لكل عميل، حساب العمولات (خصم أو إضافة)، وتحديث لحظي مباشر مع أي حركة
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={handleExportCSV}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs"
            title="تصدير كشف حسابات العملاء إلى إكسل"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصدير إكسل</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs"
            title="طباعة كشف الحسابات"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>

        </div>

      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Receivables (المبلغ الآجل بعد العمولة) */}
        <div className="card-hover bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-lg shadow-emerald-600/20 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>إجمالي الآجل المستحق (بعد العمولة)</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-white">
              المطلوب تحصيله
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
            {formatCurrency(summaryTotals.totalFinal)}
          </div>
          <span className="text-[11px] text-emerald-100 mt-2 block">
            صافي المبالغ الآجلة المطلوبة من كافة العملاء المعروضين
          </span>
        </div>

        {/* Card 2: Total Recharges (إجمالي الشحن قبل العمولة) */}
        <div className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
              إجمالي مبالغ الشحن (قبل العمولة)
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              المبالغ المدخلة
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            {formatCurrency(summaryTotals.totalBase)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
            المبالغ التي تم شحنها فعلياً لأرقام العملاء في الفترة المحددة
          </span>
        </div>

        {/* Card 3: Net Commission Difference */}
        <div className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-amber-500" />
              <span>صافي فرق العمولات</span>
            </span>
            <span className="text-[10px] text-slate-400">إضافة / خصم</span>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
            summaryTotals.totalCommission >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {summaryTotals.totalCommission >= 0 ? '+' : ''}{formatCurrency(summaryTotals.totalCommission)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block pt-1">
            إجمالي العمولات المضافة أو المخصومة للعملاء
          </span>
        </div>

        {/* Card 4: Clients & Lines Overview */}
        <div className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>إحصائيات العملاء</span>
            </span>
            <span className="text-[10px] text-slate-400">النشاط</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-600 dark:text-slate-300">عملاء عليهم آجل نشط:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-base font-black">
              {summaryTotals.activeClientsCount} من {clients.length}
            </strong>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">إجمالي الخطوط المسجلة:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
              {summaryTotals.totalWalletsCount} رقم
            </span>
          </div>
        </div>

      </div>

      {/* 3. Toolbar: Period Switcher, Search, Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        
        {/* Time Period Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shrink-0">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeRange === 'today'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            شحن اليوم
          </button>

          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeRange === 'month'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            شحن هذا الشهر
          </button>

          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              timeRange === 'all'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            الإجمالي العام (الكل)
          </button>
        </div>

        {/* Search & Active-Only Filter */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث باسم العميل أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Toggle: Only Debt > 0 */}
          <button
            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 ${
              filterActiveOnly
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>عليهم آجل فقط (&gt; 0)</span>
          </button>
        </div>

      </div>

      {/* 4. The Main Accounts Table (جدول حسابات العملاء المباشر) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              جدول المبالغ الآجلة على أصحاب الخطوط
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredAccounts.length} عميل
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>تحديث فوري ومباشر مع أي حركة رصيد</span>
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
              لا توجد حسابات مطابقة للبحث أو الفلتر
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              تأكد من كتابة الاسم بشكل صحيح أو قم بإلغاء فلتر "عليهم آجل فقط".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-black border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[180px]">اسم العميل</th>
                  <th className="py-3.5 px-4 min-w-[280px]">أرقام وخطوط العميل</th>
                  <th className="py-3.5 px-4 min-w-[150px] text-blue-700 dark:text-blue-300">
                    المبلغ قبل العمولة
                  </th>
                  <th className="py-3.5 px-4 min-w-[210px]">ضبط العمولة (% / خصم / إضافة)</th>
                  <th className="py-3.5 px-4 min-w-[180px] text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
                    الآجل المطلوب (بعد العمولة)
                  </th>
                  <th className="py-3.5 px-4 w-32 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAccounts.map((item, index) => {
                  const { client, wallets, baseAmount, commissionMode, commissionPercent, commissionAmount, finalAmount } = item;

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Row index */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">
                        {index + 1}
                      </td>

                      {/* Client Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-red-600 dark:to-rose-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {client.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 dark:text-white text-sm leading-tight">
                              {client.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {wallets.length} {wallets.length === 1 ? 'رقم مسجل' : 'أرقام مسجلة'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client Wallets & Breakdown */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {wallets.map(w => (
                            <div
                              key={w.id}
                              className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                                  {formatPhone(w.phoneNumber)}
                                </span>
                                {w.carrier && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    {w.carrier.name}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                                  {formatCurrency(w.amount)}
                                </span>
                                <button
                                  onClick={() => handleQuickRecharge(client, w)}
                                  className="btn-interactive p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  title="شحن رصيد إضافي لهذا الرقم"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Amount before commission (المبلغ قبل العمولة) */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-base font-black text-blue-700 dark:text-blue-300" dir="ltr">
                        {formatCurrency(baseAmount)}
                      </td>

                      {/* Commission Settings (نسبة ونوع العمولة) */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Mode Toggle Button: إضافة (+) أو خصم (-) */}
                          <button
                            type="button"
                            onClick={() => handleToggleCommissionMode(client, commissionMode)}
                            className={`btn-interactive px-2 py-1 rounded-lg text-xs font-black transition-all shadow-xs ${
                              commissionMode === 'add'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            }`}
                            title="اضغط للتبديل بين إضافة أو خصم العمولة"
                          >
                            {commissionMode === 'add' ? 'إضافة (+)' : 'خصم (-)'}
                          </button>

                          {/* Percentage Input */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={commissionPercent}
                              onChange={(e) => handleChangeCommissionPercent(client, e.target.value)}
                              className="w-12 px-1.5 py-0.5 text-xs font-black text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              title="نسبة العمولة المئوية"
                            />
                            <span className="text-xs font-black text-slate-400">%</span>
                          </div>

                          {/* Calculated Commission Value */}
                          {commissionAmount > 0 && (
                            <span className={`text-[11px] font-black font-mono ${
                              commissionMode === 'add'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-rose-700 dark:text-rose-400'
                            }`} dir="ltr">
                              ({commissionMode === 'add' ? '+' : '-'}{formatCurrency(commissionAmount)})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount after commission (الآجل المستحق النهائي) */}
                      <td className="py-3.5 px-4 whitespace-nowrap bg-emerald-50/40 dark:bg-emerald-950/20">
                        <div className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                          {formatCurrency(finalAmount)}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {commissionMode === 'add' ? 'إجمالي بعد إضافة العمولة' : 'صافي بعد خصم العمولة'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Statement Details */}
                          <button
                            onClick={() => setSelectedClientForStatement(item)}
                            className="btn-interactive p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                            title="عرض كشف الحساب التفصيلي للشحنات"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Copy WhatsApp Statement */}
                          <button
                            onClick={() => handleCopyWhatsAppMessage(item)}
                            className="btn-interactive p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400"
                            title="نسخ ملخص الحساب لإرساله عبر واتساب"
                          >
                            {copiedClientId === client.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>

              {/* Exact Styled Footer Summary */}
              <tfoot>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-black">
                  <td className="py-3.5 px-4 text-center text-xs">∑</td>
                  <td className="py-3.5 px-4 text-sm font-black text-slate-900 dark:text-white">
                    الإجمالي العام ({filteredAccounts.length} عميل)
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {summaryTotals.totalWalletsCount} خط مسجل
                  </td>
                  <td className="py-3.5 px-4 font-mono text-lg text-blue-700 dark:text-blue-300" dir="ltr">
                    {formatCurrency(summaryTotals.totalBase)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-sm text-slate-700 dark:text-slate-300" dir="ltr">
                    {summaryTotals.totalCommission >= 0 ? '+' : ''}{formatCurrency(summaryTotals.totalCommission)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xl text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/30" dir="ltr">
                    {formatCurrency(summaryTotals.totalFinal)}
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs text-slate-400">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

      </div>

      {/* 5. MODAL: Detailed Account Statement for Single Client (كشف حساب تفصيلي) */}
      {selectedClientForStatement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    كشف حساب العميل: {selectedClientForStatement.client.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تفاصيل شحنات الرصيد الآجلة وحساب العمولات
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedClientForStatement(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary Strip */}
            <div className="grid grid-cols-3 gap-2 text-center shrink-0">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 block mb-0.5">قبل العمولة</span>
                <strong className="font-mono text-base text-blue-600 dark:text-blue-400">
                  {formatCurrency(selectedClientForStatement.baseAmount)}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 block mb-0.5">
                  العمولة ({selectedClientForStatement.commissionPercent}% {selectedClientForStatement.commissionMode === 'add' ? 'إضافة' : 'خصم'})
                </span>
                <strong className="font-mono text-base text-amber-600 dark:text-amber-400">
                  {selectedClientForStatement.commissionMode === 'add' ? '+' : '-'}{formatCurrency(selectedClientForStatement.commissionAmount)}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block mb-0.5">الآجل المستحق النهائي</span>
                <strong className="font-mono text-base text-emerald-700 dark:text-emerald-300 font-black">
                  {formatCurrency(selectedClientForStatement.finalAmount)}
                </strong>
              </div>
            </div>

            {/* Transactions List */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-2 max-h-72">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>سجل عمليات الشحن المسجلة ({selectedClientForStatement.transactions.length} عملية):</span>
                <span>فترة: {timeRange === 'today' ? 'اليوم' : timeRange === 'month' ? 'هذا الشهر' : 'الكل'}</span>
              </div>

              {selectedClientForStatement.transactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                  لا توجد عمليات شحن مسجلة لهذا العميل في الفترة المحددة.
                </div>
              ) : (
                selectedClientForStatement.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        + {formatCurrency(tx.amount)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span dir="ltr" className="font-mono font-bold">{formatPhone(tx.walletPhone)}</span>
                        <span>•</span>
                        <span>{tx.notes || 'شحن رصيد'}</span>
                      </div>
                    </div>

                    <div className="text-left text-[11px] text-slate-400">
                      <div>{formatDateArabic(tx.date)}</div>
                      <div className="text-[10px]">{formatTimeArabic(tx.date)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleCopyWhatsAppMessage(selectedClientForStatement)}
                className="btn-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>نسخ ملخص المطالبة للواتساب</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedClientForStatement(null)}
                className="btn-interactive px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
