import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  getEgyptianCarrier,
  buildWhatsAppUrl,
  cleanEgyptianPhone,
  isValidEgyptianPhone,
  getEgyptianPhoneError
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
  Archive,
  Clock,
  ArrowUpDown,
  MessageCircle,
  ExternalLink
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
    dismissedArchiveIds,
    deleteClientArchive,
    archiveClientCycle
  } = useCash();

  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(null);
  const [activeHistoryWalletId, setActiveHistoryWalletId] = useState(null);
  const [walletPage, setWalletPage] = useState(1);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [closingArchiveModal, setClosingArchiveModal] = useState(false);
  const [archiveModalTab, setArchiveModalTab] = useState('steps'); // 'steps' | 'recharges' | 'payments'
  const [archiveSortOrder, setArchiveSortOrder] = useState('asc'); // 'asc' (chronological steps) | 'desc'
  const [archivePage, setArchivePage] = useState(1);
  const [isEditingWhatsapp, setIsEditingWhatsapp] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState(client.whatsappPhone || '');
  const [whatsappError, setWhatsappError] = useState('');

  useEffect(() => {
    if (!isEditingWhatsapp) {
      setWhatsappInput(client.whatsappPhone || '');
    }
  }, [client.whatsappPhone, isEditingWhatsapp]);

  const handleCloseArchiveModal = () => {
    if (closingArchiveModal) return;
    setClosingArchiveModal(true);
    setTimeout(() => {
      setShowArchiveModal(false);
      setClosingArchiveModal(false);
    }, 230);
  };

  // Client's recorded and unified settlement & recharge operations
  const clientArchiveList = useMemo(() => {
    let clearedAt = 0;
    try {
      clearedAt = Number(localStorage.getItem(`elaasar_client_archive_cleared_${client.id}`)) || 0;
    } catch {}

    const list = (clientArchives || [])
      .filter(a => (a.clientId === client.id || a.clientName === client.name) &&
        !dismissedArchiveIds?.has(a.id) &&
        !dismissedArchiveIds?.has(a.transactionId)
      )
      .map(a => ({ ...a }));

    const archivedTxIds = new Set(list.map(a => a.transactionId || a.id).filter(Boolean));
    const clientWalletIds = new Set((client.wallets || []).map(w => w.id));
    const clientWalletPhones = new Set((client.wallets || []).map(w => w.phoneNumber).filter(Boolean));

    (transactions || []).forEach(t => {
      const isMatch = (
        t.customerId === client.id ||
        t.clientId === client.id ||
        (t.walletId && clientWalletIds.has(t.walletId)) ||
        (t.walletPhone && clientWalletPhones.has(t.walletPhone))
      );
      if (!isMatch) return;
      if (dismissedArchiveIds?.has(t.id) || dismissedArchiveIds?.has(`tx_${t.id}`)) return;
      if (clearedAt && new Date(t.date).getTime() <= clearedAt) return;
      if (archivedTxIds.has(t.id) || archivedTxIds.has(`tx_${t.id}`)) return;

      const numAmt = Number(t.amount) || 0;
      const wallet = (client.wallets || []).find(w => w.id === t.walletId || w.phoneNumber === t.walletPhone);

      if (t.type === 'recharge' || t.type === 'limit_reset') {
        list.push({
          id: `tx_${t.id}`,
          transactionId: t.id,
          clientId: client.id,
          clientName: client.name,
          cycleType: 'شحن رصيد للخط',
          operationCategory: 'recharge',
          rechargeAmount: numAmt,
          amountPaid: 0,
          debtBefore: 0,
          creditBefore: 0,
          excessAmount: 0,
          finalBalance: numAmt,
          resultingType: 'مدين',
          paymentMethod: 'recharge',
          walletPhone: t.walletPhone || wallet?.phoneNumber || '',
          walletLabel: t.walletLabel || wallet?.label || '',
          notes: t.notes || (t.walletPhone ? `شحن رصيد لرقم ${formatPhone(t.walletPhone)}` : 'شحن رصيد للخط'),
          date: t.date,
          dateOnly: t.dateOnly,
          time: formatTimeArabic(t.time || t.date)
        });
      } else if (t.type === 'client_payment') {
        list.push({
          id: `tx_${t.id}`,
          transactionId: t.id,
          clientId: client.id,
          clientName: client.name,
          cycleType: t.isCreditorPayout ? 'صرف مستحقات دائن' : 'سداد دفعة من الحساب',
          operationCategory: t.isCreditorPayout ? 'payout' : 'payment',
          rechargeAmount: 0,
          amountPaid: numAmt,
          debtBefore: 0,
          creditBefore: 0,
          excessAmount: 0,
          finalBalance: 0,
          resultingType: t.isCreditorPayout ? 'عادي' : 'مدين',
          paymentMethod: t.paymentMethod || 'cash',
          walletPhone: t.walletPhone || '',
          walletLabel: t.walletLabel || '',
          notes: t.notes || (t.isCreditorPayout ? 'صرف مستحقات للعميل الدائن' : 'سداد دفعة من الحساب'),
          date: t.date,
          dateOnly: t.dateOnly,
          time: formatTimeArabic(t.time || t.date)
        });
      }
    });

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const item of list) {
      const amt = Number(item.amountPaid) || Number(item.rechargeAmount) || 0;
      const key = item.transactionId
        ? `tx_${item.transactionId}`
        : `${item.clientId}_${item.dateOnly}_${item.time}_${item.cycleType}_${amt}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    // Sort chronologically (oldest to newest) to compute running balances and step numbers
    unique.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (Math.abs(timeA - timeB) > 60000) return timeA - timeB;
      const isRechargeA = a.operationCategory === 'recharge' || a.cycleType?.includes('شحن');
      const isRechargeB = b.operationCategory === 'recharge' || b.cycleType?.includes('شحن');
      if (isRechargeA && !isRechargeB) return -1;
      if (!isRechargeA && isRechargeB) return 1;
      return timeA - timeB;
    });

    let running = 0;
    const computed = unique.map((rec, idx) => {
      const isRecharge = rec.operationCategory === 'recharge' || rec.cycleType?.includes('شحن');
      const isPayout = rec.operationCategory === 'payout' || rec.cycleType?.includes('صرف مستحقات');
      const isZeroSettlement = rec.resultingType === 'عادي' || rec.cycleType?.includes('تصفير') || rec.cycleType?.includes('كامل المديونية');
      const rechargeAmt = Number(rec.rechargeAmount) || (isRecharge ? (Number(rec.amountPaid) || Number(rec.amount) || Number(rec.finalBalance) || 0) : 0);
      const paidAmt = !isRecharge ? (Number(rec.amountPaid) || Number(rec.amount) || 0) : 0;

      const balanceBefore = running;
      if (isRecharge) {
        running += rechargeAmt;
      } else if (isPayout) {
        running += paidAmt;
      } else {
        running -= paidAmt;
      }

      if (isZeroSettlement) {
        running = 0;
      } else if (rec.excessAmount > 0 && rec.resultingType === 'دائن') {
        running = -Number(rec.excessAmount);
      } else if (!isRecharge && rec.finalBalance !== undefined && rec.finalBalance !== null && !isNaN(Number(rec.finalBalance))) {
        if (rec.resultingType === 'مدين') running = Number(rec.finalBalance);
        else if (rec.resultingType === 'دائن') running = -Number(rec.finalBalance);
      }

      return {
        ...rec,
        stepNumber: idx + 1,
        balanceBefore,
        balanceAfter: running
      };
    });

    return computed;
  }, [clientArchives, client, transactions, dismissedArchiveIds]);

  // Archive summary stats
  const clientArchiveSummary = useMemo(() => {
    let totalRecharged = 0;
    let totalPaid = 0;
    let totalExcess = 0;
    const recharges = [];
    const payments = [];

    clientArchiveList.forEach(rec => {
      const isRecharge = rec.operationCategory === 'recharge' || rec.cycleType?.includes('شحن');
      if (isRecharge) {
        const amt = Number(rec.rechargeAmount) || (Number(rec.amountPaid) || Number(rec.amount) || Number(rec.finalBalance) || 0);
        totalRecharged += amt;
        recharges.push(rec);
      } else {
        const amt = Number(rec.amountPaid) || Number(rec.amount) || 0;
        totalPaid += amt;
        payments.push(rec);
      }
      totalExcess += (Number(rec.excessAmount) || 0);
    });

    const latestRecord = clientArchiveList.length > 0 ? clientArchiveList[clientArchiveList.length - 1] : null;

    return {
      totalRecharged,
      totalPaid,
      totalExcess,
      recharges,
      payments,
      latestRecord
    };
  }, [clientArchiveList]);

  // Display list according to active tab and sort order
  const activeArchiveDisplayList = useMemo(() => {
    let list = [];
    if (archiveModalTab === 'recharges') {
      list = clientArchiveSummary.recharges;
    } else if (archiveModalTab === 'payments') {
      list = clientArchiveSummary.payments;
    } else {
      list = clientArchiveList;
    }

    if (archiveSortOrder === 'desc') {
      return [...list].reverse();
    }
    return list;
  }, [archiveModalTab, archiveSortOrder, clientArchiveSummary, clientArchiveList]);

  const ARCHIVE_ITEMS_PER_PAGE = 10;
  const totalArchivePages = Math.ceil(activeArchiveDisplayList.length / ARCHIVE_ITEMS_PER_PAGE) || 1;
  const safeArchivePage = Math.min(Math.max(1, archivePage), totalArchivePages);
  const paginatedArchiveList = useMemo(() => {
    const start = (safeArchivePage - 1) * ARCHIVE_ITEMS_PER_PAGE;
    return activeArchiveDisplayList.slice(start, start + ARCHIVE_ITEMS_PER_PAGE);
  }, [activeArchiveDisplayList, safeArchivePage]);

  const handleDeleteArchive = async (item) => {
    const isRecharge = item.operationCategory === 'recharge' || item.cycleType?.includes('شحن');
    const confirmed = await askConfirm({
      title: isRecharge ? 'حذف حركة الشحن من الأرشيف' : 'حذف عملية من الأرشيف',
      message: `هل أنت متأكد من حذف ${isRecharge ? 'حركة الشحن' : 'حركة التسوية'} (${formatCurrency(item.amountPaid || item.rechargeAmount || item.finalBalance || 0)}) من أرشيف العميل؟`,
      details: 'سيتم مسح هذه الحركة من سجل الأرشيف فقط، ولن تتأثر المبيعات ولا العمليات المسجلة على الخط نهائياً.',
      type: 'danger',
      confirmText: 'نعم، احذف من الأرشيف',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      // حذف سجل الأرشيف فقط دون المساس بالمبيعات أو حركات الشحن الأصلية على الخط أو ليميت المحفظة
      deleteClientArchive(item.id, item.transactionId);
    }
  };

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
  const wallets = client.wallets || [];
  const clientWalletIds = useMemo(() => new Set(wallets.map(w => w.id)), [wallets]);

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

  // Calculate active net credit remaining after any subsequent recharges or creditor payouts (فقط للعميل الدائن)
  let hasExcessCredit = false;
  if (clientType === 'دائن' && typeof clientExcessCredit === 'number' && clientExcessCredit > 0 && clientExcessCreditDate) {
    const cDate = new Date(clientExcessCreditDate).getTime();
    const postRechargesSum = (transactions || []).filter(t =>
      (clientWalletIds.has(t.walletId) || t.customerId === client.id || t.clientId === client.id) &&
      (t.type === 'recharge' || t.type === 'limit_reset') &&
      !t.isSettled &&
      new Date(t.date).getTime() > cDate
    ).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const postPayoutsSum = (transactions || []).filter(t =>
      (t.clientId === client.id || t.customerId === client.id) &&
      t.type === 'client_payment' &&
      t.isCreditorPayout &&
      !t.isSettled &&
      new Date(t.date).getTime() > cDate
    ).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    if (clientExcessCredit - postPayoutsSum - postRechargesSum > 0) {
      hasExcessCredit = true;
    }
  } else if (clientType === 'دائن' && typeof clientExcessCredit === 'number' && clientExcessCredit > 0) {
    hasExcessCredit = true;
  }

  const hasExcessDebt = !hasExcessCredit && clientType === 'مدين' && typeof clientExcessDebt === 'number' && clientExcessDebt > 0;

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
  const WALLETS_PER_PAGE = walletsViewMode === 'table' ? 6 : 3;
  const totalWalletPages = Math.ceil(wallets.length / WALLETS_PER_PAGE) || 1;
  const validWalletPage = Math.min(Math.max(1, walletPage), totalWalletPages);

  const paginatedWallets = useMemo(() => {
    const startIndex = (validWalletPage - 1) * WALLETS_PER_PAGE;
    return wallets.slice(startIndex, startIndex + WALLETS_PER_PAGE);
  }, [wallets, validWalletPage, WALLETS_PER_PAGE]);

  // Calculations for total amounts entered into client lines (recharges)
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
    finalAmount = 0; // العميل الدائن لا يُطلب منه دين
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
      finalAmount = 0; // العميل الدائن لا يُطلب منه دين
    } else if (activeCredit === 0) {
      creditExcess = 0;
      remainingDebt = 0;
      effectiveClientType = 'عادي';
      isSettled = true;
      finalAmount = 0;
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

  const handleSaveWhatsapp = () => {
    const trimmed = (whatsappInput || '').trim();
    if (!trimmed) {
      updateClient(client.id, { whatsappPhone: '' });
      setIsEditingWhatsapp(false);
      setWhatsappError('');
      showToast('تم إزالة رقم الواتساب للعميل');
      return;
    }

    const cleaned = cleanEgyptianPhone(trimmed);
    if (!isValidEgyptianPhone(cleaned)) {
      const err = getEgyptianPhoneError(cleaned);
      setWhatsappError(err || 'يرجى إدخال رقم محمول مصري صحيح (11 رقم)');
      return;
    }

    updateClient(client.id, { whatsappPhone: cleaned });
    setIsEditingWhatsapp(false);
    setWhatsappError('');
    showToast(`تم حفظ رقم الواتساب: ${cleaned}`);
  };

  const generateClientWhatsAppReport = () => {
    const isAdd = effectiveMode === 'add';
    const modeText = isAdd ? 'إضافة' : 'خصم';
    const periodLabel = timeRange === 'today' ? 'اليوم' : timeRange === 'month' ? 'هذا الشهر' : 'الإجمالي';

    let balanceLine = '';
    if (paidAmount > 0) {
      if (creditExcess > 0) {
        balanceLine = `المبالغ المسددة: ${formatCurrency(paidAmount)}\nالرصيد الدائن المستحق لحضرتكم: ${formatCurrency(creditExcess)}`;
      } else if (isSettled) {
        balanceLine = `المبالغ المسددة: ${formatCurrency(paidAmount)}\nالحساب خالص تماماً (0 ج.م)`;
      } else {
        balanceLine = `المبالغ المسددة: ${formatCurrency(paidAmount)}\nالمتبقي المطلوب سداده: ${formatCurrency(remainingDebt)}`;
      }
    } else {
      balanceLine = `المطلوب سداده بعد العمولة: ${formatCurrency(finalAmount)}`;
    }

    return `السلام عليكم ورحمة الله،
كشف حساب (${periodLabel}) - محلات الأعصر:
العميل: ${client.name}
عدد الخطوط: ${wallets.length}
-----------------------------
المبلغ قبل العمولة: ${formatCurrency(baseAmount)}
${hasExcessDebt ? 'العمولة: بدون عمولة (صافي نقدي مباشر)' : `معامل الحساب: × ${commissionPercent} (${modeText} ${formatCurrency(commissionAmount)})`}
المبلغ الأساسي المطلوب (قبل السداد): ${formatCurrency(finalAmount)}
-----------------------------
${balanceLine}
-----------------------------
نسعد دائماً بخدمتكم، شكراً لتعاملكم معنا.`;
  };

  const handleOpenClientWhatsApp = (e) => {
    if (e) e.stopPropagation();
    const targetPhone = client.whatsappPhone || wallets[0]?.phoneNumber;
    if (!targetPhone) {
      showToast('لا يوجد رقم هاتف أو واتساب مسجل لهذا العميل', 'warning');
      return;
    }
    const url = buildWhatsAppUrl(targetPhone, '');
    window.open(url, '_blank');
  };

  const handleSendWhatsAppReport = (e) => {
    if (e) e.stopPropagation();
    const targetPhone = client.whatsappPhone || wallets[0]?.phoneNumber;
    if (!targetPhone) {
      showToast('يرجى إضافة رقم واتساب أو رقم محفظة للعميل أولاً', 'warning');
      return;
    }
    const text = generateClientWhatsAppReport();
    const url = buildWhatsAppUrl(targetPhone, text);
    window.open(url, '_blank');
    showToast(`جاري فتح واتساب لإرسال كشف حساب العميل "${client.name}"`);
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
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 rounded-t-2xl space-y-4">

        {/* Row 1: Clean Identity & Action Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 dark:from-red-600 dark:to-rose-700 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
              {client.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight truncate">
                  {client.name}
                </h3>

                {/* Compact Classification Pill */}
                {effectiveClientType === 'دائن' ? (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title="عميل دائن: له رصيد مستحق">
                    دائن
                  </span>
                ) : (
                  <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold border border-slate-200/80 dark:border-slate-700">
                    <button
                      type="button"
                      disabled={remainingDebt > 0}
                      onClick={() => handleSetClientType('عادي')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        effectiveClientType === 'عادي'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs font-black'
                          : remainingDebt > 0
                          ? 'text-slate-400 opacity-40 cursor-not-allowed'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                      title={remainingDebt > 0 ? 'لا يمكن التحويل لحساب عادي لوجود مديونية مستحقة' : 'عميل عادي (حساب خالص)'}
                    >
                      عادي
                    </button>
                    <button
                      type="button"
                      disabled={effectiveClientType === 'مدين' || remainingDebt <= 0}
                      onClick={() => handleSetClientType('مدين')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        effectiveClientType === 'مدين'
                          ? 'bg-rose-600 text-white shadow-2xs font-black'
                          : remainingDebt <= 0
                          ? 'text-slate-400 opacity-40 cursor-not-allowed'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                      title={remainingDebt <= 0 ? 'العميل حسابه خالص (0 ج.م)' : 'عميل مدين'}
                    >
                      مدين
                    </button>
                  </div>
                )}
              </div>

              {/* Clean Subtle Meta Line: Wallets count + Notes + Inline WhatsApp */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {wallets.length} {wallets.length === 1 ? 'رقم مسجل' : 'أرقام مسجلة'}
                </span>

                {isEditingWhatsapp ? (
                  <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-emerald-400 rounded-lg px-2 py-0.5">
                    <MessageCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                    <input
                      type="tel"
                      dir="ltr"
                      value={whatsappInput}
                      onChange={(e) => {
                        setWhatsappInput(e.target.value);
                        if (whatsappError) setWhatsappError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveWhatsapp();
                        if (e.key === 'Escape') {
                          setIsEditingWhatsapp(false);
                          setWhatsappError('');
                        }
                      }}
                      placeholder="010XXXXXXXX"
                      className="w-24 text-[11px] font-mono font-bold bg-transparent outline-none text-slate-800 dark:text-slate-100"
                      autoFocus
                    />
                    <button type="button" onClick={handleSaveWhatsapp} className="text-emerald-600 hover:text-emerald-700" title="حفظ">
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsEditingWhatsapp(false); setWhatsappError(''); }}
                      className="text-slate-400 hover:text-slate-600"
                      title="إلغاء"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : client.whatsappPhone ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <MessageCircle className="w-3 h-3 shrink-0" />
                    <button
                      type="button"
                      onClick={handleOpenClientWhatsApp}
                      className="hover:underline font-mono font-bold"
                      title="فتح شات واتساب"
                    >
                      {client.whatsappPhone}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWhatsappInput(client.whatsappPhone || '');
                        setIsEditingWhatsapp(true);
                      }}
                      className="text-slate-400 hover:text-emerald-600 p-0.5"
                      title="تعديل رقم الواتساب"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappInput(wallets[0]?.phoneNumber || '');
                      setIsEditingWhatsapp(true);
                    }}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>+ واتساب</span>
                  </button>
                )}

                {client.notes && (
                  <span className="truncate max-w-xs text-slate-400 dark:text-slate-500">
                    • {client.notes}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clean Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-1.5 self-end xl:self-auto shrink-0">
            <button
              onClick={handleOpenPayment}
              className="btn-interactive inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              title="تسجيل سداد دفعة نقدية لهذا العميل"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>تسجيل سداد</span>
            </button>

            <button
              onClick={handleAddWallet}
              className="btn-interactive inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/50 text-slate-700 hover:text-red-600 dark:text-slate-200 dark:hover:text-red-400 border border-slate-200/80 dark:border-slate-700 transition-colors"
              title="إضافة رقم محمول إضافي لهذا العميل"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة رقم</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsAppReport}
              className="btn-interactive inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 text-slate-700 hover:text-emerald-700 dark:text-slate-200 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-slate-700 transition-colors"
              title={client.whatsappPhone ? `إرسال كشف الحساب بالواتساب للرقم (${client.whatsappPhone})` : wallets[0]?.phoneNumber ? `إرسال كشف الحساب بالواتساب للرقم (${wallets[0]?.phoneNumber})` : 'إرسال كشف الحساب بالواتساب'}
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">كشف حساب</span>
            </button>

            {clientArchiveList.length > 0 && (
              <button
                type="button"
                onClick={() => setShowArchiveModal(true)}
                className="btn-interactive inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 transition-colors"
                title="عرض أرشيف وتسلسل العمليات لهذا العميل"
              >
                <Archive className="w-3.5 h-3.5" />
                <span className="font-mono">{clientArchiveList.length}</span>
              </button>
            )}

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 hidden sm:block" />

            {/* Wallets Display Mode Toggle */}
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleToggleViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  walletsViewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
                title="عرض الأرقام كـ كروت (شبكة)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${
                  walletsViewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
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
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isExpanded ? 'طي الأرقام' : 'عرض الأرقام'}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Clean Financial Summary & Controls (Side by Side) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* Controls Side: Period Filter & Commission */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">الفترة:</span>
              <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setTimeRange('today')}
                  className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                    timeRange === 'today'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  اليوم ({formatCurrency(clientStats.today)})
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('month')}
                  className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                    timeRange === 'month'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  الشهر ({formatCurrency(clientStats.month)})
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('all')}
                  className={`px-2 py-1 rounded-md transition-all whitespace-nowrap ${
                    timeRange === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  الكل
                </button>
              </div>
            </div>

            {!hasExcessDebt && !(isSettled || (effectiveClientType === 'عادي' && baseAmount === 0)) && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs">
                <span className="text-[11px] font-bold text-slate-500">العمولة:</span>
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-black transition-all whitespace-nowrap ${
                    effectiveMode === 'add'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                  title="اضغط للتبديل بين إضافة أو خصم العمولة"
                >
                  {effectiveMode === 'add' ? 'إضافة +' : 'خصم -'}
                </button>
                <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5">
                  <span className="text-[11px] text-slate-400">×</span>
                  <input
                    type="number"
                    step="any"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    placeholder="0.995"
                    className="w-12 text-xs font-black font-mono text-center bg-transparent border-none p-0 text-slate-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                {commissionAmount > 0 && (
                  <span className={`text-[11px] font-black font-mono whitespace-nowrap ${
                    effectiveMode === 'add' ? 'text-emerald-600' : 'text-rose-600'
                  }`} dir="ltr">
                    ({effectiveMode === 'add' ? '+' : '-'}{formatCurrency(commissionAmount)})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Compact Architectural 4-Column Stat Strip */}
          <div className="w-full xl:w-auto grid grid-cols-2 sm:inline-grid sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200/70 dark:divide-slate-800 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 overflow-hidden">
            {/* 1. قبل العمولة */}
            <div className="px-2.5 py-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {hasExcessDebt ? 'الأساسي' : 'قبل العمولة'}
              </span>
              <span className="font-mono text-[11px] font-black text-slate-800 dark:text-slate-100 whitespace-nowrap" dir="ltr">
                {formatCurrency(hasExcessDebt ? clientExcessDebt : baseAmount)}
              </span>
            </div>

            {/* 2. المطلوب */}
            <div className="px-2.5 py-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {hasExcessDebt ? 'المطلوب الأصلي' : 'المطلوب'}
              </span>
              <span
                className={`font-mono text-[11px] font-black whitespace-nowrap ${
                  effectiveClientType === 'دائن' || creditExcess > 0 || (hasExcessDebt ? clientExcessDebt : finalAmount) === 0
                    ? 'text-slate-700 dark:text-slate-200'
                    : effectiveMode === 'add' && !hasExcessDebt
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
                dir="ltr"
              >
                {formatCurrency(effectiveClientType === 'دائن' || creditExcess > 0 ? 0 : (hasExcessDebt ? clientExcessDebt : finalAmount))}
              </span>
            </div>

            {/* 3. المسدد */}
            <div className="px-2.5 py-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">المسدد</span>
              <span className="font-mono text-[11px] font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap" dir="ltr">
                {formatCurrency(hasExcessDebt ? (clientExcessDebt - remainingDebt) : paidAmount)}
              </span>
            </div>

            {/* 4. الصافي / الحالة */}
            <div className={`px-2.5 py-1 flex items-center justify-between gap-2 ${
              creditExcess > 0
                ? 'bg-teal-50/70 dark:bg-teal-950/30'
                : isSettled || (hasExcessDebt && remainingDebt === 0)
                ? 'bg-emerald-50/60 dark:bg-emerald-950/25'
                : 'bg-rose-50/70 dark:bg-rose-950/30'
            }`}>
              {creditExcess > 0 ? (
                <>
                  <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 whitespace-nowrap">دائن</span>
                  <span className="font-mono text-[11px] font-black text-teal-700 dark:text-teal-300 whitespace-nowrap" dir="ltr">
                    {formatCurrency(creditExcess)}
                  </span>
                </>
              ) : isSettled || (hasExcessDebt && remainingDebt === 0) ? (
                <>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>الحالة</span>
                  </span>
                  <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                    خالص (0 ج.م)
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 whitespace-nowrap">المتبقي</span>
                  <span className="font-mono text-[11px] font-black text-rose-600 dark:text-rose-400 whitespace-nowrap" dir="ltr">
                    {formatCurrency(remainingDebt)}
                  </span>
                </>
              )}
            </div>
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

      {/* Right Sheet on Tablet/Desktop & Bottom Sheet on Mobile: Client Operations Archive */}
      {showArchiveModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden" dir="rtl">
          {/* Backdrop Overlay */}
          <div 
            className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity ${
              closingArchiveModal ? 'animate-right-sheet-backdrop-out' : 'animate-right-sheet-backdrop'
            }`}
            onClick={handleCloseArchiveModal}
          />

          <div className={`fixed inset-x-0 bottom-0 top-auto max-h-[90dvh] rounded-t-3xl border-t sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:bottom-0 sm:h-full sm:max-h-full sm:rounded-none sm:rounded-l-3xl sm:border-l sm:border-t-0 z-10 w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden ${
            closingArchiveModal ? 'animate-bottom-sheet-out sm:animate-right-sheet-out' : 'animate-bottom-sheet sm:animate-right-sheet'
          }`}>
              {/* Mobile Drag Handle Indicator */}
              <div className="sm:hidden w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />
              
              {/* Sheet Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-xs">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        أرشيف وتسلسل عمليات: {client.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-mono">
                        {clientArchiveList.length} عملية مسجلة
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      خطوات الحساب مسجلة بالترتيب الزمني خطوة بخطوة بالوقت والتاريخ بالدقيقة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setArchiveSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs"
                    title="التبديل بين تسلسل الخطوات من البداية حتى الآن أو عرض الأحدث أولاً"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>
                      {archiveSortOrder === 'asc' ? 'الترتيب: خطوات متسلسلة (الأقدم للأحدث)' : 'الترتيب: الأحدث أولاً'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseArchiveModal}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="إغلاق اللوحة الجانبية"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Sheet Body with Responsive Max-Height */}
              <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto max-h-[calc(90dvh-130px)] sm:max-h-[calc(100vh-140px)] min-h-0">
                {/* Stats Summary: 3 Clean KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block mb-0.5">إجمالي مبالغ الشحن</span>
                      <strong className="font-mono text-lg font-black text-blue-700 dark:text-blue-300" dir="ltr">
                        +{formatCurrency(clientArchiveSummary.totalRecharged)}
                      </strong>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {clientArchiveSummary.recharges.length} شحنة
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">إجمالي المبالغ المسددة</span>
                      <strong className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                        -{formatCurrency(clientArchiveSummary.totalPaid)}
                      </strong>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      {clientArchiveSummary.payments.length} سداد
                    </span>
                  </div>

                  {(() => {
                    const latest = clientArchiveSummary.latestRecord || {};
                    const isNormal = latest.resultingType === 'عادي' || latest.balanceAfter === 0;
                    const isCreditor = latest.balanceAfter < 0 || latest.resultingType === 'دائن';
                    return (
                      <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        isCreditor
                          ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-300 text-teal-800 dark:text-teal-200'
                          : !isNormal
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-200'
                          : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                      }`}>
                        <div>
                          <span className="text-[11px] font-bold block mb-0.5">
                            {isCreditor ? 'رصيد دائن للعميل' : !isNormal ? 'متبقي مطلوب (مدين)' : 'حالة الحساب بعد آخر حركة'}
                          </span>
                          <strong className="font-mono text-lg font-black" dir="ltr">
                            {isNormal ? 'خالص (0 ج.م)' : isCreditor ? `+${formatCurrency(Math.abs(latest.balanceAfter || 0))}` : formatCurrency(latest.balanceAfter || 0)}
                          </strong>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 shadow-2xs">
                          {isNormal ? 'مسدد بالكامل' : isCreditor ? 'له رصيد' : 'مطلوب سداده'}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setArchiveModalTab('steps');
                      setArchivePage(1);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      archiveModalTab === 'steps'
                        ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm border border-purple-200/80 dark:border-purple-800'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>تسلسل وترتيب العمليات (خطوة بخطوة)</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      {clientArchiveList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setArchiveModalTab('recharges');
                      setArchivePage(1);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      archiveModalTab === 'recharges'
                        ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200/80 dark:border-blue-800'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>شحنات الخطوط</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {clientArchiveSummary.recharges.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setArchiveModalTab('payments');
                      setArchivePage(1);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                      archiveModalTab === 'payments'
                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-200/80 dark:border-emerald-800'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>سجل المدفوعات والسداد</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      {clientArchiveSummary.payments.length}
                    </span>
                  </button>
                </div>

                {/* Body Content: Active Tab Content */}
                <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl min-h-[220px]">
                  
                  {/* TAB 1: Sequential Steps */}
                  {archiveModalTab === 'steps' && (
                    clientArchiveList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        لا توجد عمليات مؤرشفة سابقة لهذا العميل بعد.
                      </div>
                    ) : (
                      <table className="w-full text-right border-collapse text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-750">
                          <tr>
                            <th className="py-2.5 px-3 w-16 text-center">الخطوة</th>
                            <th className="py-2.5 px-3 min-w-[130px]">التاريخ والوقت</th>
                            <th className="py-2.5 px-3 min-w-[150px]">نوع العملية</th>
                            <th className="py-2.5 px-3 min-w-[160px]">البيان / الخط / طريقة الدفع</th>
                            <th className="py-2.5 px-3 min-w-[120px] text-blue-700 dark:text-blue-300">المبلغ المشحون (+)</th>
                            <th className="py-2.5 px-3 min-w-[130px] text-emerald-700 dark:text-emerald-300">المبلغ المسدد (-)</th>
                            <th className="py-2.5 px-3 min-w-[160px] text-slate-900 dark:text-white bg-slate-200/50 dark:bg-slate-750 font-black">الرصيد بعد الحركة (المتبقي)</th>
                            <th className="py-2.5 px-3 min-w-[90px]">الفائض</th>
                            <th className="py-2.5 px-3 min-w-[160px]">الملاحظات</th>
                            <th className="py-2.5 px-3 w-12 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {paginatedArchiveList.map((arch, idx) => {
                            const isRecharge = arch.operationCategory === 'recharge' || arch.cycleType?.includes('شحن');
                            const isPayout = arch.operationCategory === 'payout' || arch.cycleType?.includes('صرف مستحقات');
                            const rechargeAmt = Number(arch.rechargeAmount) || (isRecharge ? (Number(arch.amountPaid) || Number(arch.amount) || Number(arch.finalBalance) || 0) : 0);
                            const paidAmt = !isRecharge ? (Number(arch.amountPaid) || Number(arch.amount) || 0) : 0;
                            const isZeroBalance = arch.balanceAfter === 0;
                            const isCreditorBalance = arch.balanceAfter < 0;

                            return (
                              <tr key={arch.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded-full font-mono font-bold text-[11px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                    #{arch.stepNumber || idx + 1}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {formatDateArabic(arch.date)}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-purple-500" />
                                    <span>{formatTimeArabic(arch.time || arch.date)}</span>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3">
                                  {isRecharge ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                      <ArrowDownToLine className="w-3 h-3 text-blue-600" />
                                      <span>شحن رصيد للخط</span>
                                    </span>
                                  ) : isPayout ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                      <Wallet className="w-3 h-3 text-teal-600" />
                                      <span>صرف مستحقات دائن</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>{arch.cycleType || 'سداد دفعة من الحساب'}</span>
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3">
                                  {arch.walletPhone ? (
                                    <div className="space-y-0.5">
                                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1" dir="ltr">
                                        <Smartphone className="w-3 h-3 text-slate-400" />
                                        <span>{formatPhone(arch.walletPhone)}</span>
                                      </div>
                                      {arch.walletLabel && (
                                        <div className="text-[10px] text-slate-400">{arch.walletLabel}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                      {arch.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : arch.paymentMethod === 'instapay' ? 'إنستاباي' : arch.paymentMethod === 'bank' ? 'تحويل بنكي' : 'نقدي (كاش)'}
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 font-mono font-bold" dir="ltr">
                                  {isRecharge ? (
                                    <span className="text-blue-600 dark:text-blue-400 font-black text-sm">
                                      +{formatCurrency(rechargeAmt)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 font-mono font-bold" dir="ltr">
                                  {!isRecharge ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                                      -{formatCurrency(paidAmt)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 bg-slate-50/50 dark:bg-slate-800/40">
                                  {isZeroBalance ? (
                                    <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-xs">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>خالص (0 ج.م)</span>
                                    </div>
                                  ) : !isCreditorBalance ? (
                                    <div className="space-y-0.5">
                                      <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm" dir="ltr">
                                        {formatCurrency(arch.balanceAfter)}
                                      </span>
                                      <span className="text-[10px] text-rose-500 block font-bold">
                                        متبقي مطلوب (مدين)
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <span className="font-mono font-black text-teal-600 dark:text-teal-400 text-sm" dir="ltr">
                                        +{formatCurrency(Math.abs(arch.balanceAfter))}
                                      </span>
                                      <span className="text-[10px] text-teal-600 block font-bold">
                                        رصيد دائن للعميل
                                      </span>
                                    </div>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 font-mono font-bold" dir="ltr">
                                  {arch.excessAmount > 0 ? (
                                    <span className="text-purple-600 dark:text-purple-400 font-black">
                                      +{formatCurrency(arch.excessAmount)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={arch.notes}>
                                  {arch.notes || (isRecharge ? 'شحن رصيد للخط' : 'تسوية وتصفير دورة الحساب')}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteArchive(arch)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                    title="حذف هذه العملية من الأرشيف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )
                  )}

                  {/* TAB 2: Recharges ONLY */}
                  {archiveModalTab === 'recharges' && (
                    clientArchiveSummary.recharges.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        لا توجد عمليات شحن مسجلة لهذا العميل في الأرشيف.
                      </div>
                    ) : (
                      <table className="w-full text-right border-collapse text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-750">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">#</th>
                            <th className="py-2.5 px-3 min-w-[130px]">التاريخ والوقت</th>
                            <th className="py-2.5 px-3 min-w-[170px]">رقم الخط / المحفظة</th>
                            <th className="py-2.5 px-3 min-w-[130px] text-blue-700 dark:text-blue-300">مبلغ الشحن (+)</th>
                            <th className="py-2.5 px-3 min-w-[150px]">الرصيد التراكمي</th>
                            <th className="py-2.5 px-3 min-w-[180px]">الملاحظات</th>
                            <th className="py-2.5 px-3 w-12 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {paginatedArchiveList.map((rc, idx) => {
                            const rowNum = (safeArchivePage - 1) * ARCHIVE_ITEMS_PER_PAGE + idx + 1;
                            const amt = Number(rc.rechargeAmount) || Number(rc.amountPaid) || Number(rc.amount) || Number(rc.finalBalance) || 0;
                            return (
                              <tr key={rc.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-2.5 px-3 text-center font-mono text-slate-400">{rowNum}</td>
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-slate-900 dark:text-white">{formatDateArabic(rc.date)}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-blue-500" />
                                    <span>{formatTimeArabic(rc.time || rc.date)}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1" dir="ltr">
                                    <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                                    <span>{formatPhone(rc.walletPhone || 'خط مسجل')}</span>
                                  </div>
                                  {rc.walletLabel && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">{rc.walletLabel}</div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-black text-blue-700 dark:text-blue-300 text-sm" dir="ltr">
                                  +{formatCurrency(amt)}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-rose-600 dark:text-rose-400" dir="ltr">
                                  {formatCurrency(rc.balanceAfter || amt)}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={rc.notes}>
                                  {rc.notes || 'شحن رصيد للخط'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteArchive(rc)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                    title="حذف حركة الشحن"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )
                  )}

                  {/* TAB 3: Payments ONLY */}
                  {archiveModalTab === 'payments' && (
                    clientArchiveSummary.payments.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        لا توجد حركات سداد أو تحصيل مسجلة لهذا العميل في الأرشيف.
                      </div>
                    ) : (
                      <table className="w-full text-right border-collapse text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-750">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">#</th>
                            <th className="py-2.5 px-3 min-w-[130px]">التاريخ والوقت</th>
                            <th className="py-2.5 px-3 min-w-[130px]">طريقة الدفع</th>
                            <th className="py-2.5 px-3 min-w-[130px] text-emerald-700 dark:text-emerald-300">المبلغ المسدد (-)</th>
                            <th className="py-2.5 px-3 min-w-[150px]">نوع السداد / البيان</th>
                            <th className="py-2.5 px-3 min-w-[100px]">الفائض</th>
                            <th className="py-2.5 px-3 min-w-[180px]">الملاحظات</th>
                            <th className="py-2.5 px-3 w-12 text-center">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {paginatedArchiveList.map((p, idx) => {
                            const rowNum = (safeArchivePage - 1) * ARCHIVE_ITEMS_PER_PAGE + idx + 1;
                            const amt = Number(p.amountPaid) || Number(p.amount) || 0;
                            return (
                              <tr key={p.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-2.5 px-3 text-center font-mono text-slate-400">{rowNum}</td>
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-slate-900 dark:text-white">{formatDateArabic(p.date)}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-emerald-500" />
                                    <span>{formatTimeArabic(p.time || p.date)}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                                  {p.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : p.paymentMethod === 'instapay' ? 'إنستاباي' : p.paymentMethod === 'bank' ? 'تحويل بنكي' : 'نقدي (كاش)'}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm" dir="ltr">
                                  -{formatCurrency(amt)}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    p.operationCategory === 'payout' || p.cycleType?.includes('صرف')
                                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200'
                                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  }`}>
                                    {p.cycleType || 'سداد دفعة من الحساب'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold" dir="ltr">
                                  {p.excessAmount > 0 ? (
                                    <span className="text-purple-600 dark:text-purple-400 font-black">+{formatCurrency(p.excessAmount)}</span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={p.notes}>
                                  {p.notes || 'سداد دفعة من الحساب'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteArchive(p)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                    title="حذف حركة السداد"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )
                  )}

                </div>

                {/* Pagination inside Archive Sheet if > 10 records */}
                {totalArchivePages > 1 && (
                  <div className="shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between px-2 py-1">
                    <span className="text-xs text-slate-500 font-mono">
                      صفحة {safeArchivePage} من {totalArchivePages} ({activeArchiveDisplayList.length} {archiveModalTab === 'recharges' ? 'شحنة' : archiveModalTab === 'payments' ? 'سداد' : 'خطوة'})
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={safeArchivePage <= 1}
                        onClick={() => setArchivePage(p => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="الصفحة السابقة"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      {Array.from({ length: totalArchivePages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setArchivePage(p)}
                          className={`min-w-[28px] h-7 px-2 rounded-lg font-mono font-bold text-xs transition-colors ${
                            safeArchivePage === p
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={safeArchivePage >= totalArchivePages}
                        onClick={() => setArchivePage(p => Math.min(totalArchivePages, p + 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="الصفحة التالية"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end bg-slate-50 dark:bg-slate-900/90 backdrop-blur-md shrink-0">
                <button
                  type="button"
                  onClick={handleCloseArchiveModal}
                  className="btn-interactive px-6 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                >
                  إغلاق
                </button>
              </div>

            </div>
        </div>,
        document.body
      )}

    </div>
  );
}
