/**
 * Utilities for formatting currencies, phone numbers, and dates
 * Always using Western Latin digits (0-9) as requested: "الأرقام كلها بالإنجليزي"
 */

export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 ج.م';
  }
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(amount);
  
  return `${formatted} ج.م`;
}

export function formatNumber(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Converts Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to standard Latin digits (0-9)
 */
export function convertArabicDigits(str) {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(str).replace(/[٠-٩]/g, d => arabicDigits.indexOf(d).toString());
}

/**
 * Cleans and normalizes Egyptian mobile phone input:
 * - Converts Arabic digits to English digits
 * - Strips all non-digit characters (+, spaces, dashes)
 * - Normalizes international prefixes (+20, 0020, 20)
 * - Restricts max length to 11 digits
 */
export function cleanEgyptianPhone(value) {
  if (!value) return '';
  let str = convertArabicDigits(value);
  let digits = str.replace(/\D/g, '');

  // Strip international prefix if entered (e.g., 002010... or 2010...)
  if (digits.startsWith('00201') && digits.length >= 13) {
    digits = digits.slice(4);
  } else if (digits.startsWith('201') && digits.length >= 12) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 11);
}

/**
 * Strictly validates an Egyptian mobile phone number:
 * - Must start with 010, 011, 012, or 015
 * - Must be exactly 11 digits
 */
export function isValidEgyptianPhone(phone) {
  if (!phone) return false;
  const clean = cleanEgyptianPhone(phone);
  return /^01[0125][0-9]{8}$/.test(clean);
}

/**
 * Returns a human-friendly Arabic validation error, or null if valid.
 */
export function getEgyptianPhoneError(phone) {
  if (!phone || !String(phone).trim()) {
    return 'يرجى إدخال رقم الهاتف';
  }
  const clean = cleanEgyptianPhone(phone);
  if (clean.length < 3) {
    return 'يجب أن يبدأ الرقم بـ 010 أو 011 أو 012 أو 015';
  }
  const prefix = clean.slice(0, 3);
  if (!['010', '011', '012', '015'].includes(prefix)) {
    return `البداية (${prefix}) غير صحيحة! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015`;
  }
  if (clean.length < 11) {
    return `رقم الهاتف ناقص (${clean.length}/11 رقماً)`;
  }
  if (clean.length > 11) {
    return 'رقم الهاتف يجب أن يتكون من 11 رقماً فقط';
  }
  return null;
}

/**
 * Returns the Egyptian telecom carrier information
 */
export function getEgyptianCarrier(phone) {
  if (!phone) return null;
  const clean = cleanEgyptianPhone(phone);
  if (clean.length < 3) return null;
  const prefix = clean.slice(0, 3);
  switch (prefix) {
    case '010':
      return { name: 'فودافون كاش', code: '010', color: 'rose' };
    case '011':
      return { name: 'اتصالات كاش', code: '011', color: 'emerald' };
    case '012':
      return { name: 'أورنج كاش', code: '012', color: 'orange' };
    case '015':
      return { name: 'وي باي (WE)', code: '015', color: 'purple' };
    default:
      return null;
  }
}

export function formatPhone(phone) {
  if (!phone) return '';
  const clean = cleanEgyptianPhone(phone);
  if (clean.length === 11 && clean.startsWith('01')) {
    // Format Egyptian mobile: 010 1234 5678
    return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
  }
  return clean || phone;
}

