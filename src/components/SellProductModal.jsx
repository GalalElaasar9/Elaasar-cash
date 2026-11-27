import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { formatCurrency } from '../utils/formatters';
import { 
  ShoppingBag, 
  X, 
  Check, 
  AlertTriangle, 
  Smartphone, 
  Package, 
  Palette,
  DollarSign,
  User,
  Minus,
  Wallet,
  Building2,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

export default function SellProductModal() {
  const {
    activeModal,
    setActiveModal,
    modalData,
    sellProductVariant,
    shopWallets = [],
    instapayAccounts = [],
    askConfirm,
    showToast
  } = useCash();
  const dialogRef = useRef(null);

  const product = modalData?.product;

  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedInstapayId, setSelectedInstapayId] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'sellProduct') {
      if (!dialog.open) dialog.showModal();

      if (product) {
        // Find first variant with quantity > 0
        const availableVariant = product.variants?.find(v => v.quantity > 0);
        setSelectedColor(availableVariant ? availableVariant.color : product.variants?.[0]?.color || '');
        setQuantity(1);
        setSalePrice(product.salePrice || '');
        setCustomerName('');
        setPaymentMethod('cash');
        setSelectedWalletId(shopWallets[0]?.id || '');
        setSelectedInstapayId(instapayAccounts[0]?.id || '');
      }
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, modalData, product]);

  const handleClose = () => {
    setActiveModal(null);
  };

  if (activeModal !== 'sellProduct' || !product) return null;

  const currentVariant = product.variants?.find(v => v.color === selectedColor);
  const availableInColor = currentVariant ? currentVariant.quantity : 0;
  const isOutOfStock = availableInColor <= 0;

  const unitCost = Number(product?.costPrice) || 0;
  const effectiveUnitPrice = salePrice !== '' && !isNaN(Number(salePrice))
    ? Number(salePrice)
    : (Number(product?.salePrice) || 0);
  const unitMargin = effectiveUnitPrice - unitCost;
  const totalMargin = unitMargin * (Number(quantity) || 1);
  const isLossSale = unitCost > 0 && effectiveUnitPrice < unitCost;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedColor) {
      showToast('يرجى اختيار اللون المباع', 'error');
      return;
    }

    if (quantity > availableInColor) {
      showToast(`الكمية المتاحة من اللون (${selectedColor}) هي ${availableInColor} فقط!`, 'error');
      return;
    }

    if (paymentMethod === 'vodafone_cash' && shopWallets.length > 0 && !selectedWalletId) {
      showToast('يرجى اختيار خط فودافون كاش الذي سيتم استلام المبلغ عليه', 'error');
      return;
    }

    if (paymentMethod === 'instapay' && instapayAccounts.length > 0 && !selectedInstapayId) {
      showToast('يرجى اختيار حساب إنستاباي الذي سيتم التحويل إليه', 'error');
      return;
    }

    if (isLossSale) {
      const confirmed = await askConfirm({
        title: '⚠️ تحذير: البيع بأقل من سعر الشراء (خسارة)',
        message: `أنت على وشك بيع "${product.name}" بسعر (${formatCurrency(effectiveUnitPrice)}) وهو أقل من سعر الشراء (${formatCurrency(unitCost)})!`,
        details: `ستتحمل خسارة قدرها ${formatCurrency(Math.abs(unitMargin))} للقطعة الواحدة (إجمالي خسارة: ${formatCurrency(Math.abs(totalMargin))} لعدد ${quantity} قطعة). هل تريد الاستمرار وتأكيد البيع بالخسارة؟`,
        type: 'danger',
        confirmText: 'نعم، تأكيد البيع رغم الخسارة',
        cancelText: 'تراجع وتعديل السعر'
      });
      if (!confirmed) return;
    }

    const ok = sellProductVariant(
      product.id,
      selectedColor,
      Number(quantity),
      customerName.trim(),
      effectiveUnitPrice,
      {
        paymentMethod,
        shopWalletId: paymentMethod === 'vodafone_cash' ? selectedWalletId : null,
        instapayAccountId: paymentMethod === 'instapay' ? selectedInstapayId : null
      }
    );

    if (ok) {
      handleClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="sell-product-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/65 overflow-hidden animate-scale-in"
    >
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 id="sell-product-title" className="text-base font-bold">
              تسجيل بيع / صرف من المخزون
            </h2>
            <p className="text-xs text-emerald-100">
              خصم فوري للكمية من لون الصنف المحدد
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Product Summary Card */}
      <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">
              {product.brand}
            </span>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {product.name}
            </h3>
            {product.storage && (
              <span className="text-xs font-semibold text-slate-500">
                {product.storage}
              </span>
            )}
          </div>

          <div className="text-left">
            <span className="text-[10px] text-slate-400 block">سعر البيع</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(product.salePrice)}
            </span>
          </div>
        </div>

        {/* Low Stock Warning if total is low */}
        {product.totalQuantity < (product.minStockAlert || 5) && (
          <div className="mt-3 flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>نواقص: متبقي إجمالي {product.totalQuantity} قطع فقط بالمحل!</span>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        
        {/* Color Variant Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span>اختر اللون المباع:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              متبقي من هذا اللون: <strong className={availableInColor > 0 ? 'text-emerald-600' : 'text-rose-600'}>{availableInColor} قطع</strong>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            {(product.variants || []).map((v) => {
              const isSelected = selectedColor === v.color;
              const hasStock = v.quantity > 0;

              return (
                <button
                  key={v.color}
                  type="button"
                  disabled={!hasStock}
                  onClick={() => setSelectedColor(v.color)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    !hasStock
                      ? 'opacity-40 bg-slate-100 dark:bg-slate-800 text-slate-400 border-dashed cursor-not-allowed'
                      : isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{v.color}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    hasStock ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'bg-rose-100 text-rose-600'
                  }`}>
                    {hasStock ? `${v.quantity} ق` : 'نفد'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity to sell */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              الكمية المباعة:
            </label>
            <input
              type="number"
              min="1"
              max={availableInColor || 1}
              required
              disabled={isOutOfStock}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(availableInColor, Number(e.target.value) || 1)))}
              className="w-full px-3 py-2 text-base font-black text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              سعر البيع الفعلي:
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ج.م
              </span>
            </div>
          </div>
        </div>

        {/* Customer / Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>اسم المشتري أو رقم الفاتورة (اختياري):</span>
          </label>
          <input
            type="text"
            placeholder="مثال: أ/ محمد سمير - كاش"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        {/* Loss Warning or Profit Preview Banner */}
        {isLossSale ? (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200 space-y-1 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-black">
              <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>⚠️ تحذير: سعر البيع أقل من سعر الشراء ({formatCurrency(unitCost)}) — هذه العملية ستحقق خسارة!</span>
            </div>
            <div className="text-[11px] font-bold flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <span>خسارة القطعة: <strong className="font-mono text-rose-700 dark:text-rose-300">-{formatCurrency(Math.abs(unitMargin))}</strong></span>
              <span>إجمالي الخسارة المتوقعة: <strong className="font-mono text-rose-700 dark:text-rose-300">-{formatCurrency(Math.abs(totalMargin))}</strong></span>
            </div>
          </div>
        ) : unitCost > 0 && unitMargin > 0 ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>صافي الربح المضاف لرأس المال:</span>
            </span>
            <span className="font-mono font-black">+{formatCurrency(totalMargin)} ({formatCurrency(unitMargin)}/قطعة)</span>
          </div>
        ) : null}

        {/* Treasury / Capital Collection Channel */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>استلام المبلغ وإضافته إلى رأس المال (الخزينة):</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {[
              { id: 'cash', label: 'كاش الدرج' },
              { id: 'vodafone_cash', label: 'فودافون كاش' },
              { id: 'instapay', label: 'إنستاباي' },
              { id: 'bank', label: 'تحويل بنكي' }
            ].map(ch => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setPaymentMethod(ch.id)}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                  paymentMethod === ch.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>

          {paymentMethod === 'vodafone_cash' && shopWallets.length > 0 && (
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-red-300 dark:border-red-900 rounded-xl text-slate-900 dark:text-white"
            >
              <option value="">-- اختر خط فودافون كاش المستلم --</option>
              {shopWallets.map(w => (
                <option key={w.id} value={w.id}>
                  {w.label} ({w.phoneNumber}) — رصيد: {formatCurrency(w.balance)}
                </option>
              ))}
            </select>
          )}

          {paymentMethod === 'instapay' && instapayAccounts.length > 0 && (
            <select
              value={selectedInstapayId}
              onChange={(e) => setSelectedInstapayId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-900 rounded-xl text-slate-900 dark:text-white"
            >
              <option value="">-- اختر حساب إنستاباي المستلم --</option>
              {instapayAccounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.accountName} ({a.ipaAddress || a.phoneNumber || 'IPA'}) — رصيد: {formatCurrency(a.balance)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Total Sale Value Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
            إجمالي المبلغ المحصل:
          </span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(effectiveUnitPrice * quantity)}
          </span>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={isOutOfStock}
            className="btn-interactive flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>تأكيد البيع والخصم من المخزن</span>
          </button>
        </div>

      </form>
    </dialog>
  );
}