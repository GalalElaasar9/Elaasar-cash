import React, { useState, useMemo, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import { getPersistedNavValue, setPersistedNavValue } from '../utils/storage';
import { 
  formatCurrency, 
  formatDateArabic, 
  formatDateTimeArabic, 
  formatPhone, 
  cleanEgyptianPhone,
  getTodayString,
  getLocalDateString 
} from '../utils/formatters';
import { 
  ShoppingBag, 
  Package, 
  Zap, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Printer, 
  Eye, 
  Trash2, 
  MessageSquare, 
  Phone, 
  Layers, 
  Table as TableIcon, 
  LayoutGrid, 
  ArrowDownToLine, 
  Wallet,
  Sparkles,
  PieChart,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Coins,
  Smartphone,
  Landmark
} from 'lucide-react';

export default function PurchasesView() {
  const { 
    purchases, 
    transactions,
    inventory,
    setActiveModal, 
    setModalData, 
    deletePurchase,
    todayPurchasesAmount,
    monthPurchasesAmount,
    totalPurchasesAmount,
    totalSupplierDebt,
    inventoryPurchasesTotal,
    generalExpensesTotal,
    cashLiquidityPurchasesTotal,
    showToast,
    askConfirm
  } = useCash();

  // Active top-level subtab: 'invoices' | 'suppliers' | 'analytics'
  const [activeSubTab, setActiveSubTab] = useState(() =>
    getPersistedNavValue('elaasar_purchases_subtab', 'invoices', ['invoices', 'suppliers', 'analytics'])
  );

  useEffect(() => {
    setPersistedNavValue('elaasar_purchases_subtab', activeSubTab);
  }, [activeSubTab]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'inventory_goods' | 'general_expense'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'partial' | 'unpaid'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 8;
  const todayStr = getTodayString();

  // Filtered Purchases list
  const filteredPurchases = useMemo(() => {
    return (purchases || []).filter(p => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const invNum = (p.invoiceNumber || '').toLowerCase();
        const supName = (p.supplierName || '').toLowerCase();
        const notes = (p.notes || '').toLowerCase();
        const hasItem = (p.items || []).some(item => (item.name || '').toLowerCase().includes(query));

        if (!invNum.includes(query) && !supName.includes(query) && !notes.includes(query) && !hasItem) {
          return false;
        }
      }

      // 2. Type Filter
      if (typeFilter !== 'all' && p.type !== typeFilter) {
        return false;
      }

      // 3. Payment Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid' && p.paymentStatus !== 'paid') return false;
        if (statusFilter === 'partial' && p.paymentStatus !== 'partial') return false;
        if (statusFilter === 'unpaid' && p.paymentStatus !== 'unpaid') return false;
        if (statusFilter === 'debt' && (p.remainingAmount || 0) <= 0) return false;
      }

      // 4. Date Filter
      if (dateFilter !== 'all') {
        const pDateStr = p.date ? getLocalDateString(p.date) : '';
        if (dateFilter === 'today' && pDateStr !== todayStr) return false;
        if (dateFilter === 'month') {
          const currentMonth = todayStr.slice(0, 7);
          if (!pDateStr.startsWith(currentMonth)) return false;
        }
        if (dateFilter === 'week') {
          const pTime = new Date(p.date).getTime();
          const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          if (pTime < oneWeekAgo) return false;
        }
      }

      return true;
    });
  }, [purchases, searchQuery, typeFilter, statusFilter, dateFilter, todayStr]);

  // Pagination
  const totalPages = Math.ceil(filteredPurchases.length / ITEMS_PER_PAGE) || 1;
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPurchases.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPurchases, currentPage]);

  // Aggregated Suppliers Directory
  const suppliersDirectory = useMemo(() => {
    const map = {};
    (purchases || []).forEach(p => {
      const name = (p.supplierName || 'مورد عام').trim();
      if (!map[name]) {
        map[name] = {
          name,
          phone: p.supplierPhone || '',
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalDebt: 0,
          lastInvoiceDate: p.date,
          latestInvoice: p
        };
      }
      map[name].totalInvoices += 1;
      map[name].totalAmount += (Number(p.totalAmount) || 0);
      map[name].totalPaid += (Number(p.paidAmount) || 0);
      map[name].totalDebt += (Number(p.remainingAmount) || 0);
      if (new Date(p.date) > new Date(map[name].lastInvoiceDate)) {
        map[name].lastInvoiceDate = p.date;
        map[name].latestInvoice = p;
        if (p.supplierPhone) map[name].phone = p.supplierPhone;
      }
    });
    return Object.values(map).sort((a, b) => b.totalDebt - a.totalDebt || b.totalAmount - a.totalAmount);
  }, [purchases]);

  // Net Profit & Analytics Calculations
  const analyticsData = useMemo(() => {
    // 1. Sales revenue and cost from transactions of type 'product_sale'
    const productSales = (transactions || []).filter(t => t.type === 'product_sale');
    const totalSalesRevenue = productSales.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalSalesCost = productSales.reduce((sum, t) => sum + (Number(t.costPrice) || 0), 0);
    const grossProductProfit = totalSalesRevenue - totalSalesCost;

    // 2. Cash Transfer Commissions (from transfers)
    const transferFees = (transactions || []).reduce((sum, t) => sum + (Number(t.fee) || 0), 0);

    // 3. General Store Expenses
    const storeExpenses = generalExpensesTotal;

    // 4. Net Operating Profit
    const netProfit = (grossProductProfit + transferFees) - storeExpenses;

    // 5. Expense breakdown by category
    const expenseByCategory = {};
    (purchases || [])
      .filter(p => p.type === 'general_expense')
      .forEach(p => {
        const cat = p.expenseCategory || 'other';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(p.totalAmount) || 0);
      });

    return {
      totalSalesRevenue,
      totalSalesCost,
      grossProductProfit,
      transferFees,
      storeExpenses,
      netProfit,
      expenseByCategory
    };
  }, [transactions, generalExpensesTotal, purchases]);

  // Actions
  const handleOpenDetails = (purchase) => {
    setModalData({ purchase });
    setActiveModal('purchaseDetails');
  };

  const handleSettleSupplier = (purchase) => {
    setModalData({ purchase });
    setActiveModal('supplierPayment');
  };

  const handleDelete = async (purchase) => {
    const confirmed = await askConfirm({
      title: 'تأكيد حذف الفاتورة',
      message: `هل أنت متأكد من حذف فاتورة "${purchase.invoiceNumber}" الخاصة بـ (${purchase.supplierName})؟`,
      details: 'سيتم حذف الفاتورة وعكس تأثيرها المالي على الخزينة والمورد والمخزون.',
      type: 'danger',
      confirmText: 'نعم، احذف الفاتورة',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      deletePurchase(purchase.id);
    }
  };

  const handleExportCSV = () => {
    if (filteredPurchases.length === 0) {
      showToast('لا توجد فواتير لتصديرها حالياً', 'info');
      return;
    }

    const headers = ['رقم الفاتورة', 'النوع', 'المورد', 'رقم الهاتف', 'التاريخ', 'إجمالي الفاتورة', 'المدفوع', 'المتبقي (الآجل)', 'طريقة الدفع', 'ملاحظات'];
    const rows = filteredPurchases.map(p => [
      `"${p.invoiceNumber}"`,
      `"${p.type === 'inventory_goods' ? 'بضاعة مخزون' : 'مصروف عام'}"`,
      `"${p.supplierName}"`,
      `"${p.supplierPhone || ''}"`,
      `"${p.date}"`,
      p.totalAmount,
      p.paidAmount,
      p.remainingAmount,
      `"${p.paymentMethod}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `elaasar-purchases-${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير تقرير المشتريات والمصروفات بنجاح!');
  };

  return (
    <div className="space-y-6 animate-view-fade">
      
      {/* 1. Header Bar with Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-md shadow-red-600/25">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>إدارة المشتريات والمصروفات والتوريدات</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold">
                  {purchases.length} فاتورة
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                متابعة فواتير البضاعة، زيادة المخزون، حسابات الموردين والآجل، ومصروفات التشغيل
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveModal('addPurchase')}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs sm:text-sm font-black shadow-md shadow-red-600/25 transition-all"
          >
            <Package className="w-4 h-4" />
            <span>+ فاتورة مشتريات بضاعة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalData({ type: 'cash_liquidity' });
              setActiveModal('addCashLiquidity');
            }}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs sm:text-sm font-black shadow-md shadow-amber-500/25 transition-all"
          >
            <Coins className="w-4 h-4" />
            <span>+ شراء رصيد كاش</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('addExpense')}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white text-xs sm:text-sm font-black shadow-md shadow-orange-500/20 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>+ تسجيل مصروف عام</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold transition-colors"
            title="تصدير تقرير إكسيل / CSV"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">تصدير تقرير</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Month Purchases */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي مشتريات الشهر
            </span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
            {formatCurrency(monthPurchasesAmount)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>مشتريات اليوم:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(todayPurchasesAmount)}</span>
          </div>
        </div>

        {/* Card 2: Cash Liquidity (شراء وتغذية رصيد فودافون كاش ومحافظ) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              شراء رصيد فودافون كاش
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">
            {formatCurrency(cashLiquidityPurchasesTotal || 0)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>رصيد مغذي للخطوط:</span>
            <span className="font-bold text-amber-600">
              {purchases.filter(p => p.type === 'cash_liquidity').length} عمليات توريد
            </span>
          </div>
        </div>

        {/* Card 3: Inventory Purchases (Capital invested in goods) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              بضاعة المخزن
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">
            {formatCurrency(inventoryPurchasesTotal)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>إجمالي الأصناف:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{inventory.length} صنف</span>
          </div>
        </div>

        {/* Card 4: Supplier Debts (الآجل المستحق على المحل) */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ديون الموردين (الآجل)
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg sm:text-xl font-black ${totalSupplierDebt > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
            {formatCurrency(totalSupplierDebt)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>موردين لهم آجل:</span>
            <span className="font-bold text-amber-600">
              {suppliersDirectory.filter(s => s.totalDebt > 0).length} مورد
            </span>
          </div>
        </div>

        {/* Card 5: Operating Expenses */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              المصروفات العامة
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(generalExpensesTotal)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>مصاريف تشغيل:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {purchases.filter(p => p.type === 'general_expense').length} حركة
            </span>
          </div>
        </div>

      </div>

      {/* 3. Sub-Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => { setActiveSubTab('invoices'); setCurrentPage(1); }}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
            activeSubTab === 'invoices'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>سجل فواتير المشتريات ({filteredPurchases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('suppliers')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
            activeSubTab === 'suppliers'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>دليل وحسابات الموردين ({suppliersDirectory.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('analytics')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all ${
            activeSubTab === 'analytics'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>تحليلات صافي الأرباح</span>
        </button>
      </div>

      {/* 4. Sub-Tab 1: Invoices List View */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              
              {/* Search */}
              <div className="sm:col-span-4 relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="بحث برقم الفاتورة، اسم المورد، الصنف..."
                  className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              {/* Type Filter */}
              <div className="sm:col-span-3">
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold"
                >
                  <option value="all">جميع الأنواع (بضاعة، كاش ومصروفات)</option>
                  <option value="inventory_goods">بضاعة ومخزون فقط</option>
                  <option value="cash_liquidity">شراء رصيد فودافون كاش ومحافظ</option>
                  <option value="general_expense">مشتريات ومصروفات عامة</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold"
                >
                  <option value="all">جميع حالات السداد</option>
                  <option value="paid">مسدد بالكامل</option>
                  <option value="partial">مسدد جزئياً</option>
                  <option value="unpaid">آجل بالكامل</option>
                  <option value="debt">به متبقي آجل فقط</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="sm:col-span-2">
                <select
                  value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold"
                >
                  <option value="all">كل الفترات</option>
                  <option value="today">اليوم</option>
                  <option value="week">آخر 7 أيام</option>
                  <option value="month">هذا الشهر</option>
                </select>
              </div>

            </div>

            {/* View Mode Toggle & Counter */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500 text-[11px]">
                تم العثور على <span className="font-bold text-slate-800 dark:text-slate-200">{filteredPurchases.length}</span> فاتورة
              </span>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1 rounded-md transition-colors ${
                    viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-xs' : 'text-slate-500'
                  }`}
                  title="عرض جدول"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1 rounded-md transition-colors ${
                    viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-xs' : 'text-slate-500'
                  }`}
                  title="عرض بطاقات"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Invoices Content */}
          {filteredPurchases.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                لا توجد فواتير مطابقة لخيارات البحث أو الفلترة
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                اضغط على "+ فاتورة مشتريات بضاعة" أو "+ تسجيل مصروف عام" لإضافة أول فاتورة
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-black border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-3.5">الفاتورة / المرجع</th>
                      <th className="py-3 px-3.5">المورد / الجهة</th>
                      <th className="py-3 px-3.5">النوع والتاريخ</th>
                      <th className="py-3 px-3.5">البنود والأصناف</th>
                      <th className="py-3 px-3.5 text-center">إجمالي الفاتورة</th>
                      <th className="py-3 px-3.5 text-center">المسدد</th>
                      <th className="py-3 px-3.5 text-center">المتبقي (الآجل)</th>
                      <th className="py-3 px-3.5 text-center">طريقة الدفع</th>
                      <th className="py-3 px-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedPurchases.map((purchase) => {
                      const isGoods = purchase.type === 'inventory_goods';
                      const isLiquidity = purchase.type === 'cash_liquidity';
                      const itemsCount = purchase.items?.length || 0;
                      const hasDebt = (purchase.remainingAmount || 0) > 0;

                      return (
                        <tr 
                          key={purchase.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Invoice Number */}
                          <td className="py-3 px-3.5 font-bold">
                            <div className="flex items-center gap-1.5">
                              {isGoods ? (
                                <Package className="w-4 h-4 text-red-500 shrink-0" />
                              ) : isLiquidity ? (
                                <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                              ) : (
                                <Zap className="w-4 h-4 text-orange-500 shrink-0" />
                              )}
                              <span className="font-mono text-slate-900 dark:text-slate-100">
                                {purchase.invoiceNumber}
                              </span>
                            </div>
                          </td>

                          {/* Supplier */}
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[160px]">
                              {purchase.supplierName}
                            </div>
                            {purchase.supplierPhone && (
                              <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                                {formatPhone(purchase.supplierPhone)}
                              </span>
                            )}
                          </td>

                          {/* Type & Date */}
                          <td className="py-3 px-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isGoods 
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' 
                                : isLiquidity
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                            }`}>
                              {isGoods ? 'بضاعة مخزون' : isLiquidity ? 'شراء رصيد كاش' : 'مصروف عام'}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {formatDateArabic(purchase.date)}
                            </div>
                          </td>

                          {/* Items Preview */}
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                              {isLiquidity ? (
                                <span className="text-amber-700 dark:text-amber-300">
                                  شحن خط: {formatPhone(purchase.targetWalletPhone || '')} (+{formatCurrency(purchase.purchasedCashAmount || purchase.totalAmount)})
                                </span>
                              ) : (
                                purchase.items?.[0]?.name || 'بند عام'
                              )}
                            </div>
                            {itemsCount > 1 && !isLiquidity && (
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">
                                + {itemsCount - 1} أصناف إضافية
                              </span>
                            )}
                          </td>

                          {/* Total Amount */}
                          <td className="py-3 px-3.5 text-center font-black text-slate-900 dark:text-slate-100">
                            {formatCurrency(purchase.totalAmount)}
                          </td>

                          {/* Paid */}
                          <td className="py-3 px-3.5 text-center font-bold text-emerald-600">
                            {formatCurrency(purchase.paidAmount)}
                          </td>

                          {/* Remaining Debt */}
                          <td className="py-3 px-3.5 text-center font-black">
                            {hasDebt ? (
                              <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                                {formatCurrency(purchase.remainingAmount)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">خالص</span>
                            )}
                          </td>

                          {/* Payment Method Badge */}
                          <td className="py-3 px-3.5 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                              {
                                purchase.paymentMethod === 'wallet' ? 'محفظة كاش' :
                                purchase.paymentMethod === 'instapay' ? 'إنستاباي' :
                                purchase.paymentMethod === 'bank' ? 'حساب بنكي' :
                                purchase.paymentMethod === 'credit' ? 'آجل' :
                                purchase.paymentMethod === 'partial' ? 'جزئي' :
                                'نقدي'
                              }
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenDetails(purchase)}
                                className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="عرض تفاصيل الفاتورة"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {hasDebt && (
                                <button
                                  type="button"
                                  onClick={() => handleSettleSupplier(purchase)}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold"
                                  title="سداد دفعة من الآجل"
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDelete(purchase)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="حذف الفاتورة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {paginatedPurchases.map(purchase => {
                const isGoods = purchase.type === 'inventory_goods';
                const isLiquidity = purchase.type === 'cash_liquidity';
                const hasDebt = (purchase.remainingAmount || 0) > 0;

                return (
                  <div
                    key={purchase.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3 relative group hover:border-red-300 dark:hover:border-red-900/50 transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        {isGoods ? (
                          <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600">
                            <Package className="w-4 h-4" />
                          </div>
                        ) : isLiquidity ? (
                          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                            <Coins className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600">
                            <Zap className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            {purchase.invoiceNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDateArabic(purchase.date)}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                        purchase.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : purchase.paymentStatus === 'partial'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {purchase.paymentStatus === 'paid' ? 'خالص' : purchase.paymentStatus === 'partial' ? 'جزئي' : 'آجل'}
                      </span>
                    </div>

                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{purchase.supplierName}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {isLiquidity ? (
                          <span className="text-amber-700 dark:text-amber-300 font-bold">
                            شحن خط: {formatPhone(purchase.targetWalletPhone || '')} (+{formatCurrency(purchase.purchasedCashAmount || purchase.totalAmount)})
                          </span>
                        ) : (
                          <>
                            {purchase.items?.[0]?.name || 'بند عام'}
                            {purchase.items?.length > 1 && ` (+${purchase.items.length - 1} أصناف إضافية)`}
                          </>
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">الإجمالي:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(purchase.totalAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">المسدد:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(purchase.paidAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">المتبقي:</span>
                        <span className={`font-black ${hasDebt ? 'text-red-600' : 'text-slate-400'}`}>
                          {hasDebt ? formatCurrency(purchase.remainingAmount) : '0'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        وسيلة الدفع: {
                          purchase.paymentMethod === 'wallet' ? 'محفظة كاش' :
                          purchase.paymentMethod === 'instapay' ? 'إنستاباي' :
                          purchase.paymentMethod === 'bank' ? 'حساب بنكي' :
                          purchase.paymentMethod === 'credit' ? 'آجل' :
                          purchase.paymentMethod === 'partial' ? 'جزئي' :
                          'نقدي'
                        }
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(purchase)}
                          className="px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg hover:bg-red-100"
                        >
                          التفاصيل
                        </button>
                        {hasDebt && (
                          <button
                            type="button"
                            onClick={() => handleSettleSupplier(purchase)}
                            className="px-2.5 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100"
                          >
                            سداد
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">
                صفحة <span className="font-bold text-slate-800 dark:text-slate-200">{currentPage}</span> من {totalPages}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 5. Sub-Tab 2: Suppliers Directory */}
      {activeSubTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-600" />
                <span>دليل وسجل حسابات الموردين والشركات ({suppliersDirectory.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع إجمالي التعاملات، المبالغ المسددة، والديون الآجلة المستحقة لكل مورد مع إمكانية المراسلة والسداد الفوري
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block">إجمالي الآجل المستحق لكافة الموردين:</span>
              <span className="text-lg font-black text-red-600 dark:text-red-400">
                {formatCurrency(totalSupplierDebt)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {suppliersDirectory.map((supplier, idx) => {
              const hasDebt = supplier.totalDebt > 0;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3.5 hover:border-red-300 dark:hover:border-red-900/50 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center font-black text-sm">
                        {supplier.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate max-w-[170px]">
                          {supplier.name}
                        </h3>
                        <span className="text-[11px] text-slate-400">
                          {supplier.totalInvoices} فواتير مسجلة
                        </span>
                      </div>
                    </div>

                    {hasDebt ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
                        عليه آجل
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        خالص
                      </span>
                    )}
                  </div>

                  {/* Supplier Phone & WhatsApp */}
                  {supplier.phone ? (
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-xs">
                      <span className="font-mono text-slate-600 dark:text-slate-400" dir="ltr">
                        {formatPhone(supplier.phone)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const clean = cleanEgyptianPhone(supplier.phone);
                          const intl = clean.startsWith('0') ? '20' + clean.slice(1) : clean;
                          window.open(`https://wa.me/${intl}?text=${encodeURIComponent(`السلام عليكم أستاذ ${supplier.name} بخصوص حسابات المشتريات بمحل الأعصر كاش.`)}`, '_blank');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>مراسلة واتساب</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      لا يوجد رقم هاتف مسجل
                    </div>
                  )}

                  {/* Supplier Balance Stats */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">إجمالي التعاملات:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(supplier.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">المسدد له:</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(supplier.totalPaid)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">المتبقي له:</span>
                      <span className={`font-black ${hasDebt ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                        {hasDebt ? formatCurrency(supplier.totalDebt) : 'خالص'}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(supplier.name);
                        setActiveSubTab('invoices');
                      }}
                      className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-red-600 hover:underline flex items-center gap-1"
                    >
                      <span>عرض فواتير المورد</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    {hasDebt && (
                      <button
                        type="button"
                        onClick={() => handleSettleSupplier(supplier.latestInvoice)}
                        className="btn-interactive flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold shadow-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>سداد دفعة</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Sub-Tab 3: Net Profit & Analytics View */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-5">
          
          {/* Main Profit Calculation Hero Box */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white shadow-xl space-y-5 border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>تحليل وحساب صافي الربح التشغيلي للمحل</span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  معادلة المحاسبة الدقيقة: (إجمالي أرباح المبيعات + عمولات الكاش) - مصروفات المحل العامة
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400 block">صافي الربح الفعلي:</span>
                <span className={`text-xl sm:text-3xl font-black ${
                  analyticsData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(analyticsData.netProfit)}
                </span>
              </div>
            </div>

            {/* Visual Formula Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
              
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] text-slate-400 block mb-1">1. إجمالي إيرادات بيع البضاعة</span>
                <span className="text-base sm:text-lg font-black text-white">
                  {formatCurrency(analyticsData.totalSalesRevenue)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] text-slate-400 block mb-1">2. تكلفة البضاعة المباعة (شراء)</span>
                <span className="text-base sm:text-lg font-black text-rose-300">
                  - {formatCurrency(analyticsData.totalSalesCost)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] text-slate-400 block mb-1">3. عمولات تحويلات الكاش والخطوط</span>
                <span className="text-base sm:text-lg font-black text-emerald-300">
                  + {formatCurrency(analyticsData.transferFees)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] text-slate-400 block mb-1">4. المصروفات التشغيلية للمحل</span>
                <span className="text-base sm:text-lg font-black text-amber-300">
                  - {formatCurrency(analyticsData.storeExpenses)}
                </span>
              </div>

            </div>
          </div>

          {/* Breakdown of General Expenses by Category */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-red-600" />
              <span>توزيع المصروفات العامة حسب البند</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(analyticsData.expenseByCategory).map(([catId, amount]) => {
                const percent = generalExpensesTotal > 0 ? Math.round((amount / generalExpensesTotal) * 100) : 0;

                const categoryLabels = {
                  electricity: 'كهرباء ومرافق',
                  rent: 'إيجار المحل',
                  maintenance: 'صيانة وتجهيزات',
                  hospitality: 'بوفيه ومشروبات',
                  printing: 'أكياس ومطبوعات ودعاية',
                  salaries: 'رواتب وعمالة',
                  transport: 'شحن ونقل',
                  internet: 'إنترنت واشتراكات',
                  other: 'نثريات ومصروفات أخرى'
                };

                return (
                  <div 
                    key={catId} 
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {categoryLabels[catId] || catId}
                      </span>
                      <span className="font-black text-slate-900 dark:text-slate-100">
                        {formatCurrency(amount)}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>نسبة من إجمالي المصاريف</span>
                      <span className="font-bold">{percent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
