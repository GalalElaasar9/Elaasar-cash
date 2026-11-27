import React, { useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  formatDateTimeArabic, 
  formatPhone, 
  cleanEgyptianPhone 
} from '../utils/formatters';
import { 
  X, 
  Printer, 
  MessageSquare, 
  Building2, 
  Phone, 
  Calendar, 
  Package, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  DollarSign,
  Coins,
  Zap,
  Smartphone,
  Landmark
} from 'lucide-react';

export default function PurchaseDetailsModal() {
  const { 
    activeModal, 
    setActiveModal, 
    modalData, 
    deletePurchase, 
    askConfirm, 
    showToast 
  } = useCash();

  const dialogRef = useRef(null);
  const purchase = modalData?.purchase;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'purchaseDetails') {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal]);

  const handleClose = () => {
    setActiveModal(null);
  };

  if (activeModal !== 'purchaseDetails' || !purchase) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleOpenWhatsApp = () => {
    if (!purchase.supplierPhone) {
      showToast('لا يوجد رقم هاتف مسجل لهذا المورد', 'info');
      return;
    }
    const clean = cleanEgyptianPhone(purchase.supplierPhone);
    const intlPhone = clean.startsWith('0') ? '20' + clean.slice(1) : clean;
    const msg = encodeURIComponent(`السلام عليكم أستاذ ${purchase.supplierName}، بخصوص فاتورة المشتريات رقم (${purchase.invoiceNumber}) في منظومة الأعصر كاش.`);
    window.open(`https://wa.me/${intlPhone}?text=${msg}`, '_blank');
  };

  const handleDelete = async () => {
    const confirmed = await askConfirm({
      title: 'تأكيد حذف الفاتورة',
      message: `هل أنت متأكد من حذف فاتورة "${purchase.invoiceNumber}" الخاصة بـ (${purchase.supplierName})؟`,
      details: 'سيتم حذف الفاتورة وعكس تأثيرها المالي على الخزينة والمورد والمخزون.',
      type: 'danger',
      confirmText: 'نعم، احذف الفاتورة',
      cancelText: 'إلغاء'
    });
    if (confirmed) {
      deletePurchase(purchase.id);
      handleClose();
    }
  };

  const handleSettlePayment = () => {
    setActiveModal('supplierPayment');
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="purchase-details-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/70 overflow-hidden animate-scale-in"
    >
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10">
              {purchase.type === 'cash_liquidity' ? (
                <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              ) : purchase.type === 'inventory_goods' ? (
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
              ) : (
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="purchase-details-title" className="text-base sm:text-lg font-black leading-tight">
                  {purchase.type === 'cash_liquidity' ? 'تفاصيل فاتورة شراء وتوريد رصيد كاش' : 'تفاصيل فاتورة المشتريات'}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/20 text-white">
                  {purchase.invoiceNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {purchase.type === 'cash_liquidity'
                  ? 'شراء وتغذية رصيد فودافون كاش ومحافظ المحمول وتحديث الخزينة'
                  : purchase.type === 'inventory_goods' 
                  ? 'توريد بضاعة للمخزن' 
                  : 'مشتريات ومصروفات عامة للمحل'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              title="طباعة الفاتورة"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">

          {/* Supplier & Status Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                  {purchase.supplierName}
                </span>
              </div>

              {purchase.supplierPhone && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500 font-mono" dir="ltr">
                    {formatPhone(purchase.supplierPhone)}
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-100"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>مراسلة واتساب</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>تاريخ التوريد: {formatDateTimeArabic(purchase.date)}</span>
              </div>
            </div>

            {/* Payment Badge */}
            <div className="text-left sm:text-right shrink-0">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                purchase.paymentStatus === 'paid'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                  : purchase.paymentStatus === 'partial'
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
              }`}>
                {purchase.paymentStatus === 'paid' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {purchase.paymentStatus === 'partial' && <CreditCard className="w-3.5 h-3.5" />}
                {purchase.paymentStatus === 'unpaid' && <Clock className="w-3.5 h-3.5" />}
                <span>
                  {purchase.paymentStatus === 'paid' ? 'خالص بالكامل' : purchase.paymentStatus === 'partial' ? 'مدفوع جزئياً' : 'آجل بالكامل'}
                </span>
              </span>

              <div className="mt-1 text-xs text-slate-500">
                وسيلة السداد: {
                  purchase.paymentMethod === 'wallet' ? `فودافون كاش${purchase.paidFromWalletLabel ? ` (${purchase.paidFromWalletLabel})` : ''}` :
                  purchase.paymentMethod === 'instapay' ? `إنستاباي${purchase.paidFromInstapayAccountName ? ` (${purchase.paidFromInstapayAccountName})` : ''}` :
                  purchase.paymentMethod === 'bank' ? 'حساب بنكي' :
                  purchase.paymentMethod === 'credit' ? 'آجل بالكامل' :
                  purchase.paymentMethod === 'partial' ? 'سداد جزئي' :
                  'نقدي (كاش الدرج)'
                }
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              <span>الأصناف والبنود المسجلة بالفاتورة ({purchase.items?.length || 0})</span>
            </h3>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">الصنف / البيان</th>
                      <th className="py-2.5 px-3 text-center">الكمية</th>
                      <th className="py-2.5 px-3 text-center">سعر الشراء</th>
                      <th className="py-2.5 px-3 text-center">الإجمالي</th>
                      {purchase.type === 'inventory_goods' && (
                        <th className="py-2.5 px-3 text-center">سعر البيع المقترح</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {(purchase.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                          <div>{item.name}</div>
                          {item.color && (
                            <span className="text-[10px] text-slate-400 font-normal">اللون: {item.color}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">
                          {formatCurrency(item.unitCost)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.totalCost || (item.quantity * item.unitCost))}
                        </td>
                        {purchase.type === 'inventory_goods' && (
                          <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">
                            {item.suggestedSalePrice ? formatCurrency(item.suggestedSalePrice) : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Totals & Debt Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">إجمالي الفاتورة:</span>
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(purchase.totalAmount)}
              </span>
            </div>

            <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">المبلغ المسدد:</span>
              <span className="text-sm sm:text-base font-black text-emerald-600">
                {formatCurrency(purchase.paidAmount)}
              </span>
            </div>

            <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">المتبقي (الآجل):</span>
              <span className={`text-sm sm:text-base font-black ${purchase.remainingAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                {purchase.remainingAmount > 0 ? formatCurrency(purchase.remainingAmount) : 'خالص'}
              </span>
            </div>
          </div>

          {/* Payment History / Settlements */}
          {purchase.payments && purchase.payments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>سجل الدفعات والتسويات المسددة ({purchase.payments.length})</span>
              </h3>

              <div className="space-y-1.5">
                {purchase.payments.map((pay, i) => (
                  <div 
                    key={pay.id || i}
                    className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        {formatCurrency(pay.amount)}
                      </span>
                      <span className="text-slate-500 text-[11px] mr-2">
                        {pay.method === 'wallet'
                          ? `فودافون كاش${pay.walletLabel ? ` (${pay.walletLabel})` : ''}`
                          : pay.method === 'instapay'
                          ? `إنستاباي${pay.instapayAccountName ? ` (${pay.instapayAccountName})` : ''}`
                          : pay.method === 'bank'
                          ? 'تحويل بنكي'
                          : 'نقدي كاش'}
                      </span>
                      {pay.notes && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{pay.notes}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateTimeArabic(pay.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {purchase.notes && (
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold block mb-0.5">ملاحظات الفاتورة:</span>
              <p>{purchase.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف الفاتورة</span>
          </button>

          <div className="flex items-center gap-2">
            {purchase.remainingAmount > 0 && (
              <button
                type="button"
                onClick={handleSettlePayment}
                className="btn-interactive flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                <CreditCard className="w-4 h-4" />
                <span>سداد دفعة للمورد</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </dialog>
  );
}
