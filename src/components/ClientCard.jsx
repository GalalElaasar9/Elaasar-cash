import React, { useState, useMemo, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import {
  formatCurrency,
  formatPhone,
  calculateWalletStats,
  formatTimeArabic,
  formatDateArabic,
  formatDateTimeArabic,
  getTodayString,
  getCurrentMonthKey,
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
  ArrowDownToLine,
  Percent,
  Calculator,
  Wallet,
  LayoutGrid,
  Table,
  Archive
} from 'lucide-react';

export default function ClientCard({ client }) {
  const {
    transactions,
    updateClient,
    setActiveModal,
    setModalData,
    deleteClient,
    deleteWallet,
    showToast,
    askConfirm,
    clientArchives,
    archiveClientCycle
  } = useCash();

  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(null);
  const [activeHistoryWalletId, setActiveHistoryWalletId] = useState(null);
  const [walletPage, setWalletPage] = useState(1);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Client's recorded settlement archives
  const clientArchiveList = useMemo(() => {
    return (clientArchives || []).filter(a => a.clientId === client.id);
  }, [clientArchives, client.id]);

  // Wallets Display Mode: 'grid' (كروت) | 'table' (جدول)
  const [walletsViewMode, setWalletsViewMode] = useState(() => {
    try {
      return localStorage.getItem('elaasar_client_wallets_view_mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'elaasar_client_wallets_view_mode' && e.newValue) {
        setWalletsViewMode(e.newValue);
      }
    };
    const handleCustomChange = (e) => {
      if (e.detail?.mode) {
        setWalletsViewMode(e.detail.mode);
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('elaasar_wallets_view_mode_change', handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('elaasar_wallets_view_mode_change', handleCustomChange);
    };
  }, []);

  const handleToggleViewMode = (mode) => {
    setWalletsViewMode(mode);
    setWalletPage(1);
    if (!isExpanded) setIsExpanded(true);
    try {
      localStorage.setItem('elaasar_client_wallets_view_mode', mode);
      window.dispatchEvent(new CustomEvent('elaasar_wallets_view_mode_change', { detail: { mode } }));
    } catch (e) {
      console.error(e);
    }
  };

  // Selected time range for client total recharges: 'today' | 'month' | 'all'
  const [timeRange, setTimeRange] = useState(() => {
    try {
      return localStorage.getItem(`elaasar_client_timerange_${client.id}`) || 'today';
    } catch {
      return 'today';
    }
  });

  // Commission mode for this client: 'add' (إضافة) | 'deduct' (خصم)
  const [commissionMode, setCommissionMode] = useState(() => {
    if (client.commissionMode) return client.commissionMode;
    try {
      return localStorage.getItem(`elaasar_client_commission_mode_${client.id}`) || 'deduct';
    } catch {
      return 'deduct';
    }
  });

  // Commission multiplier factor for this client (e.g. 0.995 for discount or 1.005 for markup)
  const [commissionPercent, setCommissionPercent] = useState(() => {
    if (client.commissionPercent !== undefined && client.commissionPercent !== null && client.commissionPercent !== '') {
      return String(client.commissionPercent);
    }
    try {
      const saved = localStorage.getItem(`elaasar_client_commission_${client.id}`);
      if (saved !== null && saved !== '') return saved;
      return '0.995';
    } catch {
      return '0.995';
    }
  });

  // Client classification: 'مدين' (default) | 'دائن'
  const [clientType, setClientType] = useState(() => {
    if (client.clientType) return client.clientType;
    try {
      return localStorage.getItem(`elaasar_client_type_${client.id}`) || 'مدين';
    } catch {
      return 'مدين';
    }
  });

  // Keep clientType in sync if updated from ClientAccountsView or backend
  useEffect(() => {
    if (client.clientType && client.clientType !== clientType) {
      setClientType(client.clientType);
    }
  }, [client.clientType]);

  const handleSetClientType = (type) => {
    if (type === 'دائن') return; // العميل لا يتحول إلى دائن يدوياً، بل فقط عندما يسدد مبلغاً أكبر من دينه
    if (type === effectiveClientType) return;
    if (type === 'عادي' && remainingDebt > 0) {
      showToast(`لا يمكن التحويل لحساب عادي لوجود مديونية مستحقة غير مسددة (${formatCurrency(remainingDebt)})`, 'warning');
      return;
    }
    if (type === 'مدين' && remainingDebt <= 0) {
      showToast('العميل حسابه خالص (0 ج.م) - لا يمكن تحويله إلى مدين إلا إذا كان عليه فلوس أو تم شحن رصيد له', 'warning');
      return;
    }
    const nowIso = new Date().toISOString();
    setClientType(type);

    if (type === 'عادي') {
      try {
        archiveClientCycle({
          clientId: client.id,
          clientName: client.name,
          cycleType: 'تسوية يدوية وتحويل لحساب عادي خالص',
          settledAt: nowIso,
          previousDebt: remainingDebt,
          totalPaid: paidAmount,
          excessRemaining: 0,
          resultingStatus: 'عادي',
          notes: 'تم تصفير الحساب وتحديد العميل كـ عادي من كارت العميل'
        });
      } catch (e) {
        console.error(e);
      }
    }

    updateClient(client.id, {
      clientType: type,
      excessDebt: null,
      excessDebtDate: null,
      excessCredit: null,
      excessCreditDate: null,
      settledAt: type === 'عادي' ? nowIso : (client.settledAt || null)
    });
    try {
      localStorage.setItem(`elaasar_client_type_${client.id}`, type);
      localStorage.removeItem(`elaasar_client_excess_debt_${client.id}`);
      localStorage.removeItem(`elaasar_client_excess_debt_date_${client.id}`);
      localStorage.removeItem(`elaasar_client_excess_credit_${client.id}`);
      localStorage.removeItem(`elaasar_client_excess_credit_date_${client.id}`);
      if (type === 'عادي') {
        localStorage.setItem(`elaasar_client_settled_at_${client.id}`, nowIso);
      }
    } catch (e) {
      console.error(e);
    }
    showToast(`تم تحديد العميل (${client.name}) كـ ${type === 'مدين' ? 'مدين (عليه آجل)' : 'عادي (حساب خالص)'}`);
  };

  // Toggle between deduct and add while updating the multiplier factor (0.995 <-> 1.005)
  const handleToggleMode = () => {
    const nextMode = commissionMode === 'add' ? 'deduct' : 'add';
    setCommissionMode(nextMode);

    const currentNum = Number(commissionPercent);
    if (!isNaN(currentNum) && currentNum > 0) {
      if (nextMode === 'add' && currentNum < 1 && currentNum > 0.8) {
        const diff = 1 - currentNum;
        const newFactor = (1 + diff).toFixed(4).replace(/\.?0+$/, '');
        setCommissionPercent(newFactor);
      } else if (nextMode === 'deduct' && currentNum > 1 && currentNum < 1.2) {
        const diff = currentNum - 1;
        const newFactor = (1 - diff).toFixed(4).replace(/\.?0+$/, '');
        setCommissionPercent(newFactor);
      }
    }
  };

  // Keep state in sync if client object is updated from ClientAccountsView
  useEffect(() => {
    if (client.commissionMode && client.commissionMode !== commissionMode) {
      setCommissionMode(client.commissionMode);
    }
  }, [client.commissionMode]);

  useEffect(() => {
    if (client.commissionPercent !== undefined && String(client.commissionPercent) !== commissionPercent) {
      setCommissionPercent(String(client.commissionPercent));
    }
  }, [client.commissionPercent]);

  useEffect(() => {
    try {
      localStorage.setItem(`elaasar_client_timerange_${client.id}`, timeRange);
    } catch (e) {
      console.error(e);
    }
  }, [client.id, timeRange]);

  useEffect(() => {
    try {
      localStorage.setItem(`elaasar_client_commission_mode_${client.id}`, commissionMode);
      if (client.commissionMode !== commissionMode) {
        updateClient(client.id, { commissionMode });
      }
    } catch (e) {
      console.error(e);
    }
  }, [client.id, commissionMode]);

  useEffect(() => {
    try {
      localStorage.setItem(`elaasar_client_commission_${client.id}`, commissionPercent);
      const num = Number(commissionPercent) || 0;
      if (client.commissionPercent !== num) {
        updateClient(client.id, { commissionPercent: num });
      }
    } catch (e) {
      console.error(e);
    }
  }, [client.id, commissionPercent]);

  // 1. Classification & Cutoff Tracking
  let settledAt = client.settledAt;
  if (!settledAt) {
    try {
      settledAt = localStorage.getItem(`elaasar_client_settled_at_${client.id}`);
    } catch {
      settledAt = null;
    }
  }
  const settledTimestamp = settledAt ? new Date(settledAt).getTime() : 0;

  // 1. Check if client has excessDebt from a creditor payout (المحول من دائن إلى مدين)
  let clientExcessDebt = client.excessDebt;
  let clientExcessDate = client.excessDebtDate;
  if (clientExcessDebt === undefined || clientExcessDebt === null) {
    try {
      const saved = localStorage.getItem(`elaasar_client_excess_debt_${client.id}`);
      if (saved !== null && saved !== '') {
        clientExcessDebt = Number(saved);
        clientExcessDate = localStorage.getItem(`elaasar_client_excess_debt_date_${client.id}`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback: check recent creditor payout transaction
  if ((clientExcessDebt === undefined || clientExcessDebt === null) && clientType === 'مدين') {
    const recentPayout = (transactions || [])
      .filter(t => (t.clientId === client.id || t.customerId === client.id) && t.type === 'client_payment' && t.isCreditorPayout)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (recentPayout) {
      if (recentPayout.excessDebt) {
        clientExcessDebt = Number(recentPayout.excessDebt);
        clientExcessDate = recentPayout.date;
      } else if (recentPayout.creditBefore) {
        const pAmt = Number(recentPayout.amount) || 0;
        const cBefore = Number(recentPayout.creditBefore) || 0;
        if (pAmt > cBefore) {
          clientExcessDebt = pAmt - cBefore;
          clientExcessDate = recentPayout.date;
        }
      }
    }
  }

  // 2. Check if client has excessCredit (المحول من مدين إلى دائن لسداده مبلغ أكبر من المستحق)
  let clientExcessCredit = client.excessCredit;
  let clientExcessCreditDate = client.excessCreditDate;
  if (clientExcessCredit === undefined || clientExcessCredit === null) {
    try {
      const saved = localStorage.getItem(`elaasar_client_excess_credit_${client.id}`);
      if (saved !== null && saved !== '') {
        clientExcessCredit = Number(saved);
        clientExcessCreditDate = localStorage.getItem(`elaasar_client_excess_credit_date_${client.id}`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback: check recent overpayment transaction
  if ((clientExcessCredit === undefined || clientExcessCredit === null) && clientType === 'دائن') {
    const recentOverpayment = (transactions || [])
      .filter(t => (t.clientId === client.id || t.customerId === client.id) && t.type === 'client_payment' && !t.isCreditorPayout)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (recentOverpayment) {
      if (recentOverpayment.excessCredit) {
        clientExcessCredit = Number(recentOverpayment.excessCredit);
        clientExcessCreditDate = recentOverpayment.date;
      } else if (recentOverpayment.debtBefore) {
        const pAmt = Number(recentOverpayment.amount) || 0;
        const dBefore = Number(recentOverpayment.debtBefore) || 0;
        if (pAmt > dBefore) {
          clientExcessCredit = pAmt - dBefore;
          clientExcessCreditDate = recentOverpayment.date;
        }
      }
    }
  }

  const hasExcessDebt = clientType === 'مدين' && typeof clientExcessDebt === 'number' && clientExcessDebt > 0;
  const hasExcessCredit = clientType === 'دائن' && typeof clientExcessCredit === 'number' && clientExcessCredit > 0;

  // Effective Cutoff Timestamp: excludes all transactions from prior settled/closed cycles
  let effectiveCutoff = settledTimestamp;
  if (hasExcessCredit && clientExcessCreditDate) {
    effectiveCutoff = new Date(clientExcessCreditDate).getTime();
  } else if (hasExcessDebt && clientExcessDate) {
    effectiveCutoff = new Date(clientExcessDate).getTime();
  }

  // Find the most recent settlement transaction for this client
  const lastPaymentIdx = useMemo(() => {
    return transactions.findIndex(t => 
      (t.clientId === client.id || t.customerId === client.id) && t.type === 'client_payment'
    );
  }, [transactions, client.id]);

  const isTxInActiveCycle = (t) => {
    if (t.isSettled) return false;
    if (effectiveCutoff === 0) return true;
    if (new Date(t.date).getTime() > effectiveCutoff) return true;
    if (t.type === 'recharge' || t.type === 'limit_reset') {
      if (lastPaymentIdx !== -1 && transactions.indexOf(t) < lastPaymentIdx) return true;
      if (t.id && Number(t.id.replace('tx-rc-', '')) > effectiveCutoff) return true;
    }
    return false;
  };

  // Client wallets
  const wallets = client.wallets || [];
  const WALLETS_PER_PAGE = walletsViewMode === 'table' ? 6 : 3;
  const totalWalletPages = Math.ceil(wallets.length / WALLETS_PER_PAGE) || 1;
  const validWalletPage = Math.min(Math.max(1, walletPage), totalWalletPages);

  const paginatedWallets = useMemo(() => {
    const startIndex = (validWalletPage - 1) * WALLETS_PER_PAGE;
    return wallets.slice(startIndex, startIndex + WALLETS_PER_PAGE);
  }, [wallets, validWalletPage, WALLETS_PER_PAGE]);

  // Calculations for total amounts entered into client lines (recharges)
  const clientWalletIds = useMemo(() => new Set(wallets.map(w => w.id)), [wallets]);

  const clientStats = useMemo(() => {
    let today = 0;
    let month = 0;
    const todayKey = getTodayString();
    const currentMonthKey = getCurrentMonthKey();

    // Only active recharges occurring after effectiveCutoff
    const activeRecharges = transactions.filter(t => 
      clientWalletIds.has(t.walletId) && 
      (t.type === 'recharge' || t.type === 'limit_reset') &&
      isTxInActiveCycle(t)
    );

    today = activeRecharges
      .filter(t => (t.dateOnly || t.date || '').startsWith(todayKey))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    month = activeRecharges
      .filter(t => (t.dateOnly || t.date || '').slice(0, 7) === currentMonthKey)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const all = activeRecharges
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return { today, month, all };
  }, [transactions, clientWalletIds, effectiveCutoff]);

  const baseAmount = useMemo(() => {
    if (timeRange === 'today') return clientStats.today;
    if (timeRange === 'month') return clientStats.month;
    return clientStats.all;
  }, [timeRange, clientStats]);

  const factorNum = Number(commissionPercent);
  const isValidFactor = !isNaN(factorNum) && factorNum > 0;

  // الحساب المالي: المبلغ بعد العمولة = المبلغ قبل العمولة مضروب في المعامل مباشرة (ex: 5000 * 0.995 = 4975)
  let finalAmount = baseAmount;
  let commissionAmount = 0;
  let effectiveMode = commissionMode;

  if (isValidFactor && baseAmount > 0) {
    if (factorNum >= 0.5) {
      finalAmount = baseAmount * factorNum;
      effectiveMode = factorNum < 1 ? 'deduct' : 'add';
      commissionAmount = Math.abs(baseAmount - finalAmount);
    } else {
      if (commissionMode === 'deduct') {
        finalAmount = baseAmount * (1 - factorNum);
        commissionAmount = baseAmount * factorNum;
      } else {
        finalAmount = baseAmount * (1 + factorNum);
        commissionAmount = baseAmount * factorNum;
      }
    }
  }

  // Active Client Payments (only payments occurring after effectiveCutoff)
  const clientPayments = useMemo(() => {
    return transactions.filter(t => 
      (t.clientId === client.id || t.customerId === client.id) && 
      t.type === 'client_payment' &&
      !t.isSettled &&
      (effectiveCutoff === 0 || new Date(t.date).getTime() > effectiveCutoff)
    );
  }, [transactions, client.id, effectiveCutoff]);

  const paidAmount = useMemo(() => {
    const todayKey = getTodayString();
    const currentMonthKey = getCurrentMonthKey();
    const calcNet = (tx) => tx.isCreditorPayout ? -Number(tx.amount) : Number(tx.amount);

    if (timeRange === 'today') {
      return clientPayments
        .filter(t => (t.dateOnly || t.date || '').startsWith(todayKey))
        .reduce((sum, t) => sum + calcNet(t), 0);
    }
    if (timeRange === 'month') {
      return clientPayments
        .filter(t => (t.dateOnly || t.date || '').slice(0, 7) === currentMonthKey)
        .reduce((sum, t) => sum + calcNet(t), 0);
    }
    return clientPayments.reduce((sum, t) => sum + calcNet(t), 0);
  }, [clientPayments, timeRange]);

  if (hasExcessDebt) {
    commissionAmount = 0;
    effectiveMode = 'none';
    finalAmount = clientExcessDebt;
  } else if (hasExcessCredit) {
    commissionAmount = 0;
    effectiveMode = 'none';
    finalAmount = clientExcessCredit;
  }

  let remainingDebt = 0;
  let creditExcess = 0;
  let isSettled = false;
  let effectiveClientType = clientType;

  if (hasExcessDebt) {
    const postPayments = clientPayments
      .filter(t => !t.isCreditorPayout)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const initialDebt = clientExcessDebt + baseAmount;
    const activeExcessDebt = Math.max(0, initialDebt - postPayments);
    remainingDebt = activeExcessDebt;
    creditExcess = 0;
    isSettled = activeExcessDebt === 0;
    effectiveClientType = isSettled ? 'عادي' : 'مدين';
    finalAmount = initialDebt;
  } else if (hasExcessCredit) {
    const postPayouts = clientPayments
      .filter(t => t.isCreditorPayout)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const activeCredit = clientExcessCredit - postPayouts - baseAmount;
    if (activeCredit > 0) {
      creditExcess = activeCredit;
      remainingDebt = 0;
      effectiveClientType = 'دائن';
      isSettled = false;
      finalAmount = clientExcessCredit;
    } else if (activeCredit === 0) {
      creditExcess = 0;
      remainingDebt = 0;
      effectiveClientType = 'عادي';
      isSettled = true;
      finalAmount = clientExcessCredit;
    } else {
      creditExcess = 0;
      remainingDebt = Math.abs(activeCredit);
      effectiveClientType = 'مدين';
      isSettled = false;
      finalAmount = Math.abs(activeCredit);
    }
  } else if (clientType === 'عادي') {
    if (baseAmount === 0) {
      remainingDebt = 0;
      creditExcess = 0;
      isSettled = true;
      effectiveClientType = 'عادي';
      finalAmount = 0;
    } else {
      const net = finalAmount - paidAmount;
      remainingDebt = net > 0 ? net : 0;
      creditExcess = net < 0 ? Math.abs(net) : 0;
      isSettled = net === 0;
      effectiveClientType = creditExcess > 0 ? 'دائن' : (remainingDebt > 0 ? 'مدين' : 'عادي');
    }
  } else {
    // Standard مدين
    const net = finalAmount - paidAmount;
    remainingDebt = net > 0 ? net : 0;
    creditExcess = net < 0 ? Math.abs(net) : 0;
    isSettled = net === 0 && (finalAmount > 0 || paidAmount !== 0);
    effectiveClientType = creditExcess > 0 ? 'دائن' : (remainingDebt > 0 ? 'مدين' : (clientType || 'مدين'));
  }

  const handleOpenPayment = () => {
    const isCreditor = effectiveClientType === 'دائن';
    const activeCredit = creditExcess > 0 ? creditExcess : (isCreditor ? finalAmount : 0);
    const activeDebt = remainingDebt > 0 ? remainingDebt : finalAmount;

    setModalData({
      client,
      currentDebt: isCreditor ? activeCredit : activeDebt,
      creditAmount: activeCredit,
      currentPaid: paidAmount,
      clientType: isCreditor ? 'دائن' : 'مدين',
      isCreditor: isCreditor
    });
    setActiveModal('clientPayment');
  };

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
      <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/90 dark:border-slate-800 rounded-t-2xl space-y-3.5">

        {/* Row 1: Client Identity & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
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

                {/* Client Classification Badge / Toggle: دائن لا يتم تفعيله يدوياً بل تلقائياً فقط */}
                {effectiveClientType === 'دائن' ? (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white shadow-xs flex items-center gap-1.5" title="عميل دائن: له رصيد مستحق ناتج عن سداد مبلغ أكبر من الدين المستحق">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>دائن (له رصيد)</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-0.5 bg-slate-200/90 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold shrink-0 border border-slate-300/60 dark:border-slate-700 shadow-2xs">
                    <button
                      type="button"
                      disabled={remainingDebt > 0}
                      onClick={() => handleSetClientType('عادي')}
                      className={`btn-interactive px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                        effectiveClientType === 'عادي'
                          ? 'bg-blue-600 text-white shadow-xs cursor-default'
                          : remainingDebt > 0
                          ? 'text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={
                        remainingDebt > 0
                          ? 'لا يمكن التحويل لحساب عادي لوجود مديونية مستحقة غير مسددة'
                          : 'عميل عادي (حساب خالص)'
                      }
                    >
                      عادي
                    </button>
                    <button
                      type="button"
                      disabled={effectiveClientType === 'مدين' || remainingDebt <= 0}
                      onClick={() => handleSetClientType('مدين')}
                      className={`btn-interactive px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                        effectiveClientType === 'مدين'
                          ? 'bg-rose-600 text-white shadow-xs cursor-default'
                          : remainingDebt <= 0
                          ? 'text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={
                        remainingDebt <= 0
                          ? 'العميل حسابه خالص (0 ج.م) - لا يمكن تحويله إلى مدين إلا إذا كان عليه فلوس أو تم شحن رصيد له'
                          : 'عميل مدين (عليه مبالغ آجلة)'
                      }
                    >
                      مدين
                    </button>
                  </div>
                )}

                {clientArchiveList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowArchiveModal(true)}
                    className="btn-interactive inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 shadow-2xs transition-colors shrink-0"
                    title="عرض أرشيف التسويات والدورات السابقة لهذا العميل"
                  >
                    <Archive className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>أرشيف التسويات ({clientArchiveList.length})</span>
                  </button>
                )}
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
              onClick={handleOpenPayment}
              className="btn-interactive flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              title="تسجيل سداد دفعة نقدية لهذا العميل"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>تسجيل سداد</span>
            </button>

            <button
              onClick={handleAddWallet}
              className="btn-interactive flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 shadow-xs"
              title="إضافة رقم محمول إضافي لهذا العميل"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة رقم</span>
            </button>

            {/* Wallets Display Mode Toggle Pill (Grid vs Table) */}
            <div className="inline-flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-full border border-slate-300/80 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                className={`p-1.5 rounded-full transition-all ${
                  walletsViewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="عرض الأرقام كـ كروت (شبكة)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('table')}
                className={`p-1.5 rounded-full transition-all ${
                  walletsViewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="عرض الأرقام كـ جدول تفصيلي"
              >
                <Table className="w-3.5 h-3.5" />
              </button>
            </div>

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

        {/* Row 2: Financial Summary & Commission Calculation Bar (شريط التحكم والملخص المالي المنظم) */}
        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
          
          {/* Sub-row 1: Time Range Filter & Commission Settings Tool */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Time Range Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
                <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>المبالغ المدخلة للأرقام:</span>
              </div>

              <div className="flex items-center gap-0.5 bg-slate-200/70 dark:bg-slate-700/60 p-0.5 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setTimeRange('today')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    timeRange === 'today'
                      ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="تجميع مبالغ شحن اليوم لكافة أرقام العميل"
                >
                  اليوم ({formatCurrency(clientStats.today)})
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('month')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    timeRange === 'month'
                      ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="تجميع مبالغ شحن هذا الشهر لكافة أرقام العميل"
                >
                  هذا الشهر ({formatCurrency(clientStats.month)})
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    timeRange === 'all'
                      ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="إجمالي كافة الشحنات السابقة لكافة أرقام العميل"
                >
                  الكل
                </button>
              </div>
            </div>

            {/* Commission Settings Tool */}
            {hasExcessDebt ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs">
                <span>صافي نقدي (بدون عمولة أو خصم)</span>
              </div>
            ) : (isSettled || effectiveClientType === 'عادي' || (baseAmount === 0 && remainingDebt <= 0 && creditExcess <= 0)) ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-bold text-xs">
                <span>-</span>
                <span className="text-[11px] font-bold">لا تنطبق عمولة (حساب خالص)</span>
              </div>
            ) : (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-2xs transition-colors ${
                effectiveMode === 'add'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
              }`}>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">العمولة:</span>
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className={`btn-interactive px-2 py-0.5 rounded-lg text-xs font-black transition-all shadow-2xs ${
                    effectiveMode === 'add'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                  title="اضغط للتبديل بين إضافة أو خصم العمولة"
                >
                  {effectiveMode === 'add' ? 'إضافة (+)' : 'خصم (-)'}
                </button>

                <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-0.5 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400 select-none">×</span>
                  <input
                    type="number"
                    step="any"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    placeholder="0.995"
                    className="w-16 sm:w-20 text-xs sm:text-sm font-black font-mono text-center bg-transparent border-none p-0 text-slate-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    title="أدخل معامل الحساب (مثال: 0.995 أو 1.005)"
                  />
                </div>

                {commissionAmount > 0 && (
                  <span className={`text-[11px] font-black font-mono mr-0.5 ${
                    effectiveMode === 'add'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`} dir="ltr">
                    ({effectiveMode === 'add' ? '+' : '-'}{formatCurrency(commissionAmount)})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Sub-row 2: Integrated Financial Balance Strip (شريط ملخص الحساب المالي الموحد) */}
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
            {/* 1. قبل العمولة */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                {hasExcessDebt ? 'المبلغ الأساسي:' : 'قبل العمولة:'}
              </span>
              <span className="font-mono text-xs sm:text-sm font-black text-slate-900 dark:text-white" dir="ltr">
                {formatCurrency(hasExcessDebt ? clientExcessDebt : baseAmount)}
              </span>
            </div>

            {/* 2. الصافي المطلوب بعد العمولة */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-white shadow-2xs ${
              hasExcessDebt
                ? 'bg-gradient-to-r from-rose-600 to-red-700 shadow-rose-600/20'
                : effectiveMode === 'add'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-600/20'
                : 'bg-gradient-to-r from-rose-600 to-red-700 shadow-rose-600/20'
            }`}>
              <span className="text-[11px] text-white/90">
                {hasExcessDebt ? 'المطلوب الأصلي:' : 'المطلوب:'}
              </span>
              <span className="font-mono text-xs sm:text-sm font-black" dir="ltr">
                {formatCurrency(hasExcessDebt ? clientExcessDebt : finalAmount)}
              </span>
            </div>

            {/* 3. المسدد */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs text-emerald-800 dark:text-emerald-300">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">المسدد:</span>
              <span className="font-mono text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                {formatCurrency(hasExcessDebt ? (clientExcessDebt - remainingDebt) : paidAmount)}
              </span>
            </div>

            {/* 4. المتبقي أو الرصيد الدائن */}
            {creditExcess > 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 font-bold shadow-2xs">
                <span className="text-[11px]">له رصيد دائن:</span>
                <strong className="font-mono text-xs sm:text-sm font-black text-teal-700 dark:text-teal-300" dir="ltr">
                  {formatCurrency(creditExcess)}
                </strong>
              </div>
            ) : isSettled || (hasExcessDebt && remainingDebt === 0) ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-black text-xs border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>خالص بالكامل (0 ج.م)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-bold shadow-2xs">
                <span className="text-[11px]">المتبقي مطلوب:</span>
                <span className="font-mono text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300" dir="ltr">
                  {formatCurrency(remainingDebt)}
                </span>
              </div>
            )}
          </div>

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
              {walletsViewMode === 'table' ? (
                /* Table View Mode (طريقة عرض الجدول التفصيلي) */
                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-xs">
                  <table className="w-full text-right border-collapse min-w-[760px]">
                    <thead>
                      <tr className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px] font-bold border-b border-slate-200/80 dark:border-slate-700">
                        <th className="py-3 px-3 text-center w-12">#</th>
                        <th className="py-3 px-3">رقم المحفظة والشبكة</th>
                        <th className="py-3 px-3">المسمى والحالة</th>
                        <th className="py-3 px-3">شحن اليوم (حد 60,000 ج.م)</th>
                        <th className="py-3 px-3">شحن الشهر (حد 200,000 ج.م)</th>
                        <th className="py-3 px-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {paginatedWallets.map((wallet, index) => {
                        const isHistoryOpen = activeHistoryWalletId === wallet.id;
                        const walletTxList = transactions.filter(t => t.walletId === wallet.id);
                        const carrier = getEgyptianCarrier(wallet.phoneNumber);
                        const stats = calculateWalletStats(wallet, transactions);
                        const rowNumber = (validWalletPage - 1) * WALLETS_PER_PAGE + index + 1;

                        return (
                          <React.Fragment key={wallet.id}>
                            <tr className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                              isHistoryOpen ? 'bg-emerald-50/50 dark:bg-emerald-950/25' : ''
                            }`}>
                              {/* Row Index */}
                              <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                                {rowNumber}
                              </td>

                              {/* Phone Number & Carrier */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm tracking-wide text-slate-900 dark:text-white" dir="ltr">
                                    {formatPhone(wallet.phoneNumber)}
                                  </span>
                                  <button
                                    onClick={(e) => handleCopyPhone(wallet.phoneNumber, e)}
                                    className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="نسخ الرقم"
                                  >
                                    {copiedPhone === wallet.phoneNumber ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  {carrier && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                                      {carrier.name}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Label & Limit Alerts */}
                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                    <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>{wallet.label || 'محفظة العميل'}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1">
                                    {stats.isClientDailyOver && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        <AlertCircle className="w-2.5 h-2.5" />
                                        تجاوز حد اليوم (+{formatCurrency(stats.clientDailyOverAmount)})
                                      </span>
                                    )}
                                    {stats.isClientMonthlyOver && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        <AlertCircle className="w-2.5 h-2.5" />
                                        تجاوز ليميت الشهر (+{formatCurrency(stats.clientMonthlyOverAmount)})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Today Recharges (Limit: 60k) */}
                              <td className="py-3 px-3">
                                <div className="space-y-0.5">
                                  <div className="font-black font-mono text-xs text-slate-800 dark:text-slate-200">
                                    {formatCurrency(stats.todayRecharges)}
                                    <span className="text-[10px] text-slate-400 font-normal mr-1">/ 60,000 ج.م</span>
                                  </div>
                                  <div className={`text-[10px] font-mono ${
                                    stats.isClientDailyOver ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'
                                  }`}>
                                    {stats.isClientDailyOver ? `تجاوز (+${formatCurrency(stats.clientDailyOverAmount)})` : `متبقي: ${formatCurrency(stats.remainingClientDaily)}`}
                                  </div>
                                </div>
                              </td>

                              {/* Monthly Recharges (Limit: 200k) */}
                              <td className="py-3 px-3 min-w-[150px]">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-black font-mono text-slate-800 dark:text-slate-200">
                                      {formatCurrency(stats.totalRecharges)}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {((stats.totalRecharges / stats.clientMonthlyLimit) * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        stats.isClientMonthlyOver ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${Math.min(100, (stats.totalRecharges / stats.clientMonthlyLimit) * 100)}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                                    <span>الليميت: {formatCurrency(stats.clientMonthlyLimit)}</span>
                                    <span className={`font-semibold ${stats.isClientMonthlyOver ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                      {stats.isClientMonthlyOver
                                        ? `تجاوز: ${formatCurrency(stats.clientMonthlyOverAmount)}`
                                        : `متبقي: ${formatCurrency(stats.remainingClientMonthly)}`}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Quick Actions */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleRechargeWallet(wallet)}
                                    className="btn-interactive inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-xs shadow-emerald-600/20"
                                    title="شحن وإضافة رصيد لهذا الخط"
                                  >
                                    <ArrowDownToLine className="w-3.5 h-3.5" />
                                    <span>شحن</span>
                                  </button>

                                  <button
                                    onClick={() => handleEditWallet(wallet)}
                                    className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                                    title="تعديل اسم أو ليميت المحفظة"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveHistoryWalletId(isHistoryOpen ? null : wallet.id);
                                    }}
                                    className={`p-1.5 rounded-xl border transition-colors inline-flex items-center gap-1 text-xs font-mono font-semibold shadow-xs ${
                                      isHistoryOpen
                                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                                    }`}
                                    title="عرض سجل العمليات"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                    <span>({walletTxList.length})</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteWallet(wallet)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                                    title="حذف هذا الرقم"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expandable History Drawer for Table View */}
                            {isHistoryOpen && (
                              <tr className="bg-slate-50/95 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 animate-fadeIn">
                                <td colSpan={6} className="p-4">
                                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-md space-y-3">
                                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                                          <History className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <h4 className="text-xs font-black text-slate-900 dark:text-white">
                                            سجل عمليات الرقم ({formatPhone(wallet.phoneNumber)})
                                          </h4>
                                          <span className="text-[10px] text-slate-400">
                                            {wallet.label || 'محفظة العميل'} • {walletTxList.length} {walletTxList.length === 1 ? 'عملية مسجلة' : 'عمليات مسجلة'}
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => setActiveHistoryWalletId(null)}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        title="إغلاق السجل"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>

                                    {/* Transactions List */}
                                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                                      {walletTxList.length === 0 ? (
                                        <div className="text-center py-6 text-slate-400 text-xs">
                                          <History className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                                          <p>لا توجد عمليات تحويل أو شحن مسجلة لهذا الرقم حتى الآن.</p>
                                        </div>
                                      ) : (
                                        walletTxList.map(tx => (
                                          <div
                                            key={tx.id}
                                            className={`flex items-center justify-between p-2.5 rounded-xl text-xs border ${
                                              tx.type === 'recharge'
                                                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
                                                : 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60'
                                            }`}
                                          >
                                            <div>
                                              <div className={`font-mono font-black text-xs sm:text-sm ${tx.type === 'recharge' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {tx.type === 'recharge' ? '+' : '-'} {formatCurrency(tx.amount)}
                                              </div>
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

                                    {/* History Summary Footer */}
                                    {walletTxList.length > 0 && (
                                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                        <span>إجمالي المحول من الرقم:</span>
                                        <span className="font-mono font-black text-slate-800 dark:text-slate-200">
                                          {formatCurrency(stats.totalTransfersOut)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Grid Cards View Mode (طريقة عرض الكروت الحالية) */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedWallets.map((wallet) => {
                    const isHistoryOpen = activeHistoryWalletId === wallet.id;
                    const walletTxList = transactions.filter(t => t.walletId === wallet.id);
                    const carrier = getEgyptianCarrier(wallet.phoneNumber);
                    const stats = calculateWalletStats(wallet, transactions);

                    return (
                      <div
                        key={wallet.id}
                        className="relative bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-700/70 hover:border-emerald-300 dark:hover:border-emerald-900/60 transition-all duration-200 group flex flex-col justify-between"
                      >
                        {/* Top Row: Label & Carrier Badge & Warnings */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                              {wallet.label || 'محفظة العميل'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {carrier && (
                              <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40">
                                {carrier.name}
                              </span>
                            )}
                            {stats.isClientMonthlyOver && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                <AlertCircle className="w-2.5 h-2.5" />
                                تجاوز ليميت الشهر (+{formatCurrency(stats.clientMonthlyOverAmount)})
                              </span>
                            )}
                            {stats.isClientDailyOver && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                <AlertCircle className="w-2.5 h-2.5" />
                                تجاوز حد اليوم (+{formatCurrency(stats.clientDailyOverAmount)})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Phone Number Display Box */}
                        <div className="bg-white dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200/80 dark:border-slate-750 flex items-center justify-between gap-2 mb-2.5">
                          <span className="text-base sm:text-xl font-black font-mono tracking-wider text-slate-900 dark:text-white" dir="ltr">
                            {formatPhone(wallet.phoneNumber)}
                          </span>
                          <button
                            onClick={(e) => handleCopyPhone(wallet.phoneNumber, e)}
                            className="btn-interactive flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
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

                        {/* Daily Recharge Tracker (Rule 1: 60,000 EGP / day with warning) */}
                        <div className="flex items-center justify-between text-[11px] bg-slate-100/90 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 mb-2">
                          <span className="text-slate-500 dark:text-slate-400">
                            شحن اليوم: <strong className={stats.isClientDailyOver ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>{formatCurrency(stats.todayRecharges)}</strong> / 60,000 ج.م
                          </span>
                          <span className={`font-bold font-mono ${stats.isClientDailyOver ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {stats.isClientDailyOver ? `تجاوز (+${formatCurrency(stats.clientDailyOverAmount)})` : `متبقي: ${formatCurrency(stats.remainingClientDaily)}`}
                          </span>
                        </div>

                        {/* Monthly Recharge Tracker (Rule 2: 200,000 EGP / month with warning) */}
                        <div className="space-y-1 mb-3 bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-750">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>
                              شحن الشهر: <strong className={stats.isClientMonthlyOver ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>{formatCurrency(stats.totalRecharges)}</strong>
                            </span>
                            <span>
                              الليميت الشهري: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(stats.clientMonthlyLimit)}</strong>
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                stats.isClientMonthlyOver ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, (stats.totalRecharges / stats.clientMonthlyLimit) * 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">
                              نسبة الشحن: {((stats.totalRecharges / stats.clientMonthlyLimit) * 100).toFixed(0)}%
                            </span>
                            <span className={`font-bold ${stats.isClientMonthlyOver ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {stats.isClientMonthlyOver
                                ? `تجاوز بمقدار ${formatCurrency(stats.clientMonthlyOverAmount)}`
                                : `متبقي للشحن: ${formatCurrency(stats.remainingClientMonthly)}`}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons for this wallet - Recharge balance only as requested */}
                        <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          {/* Direct Recharge Button (الخط يتشحن له رصيد فقط) */}
                          <button
                            onClick={() => handleRechargeWallet(wallet)}
                            className="btn-interactive flex-1 min-w-0 h-9 sm:h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-sm shadow-emerald-600/25 whitespace-nowrap"
                            title="شحن وإضافة رصيد لهذا الخط (حد يومي 60,000 ج.م وشهري 200,000 ج.م)"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">شحن رصيد</span>
                          </button>

                          {/* Edit Phone / Label */}
                          <button
                            onClick={() => handleEditWallet(wallet)}
                            className="btn-interactive shrink-0 h-9 sm:h-10 px-2 sm:px-2.5 flex items-center justify-center gap-1 rounded-xl bg-white dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/90 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 shadow-xs"
                            title="تعديل اسم أو ليميت المحفظة"
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
                            title="عرض شحنات وعمليات هذا الرقم"
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
              )}

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

      {/* Archive Modal for this Client */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    أرشيف تسويات العميل: {client.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    توثيق لكافة الحسابات والدورات السابقة المغلقة والتسويات المنتهية ({clientArchiveList.length} تسوية)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
              {clientArchiveList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  لا توجد تسويات مؤرشفة سابقة لهذا العميل بعد.
                </div>
              ) : (
                clientArchiveList.map((item, idx) => (
                  <div key={item.id || idx} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                          {item.cycleType || 'تسوية حساب'}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDateTimeArabic(item.settledAt || item.date)}
                        </span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        الحالة الناتجة: {item.resultingStatus || item.resultingType || 'عادي'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px]">الرصيد قبل التسوية</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.previousDebt || item.debtBefore || item.creditBefore || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">المبلغ المدفوع / المصروف</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.totalPaid || item.amountPaid || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">الفائض المتبقي</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(item.excessRemaining || item.excessAmount || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">طريقة السداد</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {item.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : item.paymentMethod === 'instapay' ? 'إنستاباي' : item.paymentMethod === 'bank' ? 'تحويل بنكي' : 'نقداً'}
                        </span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/40 dark:border-amber-900/30">
                        {item.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
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
