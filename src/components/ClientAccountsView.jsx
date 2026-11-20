import React, { useState, useMemo } from 'react';
import { useCash } from '../context/CashContext';
import {
  formatCurrency,
  formatNumber,
  formatPhone,
  formatTimeArabic,
  formatDateArabic,
  getEgyptianCarrier,
  calculateWalletStats
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
  CheckCircle2
} from 'lucide-react';

export default function ClientAccountsView() {
  const {
    clients,
    transactions,
    updateClient,
    deleteTransaction,
    setActiveModal,
    setModalData,
    showToast,
    askConfirm
  } = useCash();

  // Selected time range for recharges: 'today' | 'month' | 'all'
  const [timeRange, setTimeRange] = useState('today');
  // Selected account type tab: 'مدين' (default) | 'دائن'
  const [accountTypeTab, setAccountTypeTab] = useState('مدين');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);
  const [selectedClientForStatement, setSelectedClientForStatement] = useState(null);
  const [copiedClientId, setCopiedClientId] = useState(null);

  const todayKey = new Date().toISOString().split('T')[0];
  const currentMonthKey = todayKey.slice(0, 7);

  // Compute live accounting metrics for every client
  const clientAccountsData = useMemo(() => {
    return clients.map(client => {
      const wallets = client.wallets || [];
      const walletIds = new Set(wallets.map(w => w.id));

      // 1. Wallets breakdown
      const walletsBreakdown = wallets.map(wallet => {
        const stats = calculateWalletStats(wallet, transactions);
        const carrier = getEgyptianCarrier(wallet.phoneNumber);

        // Get transactions for this specific wallet in selected period
        const walletRechargeTx = transactions.filter(t => 
          t.walletId === wallet.id && (t.type === 'recharge' || t.type === 'limit_reset')
        );

        const walletTodayRecharge = stats.todayRecharges || 0;
        const walletMonthRecharge = stats.totalRecharges || 0;
        const walletAllRecharge = walletRechargeTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const walletActiveAmount = timeRange === 'today'
          ? walletTodayRecharge
          : timeRange === 'month'
          ? walletMonthRecharge
          : walletAllRecharge;

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

      // 2. Client-level sums
      const clientTodayRecharges = walletsBreakdown.reduce((sum, w) => sum + w.todayRecharges, 0);
      const clientMonthRecharges = walletsBreakdown.reduce((sum, w) => sum + w.monthRecharges, 0);
      const clientAllRecharges = walletsBreakdown.reduce((sum, w) => sum + w.allRecharges, 0);

      const baseAmount = timeRange === 'today'
        ? clientTodayRecharges
        : timeRange === 'month'
        ? clientMonthRecharges
        : clientAllRecharges;

      // 3. Commission settings (persisted per client or fallback to localStorage)
      let clientType = client.clientType;
      if (!clientType) {
        try {
          clientType = localStorage.getItem(`elaasar_client_type_${client.id}`) || 'مدين';
        } catch {
          clientType = 'مدين';
        }
      }

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

      // Calculation: finalAmount = baseAmount * factor (ex: 5000 * 0.995 = 4975)
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

      // 4. Client Payments (سداد الدفعات النقدية والتحصيلات وصرف المستحقات)
      const clientPayments = transactions.filter(t => 
        (t.clientId === client.id || t.customerId === client.id) && t.type === 'client_payment'
      );

      const clientTodayPayments = clientPayments
        .filter(t => (t.dateOnly || t.date || '').startsWith(todayKey))
        .reduce((sum, t) => sum + (t.isCreditorPayout ? -Number(t.amount) : Number(t.amount)), 0);

      const clientMonthPayments = clientPayments
        .filter(t => (t.dateOnly || t.date || '').slice(0, 7) === currentMonthKey)
        .reduce((sum, t) => sum + (t.isCreditorPayout ? -Number(t.amount) : Number(t.amount)), 0);

      const clientAllPayments = clientPayments
        .reduce((sum, t) => sum + (t.isCreditorPayout ? -Number(t.amount) : Number(t.amount)), 0);

      const paidAmount = timeRange === 'today'
        ? clientTodayPayments
        : timeRange === 'month'
        ? clientMonthPayments
        : clientAllPayments;

      // Relevant recharge transactions for statement modal
      const clientTxList = transactions.filter(t => {
        if (!walletIds.has(t.walletId)) return false;
        if (t.type !== 'recharge' && t.type !== 'limit_reset') return false;
        if (timeRange === 'today') {
          return (t.dateOnly || t.date || '').startsWith(todayKey);
        }
        if (timeRange === 'month') {
          return (t.dateOnly || t.date || '').slice(0, 7) === currentMonthKey;
        }
        return true;
      });

      // Check if client converted from دائن to مدين with excess debt (المبلغ الزائد من صاحب المحل)
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

      // Fallback detection from transactions if converted to مدين from creditor payout
      if ((clientExcessDebt === undefined || clientExcessDebt === null) && clientType === 'مدين') {
        const recentPayoutTx = clientPayments
          .filter(t => t.isCreditorPayout)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        if (recentPayoutTx) {
          if (recentPayoutTx.excessDebt) {
            clientExcessDebt = Number(recentPayoutTx.excessDebt);
            clientExcessDate = recentPayoutTx.date;
          } else if (recentPayoutTx.creditBefore) {
            const pAmt = Number(recentPayoutTx.amount) || 0;
            const cBefore = Number(recentPayoutTx.creditBefore) || 0;
            if (pAmt > cBefore) {
              clientExcessDebt = pAmt - cBefore;
              clientExcessDate = recentPayoutTx.date;
            }
          }
        }
      }

      const hasExcessDebt = clientType === 'مدين' && typeof clientExcessDebt === 'number' && clientExcessDebt > 0;

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
        const cutoffTime = clientExcessDate ? new Date(clientExcessDate).getTime() : 0;
        const postPayments = clientPayments
          .filter(t => !t.isCreditorPayout && new Date(t.date).getTime() > cutoffTime)
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        const postRecharges = clientTxList
          .filter(t => new Date(t.date).getTime() > cutoffTime)
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        // العميل المحول من دائن إلى مدين: المبلغ لا يطبق عليه أي خصم أو عمولة
        const initialDebt = clientExcessDebt + postRecharges;
        const currentExcessDebt = Math.max(0, initialDebt - postPayments);
        remainingDebt = currentExcessDebt;
        creditAmount = 0;
        isSettled = currentExcessDebt === 0;
        effectiveClientType = 'مدين';
        activeFinalAmount = initialDebt; // المبلغ الأساسي قبل السداد بدون عمولة أو خصم
        isExcessDebtOnly = true;
        effectiveBaseAmount = initialDebt;
        effectiveCommissionAmount = 0; // ZERO COMMISSION
        effectiveFactorStr = '1'; // NO MULTIPLIER
        effectiveModeResult = 'none'; // NO DISCOUNT / COMMISSION
        effectivePaidAmount = postPayments;
      } else {
        const grossRequired = finalAmount;
        const netBalance = grossRequired - paidAmount;
        remainingDebt = netBalance > 0 ? netBalance : 0;
        creditAmount = netBalance < 0 ? Math.abs(netBalance) : (clientType === 'دائن' ? finalAmount : 0);
        isSettled = netBalance === 0 && (grossRequired > 0 || paidAmount !== 0);
        effectiveClientType = creditAmount > 0 ? 'دائن' : (remainingDebt > 0 ? 'مدين' : (clientType || 'مدين'));
        activeFinalAmount = finalAmount;
      }

      return {
        client,
        clientType,
        effectiveClientType,
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
        excessDebt: clientExcessDebt,
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

  const debtorTotalFinal = useMemo(() => {
    return debtorClients.reduce((sum, i) => sum + (i.remainingDebt || i.finalAmount), 0);
  }, [debtorClients]);

  const creditorTotalFinal = useMemo(() => {
    return creditorClients.reduce((sum, i) => sum + (i.creditAmount > 0 ? i.creditAmount : i.finalAmount), 0);
  }, [creditorClients]);

  // Filter clients based on accountTypeTab ('مدين' | 'دائن'), search query & active debt filter
  const filteredAccounts = useMemo(() => {
    return clientAccountsData.filter(item => {
      // 1. Account type tab: 'مدين' or 'دائن'
      if ((item.effectiveClientType || item.clientType) !== accountTypeTab) {
        return false;
      }

      // 2. Filter active only (> 0)
      if (filterActiveOnly && (item.baseAmount <= 0 && item.paidAmount <= 0)) {
        return false;
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

  // Quick action: Switch Client Type between 'مدين' and 'دائن' immediately
  const handleSetClientType = (client, type) => {
    updateClient(client.id, { clientType: type, excessDebt: null, excessDebtDate: null });
    try {
      localStorage.setItem(`elaasar_client_type_${client.id}`, type);
      localStorage.removeItem(`elaasar_client_excess_debt_${client.id}`);
      localStorage.removeItem(`elaasar_client_excess_debt_date_${client.id}`);
    } catch (e) {
      console.error(e);
    }
    showToast(`تم نقل العميل (${client.name}) إلى كشف ${type === 'مدين' ? 'المدينين' : 'الدائنين'}`);
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
        
        {/* Card 1: Total Receivables (المبلغ الآجل بعد العمولة) */}
        <div className={`card-hover text-white p-5 rounded-2xl shadow-lg relative overflow-hidden transition-all ${
          accountTypeTab === 'مدين'
            ? 'bg-gradient-to-br from-rose-600 to-rose-700 shadow-rose-600/20'
            : 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-600/20'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/90 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>{accountTypeTab === 'مدين' ? 'إجمالي الآجل المستحق (المدينين)' : 'إجمالي الأرصدة الدائنة (الدائنين)'}</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-white">
              {accountTypeTab === 'مدين' ? 'المطلوب تحصيله' : 'مستحق للدائنين'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
            {formatCurrency(summaryTotals.totalFinal)}
          </div>
          <span className="text-[11px] text-white/80 mt-2 block">
            {accountTypeTab === 'مدين'
              ? 'صافي المبالغ الآجلة المطلوبة من كافة عملاء كشف المدينين'
              : 'صافي الأرصدة الدائنة المستحقة لكافة عملاء كشف الدائنين'}
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

      </div>

      {/* 3. Toolbar: Period Switcher, Search, Filter */}
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

      {/* 2 Tabs above the table: داين ومدين */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 dark:bg-slate-800/90 rounded-2xl w-fit border border-slate-300/70 dark:border-slate-700 shadow-xs">
          {/* Tab 1: مدين */}
          <button
            type="button"
            onClick={() => setAccountTypeTab('مدين')}
            className={`btn-interactive flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              accountTypeTab === 'مدين'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>حسابات المدينين (مدين)</span>
            <span className={`px-2.5 py-0.5 text-xs rounded-full font-mono font-bold ${
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
            className={`btn-interactive flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              accountTypeTab === 'دائن'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>حسابات الدائنين (دائن)</span>
            <span className={`px-2.5 py-0.5 text-xs rounded-full font-mono font-bold ${
              accountTypeTab === 'دائن'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
            }`}>
              {creditorClients.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
          {accountTypeTab === 'مدين' ? (
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              إجمالي مستحقات كشف المدينين: <strong className="font-mono text-base font-black mr-1">{formatCurrency(debtorTotalFinal)}</strong>
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              إجمالي أرصدة كشف الدائنين: <strong className="font-mono text-base font-black mr-1">{formatCurrency(creditorTotalFinal)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* 4. The Main Accounts Table (جدول حسابات العملاء المباشر) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {accountTypeTab === 'مدين' ? 'جدول المبالغ الآجلة على العملاء (المدينين)' : 'جدول الأرصدة المستحقة للعملاء (الدائنين)'}
            </h3>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
              accountTypeTab === 'مدين'
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
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
                      : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
                  }`}>
                    {accountTypeTab === 'مدين' ? 'المتبقي المطلوب (بعد السداد)' : 'الرصيد الدائن المتبقي (بعد الصرف)'}
                  </th>
                  <th className="py-3.5 px-4 w-32 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAccounts.map((item, index) => {
                  const { client, wallets, baseAmount, commissionMode, commissionPercent, commissionAmount, finalAmount } = item;

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Row index */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-400">
                        {index + 1}
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

                              {/* 2 Buttons to change classification: مدين / دائن */}
                              <div className="flex items-center gap-0.5 bg-slate-200/90 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => handleSetClientType(client, 'مدين')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                                    (item.effectiveClientType || item.clientType) === 'مدين'
                                      ? 'bg-rose-600 text-white shadow-2xs'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                  }`}
                                  title="تحديد كـ مدين"
                                >
                                  مدين
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetClientType(client, 'دائن')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                                    (item.effectiveClientType || item.clientType) === 'دائن'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                  }`}
                                  title="تحديد كـ دائن"
                                >
                                  دائن
                                </button>
                              </div>
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
                        {formatCurrency(item.hasExcessDebt ? item.excessDebt : baseAmount)}
                      </td>

                      {/* Commission Settings (معامل ونوع العمولة) */}
                      <td className="py-3.5 px-4">
                        {item.hasExcessDebt ? (
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
                          {formatCurrency(item.finalAmount)}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-0.5">
                          {item.hasExcessDebt 
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
          </div>
        )}

      </div>

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
                              <span>{p.time || formatTimeArabic(p.date)}</span>
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

    </div>
  );
}
