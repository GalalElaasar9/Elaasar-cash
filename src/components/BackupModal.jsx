import React, { useRef, useEffect } from 'react';
import { useCash } from '../context/CashContext';
import { Database, Download, Upload, RefreshCw, Trash2, X, ShieldAlert } from 'lucide-react';

export default function BackupModal() {
  const { 
    activeModal, 
    setActiveModal, 
    handleExport, 
    handleImport, 
    handleResetDemo, 
    handleClearAll,
    askConfirm,
    showAlert 
  } = useCash();

  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'backup') {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal]);

  const handleClose = () => {
    setActiveModal(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result);
        const ok = handleImport(json);
        if (ok) handleClose();
      } catch (err) {
        showAlert({
          title: 'خطأ في استيراد الملف',
          message: 'تعذر قراءة ملف النسخة الاحتياطية. يرجى التأكد من اختيار ملف JSON صحيح تم تصديره من المنظومة.',
          type: 'danger'
        });
      }
    };
    reader.readAsText(file);
  };

  if (activeModal !== 'backup') return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="backup-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/60 overflow-hidden"
    >
      <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-600/20 text-red-500">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 id="backup-title" className="text-base font-bold">
              إدارة البيانات والنسخ الاحتياطي
            </h2>
            <p className="text-xs text-slate-400">
              حفظ واسترجاع بيانات العملاء والمحافظ والتحويلات
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="p-1 text-slate-400 hover:text-white rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        
        {/* Export Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              تصدير نسخة احتياطية
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تنزيل ملف JSON يحتوي على كافة العملاء وأرقامهم وسجل التحويلات ومخزون الهواتف والإكسسوارات.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>تصدير</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              استيراد نسخة سابقة
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              رفع ملف JSON تم تصديره مسبقاً لاستعادة البيانات.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>استيراد</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Demo reset Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              استعادة البيانات التجريبية
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              إعادة تحميل بيانات واقعية تجريبية لمحافظ فودافون كاش.
            </p>
          </div>
          <button
            onClick={async () => {
              const ok = await askConfirm({
                title: 'استعادة البيانات التجريبية',
                message: 'هل ترغب في استرجاع نماذج البيانات الافتراضية؟',
                details: 'سيتم استبدال البيانات الحالية بمجموعة من العملاء والمحافظ التجريبية لاختبار النظام.',
                type: 'warning',
                confirmText: 'نعم، استعادة النماذج',
                cancelText: 'إلغاء'
              });
              if (ok) {
                handleResetDemo();
                handleClose();
              }
            }}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>استعادة</span>
          </button>
        </div>

        {/* Clear All Card */}
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300">
              مسح جميع البيانات
            </h4>
            <p className="text-xs text-rose-600 dark:text-rose-400">
              حذف كافة العملاء والمحافظ والتحويلات للبدء من الصفر.
            </p>
          </div>
          <button
            onClick={async () => {
              const ok = await askConfirm({
                title: 'تحذير: مسح كافة البيانات نهائياً',
                message: 'هل أنت متأكد تماماً من رغبتك في حذف جميع العملاء والمحافظ والعمليات بالكامل؟',
                details: 'هذا الإجراء جذري ولا يمكن التراجع عنه. ستعود المنظومة فارغة تماماً وكأنها جديدة.',
                type: 'danger',
                confirmText: 'نعم، مسح كل شيء الآن',
                cancelText: 'تراجع وإلغاء'
              });
              if (ok) {
                handleClearAll();
                handleClose();
              }
            }}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>مسح الكل</span>
          </button>
        </div>

      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300"
        >
          إغلاق
        </button>
      </div>

    </dialog>
  );
}
