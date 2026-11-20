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
  Smartphone
} from 'lucide-react';

const STORAGE_KEY_ITEMS = 'elaasar_cash_inbound_items_v2';
const STORAGE_KEY_CONFIG = 'elaasar_cash_inbound_config_v2';
const STORAGE_KEY_SHIFT = 'elaasar_cash_inbound_shift_session_v2';
const STORAGE_KEY_ARCHIVE = 'elaasar_cash_inbound_days_archive_v2';

export default function DailyLogView({ onNavigateToInbound }) {
  const { 
    transactions, 
    selectedDate, 
    setSelectedDate, 
    deleteTransaction, 
    setActiveModal, 
    setModalData,
    showToast,
    askConfirm 
  } = useCash();

  const [searchDaily, setSearchDaily] = useState('');
  const [copiedId, setCopiedId] = useState(null);

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

  // Filter transactions for this day
  const dayTransactions = useMemo(() => {
    return transactions.filter(t => t.dateOnly === selectedDate);
  }, [transactions, selectedDate]);

  // Filtered by search within the day
  const filteredDayTransactions = useMemo(() => {
    if (!searchDaily.trim()) return dayTransactions;
    const q = searchDaily.toLowerCase().trim();
    return dayTransactions.filter(t => 
      t.customerName?.toLowerCase().includes(q) ||
      t.productName?.toLowerCase().includes(q) ||
      t.variantColor?.toLowerCase().includes(q) ||
      t.walletPhone?.includes(q) ||
      t.recipientPhone?.includes(q) ||
      t.transactionCode?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q)
    );
  }, [dayTransactions, searchDaily]);

  // Metrics for the selected day
  const dayTransferTxs = dayTransactions.filter(t => t.type === 'transfer_out');
  const dayRechargeTxs = dayTransactions.filter(t => t.type === 'recharge' || t.type === 'limit_reset');
  const dayPaymentTxs = dayTransactions.filter(t => t.type === 'client_payment');
  const daySalesTxs = dayTransactions.filter(t => t.type === 'product_sale');
  const dayTotalAmount = dayTransferTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dayTotalRechargeAmount = dayRechargeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dayTotalPaymentAmount = dayPaymentTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dayTotalSalesAmount = daySalesTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dayTotalFees = dayTransactions.reduce((sum, t) => sum + (Number(t.fee) || 0), 0);
  const dayTxCount = dayTransactions.length;
  const dayAverage = dayTransferTxs.length > 0 ? Math.round(dayTotalAmount / dayTransferTxs.length) : 0;

  // Find most active wallet on this day
  const topWallet = useMemo(() => {
    if (dayTransactions.length === 0) return null;
    const walletMap = {};
    dayTransactions.forEach(t => {
      walletMap[t.walletPhone] = (walletMap[t.walletPhone] || 0) + t.amount;
    });
    let topPhone = '';
    let maxAmount = 0;
    Object.entries(walletMap).forEach(([phone, amt]) => {
      if (amt > maxAmount) {
        maxAmount = amt;
        topPhone = phone;
      }
    });
    return { phone: topPhone, amount: maxAmount };
  }, [dayTransactions]);

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

  const handleDelete = async (tx) => {
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

  // Export Day to CSV with UTF-8 BOM for Arabic in Excel
  const handleExportCSV = () => {
    if (dayTransactions.length === 0) {
      showToast('لا توجد عمليات لتصديرها في هذا اليوم', 'info');
      return;
    }

    const headers = [
      'التوقيت',
      'نوع المعاملة',
      'اسم العميل / الصنف',
      'رقم المحفظة / تفاصيل المنتج',
      'المبلغ (ج.م)',
      'الليميت المتبقي / الكمية',
      'رقم المحول إليه / اللون',
      'كود العملية',
      'الرسوم',
      'الملاحظات'
    ];

    const rows = dayTransactions.map(t => {
      let typeLabel = 'تحويل كاش (سحب)';
      if (t.type === 'recharge') typeLabel = 'شحن وإيداع رصيد';
      else if (t.type === 'client_payment') typeLabel = t.isCreditorPayout ? 'صرف لمستحق دائن' : 'سداد من عميل';
      else if (t.type === 'product_sale') typeLabel = 'مبيعات هواتف وأجهزة';

      return [
        `"${formatTimeArabic(t.date)}"`,
        `"${typeLabel}"`,
        `"${t.customerName || (t.type === 'product_sale' ? t.productName : '')}"`,
        `"${t.type === 'product_sale' ? (t.productName || '') : `'${t.walletPhone || ''}`}"`,
        t.amount,
        t.type === 'product_sale' ? (t.quantity || 1) : (t.limitAfter !== undefined ? t.limitAfter : ''),
        `"${t.type === 'product_sale' ? (t.variantColor || '') : `'${t.recipientPhone || ''}`}"`,
        `"${t.transactionCode || ''}"`,
        t.fee || 0,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `سجل-فودافون-كاش-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف إكسل لليوم بنجاح');
  };

  // Closed/Ended shifts matching the selected date (by businessDate or closedAt date)
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

  // Check if there is an active ongoing shift session matching selectedDate
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

  // Combined totals across all closed shifts on this date if multiple
  const inboundDaySummary = useMemo(() => {
    if (dayInboundShifts.length <= 1) return null;
    const totalAmount = dayInboundShifts.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalCommission = dayInboundShifts.reduce((sum, s) => sum + (Number(s.commissionValue) || 0), 0);
    const totalNet = dayInboundShifts.reduce((sum, s) => sum + (Number(s.amountAfterCommission) || 0), 0);
    const totalItemsCount = dayInboundShifts.reduce((sum, s) => sum + (Number(s.itemsCount) || (s.items ? s.items.length : 0)), 0);
    return {
      totalAmount,
      totalCommission,
      totalNet,
      totalItemsCount,
      shiftsCount: dayInboundShifts.length
    };
  }, [dayInboundShifts]);

  // Helper to toggle accordion for shift items
  const toggleShiftItems = (shiftId) => {
    setExpandedShiftIds(prev => ({
      ...prev,
      [shiftId]: prev[shiftId] === undefined ? false : !prev[shiftId]
    }));
  };

  // Helper to export closed inbound shift report to CSV (UTF-8 BOM for Arabic in Excel)
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

    rows.push([]);
    rows.push([`تقرير وردية الوارد له ليوم: ${shift.businessDateLabel || selectedDate}`, '', '', '']);
    rows.push([`فترة الوردية: من ${shift.startedAtTimeStr || '—'} إلى ${shift.endedAtTimeStr || '—'}`, '', '', '']);
    rows.push(['إجمالي المبالغ المسجلة (قبل العمولة)', shift.totalAmount, '', '']);
    rows.push([
      `العمولة (${shift.commissionRate}${shift.commissionType === 'percentage' ? '%' : shift.commissionType === 'perThousand' ? ' لكل 1000' : ' ج.م'})`,
      shift.commissionMode === 'deduct' ? -shift.commissionValue : shift.commissionValue,
      shift.commissionMode === 'deduct' ? 'مخصومة من المبلغ' : 'مضافة للمبلغ',
      ''
    ]);
    rows.push(['الصافي النهائي بعد العمولة (المطلوب)', shift.amountAfterCommission, '', '']);
    if (shift.targetAmount) {
      rows.push(['المستهدف المطلوب', shift.targetAmount, '', '']);
      rows.push(['الفرق', shift.difference, '', '']);
    }

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

  const isToday = selectedDate === todayStr;

  return (
    <div className="space-y-6">
      
      {/* Date Navigation & Actions Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Top Header: Date description & Export/Print Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-900/40">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {formatDateArabic(selectedDate)}
                </h2>
                {isToday ? (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                    اليوم الحالي
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    أرشيف محفوظات
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                {isToday ? 'سجل العمليات الجارية لليوم الحاضر' : `سجل المحفوظات والتحويلات ليوم ${selectedDate}`}
              </span>
            </div>
          </div>

          {/* Export and Print Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportCSV}
              className="btn-interactive flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs"
              title="تصدير شيت إكسل لعمليات هذا اليوم"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>تصدير إكسل</span>
            </button>

            <button
              onClick={() => window.print()}
              className="btn-interactive flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs"
              title="طباعة تقرير اليوم"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>طباعة</span>
            </button>
          </div>
        </div>

        {/* Bottom Controls: Date Stepper & Quick Presets */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Stepper with single-icon date input */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleShiftDate(-1)}
              className="btn-interactive flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-xs"
              title="اليوم السابق"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden sm:inline">السابق</span>
            </button>

            {/* Date Input with Chrome icon suppressed */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-3 pr-9 py-2 text-xs sm:text-sm font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer shadow-xs [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <CalendarIcon className="w-4 h-4 text-red-600 dark:text-red-400 absolute right-3 pointer-events-none" />
            </div>

            <button
              onClick={() => handleShiftDate(1)}
              className="btn-interactive flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-slate-700/80 transition-colors shadow-xs"
              title="اليوم التالي"
            >
              <span className="hidden sm:inline">التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Presets Segment */}
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
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
              قبل أمس
            </button>
          </div>

        </div>

      </div>

      {/* Daily KPI Statistics Overview */}
      <div className={`grid gap-3 sm:gap-4 ${
        daySalesTxs.length > 0 
          ? 'grid-cols-2 lg:grid-cols-5' 
          : 'grid-cols-2 md:grid-cols-4'
      }`}>
        
        {/* Total Transferred Today */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            إجمالي التحويلات
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(dayTotalAmount)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            مخصومة مباشرة من الليميت
          </span>
        </div>

        {/* Transactions Count */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            عدد العمليات
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {dayTxCount}{' '}
            <span className="text-xs font-normal text-slate-400">عملية</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            متوسط التحويل: {formatCurrency(dayAverage)}
          </span>
        </div>

        {/* Device & Phone Sales (when present) */}
        {daySalesTxs.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-purple-200/90 dark:border-purple-900/50 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-purple-600 dark:text-purple-400 font-bold block">
                مبيعات الأجهزة والهواتف
              </span>
              <span className="p-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <ShoppingBag className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
              {formatCurrency(dayTotalSalesAmount)}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              {daySalesTxs.length} عملية بيع من المخزون
            </span>
          </div>
        )}

        {/* Fees Collected */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            إجمالي العمولات
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(dayTotalFees)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            رسوم المعاملات المسجلة
          </span>
        </div>

        {/* Most Active Wallet */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            أعلى رقم نشاطاً
          </span>
          <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white truncate" dir="ltr">
            {topWallet ? formatPhone(topWallet.phone) : '—'}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            {topWallet ? `حول: ${formatCurrency(topWallet.amount)}` : 'لا توجد بيانات'}
          </span>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 2.5 تقرير وردية الوارد له لليوم (مرتبط بالتقويم وتاريخ اليوم) */}
      {/* ========================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Section Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-transparent dark:from-blue-950/25 dark:via-indigo-950/15 dark:to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  تقرير وردية الوارد (له) لليوم
                </h3>
                {dayInboundShifts.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>وردية مقفلة ومؤرشفة {dayInboundShifts.length > 1 ? `(${dayInboundShifts.length} ورديات)` : ''}</span>
                  </span>
                ) : activeInboundShift ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                    <span>وردية جارية (قيد التسجيل)</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    لا توجد وردية مقفلة
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                كشف وتفاصيل المبالغ المحسوبة والعمولة عند إغلاق اليوم ({formatDateArabic(selectedDate)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onNavigateToInbound && (
              <button
                onClick={onNavigateToInbound}
                className="btn-interactive flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800 shadow-2xs transition-colors"
                title="الانتقال إلى حاسبة الوارد له"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>حاسبة الوارد له</span>
              </button>
            )}

            <button
              onClick={() => setIsInboundSectionOpen(!isInboundSectionOpen)}
              className="btn-interactive p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
              title={isInboundSectionOpen ? 'طي سكشن الوارد له' : 'فتح سكشن الوارد له'}
            >
              {isInboundSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Section Body (Visible when open) */}
        {isInboundSectionOpen && (
          <div className="p-4 sm:p-5 space-y-5">

            {/* Active Ongoing Shift Notice (if shift is open right now) */}
            {activeInboundShift && (
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-300/40">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <span>وردية اليوم مفتوحة حالياً وقيد التسجيل</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
                        بدأت {activeInboundShift.startedAtTimeStr || 'اليوم'}
                      </span>
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                      تم تسجيل <strong className="font-mono">{activeInboundShift.itemsCount}</strong> بند بإجمالي{' '}
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(activeInboundShift.totalAmount)}</strong>{' '}
                      (صافي مقدر: <strong className="font-mono">{formatCurrency(activeInboundShift.amountAfterCommission)}</strong>).{' '}
                      عند انتهاء اليوم والضغط على "إنهاء اليوم وتصفير الكشف"، سيتم تثبيته كوردية رسمية هنا.
                    </p>
                  </div>
                </div>

                {onNavigateToInbound && (
                  <button
                    onClick={onNavigateToInbound}
                    className="btn-interactive self-start md:self-auto shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <span>إدارة الوردية / إنهاء اليوم</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Aggregated Daily Summary if multiple shifts ended on this day */}
            {inboundDaySummary && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>إجمالي كل ورديات اليوم ({inboundDaySummary.shiftsCount} ورديات مغلقة ومؤرشفة)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {inboundDaySummary.totalItemsCount} بند إجمالي
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">إجمالي الوارد لكافة الورديات</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                      {formatCurrency(inboundDaySummary.totalAmount)}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">إجمالي العمولات المحسوبة</span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                      {formatCurrency(inboundDaySummary.totalCommission)}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">إجمالي الصافي النهائي</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(inboundDaySummary.totalNet)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* List of Closed Shifts for This Day */}
            {dayInboundShifts.length > 0 ? (
              <div className="space-y-4">
                {dayInboundShifts.map((shift, shiftIndex) => {
                  const isItemsExpanded = expandedShiftIds[shift.id] !== false; // Default expanded
                  const shiftSearch = inboundItemSearch[shift.id] || '';
                  
                  // Filter items if searching
                  const shiftItems = shift.items || [];
                  const filteredItems = shiftSearch.trim()
                    ? shiftItems.filter(it => 
                        (it.label && it.label.toLowerCase().includes(shiftSearch.toLowerCase().trim())) ||
                        String(it.amount).includes(shiftSearch.trim())
                      )
                    : shiftItems;

                  return (
                    <div 
                      key={shift.id || shiftIndex} 
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden space-y-4 p-4 sm:p-5 transition-all"
                    >
                      
                      {/* Shift Top Bar: Info, Badges, Export & Print */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                            {dayInboundShifts.length > 1 ? `وردية #${shiftIndex + 1}` : 'الوردية الرسمية المعتمدة'}
                          </span>

                          {/* Time Span Badge */}
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs font-mono">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>من {shift.startedAtTimeStr || '—'}</span>
                            <span className="text-slate-400">إلى</span>
                            <span>{shift.endedAtTimeStr || '—'}</span>
                          </span>

                          {/* Past Midnight End Badge */}
                          {shift.isPastMidnightEnd && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50">
                              <Moon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                              <span>أغلقت بعد منتصف الليل ({shift.endedAtTimeStr}) ومحسوبة لليوم</span>
                            </span>
                          )}
                        </div>

                        {/* Shift Actions */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            onClick={() => handleExportInboundShift(shift)}
                            className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs"
                            title="تصدير كشف الوردية كملف إكسل"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تصدير إكسل</span>
                          </button>

                          <button
                            onClick={() => window.print()}
                            className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs"
                            title="طباعة تقرير الوردية"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            <span>طباعة</span>
                          </button>

                          <button
                            onClick={() => toggleShiftItems(shift.id)}
                            className="btn-interactive flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800/80 shadow-2xs"
                            title={isItemsExpanded ? 'إخفاء جدول البنود' : 'عرض جدول البنود'}
                          >
                            <span>البنود ({shiftItems.length})</span>
                            {isItemsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* KPI Summary Cards Grid for this Shift */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-3.5">
                        
                        {/* 1. Total Inbound Amount */}
                        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block mb-1">
                            إجمالي الوارد (له)
                          </span>
                          <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                            {formatCurrency(shift.totalAmount)}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                            المجموع قبل العمولة ({shift.itemsCount || shiftItems.length} بند)
                          </span>
                        </div>

                        {/* 2. Commission Calculated */}
                        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                          <span className="text-[11px] sm:text-xs text-slate-400 font-bold block mb-1">
                            العمولة المحسوبة
                          </span>
                          <div className={`text-lg sm:text-2xl font-black font-mono ${
                            shift.commissionMode === 'add' 
                              ? 'text-emerald-600 dark:text-emerald-400' 
                              : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {shift.commissionMode === 'add' ? '+ ' : '- '}
                            {formatCurrency(shift.commissionValue)}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                            {shift.commissionRate}
                            {shift.commissionType === 'percentage' 
                              ? '%' 
                              : shift.commissionType === 'perThousand' 
                              ? ' لكل 1000' 
                              : ' ج.م'} ({shift.commissionMode === 'add' ? 'إضافة' : 'خصم'})
                          </span>
                        </div>

                        {/* 3. Net Amount After Commission */}
                        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-emerald-200/90 dark:border-emerald-900/60 shadow-2xs bg-gradient-to-br from-emerald-50/20 to-transparent dark:from-emerald-950/10">
                          <span className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-bold block mb-1">
                            الصافي المطلوب (بعد العمولة)
                          </span>
                          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {formatCurrency(shift.amountAfterCommission)}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                            المبلغ النهائي المستحق عند التصفية
                          </span>
                        </div>

                        {/* 4. Target & Difference or Shift Timing */}
                        {shift.targetAmount && Number(shift.targetAmount) > 0 ? (
                          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                            <span className="text-[11px] sm:text-xs text-slate-400 font-bold block mb-1">
                              المستهدف والفرق
                            </span>
                            <div className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 font-mono">
                              {formatCurrency(shift.targetAmount)}
                            </div>
                            <span className={`text-[11px] font-bold mt-1 block font-mono ${
                              shift.difference > 0 
                                ? 'text-amber-600 dark:text-amber-400' 
                                : shift.difference < 0 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {shift.difference > 0 
                                ? `متبقي عجز: ${formatCurrency(shift.difference)}` 
                                : shift.difference < 0 
                                ? `زيادة: ${formatCurrency(Math.abs(shift.difference))}` 
                                : 'مطابق تماماً'}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                            <span className="text-[11px] sm:text-xs text-slate-400 font-bold block mb-1">
                              حالة وإغلاق الوردية
                            </span>
                            <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                              {shift.endedAtTimeStr || 'مقفلة'}
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                              تم الأرشفة والتصفير بنجاح
                            </span>
                          </div>
                        )}

                      </div>

                      {/* Collapsible Table of Inbound Items */}
                      {isItemsExpanded && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                          
                          {/* Inner Table Header with Search */}
                          <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-800/40">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400" />
                              <h5 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                                بيان البنود والمبالغ الواردة ({filteredItems.length} من {shiftItems.length})
                              </h5>
                            </div>

                            {shiftItems.length > 5 && (
                              <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  placeholder="بحث في بنود الوردية..."
                                  value={shiftSearch}
                                  onChange={(e) => setInboundItemSearch(prev => ({ ...prev, [shift.id]: e.target.value }))}
                                  className="w-full pl-3 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                {shiftSearch && (
                                  <button
                                    onClick={() => setInboundItemSearch(prev => ({ ...prev, [shift.id]: '' }))}
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
                                  >
                                    مسح
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Items Table */}
                          {filteredItems.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                              {shiftSearch ? 'لا توجد بنود تطابق نص البحث' : 'لا توجد بنود مسجلة في هذه الوردية'}
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-right text-xs">
                                <thead>
                                  <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                    <th className="py-2.5 px-3 w-12 text-center font-bold">#</th>
                                    <th className="py-2.5 px-3 font-bold">البيان / ملاحظة العملية</th>
                                    <th className="py-2.5 px-3 font-bold">المبلغ الوارد (ج.م)</th>
                                    <th className="py-2.5 px-3 font-bold">توقيت التسجيل</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                  {filteredItems.map((item, itemIdx) => (
                                    <tr 
                                      key={item.id || itemIdx}
                                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                                    >
                                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                                        {itemIdx + 1}
                                      </td>
                                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                                        {item.label ? (
                                          <span>{item.label}</span>
                                        ) : (
                                          <span className="text-slate-400 font-normal italic">وارد بدون بيان</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white font-mono text-sm">
                                        {formatCurrency(item.amount)}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono">
                                        {item.date ? formatTimeArabic(item.date) : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-slate-50 dark:bg-slate-800/60 font-bold border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                                    <td colSpan={2} className="py-2.5 px-3 text-left">
                                      المجموع الإجمالي لبنود الوردية:
                                    </td>
                                    <td className="py-2.5 px-3 font-black font-mono text-sm">
                                      {formatCurrency(shift.totalAmount)}
                                    </td>
                                    <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-mono">
                                      الصافي: {formatCurrency(shift.amountAfterCommission)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            ) : !activeInboundShift ? (
              <div className="py-10 text-center px-4 bg-slate-50/60 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <ArrowDownToLine className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2.5" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  لا توجد وردية وارد له مقفلة مسجلة لهذا اليوم ({formatDateArabic(selectedDate)})
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
                  يتم حفظ وتثبيت التقرير تلقائياً فور الضغط على "إنهاء اليوم وتصفير الكشف" في صفحة الوارد له، ويكون مرتبطاً باليوم المختار في التقويم.
                </p>
                {onNavigateToInbound && (
                  <button
                    onClick={onNavigateToInbound}
                    className="btn-interactive inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح حاسبة الوارد له</span>
                  </button>
                )}
              </div>
            ) : null}

          </div>
        )}

      </div>

      {/* Search within Day */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="بحث في معاملات هذا اليوم (برقم المستلم، رقم المحفظة، اسم العميل، كود المعاملة)..."
          value={searchDaily}
          onChange={(e) => setSearchDaily(e.target.value)}
          className="w-full pl-4 pr-10 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 shadow-sm"
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

      {/* Transactions Table & Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
              سجل المعاملات التفصيلي
            </h3>
            <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
              {filteredDayTransactions.length} عملية
            </span>
          </div>

          <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500">
            يتم خصم التحويل مباشرة وتحديث المتبقي
          </span>
        </div>

        {filteredDayTransactions.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
              لا توجد عمليات مسجلة في هذا اليوم
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              {searchDaily 
                ? 'لا توجد نتائج تطابق نص البحث، جرب البحث بكلمات أخرى.'
                : 'يمكنك تسجيل تحويلة جديدة بالضغط على زر "تحويل جديد" بالأعلى.'}
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-4">التوقيت</th>
                    <th className="py-3.5 px-4">المحفظة والعميل (الراسل)</th>
                    <th className="py-3.5 px-4">المبلغ المخصوم</th>
                    <th className="py-3.5 px-4">الليميت المتبقي</th>
                    <th className="py-3.5 px-4">رقم المحول إليه (المستلم)</th>
                    <th className="py-3.5 px-4">كود العملية</th>
                    <th className="py-3.5 px-4">الرسوم والملاحظات</th>
                    <th className="py-3.5 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDayTransactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatTimeArabic(tx.date)}
                        </span>
                      </td>

                      {/* Sender Wallet & Client */}
                      <td className="py-3.5 px-4">
                        {tx.type === 'product_sale' ? (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {tx.customerName || 'عميل نقدي'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                              <Smartphone className="w-3 h-3 shrink-0" />
                              {tx.productName}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {tx.customerName}
                            </span>
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                              {formatPhone(tx.walletPhone)}
                            </span>
                            {tx.walletLabel && (
                              <span className="text-[10px] text-slate-400 block">
                                ({tx.walletLabel})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Transferred Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tx.type === 'recharge' ? (
                          <span className="font-black text-blue-600 dark:text-blue-400 text-base font-mono">
                            + {formatCurrency(tx.amount)}
                          </span>
                        ) : tx.type === 'client_payment' ? (
                          <span className={`font-black text-base font-mono ${
                            tx.isCreditorPayout ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {tx.isCreditorPayout ? '- ' : '+ '}{formatCurrency(tx.amount)} {tx.isCreditorPayout ? '(صرف لدائن)' : '(سداد)'}
                          </span>
                        ) : tx.type === 'product_sale' ? (
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-base font-mono">
                            + {formatCurrency(tx.amount)}
                          </span>
                        ) : (
                          <span className="font-black text-rose-600 dark:text-rose-400 text-base font-mono">
                            - {formatCurrency(tx.amount)}
                          </span>
                        )}
                      </td>

                      {/* Remaining Limit After Transfer */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tx.type === 'client_payment' || tx.type === 'product_sale' ? (
                          <span className="text-xs text-slate-400 font-bold">—</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono">
                            {formatCurrency(tx.limitAfter)}
                          </span>
                        )}
                      </td>

                      {/* Recipient Phone */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tx.type === 'recharge' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                            شحن وإيداع رصيد
                          </span>
                        ) : tx.type === 'client_payment' ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            tx.isCreditorPayout
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-900/50'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50'
                          }`}>
                            {tx.isCreditorPayout ? 'صرف لمستحق دائن' : 'سداد من العميل'} ({tx.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : tx.paymentMethod === 'instapay' ? 'إنستاباي' : tx.paymentMethod === 'bank' ? 'بنكي' : 'نقدي'})
                          </span>
                        ) : tx.type === 'product_sale' ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50">
                              <ShoppingBag className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                              بيع جهاز / هاتف
                            </span>
                            {tx.variantColor && (
                              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                (لون: {tx.variantColor})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                              {formatPhone(tx.recipientPhone) || '—'}
                            </span>
                            {tx.recipientPhone && (
                              <button
                                onClick={() => handleCopy(tx.recipientPhone, `rec-${tx.id}`)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                title="نسخ رقم المستلم"
                              >
                                {copiedId === `rec-${tx.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Transaction Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {tx.transactionCode || (tx.type === 'product_sale' ? 'DEV-SALE' : 'VF-AUTO')}
                        </span>
                      </td>

                      {/* Fees & Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {tx.type === 'product_sale' ? (
                          <div className="text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              الكمية: {tx.quantity || 1} قطعة × {formatCurrency(tx.unitPrice)}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 truncate block">
                              {tx.notes || '—'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs">
                            {tx.fee > 0 && (
                              <span className="text-emerald-600 font-semibold block">
                                عمولة: {formatCurrency(tx.fee)}
                              </span>
                            )}
                            <span className="text-slate-500 dark:text-slate-400 truncate block">
                              {tx.notes || '—'}
                            </span>
                          </div>
                        )}
                      </td>
                            {tx.notes || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePrintReceipt(tx)}
                            className="btn-interactive p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="عرض وطباعة إيصال التحويل"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(tx)}
                            className="btn-interactive p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="حذف المعاملة وإرجاع المبلغ لليميت"
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

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDayTransactions.map((tx) => (
                <div key={tx.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium">
                        {formatTimeArabic(tx.date)}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">
                        {tx.customerName || (tx.type === 'product_sale' ? 'عميل نقدي' : '')}
                      </h4>
                      {tx.type === 'product_sale' ? (
                        <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>{tx.productName} (لون: {tx.variantColor || 'قياسي'})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="text-slate-400">من:</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300" dir="ltr">
                            {formatPhone(tx.walletPhone)}
                          </span>
                          {tx.walletLabel && (
                            <span className="text-[11px] text-slate-400">({tx.walletLabel})</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-left">
                      {tx.type === 'recharge' ? (
                        <div className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                          + {formatCurrency(tx.amount)}
                        </div>
                      ) : tx.type === 'client_payment' ? (
                        <div className={`text-lg font-black font-mono ${
                          tx.isCreditorPayout ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {tx.isCreditorPayout ? '- ' : '+ '}{formatCurrency(tx.amount)} {tx.isCreditorPayout ? '(صرف لدائن)' : '(سداد)'}
                        </div>
                      ) : tx.type === 'product_sale' ? (
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          + {formatCurrency(tx.amount)}
                        </div>
                      ) : (
                        <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                          - {formatCurrency(tx.amount)}
                        </div>
                      )}
                      {tx.type === 'product_sale' ? (
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                          {tx.quantity || 1} قطعة × {formatCurrency(tx.unitPrice)}
                        </span>
                      ) : tx.limitAfter !== undefined ? (
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block font-mono">
                          المتبقي: {formatCurrency(tx.limitAfter)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        {tx.type === 'product_sale' ? 'نوع العملية:' : tx.type === 'recharge' ? 'نوع العملية:' : tx.type === 'client_payment' ? 'طريقة السداد:' : 'المحول إليه:'}
                      </span>
                      {tx.type === 'product_sale' ? (
                        <span className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          بيع جهاز / إكسسوار
                        </span>
                      ) : tx.type === 'recharge' ? (
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          شحن وإيداع رصيد
                        </span>
                      ) : tx.type === 'client_payment' ? (
                        <span className={`font-bold ${
                          tx.isCreditorPayout ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {tx.isCreditorPayout ? 'صرف لمستحق دائن' : 'سداد من العميل'} ({tx.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : tx.paymentMethod === 'instapay' ? 'إنستاباي' : tx.paymentMethod === 'bank' ? 'بنكي' : 'نقدي'})
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                          {formatPhone(tx.recipientPhone) || 'غير محدد'}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px]">كود التحويل:</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        {tx.transactionCode}
                      </span>
                    </div>
                  </div>

                  {tx.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                      ملاحظة: {tx.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handlePrintReceipt(tx)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>إيصال</span>
                    </button>
                    <button
                      onClick={() => handleDelete(tx)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
