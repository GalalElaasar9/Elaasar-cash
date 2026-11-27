import React, { useState, useMemo, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import { getPersistedNavValue, setPersistedNavValue } from '../utils/storage';
import { 
  formatCurrency, 
  formatNumber, 
  formatPhone, 
  calculateWalletStats, 
  getEgyptianCarrier,
  getTodayString 
} from '../utils/formatters';
import { 
  Package, 
  Smartphone, 
  Headphones, 
  Plus, 
  Search, 
  AlertTriangle, 
  ShoppingBag, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  Palette, 
  Edit2, 
  Trash2, 
  PackagePlus, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  Eye,
  LayoutGrid,
  Table as TableIcon,
  Image as ImageIcon,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Layers,
  Lock,
  Calendar,
  ArrowDownToLine,
  Send,
  Copy,
  Check,
  History,
  X,
  Filter,
  Zap,
  Building2,
  CreditCard,
  Coins
} from 'lucide-react';

export default function InventoryView() {
  const { 
    inventory, 
    shopWallets,
    instapayAccounts = [],
    deleteInstapayAccount,
    transactions,
    setActiveModal, 
    setModalData, 
    deleteProduct, 
    deleteShopWallet,
    handleResetInventoryDemo,
    showToast,
    askConfirm,
    lowStockProductsCount,
    outOfStockCount,
    totalInventoryUnits,
    totalInventoryCost,
    totalInventorySaleValue,
    totalPhonesCount,
    totalAccessoriesCount
  } = useCash();

  const [inventorySection, setInventorySection] = useState(() =>
    getPersistedNavValue('elaasar_inventory_section', 'devices', ['devices', 'shop_wallets', 'shop_instapay'])
  );

  useEffect(() => {
    setPersistedNavValue('elaasar_inventory_section', inventorySection);
  }, [inventorySection]);
  const [instapaySearch, setInstapaySearch] = useState('');
  const [copiedInstapayHandle, setCopiedInstapayHandle] = useState(null);

  const filteredInstapayAccounts = useMemo(() => {
    if (!instapaySearch.trim()) return instapayAccounts;
    const q = instapaySearch.trim().toLowerCase();
    return instapayAccounts.filter(acc => 
      (acc.accountName || '').toLowerCase().includes(q) ||
      (acc.bankName || '').toLowerCase().includes(q) ||
      (acc.handle || '').toLowerCase().includes(q) ||
      (acc.phone || '').includes(q)
    );
  }, [instapayAccounts, instapaySearch]);

  const totalInstapayBalance = useMemo(() => {
    return instapayAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [instapayAccounts]);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all'); // 'all' | 'phones' | 'accessories' | 'low_stock' | 'out_of_stock'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' (default requested) | 'grid'
  const [openMenuProductId, setOpenMenuProductId] = useState(null); // Active 3-dots popover
  const [currentPage, setCurrentPage] = useState(1); // Pagination page

  const ITEMS_PER_PAGE = 6; // User requested: pagination when > 6 items

  // ==========================================
  // SHOP PERSONAL WALLETS / LINES LOGIC (خطوط المحل)
  // ==========================================
  const [shopSearch, setShopSearch] = useState('');
  const [shopFilterStatus, setShopFilterStatus] = useState('all'); // 'all' | 'safe' | 'near' | 'exhausted'
  const [shopCurrentPage, setShopCurrentPage] = useState(1);
  const [copiedPhone, setCopiedPhone] = useState(null);
  const [activeHistoryWalletId, setActiveHistoryWalletId] = useState(null);

  // Close history popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!activeHistoryWalletId) return;

    const handleGlobalClick = (e) => {
      if (e.target.closest('.shop-history-popover-container')) return;
      setActiveHistoryWalletId(null);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setActiveHistoryWalletId(null);
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeHistoryWalletId]);

  // All shop wallets with calculated stats and transactions
  const allShopWalletsWithStats = useMemo(() => {
    return (shopWallets || []).map(w => ({
      ...w,
      stats: calculateWalletStats(w, transactions),
      txList: transactions.filter(t => t.walletId === w.id)
    }));
  }, [shopWallets, transactions]);

  // Aggregate shop lines stats
  const totalShopBalance = useMemo(() => {
    return (shopWallets || []).reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
  }, [shopWallets]);

  const totalShopLimit = useMemo(() => {
    return allShopWalletsWithStats.reduce((sum, w) => sum + (w.stats.totalLimit || 200000), 0);
  }, [allShopWalletsWithStats]);

  const totalShopRemaining = useMemo(() => {
    return allShopWalletsWithStats.reduce((sum, w) => sum + (w.stats.remainingLimit || 0), 0);
  }, [allShopWalletsWithStats]);

  const totalShopTodayTransfers = useMemo(() => {
    return allShopWalletsWithStats.reduce((sum, w) => sum + (w.stats.todayTransfersOut || 0), 0);
  }, [allShopWalletsWithStats]);

  const totalShopLockedCount = useMemo(() => {
    return allShopWalletsWithStats.filter(w => w.stats.isLocked).length;
  }, [allShopWalletsWithStats]);

  // Counts for filter tabs
  const shopSafeCount = useMemo(() => allShopWalletsWithStats.filter(w => w.stats.isSafe).length, [allShopWalletsWithStats]);
  const shopNearCount = useMemo(() => allShopWalletsWithStats.filter(w => w.stats.isNearLimit).length, [allShopWalletsWithStats]);
  const shopExhaustedCount = useMemo(() => allShopWalletsWithStats.filter(w => w.stats.isExhausted).length, [allShopWalletsWithStats]);

  // Filtered shop wallets
  const filteredShopWallets = useMemo(() => {
    return allShopWalletsWithStats.filter(w => {
      if (shopFilterStatus === 'safe' && !w.stats.isSafe) return false;
      if (shopFilterStatus === 'near' && !w.stats.isNearLimit) return false;
      if (shopFilterStatus === 'exhausted' && !w.stats.isExhausted) return false;

      if (shopSearch.trim()) {
        const q = shopSearch.toLowerCase().trim();
        return (
          w.phoneNumber.includes(q) ||
          w.label.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allShopWalletsWithStats, shopFilterStatus, shopSearch]);

  // Reset shop page when filters change
  useEffect(() => {
    setShopCurrentPage(1);
  }, [shopFilterStatus, shopSearch]);

  const SHOP_ITEMS_PER_PAGE = 6;
  const totalShopPages = Math.ceil(filteredShopWallets.length / SHOP_ITEMS_PER_PAGE) || 1;
  const validShopPage = Math.min(Math.max(1, shopCurrentPage), totalShopPages);

  const paginatedShopWallets = useMemo(() => {
    const start = (validShopPage - 1) * SHOP_ITEMS_PER_PAGE;
    return filteredShopWallets.slice(start, start + SHOP_ITEMS_PER_PAGE);
  }, [filteredShopWallets, validShopPage]);

  // Handlers for shop wallets
  const handleCopyPhone = (phone, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    showToast(`تم نسخ رقم خط المحل: ${phone}`);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleShopQuickTransfer = (wallet) => {
    setModalData({
      clientId: 'shop',
      clientName: 'أرقام وخطوط المحل',
      walletId: wallet.id,
      wallet,
      isShopWallet: true
    });
    setActiveModal('transfer');
  };

  const handleShopRecharge = (wallet) => {
    setModalData({
      clientId: 'shop',
      clientName: 'أرقام وخطوط المحل',
      wallet,
      isShopWallet: true
    });
    setActiveModal('rechargeWallet');
  };

  const handleShopEdit = (wallet) => {
    setModalData({
      clientId: 'shop',
      clientName: 'أرقام وخطوط المحل',
      wallet,
      isShopWallet: true
    });
    setActiveModal('editLimit');
  };

  const handleShopDelete = async (wallet) => {
    const confirmed = await askConfirm({
      title: 'حذف خط المحل',
      message: `هل أنت متأكد من حذف خط المحل (${wallet.phoneNumber})؟`,
      details: 'سيتم نقله إلى سلة المحذوفات، ويمكنك استعادته في أي وقت بكافة عملياته.',
      type: 'warning',
      confirmText: 'نعم، احذف الخط',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      deleteShopWallet(wallet.id);
    }
  };

  const handleToggleMenu = (productId, e) => {
    e.stopPropagation();
    setOpenMenuProductId(prev => prev === productId ? null : productId);
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return inventory.filter(p => {
      // Category / Status Filter
      if (activeCategoryFilter === 'phones' && p.category !== 'phones') return false;
      if (activeCategoryFilter === 'accessories' && p.category === 'phones') return false;
      if (activeCategoryFilter === 'low_stock') {
        const threshold = p.minStockAlert !== undefined ? p.minStockAlert : 5;
        if (p.totalQuantity >= threshold || p.totalQuantity === 0) return false;
      }
      if (activeCategoryFilter === 'out_of_stock' && p.totalQuantity > 0) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchBrand = p.brand?.toLowerCase().includes(q);
        const matchStorage = p.storage?.toLowerCase().includes(q);
        const matchNotes = p.notes?.toLowerCase().includes(q);
        const matchColor = (p.variants || []).some(v => v.color?.toLowerCase().includes(q));
        return matchName || matchBrand || matchStorage || matchNotes || matchColor;
      }

      return true;
    });
  }, [inventory, activeCategoryFilter, searchQuery]);

  // Reset page to 1 when filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategoryFilter, searchQuery]);

  // Pagination computations (6 items per page)
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (validPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, validPage]);

  // Open Details Modal with Eye Icon
  const handleOpenDetails = (product) => {
    setModalData({ product });
    setActiveModal('productDetails');
  };

  // Handle Quick Sell
  const handleOpenSell = (product) => {
    if (product.totalQuantity <= 0) {
      showToast('هذا المنتج نفد من المخزون بالكامل (0 قطع)! يرجى توريد كمية جديدة أولاً.', 'error');
      return;
    }
    setModalData({ product });
    setActiveModal('sellProduct');
  };

  // Handle Quick Restock
  const handleOpenRestock = (product) => {
    setModalData({ product });
    setActiveModal('restockProduct');
  };

  // Handle Edit
  const handleOpenEdit = (product) => {
    setModalData({ product });
    setActiveModal('addProduct');
  };

  // Handle Delete with custom in-app popup
  const handleDelete = async (product) => {
    const ok = await askConfirm({
      title: 'حذف منتج من المخزون',
      message: `هل أنت متأكد من رغبتك في حذف الصنف "${product.name}"؟`,
      details: `سيتم نقل الصنف وكافة كمياته (${product.totalQuantity} قطع) وصوره إلى "سلة المحذوفات"، ويمكنك استعادته في أي وقت.`,
      type: 'warning',
      confirmText: 'نعم، انقل للمحذوفات',
      cancelText: 'إلغاء'
    });

    if (ok) {
      deleteProduct(product.id);
    }
  };

  // Export Inventory to Excel/CSV
  const handleExportCSV = () => {
    if (inventory.length === 0) {
      showToast('لا توجد منتجات لتصديرها', 'info');
      return;
    }

    const headers = [
      'القسم',
      'الماركة',
      'اسم الصنف / الموديل',
      'المساحة / المواصفات',
      'تفاصيل الألوان والكميات',
      'إجمالي الكمية (قطع)',
      'سعر الشراء (التكلفة)',
      'سعر البيع',
      'حالة المخزون',
      'ملاحظات'
    ];

    const rows = inventory.map(p => {
      const colorBreakdown = (p.variants || []).map(v => `${v.color}: ${v.quantity}`).join(' | ');
      const statusText = p.totalQuantity === 0 
        ? 'نفد المخزون' 
        : p.totalQuantity < (p.minStockAlert || 5) 
        ? `اقترب من النفاد (< ${p.minStockAlert || 5})` 
        : 'متوفر';

      return [
        p.category === 'phones' ? 'هواتف محمولة' : 'إكسسوارات',
        `"${p.brand || ''}"`,
        `"${p.name || ''}"`,
        `"${p.storage || ''}"`,
        `"${colorBreakdown}"`,
        p.totalQuantity,
        p.costPrice,
        p.salePrice,
        `"${statusText}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `مخزون-محل-الهواتف-${getTodayString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف إكسل للمخزون بنجاح');
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Click-outside transparent backdrop for 3-dots popover */}
      {openMenuProductId && (
        <div 
          className="fixed inset-0 z-40 bg-transparent cursor-default" 
          onClick={() => setOpenMenuProductId(null)} 
        />
      )}
      
      {/* Top Segmented Tab Switcher: Devices & Accessories vs Shop Phone Lines */}
      <div className="flex items-center justify-center my-1">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <button
            onClick={() => setInventorySection('devices')}
            className={`btn-interactive flex items-center justify-center gap-2 px-5 py-2 text-xs sm:text-sm font-black rounded-xl transition-all ${
              inventorySection === 'devices'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 text-amber-500" />
            <span>الأجهزة والإكسسوارات</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200/70 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
              {inventory.length}
            </span>
          </button>

          <button
            onClick={() => setInventorySection('shop_wallets')}
            className={`btn-interactive flex items-center justify-center gap-2 px-5 py-2 text-xs sm:text-sm font-black rounded-xl transition-all ${
              inventorySection === 'shop_wallets'
                ? 'bg-red-600 text-white shadow-xs shadow-red-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>أرقام وخطوط المحل (فودافون كاش)</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
              inventorySection === 'shop_wallets' ? 'bg-white/20 text-white' : 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
            }`}>
              {shopWallets?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setInventorySection('shop_instapay')}
            className={`btn-interactive flex items-center justify-center gap-2 px-5 py-2 text-xs sm:text-sm font-black rounded-xl transition-all ${
              inventorySection === 'shop_instapay'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs shadow-purple-600/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>حسابات إنستاباي - InstaPay</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
              inventorySection === 'shop_instapay' ? 'bg-white/20 text-white' : 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
            }`}>
              {instapayAccounts?.length || 0}
            </span>
          </button>
        </div>
      </div>

      {inventorySection === 'devices' && (
        <div className="space-y-6">
      
      {/* 1. Header and Fast Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 sm:gap-4">
        
        {/* Title & Icon */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-700 text-white font-bold flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">
                <span>مخزون الهواتف والإكسسوارات</span>
              </h2>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 shrink-0 whitespace-nowrap">
                محل خدمات المحمول
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
              التحكم بالألوان والكميات، والتنبيه بالنواقص وجرد الأصناف
            </p>
          </div>
        </div>

        {/* Action Buttons: Unified height & full-width balance on mobile */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          
          <button
            onClick={() => {
              setModalData(null);
              setActiveModal('addProduct');
            }}
            className="btn-interactive flex-1 md:flex-initial h-10 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-600/25 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>إضافة هاتف أو منتج</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-interactive shrink-0 h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 font-bold text-xs shadow-xs"
            title="تصدير كشف المخزون كملف إكسل"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">تصدير إكسل</span>
          </button>

          <button
            onClick={async () => {
              const ok = await askConfirm({
                title: 'استعادة نماذج المخزون',
                message: 'هل ترغب في إعادة تحميل نماذج الهواتف والإكسسوارات الافتراضية؟',
                details: 'سيتم استرجاع النماذج مع الألوان والكميات المحددة.',
                type: 'warning',
                confirmText: 'نعم، استعادة',
                cancelText: 'إلغاء'
              });
              if (ok) handleResetInventoryDemo();
            }}
            className="btn-interactive shrink-0 h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs"
            title="استعادة النماذج الافتراضية"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* 2. KPI Cards (Shop & Inventory Overview) - 1 card per row on mobile as requested */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Units in Stock */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي القطع بالمخزن
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {formatNumber(totalInventoryUnits)}{' '}
            <span className="text-xs font-semibold text-slate-400">قطعة</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>هواتف: <strong>{totalPhonesCount}</strong></span>
            <span>إكسسوارات: <strong>{totalAccessoriesCount}</strong></span>
          </div>
        </div>

        {/* Low Stock Alert (< 5 units) - HIGHLIGHTED */}
        <div 
          onClick={() => setActiveCategoryFilter('low_stock')}
          className={`cursor-pointer p-4 sm:p-5 rounded-2xl border shadow-sm transition-all ${
            lowStockProductsCount > 0
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 hover:scale-[1.02]'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>نواقص المخزون (&lt; 5)</span>
            </span>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {lowStockProductsCount}{' '}
            <span className="text-xs font-bold">أصناف تحتاج طلب</span>
          </div>
          <span className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 block font-semibold">
            {lowStockProductsCount > 0 ? 'اضغط لعرض النواقص فقط ←' : 'المخزون كافٍ ومستقر'}
          </span>
        </div>

        {/* Inventory Cost Value (رأس مال البضاعة) */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              رأس مال البضاعة (التكلفة)
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            {formatCurrency(totalInventoryCost)}
          </div>
          <span className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 block">
            قيمة المخزون الحالي بسعر الجملة
          </span>
        </div>

        {/* Expected Sale Revenue & Profit */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              القيمة البيعية المتوقعة
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(totalInventorySaleValue)}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>مجمل الربح المتوقع:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              +{formatCurrency(Math.max(0, totalInventorySaleValue - totalInventoryCost))}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Filters, Search Bar, and View Toggle */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Category Pills - Single unified row side-by-side (no wrapping) */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 p-1 sm:p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold overflow-x-auto whitespace-nowrap max-w-full">
          <button
            onClick={() => setActiveCategoryFilter('all')}
            className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
              activeCategoryFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            الكل ({inventory.length})
          </button>

          <button
            onClick={() => setActiveCategoryFilter('phones')}
            className={`shrink-0 flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
              activeCategoryFilter === 'phones'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>هواتف ({totalPhonesCount})</span>
          </button>

          <button
            onClick={() => setActiveCategoryFilter('accessories')}
            className={`shrink-0 flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
              activeCategoryFilter === 'accessories'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>إكسسوارات ({totalAccessoriesCount})</span>
          </button>

          {/* LOW STOCK FILTER */}
          <button
            onClick={() => setActiveCategoryFilter('low_stock')}
            className={`shrink-0 flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
              activeCategoryFilter === 'low_stock'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-100/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>نواقص <span className="hidden sm:inline">(&lt; 5)</span> ({lowStockProductsCount})</span>
          </button>

          {outOfStockCount > 0 && (
            <button
              onClick={() => setActiveCategoryFilter('out_of_stock')}
              className={`shrink-0 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
                activeCategoryFilter === 'out_of_stock'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-100/50'
              }`}
            >
              نفد ({outOfStockCount})
            </button>
          )}
        </div>

        {/* Right side: Search + View Toggle (Table vs Grid) */}
        <div className="flex items-center gap-2">
          
          {/* Search */}
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث بموديل، ماركة، أو لون..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-9 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
              title="عرض في جدول مضغوط (توفير المساحة)"
            >
              <TableIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
              title="عرض شبكي (كروت)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* 4. Products Display (TABLE VIEW by default as requested) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
            {searchQuery ? 'لا توجد منتجات مطابقة للبحث' : 'لا توجد منتجات مسجلة في هذا القسم'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {searchQuery 
              ? `لم يتم العثور على أصناف أو ألوان تطابق "${searchQuery}".`
              : 'ابدأ الآن بإضافة أول هاتف أو إكسسوار مع رفع الصور وتحديد الألوان والكميات.'}
          </p>
          <button
            onClick={() => {
              setModalData(null);
              setActiveModal('addProduct');
            }}
            className="btn-interactive inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        
        /* TABLE VIEW (جدول لتوفير المساحة وتنظيم الشكل) */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 w-16 text-center">الصورة</th>
                  <th className="py-3 px-4 min-w-[240px] sm:min-w-[280px]">الموديل والماركة</th>
                  <th className="py-3 px-3 min-w-[190px]">الألوان والكميات المتاحة</th>
                  <th className="py-3 px-3 whitespace-nowrap">الرصيد والحالة</th>
                  <th className="py-3 px-3 whitespace-nowrap">سعر التكلفة</th>
                  <th className="py-3 px-3 whitespace-nowrap">سعر البيع (الربح)</th>
                  <th className="py-3 px-3 text-center w-28">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedProducts.map((product, index) => {
                  const isPhone = product.category === 'phones';
                  const threshold = product.minStockAlert !== undefined ? product.minStockAlert : 5;
                  const isLow = product.totalQuantity > 0 && product.totalQuantity < threshold;
                  const isOut = product.totalQuantity === 0;
                  const unitProfit = Math.max(0, (product.salePrice || 0) - (product.costPrice || 0));
                  const mainImg = product.images?.[0] || null;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isOut 
                          ? 'bg-rose-50/20' 
                          : isLow 
                          ? 'bg-amber-50/20' 
                          : ''
                      }`}
                    >
                      {/* # Number (continuous across pages) */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-xs font-bold border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                          {(validPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </span>
                      </td>

                      {/* Thumbnail Image (Clickable for Eye Details) */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleOpenDetails(product)}
                          className="relative w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs overflow-hidden flex items-center justify-center group/thumb hover:border-red-400 dark:hover:border-red-500 hover:shadow-xs transition-all mx-auto"
                          title="اضغط لعرض تفاصيل وصور المنتج"
                        >
                          {mainImg ? (
                            <img src={mainImg} alt={product.name} className="w-full h-full object-contain p-1 group-hover/thumb:scale-105 transition-transform" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                          )}
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
                            <Eye className="w-4 h-4" />
                          </div>
                          {product.images?.length > 1 && (
                            <span 
                              dir="ltr"
                              className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-black font-mono bg-slate-950/85 backdrop-blur-xs text-white rounded-md shadow-xs leading-none"
                            >
                              +{product.images.length - 1}
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Model & Brand */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col justify-center min-w-0">
                          {/* Product Name (Priority line, crisp & clickable) */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenDetails(product)}
                              className="text-right font-black text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight hover:text-red-600 dark:hover:text-red-400 transition-colors leading-snug"
                              dir="auto"
                              title="اضغط لعرض تفاصيل وصور المنتج"
                            >
                              {product.name}
                            </button>
                          </div>

                          {/* Metadata row: Brand • Category Tag • Storage / Specs */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 flex-wrap">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              {product.brand}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isPhone 
                                ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200/60 dark:border-red-900/40' 
                                : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40'
                            }`}>
                              {isPhone ? 'هاتف' : 'إكسسوار'}
                            </span>
                            {product.storage && (
                              <>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap shadow-2xs">
                                  {product.storage}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Color variants with dot chips */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(product.variants || []).map((v) => {
                            const hasQty = v.quantity > 0;
                            return (
                              <span
                                key={v.color}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                                  hasQty
                                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                                    : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 line-through'
                                }`}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                                  style={{ backgroundColor: v.hex || '#1e293b' }}
                                />
                                <span>{v.color}:</span>
                                <strong className={`font-mono ${hasQty ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                                  {v.quantity}
                                </strong>
                              </span>
                            );
                          })}
                        </div>
                      </td>

                      {/* Stock Quantity & Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-black text-slate-900 dark:text-white text-sm font-mono">
                            {product.totalQuantity} <span className="text-[10px] text-slate-400 font-normal">قطع</span>
                          </span>

                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              ⛔ نفد
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                              ⚠️ نواقص (&lt; {threshold})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              متوفر
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        {formatCurrency(product.costPrice)}
                      </td>

                      {/* Sale Price & Profit */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                          {formatCurrency(product.salePrice)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ربح: +{formatCurrency(unitProfit)}
                        </div>
                      </td>

                      {/* Actions Column (3-Dots Popover + Quick Sell) */}
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          
                          {/* 1. Quick Sell Button */}
                          <button
                            onClick={() => handleOpenSell(product)}
                            disabled={isOut}
                            className={`btn-interactive flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all ${
                              isOut
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                            }`}
                            title="تسجيل بيع فوري"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>بيع</span>
                          </button>

                          {/* 2. 3-Dots Action Popover Menu */}
                          <div className="relative inline-block text-right">
                            <button
                              onClick={(e) => handleToggleMenu(product.id, e)}
                              className={`btn-interactive p-1.5 rounded-xl border transition-all duration-150 flex items-center justify-center ${
                                openMenuProductId === product.id
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                              title="خيارات المنتج (المزيد)"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Floating Popover Menu */}
                            {openMenuProductId === product.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute left-0 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-popover text-right text-xs ${
                                  index >= Math.max(1, filteredProducts.length - 2)
                                    ? 'bottom-full mb-1.5 origin-bottom-left'
                                    : 'top-full mt-1.5 origin-top-left'
                                }`}
                              >
                                {/* 1. Eye: View Details & Photos */}
                                <button
                                  onClick={() => {
                                    setOpenMenuProductId(null);
                                    handleOpenDetails(product);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-colors"
                                >
                                  <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                    <Eye className="w-3.5 h-3.5" />
                                  </div>
                                  <span>عرض التفاصيل والصور</span>
                                </button>

                                {/* 2. Sell Product */}
                                <button
                                  onClick={() => {
                                    setOpenMenuProductId(null);
                                    handleOpenSell(product);
                                  }}
                                  disabled={isOut}
                                  className={`w-full flex items-center justify-between px-3.5 py-2 font-bold transition-colors ${
                                    isOut
                                      ? 'opacity-50 cursor-not-allowed text-slate-400'
                                      : 'text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 dark:hover:text-emerald-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                      <ShoppingBag className="w-3.5 h-3.5" />
                                    </div>
                                    <span>تسجيل بيع فوري</span>
                                  </div>
                                  {isOut && (
                                    <span className="text-[10px] text-rose-500 font-semibold">نفد</span>
                                  )}
                                </button>

                                {/* 3. Restock Quantity */}
                                <button
                                  onClick={() => {
                                    setOpenMenuProductId(null);
                                    handleOpenRestock(product);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-colors"
                                >
                                  <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                                    <PackagePlus className="w-3.5 h-3.5" />
                                  </div>
                                  <span>توريد / إضافة كميات</span>
                                </button>

                                {/* 4. Edit Product */}
                                <button
                                  onClick={() => {
                                    setOpenMenuProductId(null);
                                    handleOpenEdit(product);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-bold transition-colors"
                                >
                                  <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </div>
                                  <span>تعديل الصنف والأسعار</span>
                                </button>

                                {/* Divider */}
                                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                                {/* 5. Delete Product */}
                                <button
                                  onClick={() => {
                                    setOpenMenuProductId(null);
                                    handleDelete(product);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold transition-colors"
                                >
                                  <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </div>
                                  <span>حذف من المخزون</span>
                                </button>
                              </div>
                            )}
                          </div>

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

        /* GRID / CARDS VIEW (كروت) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedProducts.map(product => {
            const isPhone = product.category === 'phones';
            const threshold = product.minStockAlert !== undefined ? product.minStockAlert : 5;
            const isLow = product.totalQuantity > 0 && product.totalQuantity < threshold;
            const isOut = product.totalQuantity === 0;
            const unitProfit = Math.max(0, (product.salePrice || 0) - (product.costPrice || 0));
            const mainImg = product.images?.[0] || null;

            return (
              <div
                key={product.id}
                className={`card-hover bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm transition-all duration-300 flex flex-col justify-between ${
                  isOut 
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
                    : isLow
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                <div>
                  
                  {/* Top: Image thumbnail + Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <button
                      onClick={() => handleOpenDetails(product)}
                      className="relative w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs overflow-hidden shrink-0 flex items-center justify-center group/gthumb hover:border-red-400 dark:hover:border-red-500 transition-all"
                      title="اضغط لعرض تفاصيل وصور المنتج"
                    >
                      {mainImg ? (
                        <img src={mainImg} alt={product.name} className="w-full h-full object-contain p-1 group-hover/gthumb:scale-105 transition-transform" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                      )}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/gthumb:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
                        <Eye className="w-4 h-4" />
                      </div>
                      {product.images?.length > 1 && (
                        <span 
                          dir="ltr"
                          className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-black font-mono bg-slate-950/85 backdrop-blur-xs text-white rounded-md shadow-xs leading-none"
                        >
                          +{product.images.length - 1}
                        </span>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{product.brand}</span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            isPhone 
                              ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200/60 dark:border-red-900/40' 
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40'
                          }`}>
                            {isPhone ? 'هاتف' : 'إكسسوار'}
                          </span>
                        </div>
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                            ⛔ نفد
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse shrink-0">
                            ⚠️ نواقص (&lt; {threshold})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                            متوفر
                          </span>
                        )}
                      </div>

                      <h3 
                        onClick={() => handleOpenDetails(product)}
                        className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer line-clamp-1"
                        title={product.name}
                      >
                        {product.name}
                      </h3>
                      {product.storage && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap shadow-2xs">
                            {product.storage}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Color breakdown */}
                  <div className="mb-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                      <span>الألوان والكميات:</span>
                      <span className="font-mono">إجمالي: {product.totalQuantity} ق</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(product.variants || []).map(v => (
                        <span
                          key={v.color}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                        >
                          <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: v.hex || '#1e293b' }} />
                          <span>{v.color}:</span>
                          <strong className="text-red-600 font-mono">{v.quantity}</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Price Bar */}
                  <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 mb-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">سعر البيع:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                        {formatCurrency(product.salePrice)}
                      </strong>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">الربح التقديري:</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-mono">
                        +{formatCurrency(unitProfit)}
                      </strong>
                    </div>
                  </div>

                </div>

                {/* Actions: Quick Sell + 3-Dots Action Popover */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenSell(product)}
                    disabled={isOut}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>تسجيل بيع</span>
                  </button>

                  {/* 3-Dots Action Popover Menu */}
                  <div className="relative inline-block text-right">
                    <button
                      onClick={(e) => handleToggleMenu(product.id, e)}
                      className={`btn-interactive p-2 rounded-xl border transition-all duration-150 flex items-center justify-center ${
                        openMenuProductId === product.id
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                      title="المزيد من الإجراءات"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Popover Dropdown Menu */}
                    {openMenuProductId === product.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 bottom-full mb-1.5 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-popover text-right text-xs"
                      >
                        {/* 1. Eye: View Details & Photos */}
                        <button
                          onClick={() => {
                            setOpenMenuProductId(null);
                            handleOpenDetails(product);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-colors"
                        >
                          <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                          <span>عرض التفاصيل والصور</span>
                        </button>

                        {/* 2. Restock Quantity */}
                        <button
                          onClick={() => {
                            setOpenMenuProductId(null);
                            handleOpenRestock(product);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-colors"
                        >
                          <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            <PackagePlus className="w-3.5 h-3.5" />
                          </div>
                          <span>توريد / إضافة كميات</span>
                        </button>

                        {/* 3. Edit Product */}
                        <button
                          onClick={() => {
                            setOpenMenuProductId(null);
                            handleOpenEdit(product);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-bold transition-colors"
                        >
                          <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <Edit2 className="w-3.5 h-3.5" />
                          </div>
                          <span>تعديل الصنف والأسعار</span>
                        </button>

                        {/* Divider */}
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                        {/* 4. Delete Product */}
                        <button
                          onClick={() => {
                            setOpenMenuProductId(null);
                            handleDelete(product);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold transition-colors"
                        >
                          <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </div>
                          <span>حذف من المخزون</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. Pagination Bar (Only rendered if products count > 6 as requested) */}
      {filteredProducts.length > ITEMS_PER_PAGE && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Items range & total count */}
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center sm:text-right">
            <span>عرض الأصناف من </span>
            <strong className="text-slate-900 dark:text-white font-mono">
              {(validPage - 1) * ITEMS_PER_PAGE + 1}
            </strong>
            <span> إلى </span>
            <strong className="text-slate-900 dark:text-white font-mono">
              {Math.min(filteredProducts.length, validPage * ITEMS_PER_PAGE)}
            </strong>
            <span> من إجمالي </span>
            <strong className="text-red-600 dark:text-red-400 font-mono">
              {filteredProducts.length}
            </strong>
            <span> صنف بالمخزن</span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            
            {/* Previous Page Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={validPage === 1}
              className="btn-interactive flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-xs"
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            {/* Numeric Page Buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                const isActive = page === validPage;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`btn-interactive w-8 h-8 rounded-xl font-bold font-mono text-xs flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm shadow-red-600/30'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Next Page Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validPage === totalPages}
              className="btn-interactive flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-xs"
              title="الصفحة التالية"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

          </div>

        </div>
      )}

        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: SHOP PERSONAL WALLETS & LINES                */}
      {/* ======================================================== */}
      {inventorySection === 'shop_wallets' && (
        <div className="space-y-6">

          {/* 1. Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-700 text-white font-bold flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">
                    أرقام وخطوط المحل الشخصية (فودافون كاش)
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 shrink-0">
                    {shopWallets.length} خطوط مسجلة
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                  إدارة خطوط وسيم كارت المحل، مراقبة حد التحويل الشهري (200,000 ج.م) واليومي (60,000 ج.م)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setModalData({
                    clientId: 'shop',
                    clientName: 'أرقام وخطوط المحل',
                    isShopWallet: true
                  });
                  setActiveModal('transfer');
                }}
                className="btn-interactive flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-sm shadow-red-600/25"
                title="تسجيل تحويل كاش من أحد خطوط المحل"
              >
                <Send className="w-4 h-4 rotate-180" />
                <span>تحويل كاش من خطوط المحل</span>
              </button>

              <button
                onClick={() => {
                  setModalData({ isShopWallet: true });
                  setActiveModal('addWallet');
                }}
                className="btn-interactive flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة رقم جديد للمحل</span>
              </button>
            </div>
          </div>

          {/* 2. Top KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Total Lines */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 block leading-tight">إجمالي خطوط المحل</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                  {shopWallets.length} <span className="text-xs font-normal text-slate-400">خط</span>
                </span>
              </div>
            </div>

            {/* Total Liquid Cash in Lines */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40">
                <Coins className="w-5 h-5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 block leading-tight">رصيد السيولة بالخطوط</span>
                <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono truncate block">
                  {formatCurrency(totalShopBalance)}
                </span>
              </div>
            </div>

            {/* Total Limit */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 block leading-tight">إجمالي الليميت الشهري</span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono truncate block">
                  {formatCurrency(totalShopLimit)}
                </span>
              </div>
            </div>

            {/* Total Remaining */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 block leading-tight">المتبقي من الليميت</span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono truncate block">
                  {formatCurrency(totalShopRemaining)}
                </span>
              </div>
            </div>

            {/* Today's Transfers */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40">
                <Send className="w-5 h-5 rotate-180" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 block leading-tight">تحويلات اليوم</span>
                <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono truncate block">
                  {formatCurrency(totalShopTodayTransfers)}
                </span>
              </div>
            </div>
          </div>

          {/* Locked lines warning banner if any */}
          {totalShopLockedCount > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="text-xs sm:text-sm font-bold">
                تنبيه: يوجد ({totalShopLockedCount}) خطوط مقفولة لتجاوز ليميت الـ 200,000 ج.م الشهري. تتجدد تلقائياً أول كل شهر جديد.
              </div>
            </div>
          )}

          {/* 3. Search and Status Filter */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                placeholder="بحث في خطوط المحل (الرقم أو اسم الخط)..."
                className="w-full pl-3.5 pr-10 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              {shopSearch && (
                <button
                  onClick={() => setShopSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs without color names */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                onClick={() => setShopFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  shopFilterStatus === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                الكل ({allShopWalletsWithStats.length})
              </button>

              <button
                onClick={() => setShopFilterStatus('safe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  shopFilterStatus === 'safe'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                متاح ({shopSafeCount})
              </button>

              <button
                onClick={() => setShopFilterStatus('near')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  shopFilterStatus === 'near'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                اقترب من الحد ({shopNearCount})
              </button>

              <button
                onClick={() => setShopFilterStatus('exhausted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  shopFilterStatus === 'exhausted'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                منتهي ({shopExhaustedCount})
              </button>
            </div>
          </div>

          {/* 4. Cards Grid */}
          {paginatedShopWallets.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Smartphone className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                لا توجد خطوط تطابق البحث أو الفلتر المحدد.
              </p>
              <button
                onClick={() => {
                  setShopSearch('');
                  setShopFilterStatus('all');
                }}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                <span>إعادة ضبط الفلاتر</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedShopWallets.map((wallet) => {
                const stats = wallet.stats;
                const isNear = stats.isNearLimit;
                const isExhausted = stats.isExhausted;
                const isHistoryOpen = activeHistoryWalletId === wallet.id;
                const carrier = getEgyptianCarrier(wallet.phoneNumber);

                return (
                  <div
                    key={wallet.id}
                    className="relative bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-900/60 shadow-sm transition-all duration-200 group flex flex-col justify-between"
                  >
                    {/* Top Row: Label, Carrier & Locked Badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {wallet.label || 'خط المحل'}
                        </span>
                        {carrier && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 shrink-0">
                            {carrier.name}
                          </span>
                        )}
                        {stats.totalLimit !== 200000 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 shrink-0">
                            ليميت مخصص
                          </span>
                        )}
                        {stats.isOverBalanceCap && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-900/50 shrink-0 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            متجاوز الليميت (+{formatCurrency(stats.overBalanceAmount)})
                          </span>
                        )}
                        {stats.isLocked && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 shrink-0 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            الرقم مقفول
                          </span>
                        )}
                      </div>

                      {/* Remaining Limit Badge */}
                      <div className="text-left shrink-0">
                        <span className="text-[10px] font-medium text-slate-400 block leading-tight">المتبقي من الليميت</span>
                        <span
                          className={`text-sm sm:text-lg font-black tracking-tight font-mono ${
                            isExhausted
                              ? 'text-rose-600 dark:text-rose-400'
                              : isNear
                              ? 'text-amber-500 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatCurrency(stats.remainingLimit)}
                        </span>
                      </div>
                    </div>

                    {/* Phone Number Display & Renewal Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black font-mono tracking-wider text-slate-900 dark:text-white" dir="ltr">
                          {formatPhone(wallet.phoneNumber)}
                        </span>
                        <button
                          onClick={(e) => handleCopyPhone(wallet.phoneNumber, e)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                          title="نسخ الرقم"
                        >
                          {copiedPhone === wallet.phoneNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Reset Date */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <Calendar className="w-3 h-3 text-red-500 shrink-0" />
                        <span>يتجدد في <strong className="text-slate-600 dark:text-slate-300">{stats.nextResetDateShort}</strong></span>
                      </div>
                    </div>

                    {/* Live Balance Box (رصيد السيولة بالخط) */}
                    <div className="flex items-center justify-between text-xs bg-rose-50/80 dark:bg-rose-950/40 px-3 py-2 rounded-xl border border-rose-200/80 dark:border-rose-900/40 mb-2.5">
                      <span className="text-rose-800 dark:text-rose-300 font-bold flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-rose-600" />
                        <span>رصيد السيولة بالخط (المتاح):</span>
                      </span>
                      <span className="font-black text-sm text-rose-700 dark:text-rose-200 font-mono">
                        {formatCurrency(wallet.balance !== undefined ? wallet.balance : 0)}
                      </span>
                    </div>

                    {/* Daily Transfer Limit & Remaining Box */}
                    <div className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 mb-2.5">
                      <span className="text-slate-500 dark:text-slate-400">
                        تحويلات اليوم: <strong className={stats.isDailyTransferExhausted ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>{formatCurrency(stats.todayTransfersOut)}</strong> / 60,000 ج.م
                      </span>
                      <span className={`font-bold font-mono ${stats.isDailyTransferExhausted ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {stats.isDailyTransferExhausted ? '🔒 اكتمل حد اليوم' : `متاح: ${formatCurrency(stats.remainingDailyTransfer)}`}
                      </span>
                    </div>

                    {/* Monthly Progress Bar of Limit */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          تم تحويل: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(stats.totalTransfersOut)}</strong>
                        </span>
                        <span>
                          الليميت الشهري: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(stats.totalLimit)}</strong>
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExhausted
                              ? 'bg-rose-600'
                              : isNear
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, stats.percentUsed)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          نسبة الاستهلاك: {stats.percentUsed}%
                        </span>
                        {stats.isLocked ? (
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                            <Lock className="w-3 h-3" />
                            الرقم مقفول لتجاوز الليميت الشهري
                          </span>
                        ) : stats.isDailyTransferExhausted ? (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                            <Lock className="w-3 h-3" />
                            اكتمل الحد اليومي (60 ألف)
                          </span>
                        ) : isNear ? (
                          <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            اقترب من الحد الأقصى
                          </span>
                        ) : stats.isOverBalanceCap ? (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            متجاوز الليميت المسموح
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            الليميت متاح
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons for this shop line */}
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-2.5 border-t border-slate-200/60 dark:border-slate-800">
                      {/* Direct Transfer Button or Locked */}
                      {stats.isLocked ? (
                        <button
                          disabled
                          className="flex-1 min-w-0 h-9 sm:h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold text-xs cursor-not-allowed border border-rose-300 dark:border-rose-800 shadow-none whitespace-nowrap"
                          title="تم قفل الرقم لتجاوز الليميت الشهري (200,000 ج.م)"
                        >
                          <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="truncate">الرقم مقفول (200 ألف)</span>
                        </button>
                      ) : stats.isDailyTransferExhausted ? (
                        <button
                          disabled
                          className="flex-1 min-w-0 h-9 sm:h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-xs cursor-not-allowed border border-amber-300 dark:border-amber-800 shadow-none whitespace-nowrap"
                          title="تم الوصول للحد اليومي للتحويل (60,000 ج.م في اليوم)"
                        >
                          <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">اكتمل حد اليوم (60 ألف)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleShopQuickTransfer(wallet)}
                          className="btn-interactive flex-1 min-w-0 h-9 sm:h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-sm shadow-red-600/25 whitespace-nowrap"
                          title="تحويل وخصم مباشر من ليميت هذا الخط"
                        >
                          <Send className="w-3.5 h-3.5 rotate-180 shrink-0" />
                          <span className="truncate">تحويل وخصم</span>
                        </button>
                      )}

                      {/* Recharge Balance Button */}
                      <button
                        onClick={() => handleShopRecharge(wallet)}
                        className="btn-interactive shrink-0 h-9 sm:h-10 px-2.5 sm:px-3 flex items-center justify-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-xs"
                        title="إضافة وشحن رصيد للخط (شحن واستقبال مفتوح)"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="inline">شحن</span>
                      </button>

                      {/* Edit limit / phone */}
                      <button
                        onClick={() => handleShopEdit(wallet)}
                        className="btn-interactive shrink-0 h-9 sm:h-10 px-2 sm:px-2.5 flex items-center justify-center gap-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs"
                        title="تعديل ليميت أو اسم الخط"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                        <span className="hidden xl:inline">الليميت</span>
                      </button>

                      {/* History Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHistoryWalletId(isHistoryOpen ? null : wallet.id);
                        }}
                        className={`btn-interactive shrink-0 h-9 sm:h-10 px-2.5 flex items-center justify-center gap-1 rounded-xl text-xs font-semibold border transition-colors shadow-xs ${
                          isHistoryOpen
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title="عرض العمليات الخاصة بهذا الخط"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span className="font-mono font-bold text-[11px]">({wallet.txList.length})</span>
                      </button>

                      {/* Delete Line */}
                      <button
                        onClick={() => handleShopDelete(wallet)}
                        className="btn-interactive shrink-0 h-9 sm:h-10 w-9 sm:w-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs transition-colors"
                        title="حذف هذا الخط"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Floating History Popover */}
                    {isHistoryOpen && (
                      <>
                        <div
                          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 sm:hidden animate-fadeIn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHistoryWalletId(null);
                          }}
                        />

                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="shop-history-popover-container fixed sm:absolute inset-x-3 bottom-4 sm:inset-x-2 sm:bottom-14 max-h-[80vh] sm:max-h-[350px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 p-3.5 z-50 animate-popover flex flex-col overflow-hidden"
                        >
                          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                                <History className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
                                  سجل عمليات خط المحل
                                </h4>
                                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                  <span>{wallet.label}</span>
                                  <span>•</span>
                                  <span dir="ltr" className="font-mono text-slate-600 dark:text-slate-300 font-bold">{formatPhone(wallet.phoneNumber)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 mr-2">
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                {wallet.txList.length} {wallet.txList.length === 1 ? 'عملية' : 'عمليات'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveHistoryWalletId(null);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="إغلاق السجل"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="overflow-y-auto flex-1 pr-1.5 pl-0.5 space-y-2 max-h-48 sm:max-h-52 overscroll-contain">
                            {wallet.txList.length === 0 ? (
                              <div className="text-center py-6 px-3">
                                <History className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                                <p className="text-xs text-slate-400">لا توجد عمليات مسجلة لهذا الخط حتى الآن.</p>
                              </div>
                            ) : (
                              wallet.txList.map((tx) => (
                                <div
                                  key={tx.id}
                                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                                    tx.type === 'recharge'
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
                                      : 'bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:border-red-200 dark:hover:border-red-900/50'
                                  }`}
                                >
                                  <div>
                                    {tx.type === 'recharge' ? (
                                      <div className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-mono">
                                        + {formatCurrency(tx.amount)}
                                      </div>
                                    ) : (
                                      <div className="font-black text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-mono">
                                        - {formatCurrency(tx.amount)}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      {tx.type === 'recharge' ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">شحن وإيداع رصيد</span>
                                      ) : (
                                        <span>إلى: <span className="font-mono text-slate-600 dark:text-slate-300" dir="ltr">{formatPhone(tx.recipientPhone) || 'غير محدد'}</span></span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-left font-mono">
                                    <div className="text-[10px] text-slate-400">{tx.transactionCode || 'VF'}</div>
                                    <div className="text-[10px] text-slate-500 font-bold">{tx.dateOnly || ''}</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 5. Pagination for Shop Wallets (> 6 items) */}
          {filteredShopWallets.length > SHOP_ITEMS_PER_PAGE && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                عرض <strong className="text-slate-900 dark:text-white font-mono">{(validShopPage - 1) * SHOP_ITEMS_PER_PAGE + 1}</strong> إلى <strong className="text-slate-900 dark:text-white font-mono">{Math.min(validShopPage * SHOP_ITEMS_PER_PAGE, filteredShopWallets.length)}</strong> من إجمالي <strong className="text-slate-900 dark:text-white font-mono">{filteredShopWallets.length}</strong> خطوط للمحل
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShopCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={validShopPage === 1}
                  className="btn-interactive flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-xs"
                  title="الصفحة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalShopPages }, (_, i) => i + 1).map(page => {
                    const isActive = page === validShopPage;
                    return (
                      <button
                        key={page}
                        onClick={() => setShopCurrentPage(page)}
                        className={`btn-interactive w-8 h-8 rounded-xl font-bold font-mono text-xs flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm shadow-red-600/30'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShopCurrentPage(prev => Math.min(totalShopPages, prev + 1))}
                  disabled={validShopPage === totalShopPages}
                  className="btn-interactive flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-xs"
                  title="الصفحة التالية"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: SHOP INSTAPAY ACCOUNTS                        */}
      {/* ======================================================== */}
      {inventorySection === 'shop_instapay' && (
        <div className="space-y-6">

          {/* 1. Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 text-white font-bold flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">
                    حسابات إنستاباي - InstaPay
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {instapayAccounts.length} حسابات مسجلة
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  إدارة حسابات الدفع اللحظي ومعرفات IPA والتحويل المباشر وسداد مستحقات العملاء والموردين
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setModalData({ channel: 'instapay' });
                  setActiveModal('transfer');
                }}
                className="btn-interactive flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs sm:text-sm font-bold shadow-xs transition-all"
                title="تسجيل تحويل فوري من أحد حسابات إنستاباي"
              >
                <Send className="w-4 h-4 rotate-180" />
                <span>تحويل سريع</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalData(null);
                  setActiveModal('addInstapayAccount');
                }}
                className="btn-interactive flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black shadow-md shadow-purple-600/25 ring-1 ring-purple-500/30 transition-all"
                title="إضافة حساب إنستاباي جديد للمحل"
              >
                <Plus className="w-4 h-4" />
                <span>+ إضافة حساب إنستاباي</span>
              </button>
            </div>
          </div>

          {/* 2. Top Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  إجمالي رصيد إنستاباي
                </span>
                <span className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-400 font-mono">
                  {formatCurrency(totalInstapayBalance)}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  عدد الحسابات النشطة
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {instapayAccounts.length}
                  </span>
                  {instapayAccounts.some(a => a.isDefault) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                      يوجد حساب رئيسي
                    </span>
                  )}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  الحساب الافتراضي للسداد
                </span>
                <span className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 truncate max-w-[180px] block">
                  {instapayAccounts.find(a => a.isDefault)?.accountName || (instapayAccounts[0]?.accountName || 'لا يوجد')}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* 3. Search Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="🔍 ابحث بالاسم، اسم البنك، أو عنوان الدفع اللحظي (IPA) أو رقم الهاتف..."
                value={instapaySearch}
                onChange={(e) => setInstapaySearch(e.target.value)}
                className="w-full pl-8 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              {instapaySearch && (
                <button
                  type="button"
                  onClick={() => setInstapaySearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 4. Accounts Cards Grid */}
          {filteredInstapayAccounts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                {instapaySearch ? 'لا توجد حسابات تطابق البحث' : 'لا توجد حسابات إنستاباي مسجلة'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {instapaySearch ? 'جرب البحث بكلمة أخرى أو مسح نص البحث.' : 'قم بإضافة حساب إنستاباي لتتمكن من التحويل منه وسداد العملاء والموردين بسهولة.'}
              </p>
              {!instapaySearch && (
                <button
                  type="button"
                  onClick={() => {
                    setModalData(null);
                    setActiveModal('addInstapayAccount');
                  }}
                  className="btn-interactive inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md shadow-purple-600/25"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة حسابك الأول الآن</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredInstapayAccounts.map((acc) => {
                const isDefault = Boolean(acc.isDefault);
                const handleOrPhone = acc.handle || acc.phone || '';

                return (
                  <div
                    key={acc.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 sm:p-5 shadow-sm space-y-4 hover:shadow-md transition-all relative ${
                      isDefault
                        ? 'border-purple-300 dark:border-purple-800/80 ring-2 ring-purple-500/20'
                        : 'border-slate-200/90 dark:border-slate-800'
                    }`}
                  >
                    {/* Top Row: Account & Bank */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                            {acc.accountName}
                          </h4>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate block">
                            {acc.bankName || 'بنك مصري'}
                          </span>
                        </div>
                      </div>

                      {isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs shrink-0">
                          افتراضي
                        </span>
                      )}
                    </div>

                    {/* Balance Display */}
                    <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        الرصيد المتاح:
                      </span>
                      <span className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300 font-mono">
                        {formatCurrency(acc.balance || 0)}
                      </span>
                    </div>

                    {/* IPA Handle / Phone Number */}
                    {handleOrPhone && (
                      <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                        <div className="flex items-center gap-1.5 min-w-0 font-mono font-bold text-slate-800 dark:text-slate-200 text-left" dir="ltr">
                          <Zap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="truncate">{handleOrPhone}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(handleOrPhone);
                            setCopiedInstapayHandle(acc.id);
                            setTimeout(() => setCopiedInstapayHandle(null), 2000);
                            showToast('تم نسخ عنوان إنستاباي بنجاح!');
                          }}
                          className="p-1 text-slate-400 hover:text-purple-600 transition-colors"
                          title="نسخ المعرف"
                        >
                          {copiedInstapayHandle === acc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Notes if any */}
                    {acc.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                        {acc.notes}
                      </p>
                    )}

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setModalData({ channel: 'instapay', instapayAccountId: acc.id });
                          setActiveModal('transfer');
                        }}
                        className="btn-interactive flex-1 py-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs shadow-purple-600/20"
                      >
                        <Send className="w-3.5 h-3.5 rotate-180" />
                        <span>تحويل منه</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModalData({ account: acc });
                          setActiveModal('editInstapayAccount');
                        }}
                        className="btn-interactive p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                        title="تعديل بيانات الحساب"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = await askConfirm({
                            title: 'حذف حساب إنستاباي',
                            message: `هل أنت متأكد من حذف حساب إنستاباي "${acc.accountName}"؟`,
                            details: 'سيتم إزالة الحساب وتحديث إجمالي رصيد إنستاباي في الخزينة.',
                            type: 'danger',
                            confirmText: 'نعم، احذف الحساب',
                            cancelText: 'إلغاء'
                          });
                          if (confirmed) {
                            deleteInstapayAccount(acc.id);
                          }
                        }}
                        className="btn-interactive p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors"
                        title="حذف الحساب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
}