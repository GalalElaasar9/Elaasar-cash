import React, { useState, useMemo, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  formatPhone, 
  formatDateArabic, 
  formatTimeArabic 
} from '../utils/formatters';
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  Smartphone, 
  Package, 
  Calendar, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Phone,
  ShieldCheck,
  Tag,
  DollarSign,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export default function TrashView() {
  const { 
    trash, 
    restoreWallet, 
    restoreClient, 
    restoreProduct, 
    permanentlyDeleteWallet, 
    permanentlyDeleteClient, 
    permanentlyDeleteProduct, 
    emptyTrash,
    askConfirm,
    walletsTrashCount,
    productsTrashCount,
    totalTrashCount
  } = useCash();

  const [activeSection, setActiveSection] = useState('wallets'); // 'wallets' | 'products'
  const [searchQuery, setSearchQuery] = useState('');

  // Wallets & Clients Filtered
  const filteredWallets = useMemo(() => {
    const list = trash.wallets || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(w => 
      w.phoneNumber?.includes(q) ||
      w.label?.toLowerCase().includes(q) ||
      w.clientName?.toLowerCase().includes(q)
    );
  }, [trash.wallets, searchQuery]);

  const filteredClients = useMemo(() => {
    const list = trash.clients || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(c => 
      c.name?.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q) ||
      (c.wallets || []).some(w => w.phoneNumber?.includes(q) || w.label?.toLowerCase().includes(q))
    );
  }, [trash.clients, searchQuery]);

  // Products Filtered
  const filteredProducts = useMemo(() => {
    const list = trash.products || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(p => 
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.storage?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q) ||
      (p.variants || []).some(v => v.color?.toLowerCase().includes(q))
    );
  }, [trash.products, searchQuery]);

  // Pagination Settings (6 boxes per page as requested)
  const ITEMS_PER_PAGE = 6;
  const [walletPage, setWalletPage] = useState(1);
  const [productPage, setProductPage] = useState(1);

  // Reset pagination when search or section changes
  useEffect(() => {
    setWalletPage(1);
  }, [searchQuery, activeSection]);

  useEffect(() => {
    setProductPage(1);
  }, [searchQuery, activeSection]);

  // Combined Wallets & Clients for pagination
  const combinedWalletItems = useMemo(() => {
    const items = [];
    filteredWallets.forEach(w => items.push({ type: 'wallet', id: `w-${w.id}`, data: w }));
    filteredClients.forEach(c => items.push({ type: 'client', id: `c-${c.id}`, data: c }));
    return items;
  }, [filteredWallets, filteredClients]);

  const totalWalletPages = Math.ceil(combinedWalletItems.length / ITEMS_PER_PAGE) || 1;
  const safeWalletPage = Math.min(Math.max(1, walletPage), totalWalletPages);
  const paginatedWalletItems = useMemo(() => {
    const start = (safeWalletPage - 1) * ITEMS_PER_PAGE;
    return combinedWalletItems.slice(start, start + ITEMS_PER_PAGE);
  }, [combinedWalletItems, safeWalletPage]);

  // Products pagination
  const totalProductPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const safeProductPage = Math.min(Math.max(1, productPage), totalProductPages);
  const paginatedProducts = useMemo(() => {
    const start = (safeProductPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, safeProductPage]);

  // Handlers for Confirmation
  const handleRestoreWallet = async (wallet) => {
    const confirmed = await askConfirm({
      title: 'استعادة رقم المحفظة',
      message: `هل تريد استعادة الرقم (${formatPhone(wallet.phoneNumber)}) إلى دليل العملاء؟`,
      details: `سيتم إرجاع الرقم إلى العميل "${wallet.clientName}" مع الاحتفاظ بكافة العمليات والليميت الخاص به.`,
      type: 'info',
      confirmText: 'نعم، استعد الرقم',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      restoreWallet(wallet.id);
    }
  };

  const handlePermanentDeleteWallet = async (wallet) => {
    const confirmed = await askConfirm({
      title: 'حذف نهائي للرقم',
      message: `هل أنت متأكد من حذف الرقم (${formatPhone(wallet.phoneNumber)}) نهائياً؟`,
      details: 'تحذير: الحذف النهائي لا يمكن التراجع عنه أو استعادة الرقم بعد ذلك.',
      type: 'danger',
      confirmText: 'نعم، احذف نهائياً',
      cancelText: 'تراجع'
    });
    if (confirmed) {
      permanentlyDeleteWallet(wallet.id);
    }
  };

  const handleRestoreClient = async (client) => {
    const confirmed = await askConfirm({
      title: 'استعادة العميل بالكامل',
      message: `هل تريد استعادة العميل "${client.name}" وكافة أرقامه المسجلة؟`,
      details: `يشمل ذلك استعادة عدد (${client.wallets?.length || 0}) محفظة تابعة له.`,
      type: 'info',
      confirmText: 'نعم، استعد العميل',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      restoreClient(client.id);
    }
  };

  const handlePermanentDeleteClient = async (client) => {
    const confirmed = await askConfirm({
      title: 'حذف العميل نهائياً',
      message: `هل أنت متأكد من حذف العميل "${client.name}" وجميع أرقامه نهائياً؟`,
      details: 'تحذير: سيتم مسح بيانات العميل ومحفظاته نهائياً من سلة المحذوفات.',
      type: 'danger',
      confirmText: 'نعم، احذف نهائياً',
      cancelText: 'تراجع'
    });
    if (confirmed) {
      permanentlyDeleteClient(client.id);
    }
  };

  const handleRestoreProduct = async (product) => {
    const confirmed = await askConfirm({
      title: 'استعادة الصنف للمخزون',
      message: `هل تريد استعادة المنتج "${product.name}" إلى شاشة المخزون؟`,
      details: `سيتم إرجاع الصنف بإجمالي كمية (${product.totalQuantity || 0} قطع) وكافة الألوان والصور.`,
      type: 'info',
      confirmText: 'نعم، استعد للمخزون',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      restoreProduct(product.id);
    }
  };

  const handlePermanentDeleteProduct = async (product) => {
    const confirmed = await askConfirm({
      title: 'حذف الصنف نهائياً',
      message: `هل أنت متأكد من حذف الصنف "${product.name}" نهائياً؟`,
      details: 'تحذير: لا يمكن استعادة بيانات هذا المنتج أو كمياته بعد الحذف النهائي.',
      type: 'danger',
      confirmText: 'نعم، احذف نهائياً',
      cancelText: 'تراجع'
    });
    if (confirmed) {
      permanentlyDeleteProduct(product.id);
    }
  };

  const handleEmptyCurrentTrash = async () => {
    const isWallets = activeSection === 'wallets';
    const title = isWallets ? 'تفريغ محذوفات الأرقام والعملاء' : 'تفريغ محذوفات المنتجات والمخزون';
    const message = isWallets 
      ? 'هل أنت متأكد من رغبتك في حذف جميع الأرقام والعملاء الموجودين بالسلة نهائياً؟'
      : 'هل أنت متأكد من رغبتك في حذف جميع المنتجات الموجودة بالسلة نهائياً؟';

    const confirmed = await askConfirm({
      title,
      message,
      details: 'تنبيه: سيتم مسح هذه العناصر تماماً ولن يمكنك استرجاعها مجدداً.',
      type: 'danger',
      confirmText: 'نعم، أفرغ السلة',
      cancelText: 'إلغاء'
    });

    if (confirmed) {
      emptyTrash(activeSection);
    }
  };

  const handleEmptyAllTrash = async () => {
    const confirmed = await askConfirm({
      title: 'تفريغ سلة المحذوفات بالكامل',
      message: 'هل أنت متأكد من حذف جميع الأرقام والمنتجات المحذوفة نهائياً؟',
      details: `يشمل ذلك إفراغ عدد (${totalTrashCount}) عنصر محذوف. لا يمكن التراجع عن هذا الإجراء!`,
      type: 'danger',
      confirmText: 'نعم، تفريغ شامل',
      cancelText: 'إلغاء'
    });

    if (confirmed) {
      emptyTrash('all');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                سلة المحذوفات واسترجاع البيانات
              </h2>
              {totalTrashCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                  {totalTrashCount} {totalTrashCount === 1 ? 'عنصر' : 'عناصر'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              إذا قمت بحذف أي رقم محفظة أو عميل أو صنف بالخطأ، يمكنك استعادته فوراً بضغطة زر واحدة بكامل بياناته
            </p>
          </div>
        </div>

        {/* Global Actions */}
        {totalTrashCount > 0 && (
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={handleEmptyAllTrash}
              className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/50 transition-colors"
              title="تفريغ كل المحذوفات نهائياً"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تفريغ السلة بالكامل</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        
        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl">
          <button
            onClick={() => setActiveSection('wallets')}
            className={`btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeSection === 'wallets'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/60 dark:ring-slate-600/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4 text-red-600" />
            <span>أرقام ومحافظ العملاء</span>
            {walletsTrashCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {walletsTrashCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('products')}
            className={`btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeSection === 'products'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/60 dark:ring-slate-600/60'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 text-blue-600" />
            <span>المنتجات والمخزون</span>
            {productsTrashCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {productsTrashCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={
              activeSection === 'wallets'
                ? 'بحث بالرقم، اسم العميل، أو اسم المحفظة...'
                : 'بحث باسم المنتج، الموديل، الماركة، أو اللون...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* SECTION 1: WALLETS & CLIENTS */}
      {activeSection === 'wallets' && (
        <div className="space-y-4">
          
          {/* Subheading info */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>
              إجمالي الأرقام المحذوفة: <strong className="text-slate-800 dark:text-slate-200 font-mono">{filteredWallets.length}</strong> محفظة
              {filteredClients.length > 0 && (
                <> • <strong className="text-slate-800 dark:text-slate-200 font-mono">{filteredClients.length}</strong> عملاء بالكامل</>
              )}
            </span>
            {(filteredWallets.length > 0 || filteredClients.length > 0) && (
              <button
                onClick={handleEmptyCurrentTrash}
                className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-[11px]"
              >
                تفريغ محذوفات الأرقام
              </button>
            )}
          </div>

          {filteredWallets.length === 0 && filteredClients.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/90 dark:border-slate-800 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                {searchQuery ? 'لا توجد أرقام مطابقة لبحثك في سلة المحذوفات' : 'سلة محذوفات الأرقام فارغة تماماً'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery 
                  ? `لم يتم العثور على أرقام أو عملاء تطابق "${searchQuery}".`
                  : 'أي رقم محفظة فودافون كاش أو عميل تقوم بحذفه من الشاشة الرئيسية، سينتقل هنا لتتمكن من استرجاعه في أي وقت.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {paginatedWalletItems.map((item) => {
                  if (item.type === 'wallet') {
                    const wallet = item.data;
                    return (
                      <div
                        key={wallet.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm flex flex-col justify-between gap-4 transition-all"
                      >
                        <div>
                          {/* Top Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate block">
                                العميل: {wallet.clientName || 'عميل'}
                              </span>
                              <div className="text-lg font-black font-mono tracking-wider text-slate-900 dark:text-white mt-0.5" dir="ltr">
                                {formatPhone(wallet.phoneNumber)}
                              </div>
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {wallet.label || 'محفظة فودافون'}
                              </span>
                            </div>

                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                              رقم محذوف
                            </span>
                          </div>

                          {/* Meta info */}
                          <div className="space-y-1 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-3">
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                              <span>الليميت الشهري المسجل:</span>
                              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                                {formatCurrency(wallet.totalLimit || 200000)}
                              </strong>
                            </div>
                            {wallet.deletedAt && (
                              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                                <span>تاريخ الحذف:</span>
                                <span className="font-mono">
                                  {formatDateArabic(wallet.deletedAt)} • {formatTimeArabic(wallet.deletedAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => handleRestoreWallet(wallet)}
                            className="btn-interactive flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/25"
                            title="استعادة هذا الرقم إلى دليل العملاء"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>استعادة الرقم</span>
                          </button>

                          <button
                            onClick={() => handlePermanentDeleteWallet(wallet)}
                            className="btn-interactive p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                            title="حذف نهائي للرقم من السلة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'client') {
                    const client = item.data;
                    return (
                      <div
                        key={client.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border-2 border-rose-200 dark:border-rose-900/60 shadow-sm flex flex-col justify-between gap-4 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                                عميل محذوف بالكامل
                              </span>
                              <h4 className="text-base font-black text-slate-900 dark:text-white mt-1">
                                {client.name}
                              </h4>
                              {client.notes && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {client.notes}
                                </p>
                              )}
                            </div>

                            <div className="text-left shrink-0">
                              <span className="text-[10px] text-slate-400 block">عدد المحافظ</span>
                              <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                                {client.wallets?.length || 0} أرقام
                              </span>
                            </div>
                          </div>

                          {/* Wallets preview */}
                          <div className="space-y-1.5 mt-3 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 block mb-1">
                              الأرقام التابعة لهذا العميل:
                            </span>
                            {(client.wallets || []).map((w, idx) => (
                              <div key={w.id || idx} className="flex items-center justify-between text-xs">
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300" dir="ltr">
                                  {formatPhone(w.phoneNumber)}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {w.label}
                                </span>
                              </div>
                            ))}
                            {client.deletedAt && (
                              <div className="pt-1.5 mt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                                <span>تاريخ الحذف:</span>
                                <span className="font-mono">
                                  {formatDateArabic(client.deletedAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={() => handleRestoreClient(client)}
                            className="btn-interactive flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/25"
                            title="استعادة العميل وجميع محافظه إلى دليل العملاء"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>استعادة العميل بالكامل</span>
                          </button>

                          <button
                            onClick={() => handlePermanentDeleteClient(client)}
                            className="btn-interactive p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                            title="حذف نهائي للعميل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}

              </div>

              {/* Pagination (shown if more than 6 items) */}
              {combinedWalletItems.length > ITEMS_PER_PAGE && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    عرض <span className="font-bold text-slate-800 dark:text-white font-mono">{(safeWalletPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-800 dark:text-white font-mono">{Math.min(combinedWalletItems.length, safeWalletPage * ITEMS_PER_PAGE)}</span> من إجمالي <span className="font-bold text-slate-800 dark:text-white font-mono">{combinedWalletItems.length}</span> عنصر محذوف
                  </div>

                  <div className="flex items-center gap-1.5" dir="rtl">
                    <button
                      onClick={() => setWalletPage(p => Math.max(1, p - 1))}
                      disabled={safeWalletPage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>السابق</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalWalletPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setWalletPage(pageNum)}
                          className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold font-mono transition-all ${
                            safeWalletPage === pageNum
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setWalletPage(p => Math.min(totalWalletPages, p + 1))}
                      disabled={safeWalletPage === totalWalletPages}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span>التالي</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      )}

      {/* SECTION 2: PRODUCTS & INVENTORY */}
      {activeSection === 'products' && (
        <div className="space-y-4">
          
          {/* Subheading info */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>
              إجمالي المنتجات المحذوفة: <strong className="text-slate-800 dark:text-slate-200 font-mono">{filteredProducts.length}</strong> صنف
            </span>
            {filteredProducts.length > 0 && (
              <button
                onClick={handleEmptyCurrentTrash}
                className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-[11px]"
              >
                تفريغ محذوفات المنتجات
              </button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/90 dark:border-slate-800 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                {searchQuery ? 'لا توجد منتجات مطابقة لبحثك في سلة المحذوفات' : 'سلة محذوفات المخزون فارغة تماماً'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery 
                  ? `لم يتم العثور على هواتف أو إكسسوارات تطابق "${searchQuery}".`
                  : 'أي هاتف أو منتج يتم حذفه من شاشة المخزون ينتقل هنا مباشرة حتى يمكنك استرجاعه في أي وقت دون فقدان الكميات أو الصور.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedProducts.map((product) => {
                  const mainImage = product.images?.[0];

                  return (
                    <div
                      key={product.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm flex flex-col justify-between gap-4 transition-all"
                    >
                      <div>
                        {/* Product Header */}
                        <div className="flex items-start gap-3 mb-3">
                          {/* Thumbnail */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                            {mainImage ? (
                              <img
                                src={mainImage}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Smartphone className="w-7 h-7 text-slate-400" />
                            )}
                          </div>

                          {/* Title & Brand */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {product.category === 'phones' ? 'هاتف محمول' : 'إكسسوار'}
                              </span>
                              {product.brand && (
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                  {product.brand}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate mt-1">
                              {product.name}
                            </h4>

                            {product.storage && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono">
                                {product.storage}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pricing & Stock Meta */}
                        <div className="space-y-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">سعر البيع:</span>
                            <strong className="text-slate-900 dark:text-white font-mono font-black">
                              {formatCurrency(product.salePrice)}
                            </strong>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">الكمية عند الحذف:</span>
                            <strong className="text-slate-800 dark:text-slate-200 font-mono">
                              {product.totalQuantity || 0} قطع
                            </strong>
                          </div>

                          {/* Variants list preview */}
                          {product.variants?.length > 0 && (
                            <div className="pt-1 mt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                              <div className="flex flex-wrap gap-1">
                                {product.variants.map((v, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                                  >
                                    {v.hex && (
                                      <span
                                        className="w-2 h-2 rounded-full border border-black/20"
                                        style={{ backgroundColor: v.hex }}
                                      />
                                    )}
                                    <span>{v.color}: {v.quantity}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {product.deletedAt && (
                            <div className="pt-1.5 mt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                              <span>تاريخ الحذف:</span>
                              <span className="font-mono">
                                {formatDateArabic(product.deletedAt)} • {formatTimeArabic(product.deletedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleRestoreProduct(product)}
                          className="btn-interactive flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/25"
                          title="استعادة هذا الصنف إلى المخزون"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>استعادة إلى المخزون</span>
                        </button>

                        <button
                          onClick={() => handlePermanentDeleteProduct(product)}
                          className="btn-interactive p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                          title="حذف نهائي للمنتج من السلة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination (shown if more than 6 items) */}
              {filteredProducts.length > ITEMS_PER_PAGE && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    عرض <span className="font-bold text-slate-800 dark:text-white font-mono">{(safeProductPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-800 dark:text-white font-mono">{Math.min(filteredProducts.length, safeProductPage * ITEMS_PER_PAGE)}</span> من إجمالي <span className="font-bold text-slate-800 dark:text-white font-mono">{filteredProducts.length}</span> صنف محذوف
                  </div>

                  <div className="flex items-center gap-1.5" dir="rtl">
                    <button
                      onClick={() => setProductPage(p => Math.max(1, p - 1))}
                      disabled={safeProductPage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>السابق</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalProductPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setProductPage(pageNum)}
                          className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold font-mono transition-all ${
                            safeProductPage === pageNum
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))}
                      disabled={safeProductPage === totalProductPages}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <span>التالي</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      )}

    </div>
  );
}
