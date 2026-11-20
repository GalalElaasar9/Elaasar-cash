import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { 
  X, 
  Smartphone, 
  Package, 
  Palette, 
  AlertTriangle, 
  ShoppingBag, 
  PackagePlus, 
  Edit2, 
  CheckCircle2, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  Info,
  Image as ImageIcon
} from 'lucide-react';

export default function ProductDetailsModal() {
  const { activeModal, setActiveModal, modalData, setModalData } = useCash();
  const dialogRef = useRef(null);

  const product = modalData?.product;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'productDetails') {
      if (!dialog.open) dialog.showModal();
      setSelectedImageIndex(0);
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, modalData]);

  const handleClose = () => {
    setActiveModal(null);
  };

  if (activeModal !== 'productDetails' || !product) return null;

  const images = Array.isArray(product.images) && product.images.length > 0 
    ? product.images 
    : [];

  const currentMainImage = images[selectedImageIndex] || images[0] || null;

  const threshold = product.minStockAlert !== undefined ? product.minStockAlert : 5;
  const isLow = product.totalQuantity > 0 && product.totalQuantity < threshold;
  const isOut = product.totalQuantity === 0;
  const unitProfit = Math.max(0, (product.salePrice || 0) - (product.costPrice || 0));

  const handleOpenSell = () => {
    handleClose();
    setTimeout(() => {
      setModalData({ product });
      setActiveModal('sellProduct');
    }, 150);
  };

  const handleOpenRestock = () => {
    handleClose();
    setTimeout(() => {
      setModalData({ product });
      setActiveModal('restockProduct');
    }, 150);
  };

  const handleOpenEdit = () => {
    handleClose();
    setTimeout(() => {
      setModalData({ product });
      setActiveModal('addProduct');
    }, 150);
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="product-details-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/65 overflow-hidden animate-scale-in"
    >
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-600/20 text-red-500">
            {product.category === 'phones' ? <Smartphone className="w-5 h-5" /> : <Package className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">{product.brand}</span>
            <h2 id="product-details-title" className="text-base sm:text-lg font-black tracking-tight">
              {product.name}
            </h2>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        
        {/* Top Section: Interactive Gallery (Main + Sub Images) & Core Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
          
          {/* Gallery Column (5 cols) */}
          <div className="sm:col-span-5 space-y-3">
            
            {/* Main Image Display */}
            <div className="relative aspect-square w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 overflow-hidden flex items-center justify-center group shadow-inner">
              {currentMainImage ? (
                <img
                  src={currentMainImage}
                  alt={product.name}
                  className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <ImageIcon className="w-12 h-12 mb-2 stroke-1" />
                  <span className="text-xs">لا توجد صورة مرفوعة</span>
                </div>
              )}

              {/* Tag indicating active image */}
              {images.length > 0 && (
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-900/80 text-white backdrop-blur-sm">
                  {selectedImageIndex === 0 ? 'الصورة الرئيسية' : `صورة فرعية #${selectedImageIndex}`}
                </span>
              )}
            </div>

            {/* Sub-Images (Thumbnails) Row with Interactive Swap */}
            {images.length > 1 && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                  الصور الفرعية (اضغط لعرضها مكان الرئيسية):
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                        selectedImageIndex === idx
                          ? 'border-red-500 ring-2 ring-red-500/30 scale-105 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                      title={idx === 0 ? 'الصورة الرئيسية' : `صورة إضافية ${idx}`}
                    >
                      <img src={img} alt={`sub-${idx}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-red-600 text-[8px] text-white text-center font-bold">
                          رئيسية
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Details & Specs Column (7 cols) */}
          <div className="sm:col-span-7 space-y-3.5">
            
            {/* Status & Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-xl ${
                product.category === 'phones' 
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
              }`}>
                {product.category === 'phones' ? 'هاتف محمول' : 'إكسسوار ومستلزمات'}
              </span>

              {product.storage && (
                <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {product.storage}
                </span>
              )}

              {isOut ? (
                <span className="px-2.5 py-1 text-xs font-black rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  ⛔ نفد بالكامل (0 قطع)
                </span>
              ) : isLow ? (
                <span className="px-2.5 py-1 text-xs font-black rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                  ⚠️ نواقص ({product.totalQuantity} متبقي)
                </span>
              ) : (
                <span className="px-2.5 py-1 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                  <span>متوفر ({product.totalQuantity} قطع)</span>
                </span>
              )}
            </div>

            {/* Low stock alert banner */}
            {isLow && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>تنبيه: متبقي أقل من {threshold} قطع في المحل. يرجى تجهيز طلبية توريد جديدة.</span>
              </div>
            )}

            {/* Price Box */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">سعر التكلفة (الشراء):</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-200 font-mono">
                  {formatCurrency(product.costPrice)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block font-semibold">سعر البيع للجمهور:</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(product.salePrice)}
                </span>
              </div>

              <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">الربح التقديري لكل قطعة:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  +{formatCurrency(unitProfit)}
                </strong>
              </div>

              <div className="col-span-2 flex items-center justify-between text-xs text-slate-500">
                <span>إجمالي رأس مال الصنف بالمحل:</span>
                <strong className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {formatCurrency(product.costPrice * product.totalQuantity)}
                </strong>
              </div>
            </div>

            {product.notes && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold block text-[10px] text-slate-400 mb-0.5">ملاحظات وضمان:</span>
                {product.notes}
              </div>
            )}

          </div>

        </div>

        {/* Color Variants Breakdown Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-3 sm:p-3.5 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 min-w-0">
              <Palette className="w-4 h-4 text-red-600 shrink-0" />
              <span className="truncate">الألوان والكميات المتاحة:</span>
            </h4>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 text-xs font-mono font-black text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs whitespace-nowrap shrink-0">
              <span className="text-[10px] font-normal text-slate-400">الإجمالي:</span>
              <span>{product.totalQuantity} قطع</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">اللون</th>
                  <th className="py-2.5 px-2 sm:px-4 text-center whitespace-nowrap">الكمية المتاحة</th>
                  <th className="py-2.5 px-3 sm:px-4 text-left whitespace-nowrap">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(product.variants || []).map((v, i) => {
                  const hasStock = v.quantity > 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 sm:px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 shrink-0 shadow-2xs"
                            style={{ backgroundColor: v.hex || '#1e293b' }}
                          />
                          <span className={`font-bold text-xs sm:text-sm whitespace-nowrap ${hasStock ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 line-through'}`}>
                            {v.color}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-2 sm:px-4 text-center font-mono font-black text-xs sm:text-sm whitespace-nowrap">
                        <span className={hasStock ? 'text-slate-900 dark:text-white' : 'text-rose-500'}>
                          {v.quantity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal mr-1">قطع</span>
                      </td>

                      <td className="py-2.5 px-3 sm:px-4 text-left whitespace-nowrap">
                        {hasStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>جاهز للبيع</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>نفد اللون</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons inside modal */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEdit}
              className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>تعديل الصنف</span>
            </button>

            <button
              onClick={handleOpenRestock}
              className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-bold border border-blue-200 dark:border-blue-800"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>توريد كمية</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
            >
              إغلاق
            </button>

            <button
              onClick={handleOpenSell}
              disabled={isOut}
              className={`btn-interactive flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-xs shadow-md ${
                isOut
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>تسجيل بيع الآن</span>
            </button>
          </div>

        </div>

      </div>
    </dialog>
  );
}