import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { formatCurrency, formatNumber, formatDateArabic, formatTimeArabic } from '../utils/formatters';
import * as XLSX from 'xlsx';
import { 
  ArrowDownToLine, 
  Plus, 
  Trash2, 
  Percent, 
  Calculator, 
  FileSpreadsheet, 
  Printer, 
  RefreshCw, 
  Check, 
  ArrowRightLeft,
  DollarSign,
  TrendingDown,
  Info,
  Upload
} from 'lucide-react';

const STORAGE_KEY_ITEMS = 'elaasar_cash_inbound_items_v2';
const STORAGE_KEY_CONFIG = 'elaasar_cash_inbound_config_v2';

// Initial demo items matching the user's reference image
const INITIAL_DEMO_ITEMS = [
  { id: 'in-1', amount: 79183, label: 'إيداع توريدات مبيعات', date: new Date().toISOString() },
  { id: 'in-2', amount: 34750, label: 'حوالة عميل تجزئة', date: new Date().toISOString() },
  { id: 'in-3', amount: 25600, label: 'سداد دفعة بضاعة', date: new Date().toISOString() },
  { id: 'in-4', amount: 55000, label: 'إيداع كاش فودافون', date: new Date().toISOString() },
  { id: 'in-5', amount: 874480, label: 'تحويل بنكي / توريدات كبرى', date: new Date().toISOString() },
  { id: 'in-6', amount: 378600, label: 'دفعة حسابات فرع المحطة', date: new Date().toISOString() },
  { id: 'in-7', amount: 19975, label: 'مقبوضات نقدية', date: new Date().toISOString() },
  { id: 'in-8', amount: 100000, label: 'شحن رصيد محافظ', date: new Date().toISOString() },
  { id: 'in-9', amount: 71590, label: 'تحويلات متفرقة', date: new Date().toISOString() },
];

