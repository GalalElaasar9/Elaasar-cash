import React, { useState, useMemo, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  formatPhone, 
  formatTimeArabic, 
  formatDateArabic,
  formatDateTimeArabic,
  getTodayString,
  getLocalDateString
} from '../utils/formatters';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Download, 
  Printer, 
  Trash2, 
  Receipt, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Clock, 
  DollarSign, 
  Percent, 
  Copy, 
  Check, 
  CheckCircle2, 
  TrendingDown, 
  PhoneCall, 
  FileSpreadsheet, 
  ArrowDownToLine, 
  ExternalLink, 
  Moon, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  ShoppingBag, 
  Smartphone,
  Coins,
  Building2,
  Wallet,
  Sun,
  History,
  Eye,
  RefreshCw,
  FileCheck,
  TrendingUp,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

const STORAGE_KEY_ITEMS = 'elaasar_cash_inbound_items_v2';
const STORAGE_KEY_CONFIG = 'elaasar_cash_inbound_config_v2';
const STORAGE_KEY_SHIFT = 'elaasar_cash_inbound_shift_session_v2';
const STORAGE_KEY_ARCHIVE = 'elaasar_cash_inbound_days_archive_v2';

export default function DailyLogView({ onNavigateToInbound }) {
  const { 
    transactions, 
    purchases = [],
    treasury = {},
    selectedDate, 
    setSelectedDate, 
    deleteTransaction, 
    deletePurchase,
    setActiveModal, 
    setModalData,
    showToast,
    askConfirm,
    dailyOpeningBalances = [],
    dailyAudits = [],
    getOpeningBalanceForDate,
    getClosingAuditForDate
  } = useCash();

  const [searchDaily, setSearchDaily] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [activeDailyStream, setActiveDailyStream] = useState('timeline'); // 'timeline', 'transfers', 'collections', 'purchases', 'sales', 'inbound', 'treasury', 'audit'

  // Inbound Shift Section States
  const [inboundRefreshKey, setInboundRefreshKey] = useState(0);
  const [isInboundSectionOpen, setIsInboundSectionOpen] = useState(true);
  const [expandedShiftIds, setExpandedShiftIds] = useState({});
  const [inboundItemSearch, setInboundItemSearch] = useState({});

  // Auto-refresh inbound data when changes occur in InboundCalculatorView
  useEffect(() => {
    const handleStorageChange = () => setInboundRefreshKey(k => k + 1);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const todayStr = getTodayString();
  const isToday = selectedDate === todayStr;

  // Quick date change helpers
  const handleShiftDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const setPresetDay = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // 1. Transactions for the selected date
  const dayTransactions = useMemo(() => {
    return transactions.filter(t => t.dateOnly === selectedDate);
  }, [transactions, selectedDate]);

  // 2. Opening Balance for the selected date
  const dayOpening = useMemo(() => {
    return getOpeningBalanceForDate ? getOpeningBalanceForDate(selectedDate) : null;
  }, [selectedDate, getOpeningBalanceForDate, dailyOpeningBalances, dailyAudits]);

  // 3. Closing Audit for the selected date
  const dayAudit = useMemo(() => {
    return getClosingAuditForDate ? getClosingAuditForDate(selectedDate) : null;
  }, [selectedDate, getClosingAuditForDate, dailyAudits]);

  // Normalized audit fields (supports both current audit schema and legacy fields)
  const auditDiff = Number(dayAudit?.variances?.totalLiquidCash ?? dayAudit?.difference ?? 0);
  const auditActualTotal = Number(dayAudit?.actualBalances?.totalLiquidCash ?? dayAudit?.actualTotal ?? 0);
  const auditClosedAt = dayAudit?.closedAt || dayAudit?.createdAt || dayAudit?.date;

  // 4. Purchases for the selected date
  const dayPurchases = useMemo(() => {
    return (purchases || []).filter(p => {
      const pDateOnly = p.dateOnly || (p.date ? getLocalDateString(p.date) : '');
      return pDateOnly === selectedDate;
    });
  }, [purchases, selectedDate]);

  // 5. Treasury Movements for the selected date
  const dayTreasuryMovements = useMemo(() => {
    return (treasury?.history || []).filter(h => {
      const hDateOnly = h.date ? getLocalDateString(h.date) : '';
      return hDateOnly === selectedDate;
    });
  }, [treasury, selectedDate]);

  // Split transaction categories
  const dayTransferTxs = useMemo(() => dayTransactions.filter(t => t.type === 'transfer_out'), [dayTransactions]);
  const dayRechargeTxs = useMemo(() => dayTransactions.filter(t => t.type === 'recharge' || t.type === 'limit_reset'), [dayTransactions]);
  const dayPaymentTxs = useMemo(() => dayTransactions.filter(t => t.type === 'client_payment'), [dayTransactions]);
  const daySalesTxs = useMemo(() => dayTransactions.filter(t => t.type === 'product_sale'), [dayTransactions]);

  // Financial Totals
  const dayTotalTransfers = dayTransferTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dayTotalRecharges = dayRechargeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dayTotalCollections = dayPaymentTxs.filter(t => !t.isCreditorPayout).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dayTotalCreditorPayouts = dayPaymentTxs.filter(t => t.isCreditorPayout).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dayTotalSalesAmount = daySalesTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dayTotalFees = dayTransactions.reduce((sum, t) => sum + (Number(t.fee) || 0), 0);
  const dayTotalPurchasesPaid = dayPurchases.reduce((sum, p) => sum + (Number(p.paidAmount ?? p.totalAmount) || 0), 0);

  // Inflow = Client debt collections + Direct device sales + Line recharges
  const dayTotalInflow = dayTotalCollections + dayTotalSalesAmount + dayTotalRecharges;

  // Outflow = Outgoing transfers + Purchases paid + Creditor payouts
  const dayTotalOutflow = dayTotalTransfers + dayTotalPurchasesPaid + dayTotalCreditorPayouts;

  // Net Day Flow
  const dayNetFlow = dayTotalInflow - dayTotalOutflow;

  // Theoretical Closing Capital
  const theoreticalClosing = (dayOpening?.totalOpeningCash || 0) + dayNetFlow;

  // Unified Timeline (All events sorted descending by timestamp)
  const unifiedTimelineItems = useMemo(() => {
    const list = [];

    // Transactions
    dayTransactions.forEach(t => {
      const isSale = t.type === 'product_sale';
      const isPayment = t.type === 'client_payment';
      const isRecharge = t.type === 'recharge' || t.type === 'limit_reset';

      list.push({
        id: `tx-${t.id}`,
        timestamp: new Date(t.date || t.timestamp || Date.now()).getTime(),
        dateStr: t.date,
        stream: isSale ? 'sales' : isPayment ? 'collections' : 'transfers',
        title: isSale 
          ? `مبيعات أجهزة: ${t.productName || 'جهاز / إكسسوار'}`
          : isPayment
          ? (t.isCreditorPayout ? `صرف لمستحق دائن: ${t.customerName}` : `سداد من العميل: ${t.customerName}`)
          : isRecharge
          ? `شحن خط/محفظة: ${t.walletPhone}`
          : `تحويل كاش: إلى ${t.recipientPhone || t.customerName}`,
        party: isSale ? (t.customerName || 'عميل نقدي') : t.customerName,
        phone: t.walletPhone || t.recipientPhone,
        amount: Number(t.amount) || 0,
        isInflow: isPayment ? !t.isCreditorPayout : isSale || isRecharge,
        fee: t.fee || 0,
        notes: t.notes || '',
        code: t.transactionCode,
        raw: t
      });
    });

    // Purchases
    dayPurchases.forEach(p => {
      list.push({
        id: `pur-${p.id}`,
        timestamp: new Date(p.date || Date.now()).getTime(),
        dateStr: p.date,
        stream: 'purchases',
        title: `فاتورة مشتريات: ${p.supplierName} (${p.categoryLabel || p.category})`,
        party: p.supplierName,
        amount: Number(p.paidAmount ?? p.totalAmount) || 0,
        isInflow: false,
        fee: 0,
        notes: p.notes || `فاتورة #${p.invoiceNumber || '—'} • مدفوع: ${Number(p.paidAmount ?? p.totalAmount).toLocaleString()} ج.م من أصل ${Number(p.totalAmount).toLocaleString()} ج.م`,
        raw: p
      });
    });

    // Treasury movements
    dayTreasuryMovements.forEach(h => {
      list.push({
        id: `tr-${h.id}`,
        timestamp: new Date(h.date || Date.now()).getTime(),
        dateStr: h.date,
        stream: 'treasury',
        title: h.description || `حركة خزينة: ${h.type}`,
        party: h.performedBy || 'المسؤول',
        amount: Number(h.amount) || 0,
        isInflow: h.type === 'deposit',
        fee: 0,
        notes: h.account ? `الحساب: ${h.account}` : '',
        raw: h
      });
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [dayTransactions, dayPurchases, dayTreasuryMovements]);

  // Filtered timeline by search
  const filteredTimelineItems = useMemo(() => {
    if (!searchDaily.trim()) return unifiedTimelineItems;
    const q = searchDaily.toLowerCase().trim();
    return unifiedTimelineItems.filter(item => 
      item.title?.toLowerCase().includes(q) ||
      item.party?.toLowerCase().includes(q) ||
      item.phone?.includes(q) ||
      item.code?.toLowerCase().includes(q) ||
      item.notes?.toLowerCase().includes(q)
    );
  }, [unifiedTimelineItems, searchDaily]);

  // Pagination for timeline & transfers
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDaily, selectedDate, activeDailyStream]);

  const totalPages = Math.ceil(filteredTimelineItems.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedTimeline = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredTimelineItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTimelineItems, safeCurrentPage]);

  // Copy helper
  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`تم نسخ: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrintReceipt = (tx) => {
    setModalData(tx);
    setActiveModal('receipt');
  };

  const handleDeleteTx = async (tx) => {
    const isSale = tx.type === 'product_sale';
    const isPayment = tx.type === 'client_payment';
    const confirmed = await askConfirm({
      title: isSale ? 'حذف عملية بيع جهاز' : isPayment ? 'حذف حركة سداد' : 'حذف عملية تحويل',
      message: `هل أنت متأكد من حذف هذه العملية بقيمة ${formatCurrency(tx.amount)}؟`,
      details: isSale 
        ? `سيتم إلغاء قيد المعاملة فوراً وإعادة (${tx.quantity || 1}) قطعة إلى مخزون "${tx.productName || 'المنتج'}" بالمحل.`
        : isPayment
        ? 'سيتم إلغاء حركة السداد من السجل.'
        : 'سيتم إلغاء قيد المعاملة فوراً وإعادة كامل المبلغ المخصوم إلى رصيد ليميت المحفظة.',
      type: 'warning',
      confirmText: 'نعم، احذف المعاملة',
      cancelText: 'تراجع'
    });
    if (confirmed) {
      deleteTransaction(tx.id);
    }
  };

  const handleDeletePurchaseItem = async (p) => {
    const confirmed = await askConfirm({
      title: 'حذف فاتورة مشتريات',
      message: `هل أنت متأكد من حذف فاتورة "${p.supplierName}" بقيمة ${formatCurrency(p.totalAmount)}؟`,
      details: 'سيتم حذف الفاتورة وعكس تأثيرها المالي على الخزينة وحساب المورد.',
      type: 'warning',
      confirmText: 'نعم، احذف الفاتورة',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      deletePurchase(p.id);
    }
  };

  // Export Day to CSV with UTF-8 BOM for Arabic in Excel
  const handleExportCSV = () => {
    if (unifiedTimelineItems.length === 0) {
      showToast('لا توجد عمليات لتصديرها في هذا اليوم', 'info');
      return;
    }

    const headers = ['التوقيت', 'القسم / البند', 'البيان', 'الطرف المعني / العميل', 'الداخل (ج.م)', 'الخارج (ج.م)', 'الرسوم', 'الملاحظات'];
    const rows = unifiedTimelineItems.map(item => [
      `"${item.dateStr ? formatTimeArabic(item.dateStr) : '—'}"`,
      `"${item.stream}"`,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${(item.party || '').replace(/"/g, '""')}"`,
      item.isInflow ? item.amount : 0,
      !item.isInflow ? item.amount : 0,
      item.fee || 0,
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `دفتر-اليومية-الشامل-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير شيت اليومية الشامل بنجاح');
  };

  // Closed/Ended shifts matching the selected date
  const dayInboundShifts = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ARCHIVE);
      if (!saved) return [];
      const all = JSON.parse(saved);
      if (!Array.isArray(all)) return [];
      return all.filter(s => {
        if (!s) return false;
        if (s.businessDate === selectedDate) return true;
        if (s.closedAt && typeof s.closedAt === 'string' && s.closedAt.startsWith(selectedDate)) return true;
        return false;
      });
    } catch {
      return [];
    }
  }, [selectedDate, inboundRefreshKey]);

  // Active inbound shift
  const activeInboundShift = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHIFT);
      if (!saved) return null;
      const shift = JSON.parse(saved);
      if (shift && shift.isActive && shift.businessDate === selectedDate) {
        const itemsSaved = localStorage.getItem(STORAGE_KEY_ITEMS);
        const items = itemsSaved ? JSON.parse(itemsSaved) : [];
        const configSaved = localStorage.getItem(STORAGE_KEY_CONFIG);
        const config = configSaved ? JSON.parse(configSaved) : {};

        const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
        const rate = Number(config.commissionRate) || 0;
        let commVal = 0;
        if (config.commissionType === 'percentage') {
          commVal = (total * rate) / 100;
        } else if (config.commissionType === 'perThousand') {
          commVal = (total / 1000) * rate;
        } else {
          commVal = rate;
        }
        const net = config.commissionMode === 'add' ? total + commVal : total - commVal;
        return {
          ...shift,
          items,
          totalAmount: total,
          commissionRate: rate,
          commissionType: config.commissionType || 'percentage',
          commissionMode: config.commissionMode || 'deduct',
          commissionValue: commVal,
          amountAfterCommission: net,
          targetAmount: config.targetAmount || 0,
          difference: config.targetAmount ? config.targetAmount - net : 0,
          itemsCount: items.length
        };
      }
      return null;
    } catch {
      return null;
    }
  }, [selectedDate, inboundRefreshKey]);

  const toggleShiftItems = (shiftId) => {
    setExpandedShiftIds(prev => ({
      ...prev,
      [shiftId]: prev[shiftId] === undefined ? false : !prev[shiftId]
    }));
  };

  const handleExportInboundShift = (shift) => {
    if (!shift || !shift.items || shift.items.length === 0) {
      showToast('لا توجد بنود لتصديرها في هذه الوردية', 'info');
      return;
    }

    const headers = ['م', 'المبلغ الوارد (ج.م)', 'البيان والملاحظة', 'التوقيت'];
    const rows = shift.items.map((item, idx) => [
      idx + 1,
      item.amount,
      `"${(item.label || 'وارد بدون بيان').replace(/"/g, '""')}"`,
      `"${item.date ? formatDateTimeArabic(item.date) : ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير-الوارد-له-${selectedDate}-${shift.id || 'shift'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير تقرير وردية الوارد له بنجاح');
  };

  return (
    <div className="space-y-6">
      
      {/* =========================================================================
          1. Master Date Controller & Quick Actions Bar
      ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Top Header: Title, Date Label & Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-600/25">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                  دفتر اليومية الشامل • {formatDateArabic(selectedDate)}
                </h2>
                {isToday ? (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>اليوم الحالي</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    أرشيف محفوظات تاريخ ({selectedDate})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                سجل متكامل يجمع رأس المال الافتتاحي، تحويلات الكاش، سدادات العملاء، المشتريات، مبيعات الأجهزة، وجرد الإقفال
              </p>
            </div>
          </div>

          {/* Quick Master Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveModal('recordOpeningCapital')}
              className="btn-interactive flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black shadow-md shadow-amber-500/25 transition-all"
              title="تسجيل وتثبيت رصيد بداية اليومية والافتتاح"
            >
              <Sun className="w-4 h-4 text-amber-200" />
              <span>{dayOpening ? 'تعديل رصيد البداية' : '☀️ تسجيل رصيد بداية اليومية'}</span>
            </button>

            <button
              onClick={() => setActiveModal('dailyAudit')}
              className="btn-interactive flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-purple-600/25 transition-all"
              title="جرد وإقفال اليومية ومطابقة العجز أو الزيادة"
            >
              <Moon className="w-4 h-4 text-purple-200" />
              <span>{dayAudit ? 'عرض/تعديل الجرد' : '🌙 جرد وإقفال اليومية'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="btn-interactive flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs"
              title="تصدير شيت إكسل لعمليات هذا اليوم"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>إكسل</span>
            </button>

            <button
              onClick={() => window.print()}
              className="btn-interactive flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs"
              title="طباعة تقرير اليوم الشامل"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>طباعة</span>
            </button>
          </div>
        </div>

        {/* Date Stepper & Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Stepper with date input */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShiftDate(-1)}
              className="btn-interactive flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-2xs"
              title="اليوم السابق"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden sm:inline">اليوم السابق</span>
            </button>

            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-3 pr-9 py-2 text-xs sm:text-sm font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-500/40 cursor-pointer shadow-2xs"
              />
              <CalendarIcon className="w-4 h-4 text-red-600 dark:text-red-400 absolute right-3 pointer-events-none" />
            </div>

            <button
              onClick={() => handleShiftDate(1)}
              className="btn-interactive flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-2xs"
              title="اليوم التالي"
            >
              <span className="hidden sm:inline">اليوم التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
            <button
              onClick={() => setPresetDay(0)}
              className={`btn-interactive px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isToday
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setPresetDay(1)}
              className={`btn-interactive px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedDate === (() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  return getLocalDateString(d);
                })()
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              أمس
            </button>
            <button
              onClick={() => setPresetDay(2)}
              className={`btn-interactive px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                selectedDate === (() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 2);
                  return getLocalDateString(d);
                })()
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              أول أمس
            </button>
          </div>

        </div>

      </div>

      {/* =========================================================================
          2. Master Financial Position Cards (شريط اليومية المالي الشامل)
      ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Opening Capital (رصيد بداية اليومية والافتتاح) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-amber-200/80 dark:border-amber-900/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>رصيد بداية اليومية (الافتتاح)</span>
            </span>
            {dayOpening ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {dayOpening.isDerivedFromAudit ? 'منقول من أمس' : 'مثبت ومعتمد'}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                لم يسجل بعد
              </span>
            )}
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {dayOpening ? formatCurrency(dayOpening.totalOpeningCash) : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-1 font-mono">
              {dayOpening ? (
                <>
                  <span>درج: {Number(dayOpening.drawerCash || 0).toLocaleString()}</span>
                  <span>•</span>
                  <span>VF: {Number(dayOpening.vodafoneCash || 0).toLocaleString()}</span>
                  <span>•</span>
                  <span>IP: {Number(dayOpening.instapay || 0).toLocaleString()}</span>
                </>
              ) : (
                <span>اضغط بالزر بالأسفل لتثبيت رأس مال هذا اليوم</span>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setActiveModal('recordOpeningCapital')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1"
            >
              <span>{dayOpening ? 'تعديل الافتتاح' : 'تسجيل الافتتاح الآن'}</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
            {dayOpening?.recordedBy && (
              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                بواسطة: {dayOpening.recordedBy.split(' ')[0]}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Cash Inflow (إجمالي الداخل اليوم) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-emerald-200/80 dark:border-emerald-900/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
              <span>إجمالي الداخل لليومية (Inflow)</span>
            </span>
            <span className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              + {formatCurrency(dayTotalInflow)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-1 font-mono">
              <span>سدادات: {dayTotalCollections.toLocaleString()}</span>
              <span>•</span>
              <span>مبيعات: {dayTotalSalesAmount.toLocaleString()}</span>
              <span>•</span>
              <span>شحن: {dayTotalRecharges.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>عمولات محققة:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              +{formatCurrency(dayTotalFees)}
            </span>
          </div>
        </div>

        {/* Card 3: Cash Outflow (إجمالي الخارج اليوم) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-rose-200/80 dark:border-rose-900/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
              <span>إجمالي الخارج من اليومية (Outflow)</span>
            </span>
            <span className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <TrendingDown className="w-3.5 h-3.5" />
            </span>
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              - {formatCurrency(dayTotalOutflow)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-1 font-mono">
              <span>تحويلات: {dayTotalTransfers.toLocaleString()}</span>
              <span>•</span>
              <span>مشتريات: {dayTotalPurchasesPaid.toLocaleString()}</span>
              {dayTotalCreditorPayouts > 0 && <span>• دائن: {dayTotalCreditorPayouts.toLocaleString()}</span>}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>صافي التدفق اليومي:</span>
            <span className={`font-black font-mono ${dayNetFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {dayNetFlow >= 0 ? `+${formatCurrency(dayNetFlow)}` : formatCurrency(dayNetFlow)}
            </span>
          </div>
        </div>

        {/* Card 4: Closing Balance / Daily Audit (رصيد نهاية اليوم وجرد اليومية) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-purple-200/80 dark:border-purple-900/40 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-purple-500" />
              <span>جرد وإقفال نهاية اليومية</span>
            </span>
            {dayAudit ? (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                auditDiff === 0 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : auditDiff > 0
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              }`}>
                {auditDiff === 0 ? 'مطابق تماماً 🟢' : auditDiff > 0 ? `فائض: +${auditDiff.toLocaleString()}` : `عجز: ${auditDiff.toLocaleString()}`}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                تقدير دفتري
              </span>
            )}
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {formatCurrency(dayAudit ? auditActualTotal : theoreticalClosing)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              {dayAudit 
                ? `جرد فعلي معتمد • القائم بالجرد: ${dayAudit.auditorName || 'المسؤول'}`
                : `المتوقع دفترياً (بداية + داخل - خارج)`}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => {
                if (dayAudit) {
                  setModalData({ audit: dayAudit });
                  setActiveModal('auditDetails');
                } else {
                  setActiveModal('dailyAudit');
                }
              }}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1"
            >
              <span>{dayAudit ? 'عرض تقرير الجرد التفصيلي' : 'إجراء جرد الآن'}</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-slate-400">
              {dayAudit ? 'معتمد' : 'لم يقفل بعد'}
            </span>
          </div>
        </div>

      </div>

      {/* =========================================================================
          3. Daily Journal Streams Selector (أقسام دفتر اليومية)
      ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveDailyStream('timeline')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeDailyStream === 'timeline'
              ? 'bg-slate-900 text-white dark:bg-red-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>🕒 شريط الوقت الموحد</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {unifiedTimelineItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveDailyStream('transfers')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeDailyStream === 'transfers'
              ? 'bg-slate-900 text-white dark:bg-red-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Send className="w-4 h-4 rotate-180" />
          <span>💸 تحويلات الكاش</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {dayTransferTxs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveDailyStream('collections')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeDailyStream === 'collections'
              ? 'bg-slate-900 text-white dark:bg-red-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Coins className="w-4 h-4 text-emerald-400" />
          <span>👥 تحصيلات وسدادات العملاء</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {dayPaymentTxs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveDailyStream('purchases')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeDailyStream === 'purchases'
              ? 'bg-slate-900 text-white dark:bg-red-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-amber-400" />
          <span>🛒 المشتريات ومصروفات المحل</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {dayPurchases.length}
          </span>
        </button>

        <button
          onClick={() => setActiveDailyStream('sales')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeDailyStream === 'sales'
              ? 'bg-slate-900 text-white dark:bg-red-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4 text-purple-400" />
          <span>📱 مبيعات الأجهزة والمخزون</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {daySalesTxs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveDailyStream('inbound')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeDailyStream === 'inbound'
              ? 'bg-slate-900 text-white dark:bg-red-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4 text-blue-400" />
          <span>📥 ورديات الوارد والعمولة (له)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {dayInboundShifts.length + (activeInboundShift ? 1 : 0)}
          </span>
        </button>

        <button
          onClick={() => setActiveDailyStream('treasury')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeDailyStream === 'treasury'
              ? 'bg-slate-900 text-white dark:bg-red-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-teal-400" />
          <span>🏦 حركات الخزينة ورأس المال</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/20">
            {dayTreasuryMovements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveDailyStream('audit')}
          className={`btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
            activeDailyStream === 'audit'
              ? 'bg-slate-900 text-white dark:bg-red-600 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4 text-purple-400" />
          <span>📋 جرد وإقفال اليومية</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${dayAudit ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
            {dayAudit ? 'معتمد' : 'معلق'}
          </span>
        </button>
      </div>

      {/* Search within Day */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="بحث شامل في أحداث هذا اليوم (بالعميل، المورد، رقم التليفون، الصنف، كود العملية، الملاحظات)..."
          value={searchDaily}
          onChange={(e) => setSearchDaily(e.target.value)}
          className="w-full pl-4 pr-10 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/40 shadow-xs"
        />
        {searchDaily && (
          <button
            onClick={() => setSearchDaily('')}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          >
            مسح
          </button>
        )}
      </div>

      {/* =========================================================================
          4. Stream Content Presentation
      ========================================================================= */}

      {/* STREAM A: UNIFIED TIMELINE (شريط الوقت الموحد) */}
      {activeDailyStream === 'timeline' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-red-600" />
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                شريط الوقت الموحد لكل حركات وأحداث اليوم ({filteredTimelineItems.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              تسلسل زمني لحظي بالدقائق والثواني
            </span>
          </div>

          {filteredTimelineItems.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                لا توجد حركات مسجلة في هذا اليوم
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                {searchDaily ? 'لا توجد نتائج تطابق نص البحث.' : 'ابدأ اليوم بإجراء تحويل أو تسجيل مشتريات أو تحصيل.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedTimeline.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                      item.stream === 'purchases'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
                        : item.stream === 'sales'
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600'
                        : item.stream === 'collections'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                        : item.stream === 'treasury'
                        ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-600'
                        : 'bg-red-100 dark:bg-red-950/60 text-red-600'
                    }`}>
                      {item.stream === 'purchases' ? (
                        <ShoppingBag className="w-5 h-5" />
                      ) : item.stream === 'sales' ? (
                        <Smartphone className="w-5 h-5" />
                      ) : item.stream === 'collections' ? (
                        <Coins className="w-5 h-5" />
                      ) : item.stream === 'treasury' ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <Send className="w-5 h-5 rotate-180" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.isInflow 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {item.isInflow ? 'داخل للمحل (+)' : 'خارج من المحل (-)'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                        <span>{item.dateStr ? formatTimeArabic(item.dateStr) : '—'}</span>
                        {item.party && <span>• {item.party}</span>}
                        {item.phone && <span className="font-mono" dir="ltr">{formatPhone(item.phone)}</span>}
                        {item.notes && <span className="italic text-slate-400">({item.notes})</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <div className={`text-base sm:text-lg font-black font-mono ${
                        item.isInflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {item.isInflow ? '+' : '-'} {formatCurrency(item.amount)}
                      </div>
                      {item.fee > 0 && (
                        <div className="text-[10px] text-emerald-600 font-bold">
                          عمولة: +{formatCurrency(item.fee)}
                        </div>
                      )}
                    </div>

                    {item.raw && item.stream === 'transfers' && (
                      <button
                        onClick={() => handlePrintReceipt(item.raw)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="طباعة إيصال"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timeline Pagination */}
          {filteredTimelineItems.length > ITEMS_PER_PAGE && (
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                عرض {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(filteredTimelineItems.length, safeCurrentPage * ITEMS_PER_PAGE)} من إجمالي {filteredTimelineItems.length} حركة
              </div>
              <div className="flex items-center gap-1.5" dir="rtl">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="btn-interactive flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
                <span className="text-xs font-mono font-bold px-2">
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="btn-interactive flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STREAM B: TRANSFERS (تحويلات الكاش) */}
      {activeDailyStream === 'transfers' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-red-600 rotate-180" />
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                سجل تحويلات الكاش التفصيلي ({dayTransferTxs.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-rose-600 font-mono">
              إجمالي التحويل: {formatCurrency(dayTotalTransfers)}
            </span>
          </div>

          {dayTransferTxs.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Send className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3 rotate-180" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
                لا توجد تحويلات كاش مسجلة في هذا اليوم
              </h4>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">التوقيت</th>
                    <th className="py-3 px-4">العميل والمحفظة الراسلة</th>
                    <th className="py-3 px-4">المبلغ المخصوم</th>
                    <th className="py-3 px-4">المحول إليه</th>
                    <th className="py-3 px-4">الليميت المتبقي</th>
                    <th className="py-3 px-4">كود العملية</th>
                    <th className="py-3 px-4">العمولة</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dayTransferTxs.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-xs">{formatTimeArabic(tx.date)}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold block text-slate-900 dark:text-white">{tx.customerName}</span>
                        <span className="text-xs font-mono text-slate-400" dir="ltr">{formatPhone(tx.walletPhone)}</span>
                      </td>
                      <td className="py-3 px-4 font-black font-mono text-rose-600 text-sm">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs" dir="ltr">
                        {formatPhone(tx.recipientPhone) || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {tx.limitAfter !== undefined ? formatCurrency(tx.limitAfter) : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        {tx.transactionCode || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-emerald-600 font-bold">
                        +{formatCurrency(tx.fee || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handlePrintReceipt(tx)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="إيصال"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTx(tx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STREAM C: PURCHASES (المشتريات ومصروفات المحل) */}
      {activeDailyStream === 'purchases' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                فواتير المشتريات ومصروفات المحل في هذا اليوم ({dayPurchases.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveModal('addPurchase')}
              className="btn-interactive flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs"
            >
              <span>+ إضافة فاتورة</span>
            </button>
          </div>

          {dayPurchases.length === 0 ? (
            <div className="py-16 text-center px-4">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
                لا توجد مشتريات أو مصروفات مسجلة في هذا اليوم
              </h4>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">رقم الفاتورة</th>
                    <th className="py-3 px-4">المورد / الجهة</th>
                    <th className="py-3 px-4">التصنيف</th>
                    <th className="py-3 px-4">إجمالي الفاتورة</th>
                    <th className="py-3 px-4">المدفوع نقداً</th>
                    <th className="py-3 px-4">المتبقي (آجل)</th>
                    <th className="py-3 px-4">طريقة الدفع</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dayPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-xs">{p.invoiceNumber || '—'}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{p.supplierName}</td>
                      <td className="py-3 px-4 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.categoryLabel || p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white">
                        {formatCurrency(p.totalAmount)}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-rose-600">
                        {formatCurrency(p.paidAmount ?? p.totalAmount)}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-amber-600 font-bold">
                        {p.remainingDebt > 0 ? formatCurrency(p.remainingDebt) : 'مسددة'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {p.paymentMethodLabel || p.paymentMethod || 'كاش الدرج'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeletePurchaseItem(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STREAM D: COLLECTIONS (تحصيلات وسدادات العملاء) */}
      {activeDailyStream === 'collections' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-500" />
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                سدادات وتحصيلات العملاء في هذا اليوم ({dayPaymentTxs.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-600 font-mono">
              إجمالي التحصيل: +{formatCurrency(dayTotalCollections)}
            </span>
          </div>

          {dayPaymentTxs.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Coins className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
                لا توجد سدادات أو تحصيلات مسجلة في هذا اليوم
              </h4>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">التوقيت</th>
                    <th className="py-3 px-4">العميل</th>
                    <th className="py-3 px-4">نوع الحركة</th>
                    <th className="py-3 px-4">المبلغ</th>
                    <th className="py-3 px-4">طريقة التحصيل / المحفظة</th>
                    <th className="py-3 px-4">الملاحظات</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dayPaymentTxs.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-xs">{formatTimeArabic(t.date)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.customerName}</td>
                      <td className="py-3 px-4 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                          t.isCreditorPayout 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}>
                          {t.isCreditorPayout ? 'صرف لمستحق دائن' : 'سداد دين عميل'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-sm text-emerald-600">
                        {t.isCreditorPayout ? '- ' : '+ '}{formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">
                        {t.paymentSourceLabel || t.walletPhone || 'كاش بالدرج'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">{t.notes || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteTx(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STREAM E: SALES (مبيعات الأجهزة والمخزون) */}
      {activeDailyStream === 'sales' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                مبيعات الهواتف والإكسسوارات في هذا اليوم ({daySalesTxs.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-purple-600 font-mono">
              إجمالي المبيعات: {formatCurrency(dayTotalSalesAmount)}
            </span>
          </div>

          {daySalesTxs.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Smartphone className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
                لا توجد مبيعات أجهزة أو إكسسوارات مسجلة في هذا اليوم
              </h4>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">التوقيت</th>
                    <th className="py-3 px-4">المنتج / الجهاز</th>
                    <th className="py-3 px-4">اللون / الفئة</th>
                    <th className="py-3 px-4">الكمية</th>
                    <th className="py-3 px-4">سعر البيع الإجمالي</th>
                    <th className="py-3 px-4">المشتري / العميل</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {daySalesTxs.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-xs">{formatTimeArabic(t.date)}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.productName}</td>
                      <td className="py-3 px-4 text-xs font-mono">{t.variantColor || '—'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-xs">{t.quantity || 1}</td>
                      <td className="py-3 px-4 font-mono font-black text-purple-600 text-sm">
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {t.customerName || 'عميل نقدي'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteTx(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STREAM F: INBOUND SHIFTS (ورديات الوارد والعمولة له) */}
      {activeDailyStream === 'inbound' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-blue-600" />
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                تقرير ورديات الوارد (له) المقفلة والجارية لهذا اليوم
              </h3>
            </div>
            {onNavigateToInbound && (
              <button
                onClick={onNavigateToInbound}
                className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 text-xs font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>حاسبة الوارد له</span>
              </button>
            )}
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {dayInboundShifts.length === 0 && !activeInboundShift ? (
              <div className="py-12 text-center text-slate-400">
                <ArrowDownToLine className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-bold">لا توجد ورديات وارد مقفلة مسجلة في هذا اليوم</p>
              </div>
            ) : (
              dayInboundShifts.map((shift, idx) => (
                <div key={shift.id || idx} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        وردية #{idx + 1} • {shift.startedAtTimeStr || '—'} إلى {shift.endedAtTimeStr || '—'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {shift.items?.length || 0} عملية مسجلة
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-slate-400">الصافي بعد العمولة</div>
                        <div className="text-base font-black text-emerald-600 font-mono">
                          {formatCurrency(shift.amountAfterCommission)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleExportInboundShift(shift)}
                        className="btn-interactive p-2 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-2xs"
                        title="تصدير شيت الوردية"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* STREAM G: TREASURY (حركات الخزينة ورأس المال) */}
      {activeDailyStream === 'treasury' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                حركات الخزينة والسيولة ورأس المال في هذا اليوم ({dayTreasuryMovements.length})
              </h3>
            </div>
            <button
              onClick={() => setActiveModal('adjustCapital')}
              className="btn-interactive flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs"
            >
              <span>+ حركة خزينة جديدة</span>
            </button>
          </div>

          {dayTreasuryMovements.length === 0 ? (
            <div className="py-16 text-center px-4">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
                لا توجد حركات تسوية أو تحويلات خزينة مسجلة في هذا اليوم
              </h4>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {dayTreasuryMovements.map(h => (
                <div key={h.id} className="p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      {h.description || `حركة: ${h.type}`}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {h.date ? formatTimeArabic(h.date) : '—'} • القائم بالحركة: {h.performedBy || 'المسؤول'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-base font-black font-mono ${
                      h.type === 'deposit' ? 'text-emerald-600' : h.type === 'withdraw' ? 'text-rose-600' : 'text-slate-900 dark:text-white'
                    }`}>
                      {h.type === 'deposit' ? '+' : h.type === 'withdraw' ? '-' : ''} {formatCurrency(h.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STREAM H: AUDIT & CLOSING (جرد وإقفال اليومية) */}
      {activeDailyStream === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                <span>بيانات ومحضر جرد وإقفال اليومية لتاريخ ({selectedDate})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                مقارنة الرصيد الدفتري المسجل بالسيستم مع الجرد الفعلي لكاش الدرج والخطوط
              </p>
            </div>

            <button
              onClick={() => setActiveModal('dailyAudit')}
              className="btn-interactive flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/25"
            >
              <Moon className="w-4 h-4" />
              <span>{dayAudit ? 'تعديل بيانات الجرد' : 'إجراء الجرد والإقفال الآن'}</span>
            </button>
          </div>

          {dayAudit ? (
            <div className="space-y-6">
              {/* Result Banner */}
              <div className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between ${
                auditDiff === 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : auditDiff > 0
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}>
                <div>
                  <div className="text-sm sm:text-base font-black">
                    {auditDiff === 0 ? '✅ الجرد مطابق تماماً (لا يوجد عجز أو زيادة)' : auditDiff > 0 ? `🟡 يوجد فائض بقيمة +${auditDiff.toLocaleString()} ج.م` : `🔴 يوجد عجز بقيمة ${auditDiff.toLocaleString()} ج.م`}
                  </div>
                  <div className="text-xs mt-0.5 opacity-80">
                    تم الجرد بواسطة: {dayAudit.auditorName || 'المسؤول'} • التوقيت: {auditClosedAt ? formatDateTimeArabic(auditClosedAt) : '—'}
                  </div>
                </div>

                <div className="text-xl sm:text-2xl font-black font-mono">
                  {formatCurrency(auditActualTotal)}
                </div>
              </div>

              {/* Balances Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 block mb-1">كاش الدرج الفعلي</span>
                  <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {formatCurrency(dayAudit.actualBalances?.drawerCash || 0)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 block mb-1">خطوط فودافون كاش</span>
                  <div className="text-base font-black text-red-600 font-mono">
                    {formatCurrency(dayAudit.actualBalances?.vodafoneCash || 0)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 block mb-1">حسابات إنستاباي</span>
                  <div className="text-base font-black text-purple-600 font-mono">
                    {formatCurrency(dayAudit.actualBalances?.instapay || 0)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-400 block mb-1">الحسابات البنكية</span>
                  <div className="text-base font-black text-emerald-600 font-mono">
                    {formatCurrency(dayAudit.actualBalances?.bankAccounts || 0)}
                  </div>
                </div>
              </div>

              {dayAudit.notes && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold block mb-0.5">ملاحظات الجرد:</span>
                  <span>{dayAudit.notes}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <FileCheck className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                لم يتم إقفال أو جرد هذا اليوم حتى الآن
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                يقوم الجرد بحساب الرصيد الدفتري المتوقع ومطابقته مع الكاش الفعلي في الدرج والخطوط لتسجيل أي عجز أو زيادة وتصفير أو بدء اليومية الجديدة.
              </p>
              <button
                onClick={() => setActiveModal('dailyAudit')}
                className="btn-interactive inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/25"
              >
                <Moon className="w-4 h-4" />
                <span>إجراء جرد نهاية اليومية الآن</span>
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
