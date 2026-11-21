import React, { useState, useMemo, useEffect } from 'react';
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
  getCurrentMonthKey
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
  Archive,
  History,
  Receipt
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
    deleteClientArchive,
    archiveClientCycle
  } = useCash();

  // Selected time range for recharges: 'today' | 'month' | 'all'
  const [timeRange, setTimeRange] = useState('today');
  // Selected account type tab: 'مدين' (default) | 'دائن' | 'عادي' | 'أرشيف'
  const [accountTypeTab, setAccountTypeTab] = useState('مدين');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [selectedClientForStatement, setSelectedClientForStatement] = useState(null);
  const [copiedClientId, setCopiedClientId] = useState(null);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveFilterType, setArchiveFilterType] = useState('all');
  const [selectedArchiveClient, setSelectedArchiveClient] = useState(null);
  const [archivePage, setArchivePage] = useState(1);
  const [accountsPage, setAccountsPage] = useState(1);
  const [archiveDetailPage, setArchiveDetailPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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

      const hasExcessDebt = clientType === 'مدين' && typeof clientExcessDebt === 'number' && clientExcessDebt > 0;
      const hasExcessCredit = clientType === 'دائن' && typeof clientExcessCredit === 'number' && clientExcessCredit > 0;

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
          activeFinalAmount = clientExcessCredit;
          effectiveBaseAmount = clientExcessCredit;
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
    const list = [...(clientArchives || [])];
    const archivedTxIds = new Set(list.map(a => a.transactionId || a.id).filter(Boolean));

    const clientMap = new Map((clients || []).map(c => [c.id, c]));
    const walletToClientMap = new Map();
    (clients || []).forEach(c => {
      (c.wallets || []).forEach(w => {
        walletToClientMap.set(w.id, { client: c, wallet: w });
      });
    });

    for (const t of (transactions || [])) {
      if (archivedTxIds.has(t.id)) continue;
      const mapping = walletToClientMap.get(t.walletId);
      const client = clientMap.get(t.customerId || t.clientId) || mapping?.client;
      if (!client) continue;

      const wallet = mapping?.wallet;

      if (t.type === 'recharge' || t.type === 'limit_reset') {
        list.push({
          id: t.id,
          transactionId: t.id,
          clientId: client.id,
          clientName: client.name,
          cycleType: 'شحن رصيد للخط',
          operationCategory: 'recharge',
          rechargeAmount: Number(t.amount) || 0,
          amountPaid: 0,
          debtBefore: 0,
          excessAmount: 0,
          finalBalance: Number(t.amount) || 0,
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
          id: t.id,
          transactionId: t.id,
          clientId: client.id,
          clientName: client.name,
          cycleType: t.isCreditorPayout ? 'صرف مستحقات دائن' : 'سداد دفعة من الحساب',
          operationCategory: t.isCreditorPayout ? 'payout' : 'payment',
          rechargeAmount: 0,
          amountPaid: Number(t.amount) || 0,
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
          time: formatTimeArabic(t.time || t.date)
        });
      }
    }

    return list;
  }, [clientArchives, transactions, clients]);

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

    // Sort records inside each group by date descending
    for (const group of map.values()) {
      group.records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  // Detail Modal Pagination
  const selectedClientRecords = activeSelectedArchiveGroup?.records || [];
  const totalDetailPages = Math.ceil(selectedClientRecords.length / ITEMS_PER_PAGE) || 1;
  const safeDetailPage = Math.min(Math.max(1, archiveDetailPage), totalDetailPages);
  const paginatedDetailRecords = useMemo(() => {
    const start = (safeDetailPage - 1) * ITEMS_PER_PAGE;
    return selectedClientRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [selectedClientRecords, safeDetailPage]);

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
      details: 'سيتم مسح كافة عمليات الشحن والسداد نهائياً من الأرشيف.',
      type: 'warning',
      confirmText: 'نعم، احذف كافة السجلات',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      group.records.forEach(r => {
        if (r.transactionId) {
          deleteTransaction(r.transactionId);
        }
        deleteClientArchive(r.id);
      });
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
      message: `هل أنت متأكد من رغبتك في حذف سجل ${isRecharge ? 'شحن رصيد' : 'تسوية'} العميل "${arch.clientName}"؟`,
      details: 'سيتم مسح هذا السجل نهائياً من أرشيف الحسابات.',
      type: 'warning',
      confirmText: 'نعم، احذف السجل',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      if (arch.transactionId) {
        deleteTransaction(arch.transactionId);
      }
      deleteClientArchive(arch.id);
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

  // Quick action: Copy WhatsApp Statement message
  const handleCopyWhatsAppMessage = (item) => {
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

    const text = `السلام عليكم ورحمة الله،
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
          {accountTypeTab === 'مدين' ? (
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              إجمالي مستحقات كشف المدينين: <strong className="font-mono text-base font-black mr-1">{formatCurrency(debtorTotalFinal)}</strong>
            </span>
          ) : accountTypeTab === 'دائن' ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              إجمالي أرصدة كشف الدائنين: <strong className="font-mono text-base font-black mr-1">{formatCurrency(creditorTotalFinal)}</strong>
            </span>
          ) : accountTypeTab === 'عادي' ? (
            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              عملاء خالصين (مسدد): <strong className="font-mono text-base font-black mr-1">{normalClients.length} عميل</strong>
            </span>
          ) : (
            <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
              إجمالي عمليات الأرشيف: <strong className="font-mono text-base font-black mr-1">{allUnifiedArchives?.length || 0} عملية</strong>
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

                          {/* Copy WhatsApp Statement */}
                          <button
                            onClick={() => handleCopyWhatsAppMessage(item)}
                            className="btn-interactive p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400"
                            title="نسخ ملخص الحساب لإرساله عبر واتساب"
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

      {/* 5. MODAL: Detailed Account Statement for Single Client (كشف حساب تفصيلي) */}
      {selectedClientForStatement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    كشف حساب العميل: {selectedClientForStatement.client.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    تفاصيل شحنات الرصيد الآجلة وحساب العمولات
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedClientForStatement(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center shrink-0">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 block mb-0.5">قبل العمولة</span>
                <strong className="font-mono text-base text-blue-600 dark:text-blue-400">
                  {formatCurrency(selectedClientForStatement.baseAmount)}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 block mb-0.5">
                  المطلوب بعد العمولة
                </span>
                <strong className="font-mono text-base text-slate-900 dark:text-white">
                  {formatCurrency(selectedClientForStatement.finalAmount)}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block mb-0.5">إجمالي المسدد</span>
                <strong className="font-mono text-base text-emerald-600 dark:text-emerald-400 font-black">
                  {formatCurrency(selectedClientForStatement.paidAmount)}
                </strong>
              </div>

              <div className={`p-3 rounded-xl border ${
                selectedClientForStatement.creditAmount > 0
                  ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-300 text-teal-800 dark:text-teal-200'
                  : selectedClientForStatement.remainingDebt > 0
                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 text-rose-800 dark:text-rose-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-800 dark:text-emerald-200'
              }`}>
                <span className="text-[11px] block mb-0.5 font-bold">
                  {selectedClientForStatement.creditAmount > 0
                    ? 'له رصيد دائن'
                    : selectedClientForStatement.remainingDebt > 0
                    ? 'الصافي المتبقي مطلوب'
                    : 'الحساب'}
                </span>
                <strong className="font-mono text-base font-black">
                  {selectedClientForStatement.creditAmount > 0
                    ? formatCurrency(selectedClientForStatement.creditAmount)
                    : selectedClientForStatement.remainingDebt > 0
                    ? formatCurrency(selectedClientForStatement.remainingDebt)
                    : 'خالص (0 ج.م)'}
                </strong>
              </div>
            </div>

            {/* Quick Action: Register Payment from modal */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/90 dark:border-emerald-800/80 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 dark:text-white block">
                    تسجيل سداد دفعة لهذا العميل
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    تسجيل المبلغ مع التاريخ والوقت بالدقيقة والتحويل التلقائي لدائن في حال الزيادة
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const targetClient = selectedClientForStatement;
                  setSelectedClientForStatement(null);
                  handleOpenPayment(targetClient);
                }}
                className="btn-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>تسجيل سداد</span>
              </button>
            </div>

            {/* Scrollable Container with Payments Log & Recharges Log */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-4 max-h-72">
              
              {/* Section 1: Payments Log (سجل السداد والتحصيلات) */}
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-black">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>سجل المدفوعات والتحصيلات ({selectedClientForStatement.payments?.length || 0} حركة):</span>
                  </span>
                  <span className="text-[11px] text-emerald-600 font-mono font-black">
                    إجمالي المسدد: {formatCurrency(selectedClientForStatement.paidAmount)}
                  </span>
                </div>

                {(!selectedClientForStatement.payments || selectedClientForStatement.payments.length === 0) ? (
                  <div className="p-3 text-center text-xs text-slate-400 border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                    لم يتم تسجيل أي مدفوعات نقدية لهذا العميل حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedClientForStatement.payments.map((p) => (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          p.isCreditorPayout
                            ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60'
                            : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-black font-mono text-sm ${
                              p.isCreditorPayout ? 'text-blue-700 dark:text-blue-400' : 'text-emerald-700 dark:text-emerald-400'
                            }`} dir="ltr">
                              {p.isCreditorPayout ? '+ ' : '- '}{formatCurrency(p.amount)}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              p.isCreditorPayout
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-750'
                                : 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                            }`}>
                              {p.isCreditorPayout ? 'صرف لمستحق دائن' : 'سداد من العميل'} ({p.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : p.paymentMethod === 'instapay' ? 'إنستاباي' : p.paymentMethod === 'bank' ? 'تحويل بنكي' : 'نقدي'})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {p.notes || (p.isCreditorPayout ? 'صرف وسداد مستحقات للعميل الدائن' : 'سداد دفعة من الحساب')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-left">
                          <div className="text-[11px] text-slate-500">
                            <div>{formatDateArabic(p.date)}</div>
                            <div className="text-[10px] text-emerald-600 font-mono font-bold flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimeArabic(p.time || p.date)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="حذف حركة السداد"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Recharges Log (سجل الشحنات المدخلة للخطوط) */}
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-black">
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>سجل شحنات الخطوط ({selectedClientForStatement.transactions.length} حركة):</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    فترة: {timeRange === 'today' ? 'اليوم' : timeRange === 'month' ? 'هذا الشهر' : 'الكل'}
                  </span>
                </div>

                {selectedClientForStatement.transactions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 border border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                    لا توجد عمليات شحن مسجلة لهذا العميل في الفترة المحددة.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedClientForStatement.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-black text-blue-600 dark:text-blue-400 font-mono text-sm" dir="ltr">
                            + {formatCurrency(tx.amount)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span dir="ltr" className="font-mono font-bold">{formatPhone(tx.walletPhone)}</span>
                            <span>•</span>
                            <span>{tx.notes || 'شحن رصيد'}</span>
                          </div>
                        </div>

                        <div className="text-left text-[11px] text-slate-400">
                          <div>{formatDateArabic(tx.date)}</div>
                          <div className="text-[10px]">{formatTimeArabic(tx.date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: Client's Historical Settlements Archive */}
              {(() => {
                const clientArchs = (clientArchives || []).filter(a => a.clientId === selectedClientForStatement.client.id);
                if (clientArchs.length === 0) return null;
                return (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-black">
                        <Archive className="w-3.5 h-3.5" />
                        <span>أرشيف الدورات والتسويات السابقة المسواة ({clientArchs.length} تسوية):</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {clientArchs.map((arch) => (
                        <div
                          key={arch.id}
                          className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-purple-700 dark:text-purple-300 font-mono text-sm" dir="ltr">
                                {formatCurrency(arch.amountPaid)}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-800 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700">
                                {arch.cycleType}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {arch.notes || 'تسوية حساب'}
                            </div>
                          </div>

                          <div className="text-left text-[11px] text-slate-400">
                            <div>{formatDateArabic(arch.date)}</div>
                            <div className="text-[10px] text-purple-600 font-mono font-bold flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3" />
                              <span>{arch.time || formatTimeArabic(arch.date)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleCopyWhatsAppMessage(selectedClientForStatement)}
                className="btn-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>نسخ ملخص المطالبة للواتساب</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedClientForStatement(null)}
                className="btn-interactive px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. MODAL: Detailed Archive Statement for a Client (كشف كافة تسويات العميل المؤرشفة بالتفصيل) */}
      {activeSelectedArchiveGroup && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      أرشيف عمليات وتسويات العميل: {activeSelectedArchiveGroup.clientName}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-mono">
                      {activeSelectedArchiveGroup.records.length} عملية مسجلة
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    كشف كامل بجميع دورات الحساب والتسويات والمبالغ السابقة بالوقت والتاريخ بالدقيقة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedArchiveClient(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Summary Cards for this Client */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center shrink-0">
              <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60">
                <span className="text-[11px] text-blue-700 dark:text-blue-300 block mb-0.5 font-bold">إجمالي مبالغ الشحن</span>
                <strong className="font-mono text-base font-black text-blue-700 dark:text-blue-300" dir="ltr">
                  {formatCurrency(activeSelectedArchiveGroup.totalRecharged)}
                </strong>
                <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70 block mt-0.5">
                  مجموع شحنات الخطوط
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block mb-0.5 font-bold">إجمالي المبالغ المسددة</span>
                <strong className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300" dir="ltr">
                  {formatCurrency(activeSelectedArchiveGroup.totalPaid)}
                </strong>
                <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 block mt-0.5">
                  مجموع المسدد والمصروف
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60">
                <span className="text-[11px] text-purple-700 dark:text-purple-300 block mb-0.5 font-bold">إجمالي الفائض المسجل</span>
                <strong className="font-mono text-base font-black text-purple-700 dark:text-purple-300" dir="ltr">
                  {formatCurrency(activeSelectedArchiveGroup.totalExcess)}
                </strong>
                <span className="text-[10px] text-purple-600/70 dark:text-purple-400/70 block mt-0.5">
                  فروق المبالغ الزائدة
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5 font-bold">إجمالي العمليات المسجلة</span>
                <strong className="font-mono text-base font-black text-slate-900 dark:text-white">
                  {activeSelectedArchiveGroup.records.length} عملية
                </strong>
                <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                  آخرها: {formatDateArabic(activeSelectedArchiveGroup.latestDate)}
                </span>
              </div>
            </div>

            {/* Table of operations with 10 items max per page */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-750">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[130px]">التاريخ والوقت</th>
                    <th className="py-2.5 px-3 min-w-[150px]">نوع العملية</th>
                    <th className="py-2.5 px-3 min-w-[170px]">البيان / الخط / طريقة الدفع</th>
                    <th className="py-2.5 px-3 min-w-[130px] text-blue-700 dark:text-blue-300">المبلغ المشحون (+)</th>
                    <th className="py-2.5 px-3 min-w-[140px] text-emerald-700 dark:text-emerald-300">المبلغ المسدد / المصروف (-)</th>
                    <th className="py-2.5 px-3 min-w-[90px]">الفائض</th>
                    <th className="py-2.5 px-3 min-w-[110px]">الحالة الناتجة</th>
                    <th className="py-2.5 px-3 min-w-[160px]">الملاحظات</th>
                    <th className="py-2.5 px-3 w-12 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedDetailRecords.map((arch, idx) => {
                    const isRecharge = arch.operationCategory === 'recharge' || arch.cycleType?.includes('شحن');
                    const isPayout = arch.operationCategory === 'payout' || arch.cycleType?.includes('صرف مستحقات');
                    const rechargeAmt = Number(arch.rechargeAmount) || (isRecharge ? (Number(arch.amountPaid) || Number(arch.amount) || 0) : 0);
                    const paidAmt = !isRecharge ? (Number(arch.amountPaid) || Number(arch.amount) || 0) : 0;
                    const isNormal = arch.resultingType === 'عادي';
                    const isCreditor = arch.resultingType === 'دائن';
                    const isDebtor = arch.resultingType === 'مدين';
                    const rowNum = (safeDetailPage - 1) * ITEMS_PER_PAGE + idx + 1;

                    return (
                      <tr key={arch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {rowNum}
                        </td>

                        {/* Date and 12-hour Arabic Time */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {formatDateArabic(arch.date)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-500" />
                            <span>{formatTimeArabic(arch.time || arch.date)}</span>
                          </div>
                        </td>

                        {/* Operation Type Badge */}
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

                        {/* Line / Method / Breakdown */}
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

                        {/* Recharged Amount (+) in Blue */}
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {rechargeAmt > 0 ? (
                            <div className="font-black text-blue-700 dark:text-blue-300 text-xs sm:text-sm" dir="ltr">
                              +{formatCurrency(rechargeAmt)}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                          )}
                        </td>

                        {/* Paid Amount (-) in Emerald */}
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {paidAmt > 0 ? (
                            <div className="font-black text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm" dir="ltr">
                              -{formatCurrency(paidAmt)}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                          )}
                        </td>

                        {/* Excess Amount */}
                        <td className="py-2.5 px-3 font-mono font-bold" dir="ltr">
                          {arch.excessAmount > 0 ? (
                            <span className="text-purple-600 dark:text-purple-400 font-black">
                              +{formatCurrency(arch.excessAmount)}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-normal">-</span>
                          )}
                        </td>

                        {/* Resulting Status */}
                        <td className="py-2.5 px-3">
                          {isNormal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <Check className="w-3 h-3" />
                              <span>خالص (0 ج.م)</span>
                            </span>
                          ) : isCreditor ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-teal-100 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800 font-mono" dir="ltr">
                              دائن ({formatCurrency(arch.finalBalance || 0)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-mono" dir="ltr">
                              مدين ({formatCurrency(arch.finalBalance || rechargeAmt || 0)})
                            </span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={arch.notes}>
                          {arch.notes || (isRecharge ? 'شحن رصيد للخط' : 'تسوية وتصفير دورة الحساب')}
                        </td>

                        {/* Delete Action */}
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
            </div>

            {/* Pagination inside Modal if > 10 records */}
            <div className="shrink-0">
              {renderPagination(safeDetailPage, totalDetailPages, selectedClientRecords.length, setArchiveDetailPage, 'عملية تسوية')}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
