import React from 'react';
import { useCash } from '../context/CashContext';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { 
  ShieldCheck, 
  TrendingUp, 
  Activity, 
  Users, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export default function StatCards({ onSelectDailyTab }) {
  const {
    globalRemainingLimit,
    globalTotalLimit,
    todayTotalAmount,
    todayTransactions,
    totalClientsCount,
    totalWalletsCount,
  } = useCash();

  const totalUsedPercent = globalTotalLimit > 0 
    ? Math.min(100, Math.round(((globalTotalLimit - globalRemainingLimit) / globalTotalLimit) * 100))
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-5 sm:mb-8 animate-view-fade">
      
      {/* 1. Total Remaining Limit Across All Wallets */}
      <div className="card-hover relative overflow-hidden bg-white dark:bg-slate-900/90 p-3 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
            إجمالي الليميت المتبقي
          </span>
          <div className="p-1.5 sm:p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-base sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
          {formatCurrency(globalRemainingLimit)}
        </div>
        <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 gap-0.5">
          <span className="truncate">من: {formatCurrency(globalTotalLimit)}</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
            {100 - totalUsedPercent}% متاح
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 sm:h-2 rounded-full mt-2 sm:mt-2.5 overflow-hidden p-0.5">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${100 - totalUsedPercent}%` }}
          />
        </div>
      </div>

      {/* 2. Today's Transferred Total */}
      <div 
        onClick={onSelectDailyTab}
        className="card-hover cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900/90 p-3 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all duration-300 group"
      >
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
            <span>تحويلات اليوم</span>
            <ArrowUpRight className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline" />
          </span>
          <div className="p-1.5 sm:p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 shrink-0">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-base sm:text-2xl lg:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
          {formatCurrency(todayTotalAmount)}
        </div>
        <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 gap-0.5">
          <span className="truncate">مخصومة من المحافظ</span>
          <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
            سجل اليوم ←
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 sm:h-2 rounded-full mt-2 sm:mt-2.5 overflow-hidden p-0.5">
          <div className="bg-rose-500 h-full rounded-full w-full" />
        </div>
      </div>

      {/* 3. Today's Transactions Count */}
      <div 
        onClick={onSelectDailyTab}
        className="card-hover cursor-pointer relative overflow-hidden bg-white dark:bg-slate-900/90 p-3 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all duration-300 group"
      >
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
            عدد تحويلات اليوم
          </span>
          <div className="p-1.5 sm:p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shrink-0">
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-base sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatNumber(todayTransactions.length)}{' '}
          <span className="text-xs sm:text-sm font-semibold text-slate-400">تحويلة</span>
        </div>
        <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 gap-0.5">
          <span className="truncate">المتوسط:</span>
          <span className="font-bold text-blue-600 dark:text-blue-400 font-mono shrink-0">
            {todayTransactions.length > 0 
              ? formatCurrency(Math.round(todayTotalAmount / todayTransactions.length)) 
              : '0 ج.م'}
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 sm:h-2 rounded-full mt-2 sm:mt-2.5 overflow-hidden" />
      </div>

      {/* 4. Active Clients & Wallets */}
      <div className="card-hover relative overflow-hidden bg-white dark:bg-slate-900/90 p-3 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
            دليل العملاء والخطوط
          </span>
          <div className="p-1.5 sm:p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-base sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {formatNumber(totalClientsCount)}{' '}
          <span className="text-xs sm:text-sm font-semibold text-slate-400">عميل</span>
        </div>
        <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 gap-0.5">
          <span className="truncate">المحافظ:</span>
          <span className="font-black text-amber-600 dark:text-amber-400 shrink-0">
            {totalWalletsCount} رقم
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 sm:h-2 rounded-full mt-2 sm:mt-2.5 overflow-hidden" />
      </div>

    </div>
  );
}