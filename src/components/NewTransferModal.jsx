import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { 
  formatCurrency, 
  formatPhone, 
  calculateWalletStats, 
  getTodayString,
  cleanEgyptianPhone,
  isValidEgyptianPhone,
  getEgyptianPhoneError,
  getEgyptianCarrier
} from '../utils/formatters';
import { 
  Send, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Phone, 
  User, 
  FileText, 
  Hash, 
  ArrowDownRight,
  Lock,
  Calendar,
  Store,
  Smartphone,
  Search,
  UserCheck,
  CreditCard,
  Zap,
  Coins
} from 'lucide-react';

export default function NewTransferModal() {
  const { 
    clients, 
    shopWallets = [],
    instapayAccounts = [],
    transactions, 
    activeModal, 
    setActiveModal, 
    modalData, 
    addTransaction,
    addRecharge,
    transferFromInstapay,
    showToast,
    askConfirm 
  } = useCash();

  const dialogRef = useRef(null);

  // Form states
  const [transferChannel, setTransferChannel] = useState('wallet'); // 'wallet' | 'instapay'
  const [selectedInstapayAccountId, setSelectedInstapayAccountId] = useState('');
  const [sourceType, setSourceType] = useState('shop'); // 'shop' | 'client'
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientMode, setRecipientMode] = useState('unregistered'); // 'unregistered' | 'client'
  const [recipientClientId, setRecipientClientId] = useState('');
  const [recipientWalletId, setRecipientWalletId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [recordClientRecharge, setRecordClientRecharge] = useState(true);
  const [transactionCode, setTransactionCode] = useState('');
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate transaction code on modal open and handle source line isolation
  useEffect(() => {
    if (activeModal === 'transfer') {
      // Check channel from modalData
      if (modalData?.channel === 'instapay' || modalData?.instapayAccountId) {
        setTransferChannel('instapay');
        setTransactionCode(`INSTA-${Math.floor(100000 + Math.random() * 900000)}`);
        if (modalData?.instapayAccountId) {
          setSelectedInstapayAccountId(modalData.instapayAccountId);
        } else if (instapayAccounts.length > 0) {
          const def = instapayAccounts.find(a => a.isDefault) || instapayAccounts[0];
          setSelectedInstapayAccountId(def.id);
        }
      } else {
        setTransferChannel('wallet');
        setTransactionCode(`VF-${Math.floor(100000 + Math.random() * 900000)}`);
        if (instapayAccounts.length > 0 && !selectedInstapayAccountId) {
          const def = instapayAccounts.find(a => a.isDefault) || instapayAccounts[0];
          setSelectedInstapayAccountId(def.id);
        }
      }

      // Reset recipient selection
      setRecipientMode('unregistered');
      setRecipientClientId('');
      setRecipientWalletId('');
      setClientSearch('');
      setRecordClientRecharge(true);

      const isShop = Boolean(modalData?.isShopWallet || modalData?.clientId === 'shop');
      if (isShop) {
        setSourceType('shop');
        setSelectedClientId('shop');
        if (modalData?.walletId) {
          setSelectedWalletId(modalData.walletId);
        } else if (shopWallets.length > 0) {
          setSelectedWalletId(shopWallets[0].id);
        } else {
          setSelectedWalletId('');
        }
      } else {
        setSourceType('client');
        if (modalData?.clientId && modalData.clientId !== 'shop') {
          setSelectedClientId(modalData.clientId);
          if (modalData?.walletId) {
            setSelectedWalletId(modalData.walletId);
          }
        } else if (clients.length > 0) {
          setSelectedClientId(clients[0].id);
          if (clients[0].wallets?.length > 0) {
            setSelectedWalletId(clients[0].wallets[0].id);
          }
        }
      }

      // Default date to now
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setCustomDate(localIso);
    }
  }, [activeModal, modalData, clients, shopWallets, instapayAccounts]);

  // When source type or selected client changes, auto-select first wallet if needed
  useEffect(() => {
    if (sourceType === 'shop') {
      if (!shopWallets.some(w => w.id === selectedWalletId)) {
        if (shopWallets.length > 0) {
          setSelectedWalletId(shopWallets[0].id);
        } else {
          setSelectedWalletId('');
        }
      }
    } else if (selectedClientId && selectedClientId !== 'shop') {
      const client = clients.find(c => c.id === selectedClientId);
      const wallets = client?.wallets || [];
      if (!wallets.some(w => w.id === selectedWalletId)) {
        if (wallets.length > 0) {
          setSelectedWalletId(wallets[0].id);
        } else {
          setSelectedWalletId('');
        }
      }
    }
  }, [sourceType, selectedClientId, clients, shopWallets, selectedWalletId]);

  // Manage native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'transfer') {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [activeModal]);

  // Light dismiss on backdrop click adhering to modern-web-guidance
  const handleDialogClick = (e) => {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  };

  const handleClose = () => {
    setActiveModal(null);
    setAmount('');
    setRecipientPhone('');
    setRecipientMode('unregistered');
    setRecipientClientId('');
    setRecipientWalletId('');
    setClientSearch('');
    setRecordClientRecharge(true);
    setNotes('');
    setFee('');
  };

  const isShopMode = sourceType === 'shop';

  // Find currently selected wallet and client
  const currentWallet = useMemo(() => {
    if (isShopMode) {
      return (shopWallets || []).find(w => w.id === selectedWalletId);
    } else {
      const client = clients.find(c => c.id === selectedClientId);
      return client?.wallets?.find(w => w.id === selectedWalletId);
    }
  }, [isShopMode, shopWallets, clients, selectedWalletId, selectedClientId]);

  const currentClient = useMemo(() => {
    if (isShopMode) {
      return { id: 'shop', name: 'أرقام وخطوط المحل' };
    }
    return clients.find(c => c.id === selectedClientId);
  }, [isShopMode, clients, selectedClientId]);

  // Recipient client & wallet lookups
  const selectedRecipientClient = useMemo(() => {
    if (recipientMode !== 'client' || !recipientClientId) return null;
    return clients.find(c => c.id === recipientClientId) || null;
  }, [recipientMode, recipientClientId, clients]);

  const selectedRecipientWallet = useMemo(() => {
    if (!selectedRecipientClient) return null;
    return selectedRecipientClient.wallets?.find(w => w.id === recipientWalletId) || null;
  }, [selectedRecipientClient, recipientWalletId]);

  const filteredRecipientClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.trim().toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.wallets?.some(w => w.phoneNumber.includes(q))
    );
  }, [clients, clientSearch]);

  const handleSwitchToClientRecipient = (clientToSelect = null, walletToSelect = null) => {
    setRecipientMode('client');
    const targetClient = clientToSelect || (clients.length > 0 ? clients[0] : null);
    if (targetClient) {
      setRecipientClientId(targetClient.id);
      const targetWallet = walletToSelect || (targetClient.wallets?.length > 0 ? targetClient.wallets[0] : null);
      if (targetWallet) {
        setRecipientWalletId(targetWallet.id);
        setRecipientPhone(targetWallet.phoneNumber);
      } else {
        setRecipientWalletId('');
        setRecipientPhone('');
      }
    }
  };

  const handleSelectRecipientClient = (clientId) => {
    setRecipientClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client?.wallets?.length > 0) {
      setRecipientWalletId(client.wallets[0].id);
      setRecipientPhone(client.wallets[0].phoneNumber);
    } else {
      setRecipientWalletId('');
      setRecipientPhone('');
    }
  };

  const handleSelectRecipientWallet = (walletId) => {
    setRecipientWalletId(walletId);
    const wallet = selectedRecipientClient?.wallets?.find(w => w.id === walletId);
    if (wallet) {
      setRecipientPhone(wallet.phoneNumber);
    }
  };

  const walletStats = currentWallet ? calculateWalletStats(currentWallet, transactions) : null;

  // Real-time limit math
  const numAmount = Number(amount) || 0;
  const currentRemaining = walletStats ? walletStats.remainingLimit : 0;
  const remainingAfter = currentRemaining - numAmount;
  const isOverLimit = numAmount > currentRemaining;
  const isLocked = walletStats ? walletStats.isLocked : false;
  const isDailyTransferExhausted = walletStats ? walletStats.isDailyTransferExhausted : false;
  const isOverDailyLimit = walletStats ? numAmount > walletStats.remainingDailyTransfer : false;
  const isBlocked = isLocked || isDailyTransferExhausted || isOverDailyLimit || isOverLimit;

  // InstaPay Account Math & Selection
  const selectedInstapayAcc = useMemo(() => {
    return instapayAccounts.find(a => a.id === selectedInstapayAccountId) || (instapayAccounts.length > 0 ? instapayAccounts[0] : null);
  }, [instapayAccounts, selectedInstapayAccountId]);

  const instapayBalance = Number(selectedInstapayAcc?.balance) || 0;
  const isInstapayOverBalance = transferChannel === 'instapay' && numAmount > instapayBalance;
  const instapayRemainingAfter = instapayBalance - numAmount;

  // Recipient phone validation
  const cleanRecipient = cleanEgyptianPhone(recipientPhone);
  const recipientCarrier = getEgyptianCarrier(cleanRecipient);
  const recipientPhoneError = cleanRecipient.length >= 3 ? getEgyptianPhoneError(cleanRecipient) : null;
  const isRecipientValid = isValidEgyptianPhone(cleanRecipient);

  // Smart match: if user types a number in unregistered mode that belongs to a client
  const matchedClient = useMemo(() => {
    if (recipientMode !== 'unregistered' || !cleanRecipient || cleanRecipient.length < 11) return null;
    for (const c of clients) {
      const w = c.wallets?.find(w => cleanEgyptianPhone(w.phoneNumber) === cleanRecipient);
      if (w) {
        return { client: c, wallet: w };
      }
    }
    return null;
  }, [recipientMode, cleanRecipient, clients]);

  // Overall form validity check for submit button
  const isInstapayFormValid = Boolean(
    transferChannel === 'instapay' &&
    selectedInstapayAcc &&
    numAmount > 0 &&
    !isInstapayOverBalance &&
    (
      (recipientMode === 'unregistered' && recipientPhone.trim().length >= 3) ||
      (recipientMode === 'client' && recipientClientId)
    )
  );

  const isFormValid = transferChannel === 'instapay'
    ? isInstapayFormValid
    : Boolean(
        selectedWalletId &&
        numAmount > 0 &&
        !isBlocked &&
        cleanRecipient &&
        isRecipientValid &&
        (recipientMode === 'unregistered' || (recipientClientId && recipientWalletId))
      );

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Handle InstaPay Transfer Channel
    if (transferChannel === 'instapay') {
      if (!selectedInstapayAcc) {
        showToast('يرجى اختيار حساب إنستاباي المحول منه', 'error');
        return;
      }

      if (numAmount <= 0) {
        showToast('يرجى إدخال مبلغ تحويل صحيح أكبر من 0', 'error');
        return;
      }

      if (isInstapayOverBalance) {
        showToast(`الرصيد المتاح في حساب (${selectedInstapayAcc.accountName}) هو (${formatCurrency(instapayBalance)}) وهو أقل من المبلغ المطلوب تحويله!`, 'error');
        return;
      }

      if (recipientMode === 'client' && !recipientClientId) {
        showToast('يرجى اختيار العميل المستلم', 'error');
        return;
      }

      if (recipientMode === 'unregistered' && !recipientPhone.trim()) {
        showToast('يرجى إدخال رقم أو عنوان IPA للمحول إليه (المستلم)', 'error');
        return;
      }

      setIsSubmitting(true);
      try {
        const isTransferToClient = recipientMode === 'client' && selectedRecipientClient;
        const targetRecipient = recipientPhone.trim() || (isTransferToClient ? (selectedRecipientWallet?.phoneNumber || selectedRecipientClient.name) : '');

        const res = transferFromInstapay({
          instapayAccountId: selectedInstapayAcc.id,
          amount: numAmount,
          recipient: targetRecipient,
          recipientClientId: isTransferToClient ? selectedRecipientClient.id : null,
          recipientClientName: isTransferToClient ? selectedRecipientClient.name : null,
          recipientWalletId: isTransferToClient ? selectedRecipientWallet?.id : null,
          recordClientRecharge: isTransferToClient && recordClientRecharge,
          transactionCode,
          notes: notes.trim(),
          date: customDate ? new Date(customDate).toISOString() : new Date().toISOString()
        });

        if (res) {
          showToast(`تم تحويل ${formatCurrency(numAmount)} بنجاح وخصمها من حساب إنستاباي (${selectedInstapayAcc.accountName})!`, 'success');
          handleClose();
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2. Handle Mobile Wallet Transfer Channel
    if (!selectedWalletId) {
      showToast(isShopMode ? 'يرجى اختيار خط المحل المحول منه' : 'يرجى اختيار رقم المحفظة المحول منها', 'error');
      return;
    }

    if (numAmount <= 0) {
      showToast('يرجى إدخال مبلغ تحويل صحيح أكبر من 0', 'error');
      return;
    }

    if (recipientMode === 'client' && (!recipientClientId || !recipientWalletId)) {
      showToast('يرجى اختيار العميل ورقم المحفظة المحول إليها', 'error');
      return;
    }

    if (!recipientPhone.trim()) {
      showToast('يرجى إدخال رقم المحول إليه (المستلم) - حقل مطلوب إجباري', 'error');
      return;
    }

    if (!isValidEgyptianPhone(cleanRecipient)) {
      showToast(
        getEgyptianPhoneError(cleanRecipient) || 'رقم المحول إليه غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً',
        'error'
      );
      return;
    }

    if (isLocked) {
      showToast('هذا الرقم مقفول لتجاوز الحد الشهري (200,000 ج.م). لا يمكن إجراء تحويلات جديدة.', 'error');
      return;
    }

    if (isDailyTransferExhausted) {
      showToast('تم بلوغ الحد الأقصى للتحويل اليومي من هذا الرقم (60,000 ج.م في اليوم).', 'error');
      return;
    }

    if (isOverDailyLimit) {
      showToast(`عفواً، المبلغ يتجاوز المتبقي من الحد اليومي المسموح به لهذا الرقم (${formatCurrency(walletStats?.remainingDailyTransfer || 0)} من أصل 60,000 ج.م)`, 'error');
      return;
    }

    if (isOverLimit) {
      showToast(`عفواً، لا يمكن التحويل لأن المبلغ يتجاوز الليميت الشهري المتبقي (${formatCurrency(currentRemaining)})`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const isTransferToClient = recipientMode === 'client' && selectedRecipientClient && selectedRecipientWallet;

      const tx = addTransaction({
        walletId: selectedWalletId,
        amount: numAmount,
        recipientPhone: cleanRecipient,
        recipientClientId: isTransferToClient ? selectedRecipientClient.id : null,
        recipientClientName: isTransferToClient ? selectedRecipientClient.name : null,
        recipientWalletId: isTransferToClient ? selectedRecipientWallet.id : null,
        transactionCode,
        fee: Number(fee) || 0,
        notes: notes || (isTransferToClient ? `تحويل للعميل: ${selectedRecipientClient.name} (${selectedRecipientWallet.label || 'محفظة'})` : ''),
        date: customDate ? new Date(customDate).toISOString() : new Date().toISOString()
      });

      // If it's a shop line transferring to a registered client with recharge enabled:
      if (isShopMode && isTransferToClient && recordClientRecharge) {
        addRecharge({
          walletId: selectedRecipientWallet.id,
          amount: numAmount,
          notes: `شحن محول من خط المحل (${currentWallet?.phoneNumber || 'خط المحل'}) - كود ${transactionCode || tx?.transactionCode || ''}`.trim(),
          date: customDate ? new Date(customDate).toISOString() : new Date().toISOString()
        });
        showToast(
          `تم خصم ${formatCurrency(numAmount)} من خط المحل وشحن رصيد العميل "${selectedRecipientClient.name}" بنجاح!`,
          'success'
        );
      }

      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeModal !== 'transfer') return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      aria-labelledby="transfer-modal-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/60 overflow-hidden"
    >
      {/* Modal Header */}
      <div className={`p-5 sm:p-6 text-white flex items-center justify-between transition-colors ${
        transferChannel === 'instapay'
          ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800'
          : 'bg-gradient-to-r from-red-600 to-rose-700'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
            {transferChannel === 'instapay' ? (
              <Zap className="w-5 h-5 text-amber-300" />
            ) : isShopMode ? (
              <Store className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5 rotate-180" />
            )}
          </div>
          <div>
            <h2 id="transfer-modal-title" className="text-lg sm:text-xl font-black">
              {transferChannel === 'instapay'
                ? 'تحويل مباشر من إنستاباي (InstaPay)'
                : isShopMode
                ? 'تحويل كاش من خطوط المحل'
                : 'تسجيل تحويل فودافون كاش جديد'}
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              {transferChannel === 'instapay'
                ? 'خصم فوري من رصيد حساب إنستاباي ومزامنة كشف حساب العميل ورأس المال'
                : isShopMode
                ? 'خصم فوري ومباشر من خط المحل المحدد ومراقبة حد اليوم والشهر'
                : 'يتم خصم المبلغ مباشرة وتحديث المتبقي من الليميت فوراً'}
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        
        {/* Main Channel Selector: Mobile Wallets vs InstaPay */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => {
              setTransferChannel('wallet');
              if (transactionCode.startsWith('INSTA-')) {
                setTransactionCode(`VF-${Math.floor(100000 + Math.random() * 900000)}`);
              }
            }}
            className={`btn-interactive py-2.5 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
              transferChannel === 'wallet'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>فودافون كاش ومحافظ المحمول ({shopWallets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTransferChannel('instapay');
              if (transactionCode.startsWith('VF-')) {
                setTransactionCode(`INSTA-${Math.floor(100000 + Math.random() * 900000)}`);
              }
            }}
            className={`btn-interactive py-2.5 px-3 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
              transferChannel === 'instapay'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>إنستاباي - InstaPay ({instapayAccounts.length})</span>
          </button>
        </div>

        {/* CHANNEL SPECIFIC SOURCE SELECTOR & STATS */}
        {transferChannel === 'instapay' ? (
          <div className="space-y-3">
            {/* 1. Select InstaPay Account */}
            <div className="bg-purple-50/70 dark:bg-purple-950/30 p-3.5 rounded-2xl border border-purple-200/80 dark:border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>اختر حساب إنستاباي المحول منه:</span>
                  <span className="text-rose-500 font-black">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setActiveModal('addInstapayAccount')}
                  className="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1"
                >
                  <span>+ إضافة حساب جديد</span>
                </button>
              </div>

              {instapayAccounts.length === 0 ? (
                <div className="text-center py-4 text-xs font-bold text-amber-600 dark:text-amber-400">
                  لا توجد حسابات إنستاباي مسجلة حالياً. اضغط على "+ إضافة حساب جديد" لإضافة حساب.
                </div>
              ) : (
                <select
                  value={selectedInstapayAccountId}
                  onChange={(e) => setSelectedInstapayAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  required
                >
                  {instapayAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} {acc.bankName ? `(${acc.bankName})` : ''} - {acc.handle || acc.phone || 'بدون معرف'} {acc.isDefault ? '[الافتراضي]' : ''} (الرصيد: {formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Live Calculation Banner for InstaPay */}
            {selectedInstapayAcc && (
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span>الرصيد اللحظي لـ ({selectedInstapayAcc.accountName}):</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    البنك: {selectedInstapayAcc.bankName || 'غير محدد'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">الرصيد المتاح حالياً</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {formatCurrency(instapayBalance)}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-rose-500 block">المبلغ المخصوم (-)</span>
                    <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                      {numAmount > 0 ? formatCurrency(numAmount) : '0 ج.م'}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border transition-colors ${
                    isInstapayOverBalance
                      ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
                  }`}>
                    <span className={`text-[10px] block font-bold ${
                      isInstapayOverBalance ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      المتبقي بعد التحويل
                    </span>
                    <span className={`text-xs sm:text-sm font-black font-mono ${
                      isInstapayOverBalance ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {formatCurrency(instapayRemainingAfter)}
                    </span>
                  </div>
                </div>

                {isInstapayOverBalance && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>تنبيه: المبلغ المطلوب تحويله ({formatCurrency(numAmount)}) أكبر من الرصيد المتوفر في هذا الحساب ({formatCurrency(instapayBalance)})!</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Source Type Toggle (Only if opened generally without pre-selection) */}
            {!modalData?.isShopWallet && !modalData?.clientId && (
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSourceType('shop')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    isShopMode
                      ? 'bg-red-600 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>خطوط المحل ({shopWallets.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('client')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    !isShopMode
                      ? 'bg-red-600 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>خطوط العملاء ({clients.length})</span>
                </button>
              </div>
            )}

            {/* Step 1: Select Source Line */}
            {isShopMode ? (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-red-600" />
                    <span>اختر خط المحل المحول منه:</span>
                  </label>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-900/50">
                    خطوط المحل فقط ({shopWallets.length} خط)
                  </span>
                </div>

                {shopWallets.length === 0 ? (
                  <div className="text-center py-4 text-xs font-bold text-amber-600 dark:text-amber-400">
                    لا توجد خطوط مسجلة للمحل حالياً. يمكنك إضافة خط جديد من تبويب المخزون &gt; أرقام وخطوط المحل.
                  </div>
                ) : (
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    required
                  >
                    {shopWallets.map(w => {
                      const s = calculateWalletStats(w, transactions);
                      const carrier = getEgyptianCarrier(w.phoneNumber);
                      return (
                        <option key={w.id} value={w.id}>
                          {w.phoneNumber} ({carrier?.name || 'شبكة'}) - {w.label || 'خط المحل'} {s.isLocked ? `[🔒 مقفول لتجاوز الليميت الشهري]` : s.isDailyTransferExhausted ? `[🔒 اكتمل حد اليوم 60 ألف]` : `(متاح للتحويل: ${formatCurrency(s.remainingLimit)})`}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Customer select */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-red-600" />
                    <span>العميل</span>
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    required
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.wallets?.length || 0} أرقام)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Wallet Number select */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-red-600" />
                    <span>الرقم المحول منه (المحفظة)</span>
                  </label>
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold font-mono focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    required
                  >
                    {currentClient?.wallets?.map(w => {
                      const s = calculateWalletStats(w, transactions);
                      return (
                        <option key={w.id} value={w.id}>
                          {w.phoneNumber} - {w.label} (متبقي: {formatCurrency(s.remainingLimit)})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}

            {/* Live Calculation Banner - Deduct directly from limit & display remaining */}
            {walletStats && (
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span>الحساب المباشر لليميت المحفظة:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    الليميت الكلي: {formatCurrency(walletStats.totalLimit)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">الليميت الشهري المتبقي</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {formatCurrency(currentRemaining)}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">متاح تحويله اليوم (من 60 ألف)</span>
                    <span className={`text-xs sm:text-sm font-bold font-mono ${walletStats.isDailyTransferExhausted ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(walletStats.remainingDailyTransfer)}
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-rose-500 block">المبلغ المخصوم (-)</span>
                    <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                      {numAmount > 0 ? formatCurrency(numAmount) : '0 ج.م'}
                    </span>
                  </div>

                  <div className={`p-2 rounded-xl border transition-colors ${
                    isOverLimit || isOverDailyLimit
                      ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
                  }`}>
                    <span className={`text-[10px] block font-bold ${
                      isOverLimit || isOverDailyLimit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      المتبقي بعد الخصم
                    </span>
                    <span className={`text-xs sm:text-sm font-black font-mono ${
                      isOverLimit || isOverDailyLimit ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {formatCurrency(remainingAfter)}
                    </span>
                  </div>
                </div>

                {isLocked ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 text-xs font-bold border border-rose-300 dark:border-rose-800">
                    <Lock className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>تم قفل هذا الرقم لتجاوز الحد الشهري (200,000 ج.م). لا يمكن إجراء تحويلات منه حتى 1/{walletStats.nextResetDateShort.split('/')[1]}!</span>
                  </div>
                ) : isDailyTransferExhausted ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 text-xs font-bold border border-amber-300 dark:border-amber-800">
                    <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>تم الوصول للحد الأقصى للتحويل اليومي من هذا الرقم (60,000 ج.م في اليوم). لا يمكن تحويل المزيد اليوم.</span>
                  </div>
                ) : isOverDailyLimit ? (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>تنبيه: المبلغ المدخل يتجاوز المتبقي من الحد اليومي المسموح به لهذا الرقم ({formatCurrency(walletStats.remainingDailyTransfer)} متبقية من أصل 60,000 ج.م اليوم).</span>
                  </div>
                ) : isOverLimit ? (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>تنبيه: المبلغ المدخل يتجاوز الليميت الشهري المتبقي في هذه المحفظة بمقدار {formatCurrency(Math.abs(remainingAfter))}.</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Destination & Amount */}
        <div className="space-y-3">
          
          {/* Recipient Destination Header / Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 px-1">
              <Send className="w-3.5 h-3.5 text-red-600 rotate-180" />
              <span>جهة التحويل (المحول إليه):</span>
            </span>

            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setRecipientMode('unregistered');
                  setRecipientClientId('');
                  setRecipientWalletId('');
                  setRecipientPhone('');
                }}
                className={`btn-interactive px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  recipientMode === 'unregistered'
                    ? transferChannel === 'instapay'
                      ? 'bg-purple-600 text-white shadow-xs font-black'
                      : 'bg-red-600 text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{transferChannel === 'instapay' ? 'رقم أو IPA يدوي' : 'رقم غير مسجل (يدوي)'}</span>
              </button>

              <button
                type="button"
                disabled={clients.length === 0}
                onClick={() => handleSwitchToClientRecipient()}
                className={`btn-interactive px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  recipientMode === 'client'
                    ? transferChannel === 'instapay'
                      ? 'bg-purple-600 text-white shadow-xs font-black'
                      : 'bg-red-600 text-white shadow-xs font-black'
                    : clients.length === 0
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={clients.length === 0 ? 'لا يوجد عملاء مسجلين حالياً' : 'اختيار عميل مسجل من الدليل'}
              >
                <User className="w-3.5 h-3.5" />
                <span>عميل مسجل ({clients.length})</span>
              </button>
            </div>
          </div>

          {/* If Registered Client Mode: Choose Client and their line */}
          {recipientMode === 'client' && (
            <div className={`p-3.5 rounded-2xl border space-y-3 ${
              transferChannel === 'instapay'
                ? 'bg-purple-50/60 dark:bg-purple-950/25 border-purple-200/70 dark:border-purple-900/40'
                : 'bg-red-50/60 dark:bg-red-950/25 border-red-200/70 dark:border-red-900/40'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                
                {/* 1. Client Select with optional quick filter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 h-6">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <User className={`w-3.5 h-3.5 ${transferChannel === 'instapay' ? 'text-purple-600' : 'text-red-600'}`} />
                      <span>اختر العميل المستلم:</span>
                      <span className="text-rose-500 font-black">*</span>
                    </label>
                    {clients.length > 5 && (
                      <span className="text-[10px] text-slate-400">
                        {filteredRecipientClients.length} من أصل {clients.length}
                      </span>
                    )}
                  </div>
                  
                  {clients.length > 5 && (
                    <div className="mb-1.5">
                      <input
                        type="text"
                        placeholder="🔍 ابحث عن العميل بالاسم أو الرقم..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  )}

                  <select
                    value={recipientClientId}
                    onChange={(e) => handleSelectRecipientClient(e.target.value)}
                    className="w-full h-11 px-3 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    required
                  >
                    <option value="" disabled>-- اضغط لاختيار العميل --</option>
                    {filteredRecipientClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.wallets?.length || 0} {c.wallets?.length === 1 ? 'رقم' : 'أرقام'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Wallet Line Select */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 h-6">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Smartphone className={`w-3.5 h-3.5 ${transferChannel === 'instapay' ? 'text-purple-600' : 'text-red-600'}`} />
                      <span>اختر رقم أو محفظة المستلم:</span>
                      <span className="text-rose-500 font-black">*</span>
                    </label>
                    {selectedRecipientWallet && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {getEgyptianCarrier(selectedRecipientWallet.phoneNumber)?.name || 'محفظة'}
                      </span>
                    )}
                  </div>

                  {clients.length > 5 && <div className="hidden sm:block h-[30px]" />}

                  {selectedRecipientClient ? (
                    (selectedRecipientClient.wallets || []).length > 0 ? (
                      <select
                        value={recipientWalletId}
                        onChange={(e) => handleSelectRecipientWallet(e.target.value)}
                        className="w-full h-11 px-3 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        required
                      >
                        {selectedRecipientClient.wallets.map(w => {
                          const carrier = getEgyptianCarrier(w.phoneNumber);
                          return (
                            <option key={w.id} value={w.id}>
                              {w.phoneNumber} ({carrier?.name || 'محفظة'}) - {w.label || 'محفظة'}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div className="h-11 px-3 flex items-center text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
                        لا توجد أرقام مسجلة لهذا العميل حالياً.
                      </div>
                    )
                  ) : (
                    <div className="h-11 px-3 flex items-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                      اختر العميل أولاً لعرض أرقامه
                    </div>
                  )}
                </div>
              </div>

              {/* Option to automatically record as recharge in client's account */}
              {selectedRecipientClient && (
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={recordClientRecharge}
                      onChange={(e) => setRecordClientRecharge(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500/30 border-slate-300 dark:border-slate-600 accent-red-600"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                        تسجيل التحويل كشحن رصيد/آجل في كشف حساب العميل
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        (يتم خصم التحويل من الرصيد وقيد المبلغ في كشف حساب "{selectedRecipientClient.name}" وزيادة المديونية تلقائياً)
                      </span>
                    </div>
                  </label>
                  <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    تحديث كشف الحساب
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Amount and Recipient Phone Inputs - Perfectly Aligned Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-start">
            
            {/* Col 1: Transfer Amount */}
            <div>
              <div className="flex items-center justify-between mb-1.5 h-6">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span>مبلغ التحويل (ج.م)</span>
                  <span className="text-rose-500 font-black text-sm">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="any"
                  autoFocus
                  placeholder="مثال: 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full h-11 pl-3 pr-4 text-base font-black bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none transition-all ${
                    (transferChannel === 'instapay' ? isInstapayOverBalance : isOverLimit)
                      ? 'text-rose-600 border-2 border-rose-500 focus:ring-2 focus:ring-rose-500/50'
                      : transferChannel === 'instapay'
                      ? 'text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/50'
                      : 'text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500/50'
                  }`}
                  required
                />
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                  (transferChannel === 'instapay' ? isInstapayOverBalance : isOverLimit) ? 'text-rose-500' : 'text-slate-400'
                }`}>
                  ج.م
                </span>
              </div>
              {(transferChannel === 'instapay' ? isInstapayOverBalance : isOverLimit) && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {transferChannel === 'instapay'
                      ? `المبلغ يتجاوز رصيد حساب إنستاباي المتاح (${formatCurrency(instapayBalance)})`
                      : `المبلغ يتجاوز الليميت المتاح (${formatCurrency(currentRemaining)}). قم بتقليل المبلغ.`}
                  </span>
                </p>
              )}
            </div>

            {/* Col 2: Recipient Phone */}
            <div>
              <div className="flex items-center justify-between mb-1.5 h-6">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
                  <span>{transferChannel === 'instapay' ? 'المحول إليه (رقم / IPA)' : 'رقم المحول إليه'}</span>
                  <span className="text-rose-500 font-black text-sm">*</span>
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-1.5 py-0.2 rounded">
                    مطلوب
                  </span>
                  {recipientMode === 'client' && selectedRecipientClient && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded truncate max-w-[120px]">
                      {selectedRecipientClient.name}
                    </span>
                  )}
                </label>
                {transferChannel === 'instapay' ? (
                  recipientPhone.includes('@') ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shrink-0">
                      عنوان IPA
                    </span>
                  ) : recipientCarrier ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      {recipientCarrier.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0" dir="ltr">
                      هاتف أو IPA
                    </span>
                  )
                ) : recipientCarrier ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    {recipientCarrier.name}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0" dir="ltr">
                    010/011/012/015
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type={transferChannel === 'instapay' ? 'text' : 'tel'}
                  required
                  maxLength={transferChannel === 'instapay' ? 50 : 11}
                  placeholder={transferChannel === 'instapay' ? '010XXXXXXXX أو username@instapay' : '010XXXXXXXX'}
                  value={recipientPhone}
                  readOnly={recipientMode === 'client'}
                  onChange={(e) => {
                    if (recipientMode === 'unregistered') {
                      if (transferChannel === 'instapay') {
                        setRecipientPhone(e.target.value);
                      } else {
                        setRecipientPhone(cleanEgyptianPhone(e.target.value));
                      }
                    }
                  }}
                  className={`w-full h-11 px-3.5 text-base font-bold font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    (transferChannel === 'instapay' ? recipientPhone.trim().length >= 3 : isRecipientValid)
                      ? 'border-emerald-500 focus:ring-emerald-500/40 bg-emerald-50/10'
                      : !recipientPhone.trim()
                      ? 'border-slate-300 dark:border-slate-700 focus:border-rose-500 focus:ring-rose-500/40'
                      : 'border-rose-500 focus:ring-rose-500/40 bg-rose-50/10'
                  } ${recipientMode === 'client' ? 'cursor-default bg-slate-100/70 dark:bg-slate-800/80' : ''}`}
                  dir="ltr"
                />
              </div>

              {transferChannel === 'wallet' && recipientPhoneError ? (
                <p className="text-[11px] text-rose-500 font-bold mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{recipientPhoneError}</span>
                </p>
              ) : (transferChannel === 'instapay' ? recipientPhone.trim().length >= 3 : isRecipientValid) ? (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                  <span>✓ {transferChannel === 'instapay' ? (recipientPhone.includes('@') ? 'عنوان إنستاباي صحيح' : 'رقم المستلم مدخل') : `رقم مصري صحيح (${recipientCarrier?.name})`}{recipientMode === 'client' && selectedRecipientClient ? ` - العميل: ${selectedRecipientClient.name}` : ''}</span>
                </p>
              ) : null}

              {/* Smart hint if manual number matches a registered client */}
              {matchedClient && (
                <div className="mt-1.5 p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                  <span className="text-blue-800 dark:text-blue-200 font-bold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>هذا الرقم مسجل للعميل: <strong>{matchedClient.client.name}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSwitchToClientRecipient(matchedClient.client, matchedClient.wallet)}
                    className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] transition-colors shrink-0"
                  >
                    تحديد كعميل مسجل
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Step 3: Transaction Ref Code and Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>كود العملية / المرجع</span>
            </label>
            <input
              type="text"
              value={transactionCode}
              onChange={(e) => setTransactionCode(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              رسوم / عمولة (اختياري)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              تاريخ وتوقيت التحويل
            </label>
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full px-2 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>ملاحظات أو بيان التحويل</span>
          </label>
          <input
            type="text"
            placeholder={transferChannel === 'instapay' ? "مثال: تحويل إنستاباي، سداد دفعة مورد، شحن محفظة..." : "مثال: دفعة مشتريات بضاعة، توريد عميل..."}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              !isFormValid
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700 shadow-none opacity-60'
                : transferChannel === 'instapay'
                ? 'btn-interactive bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-600/30'
                : 'btn-interactive bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/30'
            }`}
          >
            {transferChannel === 'instapay' ? (
              isInstapayOverBalance ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
                  <span>المبلغ يتجاوز رصيد إنستاباي</span>
                </>
              ) : !numAmount ? (
                <span>ادخل مبلغ التحويل</span>
              ) : recipientMode === 'client' && !recipientClientId ? (
                <>
                  <User className="w-4 h-4 shrink-0 text-amber-300" />
                  <span>اختر العميل المستلم</span>
                </>
              ) : !recipientPhone.trim() ? (
                <>
                  <Zap className="w-4 h-4 shrink-0 text-amber-300" />
                  <span>ادخل مستلم إنستاباي</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>تأكيد وتحويل إنستاباي</span>
                </>
              )
            ) : isLocked ? (
              <>
                <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                <span>الرقم مقفول شهرياً (معطل)</span>
              </>
            ) : isDailyTransferExhausted ? (
              <>
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>اكتمل حد اليوم 60 ألف (معطل)</span>
              </>
            ) : isOverDailyLimit ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>يتجاوز حد اليوم (معطل)</span>
              </>
            ) : isOverLimit ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>المبلغ يتجاوز الليميت (معطل)</span>
              </>
            ) : !numAmount ? (
              <>
                <span>ادخل مبلغ التحويل</span>
              </>
            ) : recipientMode === 'client' && !recipientClientId ? (
              <>
                <User className="w-4 h-4 shrink-0 text-amber-500" />
                <span>اختر العميل المستلم</span>
              </>
            ) : recipientMode === 'client' && !recipientWalletId ? (
              <>
                <Smartphone className="w-4 h-4 shrink-0 text-amber-500" />
                <span>اختر محفظة العميل المستلمة</span>
              </>
            ) : !recipientPhone.trim() ? (
              <>
                <Phone className="w-4 h-4 shrink-0 text-amber-500" />
                <span>ادخل رقم المحول إليه (مطلوب)</span>
              </>
            ) : !isRecipientValid ? (
              <>
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>رقم المستلم غير مكتمل (11 رقم)</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 rotate-180" />
                <span>تأكيد وخصم التحويلة</span>
              </>
            )}
          </button>
        </div>

      </form>
    </dialog>
  );
}
