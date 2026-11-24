import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  cleanEgyptianPhone, 
  isValidEgyptianPhone,
  calculateWalletStats,
  formatPhone 
} from '../utils/formatters';
import { 
  Package, 
  X, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  Zap, 
  CreditCard, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Phone,
  MessageSquare,
  FileText,
  DollarSign,
  Layers,
  ChevronDown,
  ArrowRight,
  Coins,
  Smartphone,
  Landmark,
  ShieldCheck,
  Percent
} from 'lucide-react';

const GOODS_CATEGORIES = [
  { id: 'phones', label: 'أجهزة هواتف ذكية' },
  { id: 'accessories', label: 'إكسسوارات عامة' },
  { id: 'chargers', label: 'شواحن وكابلات' },
  { id: 'earphones', label: 'سماعات وإيربودز' },
  { id: 'cases', label: 'جرابات وكفرات' },
  { id: 'screen_protectors', label: 'اسكرينات حماية' },
  { id: 'powerbanks', label: 'باور بانك وبطاريات' },
  { id: 'memory', label: 'فلاشات وكروت ميموري' },
  { id: 'services', label: 'خطوط وكروت شحن' },
];

const EXPENSE_CATEGORIES = [
  { id: 'electricity', label: 'كهرباء ومرافق عامة' },
  { id: 'rent', label: 'إيجار المحل' },
  { id: 'maintenance', label: 'صيانة وتجهيزات' },
  { id: 'hospitality', label: 'بوفيه ومشروبات وضيافة' },
  { id: 'printing', label: 'أكياس ومطبوعات ودعاية' },
  { id: 'salaries', label: 'رواتب وعمالة ومكافآت' },
  { id: 'transport', label: 'شحن ونقل وبضاعة' },
  { id: 'internet', label: 'إنترنت واشتراكات هاتف' },
  { id: 'other', label: 'نثريات ومصروفات أخرى' },
];