export function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`; // e.g. "2026-11"
}

/**
 * Returns information about the next monthly limit reset (1st of next month)
 */
export function getNextMonthResetInfo() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const day = nextMonth.getDate(); // 1
  const month = nextMonth.getMonth() + 1; // 12
  const year = nextMonth.getFullYear();
  
  const diffTime = nextMonth.getTime() - now.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  let currentMonthName = '';
  let nextMonthName = '';
  try {
    currentMonthName = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long' }).format(now);
    nextMonthName = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long' }).format(nextMonth);
  } catch {
    currentMonthName = `شهر ${now.getMonth() + 1}`;
    nextMonthName = `شهر ${month}`;
  }

  return {
    nextResetDateShort: `${day}/${month}`, // e.g. "1/12"
    nextResetDateFull: `${day}/${month}/${year}`, // e.g. "1/12/2026"
    currentMonthName,
    nextMonthName,
    daysRemaining
  };
}

export function formatDateArabic(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatTimeArabic(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(d);
  } catch {
    return '';
  }
}

export function formatDateTimeArabic(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return dateStr;
  }
}

export const DEFAULT_WALLET_LIMIT = 200000;
export const DAILY_TRANSFER_OUT_LIMIT = 60000;
export const DAILY_RECHARGE_LIMIT = 120000;
export const MAX_WALLET_BALANCE_CAP = 200000;

/**
 * Calculates monthly financial metrics for a specific wallet:
 * - totalLimit: Configured max balance limit for the month (default 200,000)
 * - totalTransfersOut: Sum of transfers made in the CURRENT month
 * - remainingLimit: Current remaining balance/limit for this month (capped at 200,000)
 * - isExhausted / isLocked: true when remainingLimit <= 0 (LOCKED - cannot transfer until 1st of next month)
 * - dailyTransferLimit: 60,000 max daily transfer out
 * - dailyRechargeLimit: 120,000 max daily deposit/recharge
 * - maxWalletBalanceCap: 200,000 max capacity
 */
export function calculateWalletStats(wallet, transactions = [], targetMonth = null) {
  const totalLimit = Number(wallet.totalLimit) || DEFAULT_WALLET_LIMIT;
  const activeMonth = targetMonth || getCurrentMonthKey(); // e.g. "2026-11"
  const todayKey = new Date().toISOString().split('T')[0];
  
  // Filter all transactions for this wallet in the active monthly cycle
  const walletTx = transactions.filter(t => {
    if (t.walletId !== wallet.id) return false;
    const txMonth = (t.dateOnly || t.date || '').slice(0, 7);
    return txMonth === activeMonth;
  });
  
  const totalTransfersOut = walletTx
    .filter(t => t.type === 'transfer_out')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
  const totalRecharges = walletTx
    .filter(t => t.type === 'recharge' || t.type === 'limit_reset')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Raw remaining limit before cap (actual balance, can exceed totalLimit / 200,000)
  const rawRemaining = totalLimit - totalTransfersOut + totalRecharges;
  const remainingLimit = Math.max(0, rawRemaining);
  const isOverBalanceCap = remainingLimit > totalLimit;
  const overBalanceAmount = isOverBalanceCap ? remainingLimit - totalLimit : 0;

  const percentUsed = totalLimit > 0 ? Math.min(100, Math.max(0, ((totalTransfersOut - totalRecharges) / totalLimit) * 100)) : 0;
  
  // Today's specific transactions for daily transfer & recharge tracking
  const todayTx = walletTx.filter(t => (t.dateOnly || t.date || '').startsWith(todayKey));

  // 1. Daily Transfer OUT tracking (Max 60,000 EGP / day)
  const todayTransfersOut = todayTx
    .filter(t => t.type === 'transfer_out')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const remainingDailyTransfer = Math.max(0, DAILY_TRANSFER_OUT_LIMIT - todayTransfersOut);
  const isDailyTransferExhausted = remainingDailyTransfer <= 0;

  // 2. Daily Recharge / Deposit tracking (Max 120,000 EGP / day)
  const todayRecharges = todayTx
    .filter(t => t.type === 'recharge' || t.type === 'limit_reset')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const remainingDailyRecharge = Math.max(0, DAILY_RECHARGE_LIMIT - todayRecharges);
  // Room in wallet to reach totalLimit (0 if already at or above cap)
  const roomInWallet = Math.max(0, totalLimit - remainingLimit);
  // Shop lines can accept recharge up to remainingDailyRecharge (and can exceed totalLimit with a warning)
  const maxAllowedDeposit = remainingDailyRecharge;
  const isDailyRechargeExhausted = remainingDailyRecharge <= 0;

  // Status flags:
  // 1) RED / LOCKED: Limit is 0 or less (Exhausted / Ended - Wallet is locked!)
  const isExhausted = remainingLimit <= 0;
  const isLocked = isExhausted;
  // 2) YELLOW / AMBER: Approaching limit (> 0 and <= 20% remaining)
  const isNearLimit = remainingLimit > 0 && remainingLimit <= (totalLimit * 0.20);
  // 3) GREEN: Safe (> 20% remaining)
  const isSafe = remainingLimit > (totalLimit * 0.20);

  const resetInfo = getNextMonthResetInfo();

  return {
    totalLimit,
    totalTransfersOut,
    totalRecharges,
    remainingLimit,
    percentUsed: Number(percentUsed.toFixed(1)),
    transactionsCount: walletTx.length,
    isExhausted, // <= 0 (RED)
    isLocked,    // Wallet locked because monthly limit reached
    isNearLimit, // > 0 and <= 20% (YELLOW / AMBER)
    isSafe,      // > 20% (GREEN)
    isOverBalanceCap, // > totalLimit (e.g. > 200,000)
    overBalanceAmount, // amount exceeding totalLimit
    roomInWallet,

    // Daily transfer out stats
    todayTransfersOut,
    dailyTransferLimit: DAILY_TRANSFER_OUT_LIMIT, // 60,000
    remainingDailyTransfer, // 60,000 - todayTransfersOut
    isDailyTransferExhausted,

    // Daily recharge stats
    todayRecharges,
    dailyRechargeLimit: DAILY_RECHARGE_LIMIT, // 120,000
    remainingDailyRecharge, // 120,000 - todayRecharges
    maxAllowedDeposit, // min(remainingDailyRecharge, 200,000 - remainingLimit)
    isDailyRechargeExhausted,
    maxWalletBalanceCap: MAX_WALLET_BALANCE_CAP, // 200,000

    nextResetDateShort: resetInfo.nextResetDateShort, // e.g. "1/12"
    nextResetDateFull: resetInfo.nextResetDateFull,
    daysUntilReset: resetInfo.daysRemaining
  };
}