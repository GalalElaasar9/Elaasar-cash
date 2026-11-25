import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  formatNumber, 
  formatDateArabic, 
  formatTimeArabic, 
  formatDateTimeArabic 
} from '../utils/formatters';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
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
  Play, 
  Square, 
  Clock, 
  Calendar, 
  History, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Moon, 
  Sun,
  X,
  FileText,
  Download,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const STORAGE_KEY_ITEMS = 'elaasar_cash_inbound_items_v2';
const STORAGE_KEY_CONFIG = 'elaasar_cash_inbound_config_v2';
const STORAGE_KEY_SHIFT = 'elaasar_cash_inbound_shift_session_v2';
const STORAGE_KEY_ARCHIVE = 'elaasar_cash_inbound_days_archive_v2';

// Helper to get today's date formatted as YYYY-MM-DD
function getLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function InboundCalculatorView() {
  const { showToast, askConfirm } = useCash();

  // 1. Shift Session State (Active day vs Closed)
  const [shiftSession, setShiftSession] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHIFT);
      if (saved) return JSON.parse(saved);

      // Default initial shift for today so the user can immediately use it
      const now = new Date();
      const dateKey = getLocalDateKey(now);
      return {
        isActive: true,
        shiftId: `shift-${dateKey}-${Date.now()}`,
        businessDate: dateKey,
        businessDateLabel: formatDateArabic(now),
        startedAt: now.toISOString(),
        startedAtTimeStr: formatTimeArabic(now)
      };
    } catch {
      const now = new Date();
      const dateKey = getLocalDateKey(now);
      return {
        isActive: true,
        shiftId: `shift-${dateKey}-${Date.now()}`,
        businessDate: dateKey,
        businessDateLabel: formatDateArabic(now),
        startedAt: now.toISOString(),
        startedAtTimeStr: formatTimeArabic(now)
      };
    }
  });

  // 2. Archived Days (History of closed shifts)
  const [archivedDays, setArchivedDays] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ARCHIVE);
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  // 3. Inbound items list for the current active shift
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
  });

  // 4. Commission & calculation config
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

  // UI Modals & Views
  const [isEndDayModalOpen, setIsEndDayModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [selectedArchiveDay, setSelectedArchiveDay] = useState(null);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');

  // Quick inputs
  const [inputAmount, setInputAmount] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const fileInputRef = useRef(null);

  // Check if current clock date is past midnight compared to active shift's business date
  const isPastMidnight = useMemo(() => {
    if (!shiftSession?.isActive || !shiftSession?.businessDate) return false;
    const todayKey = getLocalDateKey(new Date());
    return todayKey !== shiftSession.businessDate;
  }, [shiftSession]);

  // Persist shift session
  useEffect(() => {
    try {
      if (shiftSession) {
        localStorage.setItem(STORAGE_KEY_SHIFT, JSON.stringify(shiftSession));
      } else {
        localStorage.removeItem(STORAGE_KEY_SHIFT);
      }
    } catch (e) {
      console.error(e);
    }
  }, [shiftSession]);

  // Persist archived days
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ARCHIVE, JSON.stringify(archivedDays));
    } catch (e) {
      console.error(e);
    }
  }, [archivedDays]);

  // Persist items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  }, [items]);

  // Persist config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }, [config]);

  // Financial Calculations
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

  // Trigger celebration confetti
  const fireCelebration = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-ensure shift is open if user adds data
  const ensureShiftActive = () => {
    if (!shiftSession?.isActive) {
      const now = new Date();
      const dateKey = getLocalDateKey(now);
      const newSession = {
        isActive: true,
        shiftId: `shift-${dateKey}-${Date.now()}`,
        businessDate: dateKey,
        businessDateLabel: formatDateArabic(now),
        startedAt: now.toISOString(),
        startedAtTimeStr: formatTimeArabic(now)
      };
      setShiftSession(newSession);
      return newSession;
    }
    return shiftSession;
  };

  // Action: Start Day (بدء اليوم)
  const handleStartDay = async () => {
    if (items.length > 0) {
      const ok = await askConfirm({
        title: 'بدء وردية يوم جديد وتصفير الكشف',
        message: `يوجد حالياً ${items.length} بند بإجمالي (${formatCurrency(totalAmount)}) في الكشف. بدء يوم جديد سيقوم بتصفير الكشف وحفظ تاريخ اليوم لحساب العمليات القادمة. هل تريد البدء الآن؟`,
        type: 'warning',
        confirmText: 'نعم، ابدأ اليوم وصفر الكشف',
        cancelText: 'إلغاء'
      });
      if (!ok) return;
    }

    const now = new Date();
    const dateKey = getLocalDateKey(now);
    const dateLabel = formatDateArabic(now);
    const timeStr = formatTimeArabic(now);

    const newSession = {
      isActive: true,
      shiftId: `shift-${dateKey}-${Date.now()}`,
      businessDate: dateKey,
      businessDateLabel: dateLabel,
      startedAt: now.toISOString(),
      startedAtTimeStr: timeStr
    };

    setItems([]); // Reset active table
    setShiftSession(newSession);
    fireCelebration();
    showToast(`تم بدء وردية اليوم بنجاح (${dateLabel})، والكشف متصفر وجاهز لاستقبال العمليات!`, 'success');
  };

  // Action: Open End Day Confirmation Modal (إنهاء اليوم)
  const handleOpenEndDayModal = () => {
    if (!shiftSession?.isActive) {
      showToast('اليوم غير مفتوح حالياً. اضغط على "بدء اليوم" أولاً.', 'info');
      return;
    }
    setIsEndDayModalOpen(true);
  };

  // Action: Confirm End Day & Reset (تأكيد إنهاء اليوم وتصفير الكشف)
  const handleConfirmEndDay = () => {
    try {
      const now = new Date();
      const endClockDate = getLocalDateKey(now);

      // Robust fallbacks for shift session fields
      const bDate = shiftSession?.businessDate || getLocalDateKey(now);
      const bLabel = shiftSession?.businessDateLabel || formatDateArabic(now);
      const sAt = shiftSession?.startedAt || now.toISOString();
      const sAtTime = shiftSession?.startedAtTimeStr || formatTimeArabic(now);
      const endedPastMidnight = endClockDate !== bDate;

      const safeItems = Array.isArray(items) ? [...items] : [];

      // Archive this shift under the original business date when it was started!
      const closedShift = {
        id: `archived-${bDate}-${Date.now()}`,
        businessDate: bDate, // LOCKED to start date!
        businessDateLabel: bLabel,
        startedAt: sAt,
        startedAtTimeStr: sAtTime,
        endedAt: now.toISOString(),
        endedAtTimeStr: formatTimeArabic(now),
        endedClockDate: endClockDate,
        isPastMidnightEnd: !!endedPastMidnight,
        totalAmount: Number(totalAmount) || 0,
        commissionValue: Number(commissionValue) || 0,
        commissionRate: config?.commissionRate ?? 0.5,
        commissionType: config?.commissionType || 'percentage',
        commissionMode: config?.commissionMode || 'deduct',
        amountAfterCommission: Number(amountAfterCommission) || 0,
        targetAmount: Number(config?.targetAmount) || 0,
        difference: Number(difference) || 0,
        itemsCount: safeItems.length,
        items: safeItems,
        closedAt: now.toISOString()
      };

      const nextShiftState = {
        isActive: false,
        businessDate: bDate,
        businessDateLabel: bLabel,
        lastClosedDate: bDate,
        lastClosedDateLabel: bLabel,
        lastEndedAt: now.toISOString(),
        lastEndedAtTimeStr: formatTimeArabic(now),
        lastTotal: Number(totalAmount) || 0,
        lastCount: safeItems.length,
        lastPastMidnight: !!endedPastMidnight
      };

      // 1. Direct Synchronous LocalStorage Update to guarantee zero data loss & instant persistence
      try {
        let currentArchive = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY_ARCHIVE);
          if (raw) currentArchive = JSON.parse(raw);
          if (!Array.isArray(currentArchive)) currentArchive = [];
        } catch {
          currentArchive = [];
        }
        const updatedArchive = [closedShift, ...currentArchive];
        localStorage.setItem(STORAGE_KEY_ARCHIVE, JSON.stringify(updatedArchive));
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEY_SHIFT, JSON.stringify(nextShiftState));
        window.dispatchEvent(new Event('storage'));
      } catch (storageErr) {
        console.error('LocalStorage write error in handleConfirmEndDay:', storageErr);
      }

      // 2. Update React States
      setArchivedDays(prev => {
        const arr = Array.isArray(prev) ? prev : [];
        return [closedShift, ...arr];
      });
      setItems([]);
      setShiftSession(nextShiftState);

      // 3. Close Modal Immediately
      setIsEndDayModalOpen(false);

      // 4. Celebration & Notification
      try {
        fireCelebration();
      } catch (confettiErr) {
        console.error('Confetti error:', confettiErr);
      }

      if (endedPastMidnight) {
        showToast(`تم إنهاء اليوم وحفظ الوردية بنجاح لحساب يوم (${bLabel}) رغم الإغلاق بعد منتصف الليل، وتصفير الكشف!`, 'success');
      } else {
        showToast(`تم إنهاء اليوم وحفظ الوردية بنجاح بتاريخ (${bLabel}) وتصفير الكشف!`, 'success');
      }
    } catch (err) {
      console.error('CRITICAL: handleConfirmEndDay caught error:', err);
      // Guarantee modal closes and screen resets even in edge case
      setIsEndDayModalOpen(false);
      setItems([]);
      showToast('تم إنهاء اليوم وتصفير الكشف بنجاح', 'success');
    }
  };

  // Add single item
  const handleAddItem = (e) => {
    e.preventDefault();
    const num = Number(inputAmount);
    if (isNaN(num) || num <= 0) {
      showToast('يرجى إدخال مبلغ صحيح أكبر من صفر', 'error');
      return;
    }

    ensureShiftActive();

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

  // Clear all items manually
  const handleClearAll = async () => {
    const ok = await askConfirm({
      title: 'تفريغ كشف الوارد بالكامل',
      message: 'هل أنت متأكد من مسح جميع المبالغ الواردة من الكشف للبدء من جديد؟ (لن تُحفظ في الأرشيف إذا قمت بالتفريغ اليدوي)',
      type: 'danger',
      confirmText: 'نعم، تفريغ الكشف',
      cancelText: 'تراجع'
    });
    if (ok) {
      setItems([]);
      showToast('تم تفريغ كشف الوارد');
    }
  };

  // Parse and import Excel files (.xlsx, .xls, .csv)
  const handleExcelFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    ensureShiftActive();

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

  // Export current active items to CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      showToast('لا توجد مبالغ لتصديرها', 'info');
      return;
    }

    const dayLabel = shiftSession?.businessDateLabel || formatDateArabic(new Date());
    const dateFileKey = shiftSession?.businessDate || getLocalDateKey(new Date());

    const headers = ['م', 'المبلغ الوارد (له)', 'البيان', 'التاريخ والوقت'];
    const rows = items.map((item, idx) => [
      idx + 1,
      item.amount,
      `"${(item.label || '').replace(/"/g, '""')}"`,
      `"${formatDateTimeArabic(item.date)}"`
    ]);

    rows.push([]);
    rows.push([`كشف يوم: ${dayLabel}`, '', '', '']);
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
    a.download = `كشف-الوارد-${dateFileKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير كشف الوارد إلى ملف إكسل بنجاح');
  };

  // Export a past archived day to CSV
  const handleExportArchivedDayCSV = (day) => {
    if (!day || !day.items || day.items.length === 0) {
      showToast('لا توجد بيانات لهذا اليوم لتصديرها', 'info');
      return;
    }

    const headers = ['م', 'المبلغ الوارد (له)', 'البيان', 'التاريخ والوقت'];
    const rows = day.items.map((item, idx) => [
      idx + 1,
      item.amount,
      `"${(item.label || '').replace(/"/g, '""')}"`,
      `"${formatDateTimeArabic(item.date)}"`
    ]);

    rows.push([]);
    rows.push([`أرشيف يومية: ${day.businessDateLabel}`, '', '', '']);
    rows.push([`وقت الوردية: من ${day.startedAtTimeStr} إلى ${day.endedAtTimeStr}`, '', '', '']);
    if (day.isPastMidnightEnd) {
      rows.push(['ملاحظة: انتهت الوردية بعد منتصف الليل ومحسوبة بالكامل لحساب هذا اليوم', '', '', '']);
    }
    rows.push(['المجموع', day.totalAmount, '', '']);
    rows.push([
      `العمولة (${day.commissionRate}${day.commissionType === 'percentage' ? '%' : ' ج.م'})`,
      day.commissionMode === 'deduct' ? -day.commissionValue : day.commissionValue,
      day.commissionMode === 'deduct' ? 'مخصومة من المبلغ' : 'مضافة للمبلغ',
      ''
    ]);
    rows.push(['المبلغ النهائي (بعد العمولة)', day.amountAfterCommission, '', '']);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `أرشيف-وارد-${day.businessDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`تم تصدير يومية ${day.businessDateLabel} بنجاح!`);
  };

  // Delete a day from archive
  const handleDeleteArchivedDay = async (dayId, dayLabel) => {
    const ok = await askConfirm({
      title: 'حذف يومية من الأرشيف',
      message: `هل أنت متأكد من حذف سجل يومية (${dayLabel}) نهائياً من الأرشيف؟ لا يمكن التراجع عن هذا الإجراء.`,
      type: 'danger',
      confirmText: 'نعم، احذف السجل',
      cancelText: 'إلغاء'
    });
    if (ok) {
      setArchivedDays(prev => prev.filter(d => d.id !== dayId));
      if (selectedArchiveDay?.id === dayId) {
        setSelectedArchiveDay(null);
      }
      showToast('تم حذف اليومية من الأرشيف بنجاح');
    }
  };

  // Filter archived days
  const filteredArchivedDays = useMemo(() => {
    if (!archiveSearchQuery.trim()) return archivedDays;
    const q = archiveSearchQuery.trim().toLowerCase();
    return archivedDays.filter(day => {
      const dateStr = (day.businessDate || '').toLowerCase();
      const labelStr = (day.businessDateLabel || '').toLowerCase();
      const matchItem = day.items?.some(i => (i.label || '').toLowerCase().includes(q));
      return dateStr.includes(q) || labelStr.includes(q) || matchItem;
    });
  }, [archivedDays, archiveSearchQuery]);

  return (
    <div className="space-y-6">
      
      {/* 1. Daily Shift Session Banner & Master Controls (نظام الوردية اليومية) */}
      <div className={`rounded-2xl p-4 sm:p-5 border shadow-sm transition-all ${
        shiftSession?.isActive
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 border-emerald-300 dark:border-emerald-800/80 bg-white dark:bg-slate-900'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Status Details */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              shiftSession?.isActive
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-emerald-500/25 ring-4 ring-emerald-500/20'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              {shiftSession?.isActive ? (
                <Clock className="w-6 h-6 animate-pulse" />
              ) : (
                <Moon className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>كشف المبالغ الواردة وحساب العمولات ("له")</span>
                </h2>

                {/* Shift Status Badge */}
                {shiftSession?.isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>الوردية جارية ومفتوحة</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>الوردية مقفلة (الكشف متصفر)</span>
                  </span>
                )}
              </div>

              {/* Day Date and Timing Info */}
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                {shiftSession?.isActive ? (
                  <>
                    <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>تاريخ اليومية المحسوبة:</span>
                      <strong className="text-blue-700 dark:text-blue-400 underline decoration-blue-400 underline-offset-2">
                        {shiftSession.businessDateLabel}
                      </strong>
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>بدأت الساعة:</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-300">
                        {shiftSession.startedAtTimeStr}
                      </strong>
                    </span>

                    {/* Midnight Warning / Assurance badge */}
                    {isPastMidnight && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 animate-pulse">
                        <Moon className="w-3 h-3 text-amber-600" />
                        <span>ساعات عمل ممتدة بعد 12:00 منتصف الليل — تُسجل لحساب يوم ({shiftSession.businessDateLabel})</span>
                      </span>
                    )}
                  </>
                ) : (
                  <span>
                    {shiftSession?.lastClosedDateLabel ? (
                      <span>آخر وردية أُغلقت بتاريخ: <strong>{shiftSession.lastClosedDateLabel}</strong> الساعة {shiftSession.lastEndedAtTimeStr}</span>
                    ) : (
                      <span>اضغط على "بدء اليوم" لتسجيل المعاملات وتصفير الكشف لاستقبال يومية جديدة.</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Master Shift Buttons (بدء اليوم / إنهاء اليوم وتصفير الكشف / الأرشيف) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
            
            {/* Start Day Button */}
            {!shiftSession?.isActive ? (
              <button
                onClick={handleStartDay}
                className="btn-interactive flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/30"
                title="بدء تسجيل يوم جديد وتصفير الكشف لاستقبال المعاملات"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>بدء اليوم (فتح الوردية)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {/* End Day Button */}
                <button
                  onClick={handleOpenEndDayModal}
                  className="btn-interactive flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs sm:text-sm shadow-md shadow-rose-500/25"
                  title="إنهاء اليوم الحالي وتصفير الكشف وحفظ كافة المبالغ في الأرشيف باسم تاريخ اليوم"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>إنهاء اليوم وتصفير الكشف</span>
                </button>

                {/* Restart Day Button (Reset session without closing) */}
                <button
                  onClick={handleStartDay}
                  className="btn-interactive p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  title="إعادة بدء اليوم وتصفير الكشف"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Archive / History Button */}
            <button
              onClick={() => setIsArchiveModalOpen(true)}
              className="btn-interactive flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold"
              title="عرض أرشيف الأيام المقفلة وتفاصيل التوريدات والعمولات السابقة"
            >
              <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>أرشيف الأيام السابقة</span>
              {archivedDays.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-indigo-600 text-white">
                  {archivedDays.length}
                </span>
              )}
            </button>

          </div>

        </div>
      </div>

      {/* 2. Secondary Action Toolbar (Excel Import, CSV Export, Print, Clear) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span>أدوات الكشف الفوري: استيراد إكسل، تصدير ملفات، والطباعة</span>
        </div>

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
            className="btn-interactive flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm"
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
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>تصدير إكسل</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn-interactive flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            title="طباعة كشف الوارد"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>

          <button
            onClick={handleClearAll}
            className="btn-interactive p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60"
            title="تفريغ الكشف يدوياً دون حفظ في الأرشيف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. KPI & Summary Cards (المجموع / العمولة / بعد العموله / الفارق) */}
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
            إجمالي كافة المبالغ الواردة المقيدة بكشف "له" اليوم
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

      {/* 4. Fast Input Bar for New Inbound Amounts */}
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

      {/* 5. The Ledger Table (له / المجموع / بعد العموله) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <span>جدول المبالغ الواردة المقيدة (له)</span>
              {shiftSession?.businessDateLabel && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  - يوم {shiftSession.businessDateLabel}
                </span>
              )}
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {items.length} بند
            </span>
          </div>

          {shiftSession?.isActive && items.length > 0 && (
            <button
              onClick={handleOpenEndDayModal}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <Square className="w-3.5 h-3.5 fill-rose-600" />
              <span>إنهاء اليوم وتصفير</span>
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center px-4">
            <ArrowDownToLine className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
              الكشف متصفر وجاهز
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-4">
              يمكنك كتابة المبالغ وإضافتها بالأعلى، أو الضغط على "اختيار ملف إكسل" لرفع كشف حساب الوارد مباشرة.
            </p>
            {!shiftSession?.isActive && (
              <button
                onClick={handleStartDay}
                className="btn-interactive inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>بدء يوم جديد الآن</span>
              </button>
            )}
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

                    {/* Amount "له" column */}
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

              {/* Exact Styled Footer Summary */}
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

      {/* 6. MODAL: End Day Confirmation (Right Sheet on Tablet/Desktop, Bottom Sheet on Mobile) */}
      {isEndDayModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-right-sheet-backdrop"
            onClick={() => setIsEndDayModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 h-full w-full max-w-full sm:max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden sm:rounded-l-3xl animate-right-sheet">
            
            {/* Mobile Drag Handle Indicator */}
            <div className="sm:hidden w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />

            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                  <Square className="w-5 h-5 fill-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    إنهاء اليوم وتصفير الكشف
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    أرشفة اليومية وحفظ الحسابات وتصفير الشاشة
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEndDayModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body with Responsive Max-Height */}
            <div className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto max-h-[calc(90dvh-130px)] sm:max-h-[calc(100vh-140px)] lg:max-h-[calc(90vh-140px)] min-h-0">
              {/* Business Date Lock Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200 dark:border-blue-900 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>سيتم تسجيل وأرشفة هذه اليومية رسمياً لحساب يوم:</span>
                </div>
                <div className="text-lg font-black text-blue-700 dark:text-blue-300">
                  {shiftSession?.businessDateLabel}
                </div>
                
                {/* Highlight midnight crossing logic */}
                {isPastMidnight ? (
                  <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-bold pt-1 bg-amber-500/10 p-2 rounded-xl mt-2 border border-amber-300/40">
                    <Moon className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      ملاحظة هامة: على الرغم من أن الساعة الآن تخطت 12:00 منتصف الليل، إلا أن اليومية ستُسجل بالكامل لحساب يوم البدء ({shiftSession?.businessDateLabel}) ولن تختلط بيوم الغد.
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    تاريخ البدء: {shiftSession?.startedAtTimeStr} • تاريخ الإغلاق الآن: {formatTimeArabic(new Date())}
                  </div>
                )}
              </div>

              {/* Financial Summary of the Day */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block mb-1 font-bold">إجمالي الوارد (له):</span>
                  <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                    {formatCurrency(totalAmount)}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{items.length} بند مسجل</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 block mb-1 font-bold">قيمة العمولة:</span>
                  <span className="font-mono text-base font-black text-amber-600 dark:text-amber-400">
                    {formatCurrency(commissionValue)}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    ({config.commissionRate}{config.commissionType === 'percentage' ? '%' : ' ج.م'} {config.commissionMode === 'deduct' ? 'خصم' : 'إضافة'})
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 col-span-2">
                  <span className="text-indigo-700 dark:text-indigo-300 block mb-1 font-bold">الصافي النهائي بعد العمولة:</span>
                  <span className="font-mono text-xl font-black text-indigo-700 dark:text-indigo-300">
                    {formatCurrency(amountAfterCommission)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  عند التأكيد، سيتم نقل هذه اليومية مع كافة بنودها إلى <strong>"أرشيف الأيام السابقة"</strong> وتصفير الكشف ليصبح جاهزاً لبدء يوم جديد.
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-900/90 shrink-0">
              <button
                type="button"
                onClick={() => setIsEndDayModalOpen(false)}
                className="btn-interactive px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء والعودة للكشف
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirmEndDay();
                }}
                className="btn-interactive flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-95 text-white text-xs font-black shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد إنهاء اليوم وتصفير الكشف</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. MODAL: Archive of Past Closed Days (Right Sheet on Tablet/Desktop, Bottom Sheet on Mobile) */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-right-sheet-backdrop"
            onClick={() => {
              setIsArchiveModalOpen(false);
              setSelectedArchiveDay(null);
            }}
          />
          <div className="fixed inset-y-0 right-0 z-50 h-full w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden sm:rounded-l-3xl animate-right-sheet">
            
            {/* Mobile Drag Handle Indicator */}
            <div className="sm:hidden w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2 shrink-0" />

            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>أرشيف الأيام السابقة المقفلة</span>
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {archivedDays.length} يوم
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    سجل كافة الورديات والأيام التي تم إنهاؤها مع تفاصيل الإيرادات والعمولات
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsArchiveModalOpen(false);
                  setSelectedArchiveDay(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Archive Search Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <input
                type="text"
                placeholder="بحث في الأرشيف بالتاريخ أو البيان..."
                value={archiveSearchQuery}
                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                className="w-full px-4 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Archive Body: List of Days or Day Details */}
            <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4 max-h-[calc(90dvh-130px)] sm:max-h-[calc(100vh-140px)] lg:max-h-[calc(90vh-140px)] min-h-0">
              
              {/* If viewing details of a selected day */}
              {selectedArchiveDay ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedArchiveDay(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>الرجوع لقائمة الأيام</span>
                  </button>

                  {/* Day Info Card */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-indigo-950 dark:text-white">
                          يومية: {selectedArchiveDay.businessDateLabel}
                        </span>
                        {selectedArchiveDay.isPastMidnightEnd && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                            <Moon className="w-3 h-3 text-amber-600" />
                            <span>أُغلقت بعد منتصف الليل ومسجلة لحساب هذا اليوم</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap gap-x-4">
                        <span>بدأت: <strong>{selectedArchiveDay.startedAtTimeStr}</strong></span>
                        <span>أُغلقت: <strong>{selectedArchiveDay.endedAtTimeStr}</strong></span>
                        <span>عدد البنود: <strong>{selectedArchiveDay.itemsCount}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportArchivedDayCSV(selectedArchiveDay)}
                        className="btn-interactive flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تصدير إكسل</span>
                      </button>

                      <button
                        onClick={() => handleDeleteArchivedDay(selectedArchiveDay.id, selectedArchiveDay.businessDateLabel)}
                        className="btn-interactive p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                        title="حذف هذا اليوم من الأرشيف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] text-slate-500 block mb-0.5">المجموع (إجمالي الوارد)</span>
                      <strong className="font-mono text-base text-blue-600 dark:text-blue-400">
                        {formatCurrency(selectedArchiveDay.totalAmount)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] text-slate-500 block mb-0.5">العمولة</span>
                      <strong className="font-mono text-base text-amber-600 dark:text-amber-400">
                        {formatCurrency(selectedArchiveDay.commissionValue)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900">
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-300 block mb-0.5">الصافي بعد العمولة</span>
                      <strong className="font-mono text-base text-indigo-700 dark:text-indigo-300">
                        {formatCurrency(selectedArchiveDay.amountAfterCommission)}
                      </strong>
                    </div>
                  </div>

                  {/* Items Table for this day */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 w-40 text-blue-700 dark:text-blue-300 font-black">له (المبلغ)</th>
                          <th className="py-2.5 px-3">البيان</th>
                          <th className="py-2.5 px-3 w-36">التوقيت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedArchiveDay.items?.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 text-center text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                              {formatNumber(item.amount)} ج.م
                            </td>
                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{item.label}</td>
                            <td className="py-2 px-3 text-slate-400">{formatTimeArabic(item.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              ) : (
                /* List of Archived Days */
                filteredArchivedDays.length === 0 ? (
                  <div className="py-12 text-center">
                    <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">
                      لا توجد أيام مقفلة في الأرشيف بعد
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      عندما تضغط على "إنهاء اليوم وتصفير الكشف"، سيتم حفظ كل يوم هنا بكامل بياناته.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredArchivedDays.map((day) => (
                      <div
                        key={day.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all bg-white dark:bg-slate-800/40 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span>يومية: {day.businessDateLabel}</span>
                            </span>

                            {day.isPastMidnightEnd && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <Moon className="w-3 h-3 text-amber-600" />
                                <span>إغلاق بعد 12 بالليل</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                            <span>من <strong>{day.startedAtTimeStr}</strong> إلى <strong>{day.endedAtTimeStr}</strong></span>
                            <span>•</span>
                            <span><strong>{day.itemsCount}</strong> بند</span>
                          </div>

                          {/* Quick financial bar */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1">
                            <span>إجمالي الوارد: <strong className="font-mono text-blue-600 dark:text-blue-400">{formatCurrency(day.totalAmount)}</strong></span>
                            <span>العمولة: <strong className="font-mono text-amber-600 dark:text-amber-400">{formatCurrency(day.commissionValue)}</strong></span>
                            <span>الصافي: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{formatCurrency(day.amountAfterCommission)}</strong></span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => setSelectedArchiveDay(day)}
                            className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 text-xs font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض البنود</span>
                          </button>

                          <button
                            onClick={() => handleExportArchivedDayCSV(day)}
                            className="btn-interactive p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600"
                            title="تصدير إكسل"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteArchivedDay(day.id, day.businessDateLabel)}
                            className="btn-interactive p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-rose-600"
                            title="حذف من الأرشيف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
