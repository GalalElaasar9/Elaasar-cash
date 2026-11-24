import React, { useRef, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  formatDateArabic, 
  formatTimeArabic, 
  formatDateTimeArabic 
} from '../utils/formatters';
import { 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Coins, 
  Wallet, 
  DollarSign, 
  Building2, 
  Calendar, 
  User, 
  FileText, 
  Printer, 
  Sparkles,
  Zap
} from 'lucide-react';

export default function DailyAuditDetailsModal() {
  const { activeModal, setActiveModal, modalData } = useCash();
  const dialogRef = useRef(null);

  const audit = modalData?.audit;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (activeModal === 'auditDetails' && audit) {
      if (dialog && !dialog.open) dialog.showModal();
    } else {
      if (dialog && dialog.open) dialog.close();
    }
  }, [activeModal, audit]);

  const handleClose = () => {
    setActiveModal(null);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!audit) return null;

  const {
    date,
    dateOnly,
    time,
    auditorName,
    notes,
    status,
    systemBalances = {},
    actualBalances = {},
    variances = {},
    daySummary = {}
  } = audit;

  const isMatched = status === 'matched' || Math.abs(variances.totalLiquidCash || 0) < 0.01;
  const isSurplus = status === 'surplus' || (variances.totalLiquidCash || 0) > 0.01;
  const isDeficit = status === 'deficit' || (variances.totalLiquidCash || 0) < -0.01;

  const totalVar = variances.totalLiquidCash || (Number(actualBalances.totalLiquidCash || 0) - Number(systemBalances.totalLiquidCash || 0));

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="p-0 rounded-3xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl border border-slate-200 dark:border-slate-800 backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm max-w-4xl w-[96vw] overflow-hidden transition-all animate-dialog-zoom"
    >
      <div className="flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl text-white ${
              isMatched ? 'bg-emerald-600' : isSurplus ? 'bg-blue-600' : 'bg-rose-600'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  سجل وتفاصيل جرد اليومية ({formatDateArabic(dateOnly || date)})
                </h3>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                  isMatched 
                    ? 'bg-emerald-500/20 text-emerald-300' 
                    : isSurplus 
                    ? 'bg-blue-500/20 text-blue-300' 
                    : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {isMatched ? '✓ مطابق بالكامل' : isSurplus ? '+ يوجد زيادة' : '- يوجد عجز'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                مسؤول الجرد والاعتماد: <span className="font-bold text-slate-200">{auditorName || 'صاحب المحل'}</span> | التوقيت: {time || formatTimeArabic(date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
              title="طباعة تقرير الجرد"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Top Master Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">
                إجمالي الرصيد الدفتري (السيستم):
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(systemBalances.totalLiquidCash || 0)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-bold block mb-1">
                إجمالي الرصيد الفعلي المعدود:
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(actualBalances.totalLiquidCash || 0)}
              </span>
            </div>

            <div className={`p-4 rounded-2xl border text-center ${
              isMatched 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300' 
                : isSurplus 
                ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300' 
                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300'
            }`}>
              <span className="text-[11px] font-bold block mb-1 opacity-80">
                صافي فرق الجرد الإجمالي:
              </span>
              <span className="text-xl sm:text-2xl font-black">
                {isMatched ? '0.00 ج.م (مطابق)' : `${totalVar > 0 ? '+' : ''}${formatCurrency(totalVar)}`}
              </span>
            </div>
          </div>

          {/* Day's Operational Activity at time of audit */}
          {daySummary && (
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
              <span className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>حركة اليومية المسجلة حتى اعتماد الجرد:</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">التحويلات الصادرة:</span>
                  <span className="font-bold text-rose-600">{formatCurrency(daySummary.totalTransfersOut || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">شحن وإيداعات الخطوط:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(daySummary.totalRecharges || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">المشتريات والمصروفات:</span>
                  <span className="font-bold text-amber-600">{formatCurrency(daySummary.totalPurchases || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">تحصيلات العملاء:</span>
                  <span className="font-bold text-blue-600">{formatCurrency(daySummary.totalClientCollections || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Breakdown Tables */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
              تفاصيل مطابقة الأرصدة والعد الفعلي حسب الخزائن:
            </h4>

            {/* Channels Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black">
                  <tr>
                    <th className="p-3">الخزينة / القناة</th>
                    <th className="p-3">الرصيد الدفتري (السيستم)</th>
                    <th className="p-3">العد الفعلي على الطبيعة</th>
                    <th className="p-3">فرق الجرد</th>
                    <th className="p-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {/* Drawer Cash */}
                  <tr>
                    <td className="p-3 font-bold flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      <span>كاش الدرج والخزينة</span>
                    </td>
                    <td className="p-3 font-mono font-bold">{formatCurrency(systemBalances.drawerCash || 0)}</td>
                    <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(actualBalances.drawerCash || 0)}</td>
                    <td className="p-3 font-mono font-black">
                      {Math.abs(variances.drawerCash || 0) < 0.01 
                        ? '0.00 ج.م' 
                        : `${(variances.drawerCash || 0) > 0 ? '+' : ''}${formatCurrency(variances.drawerCash || 0)}`}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        Math.abs(variances.drawerCash || 0) < 0.01 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                          : (variances.drawerCash || 0) > 0
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}>
                        {Math.abs(variances.drawerCash || 0) < 0.01 ? 'مطابق' : (variances.drawerCash || 0) > 0 ? 'زيادة' : 'عجز'}
                      </span>
                    </td>
                  </tr>

                  {/* Vodafone Cash Lines Total */}
                  <tr>
                    <td className="p-3 font-bold flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-rose-600" />
                      <span>إجمالي خطوط فودافون كاش ({actualBalances.shopWallets?.length || 0} خطوط)</span>
                    </td>
                    <td className="p-3 font-mono font-bold">{formatCurrency(systemBalances.vodafoneCash || 0)}</td>
                    <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrency(actualBalances.vodafoneCash || 0)}</td>
                    <td className="p-3 font-mono font-black">
                      {Math.abs(variances.vodafoneCash || 0) < 0.01 
                        ? '0.00 ج.م' 
                        : `${(variances.vodafoneCash || 0) > 0 ? '+' : ''}${formatCurrency(variances.vodafoneCash || 0)}`}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        Math.abs(variances.vodafoneCash || 0) < 0.01 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                          : (variances.vodafoneCash || 0) > 0
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}>
                        {Math.abs(variances.vodafoneCash || 0) < 0.01 ? 'مطابق' : (variances.vodafoneCash || 0) > 0 ? 'زيادة' : 'عجز'}
                      </span>
                    </td>
                  </tr>

                  {/* InstaPay Accounts Total */}
                  <tr>
                    <td className="p-3 font-bold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span>حسابات إنستاباي ({actualBalances.instapayAccounts?.length || 0} حسابات)</span>
                    </td>
                    <td className="p-3 font-mono font-bold">{formatCurrency(systemBalances.instapay || 0)}</td>
                    <td className="p-3 font-mono font-bold text-purple-600 dark:text-purple-400">{formatCurrency(actualBalances.instapay || 0)}</td>
                    <td className="p-3 font-mono font-black">
                      {Math.abs(variances.instapay || 0) < 0.01 
                        ? '0.00 ج.م' 
                        : `${(variances.instapay || 0) > 0 ? '+' : ''}${formatCurrency(variances.instapay || 0)}`}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        Math.abs(variances.instapay || 0) < 0.01 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                          : (variances.instapay || 0) > 0
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}>
                        {Math.abs(variances.instapay || 0) < 0.01 ? 'مطابق' : (variances.instapay || 0) > 0 ? 'زيادة' : 'عجز'}
                      </span>
                    </td>
                  </tr>

                  {/* Bank Accounts */}
                  <tr>
                    <td className="p-3 font-bold flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>الحسابات البنكية</span>
                    </td>
                    <td className="p-3 font-mono font-bold">{formatCurrency(systemBalances.bankAccounts || 0)}</td>
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(actualBalances.bankAccounts || 0)}</td>
                    <td className="p-3 font-mono font-black">
                      {Math.abs(variances.bankAccounts || 0) < 0.01 
                        ? '0.00 ج.م' 
                        : `${(variances.bankAccounts || 0) > 0 ? '+' : ''}${formatCurrency(variances.bankAccounts || 0)}`}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        Math.abs(variances.bankAccounts || 0) < 0.01 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' 
                          : (variances.bankAccounts || 0) > 0
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}>
                        {Math.abs(variances.bankAccounts || 0) < 0.01 ? 'مطابق' : (variances.bankAccounts || 0) > 0 ? 'زيادة' : 'عجز'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Per-line Vodafone details if present */}
            {Array.isArray(actualBalances.shopWallets) && actualBalances.shopWallets.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  تفصيل جرد خطوط فودافون كاش للمحل:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {actualBalances.shopWallets.map((w, idx) => {
                    const diff = Number(w.variance || 0);
                    const isM = Math.abs(diff) < 0.01;
                    return (
                      <div key={w.id || idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{w.label}</span>
                          <span className="text-[10px] text-slate-500 font-mono" dir="ltr">{w.phoneNumber}</span>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="font-black text-slate-900 dark:text-white block">{formatCurrency(w.balance)}</span>
                          <span className={`text-[10px] font-bold ${isM ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {isM ? '✓ مطابق' : `${diff > 0 ? '+' : ''}${formatCurrency(diff)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Audit Notes */}
          {notes && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 block mb-1">
                ملاحظات الجرد المدونة:
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {notes}
              </p>
            </div>
          )}

          {/* Footer Close Button */}
          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm hover:opacity-90 transition-opacity"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
