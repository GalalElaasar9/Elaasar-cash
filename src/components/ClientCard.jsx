import React, { useState, useMemo, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import {
  formatCurrency,
  formatPhone,
  calculateWalletStats,
  formatTimeArabic,
  formatDateArabic,
  getEgyptianCarrier
} from '../utils/formatters';
import {
  Phone,
  Plus,
  Send,
  Settings,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  History,
  AlertCircle,
  Smartphone,
  Edit2,
  Lock,
  Calendar,
  CheckCircle2,
  X,
  ArrowDownToLine
} from 'lucide-react';

export default function ClientCard({ client }) {
  const {
    transactions,
    setActiveModal,
    setModalData,
    deleteClient,
    deleteWallet,
    showToast,
    askConfirm
  } = useCash();

  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(null);
  const [activeHistoryWalletId, setActiveHistoryWalletId] = useState(null);
  const [walletPage, setWalletPage] = useState(1);

  // Close history popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!activeHistoryWalletId) return;

    const handleGlobalClick = (e) => {
      if (e.target.closest('.history-popover-container')) return;
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

  // Client wallets
  const wallets = client.wallets || [];
  const WALLETS_PER_PAGE = 3;
  const totalWalletPages = Math.ceil(wallets.length / WALLETS_PER_PAGE) || 1;
  const validWalletPage = Math.min(Math.max(1, walletPage), totalWalletPages);

  const paginatedWallets = useMemo(() => {
    const startIndex = (validWalletPage - 1) * WALLETS_PER_PAGE;
    return wallets.slice(startIndex, startIndex + WALLETS_PER_PAGE);
  }, [wallets, validWalletPage]);

  const handleCopyPhone = (phone, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    showToast(`تم نسخ الرقم ${phone}`);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const handleQuickTransfer = (wallet) => {
    setModalData({
      clientId: client.id,
      walletId: wallet.id
    });
    setActiveModal('transfer');
  };

  const handleRechargeWallet = (wallet) => {
    setModalData({
      clientId: client.id,
      clientName: client.name,
      wallet
    });
    setActiveModal('rechargeWallet');
  };

  const handleAddWallet = () => {
    setModalData({
      clientId: client.id,
      clientName: client.name
    });
    setActiveModal('addWallet');
  };

  const handleEditWallet = (wallet) => {
    setModalData({
      clientId: client.id,
      clientName: client.name,
      wallet
    });
    setActiveModal('editLimit');
  };

  const handleDeleteWallet = async (wallet) => {
    const confirmed = await askConfirm({
      title: 'حذف رقم المحفظة',
      message: `هل أنت متأكد من رغبتك في حذف الرقم (${wallet.phoneNumber})؟`,
      details: 'سيتم نقل هذا الرقم إلى "سلة المحذوفات"، ويمكنك استعادته في أي وقت بضغطة زر.',
      type: 'warning',
      confirmText: 'نعم، احذف الرقم',
      cancelText: 'تراجع'
    });
    if (confirmed) {
      deleteWallet(client.id, wallet.id);
    }
  };

  const handleDeleteClient = async () => {
    const confirmed = await askConfirm({
      title: 'حذف العميل بالكامل',
      message: `هل أنت متأكد من حذف العميل "${client.name}" وجميع أرقامه المسجلة؟`,
      details: `سيتم نقل العميل وكافة محافظه (${wallets.length} أرقام) إلى "سلة المحذوفات"، ويمكنك استعادته في أي وقت.`,
      type: 'warning',
      confirmText: 'نعم، احذف العميل',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      deleteClient(client.id);
    }
  };

  return (
    <div className="card-hover bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative mb-6 transition-all duration-300">

      {/* Client Header */}
      <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 rounded-t-2xl">

        {/* Client Identity */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-red-600 dark:to-rose-700 text-white font-bold text-base sm:text-lg flex items-center justify-center shadow-sm shrink-0">
            {client.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {client.name}
              </h3>
              <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                {wallets.length} {wallets.length === 1 ? 'رقم مسجل' : 'أرقام مسجلة'}
              </span>
            </div>
            {client.notes && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {client.notes}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons on client */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleAddWallet}
            className="btn-interactive flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 shadow-xs"
            title="إضافة رقم محمول إضافي لهذا العميل"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة رقم</span>
          </button>

          <button
            onClick={handleDeleteClient}
            className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="حذف العميل بالكامل"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={isExpanded ? 'طي الأرقام' : 'عرض الأرقام'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

      </div>

      {/* Wallets List Section (Animated Accordion) */}
      <div className={`accordion-wrapper ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="accordion-inner">
          <div className="p-5 sm:p-6 space-y-4">
          {wallets.length === 0 ? (
            <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Smartphone className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                لا توجد أرقام هواتف مسجلة لهذا العميل حتى الآن.
              </p>
              <button
                onClick={handleAddWallet}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة أول رقم محمول</span>
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedWallets.map((wallet) => {
                  const isHistoryOpen = activeHistoryWalletId === wallet.id;
                  const walletTxList = transactions.filter(t => t.walletId === wallet.id);
                  const carrier = getEgyptianCarrier(wallet.phoneNumber);

                  return (
                    <div
                      key={wallet.id}
                      className="relative bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-700/70 hover:border-red-300 dark:hover:border-red-900/60 transition-all duration-200 group flex flex-col justify-between"
                    >
                      {/* Top Row: Label & Carrier Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Smartphone className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {wallet.label || 'محفظة العميل'}
                          </span>
                        </div>
                        {carrier && (
                          <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 shrink-0">
                            {carrier.name}
                          </span>
                        )}
                      </div>

                      {/* Phone Number Display Box */}
                      <div className="bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200/80 dark:border-slate-750 flex items-center justify-between gap-2 mb-3.5">
                        <span className="text-base sm:text-xl font-black font-mono tracking-wider text-slate-900 dark:text-white" dir="ltr">
                          {formatPhone(wallet.phoneNumber)}
                        </span>
                        <button
                          onClick={(e) => handleCopyPhone(wallet.phoneNumber, e)}
                          className="btn-interactive flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                          title="نسخ الرقم"
                        >
                          {copiedPhone === wallet.phoneNumber ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[11px] text-emerald-600 font-bold">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[11px]">نسخ</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Action buttons for this wallet - Direct Transfer is always active without limit lock */}
                      <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        {/* Direct Transfer Button */}
                        <button
                          onClick={() => handleQuickTransfer(wallet)}
                          className="btn-interactive flex-1 min-w-0 h-9 sm:h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-sm shadow-red-600/25 whitespace-nowrap"
                          title="تحويل كاش لهذا الرقم"
                        >
                          <Send className="w-3.5 h-3.5 rotate-180 shrink-0" />
                          <span className="truncate">تحويل كاش</span>
                        </button>

                        {/* Edit Phone / Label */}
                        <button
                          onClick={() => handleEditWallet(wallet)}
                          className="btn-interactive shrink-0 h-9 sm:h-10 px-2 sm:px-2.5 flex items-center justify-center gap-1 rounded-xl bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/90 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-xs"
                          title="تعديل اسم أو رقم المحفظة"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                          <span className="hidden xl:inline">تعديل</span>
                        </button>

                        {/* History Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveHistoryWalletId(isHistoryOpen ? null : wallet.id);
                          }}
                          className={`btn-interactive shrink-0 h-9 sm:h-10 px-2.5 flex items-center justify-center gap-1 rounded-xl text-xs font-semibold border transition-colors shadow-xs ${isHistoryOpen
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                            : 'bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                            }`}
                          title="عرض العمليات الخاصة بهذا الرقم"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span className="font-mono font-bold text-[11px]">({walletTxList.length})</span>
                        </button>

                        {/* Delete Wallet */}
                        <button
                          onClick={() => handleDeleteWallet(wallet)}
                          className="btn-interactive shrink-0 h-9 sm:h-10 w-9 sm:w-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-700/80 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/90 dark:border-slate-600 hover:border-rose-200 dark:hover:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-xs transition-colors"
                          title="حذف هذا الرقم"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Floating History Popover outside normal div layout */}
                      {isHistoryOpen && (
                        <>
                          {/* Mobile Backdrop */}
                          <div
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 sm:hidden animate-fadeIn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveHistoryWalletId(null);
                            }}
                          />

                          {/* Floating Popover Container with fixed max-height & sticky header/footer */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="history-popover-container fixed sm:absolute inset-x-3 bottom-4 sm:inset-x-2 sm:bottom-14 max-h-[80vh] sm:max-h-[350px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 p-3.5 z-50 animate-popover flex flex-col overflow-hidden"
                          >
                            {/* Popover Header */}
                            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                                  <History className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
                                    سجل عمليات هذا الرقم
                                  </h4>
                                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                    <span>{wallet.label || 'محفظة فودافون'}</span>
                                    <span>•</span>
                                    <span dir="ltr" className="font-mono text-slate-600 dark:text-slate-300 font-bold">{formatPhone(wallet.phoneNumber)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 mr-2">
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                  {walletTxList.length} {walletTxList.length === 1 ? 'عملية' : 'عمليات'}
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

                            {/* Popover Transactions List (Scrollable with max-height) */}
                            <div className="overflow-y-auto flex-1 pr-1.5 pl-0.5 space-y-2 max-h-48 sm:max-h-52 overscroll-contain">
                              {walletTxList.length === 0 ? (
                                <div className="text-center py-6 px-3">
                                  <History className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                                  <p className="text-xs text-slate-400">لا توجد عمليات تحويل أو شحن مسجلة لهذا الرقم حتى الآن.</p>
                                </div>
                              ) : (
                                walletTxList.map((tx) => (
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
                                    <div className="text-left text-[11px] text-slate-500 dark:text-slate-400">
                                      <div className="font-semibold text-slate-700 dark:text-slate-300">{formatTimeArabic(tx.date)}</div>
                                      <div className="text-[10px] text-slate-400">{tx.dateOnly}</div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            {/* Popover Footer */}
                            {walletTxList.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                                <span>إجمالي المحول من الرقم:</span>
                                <span className="font-black text-slate-800 dark:text-slate-200 font-mono">
                                  {formatCurrency(stats.totalTransfersOut)}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Wallets Pagination Bar (Displayed when client has > 3 wallets) */}
              {wallets.length > WALLETS_PER_PAGE && (
                <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-xl p-2.5 sm:p-3 border border-slate-200/80 dark:border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 mt-2">
                  {/* Range Info */}
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center sm:text-right">
                    <span>عرض الأرقام من </span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {(validWalletPage - 1) * WALLETS_PER_PAGE + 1}
                    </strong>
                    <span> إلى </span>
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {Math.min(wallets.length, validWalletPage * WALLETS_PER_PAGE)}
                    </strong>
                    <span> من إجمالي </span>
                    <strong className="text-red-600 dark:text-red-400 font-mono">
                      {wallets.length}
                    </strong>
                    <span> {wallets.length === 1 ? 'رقم مسجل' : 'أرقام مسجلة'}</span>
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center gap-1.5">
                    
                    {/* Previous Page Button */}
                    <button
                      onClick={() => setWalletPage(prev => Math.max(1, prev - 1))}
                      disabled={validWalletPage === 1}
                      className="btn-interactive flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-xs"
                      title="الصفحة السابقة"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                      <span>السابق</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalWalletPages }, (_, i) => i + 1).map(page => {
                        const isActive = page === validWalletPage;
                        return (
                          <button
                            key={page}
                            onClick={() => setWalletPage(page)}
                            className={`btn-interactive w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-bold font-mono text-xs flex items-center justify-center transition-all ${isActive
                              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs shadow-red-600/30'
                              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                              }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Page Button */}
                    <button
                      onClick={() => setWalletPage(prev => Math.min(totalWalletPages, prev + 1))}
                      disabled={validWalletPage === totalWalletPages}
                      className="btn-interactive flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 shadow-xs"
                      title="الصفحة التالية"
                    >
                      <span>التالي</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                  </div>

                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>

    </div>
  );
}
