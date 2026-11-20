import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { PackagePlus, X, Plus, Palette } from 'lucide-react';

export default function RestockModal() {
  const { activeModal, setActiveModal, modalData, restockProductVariant, showToast } = useCash();
  const dialogRef = useRef(null);

  const product = modalData?.product;

  const [selectedColor, setSelectedColor] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [quantity, setQuantity] = useState(5);
  const [isAddingNewColor, setIsAddingNewColor] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'restockProduct') {
      if (!dialog.open) dialog.showModal();

      if (product) {
        setSelectedColor(product.variants?.[0]?.color || '');
        setNewColorName('');
        setQuantity(5);
        setIsAddingNewColor(false);
      }
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, modalData, product]);

  const handleClose = () => {
    setActiveModal(null);
  };

  if (activeModal !== 'restockProduct' || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const colorToUse = isAddingNewColor ? newColorName.trim() : selectedColor;

    if (!colorToUse) {
      showToast('يرجى تحديد أو كتابة اسم اللون المراد توريده', 'error');
      return;
    }

    if (quantity <= 0) {
      showToast('يرجى إدخال كمية أكبر من صفر', 'error');
      return;
    }

    restockProductVariant(product.id, colorToUse, Number(quantity));
    handleClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="restock-product-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/65 overflow-hidden animate-scale-in"
    >
      <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/20">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <h2 id="restock-product-title" className="text-base font-bold">
              توريد وإضافة كمية جديدة للمخزن
            </h2>
            <p className="text-xs text-blue-100">
              زيادة الرصيد المتاح للون حالي أو إضافة لون جديد
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

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        
        <div>
          <span className="text-[11px] text-slate-400 block">{product.brand}</span>
          <h3 className="text-base font-black text-slate-900 dark:text-white">{product.name}</h3>
          <span className="text-xs text-slate-500">إجمالي المخزون الحالي: {product.totalQuantity} قطع</span>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>اللون المراد توريده:</span>
            <button
              type="button"
              onClick={() => setIsAddingNewColor(!isAddingNewColor)}
              className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
            >
              {isAddingNewColor ? 'اختر من الألوان الحالية' : '+ توريد لون جديد لم يكن موجوداً'}
            </button>
          </label>

          {isAddingNewColor ? (
            <input
              type="text"
              required
              placeholder="اكتب اسم اللون الجديد (مثال: تيتانيوم رمادي)..."
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
            />
          ) : (
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
            >
              {(product.variants || []).map(v => (
                <option key={v.color} value={v.color}>
                  {v.color} (الموجود حالياً: {v.quantity} قطع)
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            الكمية المضافة (عدد القطع الموردة):
          </label>
          <input
            type="number"
            min="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            className="w-full px-3 py-2.5 text-lg font-black text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="btn-interactive flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة إلى رصيد المخزن</span>
          </button>
        </div>

      </form>
    </dialog>
  );
}