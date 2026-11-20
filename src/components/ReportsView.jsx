import React, { useMemo } from 'react';
import { useCash } from '../context/CashContext';
import { formatCurrency, formatNumber, formatPhone } from '../utils/formatters';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Wallet, 
  ShieldCheck, 
  Award,
  ArrowUpRight
} from 'lucide-react';

export default function ReportsView() {
  const { clients, transactions, globalTotalLimit, globalRemainingLimit } = useCash();

  // Top clients by total transfers out
  const clientVolume = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const name = t.customerName || 'عميل غير مسجل';
      map[name] = (map[name] || 0) + (Number(t.amount) || 0);
    });

    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  // Top recipients
  const topRecipients = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t.recipientPhone) {
        map[t.recipientPhone] = (map[t.recipientPhone] || 0) + (Number(t.amount) || 0);
      }
    });

    return Object.entries(map)
      .map(([phone, total]) => ({ phone, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions]);

  const totalTransfersAmount = transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const totalFeesEarned = transactions.reduce((acc, t) => acc + (Number(t.fee) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-red-600" />
          <span>التقارير والإحصائيات الشاملة للنظام</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          مؤشرات الأداء المالي، حجم التحويلات التراكمي، وتحليل نشاط العملاء
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-bold block mb-1">
            إجمالي التحويلات التراكمية
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(totalTransfersAmount)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            تمت عبر {transactions.length} عملية تحويل مسجلة
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-bold block mb-1">
            إجمالي أرباح العمولات والرسوم
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalFeesEarned)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            رسوم محصلة من خدمات التحويل
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 font-bold block mb-1">
            متوسط قيمة التحويلة
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {transactions.length > 0 
              ? formatCurrency(Math.round(totalTransfersAmount / transactions.length))
              : '0 ج.م'}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            معدل السيولة للعملية الواحدة
          </span>
        </div>

      </div>

      {/* Top Clients by Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>أعلى العملاء تحويلاً للأموال</span>
          </h3>

          {clientVolume.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">لا توجد عمليات بعد</p>
          ) : (
            <div className="space-y-3">
              {clientVolume.map((item, index) => {
                const percent = totalTransfersAmount > 0 
                  ? Math.round((item.total / totalTransfersAmount) * 100) 
                  : 0;

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        {item.name}
                      </span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {formatCurrency(item.total)} ({percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-600 to-rose-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Recipients */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>أكثر أرقام الهواتف استلاماً للتحويلات</span>
          </h3>

          {topRecipients.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">لا توجد عمليات مسجلة بأرقام مستلمين بعد</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topRecipients.map((rec, idx) => (
                <div key={rec.phone} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm" dir="ltr">
                      {formatPhone(rec.phone)}
                    </span>
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatCurrency(rec.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
