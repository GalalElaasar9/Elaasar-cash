import React, { useState, useMemo } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  formatPhone, 
  formatTimeArabic, 
  formatDateArabic,
  getTodayString 
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
  Send, 
  Clock, 
  DollarSign, 
  Percent, 
  Copy, 
  Check,
  TrendingDown,
  PhoneCall,
  FileSpreadsheet
} from 'lucide-react';

export default function DailyLogView() {
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
      t.walletPhone?.includes(q) ||
      t.recipientPhone?.includes(q) ||
      t.transactionCode?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q)
    );
  }, [dayTransactions, searchDaily]);

  // Metrics for the selected day
  const dayTransferTxs = dayTransactions.filter(t => t.type !== 'recharge');
  const dayRechargeTxs = dayTransactions.filter(t => t.type === 'recharge');
  const dayTotalAmount = dayTransferTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const dayTotalRechargeAmount = dayRechargeTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
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
    const confirmed = await askConfirm({
      title: 'حذف عملية تحويل',
      message: `هل أنت متأكد من حذف هذه العملية بقيمة ${formatCurrency(tx.amount)}؟`,
      details: 'سيتم إلغاء قيد المعاملة فوراً وإعادة كامل المبلغ المخصوم إلى رصيد ليميت المحفظة.',
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
      'اسم العميل',
      'رقم المحفظة (الراسل)',
      'المبلغ المحول (ج.م)',
      'الليميت المتبقي بعد التحويل',
      'رقم المحول إليه (المستلم)',
      'كود العملية',
      'الرسوم',
      'الملاحظات'
    ];

    const rows = dayTransactions.map(t => [
      `"${formatTimeArabic(t.date)}"`,
      `"${t.customerName || ''}"`,
      `"'${t.walletPhone || ''}"`,
      t.amount,
      t.limitAfter !== undefined ? t.limitAfter : '',
      `"'${t.recipientPhone || ''}"`,
      `"${t.transactionCode || ''}"`,
      t.fee || 0,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

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
                  return d.toISOString().split('T')[0];
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
                  return d.toISOString().split('T')[0];
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
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
            <span className="text-xs font-normal text-slate-400">تحويلة</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            متوسط العملية: {formatCurrency(dayAverage)}
          </span>
        </div>

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
                      </td>

                      {/* Transferred Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tx.type === 'recharge' ? (
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
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-mono">
                          {formatCurrency(tx.limitAfter)}
                        </span>
                      </td>

                      {/* Recipient Phone */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tx.type === 'recharge' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                            شحن وإيداع رصيد
                          </span>
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
                          {tx.transactionCode || 'VF-AUTO'}
                        </span>
                      </td>

                      {/* Fees & Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
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
                        {tx.customerName}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="text-slate-400">من:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300" dir="ltr">
                          {formatPhone(tx.walletPhone)}
                        </span>
                        {tx.walletLabel && (
                          <span className="text-[11px] text-slate-400">({tx.walletLabel})</span>
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      {tx.type === 'recharge' ? (
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          + {formatCurrency(tx.amount)}
                        </div>
                      ) : (
                        <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                          - {formatCurrency(tx.amount)}
                        </div>
                      )}
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block font-mono">
                        المتبقي: {formatCurrency(tx.limitAfter)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        {tx.type === 'recharge' ? 'نوع العملية:' : 'المحول إليه:'}
                      </span>
                      {tx.type === 'recharge' ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          شحن وإيداع رصيد
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