export default function InboundCalculatorView() {
  const { showToast, askConfirm } = useCash();

  // Inbound items list
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) return JSON.parse(saved);
      return INITIAL_DEMO_ITEMS;
    } catch {
      return INITIAL_DEMO_ITEMS;
    }
  });

  // Commission & calculation config
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
      return {
        commissionType: 'percentage', // 'percentage' | 'perThousand' | 'fixed'
        commissionRate: 0.5,          // e.g. 0.5% or 5 EGP per 1000
        commissionMode: 'deduct',     // 'deduct' (خصم من المبلغ) or 'add' (إضافة على المبلغ)
        targetAmount: 0               // Optional target/expected amount for difference
      };
    } catch {
      return {
        commissionType: 'percentage',
        commissionRate: 0.5,
        commissionMode: 'deduct',
        targetAmount: 0
      };
    }
  });

  // Quick inputs
  const [inputAmount, setInputAmount] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const fileInputRef = useRef(null);

  // Parse and import Excel files (.xlsx, .xls, .csv)
  const handleExcelFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          showToast('ملف الإكسل فارغ ولا يحتوي على بيانات', 'error');
          return;
        }

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

        const newItems = [];
        const ignoreKeywords = [
          'المجموع', 'بعد العموله', 'بعد العمولة', 'المتبقي', 'الإجمالي', 'الاجمالي',
          'total', 'sum', 'له', 'م', 'تاريخ', 'بيان', 'ملاحظات'
        ];

        rows.forEach((row, rowIdx) => {
          if (!Array.isArray(row)) return;

          // Check if this row is a summary or title row
          const rowText = row.map(c => String(c).trim().toLowerCase()).join(' ');
          const isSummaryRow = ignoreKeywords.some(kw => rowText.includes(kw.toLowerCase()));
          if (isSummaryRow && !row.some(c => typeof c === 'number' && c > 1000)) {
            return;
          }

          let foundAmount = null;
          let foundLabel = '';

          row.forEach(cell => {
            if (typeof cell === 'number' && cell > 0) {
              if (foundAmount === null) {
                foundAmount = cell;
              }
            } else if (typeof cell === 'string') {
              const cleanNum = cell.replace(/,/g, '').trim();
              const parsed = parseFloat(cleanNum);
              if (!isNaN(parsed) && parsed > 0 && foundAmount === null) {
                foundAmount = parsed;
              } else if (cell.trim().length > 1 && !ignoreKeywords.includes(cell.trim().toLowerCase())) {
                foundLabel = cell.trim();
              }
            }
          });

          if (foundAmount !== null && foundAmount > 0) {
            newItems.push({
              id: `in-${Date.now()}-${rowIdx}`,
              amount: foundAmount,
              label: foundLabel || `وارد ملف (${file.name}) #${newItems.length + 1}`,
              date: new Date().toISOString()
            });
          }
        });

        if (newItems.length > 0) {
          setItems(prev => [...newItems, ...prev]);
          showToast(`تم استيراد ${newItems.length} بند بنجاح من ملف "${file.name}"!`, 'success');
        } else {
          showToast('لم يتم العثور على مبالغ رقمية في ملف الإكسل المختار', 'error');
        }
      } catch (err) {
        console.error('Error reading Excel file:', err);
        showToast('حدث خطأ أثناء قراءة ملف الإكسل. يرجى التأكد من الملف.', 'error');
      } finally {
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Save items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }, [items]);

  // Save config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  // Calculations
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [items]);

  const commissionValue = useMemo(() => {
    const rate = Number(config.commissionRate) || 0;
    if (config.commissionType === 'percentage') {
      return (totalAmount * rate) / 100;
    } else if (config.commissionType === 'perThousand') {
      return (totalAmount / 1000) * rate;
    } else {
      return rate;
    }
  }, [totalAmount, config.commissionType, config.commissionRate]);

  const amountAfterCommission = useMemo(() => {
    if (config.commissionMode === 'add') {
      return totalAmount + commissionValue;
    } else {
      return totalAmount - commissionValue;
    }
  }, [totalAmount, commissionValue, config.commissionMode]);

  const difference = useMemo(() => {
    const target = Number(config.targetAmount) || 0;
    if (!target) return 0;
    return target - amountAfterCommission;
  }, [config.targetAmount, amountAfterCommission]);

  // Add single item
  const handleAddItem = (e) => {
    e.preventDefault();
    const num = Number(inputAmount);
    if (isNaN(num) || num <= 0) {
      showToast('يرجى إدخال مبلغ صحيح أكبر من صفر', 'error');
      return;
    }

    const newItem = {
      id: `in-${Date.now()}`,
      amount: num,
      label: inputLabel.trim() || `مبلغ وارد #${items.length + 1}`,
      date: new Date().toISOString()
    };

    setItems(prev => [newItem, ...prev]);
    setInputAmount('');
    setInputLabel('');
    showToast(`تمت إضافة ${formatCurrency(num)} إلى كشف الوارد`);
  };

  // Delete single item
  const handleDeleteItem = async (id, amt) => {
    const ok = await askConfirm({
      title: 'حذف سطر من الوارد',
      message: `هل أنت متأكد من حذف المبلغ (${formatCurrency(amt)}) من الكشف؟`,
      type: 'danger',
      confirmText: 'نعم، احذف',
      cancelText: 'إلغاء'
    });
    if (ok) {
      setItems(prev => prev.filter(i => i.id !== id));
      showToast('تم حذف السطر بنجاح');
    }
  };

  // Clear all items
  const handleClearAll = async () => {
    const ok = await askConfirm({
      title: 'تفريغ كشف الوارد بالكامل',
      message: 'هل أنت متأكد من مسح جميع المبالغ الواردة من الكشف للبدء من جديد؟',
      type: 'danger',
      confirmText: 'نعم، تفريغ الكشف',
      cancelText: 'تراجع'
    });
    if (ok) {
      setItems([]);
      showToast('تم تفريغ كشف الوارد');
    }
  };

  // Reset demo items
  const handleResetDemo = () => {
    setItems(INITIAL_DEMO_ITEMS);
    showToast('تمت استعادة نماذج الوارد المطابقة لجدول الإكسل');
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      showToast('لا توجد مبالغ لتصديرها', 'info');
      return;
    }

    const headers = ['م', 'المبلغ الوارد (له)', 'البيان', 'التاريخ والوقت'];
    const rows = items.map((item, idx) => [
      idx + 1,
      item.amount,
      `"${item.label.replace(/"/g, '""')}"`,
      `"${formatDateTimeArabic(item.date)}"`
    ]);

    rows.push([]);
    rows.push(['المجموع', totalAmount, '', '']);
    rows.push([
      `العمولة (${config.commissionRate}${config.commissionType === 'percentage' ? '%' : ' ج.م'})`,
      config.commissionMode === 'deduct' ? -commissionValue : commissionValue,
      config.commissionMode === 'deduct' ? 'مخصومة من المبلغ' : 'مضافة للمبلغ',
      ''
    ]);
    rows.push(['المبلغ النهائي (بعد العمولة)', amountAfterCommission, '', '']);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `كشف-الوارد-والعمولات-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير كشف الوارد إلى ملف إكسل بنجاح');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center shadow-md shadow-blue-500/20">
            <ArrowDownToLine className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>كشف المبالغ الواردة وحساب العمولات</span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                حساب "له"
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تجميع مبالغ التحويلات الواردة، تطبيق نسبة أو قيمة العمولة، وعرض الصافي فوراً
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Hidden File Input for Native File Explorer Picker */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls, .csv"
            onChange={handleExcelFileSelect}
            className="hidden"
          />

          {/* Direct File Picker Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-interactive flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm"
            title="فتح مستعرض ملفات الجهاز واختيار ملف إكسل (.xlsx, .xls, .csv)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>اختيار ملف إكسل</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-interactive flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            title="تصدير الكشف إلى ملف CSV / Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">تصدير إكسل</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn-interactive flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            title="طباعة كشف الوارد"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">طباعة</span>
          </button>

          <button
            onClick={handleClearAll}
            className="btn-interactive p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60"
            title="تفريغ الكشف بالكامل"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main KPI & Summary Cards (Inspired by the Excel table in the photo, elevated modern design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Sum (المجموع) */}
        <div className="card-hover bg-gradient-to-br from-blue-500/10 via-white to-blue-50/50 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 p-5 rounded-2xl border-2 border-blue-300 dark:border-blue-800/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
              المجموع (إجمالي الوارد)
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {items.length} مبالغ
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
            {formatCurrency(totalAmount)}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
            إجمالي كافة المبالغ الواردة المقيدة بكشف "له"
          </span>
        </div>

        {/* Card 2: Commission Config (نسبة أو مبلغ العمولة) */}
        <div className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-amber-500" />
              <span>نسبة / ضبط العمولة</span>
            </span>
            <select
              value={config.commissionType}
              onChange={(e) => setConfig(prev => ({ ...prev, commissionType: e.target.value }))}
              className="text-[11px] font-bold bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-amber-500"
            >
              <option value="percentage">نسبة مئوية (%)</option>
              <option value="perThousand">مبلغ لكل 1000 ج.م</option>
              <option value="fixed">مبلغ ثابت (ج.م)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="any"
                min="0"
                value={config.commissionRate}
                onChange={(e) => setConfig(prev => ({ ...prev, commissionRate: e.target.value }))}
                className="w-full pl-8 pr-3 py-1.5 text-base font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {config.commissionType === 'percentage' ? '%' : 'ج.م'}
              </span>
            </div>

            {/* Mode switch: Deduct vs Add */}
            <button
              onClick={() => setConfig(prev => ({ ...prev, commissionMode: prev.commissionMode === 'deduct' ? 'add' : 'deduct' }))}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                config.commissionMode === 'deduct'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
              }`}
              title="التبديل بين خصم العمولة من المبلغ أو إضافتها عليه"
            >
              {config.commissionMode === 'deduct' ? 'خصم (-)' : 'إضافة (+)'}
            </button>
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 pt-1">
            <span>قيمة العمولة المحسوبة:</span>
            <strong className="text-amber-600 dark:text-amber-400 font-bold">
              {formatCurrency(commissionValue)}
            </strong>
          </div>
        </div>

        {/* Card 3: After Commission (بعد العموله) - Highlighted */}
        <div className="card-hover bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-5 rounded-2xl shadow-lg shadow-indigo-600/20 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-100 flex items-center gap-1">
              <Calculator className="w-4 h-4" />
              <span>بعد العموله</span>
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-white">
              {config.commissionMode === 'deduct' ? 'صافي بعد الخصم' : 'إجمالي مع الإضافة'}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
            {formatCurrency(amountAfterCommission)}
          </div>
          <span className="text-[11px] text-indigo-100 mt-2 block">
            {config.commissionMode === 'deduct' 
              ? `${formatCurrency(totalAmount)} - ${formatCurrency(commissionValue)} عمولة`
              : `${formatCurrency(totalAmount)} + ${formatCurrency(commissionValue)} عمولة`}
          </span>
        </div>

        {/* Card 4: Target & Difference (المتبقي) */}
        <div className="card-hover bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              المبلغ المطلوب / المستهدف
            </span>
            <span className="text-[10px] text-slate-400">مقارنة</span>
          </div>

          <input
            type="number"
            step="any"
            placeholder="المبلغ المتوقع (اختياري)..."
            value={config.targetAmount || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, targetAmount: e.target.value }))}
            className="w-full px-3 py-1.5 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">الفارق (المتبقي):</span>
            <span className={`font-black font-mono text-sm ${
              difference < 0 
                ? 'text-rose-600 dark:text-rose-400' 
                : difference > 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {formatCurrency(difference)}
            </span>
          </div>
        </div>

      </div>

      {/* Fast Input Bar for New Inbound Amounts */}
      <form onSubmit={handleAddItem} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        
        {/* Amount Input */}
        <div className="relative flex-1 w-full">
          <input
            type="number"
            step="any"
            required
            placeholder="أدخل المبلغ الوارد (مثال: 79183)..."
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 text-base font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
            ج.م
          </span>
        </div>

        {/* Label / Description */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="البيان / جهة الإيداع (اختياري)..."
            value={inputLabel}
            onChange={(e) => setInputLabel(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!inputAmount}
          className="btn-interactive w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة للكشف</span>
        </button>

      </form>

      {/* The Ledger Table matching the photo (له / المجموع / بعد العموله) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              جدول المبالغ الواردة المقيدة (له)
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {items.length} بند
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleResetDemo}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 font-semibold"
              title="إعادة تحميل المبالغ التجريبية المطابقة للصورة"
            >
              <RefreshCw className="w-3 h-3" />
              <span>إعادة النموذج</span>
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center px-4">
            <ArrowDownToLine className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
              الكشف فارغ حالياً
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-4">
              يمكنك كتابة المبالغ وإضافتها بالأعلى، أو الضغط على "اختيار ملف إكسل" لرفع ملف إكسل مباشرة.
            </p>
            <button
              onClick={handleResetDemo}
              className="btn-interactive inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحميل مبالغ تجريبية</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-black border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 text-base font-black text-blue-700 dark:text-blue-300 w-52">
                    له (المبلغ الوارد)
                  </th>
                  <th className="py-3.5 px-4">البيان / ملاحظة الإيداع</th>
                  <th className="py-3.5 px-4 w-44">التوقيت والتاريخ</th>
                  <th className="py-3.5 px-4 w-20 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-400">
                      {index + 1}
                    </td>

                    {/* Amount "له" column styled identically to the photo */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-base font-black text-slate-900 dark:text-white" dir="ltr">
                      {formatNumber(item.amount)}
                      <span className="text-xs text-slate-400 font-normal mr-1"> ج.م</span>
                    </td>

                    {/* Label */}
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {item.label}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                      <div>{formatDateArabic(item.date)}</div>
                      <div className="text-[10px] text-slate-400">{formatTimeArabic(item.date)}</div>
                    </td>

                    {/* Delete Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDeleteItem(item.id, item.amount)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="حذف هذا البند"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Exact Styled Footer Summary Matching The Photo */}
              <tfoot>
                {/* 1. صف المجموع */}
                <tr className="bg-blue-500/15 dark:bg-blue-950/50 border-t-2 border-blue-400 dark:border-blue-700 font-black">
                  <td className="py-3.5 px-4 text-center text-blue-700 dark:text-blue-300 text-xs">
                    ∑
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xl text-blue-700 dark:text-blue-300" dir="ltr">
                    {formatNumber(totalAmount)}
                    <span className="text-xs font-bold mr-1"> ج.م</span>
                  </td>
                  <td className="py-3.5 px-4 text-blue-800 dark:text-blue-200 font-bold text-sm" colSpan={3}>
                    المجموع (إجمالي المبالغ المقيدة)
                  </td>
                </tr>

                {/* 2. صف بعد العموله */}
                <tr className="bg-indigo-600 dark:bg-indigo-900 text-white font-black">
                  <td className="py-3.5 px-4 text-center text-indigo-200 text-xs">
                    %
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xl text-white tracking-wide" dir="ltr">
                    {formatNumber(amountAfterCommission)}
                    <span className="text-xs text-indigo-200 font-bold mr-1"> ج.م</span>
                  </td>
                  <td className="py-3.5 px-4 text-white text-sm" colSpan={3}>
                    <div className="flex items-center gap-2">
                      <span>بعد العموله</span>
                      <span className="text-xs text-indigo-200 font-normal">
                        ({config.commissionMode === 'deduct' ? 'مخصوم منها' : 'مضاف إليها'} عمولة بقيمة {formatCurrency(commissionValue)} بمعدل {config.commissionRate}{config.commissionType === 'percentage' ? '%' : ' ج.م'})
                      </span>
                    </div>
                  </td>
                </tr>

                {/* 3. صف المتبقي / الفارق (إن وجد) */}
                {config.targetAmount > 0 && (
                  <tr className="bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 font-bold text-xs">
                    <td className="py-2.5 px-4 text-center text-slate-400">
                      Δ
                    </td>
                    <td className={`py-2.5 px-4 font-mono text-base font-black ${
                      difference < 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`} dir="ltr">
                      {formatNumber(difference)} ج.م
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400" colSpan={3}>
                      المتبقي / الفارق عن المبلغ المستهدف ({formatCurrency(config.targetAmount)})
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
