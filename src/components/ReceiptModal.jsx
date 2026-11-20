import React, { useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import ElaasarLogo from './ElaasarLogo';
import { 
  formatCurrency, 
  formatPhone, 
  formatDateTimeArabic 
} from '../utils/formatters';
import { Receipt, X, Printer, CheckCircle2, ShieldCheck, ShoppingBag, Smartphone } from 'lucide-react';

export default function ReceiptModal() {
  const { activeModal, setActiveModal, modalData } = useCash();
  const dialogRef = useRef(null);

  const tx = modalData;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'receipt') {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal]);

  const handleClose = () => {
    setActiveModal(null);
  };

  if (activeModal !== 'receipt' || !tx) return null;

  const isSale = tx.type === 'product_sale';

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="receipt-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-sm bg-white rounded-3xl p-0 border border-slate-200 shadow-2xl backdrop:bg-slate-950/60 overflow-hidden text-slate-900"
    >
      <div className={`p-4 ${isSale ? 'bg-gradient-to-r from-purple-600 to-indigo-700' : 'bg-red-600'} text-white flex items-center justify-between no-print`}>
        <div className="flex items-center gap-2">
          {isSale ? <ShoppingBag className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
          <h2 id="receipt-title" className="text-sm font-bold">
            {isSale ? 'فاتورة بيع جهاز / إكسسوار' : 'إيصال تحويل فودافون كاش'}
          </h2>
        </div>
        <button
          onClick={handleClose}
          type="button"
          className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Printable Receipt Area */}
      <div className="p-6 space-y-5 bg-white text-slate-800">
        
        {/* Logo and Receipt Title */}
        <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4 flex flex-col items-center">
          <ElaasarLogo size="md" variant="vertical" showSubtitle={false} />
          <p className="text-xs text-slate-500 font-mono mt-1">
            {isSale ? 'فاتورة مبيعات الأجهزة والمخزون' : 'إيصال عملية تحويل نقدي إلكتروني'}
          </p>
        </div>

        {/* Amount Badge */}
        <div className="text-center py-2 bg-slate-50 rounded-2xl border border-slate-100">
          <span className="text-xs text-slate-400 block font-medium">
            {isSale ? 'إجمالي قيمة المبيعات' : 'المبلغ المحول'}
          </span>
          <div className={`text-2xl font-black ${isSale ? 'text-purple-600' : 'text-red-600'} tracking-tight`}>
            {formatCurrency(tx.amount)}
          </div>
          <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" />
            {isSale ? 'تمت عملية البيع والصرف من المخزون بنجاح' : 'تم التحويل والخصم بنجاح'}
          </span>
        </div>

        {/* Transaction Details Table */}
        <div className="space-y-2.5 text-xs">
          
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-400">رقم الفاتورة (المرجع):</span>
            <span className="font-mono font-bold text-slate-800">{tx.transactionCode}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-400">تاريخ وتوقيت العملية:</span>
            <span className="font-medium text-slate-800">{formatDateTimeArabic(tx.date)}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span className="text-slate-400">{isSale ? 'اسم المشتري / العميل:' : 'اسم العميل الراسل:'}</span>
            <span className="font-bold text-slate-900">{tx.customerName || (isSale ? 'عميل نقدي' : '—')}</span>
          </div>

          {isSale ? (
            <>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-400">الجهاز / الصنف المباع:</span>
                <span className="font-bold text-purple-700">{tx.productName}</span>
              </div>

              {tx.variantColor && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-400">اللون / الطراز:</span>
                  <span className="font-bold text-slate-800">{tx.variantColor}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-400">الكمية وسعر القطعة:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {tx.quantity || 1} قطعة × {formatCurrency(tx.unitPrice)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-400">من رقم محفظة:</span>
                <span className="font-mono font-bold text-slate-800" dir="ltr">{formatPhone(tx.walletPhone)}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-400">إلى رقم المستلم:</span>
                <span className="font-mono font-black text-slate-900 text-sm" dir="ltr">{formatPhone(tx.recipientPhone) || '—'}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-400">الليميت المتبقي بعد العملية:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(tx.limitAfter)}</span>
              </div>

              {tx.fee > 0 && (
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-400">رسوم / عمولة الخدمة:</span>
                  <span className="font-bold text-slate-700">{formatCurrency(tx.fee)}</span>
                </div>
              )}
            </>
          )}

          {tx.notes && (
            <div className="py-1">
              <span className="text-slate-400 block mb-0.5">البيان / ملاحظات:</span>
              <span className="font-medium text-slate-700 bg-slate-50 p-2 rounded-lg block">{tx.notes}</span>
            </div>
          )}

        </div>

        {/* Footer stamp */}
        <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
          <div className="flex items-center justify-center gap-1 text-slate-600 font-bold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>معاملة موثقة بنظام الأعصر كاش</span>
          </div>
          <p>شكراً لتعاملكم معنا • احتفظ بهذا الإيصال للرجوع إليه</p>
        </div>

      </div>

      {/* Action buttons (hidden when printed) */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 no-print">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
        >
          إغلاق
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-interactive flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>طباعة الإيصال</span>
        </button>
      </div>

    </dialog>
  );
}
