import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { formatCurrency } from '../utils/formatters';
import { 
  DollarSign, 
  X, 
  ArrowRightLeft, 
  Scale, 
  Coins, 
  PlusCircle, 
  MinusCircle, 
  Wallet, 
  Building2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

const CHANNELS = [
  { id: 'drawerCash', label: 'كاش الدرج / الخزينة النقدية', icon: 'DollarSign', color: 'emerald' },
  { id: 'vodafoneCash', label: 'فودافون كاش ومحافظ المحمول', icon: 'Wallet', color: 'rose' },
  { id: 'instapay', label: 'إنستاباي (InstaPay)', icon: 'Coins', color: 'amber' },
  { id: 'bankAccounts', label: 'الحسابات البنكية', icon: 'Building2', color: 'blue' },
];

export default function AdjustCapitalModal() {
  const { 
    activeModal, 
    setActiveModal, 
    modalData, 
    treasury, 
    shopWallets = [],
    instapayAccounts = [],
    updateTreasuryBalance, 
    transferBetweenTreasury, 
    depositToTreasury, 
    withdrawFromTreasury, 
    showToast 
  } = useCash();

  const dialogRef = useRef(null);

  // Tab: 'adjust' (تسوية وجرد) | 'transfer' (تحويل بين الخزائن) | 'deposit_withdraw' (إيداع / سحب)
  const [activeTab, setActiveTab] = useState('transfer');

  // Transfer State
  const [fromChannel, setFromChannel] = useState('drawerCash');
  const [toChannel, setToChannel] = useState('instapay');
  const [fromSubAccountId, setFromSubAccountId] = useState('');
  const [toSubAccountId, setToSubAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Adjust / Reconcile State
  const [selectedChannel, setSelectedChannel] = useState('drawerCash');
  const [adjustSubAccountId, setAdjustSubAccountId] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Deposit / Withdraw State
  const [dwType, setDwType] = useState('deposit'); // 'deposit' | 'withdraw'
  const [dwChannel, setDwChannel] = useState('drawerCash');
  const [dwSubAccountId, setDwSubAccountId] = useState('');
  const [dwAmount, setDwAmount] = useState('');
  const [dwNotes, setDwNotes] = useState('');

  const getDefaultSubId = (channel) => {
    if (channel === 'vodafoneCash') return shopWallets?.[0]?.id || '';
    if (channel === 'instapay') return instapayAccounts?.find(a => a.isDefault)?.id || instapayAccounts?.[0]?.id || '';
    return '';
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'adjustCapital') {
      if (!dialog.open) dialog.showModal();

      const defaultTab = modalData?.mode || 'transfer';
      setActiveTab(defaultTab);

      const initialCh = modalData?.channel || 'drawerCash';
      const defaultAdjustSub = getDefaultSubId(initialCh);
      setSelectedChannel(initialCh);
      setAdjustSubAccountId(defaultAdjustSub);
      setNewBalance(
        defaultAdjustSub
          ? getSubAccountBalance(initialCh, defaultAdjustSub)
          : (treasury?.[initialCh] !== undefined ? treasury[initialCh] : '')
      );
      setFromChannel(modalData?.channel || 'drawerCash');
      setFromSubAccountId(getDefaultSubId(modalData?.channel || 'drawerCash'));
      const defaultTo = (modalData?.channel || 'drawerCash') === 'instapay' ? 'vodafoneCash' : 'instapay';
      setToChannel(defaultTo);
      setToSubAccountId(getDefaultSubId(defaultTo));
      setDwChannel(initialCh);
      setDwSubAccountId(getDefaultSubId(initialCh));

      setTransferAmount('');
      setTransferNotes('');
      setAdjustReason('');
      setDwAmount('');
      setDwNotes('');
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, modalData, treasury, shopWallets, instapayAccounts]);

  const handleClose = () => {
    setActiveModal(null);
  };

  if (activeModal !== 'adjustCapital') return null;

  const getSubAccountBalance = (channel, subId) => {
    if (channel === 'vodafoneCash' && subId) {
      const w = shopWallets.find(x => x.id === subId);
      if (w) return Number(w.balance) || 0;
    }
    if (channel === 'instapay' && subId) {
      const a = instapayAccounts.find(x => x.id === subId);
      if (a) return Number(a.balance) || 0;
    }
    return Number(treasury?.[channel]) || 0;
  };

  // Handle Transfer
  const handleTransferSubmit = (e) => {
    e.preventDefault();
    const isSameChannelDifferentSub =
      fromChannel === toChannel &&
      (fromChannel === 'vodafoneCash' || fromChannel === 'instapay') &&
      fromSubAccountId &&
      toSubAccountId &&
      fromSubAccountId !== toSubAccountId;

    if (fromChannel === toChannel && !isSameChannelDifferentSub) {
      showToast('يرجى اختيار خزينة أو حساب وجهة مختلف عن المصدر', 'error');
      return;
    }
    const amt = Number(transferAmount);
    if (!amt || amt <= 0) {
      showToast('يرجى إدخال مبلغ تحويل صحيح', 'error');
      return;
    }

    const success = transferBetweenTreasury(fromChannel, toChannel, amt, transferNotes, {
      fromSubAccountId: (fromChannel === 'vodafoneCash' || fromChannel === 'instapay') ? (fromSubAccountId || null) : null,
      toSubAccountId: (toChannel === 'vodafoneCash' || toChannel === 'instapay') ? (toSubAccountId || null) : null
    });
    if (success) handleClose();
  };

  // Handle Adjust
  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    const val = Number(newBalance);
    if (isNaN(val) || val < 0) {
      showToast('يرجى إدخال رصيد صحيح', 'error');
      return;
    }

    if (selectedChannel === 'vodafoneCash' && shopWallets.length > 0 && !adjustSubAccountId) {
      showToast('يرجى اختيار خط فودافون كاش المراد تسوية رصيده ليبقى مطابقاً مع الخزينة', 'error');
      return;
    }

    if (selectedChannel === 'instapay' && instapayAccounts.length > 0 && !adjustSubAccountId) {
      showToast('يرجى اختيار حساب إنستاباي المراد تسوية رصيده ليبقى مطابقاً مع الخزينة', 'error');
      return;
    }

    const success = updateTreasuryBalance(
      selectedChannel,
      val,
      adjustReason,
      (selectedChannel === 'vodafoneCash' || selectedChannel === 'instapay') ? (adjustSubAccountId || null) : null
    );
    if (success) handleClose();
  };

  // Handle Deposit / Withdraw
  const handleDwSubmit = (e) => {
    e.preventDefault();
    const amt = Number(dwAmount);
    if (!amt || amt <= 0) {
      showToast('يرجى إدخال مبلغ صحيح', 'error');
      return;
    }

    if (dwChannel === 'vodafoneCash' && shopWallets.length > 0 && !dwSubAccountId) {
      showToast('يرجى اختيار خط فودافون كاش المستهدف لضمان تطابق السيولة', 'error');
      return;
    }

    if (dwChannel === 'instapay' && instapayAccounts.length > 0 && !dwSubAccountId) {
      showToast('يرجى اختيار حساب إنستاباي المستهدف لضمان تطابق السيولة', 'error');
      return;
    }

    const subId = (dwChannel === 'vodafoneCash' || dwChannel === 'instapay') ? (dwSubAccountId || null) : null;
    let success = false;
    if (dwType === 'deposit') {
      success = depositToTreasury(dwChannel, amt, dwNotes, subId);
    } else {
      success = withdrawFromTreasury(dwChannel, amt, dwNotes, subId);
    }
    if (success) handleClose();
  };

  const currentBal = adjustSubAccountId
    ? getSubAccountBalance(selectedChannel, adjustSubAccountId)
    : (Number(treasury?.[selectedChannel]) || 0);
  const newBalNum = Number(newBalance) || 0;
  const adjustDiff = newBalNum - currentBal;
  const maxTransferAvailable = getSubAccountBalance(fromChannel, fromSubAccountId);

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="adjust-capital-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/70 overflow-hidden animate-scale-in"
    >
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 id="adjust-capital-title" className="text-base sm:text-lg font-black leading-tight">
                إدارة وحركات رأس المال والسيولة
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                تحويل فوري بين الخزائن، تسوية الأرصدة والجرد، أو ضخ وسحب سيولة
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

        {/* Tab Switcher */}
        <div className="p-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('transfer')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'transfer'
                ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>تحويل بين الخزائن</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('adjust')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'adjust'
                ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>تسوية وجرد رصيد</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deposit_withdraw')}
            className={`flex-1 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'deposit_withdraw'
                ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>إيداع / سحب سيولة</span>
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">

          {/* TAB 1: Transfer Between Channels */}
          {activeTab === 'transfer' && (
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                💡 <span className="font-bold">تحويل فوري:</span> يمكنك تحويل أي مبالغ نقدية من كاش الدرج لحساب إنستاباي، أو من إنستاباي لتغذية محافظ فودافون كاش بضغطة زر.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* From Channel */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    التحويل من (خزينة المصدر):
                  </label>
                  <select
                    value={fromChannel}
                    onChange={(e) => {
                      const ch = e.target.value;
                      setFromChannel(ch);
                      setFromSubAccountId(getDefaultSubId(ch));
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:outline-none"
                  >
                    {CHANNELS.map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.label} ({formatCurrency(treasury?.[ch.id] || 0)})
                      </option>
                    ))}
                  </select>

                  {fromChannel === 'vodafoneCash' && shopWallets.length > 0 && (
                    <select
                      value={fromSubAccountId}
                      onChange={(e) => setFromSubAccountId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-rose-900 dark:text-rose-200"
                    >
                      <option value="">-- الإجمالي العام لخزينة فودافون كاش --</option>
                      {shopWallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.label} ({w.phoneNumber}) - المتاح: {formatCurrency(w.balance || 0)}
                        </option>
                      ))}
                    </select>
                  )}

                  {fromChannel === 'instapay' && instapayAccounts.length > 0 && (
                    <select
                      value={fromSubAccountId}
                      onChange={(e) => setFromSubAccountId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl font-bold text-amber-900 dark:text-amber-200"
                    >
                      <option value="">-- الإجمالي العام لخزينة إنستاباي --</option>
                      {instapayAccounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.accountName} - المتاح: {formatCurrency(a.balance || 0)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* To Channel */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    التحويل إلى (خزينة الوجهة):
                  </label>
                  <select
                    value={toChannel}
                    onChange={(e) => {
                      const ch = e.target.value;
                      setToChannel(ch);
                      setToSubAccountId(getDefaultSubId(ch));
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:outline-none"
                  >
                    {CHANNELS.filter(c => c.id !== fromChannel || c.id === 'vodafoneCash' || c.id === 'instapay').map(ch => (
                      <option key={ch.id} value={ch.id}>
                        {ch.label} ({formatCurrency(treasury?.[ch.id] || 0)})
                      </option>
                    ))}
                  </select>

                  {toChannel === 'vodafoneCash' && shopWallets.length > 0 && (
                    <select
                      value={toSubAccountId}
                      onChange={(e) => setToSubAccountId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-rose-900 dark:text-rose-200"
                    >
                      <option value="">-- الإجمالي العام لخزينة فودافون كاش --</option>
                      {shopWallets.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.label} ({w.phoneNumber}) - الحالي: {formatCurrency(w.balance || 0)}
                        </option>
                      ))}
                    </select>
                  )}

                  {toChannel === 'instapay' && instapayAccounts.length > 0 && (
                    <select
                      value={toSubAccountId}
                      onChange={(e) => setToSubAccountId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl font-bold text-amber-900 dark:text-amber-200"
                    >
                      <option value="">-- الإجمالي العام لخزينة إنستاباي --</option>
                      {instapayAccounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.accountName} - الحالي: {formatCurrency(a.balance || 0)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    مبلغ التحويل (ج.م) *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    المتاح للتحويل: <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(maxTransferAvailable)}</span>
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max={maxTransferAvailable}
                  step="any"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="أدخل المبلغ..."
                  className="w-full px-3 py-2.5 text-sm sm:text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-amber-600 focus:outline-none"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  بيان أو سبب التحويل (اختياري)
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="مثال: تغذية محفظة المبيعات، إيداع بنكي..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-interactive flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs sm:text-sm font-black shadow-md shadow-amber-600/25"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>تأكيد التحويل الآن</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Reconcile / Adjust Safe Balance */}
          {activeTab === 'adjust' && (
            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200">
                ⚖️ <span className="font-bold">جرد وتسوية الأرصدة:</span> استخدم هذه الخاصية عند عد كاش الدرج الفعلي أو مراجعة الحساب البنكي/إنستاباي لتطابق الرصيد الحقيقي مع السيستم.
              </div>

              {/* Channel Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  اختر الخزينة المراد جردها وتسويتها:
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => {
                    const ch = e.target.value;
                    const defaultSub = getDefaultSubId(ch);
                    setSelectedChannel(ch);
                    setAdjustSubAccountId(defaultSub);
                    setNewBalance(defaultSub ? getSubAccountBalance(ch, defaultSub) : (treasury?.[ch] || 0));
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:outline-none"
                >
                  {CHANNELS.map(ch => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label} (الحالي: {formatCurrency(treasury?.[ch.id] || 0)})
                    </option>
                  ))}
                </select>

                {selectedChannel === 'vodafoneCash' && shopWallets.length > 0 && (
                  <select
                    value={adjustSubAccountId}
                    onChange={(e) => {
                      const subId = e.target.value;
                      setAdjustSubAccountId(subId);
                      setNewBalance(getSubAccountBalance('vodafoneCash', subId));
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-rose-900 dark:text-rose-200"
                  >
                    <option value="">-- اختر خط فودافون كاش لتسوية رصيده --</option>
                    {shopWallets.map(w => (
                      <option key={w.id} value={w.id}>
                        خط: {w.label} ({w.phoneNumber}) - الحالي: {formatCurrency(w.balance || 0)}
                      </option>
                    ))}
                  </select>
                )}

                {selectedChannel === 'instapay' && instapayAccounts.length > 0 && (
                  <select
                    value={adjustSubAccountId}
                    onChange={(e) => {
                      const subId = e.target.value;
                      setAdjustSubAccountId(subId);
                      setNewBalance(getSubAccountBalance('instapay', subId));
                    }}
                    required
                    className="w-full px-3 py-2 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl font-bold text-amber-900 dark:text-amber-200"
                  >
                    <option value="">-- اختر حساب إنستاباي لتسوية رصيده --</option>
                    {instapayAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        حساب: {a.accountName} - الحالي: {formatCurrency(a.balance || 0)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* New Actual Balance */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الرصيد الفعلي الموجود الآن (ج.م) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  placeholder="أدخل الرصيد الفعلي..."
                  className="w-full px-3 py-2.5 text-sm sm:text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-emerald-600 focus:outline-none"
                  required
                />
              </div>

              {/* Difference Preview */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">الرصيد السابق:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(currentBal)}</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 block text-[10px]">الفرق المحسوب:</span>
                  <span className={`font-black ${adjustDiff > 0 ? 'text-emerald-600' : adjustDiff < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {adjustDiff > 0 ? `+${formatCurrency(adjustDiff)} (زيادة)` : adjustDiff < 0 ? `${formatCurrency(adjustDiff)} (عجز)` : 'متطابق تماماً'}
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-slate-400 block text-[10px]">الرصيد الجديد:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(newBalNum)}</span>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التعديل أو ملاحظات الجرد (اختياري)
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="مثال: جرد درج مسائي، مطابقة رصيد أبليكيشن..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-interactive flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/25"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد وحفظ الرصيد الجديد</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Deposit / Withdraw */}
          {activeTab === 'deposit_withdraw' && (
            <form onSubmit={handleDwSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDwType('deposit')}
                  className={`py-2 text-xs font-black rounded-lg transition-all ${
                    dwType === 'deposit' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  + إيداع / ضخ سيولة جديدة
                </button>
                <button
                  type="button"
                  onClick={() => setDwType('withdraw')}
                  className={`py-2 text-xs font-black rounded-lg transition-all ${
                    dwType === 'withdraw' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  - سحب أرباح أو مسحوبات شخصية
                </button>
              </div>

              {/* Channel */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  الخزينة المستهدفة:
                </label>
                <select
                  value={dwChannel}
                  onChange={(e) => {
                    const ch = e.target.value;
                    setDwChannel(ch);
                    setDwSubAccountId(getDefaultSubId(ch));
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:outline-none"
                >
                  {CHANNELS.map(ch => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label} ({formatCurrency(treasury?.[ch.id] || 0)})
                    </option>
                  ))}
                </select>

                {dwChannel === 'vodafoneCash' && shopWallets.length > 0 && (
                  <select
                    value={dwSubAccountId}
                    onChange={(e) => setDwSubAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-rose-900 dark:text-rose-200"
                  >
                    <option value="">-- الإجمالي العام لخزينة فودافون كاش --</option>
                    {shopWallets.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.label} ({w.phoneNumber}) - المتاح: {formatCurrency(w.balance || 0)}
                      </option>
                    ))}
                  </select>
                )}

                {dwChannel === 'instapay' && instapayAccounts.length > 0 && (
                  <select
                    value={dwSubAccountId}
                    onChange={(e) => setDwSubAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl font-bold text-amber-900 dark:text-amber-200"
                  >
                    <option value="">-- الإجمالي العام لخزينة إنستاباي --</option>
                    {instapayAccounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.accountName} - المتاح: {formatCurrency(a.balance || 0)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المبلغ (ج.م) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={dwAmount}
                  onChange={(e) => setDwAmount(e.target.value)}
                  placeholder="أدخل المبلغ..."
                  className={`w-full px-3 py-2.5 text-sm sm:text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black focus:outline-none ${
                    dwType === 'deposit' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البيان أو الملاحظات (اختياري)
                </label>
                <input
                  type="text"
                  value={dwNotes}
                  onChange={(e) => setDwNotes(e.target.value)}
                  placeholder={dwType === 'deposit' ? 'مثال: تمويل إضافي من صاحب المحل' : 'مثال: سحب أرباح شهرية'}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={`btn-interactive flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-black shadow-md ${
                    dwType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                  }`}
                >
                  {dwType === 'deposit' ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                  <span>{dwType === 'deposit' ? 'تأكيد الإيداع' : 'تأكيد السحب'}</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </dialog>
  );
}
