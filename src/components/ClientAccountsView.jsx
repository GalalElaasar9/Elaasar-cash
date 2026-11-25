import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCash } from '../context/CashContext';
import {
  formatCurrency,
  formatNumber,
  formatPhone,
  formatTimeArabic,
  formatDateArabic,
  getEgyptianCarrier,
  calculateWalletStats,
  getTodayString,
  getCurrentMonthKey,
  buildWhatsAppUrl
} from '../utils/formatters';
import {
  Users,
  Search,
  Calculator,
  Percent,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  ArrowDownToLine,
  Phone,
  Smartphone,
  Eye,
  Copy,
  Check,
  Calendar,
  X,
  Share2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Wallet,
  Clock,
  Sparkles,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  ArrowUpDown,
  Archive,
  History,
  Receipt,
  MessageCircle
} from 'lucide-react';

export default function ClientAccountsView({ onNavigateToClients }) {
  const {
    clients,
    transactions,
    updateClient,
    deleteTransaction,
    setActiveModal,
    setModalData,
    showToast,
    askConfirm,
    clientArchives,
    dismissedArchiveIds,
    deleteClientArchive,
    clearClientArchive,
    archiveClientCycle
  } = useCash();

  // Selected time range for recharges: 'today' | 'month' | 'all'
  const [timeRange, setTimeRange] = useState('today');
  // Selected account type tab: 'مدين' (default) | 'دائن' | 'عادي' | 'أرشيف'
  const [accountTypeTab, setAccountTypeTab] = useState('مدين');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [selectedClientForStatement, setSelectedClientForStatement] = useState(null);
  const [statementModalTab, setStatementModalTab] = useState('steps'); // 'steps' (خطوات متسلسلة) | 'recharges' (شحنات) | 'payments' (مدفوعات)
  const [statementModalPage, setStatementModalPage] = useState(1);
  const [copiedClientId, setCopiedClientId] = useState(null);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveFilterType, setArchiveFilterType] = useState('all');
  const [selectedArchiveClient, setSelectedArchiveClient] = useState(null);
  const [archiveModalTab, setArchiveModalTab] = useState('steps'); // 'steps' | 'recharges' | 'payments'
  const [archivePage, setArchivePage] = useState(1);
  const [accountsPage, setAccountsPage] = useState(1);
  const [archiveDetailPage, setArchiveDetailPage] = useState(1);
  // Sort order inside client archive modal: 'asc' = متسلسل زمني (من الأقدم للأحدث - خطوات متتالية), 'desc' = الأحدث أولاً
  const [archiveDetailSortOrder, setArchiveDetailSortOrder] = useState('asc');
  const [closingStatementSheet, setClosingStatementSheet] = useState(false);
  const [closingArchiveSheet, setClosingArchiveSheet] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const handleCloseStatementSheet = () => {
    if (closingStatementSheet) return;
    setClosingStatementSheet(true);
    setTimeout(() => {
      setSelectedClientForStatement(null);
      setClosingStatementSheet(false);
    }, 230);
  };

  const handleCloseArchiveSheet = () => {
    if (closingArchiveSheet) return;
    setClosingArchiveSheet(true);
    setTimeout(() => {
      setSelectedArchiveClient(null);
      setClosingArchiveSheet(false);
    }, 230);
  };

  // Reset pagination when search / filter changes
  useEffect(() => {
    setArchivePage(1);
  }, [archiveSearchQuery, archiveFilterType]);

  useEffect(() => {
    setAccountsPage(1);
  }, [searchQuery, filterActiveOnly, accountTypeTab]);

  useEffect(() => {
    setArchiveDetailPage(1);
  }, [selectedArchiveClient]);

  // Auto-switch accountTypeTab when a client's status changes from payment modal
  useEffect(() => {
    const handleClientTypeChanged = (e) => {
      if (e.detail?.resultingType) {
        setAccountTypeTab(e.detail.resultingType);
      }
    };
    window.addEventListener('elaasar_client_type_changed', handleClientTypeChanged);
    return () => window.removeEventListener('elaasar_client_type_changed', handleClientTypeChanged);
  }, []);

  const todayKey = getTodayString();
  const currentMonthKey = getCurrentMonthKey();

  // Compute live accounting metrics for every client
  const clientAccountsData = useMemo(() => {
    return clients.map(client => {
      const wallets = client.wallets || [];
      const walletIds = new Set(wallets.map(w => w.id));

      // 1. Classification & Cutoff Tracking
      let clientType = client.clientType;
      if (!clientType) {
        try {
          clientType = localStorage.getItem(`elaasar_client_type_${client.id}`) || 'مدين';
        } catch {
          clientType = 'مدين';
        }
      }

      let settledAt = client.settledAt;
      if (!settledAt) {
        try {
          settledAt = localStorage.getItem(`elaasar_client_settled_at_${client.id}`);
        } catch {
          settledAt = null;
        }
      }
      const settledTimestamp = settledAt ? new Date(settledAt).getTime() : 0;

      // Excess debt detection
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

      // Excess credit detection
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

      // Check if net credit remains after post-credit recharges and payouts (فقط للعميل الدائن)
      let hasExcessCredit = false;
      if (clientType === 'دائن' && typeof clientExcessCredit === 'number' && clientExcessCredit > 0 && clientExcessCreditDate) {
        const cDate = new Date(clientExcessCreditDate).getTime();
        const postRechargesSum = (transactions || []).filter(t =>
          (walletIds.has(t.walletId) || t.customerId === client.id || t.clientId === client.id) &&
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

      // Find the most recent settlement transaction for this client (e.g. payment that settled the previous cycle)
      const lastPaymentIdx = transactions.findIndex(t => 
        (t.clientId === client.id || t.customerId === client.id) && t.type === 'client_payment'
      );

      // Helper to determine if a transaction belongs to the current active cycle
      const isTxInActiveCycle = (t) => {
        if (t.isSettled) return false;
        if (effectiveCutoff === 0) return true;
        if (new Date(t.date).getTime() > effectiveCutoff) return true;
        // If it's a recharge added after the latest settlement payment, it's active
        if (t.type === 'recharge' || t.type === 'limit_reset') {
          if (lastPaymentIdx !== -1 && transactions.indexOf(t) < lastPaymentIdx) return true;
          if (t.id && Number(t.id.replace('tx-rc-', '')) > effectiveCutoff) return true;
        }
        return false;
      };

      // 2. Wallets breakdown (only active recharges in current cycle after effectiveCutoff)
      const walletsBreakdown = wallets.map(wallet => {
        const walletRechargeTx = transactions.filter(t => 
          t.walletId === wallet.id && 
          (t.type === 'recharge' || t.type === 'limit_reset') &&
          isTxInActiveCycle(t)
        );

        const walletTodayRecharge = walletRechargeTx
          .filter(t => (t.dateOnly || t.date || '').startsWith(todayKey))
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const walletMonthRecharge = walletRechargeTx
          .filter(t => (t.dateOnly || t.date || '').slice(0, 7) === currentMonthKey)
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const walletAllRecharge = walletRechargeTx
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const walletActiveAmount = timeRange === 'today'
          ? walletTodayRecharge
          : timeRange === 'month'
          ? walletMonthRecharge
          : walletAllRecharge;

        const carrier = getEgyptianCarrier(wallet.phoneNumber);

        return {
          id: wallet.id,
          phoneNumber: wallet.phoneNumber,
          label: wallet.label,
          carrier,
          todayRecharges: walletTodayRecharge,
          monthRecharges: walletMonthRecharge,
          allRecharges: walletAllRecharge,
          amount: walletActiveAmount
        };
      });

      // 3. Client-level sums
      const clientTodayRecharges = walletsBreakdown.reduce((sum, w) => sum + w.todayRecharges, 0);
      const clientMonthRecharges = walletsBreakdown.reduce((sum, w) => sum + w.monthRecharges, 0);
      const clientAllRecharges = walletsBreakdown.reduce((sum, w) => sum + w.allRecharges, 0);

      const baseAmount = timeRange === 'today'
        ? clientTodayRecharges
        : timeRange === 'month'
        ? clientMonthRecharges
        : clientAllRecharges;

      // 4. Commission settings
      let commissionMode = client.commissionMode;
      if (!commissionMode) {
        try {
          commissionMode = localStorage.getItem(`elaasar_client_commission_mode_${client.id}`) || 'deduct';
        } catch {
          commissionMode = 'deduct';
        }
      }

      let commissionPercent = client.commissionPercent;
      if (commissionPercent === undefined || commissionPercent === null || commissionPercent === '') {
        try {
          const saved = localStorage.getItem(`elaasar_client_commission_${client.id}`);
          commissionPercent = (saved !== null && saved !== '') ? saved : '0.995';
        } catch {
          commissionPercent = '0.995';
        }
      }

      const factorNum = Number(commissionPercent);
      const isValidFactor = !isNaN(factorNum) && factorNum > 0;

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

      // 5. Active Client Payments (only payments occurring after effectiveCutoff)
      const clientPayments = transactions.filter(t => 
        (t.clientId === client.id || t.customerId === client.id) && 
        t.type === 'client_payment' &&
        (effectiveCutoff === 0 || new Date(t.date).getTime() > effectiveCutoff)
      );

      const calcPaymentNet = (t) => t.isCreditorPayout ? -Number(t.amount) : Number(t.amount);

      const clientTodayPayments = clientPayments
        .filter(t => (t.dateOnly || t.date || '').startsWith(todayKey))
        .reduce((sum, t) => sum + calcPaymentNet(t), 0);

      const clientMonthPayments = clientPayments
        .filter(t => (t.dateOnly || t.date || '').slice(0, 7) === currentMonthKey)
        .reduce((sum, t) => sum + calcPaymentNet(t), 0);

      const clientAllPayments = clientPayments
        .reduce((sum, t) => sum + calcPaymentNet(t), 0);

      const paidAmount = timeRange === 'today'
        ? clientTodayPayments
        : timeRange === 'month'
        ? clientMonthPayments
        : clientAllPayments;

      // Active transactions list for statement modal
      const clientTxList = transactions.filter(t => {
        if (!walletIds.has(t.walletId)) return false;
        if (t.type !== 'recharge' && t.type !== 'limit_reset') return false;
        if (!isTxInActiveCycle(t)) return false;
        if (timeRange === 'today') {
          return (t.dateOnly || t.date || '').startsWith(todayKey);
        }
        if (timeRange === 'month') {
          return (t.dateOnly || t.date || '').slice(0, 7) === currentMonthKey;
        }
        return true;
      });

      // 6. Balance & Status Resolution
      let remainingDebt = 0;
      let creditAmount = 0;
      let isSettled = false;
      let effectiveClientType = clientType || 'مدين';
      let activeFinalAmount = finalAmount;
      let isExcessDebtOnly = false;
      let effectiveBaseAmount = baseAmount;
      let effectiveCommissionAmount = commissionAmount;
      let effectiveFactorStr = commissionPercent;
      let effectiveModeResult = effectiveMode;
      let effectivePaidAmount = paidAmount;

      if (hasExcessDebt) {
        const postPayments = clientPayments
          .filter(t => !t.isCreditorPayout)
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const postRecharges = clientTxList
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const initialDebt = clientExcessDebt + postRecharges;
        const currentExcessDebt = Math.max(0, initialDebt - postPayments);
        remainingDebt = currentExcessDebt;
        creditAmount = 0;
        isSettled = currentExcessDebt === 0;
        effectiveClientType = isSettled ? 'عادي' : 'مدين';
        activeFinalAmount = initialDebt;
        isExcessDebtOnly = true;
        effectiveBaseAmount = initialDebt;
        effectiveCommissionAmount = 0;
        effectiveFactorStr = '1';
        effectiveModeResult = 'none';
        effectivePaidAmount = postPayments;
      } else if (hasExcessCredit) {
        const postPayouts = clientPayments
          .filter(t => t.isCreditorPayout)
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const postRecharges = clientTxList
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const activeCredit = clientExcessCredit - postPayouts - postRecharges;
        if (activeCredit > 0) {
          creditAmount = activeCredit;
          remainingDebt = 0;
          isSettled = false;
          effectiveClientType = 'دائن';
          activeFinalAmount = 0; // العميل الدائن لا يُطلب منه دين
          effectiveBaseAmount = 0;
          effectiveCommissionAmount = 0;
          effectiveFactorStr = '1';
          effectiveModeResult = 'none';
          effectivePaidAmount = postPayouts;
        } else if (activeCredit === 0) {
          creditAmount = 0;
          remainingDebt = 0;
          isSettled = true;
          effectiveClientType = 'عادي';
          activeFinalAmount = clientExcessCredit;
          effectiveBaseAmount = clientExcessCredit;
          effectiveCommissionAmount = 0;
          effectiveFactorStr = '1';
          effectiveModeResult = 'none';
          effectivePaidAmount = postPayouts;
        } else {
          creditAmount = 0;
          remainingDebt = Math.abs(activeCredit);
          isSettled = false;
          effectiveClientType = 'مدين';
          activeFinalAmount = Math.abs(activeCredit);
          effectiveBaseAmount = Math.abs(activeCredit);
          effectiveCommissionAmount = 0;
          effectiveFactorStr = '1';
          effectiveModeResult = 'none';
          effectivePaidAmount = postPayouts;
        }
      } else if (clientType === 'عادي') {
        if (baseAmount === 0) {
          remainingDebt = 0;
          creditAmount = 0;
          isSettled = true;
          effectiveClientType = 'عادي';
          activeFinalAmount = 0;
        } else {
          const netBalance = finalAmount - paidAmount;
          remainingDebt = netBalance > 0 ? netBalance : 0;
          creditAmount = netBalance < 0 ? Math.abs(netBalance) : 0;
          isSettled = netBalance === 0;
          effectiveClientType = creditAmount > 0 ? 'دائن' : (remainingDebt > 0 ? 'مدين' : 'عادي');
          activeFinalAmount = finalAmount;
        }
      } else {
        // Standard مدين
        const grossRequired = finalAmount;
        const netBalance = grossRequired - paidAmount;
        remainingDebt = netBalance > 0 ? netBalance : 0;
        creditAmount = netBalance < 0 ? Math.abs(netBalance) : 0;
        isSettled = netBalance === 0 && (grossRequired > 0 || paidAmount !== 0);
        effectiveClientType = creditAmount > 0 ? 'دائن' : (remainingDebt > 0 ? 'مدين' : (clientType || 'مدين'));
        activeFinalAmount = finalAmount;
      }

      return {
        client,
        clientType,
        effectiveClientType,
        settledAt,
        wallets: walletsBreakdown,
        todayRecharges: clientTodayRecharges,
        monthRecharges: clientMonthRecharges,
        allRecharges: clientAllRecharges,
        baseAmount: effectiveBaseAmount,
        commissionMode: effectiveModeResult,
        effectiveMode: effectiveModeResult,
        commissionPercent: effectiveFactorStr,
        commissionAmount: effectiveCommissionAmount,
        finalAmount: activeFinalAmount,
        grossRequired: activeFinalAmount,
        paidAmount: effectivePaidAmount,
        allPaidAmount: clientAllPayments,
        netBalance: isExcessDebtOnly ? remainingDebt : (finalAmount - paidAmount),
        remainingDebt,
        creditAmount,
        isSettled,
        isExcessDebtOnly,
        hasExcessDebt,
        hasExcessCredit,
        excessDebt: clientExcessDebt,
        excessCredit: clientExcessCredit,
        payments: clientPayments,
        transactionsCount: clientTxList.length,
        transactions: clientTxList
      };
    });
  }, [clients, transactions, timeRange, todayKey, currentMonthKey]);

  // Pre-filtered client groups for counts and live stats
  const debtorClients = useMemo(() => {
    return clientAccountsData.filter(i => (i.effectiveClientType || i.clientType || 'مدين') === 'مدين');
  }, [clientAccountsData]);

  const creditorClients = useMemo(() => {
    return clientAccountsData.filter(i => (i.effectiveClientType || i.clientType) === 'دائن');
  }, [clientAccountsData]);

  const normalClients = useMemo(() => {
    return clientAccountsData.filter(i => (i.effectiveClientType || i.clientType) === 'عادي');
  }, [clientAccountsData]);

  const debtorTotalFinal = useMemo(() => {
    return debtorClients.reduce((sum, i) => sum + (i.remainingDebt || i.finalAmount), 0);
  }, [debtorClients]);

  const creditorTotalFinal = useMemo(() => {
    return creditorClients.reduce((sum, i) => sum + (i.creditAmount > 0 ? i.creditAmount : i.finalAmount), 0);
  }, [creditorClients]);

  // Filter clients based on accountTypeTab ('مدين' | 'دائن' | 'عادي'), search query & active debt filter
  const filteredAccounts = useMemo(() => {
    return clientAccountsData.filter(item => {
      // 1. Account type tab: 'مدين' or 'دائن' or 'عادي'
      if ((item.effectiveClientType || item.clientType) !== accountTypeTab) {
        return false;
      }

      // 2. Filter active only (> 0) - only applies when viewing debt or credit
      if (filterActiveOnly) {
        if (accountTypeTab === 'مدين' && item.remainingDebt <= 0) return false;
        if (accountTypeTab === 'دائن' && item.creditAmount <= 0) return false;
      }

      // 3. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = item.client.name?.toLowerCase().includes(q);
      const matchNotes = item.client.notes?.toLowerCase().includes(q);
      const matchPhone = item.wallets.some(w => 
        w.phoneNumber?.includes(q) || w.label?.toLowerCase().includes(q)
      );

      return matchName || matchNotes || matchPhone;
    });
  }, [clientAccountsData, accountTypeTab, searchQuery, filterActiveOnly]);

  // Global Totals across filtered clients
  const summaryTotals = useMemo(() => {
    return filteredAccounts.reduce(
      (acc, item) => {
        acc.totalBase += item.baseAmount;
        acc.totalCommission += (item.effectiveMode || item.commissionMode) === 'add' ? item.commissionAmount : -item.commissionAmount;
        acc.totalFinal += item.finalAmount;
        acc.totalPaid += item.paidAmount;
        acc.totalRemaining += item.remainingDebt;
        acc.totalCredit += item.creditAmount;
        if (item.baseAmount > 0 || item.paidAmount > 0) acc.activeClientsCount += 1;
        acc.totalWalletsCount += item.wallets.length;
        return acc;
      },
      {
        totalBase: 0,
        totalCommission: 0,
        totalFinal: 0,
        totalPaid: 0,
        totalRemaining: 0,
        totalCredit: 0,
        activeClientsCount: 0,
        totalWalletsCount: 0
      }
    );
  }, [filteredAccounts]);

  // Unified Archives: Combines explicit archive records + any client recharges / payments from transactions
  const allUnifiedArchives = useMemo(() => {
    const list = [...(clientArchives || [])].filter(a =>
      !dismissedArchiveIds?.has(a.id) &&
      !dismissedArchiveIds?.has(a.transactionId)
    );
    const archivedTxIds = new Set(list.map(a => a.transactionId || a.id).filter(Boolean));

    // Signatures of already-archived operations to catch past/legacy records without transactionId
    // Must be strictly matched by clientId + dateOnly + timeKey + category (recharge vs payment) + amount
    // to never accidentally drop legitimate multiple recharges or confuse recharge with payment!
    const existingSignatures = new Set();
    for (const a of list) {
      if (a.clientId && a.dateOnly) {
        const amt = Number(a.amountPaid) || Number(a.rechargeAmount) || 0;
        const timeKey = (a.time || '').trim();
        const cat = a.operationCategory || (a.cycleType?.includes('شحن') ? 'recharge' : 'payment');
        if (timeKey) {
          existingSignatures.add(`${a.clientId}_${a.dateOnly}_${timeKey}_${cat}_${amt}`);
        }
      }
    }

    const clientMap = new Map((clients || []).map(c => [c.id, c]));
    const walletToClientMap = new Map();
    (clients || []).forEach(c => {
      (c.wallets || []).forEach(w => {
        walletToClientMap.set(w.id, { client: c, wallet: w });
      });
    });

    for (const t of (transactions || [])) {
      if (dismissedArchiveIds?.has(t.id) || dismissedArchiveIds?.has(`tx_${t.id}`)) continue;
      if (archivedTxIds.has(t.id)) continue;
      const mapping = walletToClientMap.get(t.walletId);
      const client = clientMap.get(t.customerId || t.clientId) || mapping?.client;
      if (!client) continue;

      let clearedAt = 0;
      try {
        clearedAt = Number(localStorage.getItem(`elaasar_client_archive_cleared_${client.id}`)) || 0;
      } catch {}
      if (clearedAt && new Date(t.date).getTime() <= clearedAt) continue;

      const numAmt = Number(t.amount) || 0;
      const tTimeKey = formatTimeArabic(t.time || t.date);
      const tCat = (t.type === 'recharge' || t.type === 'limit_reset') ? 'recharge' : 'payment';

      // Check if this legacy transaction is already archived by precise signature
      if (existingSignatures.has(`${client.id}_${t.dateOnly}_${tTimeKey}_${tCat}_${numAmt}`)) {
        continue;
      }

      const wallet = mapping?.wallet;

      if (t.type === 'recharge' || t.type === 'limit_reset') {
        list.push({
          id: t.id,
          transactionId: t.id,
          clientId: client.id,
          clientName: client.name,
          cycleType: 'شحن رصيد للخط',
          operationCategory: 'recharge',
          rechargeAmount: numAmt,
          amountPaid: 0,
          debtBefore: 0,
          excessAmount: 0,
          finalBalance: numAmt,
          resultingType: 'مدين',
          paymentMethod: 'recharge',
          walletPhone: t.walletPhone || wallet?.phoneNumber || '',
          walletLabel: t.walletLabel || wallet?.label || '',
          notes: t.notes || (t.walletPhone ? `شحن رصيد لرقم ${formatPhone(t.walletPhone)}` : 'شحن رصيد للخط'),
          date: t.date,
          dateOnly: t.dateOnly,
          time: tTimeKey
        });
      } else if (t.type === 'client_payment') {
        list.push({
          id: t.id,
          transactionId: t.id,
          clientId: client.id,
          clientName: client.name,
          cycleType: t.isCreditorPayout ? 'صرف مستحقات دائن' : 'سداد دفعة من الحساب',
          operationCategory: t.isCreditorPayout ? 'payout' : 'payment',
          rechargeAmount: 0,
          amountPaid: numAmt,
          debtBefore: 0,
          excessAmount: 0,
          finalBalance: 0,
          resultingType: t.isCreditorPayout ? 'عادي' : 'مدين',
          paymentMethod: t.paymentMethod || 'cash',
          walletPhone: t.walletPhone || '',
          walletLabel: t.walletLabel || '',
          notes: t.notes || (t.isCreditorPayout ? 'صرف مستحقات للعميل الدائن' : 'سداد دفعة من الحساب'),
          date: t.date,
          dateOnly: t.dateOnly,
          time: tTimeKey
        });
      }
    }

    // Final deduplication pass to ensure NO duplicate entries exist, without dropping legitimate identical-amount operations
    const seen = new Set();
    const uniqueList = [];
    for (const item of list) {
      const key = item.transactionId || item.id;
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueList.push(item);
      } else if (!key) {
        uniqueList.push(item);
      }
    }

    return uniqueList;
  }, [clientArchives, transactions, clients, dismissedArchiveIds]);

  // Filtered Archive records
  const filteredArchives = useMemo(() => {
    return allUnifiedArchives.filter(item => {
      // Filter by type: 'all' | 'recharge' | 'debt' | 'credit'
      if (archiveFilterType !== 'all') {
        const isRecharge = item.operationCategory === 'recharge' || item.cycleType?.includes('شحن');
        const isDebtPayment = item.cycleType?.includes('مديونية') || item.cycleType?.includes('سداد');
        const isCreditPayout = item.cycleType?.includes('دائن') || item.cycleType?.includes('مستحق') || item.operationCategory === 'payout';

        if (archiveFilterType === 'recharge' && !isRecharge) return false;
        if (archiveFilterType === 'debt' && !isDebtPayment) return false;
        if (archiveFilterType === 'credit' && !isCreditPayout) return false;
      }
      // Search
      if (!archiveSearchQuery.trim()) return true;
      const q = archiveSearchQuery.toLowerCase().trim();
      return (
        item.clientName?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.cycleType?.toLowerCase().includes(q) ||
        (item.walletPhone && item.walletPhone.includes(q)) ||
        (item.paymentMethod && item.paymentMethod.toLowerCase().includes(q))
      );
    });
  }, [allUnifiedArchives, archiveFilterType, archiveSearchQuery]);

  const archiveSummary = useMemo(() => {
    return allUnifiedArchives.reduce(
      (acc, a) => {
        const isRecharge = a.operationCategory === 'recharge' || a.cycleType?.includes('شحن');
        if (isRecharge) {
          acc.totalRecharge += (Number(a.rechargeAmount) || Number(a.amountPaid) || 0);
          acc.rechargeCount += 1;
        } else {
          acc.totalPaid += (Number(a.amountPaid) || 0);
          acc.paymentCount += 1;
        }
        acc.totalExcess += (Number(a.excessAmount) || 0);
        if (a.resultingType === 'عادي') acc.settledCount += 1;
        return acc;
      },
      { totalRecharge: 0, totalPaid: 0, totalExcess: 0, settledCount: 0, rechargeCount: 0, paymentCount: 0 }
    );
  }, [allUnifiedArchives]);

  // Group filtered archives by Client (لا تكرار لاسم العميل في الجدول الرئيسي)
  const groupedArchives = useMemo(() => {
    const map = new Map();

    for (const arch of filteredArchives) {
      const key = arch.clientId || arch.clientName;
      if (!map.has(key)) {
        map.set(key, {
          clientId: arch.clientId,
          clientName: arch.clientName,
          records: [],
          totalRecharged: 0,
          totalPaid: 0,
          totalExcess: 0,
          latestDate: arch.date,
          latestRecord: arch
        });
      }
      const group = map.get(key);
      group.records.push(arch);

      const isRecharge = arch.operationCategory === 'recharge' || arch.cycleType?.includes('شحن');
      if (isRecharge) {
        group.totalRecharged += (Number(arch.rechargeAmount) || Number(arch.amountPaid) || 0);
      } else {
        group.totalPaid += (Number(arch.amountPaid) || 0);
      }
      group.totalExcess += (Number(arch.excessAmount) || 0);

      if (new Date(arch.date).getTime() > new Date(group.latestDate).getTime()) {
        group.latestDate = arch.date;
        group.latestRecord = arch;
      }
    }

    // For each client group:
    // 1. Sort records chronologically (oldest to newest) to trace the exact sequence of steps
    // 2. Compute stepNumber (1, 2, 3...) and cumulative running balance after each operation
    for (const group of map.values()) {
      const getRecordTs = (item) => {
        const raw = String(item.transactionId || item.id || '');
        const m = raw.match(/\d{12,}/);
        if (m) return Number(m[0]);
        if (item.date) {
          const t = new Date(item.date).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        return 0;
      };

      group.records.sort((a, b) => {
        const tsA = getRecordTs(a);
        const tsB = getRecordTs(b);
        if (tsA !== tsB) return tsA - tsB;
        const isRechargeA = a.operationCategory === 'recharge' || a.cycleType?.includes('شحن');
        const isRechargeB = b.operationCategory === 'recharge' || b.cycleType?.includes('شحن');
        if (isRechargeA && !isRechargeB) return -1;
        if (!isRechargeA && isRechargeB) return 1;
        return 0;
      });

      let running = 0;
      group.records = group.records.map((rec, idx) => {
        const isRecharge = rec.operationCategory === 'recharge' || rec.cycleType?.includes('شحن');
        const isPayout = rec.operationCategory === 'payout' || rec.cycleType?.includes('صرف مستحقات');
        const isZeroSettlement = rec.resultingType === 'عادي' || rec.cycleType?.includes('تصفير') || rec.cycleType?.includes('كامل المديونية');
        const rechargeAmt = Number(rec.rechargeAmount) || (isRecharge ? (Number(rec.amountPaid) || Number(rec.amount) || 0) : 0);
        const paidAmt = !isRecharge ? (Number(rec.amountPaid) || Number(rec.amount) || 0) : 0;

        const balanceBefore = running;
        if (isRecharge) {
          // Recharges always add to debt liability
          running += rechargeAmt;
        } else if (isPayout) {
          // Creditor payout: credit is negative running balance, payout brings it towards 0
          running += paidAmt;
        } else {
          // Debtor payment: reduces debt
          running -= paidAmt;
        }

        if (isZeroSettlement) {
          // Explicit zeroing out of debt/credit
          running = 0;
        } else if (rec.excessAmount > 0 && rec.resultingType === 'دائن') {
          // Overpayment resulting in creditor surplus
          running = -Number(rec.excessAmount);
        } else if (!isRecharge && rec.finalBalance !== undefined && rec.finalBalance !== null && !isNaN(Number(rec.finalBalance))) {
          // Enforce payment snapshot if finalBalance is provided on a payment record
          if (rec.resultingType === 'مدين') {
            running = Number(rec.finalBalance);
          } else if (rec.resultingType === 'دائن') {
            running = -Number(rec.finalBalance);
          }
        }

        return {
          ...rec,
          stepNumber: idx + 1,
          balanceBefore,
          balanceAfter: running
        };
      });

      // The latest record is the last step chronologically
      if (group.records.length > 0) {
        group.latestRecord = group.records[group.records.length - 1];
        group.latestDate = group.latestRecord.date;
      }
    }

    // Sort client groups by latest operation date descending
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  }, [filteredArchives]);

  // Keep selected archive group in sync if an entry gets deleted
  const activeSelectedArchiveGroup = useMemo(() => {
    if (!selectedArchiveClient) return null;
    const key = selectedArchiveClient.clientId || selectedArchiveClient.clientName;
    return groupedArchives.find(g => (g.clientId || g.clientName) === key) || null;
  }, [selectedArchiveClient, groupedArchives]);

  // Archive Pagination
  const totalArchivePages = Math.ceil(groupedArchives.length / ITEMS_PER_PAGE) || 1;
  const safeArchivePage = Math.min(Math.max(1, archivePage), totalArchivePages);
  const paginatedGroupedArchives = useMemo(() => {
    const start = (safeArchivePage - 1) * ITEMS_PER_PAGE;
    return groupedArchives.slice(start, start + ITEMS_PER_PAGE);
  }, [groupedArchives, safeArchivePage]);

  // Live Accounts Pagination
  const totalAccountsPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE) || 1;
  const safeAccountsPage = Math.min(Math.max(1, accountsPage), totalAccountsPages);
  const paginatedAccounts = useMemo(() => {
    const start = (safeAccountsPage - 1) * ITEMS_PER_PAGE;
    return filteredAccounts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAccounts, safeAccountsPage]);

  // Detail Modal Lists & Pagination for Archive Client
  const archiveGroupRecharges = useMemo(() => {
    if (!activeSelectedArchiveGroup) return [];
    return (activeSelectedArchiveGroup.records || []).filter(
      r => r.operationCategory === 'recharge' || r.cycleType?.includes('شحن')
    );
  }, [activeSelectedArchiveGroup]);

  const archiveGroupPayments = useMemo(() => {
    if (!activeSelectedArchiveGroup) return [];
    return (activeSelectedArchiveGroup.records || []).filter(
      r => r.operationCategory !== 'recharge' && !r.cycleType?.includes('شحن')
    );
  }, [activeSelectedArchiveGroup]);

  const activeArchiveModalList = useMemo(() => {
    if (!activeSelectedArchiveGroup) return [];
    if (archiveModalTab === 'recharges') return archiveGroupRecharges;
    if (archiveModalTab === 'payments') return archiveGroupPayments;
    // 'steps': sequence of operations
    const raw = activeSelectedArchiveGroup.records || [];
    if (archiveDetailSortOrder === 'desc') {
      return [...raw].sort((a, b) => b.stepNumber - a.stepNumber);
    }
    return [...raw].sort((a, b) => a.stepNumber - b.stepNumber);
  }, [activeSelectedArchiveGroup, archiveModalTab, archiveGroupRecharges, archiveGroupPayments, archiveDetailSortOrder]);

  const totalArchiveModalPages = Math.ceil(activeArchiveModalList.length / ITEMS_PER_PAGE) || 1;
  const safeArchiveModalPage = Math.min(Math.max(1, archiveDetailPage), totalArchiveModalPages);
  const paginatedArchiveModalList = useMemo(() => {
    const start = (safeArchiveModalPage - 1) * ITEMS_PER_PAGE;
    return activeArchiveModalList.slice(start, start + ITEMS_PER_PAGE);
  }, [activeArchiveModalList, safeArchiveModalPage]);

  // Comprehensive statement data for selectedClientForStatement:
  // Combines ALL recharges, ALL payments, and chronological steps so NO movements are omitted!
  const statementClientData = useMemo(() => {
    if (!selectedClientForStatement) return null;
    const client = selectedClientForStatement.client;
    if (!client) return null;
    const cId = client.id;
    const walletIds = new Set((client.wallets || []).map(w => w.id));

    // 1. All Recharges
    const recharges = [];
    const seenRechargeKeys = new Set();

    for (const t of (transactions || [])) {
      const isClientWallet = walletIds.has(t.walletId);
      const isClientDirect = (t.customerId === cId || t.clientId === cId);
      if ((isClientWallet || isClientDirect) && (t.type === 'recharge' || t.type === 'limit_reset')) {
        const amt = Number(t.amount) || 0;
        const key = t.id || `${t.dateOnly}_${t.walletPhone}_${amt}`;
        if (!seenRechargeKeys.has(key)) {
          seenRechargeKeys.add(key);
          recharges.push({
            id: t.id,
            transactionId: t.id,
            amount: amt,
            walletPhone: t.walletPhone || '',
            walletLabel: t.walletLabel || '',
            notes: t.notes || (t.walletPhone ? `شحن رصيد لرقم ${formatPhone(t.walletPhone)}` : 'شحن رصيد للخط'),
            date: t.date,
            dateOnly: t.dateOnly,
            time: formatTimeArabic(t.time || t.date),
            isSettled: Boolean(t.isSettled)
          });
        }
      }
    }

    for (const a of (clientArchives || [])) {
      if (a.clientId === cId && (a.operationCategory === 'recharge' || a.cycleType?.includes('شحن'))) {
        const amt = Number(a.rechargeAmount) || Number(a.amountPaid) || 0;
        const key = a.transactionId || a.id || `${a.dateOnly}_${a.walletPhone}_${amt}`;
        if (!seenRechargeKeys.has(key)) {
          seenRechargeKeys.add(key);
          recharges.push({
            id: a.id,
            transactionId: a.transactionId || a.id,
            amount: amt,
            walletPhone: a.walletPhone || '',
            walletLabel: a.walletLabel || '',
            notes: a.notes || 'شحن رصيد للخط',
            date: a.date,
            dateOnly: a.dateOnly,
            time: a.time || formatTimeArabic(a.date),
            isSettled: true
          });
        }
      }
    }

    recharges.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. All Payments
    const payments = [];
    const seenPaymentKeys = new Set();

    for (const t of (transactions || [])) {
      if ((t.customerId === cId || t.clientId === cId) && t.type === 'client_payment') {
        const amt = Number(t.amount) || 0;
        const key = t.id || `${t.dateOnly}_${t.time}_${amt}`;
        if (!seenPaymentKeys.has(key)) {
          seenPaymentKeys.add(key);
          payments.push({
            id: t.id,
            transactionId: t.id,
            amount: amt,
            paymentMethod: t.paymentMethod || 'cash',
            isCreditorPayout: Boolean(t.isCreditorPayout),
            notes: t.notes || (t.isCreditorPayout ? 'صرف مستحقات للعميل الدائن' : 'سداد دفعة من الحساب'),
            date: t.date,
            dateOnly: t.dateOnly,
            time: formatTimeArabic(t.time || t.date)
          });
        }
      }
    }

    for (const a of (clientArchives || [])) {
      const isPaymentArch = a.operationCategory === 'payment' || a.operationCategory === 'payout' || a.cycleType?.includes('سداد') || a.cycleType?.includes('صرف');
      if (a.clientId === cId && isPaymentArch) {
        const amt = Number(a.amountPaid) || 0;
        const key = a.transactionId || a.id || `${a.dateOnly}_${a.time}_${amt}`;
        if (!seenPaymentKeys.has(key)) {
          seenPaymentKeys.add(key);
          payments.push({
            id: a.id,
            transactionId: a.transactionId || a.id,
            amount: amt,
            paymentMethod: a.paymentMethod || 'cash',
            isCreditorPayout: a.operationCategory === 'payout' || a.cycleType?.includes('دائن') || a.cycleType?.includes('صرف'),
            notes: a.notes || a.cycleType || 'سداد دفعة من الحساب',
            date: a.date,
            dateOnly: a.dateOnly,
            time: a.time || formatTimeArabic(a.date)
          });
        }
      }
    }

    payments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 3. Chronological steps from groupedArchives
    const group = groupedArchives.find(g => (g.clientId || g.clientName) === (cId || client.name));
    const chronologicalSteps = group?.records || [];

    const totalRechargesAmount = recharges.reduce((sum, r) => sum + r.amount, 0);
    const totalPaymentsAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      recharges,
      payments,
      chronologicalSteps,
      totalRechargesAmount,
      totalPaymentsAmount
    };
  }, [selectedClientForStatement, transactions, clientArchives, groupedArchives]);

  // Selected Client for Statement Modal Pagination & Active Tab List
  const activeStatementList = useMemo(() => {
    if (!statementClientData) return [];
    if (statementModalTab === 'recharges') return statementClientData.recharges || [];
    if (statementModalTab === 'payments') return statementClientData.payments || [];
    return statementClientData.chronologicalSteps || [];
  }, [statementClientData, statementModalTab]);

  const totalStatementModalPages = Math.ceil(activeStatementList.length / ITEMS_PER_PAGE) || 1;
  const safeStatementModalPage = Math.min(Math.max(1, statementModalPage), totalStatementModalPages);
  const paginatedStatementList = useMemo(() => {
    const start = (safeStatementModalPage - 1) * ITEMS_PER_PAGE;
    return activeStatementList.slice(start, start + ITEMS_PER_PAGE);
  }, [activeStatementList, safeStatementModalPage]);

  // Quick action: Open payment modal for a client (سداد لمدين أو صرف مستحقات لدائن)
  const handleOpenPayment = (item) => {
    const isCreditor = (item.effectiveClientType || item.clientType) === 'دائن';
    const activeCredit = item.creditAmount > 0 ? item.creditAmount : (isCreditor ? item.finalAmount : 0);
    const activeDebt = item.remainingDebt > 0 ? item.remainingDebt : item.finalAmount;

    setModalData({
      client: item.client,
      currentDebt: isCreditor ? activeCredit : activeDebt,
      creditAmount: activeCredit,
      currentPaid: item.paidAmount,
      clientType: isCreditor ? 'دائن' : 'مدين',
      isCreditor: isCreditor
    });
    setActiveModal('clientPayment');
  };

  // Reusable Pagination Renderer (حد أقصى 10 صفوف لكل صفحة)
  const renderPagination = (currentPage, totalPages, totalItems, onPageChange, label = 'سجل') => {
    if (totalItems <= ITEMS_PER_PAGE && totalPages <= 1) return null;

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1 font-bold">
          <span>عرض</span>
          <span className="font-mono text-slate-800 dark:text-slate-200">{startItem} - {endItem}</span>
          <span>من إجمالي</span>
          <span className="font-mono text-slate-800 dark:text-slate-200">{totalItems}</span>
          <span>{label}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              return (
                <React.Fragment key={p}>
                  {prev && p - prev > 1 && (
                    <span className="px-1 text-slate-400">...</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg font-mono font-bold transition-colors ${
                      currentPage === p
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="الصفحة التالية"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Delete payment with confirmation
  const handleDeletePayment = async (tx) => {
    const confirmed = await askConfirm({
      title: 'حذف حركة السداد',
      message: `هل أنت متأكد من رغبتك في حذف حركة السداد بقيمة ${formatCurrency(tx.amount)}؟`,
      details: 'سيتم إعادة المبلغ إلى رصيد حساب العميل وكأنه لم يُسدد.',
      type: 'warning',
      confirmText: 'نعم، احذف حركة السداد',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      deleteTransaction(tx.id);
    }
  };

  // Delete all archive entries for a client group
  const handleDeleteGroupArchives = async (group) => {
    const confirmed = await askConfirm({
      title: 'حذف أرشيف العميل بالكامل',
      message: `هل أنت متأكد من حذف كافة سجلات الأرشيف (${group.records.length} عملية) للعميل "${group.clientName}"؟`,
      details: 'سيتم مسح سجلات الأرشيف فقط نهائياً، مع الحفاظ التام على المبيعات وحركات شحن الخط دون أي تغيير.',
      type: 'warning',
      confirmText: 'نعم، احذف كافة السجلات',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      // مسح سجلات الأرشيف فقط دون حذف حركات الشحن الأصلية من على الخطوط أو المساس بالمبيعات
      clearClientArchive(group.clientId, group.clientName, group.records);
      if (selectedArchiveClient && (selectedArchiveClient.clientId || selectedArchiveClient.clientName) === (group.clientId || group.clientName)) {
        setSelectedArchiveClient(null);
      }
    }
  };

  // Delete archive entry with confirmation
  const handleDeleteArchive = async (arch) => {
    const isRecharge = arch.operationCategory === 'recharge' || arch.cycleType?.includes('شحن');
    const confirmed = await askConfirm({
      title: isRecharge ? 'حذف حركة الشحن من الأرشيف' : 'حذف سجل الأرشيف',
      message: `هل أنت متأكد من رغبتك في حذف سجل ${isRecharge ? 'شحن رصيد' : 'تسوية'} العميل "${arch.clientName}" من الأرشيف؟`,
      details: 'سيتم مسح هذا السجل من الأرشيف فقط، ولن تتأثر المبيعات ولا العمليات المسجلة على الخط نهائياً.',
      type: 'warning',
      confirmText: 'نعم، احذف من الأرشيف',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      // مسح سجل الأرشيف فقط دون حذف حركة الشحن من على المحفظة أو المبيعات
      deleteClientArchive(arch.id, arch.transactionId);
    }
  };

  // Quick action: Change Commission Mode & smart toggle factor (0.995 <-> 1.005)
  const handleToggleCommissionMode = (client, currentMode, currentPercent) => {
    const nextMode = currentMode === 'add' ? 'deduct' : 'add';
    const currentNum = Number(currentPercent);
    let nextPercent = currentPercent;

    if (!isNaN(currentNum) && currentNum > 0) {
      if (nextMode === 'add' && currentNum < 1 && currentNum > 0.8) {
        const diff = 1 - currentNum;
        nextPercent = (1 + diff).toFixed(4).replace(/\.?0+$/, '');
      } else if (nextMode === 'deduct' && currentNum > 1 && currentNum < 1.2) {
        const diff = currentNum - 1;
        nextPercent = (1 - diff).toFixed(4).replace(/\.?0+$/, '');
      }
    }

    updateClient(client.id, { commissionMode: nextMode, commissionPercent: nextPercent });
    try {
      localStorage.setItem(`elaasar_client_commission_mode_${client.id}`, nextMode);
      localStorage.setItem(`elaasar_client_commission_${client.id}`, String(nextPercent));
    } catch (e) {
      console.error(e);
    }
    showToast(`تم تغيير طريقة العمولة للعميل (${client.name}) إلى ${nextMode === 'add' ? 'إضافة (+)' : 'خصم (-)'}`);
  };

  // Quick action: Change Commission Multiplier Factor
  const handleChangeCommissionPercent = (client, newPercent) => {
    updateClient(client.id, { commissionPercent: newPercent });
    try {
      localStorage.setItem(`elaasar_client_commission_${client.id}`, String(newPercent));
    } catch (e) {
      console.error(e);
    }
  };

  // Quick action: Switch Client Type between 'عادي' and 'مدين' (دائن لا يتم يدوياً بل تلقائياً عند السداد بأكثر من المستحق)
  const handleSetClientType = (client, type) => {
    if (type === 'دائن') return; // لا يمكن تحويل العميل لدائن يدوياً
    
    const account = clientAccountsData.find(a => a.client.id === client.id);
    const currentEffective = account?.effectiveClientType || client.clientType || 'مدين';
    if (type === currentEffective) return;

    if (type === 'عادي' && account && account.remainingDebt > 0) {
      showToast(`لا يمكن التحويل لحساب عادي لوجود مديونية مستحقة غير مسددة (${formatCurrency(account.remainingDebt)})`, 'warning');
      return;
    }

    if (type === 'مدين' && (!account || (account.remainingDebt <= 0 && account.finalAmount <= 0))) {
      showToast('العميل حسابه خالص (0 ج.م) - لا يمكن تحويله إلى مدين إلا إذا كان عليه فلوس أو تم شحن رصيد له', 'warning');
      return;
    }

    const nowISO = new Date().toISOString();
    updateClient(client.id, {
      clientType: type,
      settledAt: type === 'عادي' ? nowISO : client.settledAt,
      excessDebt: null,
      excessDebtDate: null,
      excessCredit: null,
      excessCreditDate: null
    });

    try {
      localStorage.setItem(`elaasar_client_type_${client.id}`, type);
      if (type === 'عادي') {
        localStorage.setItem(`elaasar_client_settled_at_${client.id}`, nowISO);
      }
      localStorage.removeItem(`elaasar_client_excess_debt_${client.id}`);
      localStorage.removeItem(`elaasar_client_excess_debt_date_${client.id}`);
      localStorage.removeItem(`elaasar_client_excess_credit_${client.id}`);
      localStorage.removeItem(`elaasar_client_excess_credit_date_${client.id}`);
    } catch (e) {
      console.error(e);
    }

    if (type === 'عادي' && account && (account.paidAmount > 0 || account.finalAmount > 0)) {
      archiveClientCycle({
        clientId: client.id,
        clientName: client.name,
        cycleType: 'تسوية يدوية وتصفير الحساب',
        debtBefore: account.remainingDebt || account.finalAmount || 0,
        amountPaid: account.paidAmount || 0,
        excessAmount: 0,
        finalBalance: 0,
        resultingType: 'عادي',
        notes: `تم تأكيد تصفير الحساب يدوياً وتحويل العميل إلى حساب عادي خالص (0 ج.م)`,
        date: new Date()
      });
    }

    const label = type === 'عادي' ? 'الحسابات العادية الخالصة' : 'كشف المدينين';
    showToast(`تم نقل العميل (${client.name}) إلى ${label}`);
  };

  // Quick action: Open recharge modal for a wallet
  const handleQuickRecharge = (client, wallet) => {
    setModalData({
      clientId: client.id,
      clientName: client.name,
      wallet: {
        id: wallet.id,
        phoneNumber: wallet.phoneNumber,
        label: wallet.label
      }
    });
    setActiveModal('rechargeWallet');
  };

  // Helper: Generate WhatsApp Statement text
  const generateWhatsAppStatementText = (item) => {
    const isAdd = (item.effectiveMode || item.commissionMode) === 'add';
    const modeText = isAdd ? 'إضافة' : 'خصم';
    const periodLabel = timeRange === 'today' ? 'اليوم' : timeRange === 'month' ? 'هذا الشهر' : 'الإجمالي';

    let balanceLine = '';
    if (item.paidAmount > 0) {
      if (item.creditAmount > 0) {
        balanceLine = `المبالغ المسددة: ${formatNumber(item.paidAmount)} ج.م\nالرصيد الدائن المستحق لحضرتكم: ${formatNumber(item.creditAmount)} ج.م`;
      } else if (item.isSettled) {
        balanceLine = `المبالغ المسددة: ${formatNumber(item.paidAmount)} ج.م\nالحساب خالص تماماً (0 ج.م)`;
      } else {
        balanceLine = `المبالغ المسددة: ${formatNumber(item.paidAmount)} ج.م\nالمتبقي المطلوب سداده: ${formatNumber(item.remainingDebt)} ج.م`;
      }
    } else {
      balanceLine = `المطلوب سداده بعد العمولة: ${formatNumber(item.finalAmount)} ج.م`;
    }

    return `السلام عليكم ورحمة الله،
كشف حساب (${periodLabel}) - محلات الأعصر:
العميل: ${item.client.name}
عدد الخطوط: ${item.wallets.filter(w => w.amount > 0).length || item.wallets.length}
-----------------------------
المبلغ قبل العمولة: ${formatNumber(item.baseAmount)} ج.م
${item.hasExcessDebt ? 'العمولة: بدون عمولة (صافي نقدي مباشر)' : `معامل الحساب: × ${item.commissionPercent} (${modeText} ${formatNumber(item.commissionAmount)} ج.م)`}
المبلغ الأساسي المطلوب (قبل السداد): ${formatNumber(item.finalAmount)} ج.م
-----------------------------
${balanceLine}
-----------------------------
شاكرين لحضرتك، نسعد بخدمتك دائماً.`;
  };

  // Direct action: Open WhatsApp Chat directly with pre-filled statement
  const handleOpenWhatsAppChat = (item) => {
    const targetPhone = item.client?.whatsappPhone || item.wallets?.find(w => w.phoneNumber)?.phoneNumber || item.client?.wallets?.[0]?.phoneNumber;
    if (!targetPhone) {
      showToast(`لا يوجد رقم واتساب أو رقم محفظة مسجل لحساب ${item.client.name}`, 'warning');
      return;
    }
    const text = generateWhatsAppStatementText(item);
    const url = buildWhatsAppUrl(targetPhone, text);
    window.open(url, '_blank');
    showToast(`جاري فتح محادثة واتساب للعميل "${item.client.name}"`);
  };

  // Quick action: Copy WhatsApp Statement message
  const handleCopyWhatsAppMessage = (item) => {
    const text = generateWhatsAppStatementText(item);
    navigator.clipboard.writeText(text);
    setCopiedClientId(item.client.id);
    showToast(`تم نسخ رسالة المطالبة لحساب ${item.client.name}`);
    setTimeout(() => setCopiedClientId(null), 2500);
  };

  // Export full table to CSV / Excel
  const handleExportCSV = () => {
    if (filteredAccounts.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'info');
      return;
    }

    const periodLabel = timeRange === 'today' ? 'شحن اليوم' : timeRange === 'month' ? 'شحن هذا الشهر' : 'الإجمالي العام';
    const headers = [
      'م',
      'اسم العميل',
      'عدد الخطوط',
      'أرقام الهواتف',
      'إجمالي الشحن (قبل العمولة)',
      'نوع الحساب والعمولة',
      'معامل الضرب',
      'فرق العمولة',
      'المبلغ الأساسي (قبل السداد)',
      'المسدد',
      'المتبقي المطلوب (بعد السداد)'
    ];

    const rows = filteredAccounts.map((item, idx) => {
      const isAdd = (item.effectiveMode || item.commissionMode) === 'add';
      return [
        idx + 1,
        `"${item.client.name.replace(/"/g, '""')}"`,
        item.wallets.length,
        `"${item.wallets.map(w => w.phoneNumber).join(' - ')}"`,
        item.baseAmount,
        item.hasExcessDebt ? 'صافي نقدي (بدون عمولة)' : (isAdd ? 'إضافة (+)' : 'خصم (-)'),
        item.commissionPercent,
        item.hasExcessDebt ? 0 : (isAdd ? item.commissionAmount : -item.commissionAmount),
        item.finalAmount,
        item.paidAmount,
        item.remainingDebt
      ];
    });

    rows.push([]);
    rows.push([`كشف حسابات العملاء والآجل - فترة: ${periodLabel}`, '', '', '', '', '', '', '', '', '', '']);
    rows.push(['الإجمالي العام', '', '', '', summaryTotals.totalBase, '', '', summaryTotals.totalCommission, summaryTotals.totalFinal, summaryTotals.totalPaid, summaryTotals.totalRemaining]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `كشف-حسابات-العملاء-${todayKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير كشف حسابات العملاء إلى ملف إكسل بنجاح');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center shadow-md shadow-emerald-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                حسابات العملاء والآجل
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                متابعة المستحقات
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              رصد رصيد الشحن الآجل لكل عميل، حساب العمولات (خصم أو إضافة)، وتحديث لحظي مباشر مع أي حركة
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToClients && (
            <button
              onClick={onNavigateToClients}
              className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs transition-all"
              title="العودة لشاشة دليل العملاء"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>العودة لدليل العملاء</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs"
            title="تصدير كشف حسابات العملاء إلى إكسل"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصدير إكسل</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs"
            title="طباعة كشف الحسابات"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>

        </div>

      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accountTypeTab === 'أرشيف' ? (
          <>
            {/* Archive Card 1: Total Recharged in Archives */}
            <div className="card-hover text-white p-5 rounded-2xl shadow-lg relative overflow-hidden transition-all bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 shadow-blue-600/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/90 flex items-center gap-1">
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>إجمالي مبالغ الشحن المؤرشفة</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-white font-mono">
                  {archiveSummary.rechargeCount} شحنة
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
                {formatCurrency(archiveSummary.totalRecharge)}
              </div>
              <span className="text-[11px] text-white/80 mt-2 block">
                إجمالي مبالغ الشحن المدخلة لكافة خطوط ومحافظ العملاء
              </span>
            </div>

            {/* Archive Card 2: Total Paid in Archives */}
            <div className="card-hover text-white p-5 rounded-2xl shadow-lg relative overflow-hidden transition-all bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 shadow-emerald-600/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/90 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إجمالي المبالغ المسددة</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-white font-mono">
                  {archiveSummary.paymentCount} سداد
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
                {formatCurrency(archiveSummary.totalPaid)}
              </div>
              <span className="text-[11px] text-white/80 mt-2 block">
                إجمالي المبالغ المسددة والمصروفة من حسابات العملاء
              </span>
            </div>

            {/* Archive Card 3: Total Excess */}
            <div className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  إجمالي مبالغ الفائض المسجلة
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200">
                  فروق الزيادة
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {formatCurrency(archiveSummary.totalExcess)}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
                مبالغ الزيادة التي سددها العملاء أو أصحاب المحل عند التسوية
              </span>
            </div>

            {/* Archive Card 4: Total Operations Count */}
            <div className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <History className="w-3.5 h-3.5 text-indigo-500" />
                  <span>إجمالي عمليات الأرشيف</span>
                </span>
                <span className="text-[10px] text-slate-400">شحن وسداد</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-purple-600 dark:text-purple-400">
                {allUnifiedArchives.length} عملية
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                كافة عمليات شحن الرصيد وسداد المديونيات وصرف المستحقات
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Card 1: Total Receivables (المبلغ الآجل بعد العمولة) */}
            <div className={`card-hover text-white p-5 rounded-2xl shadow-lg relative overflow-hidden transition-all ${
              accountTypeTab === 'مدين'
                ? 'bg-gradient-to-br from-rose-600 to-rose-700 shadow-rose-600/20'
                : accountTypeTab === 'دائن'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-600/20'
                : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-600/20'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/90 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>
                    {accountTypeTab === 'مدين'
                      ? 'إجمالي الآجل المستحق (المدينين)'
                      : accountTypeTab === 'دائن'
                      ? 'إجمالي الأرصدة الدائنة (الدائنين)'
                      : 'إجمالي الحسابات العادية (خالص)'}
                  </span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-white">
                  {accountTypeTab === 'مدين' ? 'المطلوب تحصيله' : accountTypeTab === 'دائن' ? 'مستحق للدائنين' : 'حسابات مسددة'}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
                {formatCurrency(summaryTotals.totalFinal)}
              </div>
              <span className="text-[11px] text-white/80 mt-2 block">
                {accountTypeTab === 'مدين'
                  ? 'صافي المبالغ الآجلة المطلوبة من كافة عملاء كشف المدينين'
                  : accountTypeTab === 'دائن'
                  ? 'صافي الأرصدة الدائنة المستحقة لكافة عملاء كشف الدائنين'
                  : 'عملاء حساباتهم مسددة وخالصة لا دائن ولا مدين'}
              </span>
            </div>

            {/* Card 2: Total Recharges (إجمالي الشحن قبل العمولة) */}
            <div className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  إجمالي مبالغ الشحن (قبل العمولة)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  المبالغ المدخلة
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {formatCurrency(summaryTotals.totalBase)}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
                المبالغ التي تم شحنها فعلياً لأرقام العملاء في الفترة المحددة
              </span>
            </div>

            {/* Card 3: Net Commission Difference */}
            <div className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-500" />
                  <span>صافي فرق العمولات</span>
                </span>
                <span className="text-[10px] text-slate-400">إضافة / خصم</span>
              </div>
              <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                summaryTotals.totalCommission >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {summaryTotals.totalCommission >= 0 ? '+' : ''}{formatCurrency(summaryTotals.totalCommission)}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block pt-1">
                إجمالي العمولات المضافة أو المخصومة للعملاء
              </span>
            </div>

            {/* Card 4: Clients & Lines Overview */}
            <div className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>إحصائيات العملاء</span>
                </span>
                <span className="text-[10px] text-slate-400">النشاط</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {accountTypeTab === 'مدين' ? 'عملاء عليهم آجل نشط:' : 'عملاء لهم رصيد نشط:'}
                </span>
                <strong className={`font-mono text-base font-black ${
                  accountTypeTab === 'مدين' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {summaryTotals.activeClientsCount} من {accountTypeTab === 'مدين' ? debtorClients.length : creditorClients.length}
                </strong>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500">إجمالي الخطوط المسجلة:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {summaryTotals.totalWalletsCount} رقم
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Toolbar: Shown only in live account tabs */}
      {accountTypeTab !== 'أرشيف' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Time Period Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shrink-0">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeRange === 'today'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              شحن اليوم
            </button>

            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeRange === 'month'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              شحن هذا الشهر
            </button>

            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeRange === 'all'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              الإجمالي العام (الكل)
            </button>
          </div>

          {/* Search & Active-Only Filter */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 lg:max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث باسم العميل أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Toggle: Only Debt > 0 */}
            <button
              onClick={() => setFilterActiveOnly(!filterActiveOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors shrink-0 ${
                filterActiveOnly
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>عليهم آجل فقط (&gt; 0)</span>
            </button>
          </div>

        </div>
      )}

      {/* 4 Tabs above the table: مدين / دائن / عادي / أرشيف حسابات العملاء */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 dark:bg-slate-800/90 rounded-2xl w-fit border border-slate-300/70 dark:border-slate-700 shadow-xs flex-wrap">
          {/* Tab 1: مدين */}
          <button
            type="button"
            onClick={() => setAccountTypeTab('مدين')}
            className={`btn-interactive flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              accountTypeTab === 'مدين'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>حسابات المدينين (مدين)</span>
            <span className={`px-2 py-0.5 text-xs rounded-full font-mono font-bold ${
              accountTypeTab === 'مدين'
                ? 'bg-white/20 text-white'
                : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
            }`}>
              {debtorClients.length}
            </span>
          </button>

          {/* Tab 2: دائن */}
          <button
            type="button"
            onClick={() => setAccountTypeTab('دائن')}
            className={`btn-interactive flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              accountTypeTab === 'دائن'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>حسابات الدائنين (دائن)</span>
            <span className={`px-2 py-0.5 text-xs rounded-full font-mono font-bold ${
              accountTypeTab === 'دائن'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
            }`}>
              {creditorClients.length}
            </span>
          </button>

          {/* Tab 3: عادي */}
          <button
            type="button"
            onClick={() => setAccountTypeTab('عادي')}
            className={`btn-interactive flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              accountTypeTab === 'عادي'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>حسابات عادية (خالص)</span>
            <span className={`px-2 py-0.5 text-xs rounded-full font-mono font-bold ${
              accountTypeTab === 'عادي'
                ? 'bg-white/20 text-white'
                : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300'
            }`}>
              {normalClients.length}
            </span>
          </button>

          {/* Tab 4: أرشيف حسابات العملاء */}
          <button
            type="button"
            onClick={() => setAccountTypeTab('أرشيف')}
            className={`btn-interactive flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              accountTypeTab === 'أرشيف'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>أرشيف حسابات العملاء</span>
            <span className={`px-2 py-0.5 text-xs rounded-full font-mono font-bold ${
              accountTypeTab === 'أرشيف'
                ? 'bg-white/20 text-white'
                : 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300'
            }`}>
              {allUnifiedArchives?.length || 0}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
          {accountTypeTab === 'أرشيف' ? (
            <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
              إجمالي عمليات الأرشيف: <strong className="font-mono text-base font-black mr-1">{allUnifiedArchives?.length || 0} عملية</strong>
            </span>
          ) : accountTypeTab === 'مدين' ? (
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              إجمالي مستحقات كشف المدينين: <strong className="font-mono text-base font-black mr-1">{formatCurrency(debtorTotalFinal)}</strong>
            </span>
          ) : accountTypeTab === 'دائن' ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              إجمالي أرصدة كشف الدائنين: <strong className="font-mono text-base font-black mr-1">{formatCurrency(creditorTotalFinal)}</strong>
            </span>
          ) : (
            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              عملاء خالصين (مسدد): <strong className="font-mono text-base font-black mr-1">{normalClients.length} عميل</strong>
            </span>
          )}
        </div>
      </div>

      {/* 5. Main Content: Either the Archive Section OR Live Accounts Table */}
      {accountTypeTab === 'أرشيف' ? (
        /* ======================================================== */
        /* أرشيف حسابات العملاء والتسويات المنتهية                     */
        /* ======================================================== */
        <div className="space-y-4">
          
          {/* Archive Filter & Search Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setArchiveFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  archiveFilterType === 'all'
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                الكل ({allUnifiedArchives.length})
              </button>

              <button
                type="button"
                onClick={() => setArchiveFilterType('recharge')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  archiveFilterType === 'recharge'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                شحن رصيد للخطوط ({allUnifiedArchives.filter(a => a.operationCategory === 'recharge' || a.cycleType?.includes('شحن')).length})
              </button>

              <button
                type="button"
                onClick={() => setArchiveFilterType('debt')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  archiveFilterType === 'debt'
                    ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                سداد مديونيات ({allUnifiedArchives.filter(a => a.cycleType?.includes('مديونية') || a.cycleType?.includes('سداد')).length})
              </button>

              <button
                type="button"
                onClick={() => setArchiveFilterType('credit')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  archiveFilterType === 'credit'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                صرف مستحقات دائنين ({allUnifiedArchives.filter(a => a.cycleType?.includes('دائن') || a.cycleType?.includes('مستحق')).length})
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-sm">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث في الأرشيف باسم العميل، الملاحظات..."
                value={archiveSearchQuery}
                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              {archiveSearchQuery && (
                <button
                  onClick={() => setArchiveSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

          </div>

          {/* Archive Records Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  سجل أرشيف حسابات وعمليات العملاء (شحن وسداد)
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
                  {filteredArchives.length} عملية مؤرشفة
                </span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                يوثق الأرشيف كل حركة شحن رصيد للخطوط أو سداد للمبالغ بدقة
              </div>
            </div>

            {groupedArchives.length === 0 ? (
              <div className="py-16 text-center px-4">
                <Archive className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                  لا توجد سجلات في الأرشيف حالياً
                </h4>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  يتم حفظ وتوثيق أي حركة شحن رصيد أو سداد مديونية أو صرف مستحقات هنا تلقائياً لجميع العملاء.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-black border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4 min-w-[180px]">اسم العميل</th>
                      <th className="py-3.5 px-4 min-w-[120px] text-center">عدد العمليات</th>
                      <th className="py-3.5 px-4 min-w-[160px]">تاريخ ووقت آخر عملية</th>
                      <th className="py-3.5 px-4 min-w-[180px]">نوع آخر عملية</th>
                      <th className="py-3.5 px-4 min-w-[140px] text-blue-700 dark:text-blue-300">إجمالي الشحن</th>
                      <th className="py-3.5 px-4 min-w-[140px] text-emerald-700 dark:text-emerald-300">إجمالي المسدد</th>
                      <th className="py-3.5 px-4 min-w-[110px]">إجمالي الفائض</th>
                      <th className="py-3.5 px-4 min-w-[130px] text-slate-900 dark:text-white">الحالة الحالية</th>
                      <th className="py-3.5 px-4 min-w-[160px] text-center">إجراءات وعرض العمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedGroupedArchives.map((group, index) => {
                      const latest = group.latestRecord;
                      const isNormal = latest.resultingType === 'عادي';
                      const isCreditor = latest.resultingType === 'دائن';
                      const isDebtor = latest.resultingType === 'مدين';
                      const rowNum = (safeArchivePage - 1) * ITEMS_PER_PAGE + index + 1;

                      return (
                        <tr
                          key={group.clientId || group.clientName || index}
                          onClick={() => setSelectedArchiveClient(group)}
                          className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">
                            {rowNum}
                          </td>

                          {/* Client Name with Quick Click Indicator */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 dark:text-white text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                {group.clientName}
                              </span>
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                (انقر لعرض كل العمليات)
                              </span>
                            </div>
                          </td>

                          {/* Operations Count */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-mono">
                              <History className="w-3.5 h-3.5" />
                              <span>{group.records.length} {group.records.length === 1 ? 'عملية' : 'عمليات'}</span>
                            </span>
                          </td>

                          {/* Latest Date and Time */}
                          <td className="py-3.5 px-4 text-xs">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {formatDateArabic(group.latestDate)}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-purple-500" />
                              <span>{formatTimeArabic(latest.time || group.latestDate)}</span>
                            </div>
                          </td>

                          {/* Latest Operation Type Badge */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                              latest.operationCategory === 'recharge' || latest.cycleType.includes('شحن')
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                                : latest.cycleType.includes('فائض')
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : latest.cycleType.includes('صرف مستحقات')
                                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            }`}>
                              {latest.operationCategory === 'recharge' || latest.cycleType.includes('شحن') ? (
                                <ArrowDownToLine className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>{latest.cycleType}</span>
                            </span>
                          </td>

                          {/* Total Recharged */}
                          <td className="py-3.5 px-4 font-mono text-sm font-black text-blue-600 dark:text-blue-400" dir="ltr">
                            {group.totalRecharged > 0 ? `+${formatCurrency(group.totalRecharged)}` : '-'}
                          </td>

                          {/* Total Paid */}
                          <td className="py-3.5 px-4 font-mono text-sm font-black text-emerald-600 dark:text-emerald-400" dir="ltr">
                            {group.totalPaid > 0 ? formatCurrency(group.totalPaid) : '-'}
                          </td>

                          {/* Total Excess Amount */}
                          <td className="py-3.5 px-4 font-mono text-xs font-bold" dir="ltr">
                            {group.totalExcess > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-black">
                                +{formatCurrency(group.totalExcess)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Result Balance & Status */}
                          <td className="py-3.5 px-4">
                            {isNormal ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <Check className="w-3 h-3" />
                                <span>حساب خالص (0 ج.م)</span>
                              </span>
                            ) : isCreditor ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-mono" dir="ltr">
                                دائن ({formatCurrency(latest.finalBalance)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-mono" dir="ltr">
                                مدين ({formatCurrency(latest.finalBalance)})
                              </span>
                            )}
                          </td>

                          {/* Actions: View Details / Delete Group */}
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedArchiveClient(group)}
                                className="btn-interactive flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors"
                                title="عرض كشف العمليات والتسويات لهذا العميل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>عرض العمليات ({group.records.length})</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteGroupArchives(group)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="حذف كافة سجلات هذا العميل من الأرشيف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination for Grouped Archives (بحد أقصى 10 صفوف لكل صفحة) */}
                {renderPagination(safeArchivePage, totalArchivePages, groupedArchives.length, setArchivePage, 'عميل بالأرشيف')}
              </div>
            )}

          </div>

        </div>
      ) : (
        /* ======================================================== */
        /* جدول كشف الحسابات المباشر (مدين / دائن / عادي)           */
        /* ======================================================== */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {accountTypeTab === 'مدين' ? 'جدول المبالغ الآجلة على العملاء (المدينين)' : accountTypeTab === 'دائن' ? 'جدول الأرصدة المستحقة للعملاء (الدائنين)' : 'جدول العملاء العاديين (الحسابات الخالصة)'}
            </h3>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
              accountTypeTab === 'مدين'
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                : accountTypeTab === 'دائن'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
            }`}>
              {filteredAccounts.length} عميل ({accountTypeTab})
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className={`w-2 h-2 rounded-full animate-pulse ${accountTypeTab === 'مدين' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
            <span>تحديث فوري ومباشر مع أي حركة رصيد أو تصنيف</span>
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
              لا توجد حسابات مطابقة للبحث أو الفلتر
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              تأكد من كتابة الاسم بشكل صحيح أو قم بإلغاء فلتر "عليهم آجل فقط".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-black border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 min-w-[170px]">اسم العميل</th>
                  <th className="py-3.5 px-4 min-w-[260px]">أرقام وخطوط العميل</th>
                  <th className="py-3.5 px-4 min-w-[140px] text-blue-700 dark:text-blue-300">
                    المبلغ قبل العمولة
                  </th>
                  <th className="py-3.5 px-4 min-w-[190px]">ضبط العمولة (% / خصم / إضافة)</th>
                  <th className="py-3.5 px-4 min-w-[160px] text-slate-900 dark:text-white bg-slate-200/60 dark:bg-slate-800/60 font-black">
                    المبلغ الأساسي (قبل السداد)
                  </th>
                  <th className={`py-3.5 px-4 min-w-[180px] ${
                    accountTypeTab === 'مدين'
                      ? 'text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20'
                      : accountTypeTab === 'دائن'
                      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20'
                  }`}>
                    {accountTypeTab === 'مدين' 
                      ? 'المتبقي المطلوب (بعد السداد)' 
                      : accountTypeTab === 'دائن' 
                      ? 'الرصيد الدائن المتبقي (بعد الصرف)' 
                      : 'حالة الحساب والرصيد'}
                  </th>
                  <th className="py-3.5 px-4 w-32 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedAccounts.map((item, index) => {
                  const { client, wallets, baseAmount, commissionMode, commissionPercent, commissionAmount, finalAmount } = item;
                  const rowNum = (safeAccountsPage - 1) * ITEMS_PER_PAGE + index + 1;

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Row index */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">
                        {rowNum}
                      </td>

                      {/* Client Identity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs ${
                            item.clientType === 'مدين'
                              ? 'bg-gradient-to-tr from-slate-900 to-rose-900'
                              : 'bg-gradient-to-tr from-slate-900 to-emerald-900'
                          }`}>
                            {client.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-black text-slate-900 dark:text-white text-sm leading-tight">
                                {client.name}
                              </span>

                              {/* 2 Buttons to change classification: عادي / مدين، أو شارة دائن إذا كان دائناً */}
                              {(item.effectiveClientType || item.clientType) === 'دائن' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white shadow-2xs flex items-center gap-1" title="عميل دائن: له رصيد مستحق ناتج عن سداد مبلغ أكبر من الدين المستحق">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span>دائن (له رصيد)</span>
                                </span>
                              ) : (
                                <div className="flex items-center gap-0.5 bg-slate-200/90 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                                  <button
                                    type="button"
                                    disabled={item.remainingDebt > 0}
                                    onClick={() => handleSetClientType(client, 'عادي')}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all ${
                                      (item.effectiveClientType || item.clientType) === 'عادي'
                                        ? 'bg-blue-600 text-white shadow-2xs cursor-default'
                                        : item.remainingDebt > 0
                                        ? 'text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                    title={
                                      item.remainingDebt > 0
                                        ? 'لا يمكن التحويل لحساب عادي لوجود مديونية مستحقة غير مسددة'
                                        : 'تحديد كـ عادي (حساب خالص)'
                                    }
                                  >
                                    عادي
                                  </button>
                                  <button
                                    type="button"
                                    disabled={(item.effectiveClientType || item.clientType) === 'مدين' || item.remainingDebt <= 0}
                                    onClick={() => handleSetClientType(client, 'مدين')}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all ${
                                      (item.effectiveClientType || item.clientType) === 'مدين'
                                        ? 'bg-rose-600 text-white shadow-2xs cursor-default'
                                        : item.remainingDebt <= 0
                                        ? 'text-slate-400 dark:text-slate-600 opacity-40 cursor-not-allowed'
                                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                    title={
                                      item.remainingDebt <= 0
                                        ? 'العميل حسابه خالص (0 ج.م) - لا يمكن تحويله إلى مدين إلا إذا كان عليه فلوس أو تم شحن رصيد له'
                                        : 'تحديد كـ مدين'
                                    }
                                  >
                                    مدين
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {wallets.length} {wallets.length === 1 ? 'رقم مسجل' : 'أرقام مسجلة'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client Wallets & Breakdown */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {wallets.map(w => (
                            <div
                              key={w.id}
                              className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-750 text-xs"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                                  {formatPhone(w.phoneNumber)}
                                </span>
                                {w.carrier && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    {w.carrier.name}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                                  {formatCurrency(w.amount)}
                                </span>
                                <button
                                  onClick={() => handleQuickRecharge(client, w)}
                                  className="btn-interactive p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  title="شحن رصيد إضافي لهذا الرقم"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Amount before commission (المبلغ قبل العمولة) */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-base font-black text-blue-700 dark:text-blue-300" dir="ltr">
                        {item.isSettled || accountTypeTab === 'عادي' || (item.effectiveClientType || item.clientType) === 'عادي' || (baseAmount === 0 && item.remainingDebt <= 0 && item.creditAmount <= 0)
                          ? '0 ج.م'
                          : formatCurrency(item.hasExcessDebt ? item.excessDebt : baseAmount)}
                      </td>

                      {/* Commission Settings (معامل ونوع العمولة) */}
                      <td className="py-3.5 px-4">
                        {accountTypeTab === 'عادي' || (item.effectiveClientType || item.clientType) === 'عادي' || item.isSettled || (baseAmount === 0 && item.remainingDebt <= 0 && item.creditAmount <= 0) || (item.finalAmount === 0 && item.remainingDebt <= 0) ? (
                          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs font-bold">
                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700">
                              -
                            </span>
                            <span className="text-[11px] text-slate-400">لا تنطبق (خالص)</span>
                          </div>
                        ) : item.hasExcessDebt ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
                              صافي نقدي (بدون عمولة أو خصم)
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Mode Toggle Button: إضافة (+) أو خصم (-) */}
                            <button
                              type="button"
                              onClick={() => handleToggleCommissionMode(client, item.effectiveMode || commissionMode, commissionPercent)}
                              className={`btn-interactive px-2 py-1 rounded-lg text-xs font-black transition-all shadow-xs ${
                                (item.effectiveMode || commissionMode) === 'add'
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-rose-600 hover:bg-rose-700 text-white'
                              }`}
                              title="اضغط للتبديل بين إضافة أو خصم العمولة"
                            >
                              {(item.effectiveMode || commissionMode) === 'add' ? 'إضافة (+)' : 'خصم (-)'}
                            </button>

                            {/* Multiplier Input without % symbol */}
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-2 py-0.5 shadow-2xs">
                              <span className="text-xs font-bold text-slate-400 select-none">×</span>
                              <input
                                type="number"
                                step="any"
                                value={commissionPercent}
                                onChange={(e) => handleChangeCommissionPercent(client, e.target.value)}
                                placeholder="0.995"
                                className="w-20 text-sm font-black font-mono text-center bg-transparent border-none p-0 text-slate-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                title="أدخل معامل الحساب (مثال: 0.995 أو 1.005)"
                              />
                            </div>

                            {/* Calculated Commission Value */}
                            {commissionAmount > 0 && (
                              <span className={`text-[11px] font-black font-mono mr-0.5 ${
                                (item.effectiveMode || commissionMode) === 'add'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-rose-700 dark:text-rose-400'
                              }`} dir="ltr">
                                ({(item.effectiveMode || commissionMode) === 'add' ? '+' : '-'}{formatCurrency(commissionAmount)})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* NEW COLUMN: المبلغ الأساسي (قبل السداد) */}
                      <td className="py-3.5 px-4 whitespace-nowrap bg-slate-50/70 dark:bg-slate-800/40 font-mono">
                        <div className="text-base font-black text-slate-900 dark:text-white" dir="ltr">
                          {item.isSettled || accountTypeTab === 'عادي' || (item.effectiveClientType || item.clientType) === 'عادي' || (baseAmount === 0 && item.remainingDebt <= 0 && item.creditAmount <= 0)
                            ? '0 ج.م'
                            : formatCurrency(item.finalAmount)}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-0.5">
                          {item.isSettled || accountTypeTab === 'عادي' || (item.effectiveClientType || item.clientType) === 'عادي'
                            ? 'حساب خالص (0 ج.م)'
                            : item.hasExcessDebt 
                            ? 'المبلغ الزائد من المحل' 
                            : accountTypeTab === 'مدين' 
                            ? 'المستحق بعد العمولة' 
                            : 'الرصيد الدائن المستحق'}
                        </span>
                      </td>

                      {/* Amount after payment & Net balance (المتبقي المطلوب بعد السداد) */}
                      <td className={`py-3.5 px-4 whitespace-nowrap ${
                        accountTypeTab === 'مدين' ? 'bg-rose-50/40 dark:bg-rose-950/20' : 'bg-emerald-50/40 dark:bg-emerald-950/20'
                      }`}>
                        {accountTypeTab === 'مدين' ? (
                          item.isSettled ? (
                            <div>
                              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>خالص بالكامل (0 ج.م)</span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                المطلوب: {formatCurrency(item.finalAmount)} • تم سداد: {formatCurrency(item.paidAmount)}
                              </span>
                            </div>
                          ) : item.paidAmount > 0 ? (
                            <div>
                              <div className="font-mono text-lg font-black text-rose-700 dark:text-rose-300" dir="ltr">
                                {formatCurrency(item.remainingDebt)}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-0.5">
                                المتبقي مطلوب • مسدد: {formatCurrency(item.paidAmount)} من {formatCurrency(item.finalAmount)}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <div className="font-mono text-lg font-black text-rose-700 dark:text-rose-300" dir="ltr">
                                {formatCurrency(item.finalAmount)}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                مطلوب سداده بالكامل
                              </span>
                            </div>
                          )
                        ) : (accountTypeTab === 'عادي' || item.isSettled) ? (
                          <div>
                            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-black text-sm">
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                              <span>خالص بالكامل (0 ج.م)</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                              لا توجد مديونيات أو مستحقات نشطة
                            </span>
                          </div>
                        ) : (
                          /* Creditor Tab (دائن) */
                          <div>
                            <div className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                              {formatCurrency(item.creditAmount > 0 ? item.creditAmount : item.finalAmount)}
                            </div>
                            <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold block mt-0.5">
                              {item.creditAmount > 0
                                ? `له رصيد دائن (مسدد بزيادة +${formatCurrency(item.creditAmount)})`
                                : 'رصيد دائن مستحق للعميل'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Payment Button */}
                          <button
                            onClick={() => handleOpenPayment(item)}
                            className="btn-interactive flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                            title="تسجيل سداد دفعة لحساب هذا العميل"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>سداد</span>
                          </button>

                          {/* View Statement Details */}
                          <button
                            onClick={() => setSelectedClientForStatement(item)}
                            className="btn-interactive p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
                            title="عرض كشف الحساب التفصيلي للشحنات والمدفوعات"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Direct WhatsApp Action Button */}
                          <button
                            onClick={() => handleOpenWhatsAppChat(item)}
                            className="btn-interactive p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                            title={`فتح شات واتساب وإرسال كشف الحساب مباشرة إلى ${item.client.name}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Copy WhatsApp Statement */}
                          <button
                            onClick={() => handleCopyWhatsAppMessage(item)}
                            className="btn-interactive p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400"
                            title="نسخ ملخص الحساب لإرساله يدوياً"
                          >
                            {copiedClientId === client.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>

              {/* Exact Styled Footer Summary */}
              <tfoot>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-black">
                  <td className="py-3.5 px-4 text-center text-xs">∑</td>
                  <td className="py-3.5 px-4 text-sm font-black text-slate-900 dark:text-white">
                    الإجمالي العام ({filteredAccounts.length} عميل)
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {summaryTotals.totalWalletsCount} خط مسجل
                  </td>
                  <td className="py-3.5 px-4 font-mono text-lg text-blue-700 dark:text-blue-300" dir="ltr">
                    {formatCurrency(summaryTotals.totalBase)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-sm text-slate-700 dark:text-slate-300" dir="ltr">
                    {summaryTotals.totalCommission >= 0 ? '+' : ''}{formatCurrency(summaryTotals.totalCommission)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xl text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/30" dir="ltr">
                    {formatCurrency(summaryTotals.totalFinal)}
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs text-slate-400">-</td>
                </tr>
              </tfoot>
            </table>

            {/* Live Accounts Pagination (بحد أقصى 10 صفوف لكل صفحة) */}
            {renderPagination(safeAccountsPage, totalAccountsPages, filteredAccounts.length, setAccountsPage, 'عميل')}
          </div>
        )}

      </div>
      )}

      {/* 5. Right Sheet Drawer: Detailed Account Statement for Single Client */}
      {selectedClientForStatement && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden" dir="rtl">
          {/* Backdrop Overlay */}
          <div 
            className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity ${
              closingStatementSheet ? 'animate-right-sheet-backdrop-out' : 'animate-right-sheet-backdrop'
            }`}
            onClick={handleCloseStatementSheet}
          />

          <div className={`fixed inset-y-0 right-0 z-10 h-full w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden sm:rounded-l-3xl ${
            closingStatementSheet ? 'animate-right-sheet-out' : 'animate-right-sheet'
          }`}>
              {/* Mobile Drag Handle Indicator */}
              <div className="sm:hidden w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />
              
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        كشف حساب العميل: {selectedClientForStatement.client.name}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                        selectedClientForStatement.creditAmount > 0
                          ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300'
                          : selectedClientForStatement.remainingDebt > 0
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                          : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {selectedClientForStatement.creditAmount > 0
                          ? `دائن (+${formatCurrency(selectedClientForStatement.creditAmount)})`
                          : selectedClientForStatement.remainingDebt > 0
                          ? `مدين (${formatCurrency(selectedClientForStatement.remainingDebt)})`
                          : 'خالص بالكامل (0 ج.م)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      كشف حساب منظم: تسلسل العمليات زمنيًا، سجل الشحنات، وسجل السداد
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedClientForStatement.remainingDebt > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetClient = selectedClientForStatement;
                        handleCloseStatementSheet();
                        setTimeout(() => handleOpenPayment(targetClient), 240);
                      }}
                      className="btn-interactive hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs"
                      title="تسجيل سداد دفعة لهذا العميل"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>تسجيل سداد</span>
                    </button>
                  )}

                  <button
                    onClick={handleCloseStatementSheet}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="إغلاق اللوحة الجانبية"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Sheet Body with Responsive Max-Height */}
              <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                {/* Financial Summary: 3 Clean KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
              {/* 1. Total Recharges */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block mb-0.5">إجمالي الشحنات</span>
                  <strong className="font-mono text-lg font-black text-blue-700 dark:text-blue-300" dir="ltr">
                    +{formatCurrency(statementClientData?.totalRechargesAmount || selectedClientForStatement.baseAmount)}
                  </strong>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {statementClientData?.recharges?.length || 0} شحنة
                </span>
              </div>

              {/* 2. Total Payments */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">إجمالي المسدد</span>
                  <strong className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                    -{formatCurrency(statementClientData?.totalPaymentsAmount || selectedClientForStatement.paidAmount)}
                  </strong>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  {statementClientData?.payments?.length || 0} سداد
                </span>
              </div>

              {/* 3. Final Running Balance */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                selectedClientForStatement.creditAmount > 0
                  ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-300 text-teal-800 dark:text-teal-200'
                  : selectedClientForStatement.remainingDebt > 0
                  ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 text-rose-800 dark:text-rose-200'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-200'
              }`}>
                <div>
                  <span className="text-[11px] font-bold block mb-0.5">
                    {selectedClientForStatement.creditAmount > 0
                      ? 'رصيد دائن للعميل'
                      : selectedClientForStatement.remainingDebt > 0
                      ? 'الصافي المتبقي مطلوب'
                      : 'حالة الحساب'}
                  </span>
                  <strong className="font-mono text-lg font-black" dir="ltr">
                    {selectedClientForStatement.creditAmount > 0
                      ? `+${formatCurrency(selectedClientForStatement.creditAmount)}`
                      : selectedClientForStatement.remainingDebt > 0
                      ? formatCurrency(selectedClientForStatement.remainingDebt)
                      : 'خالص (0 ج.م)'}
                  </strong>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 shadow-2xs">
                  {selectedClientForStatement.creditAmount > 0 ? 'له رصيد' : selectedClientForStatement.remainingDebt > 0 ? 'مطلوب سداده' : 'مسدد بالكامل'}
                </span>
              </div>
            </div>

            {/* Sub-tab Navigation: 3 Distinct, Mutually-Exclusive Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStatementModalTab('steps');
                  setStatementModalPage(1);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  statementModalTab === 'steps'
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm border border-purple-200/80 dark:border-purple-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>تسلسل وترتيب العمليات (خطوة بخطوة)</span>
                <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  {statementClientData?.chronologicalSteps?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatementModalTab('recharges');
                  setStatementModalPage(1);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  statementModalTab === 'recharges'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200/80 dark:border-blue-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>شحنات الخطوط</span>
                <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {statementClientData?.recharges?.length || 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatementModalTab('payments');
                  setStatementModalPage(1);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  statementModalTab === 'payments'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-200/80 dark:border-emerald-800'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>سجل المدفوعات والسداد</span>
                <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {statementClientData?.payments?.length || 0}
                </span>
              </button>
            </div>

            {/* Modal Body: Active Tab Content ONLY (No Duplication!) */}
            <div className="overflow-y-auto flex-1 min-h-[220px] max-h-[50vh] border border-slate-200 dark:border-slate-800 rounded-2xl">
              
              {/* TAB 1: Sequential Steps Ledger (تسلسل وترتيب العمليات خطوة بخطوة) */}
              {statementModalTab === 'steps' && (
                <div>
                  {(!activeStatementList || activeStatementList.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      لا توجد خطوات مسجلة لهذا العميل حتى الآن.
                    </div>
                  ) : (
                    <table className="w-full text-right text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3 w-16 text-center">الخطوة</th>
                          <th className="py-2.5 px-3 min-w-[130px]">التاريخ والوقت</th>
                          <th className="py-2.5 px-3 min-w-[140px]">نوع العملية</th>
                          <th className="py-2.5 px-3 min-w-[120px] text-blue-700 dark:text-blue-300">المبلغ المشحون (+)</th>
                          <th className="py-2.5 px-3 min-w-[120px] text-emerald-700 dark:text-emerald-300">المبلغ المسدد (-)</th>
                          <th className="py-2.5 px-3 min-w-[160px] text-slate-900 dark:text-white bg-slate-200/50 dark:bg-slate-750 font-black">الرصيد بعد الحركة (المتبقي)</th>
                          <th className="py-2.5 px-3 min-w-[180px]">البيان / طريقة الدفع / الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedStatementList.map((step, idx) => {
                          const isRec = step.operationCategory === 'recharge' || step.cycleType?.includes('شحن');
                          const rechargeAmt = isRec ? (Number(step.rechargeAmount) || Number(step.amountPaid) || 0) : 0;
                          const paidAmt = !isRec ? (Number(step.amountPaid) || 0) : 0;
                          const isNormal = step.balanceAfter === 0;
                          const isDebtor = step.balanceAfter > 0;

                          return (
                            <tr key={step.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-mono font-black bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  #{step.stepNumber || idx + 1}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white">{formatDateArabic(step.date)}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-purple-500" />
                                  <span>{step.time || formatTimeArabic(step.date)}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-bold">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                                  isRec
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    : step.cycleType?.includes('فائض')
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                }`}>
                                  {isRec ? <ArrowDownToLine className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                  <span>{step.cycleType || (isRec ? 'شحن رصيد للخط' : 'سداد دفعة من الحساب')}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">
                                {rechargeAmt > 0 ? (
                                  <span className="text-blue-700 dark:text-blue-300 font-black text-xs sm:text-sm" dir="ltr">
                                    +{formatCurrency(rechargeAmt)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">
                                {paidAmt > 0 ? (
                                  <span className="text-emerald-700 dark:text-emerald-300 font-black text-xs sm:text-sm" dir="ltr">
                                    -{formatCurrency(paidAmt)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold bg-slate-50/50 dark:bg-slate-800/30">
                                {isNormal ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    <Check className="w-3 h-3" />
                                    <span>خالص (0 ج.م)</span>
                                  </span>
                                ) : isDebtor ? (
                                  <div>
                                    <div className="font-mono text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300" dir="ltr">
                                      {formatCurrency(step.balanceAfter)}
                                    </div>
                                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-0.5">
                                      متبقي مطلوب (مدين)
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="font-mono text-xs sm:text-sm font-black text-teal-700 dark:text-teal-300" dir="ltr">
                                      +{formatCurrency(Math.abs(step.balanceAfter))}
                                    </div>
                                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block mt-0.5">
                                      رصيد دائن للعميل
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-xs truncate" title={step.notes}>
                                {step.notes || (step.walletPhone ? `شحن لرقم ${formatPhone(step.walletPhone)}` : (step.paymentMethod ? `دفع: ${step.paymentMethod}` : '-'))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 2: Recharges Log ONLY */}
              {statementModalTab === 'recharges' && (
                <div>
                  {(!activeStatementList || activeStatementList.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      لا توجد عمليات شحن مسجلة لهذا العميل.
                    </div>
                  ) : (
                    <table className="w-full text-right text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3 min-w-[130px]">التاريخ والوقت</th>
                          <th className="py-2.5 px-3 min-w-[170px]">رقم الخط / المحفظة</th>
                          <th className="py-2.5 px-3 min-w-[130px] text-blue-700 dark:text-blue-300">مبلغ الشحن (+)</th>
                          <th className="py-2.5 px-3 min-w-[110px]">حالة الدورة</th>
                          <th className="py-2.5 px-3 min-w-[180px]">البيان / الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedStatementList.map((tx, idx) => {
                          const rowNum = (safeStatementModalPage - 1) * ITEMS_PER_PAGE + idx + 1;
                          return (
                            <tr key={tx.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{rowNum}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white">{formatDateArabic(tx.date)}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-blue-500" />
                                  <span>{tx.time || formatTimeArabic(tx.date)}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5" dir="ltr">
                                  <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span>{tx.walletPhone ? formatPhone(tx.walletPhone) : 'خط العميل'}</span>
                                </div>
                                {tx.walletLabel && (
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{tx.walletLabel}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-blue-700 dark:text-blue-300 text-sm" dir="ltr">
                                +{formatCurrency(tx.amount)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  tx.isSettled
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                                }`}>
                                  {tx.isSettled ? 'تمت تسويته' : 'دورة نشطة'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={tx.notes}>
                                {tx.notes || 'شحن رصيد للخط'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 3: Payments Log ONLY */}
              {statementModalTab === 'payments' && (
                <div>
                  {(!activeStatementList || activeStatementList.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      لم يتم تسجيل أي مدفوعات نقدية لهذا العميل حتى الآن.
                    </div>
                  ) : (
                    <table className="w-full text-right text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3 min-w-[130px]">التاريخ والوقت</th>
                          <th className="py-2.5 px-3 min-w-[130px]">طريقة الدفع</th>
                          <th className="py-2.5 px-3 min-w-[130px] text-emerald-700 dark:text-emerald-300">المبلغ المسدد (-)</th>
                          <th className="py-2.5 px-3 min-w-[150px]">نوع السداد / البيان</th>
                          <th className="py-2.5 px-3 min-w-[180px]">الملاحظات</th>
                          <th className="py-2.5 px-3 w-12 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedStatementList.map((p, idx) => {
                          const rowNum = (safeStatementModalPage - 1) * ITEMS_PER_PAGE + idx + 1;
                          return (
                            <tr key={p.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{rowNum}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white">{formatDateArabic(p.date)}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-500" />
                                  <span>{p.time || formatTimeArabic(p.date)}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                                {p.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : p.paymentMethod === 'instapay' ? 'إنستاباي' : p.paymentMethod === 'bank' ? 'تحويل بنكي' : 'نقدي (كاش)'}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm" dir="ltr">
                                -{formatCurrency(p.amount)}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  p.isCreditorPayout
                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                }`}>
                                  {p.isCreditorPayout ? 'صرف لمستحق دائن' : 'سداد دفعة من الحساب'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={p.notes}>
                                {p.notes || (p.isCreditorPayout ? 'صرف وسداد مستحقات للعميل الدائن' : 'سداد دفعة من الحساب')}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(p)}
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
                  )}
                </div>
              )}

            </div>

            {/* Pagination Controls inside Sheet */}
            <div className="shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              {renderPagination(
                safeStatementModalPage,
                totalStatementModalPages,
                activeStatementList.length,
                setStatementModalPage,
                statementModalTab === 'recharges' ? 'شحنة' : statementModalTab === 'payments' ? 'سداد' : 'خطوة'
              )}
            </div>

            {/* Fixed Sheet Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppChat(selectedClientForStatement)}
                  className="btn-interactive flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm"
                  title="فتح محادثة واتساب العميل وإرسال كشف الحساب مباشرة"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>إرسال المطالبة عبر واتساب مباشرة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyWhatsAppMessage(selectedClientForStatement)}
                  className="btn-interactive flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
                  title="نسخ نص المطالبة"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ النص</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedClientForStatement.remainingDebt > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetClient = selectedClientForStatement;
                      handleCloseStatementSheet();
                      setTimeout(() => handleOpenPayment(targetClient), 240);
                    }}
                    className="btn-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>تسجيل سداد</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseStatementSheet}
                  className="btn-interactive px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>,
      document.body
    )}

      {/* 6. Right Sheet Drawer: Detailed Archive Statement for a Client */}
      {activeSelectedArchiveGroup && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden" dir="rtl">
          {/* Backdrop Overlay */}
          <div 
            className={`fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity ${
              closingArchiveSheet ? 'animate-right-sheet-backdrop-out' : 'animate-right-sheet-backdrop'
            }`}
            onClick={handleCloseArchiveSheet}
          />

          <div className={`fixed inset-y-0 right-0 z-10 h-full w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden sm:rounded-l-3xl ${
            closingArchiveSheet ? 'animate-right-sheet-out' : 'animate-right-sheet'
          }`}>
              {/* Mobile Drag Handle Indicator */}
              <div className="sm:hidden w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />
              
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold shadow-xs">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        أرشيف وتسلسل عمليات: {activeSelectedArchiveGroup.clientName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-mono">
                        {activeSelectedArchiveGroup.records.length} عملية مسجلة
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      خطوات الحساب مسجلة بالترتيب الزمني خطوة بخطوة بالوقت والتاريخ بالدقيقة
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Sort Order Toggle Button: خطوات متسلسلة من الأقدم للأحدث أو الأحدث أولاً */}
                  <button
                    type="button"
                    onClick={() => setArchiveDetailSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs"
                    title="التبديل بين تسلسل الخطوات من البداية حتى الآن أو عرض الأحدث أولاً"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>
                      {archiveDetailSortOrder === 'asc' ? 'الترتيب: خطوات متسلسلة (الأقدم للأحدث)' : 'الترتيب: الأحدث أولاً'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseArchiveSheet}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="إغلاق اللوحة الجانبية"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Sheet Body with Responsive Max-Height */}
              <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                {/* Stats Summary: 3 Clean KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 block mb-0.5">إجمالي مبالغ الشحن</span>
                  <strong className="font-mono text-lg font-black text-blue-700 dark:text-blue-300" dir="ltr">
                    +{formatCurrency(activeSelectedArchiveGroup.totalRecharged)}
                  </strong>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {archiveGroupRecharges.length} شحنة
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">إجمالي المبالغ المسددة</span>
                  <strong className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                    -{formatCurrency(activeSelectedArchiveGroup.totalPaid)}
                  </strong>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  {archiveGroupPayments.length} سداد
                </span>
              </div>

              {(() => {
                const latest = activeSelectedArchiveGroup.latestRecord || {};
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

            {/* Sub-tab Navigation: 3 Distinct Mutually-Exclusive Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setArchiveModalTab('steps');
                  setArchiveDetailPage(1);
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
                  {activeSelectedArchiveGroup.records.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setArchiveModalTab('recharges');
                  setArchiveDetailPage(1);
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
                  {archiveGroupRecharges.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setArchiveModalTab('payments');
                  setArchiveDetailPage(1);
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
                  {archiveGroupPayments.length}
                </span>
              </button>
            </div>

            {/* Modal Body: Active Tab Content ONLY (Zero Duplication!) */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl min-h-[220px] max-h-[50vh]">
              
              {/* TAB 1: Sequential Steps */}
              {archiveModalTab === 'steps' && (
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
                    {paginatedArchiveModalList.map((arch, idx) => {
                      const isRecharge = arch.operationCategory === 'recharge' || arch.cycleType?.includes('شحن');
                      const isPayout = arch.operationCategory === 'payout' || arch.cycleType?.includes('صرف مستحقات');
                      const rechargeAmt = Number(arch.rechargeAmount) || (isRecharge ? (Number(arch.amountPaid) || Number(arch.amount) || 0) : 0);
                      const paidAmt = !isRecharge ? (Number(arch.amountPaid) || Number(arch.amount) || 0) : 0;
                      const isNormal = arch.resultingType === 'عادي' || arch.balanceAfter === 0;
                      const isCreditor = arch.balanceAfter < 0;
                      const isDebtor = arch.balanceAfter > 0;

                      return (
                        <tr key={arch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-mono font-black bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              #{arch.stepNumber || (idx + 1)}
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
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                <ArrowDownToLine className="w-3 h-3 shrink-0" />
                                <span>شحن رصيد للخط</span>
                              </span>
                            ) : arch.cycleType?.includes('فائض') ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>{arch.cycleType}</span>
                              </span>
                            ) : isPayout ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                                <TrendingDown className="w-3 h-3 shrink-0" />
                                <span>صرف مستحقات دائن</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>{arch.cycleType || 'سداد دفعة من الحساب'}</span>
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            {isRecharge ? (
                              <div>
                                <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1" dir="ltr">
                                  <Smartphone className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span>{arch.walletPhone ? formatPhone(arch.walletPhone) : 'خط العميل'}</span>
                                </div>
                                {arch.walletLabel && (
                                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[140px]">
                                    {arch.walletLabel}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {arch.paymentMethod === 'vodafone_cash'
                                    ? 'فودافون كاش'
                                    : arch.paymentMethod === 'instapay'
                                    ? 'إنستاباي'
                                    : arch.paymentMethod === 'bank'
                                    ? 'تحويل بنكي'
                                    : 'نقدي (كاش)'}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono font-bold">
                            {rechargeAmt > 0 ? (
                              <div className="font-black text-blue-700 dark:text-blue-300 text-xs sm:text-sm" dir="ltr">
                                +{formatCurrency(rechargeAmt)}
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono font-bold">
                            {paidAmt > 0 ? (
                              <div className="font-black text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm" dir="ltr">
                                -{formatCurrency(paidAmt)}
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono font-bold bg-slate-50/50 dark:bg-slate-800/30">
                            {isNormal ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <Check className="w-3 h-3" />
                                <span>خالص (0 ج.م)</span>
                              </span>
                            ) : isDebtor ? (
                              <div>
                                <div className="font-mono text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300" dir="ltr">
                                  {formatCurrency(arch.balanceAfter)}
                                </div>
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-0.5">
                                  متبقي مطلوب (مدين)
                                </span>
                              </div>
                            ) : (
                              <div>
                                <div className="font-mono text-xs sm:text-sm font-black text-teal-700 dark:text-teal-300" dir="ltr">
                                  +{formatCurrency(Math.abs(arch.balanceAfter))}
                                </div>
                                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block mt-0.5">
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
              )}

              {/* TAB 2: Recharges ONLY */}
              {archiveModalTab === 'recharges' && (
                <div>
                  {archiveGroupRecharges.length === 0 ? (
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
                          <th className="py-2.5 px-3 min-w-[180px]">البيان / الملاحظات</th>
                          <th className="py-2.5 px-3 w-12 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedArchiveModalList.map((rec, idx) => {
                          const rowNum = (safeArchiveModalPage - 1) * ITEMS_PER_PAGE + idx + 1;
                          const amt = Number(rec.rechargeAmount) || Number(rec.amountPaid) || Number(rec.amount) || 0;
                          return (
                            <tr key={rec.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{rowNum}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 dark:text-white">{formatDateArabic(rec.date)}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-blue-500" />
                                  <span>{formatTimeArabic(rec.time || rec.date)}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1" dir="ltr">
                                  <Smartphone className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span>{rec.walletPhone ? formatPhone(rec.walletPhone) : 'خط العميل'}</span>
                                </div>
                                {rec.walletLabel && (
                                  <span className="text-[10px] text-slate-400 block mt-0.5">{rec.walletLabel}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-black text-blue-700 dark:text-blue-300 text-sm" dir="ltr">
                                +{formatCurrency(amt)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs truncate" title={rec.notes}>
                                {rec.notes || 'شحن رصيد للخط'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteArchive(rec)}
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
                  )}
                </div>
              )}

              {/* TAB 3: Payments ONLY */}
              {archiveModalTab === 'payments' && (
                <div>
                  {archiveGroupPayments.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      لا توجد عمليات سداد مسجلة لهذا العميل في الأرشيف.
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
                        {paginatedArchiveModalList.map((p, idx) => {
                          const rowNum = (safeArchiveModalPage - 1) * ITEMS_PER_PAGE + idx + 1;
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
                  )}
                </div>
              )}

            </div>

            {/* Pagination inside Archive Sheet if > 10 records */}
            <div className="shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              {renderPagination(
                safeArchiveModalPage,
                totalArchiveModalPages,
                activeArchiveModalList.length,
                setArchiveDetailPage,
                archiveModalTab === 'recharges' ? 'شحنة' : archiveModalTab === 'payments' ? 'سداد' : 'خطوة'
              )}
            </div>

            {/* Fixed Sheet Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={handleCloseArchiveSheet}
                className="btn-interactive px-6 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      </div>,
      document.body
    )}

    </div>
  );
}
