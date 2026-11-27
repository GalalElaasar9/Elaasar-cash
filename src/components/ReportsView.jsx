import React, { useMemo, useState, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import { getPersistedNavValue, setPersistedNavValue } from '../utils/storage';
import {
  formatCurrency,
  formatNumber,
  formatPhone,
  getLocalDateString,
  getTodayString,
  calculateWalletStats
} from '../utils/formatters';
import {
  InteractiveDonutChart,
  InteractiveTrendChart,
  HorizontalBarChart,
  GroupedBarChart
} from './FinancialCharts';
import {
  BarChart3,
  TrendingUp,
  Users,
  Wallet,
  Award,
  Coins,
  ShoppingBag,
  Smartphone,
  Building2,
  Zap,
  Receipt,
  Package,
  Scale,
  ArrowDownToLine,
  Download,
  Layers,
  Activity
} from 'lucide-react';

const INBOUND_ARCHIVE_KEY = 'elaasar_cash_inbound_days_archive_v2';
const INBOUND_ITEMS_KEY = 'elaasar_cash_inbound_items_v2';
const INBOUND_CONFIG_KEY = 'elaasar_cash_inbound_config_v2';
const INBOUND_SHIFT_KEY = 'elaasar_cash_inbound_shift_session_v2';

export default function ReportsView() {
  const {
    clients = [],
    transactions = [],
    inventory = [],
    shopWallets = [],
    instapayAccounts = [],
    purchases = [],
    treasury = {},
    totalLiquidCash = 0,
    clientsTotalReceivables = 0,
    totalInventoryCost = 0,
    totalInventorySaleValue = 0,
    totalSupplierDebt = 0,
    totalCapitalNetWorth = 0,
    globalTotalLimit = 0,
    globalRemainingLimit = 0,
    lowStockProductsCount = 0,
    outOfStockCount = 0,
    totalPhonesCount = 0,
    totalAccessoriesCount = 0,
    showToast
  } = useCash();

  const [periodDays, setPeriodDays] = useState(14); // 7 | 14 | 30 | 'all'
  const [activeSection, setActiveSection] = useState(() =>
    getPersistedNavValue('elaasar_reports_section', 'all', ['all', 'profits', 'transfers', 'inventory', 'clients'])
  );
  const [trendMetric, setTrendMetric] = useState('profit'); // 'profit' | 'transfers' | 'sales' | 'collections' | 'expenses'

  useEffect(() => {
    setPersistedNavValue('elaasar_reports_section', activeSection);
  }, [activeSection]);

  const todayStr = getTodayString();

  // Helper to resolve transaction local YYYY-MM-DD date
  const getTxDateKey = (t) => {
    if (t?.date) return getLocalDateString(t.date);
    if (t?.dateOnly) return t.dateOnly;
    return '';
  };

  // Build sorted list of dates for the period window
  const periodCutoffStr = useMemo(() => {
    if (periodDays === 'all') return null;
    const d = new Date();
    d.setDate(d.getDate() - (Number(periodDays) - 1));
    return getLocalDateString(d);
  }, [periodDays]);

  const inPeriod = (dateVal, fallbackDateOnly = '') => {
    const dk = dateVal ? getLocalDateString(dateVal) : fallbackDateOnly;
    if (!dk) return periodDays === 'all';
    if (!periodCutoffStr) return true;
    return dk >= periodCutoffStr && dk <= todayStr;
  };

  // Filtered Transactions & Purchases within period
  const periodTransactions = useMemo(
    () => transactions.filter(t => inPeriod(t.date, t.dateOnly)),
    [transactions, periodCutoffStr, todayStr]
  );

  const periodPurchases = useMemo(
    () => purchases.filter(p => inPeriod(p.date, p.dateOnly)),
    [purchases, periodCutoffStr, todayStr]
  );

  // Inbound Calculator Shifts & Commissions (live + archive)
  const inboundShifts = useMemo(() => {
    const list = [];
    try {
      const archiveRaw = localStorage.getItem(INBOUND_ARCHIVE_KEY);
      if (archiveRaw) {
        const parsed = JSON.parse(archiveRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach(s => {
            const dk = s.businessDate || (s.closedAt ? getLocalDateString(s.closedAt) : '');
            if (!periodCutoffStr || (dk && dk >= periodCutoffStr && dk <= todayStr)) {
              list.push({
                dateKey: dk || todayStr,
                totalAmount: Number(s.totalAmount) || 0,
                commission: Number(s.commissionValue) || 0
              });
            }
          });
        }
      }

      const liveRaw = localStorage.getItem(INBOUND_SHIFT_KEY);
      if (liveRaw) {
        const shift = JSON.parse(liveRaw);
        if (shift?.isActive) {
          const dk = shift.businessDate || todayStr;
          if (!periodCutoffStr || (dk >= periodCutoffStr && dk <= todayStr)) {
            const itemsRaw = localStorage.getItem(INBOUND_ITEMS_KEY);
            const items = itemsRaw ? JSON.parse(itemsRaw) : [];
            const cfgRaw = localStorage.getItem(INBOUND_CONFIG_KEY);
            const cfg = cfgRaw ? JSON.parse(cfgRaw) : {};
            const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
            const rate = Number(cfg.commissionRate) || 0;
            let commVal = 0;
            if (cfg.commissionType === 'percentage') commVal = (total * rate) / 100;
            else if (cfg.commissionType === 'perThousand') commVal = (total / 1000) * rate;
            else commVal = rate;
            list.push({ dateKey: dk, totalAmount: total, commission: commVal });
          }
        }
      }
    } catch {
      // Ignore malformed inbound localStorage data
    }
    return list;
  }, [periodCutoffStr, todayStr]);

  // Core Aggregated Financial Breakdown for Period
  const summary = useMemo(() => {
    const transferTxs = periodTransactions.filter(t => t.type === 'transfer_out');
    const rechargeTxs = periodTransactions.filter(t => t.type === 'recharge' || t.type === 'limit_reset');
    const salesTxs = periodTransactions.filter(t => t.type === 'product_sale');
    const collectionTxs = periodTransactions.filter(t => t.type === 'client_payment' && !t.isCreditorPayout);
    const payoutTxs = periodTransactions.filter(t => t.type === 'client_payment' && t.isCreditorPayout);

    const totalTransfers = transferTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalFees = periodTransactions.reduce((s, t) => s + (Number(t.fee) || 0), 0);
    const totalRecharges = rechargeTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);

    let totalSalesRevenue = 0;
    let totalSalesCost = 0;
    let totalSalesProfit = 0;
    let totalSoldUnits = 0;

    salesTxs.forEach(t => {
      const qty = Number(t.quantity) || 1;
      const rev = Number(t.amount) || 0;
      const matched = inventory.find(p => p.id === t.productId);
      const unitCost = t.costPrice !== undefined ? (Number(t.costPrice) || 0) : (Number(matched?.costPrice) || 0);
      const cost = unitCost * qty;
      const prof = t.profit !== undefined ? (Number(t.profit) || 0) : (unitCost > 0 ? rev - cost : 0);
      totalSalesRevenue += rev;
      totalSalesCost += cost;
      totalSalesProfit += prof;
      totalSoldUnits += qty;
    });

    const totalCollections = collectionTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalPayouts = payoutTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const inventoryPurchases = periodPurchases.filter(p => !p.type || p.type === 'inventory_goods');
    const cashLiquidityPurchases = periodPurchases.filter(p => p.type === 'cash_liquidity');
    const generalExpenses = periodPurchases.filter(p => p.type === 'general_expense');

    const totalInventoryPurchases = inventoryPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
    const totalCashLiquidityCost = cashLiquidityPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
    const totalGeneralExpenses = generalExpenses.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);
    const totalLiquidityMargin = cashLiquidityPurchases.reduce((s, p) => {
      const rec = Number(p.purchasedCashAmount) || 0;
      const paid = Number(p.totalAmount) || 0;
      return s + (rec > 0 ? rec - paid : 0);
    }, 0);

    const totalInboundVolume = inboundShifts.reduce((s, sh) => s + sh.totalAmount, 0);
    const totalInboundCommissions = inboundShifts.reduce((s, sh) => s + sh.commission, 0);

    const grossProfit = totalSalesProfit + totalFees + totalInboundCommissions + totalLiquidityMargin;
    const netProfit = grossProfit - totalGeneralExpenses;

    const totalPurchasesPaid = periodPurchases.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0);
    const totalPurchasesAll = periodPurchases.reduce((s, p) => s + (Number(p.totalAmount) || 0), 0);

    // Channel breakdown for transfers
    const instapayTransfers = transferTxs
      .filter(t => t.paymentMethod === 'instapay')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const shopWalletTransfers = transferTxs
      .filter(t => t.paymentMethod !== 'instapay' && t.isShopWallet)
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const clientWalletTransfers = transferTxs
      .filter(t => t.paymentMethod !== 'instapay' && !t.isShopWallet)
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    return {
      transferCount: transferTxs.length,
      salesCount: salesTxs.length,
      totalSoldUnits,
      totalTransfers,
      totalFees,
      totalRecharges,
      totalSalesRevenue,
      totalSalesCost,
      totalSalesProfit,
      totalCollections,
      totalPayouts,
      totalInventoryPurchases,
      totalCashLiquidityCost,
      totalGeneralExpenses,
      totalLiquidityMargin,
      totalInboundVolume,
      totalInboundCommissions,
      grossProfit,
      netProfit,
      totalPurchasesPaid,
      totalPurchasesAll,
      instapayTransfers,
      shopWalletTransfers,
      clientWalletTransfers
    };
  }, [periodTransactions, periodPurchases, inboundShifts, inventory]);

  // Graph 1: Daily Multi-Metric Timeline
  const dailyTimeline = useMemo(() => {
    const dayKeys = [];
    if (periodDays === 'all') {
      const set = new Set();
      transactions.forEach(t => {
        const k = getTxDateKey(t);
        if (k) set.add(k);
      });
      purchases.forEach(p => {
        const k = getTxDateKey(p);
        if (k) set.add(k);
      });
      inboundShifts.forEach(sh => {
        if (sh.dateKey) set.add(sh.dateKey);
      });
      const sorted = Array.from(set).sort();
      dayKeys.push(...(sorted.length > 0 ? sorted.slice(-30) : [todayStr]));
    } else {
      const n = Number(periodDays);
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dayKeys.push(getLocalDateString(d));
      }
    }

    const dayMap = {};
    dayKeys.forEach(k => {
      dayMap[k] = {
        dateKey: k,
        transfers: 0,
        transfersCount: 0,
        sales: 0,
        salesCount: 0,
        salesProfit: 0,
        fees: 0,
        collections: 0,
        collectionsCount: 0,
        expenses: 0,
        expensesCount: 0,
        inboundComm: 0,
        liqMargin: 0
      };
    });

    periodTransactions.forEach(t => {
      const k = getTxDateKey(t);
      if (!dayMap[k]) return;
      const amt = Number(t.amount) || 0;
      const fee = Number(t.fee) || 0;
      dayMap[k].fees += fee;

      if (t.type === 'transfer_out') {
        dayMap[k].transfers += amt;
        dayMap[k].transfersCount += 1;
      } else if (t.type === 'product_sale') {
        dayMap[k].sales += amt;
        dayMap[k].salesCount += 1;
        const matched = inventory.find(p => p.id === t.productId);
        const qty = Number(t.quantity) || 1;
        const unitCost = t.costPrice !== undefined ? (Number(t.costPrice) || 0) : (Number(matched?.costPrice) || 0);
        const prof = t.profit !== undefined ? (Number(t.profit) || 0) : (unitCost > 0 ? amt - unitCost * qty : 0);
        dayMap[k].salesProfit += prof;
      } else if (t.type === 'client_payment' && !t.isCreditorPayout) {
        dayMap[k].collections += amt;
        dayMap[k].collectionsCount += 1;
      }
    });

    periodPurchases.forEach(p => {
      const k = getTxDateKey(p);
      if (!dayMap[k]) return;
      const amt = Number(p.totalAmount) || 0;
      dayMap[k].expenses += amt;
      dayMap[k].expensesCount += 1;
      if (p.type === 'general_expense') {
        dayMap[k].generalExpenses = (dayMap[k].generalExpenses || 0) + amt;
      } else if (p.type === 'cash_liquidity' && (Number(p.purchasedCashAmount) || 0) > 0) {
        dayMap[k].liqMargin += (Number(p.purchasedCashAmount) || 0) - amt;
      }
    });

    inboundShifts.forEach(sh => {
      if (dayMap[sh.dateKey]) {
        dayMap[sh.dateKey].inboundComm += sh.commission;
      }
    });

    const fmtShort = (dk) => {
      const parts = dk.split('-');
      return parts.length === 3 ? `${Number(parts[2])}/${Number(parts[1])}` : dk;
    };

    return dayKeys.map(k => {
      const d = dayMap[k];
      const netProfit = d.salesProfit + d.fees + d.inboundComm + d.liqMargin - (d.generalExpenses || 0);
      return {
        dateKey: k,
        label: fmtShort(k),
        fullLabel: k === todayStr ? `اليوم (${k})` : k,
        transfers: d.transfers,
        transfersCount: d.transfersCount,
        sales: d.sales,
        salesCount: d.salesCount,
        collections: d.collections,
        collectionsCount: d.collectionsCount,
        expenses: d.expenses,
        expensesCount: d.expensesCount,
        profit: netProfit
      };
    });
  }, [periodDays, periodTransactions, periodPurchases, inboundShifts, inventory, transactions, purchases, todayStr]);

  const activeTrendConfig = useMemo(() => {
    const map = {
      profit: { title: 'صافي الأرباح اليومية', color: '#10b981', countKey: 'salesCount', showZeroLine: true },
      transfers: { title: 'حجم التحويلات اليومي', color: '#e11d48', countKey: 'transfersCount', showZeroLine: false },
      sales: { title: 'مبيعات الأجهزة والإكسسوارات', color: '#8b5cf6', countKey: 'salesCount', showZeroLine: false },
      collections: { title: 'التحصيلات من العملاء', color: '#0ea5e9', countKey: 'collectionsCount', showZeroLine: false },
      expenses: { title: 'المشتريات والمصروفات', color: '#f59e0b', countKey: 'expensesCount', showZeroLine: false }
    };
    const cfg = map[trendMetric] || map.profit;
    return {
      ...cfg,
      points: dailyTimeline.map(d => ({
        label: d.label,
        fullLabel: d.fullLabel,
        value: d[trendMetric],
        count: d[cfg.countKey]
      }))
    };
  }, [dailyTimeline, trendMetric]);

  // Graph 2: Treasury Liquidity Donut Data
  const liquidityDonutData = useMemo(() => [
    { key: 'cash', label: 'كاش الدرج (الخزينة)', value: Number(treasury.cash) || 0, color: '#10b981' },
    { key: 'vf', label: 'فودافون كاش والمحافظ', value: Number(treasury.vodafoneCash) || 0, color: '#e11d48' },
    { key: 'insta', label: 'إنستاباي (InstaPay)', value: Number(treasury.instapay) || 0, color: '#8b5cf6' },
    { key: 'bank', label: 'الحسابات البنكية والفيزا', value: Number(treasury.bank) || 0, color: '#3b82f6' }
  ], [treasury]);

  // Graph 3: Net Worth Composition Bars
  const netWorthItems = useMemo(() => [
    {
      key: 'liq',
      label: 'إجمالي السيولة النقدية المتاحة (+)',
      value: totalLiquidCash,
      colorClass: 'from-emerald-500 to-teal-600',
      textColorClass: 'text-emerald-600 dark:text-emerald-400',
      showShare: false
    },
    {
      key: 'inv',
      label: 'أصول المخزون بسعر التكلفة (+)',
      value: totalInventoryCost,
      colorClass: 'from-blue-500 to-indigo-600',
      textColorClass: 'text-blue-600 dark:text-blue-400',
      subText: `القيمة البيعية المتوقعة: ${formatCurrency(totalInventorySaleValue)}`,
      showShare: false
    },
    {
      key: 'rec',
      label: 'مستحقات وآجل عند العملاء (+)',
      value: clientsTotalReceivables,
      colorClass: 'from-amber-500 to-orange-600',
      textColorClass: 'text-amber-600 dark:text-amber-400',
      showShare: false
    },
    {
      key: 'debt',
      label: 'مديونيات للموردين مستحقة السداد (−)',
      value: totalSupplierDebt,
      colorClass: 'from-rose-500 to-red-600',
      textColorClass: 'text-rose-600 dark:text-rose-400',
      showShare: false
    }
  ], [totalLiquidCash, totalInventoryCost, totalInventorySaleValue, clientsTotalReceivables, totalSupplierDebt]);

  // Graph 4: Profit Sources Donut & Expense Comparison
  const profitSourcesDonut = useMemo(() => [
    { key: 'salesProf', label: 'أرباح مبيعات المنتجات', value: Math.max(0, summary.totalSalesProfit), color: '#10b981' },
    { key: 'fees', label: 'رسوم وعمولات التحويل', value: Math.max(0, summary.totalFees), color: '#3b82f6' },
    { key: 'inbound', label: 'عمولات حاسبة الوارد', value: Math.max(0, summary.totalInboundCommissions), color: '#8b5cf6' },
    { key: 'liq', label: 'فارق شراء سيولة كاش', value: Math.max(0, summary.totalLiquidityMargin), color: '#f59e0b' }
  ], [summary]);

  // Graph 5: Transfer Channels Donut + Shop Wallets Limit Usage
  const channelsDonut = useMemo(() => [
    { key: 'shop', label: 'خطوط المحل (فودافون كاش)', value: summary.shopWalletTransfers, color: '#e11d48' },
    { key: 'insta', label: 'تحويلات إنستاباي', value: summary.instapayTransfers, color: '#8b5cf6' },
    { key: 'client', label: 'محافظ العملاء المسجلة', value: summary.clientWalletTransfers, color: '#0ea5e9' }
  ], [summary]);

  const shopWalletsLimitGroups = useMemo(() => {
    return shopWallets.slice(0, 7).map(w => {
      const stats = calculateWalletStats(w, transactions);
      return {
        label: w.label || formatPhone(w.phoneNumber),
        shortLabel: (w.label || w.phoneNumber || '').slice(0, 11),
        primary: stats.totalTransfersOut,
        secondary: stats.remainingLimit
      };
    });
  }, [shopWallets, transactions]);

  // Graph 6: Top Selling Products Comparison + Inventory Status Donut
  const topProducts = useMemo(() => {
    const map = {};
    periodTransactions
      .filter(t => t.type === 'product_sale')
      .forEach(t => {
        const key = t.productName || 'صنف غير مسمى';
        if (!map[key]) {
          map[key] = { label: key, value: 0, secondaryValue: 0, qty: 0 };
        }
        const matched = inventory.find(p => p.id === t.productId);
        const qty = Number(t.quantity) || 1;
        const rev = Number(t.amount) || 0;
        const unitCost = t.costPrice !== undefined ? (Number(t.costPrice) || 0) : (Number(matched?.costPrice) || 0);
        const prof = t.profit !== undefined ? (Number(t.profit) || 0) : (unitCost > 0 ? rev - unitCost * qty : 0);

        map[key].value += rev;
        map[key].secondaryValue += prof;
        map[key].qty += qty;
      });

    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .map(p => ({
        ...p,
        badge: `${p.qty} ق`,
        colorClass: 'from-violet-600 to-indigo-500'
      }));
  }, [periodTransactions, inventory]);

  const inventoryHealthDonut = useMemo(() => {
    const healthyCount = Math.max(0, inventory.length - lowStockProductsCount - outOfStockCount);
    return [
      { key: 'healthy', label: 'متوفر بكمية آمنة', value: healthyCount, color: '#10b981' },
      { key: 'low', label: 'نواقص (تحت التنبيه)', value: lowStockProductsCount, color: '#f59e0b' },
      { key: 'out', label: 'نفذ من المخزن (0)', value: outOfStockCount, color: '#e11d48' }
    ];
  }, [inventory.length, lowStockProductsCount, outOfStockCount]);

  // Graph 7: Purchases Breakdown Donut
  const purchasesDonut = useMemo(() => [
    { key: 'goods', label: 'فواتير بضاعة ومخزون', value: summary.totalInventoryPurchases, color: '#3b82f6' },
    { key: 'cash', label: 'تغذية وشراء سيولة كاش', value: summary.totalCashLiquidityCost, color: '#f59e0b' },
    { key: 'exp', label: 'مصروفات عامة وتشغيل', value: summary.totalGeneralExpenses, color: '#e11d48' }
  ], [summary]);

  // Graph 8: Top Clients + Top Recipients + Client Status Donut
  const topClientsBars = useMemo(() => {
    const map = {};
    periodTransactions.forEach(t => {
      if (t.type !== 'transfer_out' && t.type !== 'recharge') return;
      const name = t.customerName || t.recipientClientName || 'عميل غير مسجل';
      map[name] = (map[name] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(map)
      .map(([label, value]) => ({
        label,
        value,
        colorClass: 'from-red-600 to-rose-500'
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  const topRecipientsBars = useMemo(() => {
    const map = {};
    periodTransactions.forEach(t => {
      if (t.recipientPhone) {
        map[t.recipientPhone] = (map[t.recipientPhone] || 0) + (Number(t.amount) || 0);
      }
    });
    return Object.entries(map)
      .map(([phone, value]) => ({
        label: formatPhone(phone),
        ltrLabel: true,
        value,
        colorClass: 'from-emerald-600 to-teal-500',
        textColorClass: 'text-emerald-600 dark:text-emerald-400'
      }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  const clientsStatusDonut = useMemo(() => {
    const debtors = clients.filter(c => c.clientType === 'مدين').length;
    const creditors = clients.filter(c => c.clientType === 'دائن').length;
    const settled = Math.max(0, clients.length - debtors - creditors);
    return [
      { key: 'debtor', label: 'عملاء مدينون (عليهم آجل)', value: debtors, color: '#e11d48' },
      { key: 'creditor', label: 'عملاء دائنون (لهم رصيد)', value: creditors, color: '#8b5cf6' },
      { key: 'settled', label: 'عملاء عادي / خالص', value: settled, color: '#10b981' }
    ];
  }, [clients]);

  // Export Comprehensive Report CSV
  const handleExportReportCSV = () => {
    const rows = [
      ['المؤشر المالي', 'القيمة'],
      ['صافي قيمة رأس المال الحالي', totalCapitalNetWorth],
      ['إجمالي السيولة النقدية المتاحة', totalLiquidCash],
      ['كاش الدرج', treasury.cash || 0],
      ['فودافون كاش والمحافظ', treasury.vodafoneCash || 0],
      ['إنستاباي', treasury.instapay || 0],
      ['الحسابات البنكية', treasury.bank || 0],
      ['قيمة المخزون بالتكلفة', totalInventoryCost],
      ['مستحقات لدى العملاء', clientsTotalReceivables],
      ['ديون الموردين المتبقية', totalSupplierDebt],
      ['إجمالي التحويلات في الفترة', summary.totalTransfers],
      ['إجمالي مبيعات المنتجات في الفترة', summary.totalSalesRevenue],
      ['أرباح مبيعات المنتجات', summary.totalSalesProfit],
      ['رسوم وعمولات التحويل', summary.totalFees],
      ['عمولات حاسبة الوارد', summary.totalInboundCommissions],
      ['فارق شراء سيولة كاش', summary.totalLiquidityMargin],
      ['المصروفات العامة', summary.totalGeneralExpenses],
      ['صافي الربح الإجمالي في الفترة', summary.netProfit]
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `التقرير-المالي-الشامل-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملخص التقرير المالي بنجاح!');
  };

  const showSection = (name) => activeSection === 'all' || activeSection === name;

  const totalLimitUsed = Math.max(0, globalTotalLimit - globalRemainingLimit);
  const limitUsedPct = globalTotalLimit > 0 ? Math.min(100, Math.round((totalLimitUsed / globalTotalLimit) * 100)) : 0;

  return (
    <div className="space-y-5 sm:space-y-6 animate-view-fade">

      {/* 1. Header & Period/Category Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 text-white shadow-md shadow-red-600/25 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                <span>مركز التقارير والرسوم البيانية المالية الشاملة</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  تحديث حي فوري
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تحليل بياني كامل للأرباح، السيولة، رأس المال، التحويلات، الليميت، المخزون، المشتريات والعملاء
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Filter Pills */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              {[
                { id: 7, label: '7 أيام' },
                { id: 14, label: '14 يوم' },
                { id: 30, label: '30 يوم' },
                { id: 'all', label: 'كل الفترات' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodDays(p.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    periodDays === p.id
                      ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleExportReportCSV}
              className="btn-interactive inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {[
            { id: 'all', label: '📊 كل الرسوم البيانية (شامل)' },
            { id: 'profits', label: '💰 الأرباح والسيولة ورأس المال' },
            { id: 'transfers', label: '📱 التحويلات وليميت الخطوط' },
            { id: 'inventory', label: '📦 المبيعات والمخزون' },
            { id: 'clients', label: '🧾 المشتريات والعملاء' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                activeSection === tab.id
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                  : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top 6 Financial KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mb-1">
            <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">صافي رأس المال</span>
          </span>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono" dir="ltr">
            {formatCurrency(totalCapitalNetWorth)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">القيمة الفعلية الصافية</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mb-1">
            <Wallet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">السيولة النقدية</span>
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
            {formatCurrency(totalLiquidCash)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">درج + كاش + إنستاباي + بنك</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span className="truncate">صافي الأرباح (الفترة)</span>
          </span>
          <div className={`text-base sm:text-lg font-black font-mono ${summary.netProfit >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600'}`} dir="ltr">
            {formatCurrency(summary.netProfit)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">بعد خصم المصروفات</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mb-1">
            <Smartphone className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">حجم التحويلات</span>
          </span>
          <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono" dir="ltr">
            {formatCurrency(summary.totalTransfers)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">{summary.transferCount} عملية صادرة</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mb-1">
            <ShoppingBag className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span className="truncate">مبيعات المخزون</span>
          </span>
          <div className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 font-mono" dir="ltr">
            {formatCurrency(summary.totalSalesRevenue)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {summary.totalSoldUnits} قطعة (ربح {formatCurrency(summary.totalSalesProfit)})
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1 mb-1">
            <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">تكلفة البضاعة الحالية</span>
          </span>
          <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 font-mono" dir="ltr">
            {formatCurrency(totalInventoryCost)}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            بيع متوقع: {formatCurrency(totalInventorySaleValue)}
          </span>
        </div>
      </div>

      {/* 3. GRAPH 1 (Full-width Interactive Daily Performance Trend) */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-600" />
              <span>{activeTrendConfig.title}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مرر المؤشر على أي يوم لعرض التفاصيل والأرقام الدقيقة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'profit', label: '💰 صافي الأرباح', activeClass: 'bg-emerald-600 text-white' },
              { id: 'transfers', label: '💸 التحويلات', activeClass: 'bg-rose-600 text-white' },
              { id: 'sales', label: '🛍️ مبيعات المنتجات', activeClass: 'bg-purple-600 text-white' },
              { id: 'collections', label: '💵 تحصيلات العملاء', activeClass: 'bg-sky-600 text-white' },
              { id: 'expenses', label: '🧾 المشتريات والمصروفات', activeClass: 'bg-amber-600 text-white' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setTrendMetric(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  trendMetric === m.id
                    ? `${m.activeClass} shadow-xs`
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <InteractiveTrendChart
          points={activeTrendConfig.points}
          seriesName={activeTrendConfig.title}
          color={activeTrendConfig.color}
          gradientId="trendMainGrad"
          showZeroLine={activeTrendConfig.showZeroLine}
        />
      </div>

      {/* 4. PROFITS, LIQUIDITY & NET WORTH GRAPHS */}
      {showSection('profits') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Graph 2: Liquid Cash Distribution Donut */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>توزيع السيولة النقدية على الخزائن</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  النسبة الفعلية لكل خزينة من إجمالي السيولة الحاضرة الآن
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {shopWallets.length} خط • {instapayAccounts.length} إنستاباي
              </span>
            </div>

            <InteractiveDonutChart
              data={liquidityDonutData}
              centerLabel="إجمالي السيولة"
            />
          </div>

          {/* Graph 3: Profit Sources vs General Expenses */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                  <span>هيكل مصادر الأرباح والمصروفات</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  تفصيل مساهمة كل نشاط في أرباح الفترة المحددة
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-black font-mono" dir="ltr">
                مصروفات: -{formatCurrency(summary.totalGeneralExpenses)}
              </span>
            </div>

            <InteractiveDonutChart
              data={profitSourcesDonut}
              centerLabel="إجمالي الربح"
            />
          </div>

          {/* Graph 4 (Wide): Net Worth Composition Pillars */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-500" />
                  <span>تركيب ومكونات صافي ثروة المحل (Net Worth Breakdown)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  المعادلة المالية الكاملة: (السيولة + المخزون + مستحقات العملاء) − ديون الموردين
                </p>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-black font-mono" dir="ltr">
                الصافي: {formatCurrency(totalCapitalNetWorth)}
              </div>
            </div>

            <HorizontalBarChart items={netWorthItems} />
          </div>

        </div>
      )}

      {/* 5. TRANSFERS CHANNELS & SHOP WALLETS LIMITS */}
      {showSection('transfers') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Graph 5A: Transfer Channels Split Donut */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <span>توزيع التحويلات حسب القناة التنفيذية</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                مقارنة حجم التحويلات عبر خطوط المحل، إنستاباي، ومحافظ العملاء
              </p>
            </div>

            <InteractiveDonutChart
              data={channelsDonut}
              centerLabel="إجمالي التحويلات"
              emptyText="لا توجد تحويلات مسجلة في هذه الفترة"
            />
          </div>

          {/* Graph 5B: Monthly Limit Usage across Shop Wallets */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-rose-600" />
                  <span>ليميت خطوط المحل (المستهلك شهرياً vs المتبقي)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  المستخدم شهرياً: {formatCurrency(totalLimitUsed)} ({limitUsedPct}% من {formatCurrency(globalTotalLimit)})
                </p>
              </div>
              <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                متاح: {formatCurrency(globalRemainingLimit)}
              </span>
            </div>

            <GroupedBarChart
              groups={shopWalletsLimitGroups}
              primaryLabel="المستهلك بالشهر"
              secondaryLabel="المتبقي بالخط"
              primaryColor="#e11d48"
              secondaryColor="#10b981"
              emptyText="لا توجد خطوط محل مضافة"
            />
          </div>

        </div>
      )}

      {/* 6. INVENTORY & SALES PERFORMANCE */}
      {showSection('inventory') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Graph 6A: Top Selling Products & Profitability */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                  <span>الأصناف الأعلى مبيعاً وربحية</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  مقارنة إيرادات المبيعات وصافي الربح لكل منتج
                </p>
              </div>
              <span className="text-xs font-black font-mono text-purple-600 dark:text-purple-400">
                {summary.salesCount} فاتورة بيع
              </span>
            </div>

            <HorizontalBarChart
              items={topProducts}
              maxItems={6}
              emptyText="لا توجد مبيعات مسجلة من المخزون في هذه الفترة"
            />
          </div>

          {/* Graph 6B: Inventory Stock Health & Categories */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>صحة وتوفر أصناف المخزون</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  هواتف: {totalPhonesCount} صنف • إكسسوارات: {totalAccessoriesCount} صنف
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                إجمالي {inventory.length} صنف
              </span>
            </div>

            <InteractiveDonutChart
              data={inventoryHealthDonut}
              centerLabel="عدد الأصناف"
              centerValueFormatter={(v) => `${formatNumber(v)} صنف`}
              emptyText="لا توجد أصناف مسجلة بالمخزن"
            />
          </div>

        </div>
      )}

      {/* 7. PURCHASES, CLIENTS VOLUME & RECIPIENTS */}
      {showSection('clients') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Graph 7A: Purchases & Expenses Donut + Supplier Debt */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-600" />
                  <span>توزيع المشتريات والمصروفات</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  بضاعة vs تغذية خطوط كاش vs مصروفات تشغيل
                </p>
              </div>
              <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400" dir="ltr">
                آجل للموردين: {formatCurrency(totalSupplierDebt)}
              </span>
            </div>

            <InteractiveDonutChart
              data={purchasesDonut}
              centerLabel="إجمالي الفواتير"
              emptyText="لا توجد فواتير مشتريات أو مصروفات في هذه الفترة"
            />
          </div>

          {/* Graph 7B: Clients Financial Classification Donut */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>تصنيف حسابات العملاء ({clients.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  موقف السداد والمديونيات لدى جميع عملاء المنظومة
                </p>
              </div>
              <span className="text-xs font-black font-mono text-amber-600 dark:text-amber-400" dir="ltr">
                المستحق: {formatCurrency(clientsTotalReceivables)}
              </span>
            </div>

            <InteractiveDonutChart
              data={clientsStatusDonut}
              centerLabel="إجمالي العملاء"
              centerValueFormatter={(v) => `${formatNumber(v)} عميل`}
              emptyText="لا يوجد عملاء مسجلون"
            />
          </div>

          {/* Graph 8A: Top Clients by Volume */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <span>أعلى العملاء تحويلاً وشحناً</span>
              </h3>
              <span className="text-xs font-mono text-slate-400 font-bold">
                تحصيل: {formatCurrency(summary.totalCollections)}
              </span>
            </div>

            <HorizontalBarChart
              items={topClientsBars}
              maxItems={6}
              emptyText="لا توجد عمليات تحويل أو شحن للعملاء في هذه الفترة"
            />
          </div>

          {/* Graph 8B: Top Recipient Phone Numbers */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-emerald-500" />
                <span>أكثر الأرقام استلاماً للتحويلات</span>
              </h3>
              <span className="text-xs font-mono text-slate-400 font-bold">
                أعلى {Math.min(6, topRecipientsBars.length)} أرقام
              </span>
            </div>

            <HorizontalBarChart
              items={topRecipientsBars}
              maxItems={6}
              emptyText="لا توجد أرقام مستلمة مسجلة في هذه الفترة"
            />
          </div>

        </div>
      )}

    </div>
  );
}