export default function AddPurchaseModal() {
  const { 
    activeModal, 
    setActiveModal, 
    modalData, 
    inventory, 
    shopWallets, 
    transactions,
    addPurchase, 
    uniqueSuppliers,
    showToast 
  } = useCash();

  const dialogRef = useRef(null);

  // Tab: 'inventory_goods' (بضاعة ومخزون) vs 'cash_liquidity' (شراء رصيد فودافون كاش) vs 'general_expense' (مصروفات عامة للمحل)
  const [purchaseType, setPurchaseType] = useState('inventory_goods');

  // Common Header State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  });
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Goods Specific State
  const [updateInventory, setUpdateInventory] = useState(true);
  const [items, setItems] = useState([
    {
      id: `item-${Date.now()}-1`,
      productId: '',
      name: '',
      category: 'accessories',
      color: '',
      quantity: 1,
      unitCost: '',
      suggestedSalePrice: ''
    }
  ]);

  // Cash Liquidity Specific State (شراء رصيد فودافون كاش ومحافظ)
  const [targetWalletId, setTargetWalletId] = useState('');
  const [purchasedCashAmount, setPurchasedCashAmount] = useState('');
  const [cashCostAmount, setCashCostAmount] = useState('');
  const [isCustomCost, setIsCustomCost] = useState(false);

  // General Expense Specific State
  const [expenseCategory, setExpenseCategory] = useState('other');
  const [expenseStatement, setExpenseStatement] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Payment Options
  // 'cash' (كاش الدرج) | 'instapay' (إنستاباي) | 'bank' (حساب بنكي) | 'wallet' (محفظة كاش للمحل) | 'credit' (آجل بالكامل) | 'partial' (سداد جزئي)
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedPaidChannel, setSelectedPaidChannel] = useState('drawerCash');
  const [customPaidAmount, setCustomPaidAmount] = useState('');

  // Initialize or reset when opening
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'addPurchase' || activeModal === 'addExpense' || activeModal === 'addCashLiquidity') {
      if (!dialog.open) dialog.showModal();

      let defaultType = 'inventory_goods';
      if (activeModal === 'addExpense') defaultType = 'general_expense';
      else if (activeModal === 'addCashLiquidity' || modalData?.type === 'cash_liquidity') defaultType = 'cash_liquidity';
      else if (modalData?.type) defaultType = modalData.type;

      setPurchaseType(defaultType);

      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}T${hh}:${min}`);

      let prefix = 'PUR';
      if (defaultType === 'general_expense') prefix = 'EXP';
      if (defaultType === 'cash_liquidity') prefix = 'CASH';
      setInvoiceNumber(`${prefix}-${yyyy}-${Math.floor(100 + Math.random() * 900)}`);

      setSupplierName(modalData?.supplierName || (defaultType === 'cash_liquidity' ? 'موزع فودافون كاش المعتمد' : ''));
      setSupplierPhone(modalData?.supplierPhone || '');
      setNotes('');
      setUpdateInventory(true);

      setItems([
        {
          id: `item-${Date.now()}-1`,
          productId: modalData?.product?.id || '',
          name: modalData?.product?.name || '',
          category: modalData?.product?.category || 'accessories',
          color: modalData?.color || '',
          quantity: modalData?.quantity || 1,
          unitCost: modalData?.product?.costPrice || '',
          suggestedSalePrice: modalData?.product?.salePrice || ''
        }
      ]);

      // Cash liquidity reset
      setTargetWalletId(shopWallets?.[0]?.id || '');
      setPurchasedCashAmount(modalData?.amount ? String(modalData.amount) : '');
      setCashCostAmount(modalData?.amount ? String(modalData.amount) : '');
      setIsCustomCost(false);

      setExpenseCategory('other');
      setExpenseStatement('');
      setExpenseAmount('');
      setPaymentMethod('cash');
      setSelectedPaidChannel('drawerCash');
      setSelectedWalletId(shopWallets?.[0]?.id || '');
      setCustomPaidAmount('');
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, modalData, shopWallets]);

  // Update invoice number prefix on tab switch if it wasn't manually customized
  const handleSwitchTab = (newType) => {
    setPurchaseType(newType);
    let prefix = 'PUR';
    if (newType === 'general_expense') prefix = 'EXP';
    if (newType === 'cash_liquidity') prefix = 'CASH';

    const yyyy = new Date().getFullYear();
    setInvoiceNumber(`${prefix}-${yyyy}-${Math.floor(100 + Math.random() * 900)}`);

    if (newType === 'cash_liquidity') {
      if (!supplierName.trim()) setSupplierName('موزع فودافون كاش المعتمد');
      if (paymentMethod === 'wallet') setPaymentMethod('cash');
    }
  };

  // Calculate live total
  const calculatedGoodsTotal = items.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const c = Number(item.unitCost) || 0;
    return sum + (q * c);
  }, 0);

  const totalInvoiceAmount = purchaseType === 'inventory_goods' 
    ? calculatedGoodsTotal 
    : purchaseType === 'cash_liquidity'
    ? (Number(cashCostAmount) || Number(purchasedCashAmount) || 0)
    : (Number(expenseAmount) || 0);

  // Calculate paid and remaining based on paymentMethod
  let finalPaidAmount = 0;
  if (paymentMethod === 'cash' || paymentMethod === 'wallet' || paymentMethod === 'instapay' || paymentMethod === 'bank') {
    finalPaidAmount = totalInvoiceAmount;
  } else if (paymentMethod === 'credit') {
    finalPaidAmount = 0;
  } else if (paymentMethod === 'partial') {
    finalPaidAmount = Math.min(totalInvoiceAmount, Math.max(0, Number(customPaidAmount) || 0));
  }
  const remainingDebt = Math.max(0, totalInvoiceAmount - finalPaidAmount);

  // Determine which channel to debit in treasury
  const channelMap = {
    cash: 'drawerCash',
    wallet: 'vodafoneCash',
    instapay: 'instapay',
    bank: 'bankAccounts'
  };
  const effectivePaidChannel = paymentMethod === 'partial' 
    ? selectedPaidChannel 
    : (channelMap[paymentMethod] || 'drawerCash');

  // Handle adding an item to the invoice
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        productId: '',
        name: '',
        category: 'accessories',
        color: '',
        quantity: 1,
        unitCost: '',
        suggestedSalePrice: ''
      }
    ]);
  };

  // Handle updating an item
  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      // If user selected an existing product from dropdown
      if (field === 'productId') {
        const prod = inventory.find(p => p.id === value);
        if (prod) {
          return {
            ...item,
            productId: prod.id,
            name: prod.name,
            category: prod.category || 'accessories',
            color: prod.variants?.[0]?.color || '',
            unitCost: prod.costPrice || '',
            suggestedSalePrice: prod.salePrice || ''
          };
        }
        return { ...item, productId: '' };
      }

      return { ...item, [field]: value };
    }));
  };

  // Handle removing an item
  const handleRemoveItem = (id) => {
    if (items.length <= 1) {
      showToast('يجب أن تحتوي فاتورة المشتريات على صنف واحد على الأقل', 'error');
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClose = () => {
    setActiveModal(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (purchaseType === 'inventory_goods') {
      if (!supplierName.trim()) {
        showToast('يرجى إدخال اسم المورد أو الشركة الموردة', 'error');
        return;
      }

      // Validate items
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.name.trim()) {
          showToast(`يرجى كتابة اسم الصنف رقم (${i + 1})`, 'error');
          return;
        }
        if (!it.unitCost || Number(it.unitCost) <= 0) {
          showToast(`يرجى تحديد سعر الشراء/التكلفة للصنف (${it.name})`, 'error');
          return;
        }
        if (!it.quantity || Number(it.quantity) <= 0) {
          showToast(`يرجى تحديد كمية صحيحة للصنف (${it.name})`, 'error');
          return;
        }
      }

      if (totalInvoiceAmount <= 0) {
        showToast('إجمالي الفاتورة يجب أن يكون أكبر من صفر', 'error');
        return;
      }
    } else if (purchaseType === 'cash_liquidity') {
      // Cash liquidity validation
      if (!targetWalletId) {
        showToast('يرجى اختيار خط ومحفظة المحل المراد شحنها وتغذية رصيدها', 'error');
        return;
      }
      if (!purchasedCashAmount || Number(purchasedCashAmount) <= 0) {
        showToast('يرجى إدخال رصيد الكاش المشترى بمبلغ صحيح أكبر من صفر', 'error');
        return;
      }
      if (totalInvoiceAmount <= 0) {
        showToast('إجمالي التكلفة المطلوب سدادها يجب أن يكون أكبر من صفر', 'error');
        return;
      }
    } else {
      // General expense validation
      if (!expenseStatement.trim()) {
        showToast('يرجى كتابة بيان المصروف أو تفاصيل المشترى', 'error');
        return;
      }
      if (!expenseAmount || Number(expenseAmount) <= 0) {
        showToast('يرجى إدخال قيمة المصروف بمبلغ صحيح أكبر من صفر', 'error');
        return;
      }
    }

    // Check wallet limit if paid via shop wallet
    if (paymentMethod === 'wallet' && finalPaidAmount > 0) {
      if (!selectedWalletId) {
        showToast('يرجى اختيار خط المحل المحول منه المبلغ', 'error');
        return;
      }
      const walletObj = shopWallets.find(w => w.id === selectedWalletId);
      if (walletObj) {
        const stats = calculateWalletStats(walletObj, transactions);
        if (finalPaidAmount > stats.remainingLimit) {
          showToast(`رصيد محفظة ${walletObj.label} المتبقي (${formatCurrency(stats.remainingLimit)}) لا يكفي لسداد المبلغ المطلوب (${formatCurrency(finalPaidAmount)})!`, 'error');
          return;
        }
      }
    }

    // Target wallet object for liquidity
    const targetWalletObj = shopWallets.find(w => w.id === targetWalletId);

    // Construct final items payload
    let finalItems = [];
    if (purchaseType === 'inventory_goods') {
      finalItems = items.map(it => ({
        productId: it.productId || null,
        name: it.name.trim(),
        category: it.category,
        color: it.color.trim(),
        quantity: Number(it.quantity),
        unitCost: Number(it.unitCost),
        totalCost: Number(it.quantity) * Number(it.unitCost),
        suggestedSalePrice: Number(it.suggestedSalePrice) || 0
      }));
    } else if (purchaseType === 'cash_liquidity') {
      finalItems = [
        {
          name: `شحن وتغذية رصيد فودافون كاش لمحفظة ${targetWalletObj?.label || 'المحل'} (${targetWalletObj?.phoneNumber || ''})`,
          category: 'services',
          quantity: 1,
          unitCost: totalInvoiceAmount,
          totalCost: totalInvoiceAmount,
          purchasedCashAmount: Number(purchasedCashAmount)
        }
      ];
    } else {
      finalItems = [
        {
          name: expenseStatement.trim(),
          category: expenseCategory,
          quantity: 1,
          unitCost: Number(expenseAmount),
          totalCost: Number(expenseAmount)
        }
      ];
    }

    const purchasePayload = {
      type: purchaseType,
      invoiceNumber: invoiceNumber.trim(),
      date,
      supplierName: purchaseType === 'inventory_goods' 
        ? supplierName.trim() 
        : (purchaseType === 'cash_liquidity' ? (supplierName.trim() || 'موزع فودافون كاش معتمد') : (supplierName.trim() || 'مصروف عام للمحل')),
      supplierPhone: supplierPhone.trim(),
      targetWalletId: purchaseType === 'cash_liquidity' ? targetWalletId : null,
      targetWalletPhone: purchaseType === 'cash_liquidity' ? (targetWalletObj?.phoneNumber || '') : null,
      purchasedCashAmount: purchaseType === 'cash_liquidity' ? Number(purchasedCashAmount) : 0,
      expenseCategory: purchaseType === 'general_expense' ? expenseCategory : null,
      items: finalItems,
      totalAmount: totalInvoiceAmount,
      paidAmount: finalPaidAmount,
      remainingAmount: remainingDebt,
      paymentMethod,
      paidChannel: effectivePaidChannel,
      paidFromWalletId: paymentMethod === 'wallet' ? selectedWalletId : null,
      updateInventory: purchaseType === 'inventory_goods' ? updateInventory : false,
      notes: notes.trim()
    };

    addPurchase(purchasePayload);
    handleClose();
  };

  if (activeModal !== 'addPurchase' && activeModal !== 'addExpense' && activeModal !== 'addCashLiquidity') return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="add-purchase-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/70 overflow-hidden animate-scale-in"
    >
      <div className="flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs">
              {purchaseType === 'cash_liquidity' ? (
                <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : purchaseType === 'inventory_goods' ? (
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div>
              <h2 id="add-purchase-title" className="text-base sm:text-lg font-black leading-tight">
                {purchaseType === 'inventory_goods' 
                  ? 'تسجيل فاتورة مشتريات وتوريد بضاعة' 
                  : purchaseType === 'cash_liquidity'
                  ? 'شراء وتغذية رصيد فودافون كاش ومحافظ'
                  : 'تسجيل مشتريات ومصروفات عامة للمحل'}
              </h2>
              <p className="text-xs text-rose-100 font-medium">
                {purchaseType === 'inventory_goods' 
                  ? 'إضافة أصناف جديدة أو زيادة رصيد المخزون مع إدارة حساب المورد'
                  : purchaseType === 'cash_liquidity'
                  ? 'شراء سيولة كاش لخطوط المحل وتغذية الخزينة مع خصم القيمة تلقائياً من رأس المال'
                  : 'متابعة مصاريف التشغيل (كهرباء، إيجار، دعاية، نثريات) لحساب صافي الربح'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Tab Switcher */}
        <div className="p-2.5 bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleSwitchTab('inventory_goods')}
            className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              purchaseType === 'inventory_goods'
                ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span className="truncate">بضاعة ومخزون</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('cash_liquidity')}
            className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              purchaseType === 'cash_liquidity'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-black ring-1 ring-amber-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">شراء رصيد كاش</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchTab('general_expense')}
            className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              purchaseType === 'general_expense'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span className="truncate">مصروفات عامة</span>
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">

          {/* 1. Basic Invoice Info */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>بيانات الفاتورة الأساسية</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الفاتورة / المرجع
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="مثال: PUR-2026-101"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ وتوقيت الشراء
                </label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Supplier Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>اسم المورد / الموزع {purchaseType !== 'general_expense' && <span className="text-red-500">*</span>}</span>
                  {uniqueSuppliers.length > 0 && (
                    <span className="text-[10px] text-slate-400">سابقين: {uniqueSuppliers.length}</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    list="suppliers-datalist"
                    placeholder={
                      purchaseType === 'cash_liquidity'
                        ? 'مثال: موزع فودافون كاش المعتمد / الحاج رأفت'
                        : purchaseType === 'inventory_goods'
                        ? 'مثال: شركة الفرسان لتوزيع الهواتف'
                        : 'مثال: شركة الكهرباء أو اسم المحل'
                    }
                    className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                    required={purchaseType !== 'general_expense'}
                  />
                  <Building2 className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <datalist id="suppliers-datalist">
                    {uniqueSuppliers.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم هاتف المورد / الواتساب
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    dir="ltr"
                    className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:outline-none font-mono"
                  />
                  <Phone className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Specific Section: Cash Liquidity vs Inventory Goods vs General Expense */}

          {/* SECTION A: CASH LIQUIDITY (شراء رصيد فودافون كاش) */}
          {purchaseType === 'cash_liquidity' && (
            <div className="space-y-4 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent dark:from-amber-950/30 p-4 sm:p-5 rounded-2xl border border-amber-300 dark:border-amber-800/60">
              <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-amber-800/60 pb-2.5">
                <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>تفاصيل شراء وتغذية رصيد الكاش الإلكتروني</span>
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                  تغذية رصيد خط المحل
                </span>
              </div>

              {/* Target Shop Wallet Line */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  خط ومحفظة المحل المراد شحنها وتغذية رصيدها *
                </label>
                <select
                  value={targetWalletId}
                  onChange={(e) => setTargetWalletId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-bold"
                  required
                >
                  {shopWallets.map(w => {
                    const stats = calculateWalletStats(w, transactions);
                    return (
                      <option key={w.id} value={w.id}>
                        {w.label} - ({formatPhone(w.phoneNumber)}) [الرصيد المتاح: {formatCurrency(stats.remainingLimit)}]
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 سيتم تسجيل حركة توريد لهذا الخط وتحديث رصيد فودافون كاش في الخزينة فورياً.
                </p>
              </div>

              {/* Purchased Cash Amount & Actual Paid Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رصيد الكاش المشترى (الرصيد المستلم على الخط) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="100"
                      step="any"
                      value={purchasedCashAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPurchasedCashAmount(val);
                        if (!isCustomCost) {
                          setCashCostAmount(val);
                        }
                      }}
                      placeholder="مثال: 50000"
                      className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-black text-amber-600 dark:text-amber-400"
                      required
                    />
                    <Coins className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[10000, 25000, 50000, 100000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setPurchasedCashAmount(String(amt));
                          if (!isCustomCost) setCashCostAmount(String(amt));
                        }}
                        className="px-2 py-0.5 rounded-lg bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold hover:bg-amber-200 transition-colors"
                      >
                        {formatCurrency(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      المبلغ الفعلي المطلوب سداده للموزع (التكلفة) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCost(!isCustomCost);
                        if (isCustomCost) setCashCostAmount(purchasedCashAmount);
                      }}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold"
                    >
                      {isCustomCost ? 'تطابق مع الرصيد' : 'تعديل التكلفة/عمولة'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={cashCostAmount}
                      onChange={(e) => {
                        setIsCustomCost(true);
                        setCashCostAmount(e.target.value);
                      }}
                      placeholder="مثال: 50000"
                      className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-black text-slate-800 dark:text-slate-100"
                      required
                    />
                    <DollarSign className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Diff preview: discount vs markup */}
                  {Number(purchasedCashAmount) > 0 && Number(cashCostAmount) > 0 && (
                    <div className="mt-1.5 text-[11px] font-bold">
                      {Number(purchasedCashAmount) > Number(cashCostAmount) ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <span>✓ وفر/عمولة شراء للمحل:</span>
                          <span>+{formatCurrency(Number(purchasedCashAmount) - Number(cashCostAmount))}</span>
                        </span>
                      ) : Number(cashCostAmount) > Number(purchasedCashAmount) ? (
                        <span className="text-rose-500 flex items-center gap-1">
                          <span>رسوم توريد إضافية:</span>
                          <span>+{formatCurrency(Number(cashCostAmount) - Number(purchasedCashAmount))}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">سعر التكلفة مساوٍ للرصيد المشترى (100%)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: INVENTORY GOODS */}
          {purchaseType === 'inventory_goods' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-red-500" />
                    <span>بنود وأصناف البضاعة المشتراة ({items.length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    أضف كل الأصناف الواردة في الفاتورة مع التكلفة وسعر البيع المقترح
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة صنف آخر</span>
                </button>
              </div>

              {/* Items Card List */}
              <div className="space-y-3">
                {items.map((item, index) => {
                  const itemTotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
                  const margin = (Number(item.suggestedSalePrice) || 0) - (Number(item.unitCost) || 0);

                  return (
                    <div 
                      key={item.id} 
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 relative group transition-all hover:border-red-300 dark:hover:border-red-900/50 shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[10px] flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <span>بيانات الصنف #{index + 1}</span>
                        </span>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="حذف هذا الصنف من الفاتورة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Quick pick from existing inventory */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                            <span>اختيار من المخزون الحالي (اختياري)</span>
                            <span className="text-[10px] text-red-600 dark:text-red-400">لزيادة رصيده</span>
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                          >
                            <option value="">-- أو كتابة صنف جديد يدوي بالأسفل --</option>
                            {inventory.map(prod => (
                              <option key={prod.id} value={prod.id}>
                                {prod.name} (المتاح: {prod.totalQuantity} | تكلفة: {prod.costPrice} ج.م)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Category */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            التصنيف
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold"
                          >
                            {GOODS_CATEGORIES.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Product Name & Color */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            اسم الصنف بالكامل *
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            placeholder="مثال: Samsung Galaxy A55 5G أو شاحن سامسونج 25W"
                            className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            اللون / المتغير
                          </label>
                          <input
                            type="text"
                            value={item.color}
                            onChange={(e) => handleItemChange(item.id, 'color', e.target.value)}
                            placeholder="مثال: أسود، أزرق ثلجي"
                            className="w-full px-3 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Quantity, Cost, Suggested Sale Price */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            الكمية الواردة *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold text-center"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            سعر الشراء للقطعة *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitCost}
                            onChange={(e) => handleItemChange(item.id, 'unitCost', e.target.value)}
                            placeholder="ج.م"
                            className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold text-red-600 dark:text-red-400 text-center"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            سعر البيع المقترح
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.suggestedSalePrice}
                            onChange={(e) => handleItemChange(item.id, 'suggestedSalePrice', e.target.value)}
                            placeholder="ج.م"
                            className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold text-emerald-600 text-center"
                          />
                        </div>

                        <div className="flex flex-col justify-center bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800 text-center">
                          <span className="text-[10px] text-slate-400">إجمالي الصنف</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                            {formatCurrency(itemTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Profit Margin Preview if sale price provided */}
                      {margin > 0 && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                          <span>هامش الربح المتوقع للقطعة: +{formatCurrency(margin)}</span>
                          <span className="text-[10px] text-slate-400">({Math.round((margin / (Number(item.unitCost) || 1)) * 100)}% ربح)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Checkbox: Auto-update inventory */}
              <label className="flex items-center gap-2 p-3 bg-red-50/60 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={updateInventory}
                  onChange={(e) => setUpdateInventory(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded-md focus:ring-red-500"
                />
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  تحديث وزيادة كميات المخزون فورياً عند حفظ الفاتورة (موصى به)
                </span>
              </label>
            </div>
          )}

          {/* SECTION C: GENERAL EXPENSES */}
          {purchaseType === 'general_expense' && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>تفاصيل المصروف أو المشترى العام</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تصنيف المصروف *
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-bold"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    قيمة المصروف (ج.م) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="مثال: 500"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:outline-none font-bold text-amber-600 dark:text-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  بيان وتفاصيل المصروف *
                </label>
                <input
                  type="text"
                  value={expenseStatement}
                  onChange={(e) => setExpenseStatement(e.target.value)}
                  placeholder="مثال: فاتورة كهرباء المحل لشهر نوفمبر، أكياس هدايا، صيانة كشافات..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* 3. Payment Method & Settlement (طريقة السداد والخصم من رأس المال) */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>طريقة السداد والخصم من الخزينة ورأس المال</span>
                </h3>
                <span className="text-[10px] text-slate-500">
                  سيتم خصم المبلغ المسدد تلقائياً من خزينة المحل المختارة
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">إجمالي الفاتورة:</span>
                <span className="text-sm sm:text-base font-black text-red-600 dark:text-red-400">
                  {formatCurrency(totalInvoiceAmount)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector Grid */}
            <div className={`grid gap-2 ${purchaseType === 'cash_liquidity' ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-6'}`}>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-black shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <DollarSign className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <span className="text-xs block">كاش الدرج</span>
                <span className="text-[10px] opacity-75">خصم فوري</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('instapay')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  paymentMethod === 'instapay'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-black shadow-xs ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Smartphone className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                <span className="text-xs block">إنستاباي</span>
                <span className="text-[10px] opacity-75">تحويل لحظي</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  paymentMethod === 'bank'
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-black shadow-xs ring-2 ring-cyan-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Landmark className="w-4 h-4 mx-auto mb-1 text-cyan-600" />
                <span className="text-xs block">حساب بنكي</span>
                <span className="text-[10px] opacity-75">تحويل بنكي</span>
              </button>

              {purchaseType !== 'cash_liquidity' && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    paymentMethod === 'wallet'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-black shadow-xs ring-2 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Wallet className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                  <span className="text-xs block">محفظة كاش</span>
                  <span className="text-[10px] opacity-75">خصم ليميت</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setPaymentMethod('partial')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  paymentMethod === 'partial'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Layers className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <span className="text-xs block">سداد جزئي</span>
                <span className="text-[10px] opacity-75">جزء + آجل</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  paymentMethod === 'credit'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-black shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <span className="text-xs block">آجل بالكامل</span>
                <span className="text-[10px] opacity-75">دين على المحل</span>
              </button>
            </div>

            {/* Wallet Selection if paying via Shop Wallet */}
            {paymentMethod === 'wallet' && purchaseType !== 'cash_liquidity' && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-rose-200/70 dark:border-rose-900/40 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  اختر خط المحل المراد التحويل منه (يتم خصم المبلغ من الليميت):
                </label>
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold"
                  required
                >
                  {shopWallets.map(w => {
                    const stats = calculateWalletStats(w, transactions);
                    return (
                      <option key={w.id} value={w.id}>
                        {w.label} - ({formatPhone(w.phoneNumber)}) [الليميت المتاح: {formatCurrency(stats.remainingLimit)}]
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Partial Payment Amount and Channel Input */}
            {paymentMethod === 'partial' && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      المبلغ المدفوع حالياً (ج.م) *:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={totalInvoiceAmount}
                        step="any"
                        value={customPaidAmount}
                        onChange={(e) => setCustomPaidAmount(e.target.value)}
                        placeholder="أدخل المبلغ المدفوع..."
                        className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold text-emerald-600"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setCustomPaidAmount(Math.round(totalInvoiceAmount / 2))}
                        className="px-2.5 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50"
                      >
                        50%
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الخزينة المخصوم منها الدفعة *:
                    </label>
                    <select
                      value={selectedPaidChannel}
                      onChange={(e) => setSelectedPaidChannel(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none font-bold"
                    >
                      <option value="drawerCash">كاش الدرج والخزينة</option>
                      <option value="instapay">حساب إنستاباي</option>
                      <option value="bankAccounts">حساب بنكي</option>
                      {purchaseType !== 'cash_liquidity' && <option value="vodafoneCash">فودافون كاش ومحافظ المحمول</option>}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Box: Paid vs Remaining */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block">المبلغ المدفوع (مخصوم من رأس المال):</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(finalPaidAmount)}
                </span>
              </div>
              <div className="text-center border-r border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">المتبقي (الآجل على المحل):</span>
                <span className={`text-sm font-black ${remainingDebt > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                  {remainingDebt > 0 ? formatCurrency(remainingDebt) : 'خالص بالكامل'}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظات أو شروط السداد (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات حول الضمان، ميعاد سداد الآجل، تفاصيل التوريد..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="btn-interactive flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs sm:text-sm font-black shadow-md shadow-red-600/25 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {purchaseType === 'cash_liquidity' ? 'تأكيد شراء وشحن رصيد الكاش' : 'تأكيد وحفظ الفاتورة'}
              </span>
            </button>
          </div>

        </form>

      </div>
    </dialog>
  );
}
