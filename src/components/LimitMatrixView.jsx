import React, { useState, useMemo, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  formatPhone, 
  calculateWalletStats 
} from '../utils/formatters';
import { 
  Layers, 
  Send, 
  Edit2, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone, 
  Search, 
  Filter,
  Lock,
  Calendar,
  ArrowDownToLine,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export default function LimitMatrixView() {
  const { clients, shopWallets, transactions, setActiveModal, setModalData } = useCash();
  const [filterStatus, setFilterStatus] = useState('all'); // all, near, exhausted, safe
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // Collect all wallets flattened with metadata (prioritizing shop personal wallets)
  const allWallets = useMemo(() => {
    const list = [];
    (shopWallets || []).forEach(w => {
      const stats = calculateWalletStats(w, transactions);
      list.push({
        ...w,
        clientId: 'shop',
        clientName: 'أرقام وخطوط المحل',
        isShopWallet: true,
        stats
      });
    });
    (clients || []).forEach(c => {
      (c.wallets || []).forEach(w => {
        const stats = calculateWalletStats(w, transactions);
        list.push({
          ...w,
          clientId: c.id,
          clientName: c.name,
          isShopWallet: false,
          stats
        });
      });
    });
    return list;
  }, [shopWallets, clients, transactions]);

  const filteredWallets = useMemo(() => {
    return allWallets.filter(item => {
      // Status filter
      if (filterStatus === 'near' && !item.stats.isNearLimit) return false;
      if (filterStatus === 'exhausted' && !item.stats.isExhausted) return false;
      if (filterStatus === 'safe' && !item.stats.isSafe) return false;

      // Query filter
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        return (
          item.clientName.toLowerCase().includes(q) ||
          item.phoneNumber.includes(q) ||
          item.label.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allWallets, filterStatus, query]);

  // Status counts for filter buttons
  const safeCount = useMemo(() => allWallets.filter(w => w.stats.isSafe).length, [allWallets]);
  const nearCount = useMemo(() => allWallets.filter(w => w.stats.isNearLimit).length, [allWallets]);
  const exhaustedCount = useMemo(() => allWallets.filter(w => w.stats.isExhausted).length, [allWallets]);

  // Reset to first page whenever filter or query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, query]);

  const totalPages = Math.ceil(filteredWallets.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedWallets = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredWallets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWallets, safeCurrentPage]);

  const handleQuickTransfer = (item) => {
    setModalData({
      clientId: item.clientId,
      walletId: item.id,
      wallet: item,
      isShopWallet: item.isShopWallet
    });
    setActiveModal('transfer');
  };

  const handleEditLimit = (item) => {
    setModalData({
      clientId: item.clientId,
      clientName: item.clientName,
      wallet: item,
      isShopWallet: item.isShopWallet
    });
    setActiveModal('editLimit');
  };

  const handleRechargeWallet = (item) => {
    setModalData({
      clientId: item.clientId,
      clientName: item.clientName,
      wallet: item,
      isShopWallet: item.isShopWallet
    });
    setActiveModal('rechargeWallet');
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-600" />
            <span>لوحة مراقبة الليميت الشهري لكافة المحافظ</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            الليميت شهري يتجدد تلقائياً أول كل شهر جديد (1 في الشهر)
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            الكل ({allWallets.length})
          </button>

          <button
            onClick={() => setFilterStatus('safe')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'safe'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            متاح ({safeCount})
          </button>

          <button
            onClick={() => setFilterStatus('near')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'near'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            اقترب من الحد ({nearCount})
          </button>

          <button
            onClick={() => setFilterStatus('exhausted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === 'exhausted'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            منتهي ({exhaustedCount})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="بحث في المحافظ (اسم العميل، رقم الهاتف، أو اسم المحفظة)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-4 pr-10 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 shadow-sm"
        />
      </div>

      {/* Grid of Wallets */}
      {paginatedWallets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">لا توجد محافظ مطابقة</h3>
          <p className="text-xs text-slate-400 mt-1">جرّب تغيير خيارات الفلتر أو البحث أعلاه</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedWallets.map(item => {
            const stats = item.stats;
            const isNear = stats.isNearLimit;
            const isExhausted = stats.isExhausted;

            return (
              <div
                key={item.id}
                className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block">
                      العميل: {item.clientName}
                    </span>
                    <div className="text-base font-black font-mono tracking-wider text-slate-900 dark:text-white mt-0.5" dir="ltr">
                      {formatPhone(item.phoneNumber)}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.label}
                    </span>
                    
                    {/* Reset Date badge */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                      <Calendar className="w-3 h-3 text-red-500" />
                      <span>يتجدد في <strong>{stats.nextResetDateShort}</strong></span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block">الحد المتبقي</span>
                    <span
                      className={`text-lg font-black tracking-tight ${
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

                {/* Daily Limit Tracker */}
                <div className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">
                    تحويلات اليوم: <strong className={stats.isDailyTransferExhausted ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-200'}>{formatCurrency(stats.todayTransfersOut)}</strong> / 60,000 ج.م
                  </span>
                  <span className={`font-bold font-mono ${stats.isDailyTransferExhausted ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {stats.isDailyTransferExhausted ? 'اكتمل اليوم' : `متاح: ${formatCurrency(stats.remainingDailyTransfer)}`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>تم تحويل: {formatCurrency(stats.totalTransfersOut)}</span>
                    <span>الشهري: {formatCurrency(stats.totalLimit)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isExhausted ? 'bg-rose-600' : isNear ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, stats.percentUsed)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">مستهلك: {stats.percentUsed}%</span>
                    {stats.isLocked ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        الرقم مقفول (200 ألف)
                      </span>
                    ) : stats.isDailyTransferExhausted ? (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        اكتمل حد اليوم (60 ألف)
                      </span>
                    ) : isNear ? (
                      <span className="text-amber-500 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        اقترب من الحد
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">متاح</span>
                    )}
                  </div>
                </div>

                {/* Quick Action */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {stats.isLocked ? (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-not-allowed border border-slate-300 dark:border-slate-700 shadow-none"
                      title={`الرقم مقفول لتجاوز الليميت الشهري (200,000 ج.م) - يتجدد تلقائياً في ${stats.nextResetDateShort}`}
                    >
                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                      <span>مقفول (200 ألف)</span>
                    </button>
                  ) : stats.isDailyTransferExhausted ? (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-xs cursor-not-allowed border border-amber-300 dark:border-amber-800 shadow-none"
                      title="اكتمل الحد اليومي للتحويل (60,000 ج.م)"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>حد اليوم منتهي</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleQuickTransfer(item)}
                      className="btn-interactive flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5 rotate-180" />
                      <span>تحويل وخصم</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleRechargeWallet(item)}
                    className="btn-interactive px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-bold border border-emerald-200 dark:border-emerald-800/60"
                    title="شحن رصيد للمحفظة"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleEditLimit(item)}
                    className="btn-interactive p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold"
                    title="تعديل الليميت"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Pagination (shown if more than 6 items) */}
      {filteredWallets.length > ITEMS_PER_PAGE && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            عرض <span className="font-bold text-slate-800 dark:text-white">{(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-800 dark:text-white">{Math.min(filteredWallets.length, safeCurrentPage * ITEMS_PER_PAGE)}</span> من إجمالي <span className="font-bold text-slate-800 dark:text-white">{filteredWallets.length}</span> محفظة
          </div>

          <div className="flex items-center gap-1.5" dir="rtl">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold transition-all ${
                    safeCurrentPage === pageNum
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
