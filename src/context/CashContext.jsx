import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage, INITIAL_DEMO_INVENTORY, INITIAL_SHOP_WALLETS } from '../utils/storage';
import { 
  calculateWalletStats, 
  getTodayString, 
  getLocalDateString,
  formatCurrency,
  formatTimeArabic,
  cleanEgyptianPhone,
  isValidEgyptianPhone,
  getEgyptianPhoneError 
} from '../utils/formatters';
import confetti from 'canvas-confetti';
import { useAuth } from './AuthContext';
import { realtime } from '../services/realtimeService';
import { 
  subscribeToClients, 
  subscribeToTransactions, 
  subscribeToInventory,
  syncClientToCloud,
  deleteClientFromCloud,
  syncTransactionToCloud,
  deleteTransactionFromCloud,
  syncProductToCloud,
  deleteProductFromCloud,
  uploadAllLocalDataToCloud
} from '../firebase/firestoreService';

const CashContext = createContext();

export function CashProvider({ children }) {
  const { currentUser, shopId, setSyncStatus } = useAuth();

  const [clients, setClients] = useState(() => storage.getClients());
  const [transactions, setTransactions] = useState(() => storage.getTransactions());
  const [inventory, setInventory] = useState(() => storage.getInventory());
  const [shopWallets, setShopWallets] = useState(() => storage.getShopWallets());
  const [theme, setTheme] = useState(() => storage.getTheme());
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [toast, setToast] = useState(null);
  const [backendStatus, setBackendStatus] = useState('connecting'); // 'connected' | 'connecting' | 'disconnected'

  // Connect to local Node.js WebSocket backend & Database
  useEffect(() => {
    realtime.connect();

    const unsubStatus = realtime.onStatusChange((status) => {
      setBackendStatus(status);
      if (status === 'connected') {
        setSyncStatus('live');
      }
    });

    const unsubMessage = realtime.onMessage((msg) => {
      const { type, payload } = msg;

      if (type === 'INITIAL_STATE' && payload) {
        if (Array.isArray(payload.clients) && payload.clients.length > 0) {
          setClients(payload.clients);
        } else {
          // If server database is brand new and empty, seed it with current local data!
          const curClients = storage.getClients();
          const curTx = storage.getTransactions();
          const curInv = storage.getInventory();
          if (curClients.length > 0 || curInv.length > 0) {
            realtime.syncAll({
              clients: curClients,
              transactions: curTx,
              inventory: curInv,
              inboundLedger: storage.getLedger()
            });
          }
        }

        if (Array.isArray(payload.transactions) && payload.transactions.length > 0) {
          setTransactions(payload.transactions);
        }

        if (Array.isArray(payload.inventory) && payload.inventory.length > 0) {
          setInventory(payload.inventory);
        }
      }

      if (type === 'DATABASE_UPDATED' && payload) {
        if (payload.clients) setClients(payload.clients);
        if (payload.transactions) setTransactions(payload.transactions);
        if (payload.inventory) setInventory(payload.inventory);
      }

      if (type === 'CLIENT_UPDATED' && payload) {
        setClients(prev => {
          const idx = prev.findIndex(c => c.id === payload.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...payload };
            return next;
          }
          return [payload, ...prev];
        });
      }

      if (type === 'CLIENT_DELETED' && payload) {
        setClients(prev => prev.filter(c => c.id !== payload.id));
      }

      if (type === 'TRANSACTION_ADDED' && payload) {
        setTransactions(prev => {
          if (prev.some(t => t.id === payload.id)) return prev;
          return [payload, ...prev];
        });
      }

      if (type === 'TRANSACTION_DELETED' && payload) {
        setTransactions(prev => prev.filter(t => t.id !== payload.id));
      }

      if (type === 'PRODUCT_UPDATED' && payload) {
        setInventory(prev => {
          const idx = prev.findIndex(p => p.id === payload.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...payload };
            return next;
          }
          return [payload, ...prev];
        });
      }

      if (type === 'PRODUCT_DELETED' && payload) {
        setInventory(prev => prev.filter(p => p.id !== payload.id));
      }
    });

    return () => {
      unsubStatus();
      unsubMessage();
    };
  }, []);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    if (!currentUser || !shopId) return;

    setSyncStatus('syncing');

    const unsubClients = subscribeToClients(shopId, (cloudClients) => {
      if (cloudClients && cloudClients.length > 0) {
        setClients(cloudClients);
      }
      setSyncStatus('live');
    });

    const unsubTransactions = subscribeToTransactions(shopId, (cloudTransactions) => {
      if (cloudTransactions) {
        setTransactions(cloudTransactions);
      }
      setSyncStatus('live');
    });

    const unsubInventory = subscribeToInventory(shopId, (cloudInventory) => {
      if (cloudInventory && cloudInventory.length > 0) {
        setInventory(cloudInventory);
      }
      setSyncStatus('live');
    });

    return () => {
      unsubClients();
      unsubTransactions();
      unsubInventory();
    };
  }, [currentUser?.uid, shopId]);

  const uploadToCloud = async () => {
    if (!shopId) throw new Error('رمز المحل غير محدد');
    await uploadAllLocalDataToCloud(shopId, {
      clients,
      transactions,
      inventory,
      inboundLedger: storage.getLedger()
    });
  };
  
  // Custom interactive Confirmation & Alert Popup State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    details: '',
    type: 'danger', // 'danger' | 'warning' | 'info' | 'success'
    confirmText: 'تأكيد',
    cancelText: 'إلغاء',
    resolve: null
  });

  // Active modals state
  const [activeModal, setActiveModal] = useState(null); // 'transfer', 'addClient', 'addWallet', 'editLimit', 'receipt', 'backup', 'addProduct', 'sellProduct', 'restockProduct'
  const [modalData, setModalData] = useState(null);

  // Trash & Recycle Bin State
  const [trash, setTrash] = useState(() => storage.getTrash());

  // Client Accounts Archive State (أرشيف حسابات العملاء والتسويات المقفلة)
  const [clientArchives, setClientArchives] = useState(() => storage.getClientArchives());

  // Dismissed Archive IDs (سجلات الأرشيف التي تم حذفها دون حذف المعاملة الأصلية من المبيعات أو الخط)
  const [dismissedArchiveIds, setDismissedArchiveIds] = useState(() => new Set(storage.getDismissedArchiveIds()));

  // Sync clients to localStorage
  useEffect(() => {
    storage.saveClients(clients);
  }, [clients]);

  // Sync transactions to localStorage
  useEffect(() => {
    storage.saveTransactions(transactions);
  }, [transactions]);

  // Sync inventory to localStorage
  useEffect(() => {
    storage.saveInventory(inventory);
  }, [inventory]);

  // Sync shopWallets to localStorage
  useEffect(() => {
    storage.saveShopWallets(shopWallets);
  }, [shopWallets]);

  // Sync trash to localStorage
  useEffect(() => {
    storage.saveTrash(trash);
  }, [trash]);

  // Sync clientArchives to localStorage
  useEffect(() => {
    storage.saveClientArchives(clientArchives);
  }, [clientArchives]);

  // Sync theme
  useEffect(() => {
    storage.saveTheme(theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
  };

  /**
   * Universal Promise-based In-App Confirm Popup (replaces window.confirm)
   */
  const askConfirm = ({
    title = 'تأكيد العملية',
    message = 'هل أنت متأكد من رغبتك في المتابعة؟',
    details = '',
    type = 'danger',
    confirmText = 'تأكيد',
    cancelText = 'إلغاء'
  }) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        details,
        type,
        confirmText,
        cancelText,
        resolve
      });
    });
  };

  /**
   * Universal In-App Alert Popup (replaces window.alert)
   */
  const showAlert = ({
    title = 'تنبيه',
    message = '',
    details = '',
    type = 'info'
  }) => {
    return askConfirm({
      title,
      message,
      details,
      type,
      confirmText: 'حسناً',
      cancelText: ''
    });
  };

  const handleConfirmClose = (result) => {
    if (confirmModal.resolve) {
      confirmModal.resolve(result);
    }
    setConfirmModal(prev => ({ ...prev, isOpen: false, resolve: null }));
  };

  // Toggle dark/light theme
  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Confetti celebration
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#e60000', '#22c55e', '#3b82f6', '#f59e0b']
      });
    } catch {
      // Fallback if canvas is not available
    }
  };

  // Helper to find wallet & client by walletId (supports shop wallets & client wallets)
  const findWalletAndClient = (walletId) => {
    // 1. Check shop personal wallets
    const shopWallet = (shopWallets || []).find(w => w.id === walletId);
    if (shopWallet) {
      return {
        client: { id: 'shop', name: 'أرقام وخطوط المحل' },
        wallet: { ...shopWallet, isShopWallet: true },
        isShopWallet: true
      };
    }

    // 2. Check client wallets
    for (const client of clients) {
      const wallet = (client.wallets || []).find(w => w.id === walletId);
      if (wallet) {
        return { client, wallet: { ...wallet, isShopWallet: false }, isShopWallet: false };
      }
    }
    return { client: null, wallet: null, isShopWallet: false };
  };

  // Client Management
  const addClient = ({ name, notes = '', clientType = 'عادي', initialPhoneNumber, initialWalletLabel = 'المحفظة الأساسية', initialLimit = 200000, wallets = [] }) => {
    const finalType = clientType || 'عادي';
    const newClient = {
      id: `client-${Date.now()}`,
      name: name.trim(),
      notes: notes.trim(),
      clientType: finalType,
      createdAt: new Date().toISOString(),
      wallets: []
    };

    try {
      localStorage.setItem(`elaasar_client_type_${newClient.id}`, finalType);
    } catch (e) {
      console.error(e);
    }

    if (Array.isArray(wallets) && wallets.length > 0) {
      wallets.forEach((w, idx) => {
        const clean = cleanEgyptianPhone(w.phoneNumber);
        if (clean && isValidEgyptianPhone(clean)) {
          newClient.wallets.push({
            id: `wallet-${Date.now()}-${idx}`,
            phoneNumber: clean,
            label: (w.label || `محفظة ${idx + 1}`).trim(),
            totalLimit: Number(w.totalLimit) || 200000,
            createdAt: new Date().toISOString()
          });
        }
      });
    } else if (initialPhoneNumber) {
      const clean = cleanEgyptianPhone(initialPhoneNumber);
      if (clean && isValidEgyptianPhone(clean)) {
        newClient.wallets.push({
          id: `wallet-${Date.now()}`,
          phoneNumber: clean,
          label: initialWalletLabel.trim() || 'المحفظة الأساسية',
          totalLimit: Number(initialLimit) || 200000,
          createdAt: new Date().toISOString()
        });
      }
    }

    setClients(prev => [newClient, ...prev]);
    realtime.saveClient(newClient);
    if (currentUser && shopId) syncClientToCloud(shopId, newClient);
    showToast(`تمت إضافة العميل "${newClient.name}" بنجاح!`);
    return newClient;
  };

  const updateClient = (clientId, updatedFields) => {
    setClients(prev => {
      const next = prev.map(c => (c.id === clientId ? { ...c, ...updatedFields } : c));
      const updated = next.find(c => c.id === clientId);
      if (updated) realtime.saveClient(updated);
      if (currentUser && shopId && updated) syncClientToCloud(shopId, updated);
      return next;
    });
    showToast('تم تحديث بيانات العميل بنجاح');
  };

  const deleteClient = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Move to Trash
    const trashedClient = {
      ...client,
      deletedAt: new Date().toISOString()
    };
    setTrash(prev => ({
      ...prev,
      clients: [trashedClient, ...(prev.clients || []).filter(c => c.id !== clientId)]
    }));

    setClients(prev => prev.filter(c => c.id !== clientId));
    realtime.deleteClient(clientId);
    if (currentUser && shopId) deleteClientFromCloud(shopId, clientId);
    showToast(`تم نقل العميل "${client.name}" إلى سلة المحذوفات`, 'info');
  };

  // Wallet Management
  const addWallet = (clientId, { phoneNumber, label = 'محفظة جديدة', totalLimit = 200000 }) => {
    const cleanPhone = cleanEgyptianPhone(phoneNumber);
    if (!isValidEgyptianPhone(cleanPhone)) {
      showToast(getEgyptianPhoneError(cleanPhone) || 'رقم المحفظة غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً', 'error');
      return null;
    }
    const cleanLimit = Number(totalLimit) || 200000;

    const newWallet = {
      id: `wallet-${Date.now()}`,
      phoneNumber: cleanPhone,
      label: label.trim() || 'محفظة فودافون',
      totalLimit: cleanLimit,
      createdAt: new Date().toISOString()
    };

    setClients(prev => {
      const next = prev.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            wallets: [...(c.wallets || []), newWallet]
          };
        }
        return c;
      });
      const updated = next.find(c => c.id === clientId);
      if (updated) realtime.saveClient(updated);
      if (currentUser && shopId && updated) syncClientToCloud(shopId, updated);
      return next;
    });

    showToast(`تمت إضافة الرقم ${cleanPhone} بليميت ${formatCurrency(cleanLimit)}`);
    return newWallet;
  };

  const updateWallet = (clientId, walletId, updatedFields) => {
    const fieldsToUpdate = { ...updatedFields };
    if (fieldsToUpdate.phoneNumber) {
      const cleanPhone = cleanEgyptianPhone(fieldsToUpdate.phoneNumber);
      if (!isValidEgyptianPhone(cleanPhone)) {
        showToast(getEgyptianPhoneError(cleanPhone) || 'رقم المحفظة غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً', 'error');
        return;
      }
      fieldsToUpdate.phoneNumber = cleanPhone;
    }

    setClients(prev => {
      const next = prev.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            wallets: (c.wallets || []).map(w =>
              w.id === walletId ? { ...w, ...fieldsToUpdate } : w
            )
          };
        }
        return c;
      });
      const updated = next.find(c => c.id === clientId);
      if (updated) realtime.saveClient(updated);
      if (currentUser && shopId && updated) syncClientToCloud(shopId, updated);
      return next;
    });
    showToast('تم تحديث بيانات المحفظة والليميت');
  };

  const deleteWallet = (clientId, walletId) => {
    const client = clients.find(c => c.id === clientId);
    const wallet = client?.wallets?.find(w => w.id === walletId);
    if (!wallet) return;

    // Move to Trash
    const trashedWallet = {
      ...wallet,
      clientId,
      clientName: client?.name || 'عميل',
      deletedAt: new Date().toISOString()
    };
    setTrash(prev => ({
      ...prev,
      wallets: [trashedWallet, ...(prev.wallets || []).filter(w => w.id !== walletId)]
    }));

    setClients(prev => {
      const next = prev.map(c => {
        if (c.id === clientId) {
          return {
            ...c,
            wallets: (c.wallets || []).filter(w => w.id !== walletId)
          };
        }
        return c;
      });
      const updated = next.find(c => c.id === clientId);
      if (updated) realtime.saveClient(updated);
      if (currentUser && shopId && updated) syncClientToCloud(shopId, updated);
      return next;
    });
    showToast(`تم نقل المحفظة (${wallet.phoneNumber}) إلى سلة المحذوفات`, 'info');
  };

  // ==========================================
  // SHOP WALLETS MANAGEMENT (أرقام وخطوط المحل الشخصية)
  // ==========================================
  const addShopWallet = ({ phoneNumber, label = 'خط المحل', totalLimit = 200000 }) => {
    const cleanPhone = cleanEgyptianPhone(phoneNumber);
    if (!isValidEgyptianPhone(cleanPhone)) {
      showToast(getEgyptianPhoneError(cleanPhone) || 'رقم الخط غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً', 'error');
      return null;
    }
    const cleanLimit = Number(totalLimit) || 200000;

    const newWallet = {
      id: `shop-wallet-${Date.now()}`,
      phoneNumber: cleanPhone,
      label: label.trim() || 'خط المحل',
      totalLimit: cleanLimit,
      isShopWallet: true,
      createdAt: new Date().toISOString()
    };

    setShopWallets(prev => [newWallet, ...prev]);
    showToast(`تمت إضافة خط المحل (${cleanPhone}) بليميت ${formatCurrency(cleanLimit)}`);
    return newWallet;
  };

  const updateShopWallet = (walletId, updatedFields) => {
    const fieldsToUpdate = { ...updatedFields };
    if (fieldsToUpdate.phoneNumber) {
      const cleanPhone = cleanEgyptianPhone(fieldsToUpdate.phoneNumber);
      if (!isValidEgyptianPhone(cleanPhone)) {
        showToast(getEgyptianPhoneError(cleanPhone) || 'رقم الخط غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً', 'error');
        return;
      }
      fieldsToUpdate.phoneNumber = cleanPhone;
    }

    setShopWallets(prev => prev.map(w =>
      w.id === walletId ? { ...w, ...fieldsToUpdate } : w
    ));
    showToast('تم تحديث بيانات خط المحل والليميت بنجاح');
  };

  const deleteShopWallet = (walletId) => {
    const wallet = shopWallets.find(w => w.id === walletId);
    if (!wallet) return;

    // Move to Trash
    const trashedWallet = {
      ...wallet,
      isShopWallet: true,
      clientName: 'أرقام وخطوط المحل',
      deletedAt: new Date().toISOString()
    };
    setTrash(prev => ({
      ...prev,
      wallets: [trashedWallet, ...(prev.wallets || []).filter(w => w.id !== walletId)]
    }));

    setShopWallets(prev => prev.filter(w => w.id !== walletId));
    showToast(`تم نقل خط المحل (${wallet.phoneNumber}) إلى سلة المحذوفات`, 'info');
  };

  // Transaction Management
  const addTransaction = ({
    walletId,
    amount,
    recipientPhone,
    transactionCode,
    fee = 0,
    notes = '',
    date = null
  }) => {
    const { client, wallet, isShopWallet } = findWalletAndClient(walletId);
    if (!wallet) {
      showToast('المحفظة غير موجودة', 'error');
      return null;
    }

    const numAmount = Number(amount);
    const stats = calculateWalletStats(wallet, transactions);

    // Apply strict limit checks ONLY for shop personal lines (client limits relaxed as requested)
    if (isShopWallet) {
      if (stats.isExhausted) {
        showToast('عفواً، هذا الرقم مقفل لاكتمال ليميت الـ 200,000 ج.م الشهري بالكامل!', 'error');
        return null;
      }

      if (numAmount > stats.remainingDailyTransfer) {
        showToast(
          `عفواً، الحد الأقصى للتحويل من هذا الرقم هو 60,000 ج.م في اليوم الواحد! المتبقي اليوم: ${formatCurrency(stats.remainingDailyTransfer)}`,
          'error'
        );
        return null;
      }

      if (numAmount > stats.remainingLimit) {
        showToast('المبلغ المطلوب تحويله أكبر من الليميت المتاح لهذه المحفظة!', 'error');
        return null;
      }
    }

    const cleanRecipient = recipientPhone ? cleanEgyptianPhone(recipientPhone) : '';
    if (!cleanRecipient) {
      showToast('يرجى إدخال رقم المحول إليه (المستلم)', 'error');
      return null;
    }
    if (!isValidEgyptianPhone(cleanRecipient)) {
      showToast('رقم المحول إليه غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً', 'error');
      return null;
    }

    const dateObj = date ? new Date(date) : new Date();
    const dateOnly = getLocalDateString(dateObj);
    const limitAfter = Math.max(0, stats.remainingLimit - numAmount);

    const newTx = {
      id: `tx-${Date.now()}`,
      walletId,
      walletPhone: wallet.phoneNumber,
      walletLabel: wallet.label,
      customerId: client?.id,
      customerName: client?.name,
      type: 'transfer_out',
      amount: numAmount,
      limitAfter,
      recipientPhone: cleanRecipient,
      transactionCode: (transactionCode || `VF-${Math.floor(100000 + Math.random() * 900000)}`).trim(),
      fee: Number(fee) || 0,
      notes: notes.trim(),
      date: dateObj.toISOString(),
      dateOnly
    };

    setTransactions(prev => [newTx, ...prev]);
    realtime.addTransaction(newTx);
    if (currentUser && shopId) {
      syncTransactionToCloud(shopId, newTx);
      const parentClient = clients.find(c => c.id === client?.id);
      if (parentClient) syncClientToCloud(shopId, parentClient);
    }

    // Celebrate and notify
    triggerConfetti();
    showToast(
      `تم تسجيل التحويل بنجاح بقيمة ${formatCurrency(numAmount)} - المتبقي: ${formatCurrency(limitAfter)}`,
      'success'
    );

    return newTx;
  };

  // Recharge / Add balance to wallet (Open receiving, no daily limit)
  const addRecharge = ({ walletId, amount, notes = '', date = null }) => {
    const { client, wallet, isShopWallet } = findWalletAndClient(walletId);
    if (!wallet) {
      showToast('المحفظة غير موجودة', 'error');
      return null;
    }

    const numAmount = Number(amount);
    if (numAmount <= 0) {
      showToast('يرجى إدخال مبلغ شحن صحيح أكبر من 0', 'error');
      return null;
    }

    const stats = calculateWalletStats(wallet, transactions);

    let clientSettledAt = client?.settledAt;
    if (!clientSettledAt && client?.id) {
      try {
        clientSettledAt = localStorage.getItem(`elaasar_client_settled_at_${client.id}`);
      } catch (e) {
        clientSettledAt = null;
      }
    }
    const settledTime = clientSettledAt ? new Date(clientSettledAt).getTime() : 0;
    const nowTime = Date.now();
    // Guarantee that this new transaction's timestamp is strictly after any prior settlement cutoff
    const txTime = Math.max(nowTime, (settledTime || 0) + 1000);
    const dateObj = date ? new Date(date) : new Date(txTime);
    const dateOnly = getLocalDateString(dateObj);
    const limitAfter = stats.remainingLimit + numAmount;

    const newTx = {
      id: `tx-rc-${Date.now()}`,
      walletId,
      walletPhone: wallet.phoneNumber,
      walletLabel: wallet.label,
      customerId: client?.id,
      customerName: client?.name,
      type: 'recharge',
      amount: numAmount,
      limitAfter,
      transactionCode: `RC-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: notes.trim() || 'إضافة وشحن رصيد للمحفظة',
      date: dateObj.toISOString(),
      dateOnly,
      time: formatTimeArabic(dateObj),
      isSettled: false
    };

    setTransactions(prev => [newTx, ...prev]);
    realtime.addTransaction(newTx);
    if (currentUser && shopId) {
      syncTransactionToCloud(shopId, newTx);
      const parentClient = clients.find(c => c.id === client?.id);
      if (parentClient) syncClientToCloud(shopId, parentClient);
    }

    triggerConfetti();

    if (!isShopWallet && client) {
      // 1. Resolve client excess credit (رصيد دائن سابق ناتج عن سداد بزيادة)
      let currentExcessCredit = client.excessCredit;
      let currentExcessCreditDate = client.excessCreditDate;
      if (currentExcessCredit === undefined || currentExcessCredit === null) {
        try {
          const saved = localStorage.getItem(`elaasar_client_excess_credit_${client.id}`);
          if (saved !== null && saved !== '') {
            currentExcessCredit = Number(saved);
            currentExcessCreditDate = localStorage.getItem(`elaasar_client_excess_credit_date_${client.id}`);
          }
        } catch (e) {
          console.error(e);
        }
      }

      let currentClientType = client.clientType;
      if (!currentClientType) {
        try {
          currentClientType = localStorage.getItem(`elaasar_client_type_${client.id}`);
        } catch {
          currentClientType = 'مدين';
        }
      }

      // Check if client is a creditor and compute active net credit before this recharge
      const cutoffTime = currentExcessCreditDate ? new Date(currentExcessCreditDate).getTime() : 0;
      const clientWalletIds = new Set((client.wallets || []).map(w => w.id));

      const priorRecharges = (transactions || []).filter(t =>
        (clientWalletIds.has(t.walletId) || t.customerId === client.id || t.clientId === client.id) &&
        (t.type === 'recharge' || t.type === 'limit_reset') &&
        !t.isSettled &&
        (cutoffTime === 0 || new Date(t.date).getTime() > cutoffTime)
      ).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const priorPayouts = (transactions || []).filter(t =>
        (t.clientId === client.id || t.customerId === client.id) &&
        t.type === 'client_payment' &&
        t.isCreditorPayout &&
        !t.isSettled &&
        (cutoffTime === 0 || new Date(t.date).getTime() > cutoffTime)
      ).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const isCreditorWithActiveCredit = (currentClientType === 'دائن') &&
        (Number(currentExcessCredit) > 0) &&
        ((Number(currentExcessCredit) - priorPayouts - priorRecharges) > 0);

      if (isCreditorWithActiveCredit) {
        const creditBefore = Number(currentExcessCredit) - priorPayouts - priorRecharges;
        const creditAfter = creditBefore - numAmount;

        if (creditAfter > 0) {
          // Client is STILL A CREDITOR (له رصيد دائن متبقي)
          updateClient(client.id, {
            clientType: 'دائن',
            excessCredit: currentExcessCredit,
            excessCreditDate: currentExcessCreditDate,
            excessDebt: null,
            excessDebtDate: null
          });

          try {
            localStorage.setItem(`elaasar_client_type_${client.id}`, 'دائن');
            localStorage.setItem(`elaasar_client_excess_credit_${client.id}`, String(currentExcessCredit));
            localStorage.setItem(`elaasar_client_excess_credit_date_${client.id}`, currentExcessCreditDate);
            localStorage.removeItem(`elaasar_client_excess_debt_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_debt_date_${client.id}`);
            window.dispatchEvent(new CustomEvent('elaasar_client_type_changed', {
              detail: { resultingType: 'دائن', clientId: client.id }
            }));
          } catch (e) {
            console.error(e);
          }

          archiveClientCycle({
            clientId: client.id,
            clientName: client.name,
            cycleType: 'شحن رصيد للخط (خصم من الرصيد الدائن)',
            operationCategory: 'recharge',
            rechargeAmount: numAmount,
            amountPaid: 0,
            debtBefore: 0,
            creditBefore,
            excessAmount: creditAfter,
            finalBalance: creditAfter,
            resultingType: 'دائن',
            paymentMethod: 'recharge',
            notes: notes.trim()
              ? `${notes.trim()} (شحن لرقم ${wallet.phoneNumber} - متبقي له رصيد دائن ${formatCurrency(creditAfter)})`
              : `شحن رصيد للرقم ${wallet.phoneNumber} (تم الخصم من الرصيد الدائن، والمتبقي له ${formatCurrency(creditAfter)} دائن)`,
            date: dateObj.toISOString(),
            dateOnly,
            time: formatTimeArabic(dateObj),
            walletPhone: wallet.phoneNumber,
            walletLabel: wallet.label,
            transactionId: newTx.id,
            isClosedCycle: false
          });
        } else if (creditAfter === 0) {
          // Client has consumed their entire credit exactly! (حساب خالص 0 ج.م)
          updateClient(client.id, {
            clientType: 'عادي',
            excessCredit: 0,
            excessCreditDate: null,
            excessDebt: null,
            excessDebtDate: null,
            settledAt: dateObj.toISOString()
          });

          try {
            localStorage.setItem(`elaasar_client_type_${client.id}`, 'عادي');
            localStorage.setItem(`elaasar_client_settled_at_${client.id}`, dateObj.toISOString());
            localStorage.removeItem(`elaasar_client_excess_credit_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_credit_date_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_debt_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_debt_date_${client.id}`);
            window.dispatchEvent(new CustomEvent('elaasar_client_type_changed', {
              detail: { resultingType: 'عادي', clientId: client.id }
            }));
          } catch (e) {
            console.error(e);
          }

          archiveClientCycle({
            clientId: client.id,
            clientName: client.name,
            cycleType: 'شحن رصيد واستهلاك كامل الرصيد الدائن (تصفير الحساب)',
            operationCategory: 'recharge',
            rechargeAmount: numAmount,
            amountPaid: 0,
            debtBefore: 0,
            creditBefore,
            excessAmount: 0,
            finalBalance: 0,
            resultingType: 'عادي',
            paymentMethod: 'recharge',
            notes: notes.trim()
              ? `${notes.trim()} (استهلاك كامل الرصيد الدائن وتصفير الحساب)`
              : `شحن رصيد للرقم ${wallet.phoneNumber} واستهلاك كامل الرصيد الدائن (${formatCurrency(creditBefore)}) ليصبح حسابه خالص (0 ج.م)`,
            date: dateObj.toISOString(),
            dateOnly,
            time: formatTimeArabic(dateObj),
            walletPhone: wallet.phoneNumber,
            walletLabel: wallet.label,
            transactionId: newTx.id,
            isClosedCycle: true
          });
        } else {
          // Recharge was greater than credit -> becomes debtor (مدين بالمتبقي)
          const newDebt = Math.abs(creditAfter);
          updateClient(client.id, {
            clientType: 'مدين',
            excessDebt: newDebt,
            excessDebtDate: dateObj.toISOString(),
            excessCredit: null,
            excessCreditDate: null,
            settledAt: dateObj.toISOString()
          });

          try {
            localStorage.setItem(`elaasar_client_type_${client.id}`, 'مدين');
            localStorage.setItem(`elaasar_client_excess_debt_${client.id}`, String(newDebt));
            localStorage.setItem(`elaasar_client_excess_debt_date_${client.id}`, dateObj.toISOString());
            localStorage.removeItem(`elaasar_client_excess_credit_${client.id}`);
            localStorage.removeItem(`elaasar_client_excess_credit_date_${client.id}`);
            window.dispatchEvent(new CustomEvent('elaasar_client_type_changed', {
              detail: { resultingType: 'مدين', clientId: client.id }
            }));
          } catch (e) {
            console.error(e);
          }

          archiveClientCycle({
            clientId: client.id,
            clientName: client.name,
            cycleType: 'شحن رصيد بزيادة عن الرصيد الدائن (تحويل لمدين)',
            operationCategory: 'recharge',
            rechargeAmount: numAmount,
            amountPaid: 0,
            debtBefore: 0,
            creditBefore,
            excessAmount: 0,
            finalBalance: newDebt,
            resultingType: 'مدين',
            paymentMethod: 'recharge',
            notes: notes.trim()
              ? `${notes.trim()} (شحن تجاوز الرصيد الدائن، وأصبح مدين بمبلغ ${formatCurrency(newDebt)})`
              : `شحن رصيد للرقم ${wallet.phoneNumber} تجاوز الرصيد الدائن (${formatCurrency(creditBefore)})، وأصبح العميل مدين بمبلغ ${formatCurrency(newDebt)} ج.م`,
            date: dateObj.toISOString(),
            dateOnly,
            time: formatTimeArabic(dateObj),
            walletPhone: wallet.phoneNumber,
            walletLabel: wallet.label,
            transactionId: newTx.id,
            isClosedCycle: false
          });
        }
      } else {
        // Standard client (مدين or عادي) receiving a recharge -> becomes 'مدين'
        updateClient(client.id, {
          clientType: 'مدين',
          excessCredit: null,
          excessCreditDate: null
        });

        try {
          localStorage.setItem(`elaasar_client_type_${client.id}`, 'مدين');
          localStorage.removeItem(`elaasar_client_excess_credit_${client.id}`);
          localStorage.removeItem(`elaasar_client_excess_credit_date_${client.id}`);
          window.dispatchEvent(new CustomEvent('elaasar_client_type_changed', {
            detail: { resultingType: 'مدين', clientId: client.id }
          }));
        } catch (e) {
          console.error(e);
        }

        // Automatically document this recharge in the Client Accounts Archive!
        archiveClientCycle({
          clientId: client.id,
          clientName: client.name,
          cycleType: 'شحن رصيد للخط',
          operationCategory: 'recharge',
          rechargeAmount: numAmount,
          amountPaid: 0,
          debtBefore: 0,
          creditBefore: 0,
          excessAmount: 0,
          finalBalance: numAmount,
          resultingType: 'مدين',
          paymentMethod: 'recharge',
          notes: notes.trim()
            ? `${notes.trim()} (شحن لرقم ${wallet.phoneNumber})`
            : `شحن رصيد للرقم ${wallet.phoneNumber}`,
          date: dateObj.toISOString(),
          dateOnly,
          time: formatTimeArabic(dateObj),
          walletPhone: wallet.phoneNumber,
          walletLabel: wallet.label,
          transactionId: newTx.id,
          isClosedCycle: false
        });
      }

      // Client Wallet Rules Check (60k daily, 200k monthly)
      const newDailyTotal = stats.todayRecharges + numAmount;
      const newMonthTotal = stats.totalRecharges + numAmount;
      const isOverDaily = newDailyTotal > 60000;
      const isOverMonth = newMonthTotal > (wallet.totalLimit || 200000);

      if (isOverDaily || isOverMonth) {
        const warnings = [];
        if (isOverDaily) warnings.push(`تجاوز الحد اليومي (${formatCurrency(newDailyTotal)} من 60 ألف)`);
        if (isOverMonth) warnings.push(`تجاوز الليميت الشهري (${formatCurrency(newMonthTotal)} من 200 ألف)`);
        showToast(
          `تم شحن ${formatCurrency(numAmount)} للعميل بنجاح - ⚠️ تنبيه: ${warnings.join(' و ')}`,
          'warning'
        );
      } else {
        showToast(
          `تم شحن الرصيد بنجاح بقيمة ${formatCurrency(numAmount)} للعميل (${client?.name || ''})`,
          'success'
        );
      }
    } else {
      // Shop Wallet Toast
      const walletCap = wallet.totalLimit || 200000;
      if (limitAfter > walletCap) {
        const overAmount = limitAfter - walletCap;
        showToast(
          `تم شحن الرصيد بنجاح بقيمة ${formatCurrency(numAmount)} - ⚠️ تنبيه: إجمالي الرصيد تجاوز الليميت (${formatCurrency(limitAfter)}، زيادة ${formatCurrency(overAmount)})`,
          'warning'
        );
      } else {
        showToast(
          `تم شحن الرصيد بنجاح بقيمة ${formatCurrency(numAmount)} - الرصيد الجديد: ${formatCurrency(limitAfter)}`,
          'success'
        );
      }
    }

    return newTx;
  };

  // Add client payment (سداد دفعة نقدية أو بنكية من حساب العميل أو صرف مستحقات للعميل الدائن)
  const addClientPayment = ({
    clientId,
    amount,
    rawAmount = null,
    excessDebt = null,
    creditBefore = null,
    notes = '',
    paymentMethod = 'cash',
    isCreditorPayout = false,
    date = null,
    time = null
  }) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      showToast('العميل غير موجود', 'error');
      return null;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('يرجى إدخال مبلغ سداد صحيح أكبر من 0', 'error');
      return null;
    }

    const dateObj = date ? new Date(date) : new Date();
    const dateOnly = getLocalDateString(dateObj);
    const timeStr = time ? formatTimeArabic(time) : formatTimeArabic(dateObj);

    const newTx = {
      id: `tx-pay-${Date.now()}`,
      clientId: client.id,
      customerId: client.id,
      customerName: client.name,
      type: 'client_payment',
      isCreditorPayout: Boolean(isCreditorPayout),
      amount: numAmount,
      rawAmount: Number(rawAmount) || numAmount,
      excessDebt: Number(excessDebt) || 0,
      creditBefore: Number(creditBefore) || 0,
      paymentMethod: paymentMethod || 'cash',
      notes: notes.trim() || (isCreditorPayout ? 'صرف وسداد مستحقات للعميل الدائن' : 'سداد دفعة من الحساب'),
      date: dateObj.toISOString(),
      dateOnly,
      time: timeStr,
      transactionCode: `PAY-${Math.floor(100000 + Math.random() * 900000)}`
    };

    setTransactions(prev => [newTx, ...prev]);
    realtime.addTransaction(newTx);
    if (currentUser && shopId) {
      syncTransactionToCloud(shopId, newTx);
      syncClientToCloud(shopId, client);
    }

    triggerConfetti();
    return newTx;
  };

  // Archive a completed customer accounting cycle or payment (أرشفة دورة حساب العميل أو الدفعة في الأرشيف)
  const archiveClientCycle = ({
    clientId,
    clientName,
    cycleType,
    operationCategory = 'payment',
    rechargeAmount = 0,
    debtBefore = 0,
    creditBefore = 0,
    amountPaid = 0,
    rawAmount = null,
    paymentMethod = 'cash',
    excessAmount = 0,
    finalBalance = 0,
    resultingType = 'عادي',
    notes = '',
    date = null,
    time = null,
    walletPhone = '',
    walletLabel = '',
    transactionId = null,
    isClosedCycle = false
  }) => {
    const dateObj = date ? new Date(date) : new Date();
    const dateOnly = getLocalDateString(dateObj);
    const timeStr = time ? formatTimeArabic(time) : formatTimeArabic(dateObj);

    const newArchive = {
      id: `arch-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      transactionId: transactionId || null,
      clientId,
      clientName: clientName || 'عميل',
      cycleType: cycleType || 'تسوية حساب',
      operationCategory: operationCategory || (cycleType?.includes('شحن') ? 'recharge' : 'payment'),
      debtBefore: Number(debtBefore) || 0,
      creditBefore: Number(creditBefore) || 0,
      amountPaid: Number(amountPaid) || 0,
      rechargeAmount: Number(rechargeAmount) || 0,
      rawAmount: rawAmount !== null ? Number(rawAmount) : Number(amountPaid) || 0,
      paymentMethod: paymentMethod || 'cash',
      excessAmount: Number(excessAmount) || 0,
      finalBalance: Number(finalBalance) || 0,
      resultingType: resultingType || 'عادي',
      walletPhone: walletPhone || '',
      walletLabel: walletLabel || '',
      notes: notes.trim(),
      date: dateObj.toISOString(),
      dateOnly,
      time: timeStr
    };

    setClientArchives(prev => [newArchive, ...prev]);

    // Only mark past transactions as settled if this payment explicitly closes the accounting cycle
    if (isClosedCycle || resultingType === 'عادي') {
      const targetClient = clients.find(c => c.id === clientId);
      const targetWalletIds = new Set((targetClient?.wallets || []).map(w => w.id));
      setTransactions(prev => {
        const next = prev.map(t => {
          const isClientTx = t.clientId === clientId || t.customerId === clientId || targetWalletIds.has(t.walletId);
          if (isClientTx && !t.isSettled) {
            return { ...t, isSettled: true, settledCycleId: newArchive.id };
          }
          return t;
        });
        return next;
      });
    }

    return newArchive;
  };

  const deleteClientArchive = (archiveId, transactionId = null) => {
    setClientArchives(prev => prev.filter(a => a.id !== archiveId));
    setDismissedArchiveIds(prev => {
      const next = new Set(prev);
      if (archiveId) next.add(archiveId);
      if (transactionId) next.add(transactionId);
      if (typeof archiveId === 'string' && archiveId.startsWith('tx_')) {
        next.add(archiveId.replace('tx_', ''));
      }
      storage.saveDismissedArchiveIds(Array.from(next));
      return next;
    });
    showToast('تم مسح السجل من الأرشيف مع بقاء المبيعات وحركات الخط كما هي', 'info');
  };

  // مسح كامل سجلات أرشيف العميل مع الحفاظ التام على المبيعات والشحنات على الخطوط
  const clearClientArchive = (clientId, clientName, records = []) => {
    setClientArchives(prev => prev.filter(a => {
      if (clientId && a.clientId === clientId) return false;
      if (clientName && a.clientName === clientName) return false;
      return true;
    }));

    const nowTimestamp = Date.now();
    if (clientId) {
      try {
        localStorage.setItem(`elaasar_client_archive_cleared_${clientId}`, String(nowTimestamp));
      } catch (e) {
        console.error(e);
      }
    }

    setDismissedArchiveIds(prev => {
      const next = new Set(prev);
      (records || []).forEach(r => {
        if (r.id) next.add(r.id);
        if (r.transactionId) next.add(r.transactionId);
        if (typeof r.id === 'string' && r.id.startsWith('tx_')) {
          next.add(r.id.replace('tx_', ''));
        }
      });
      const targetClient = clients.find(c => c.id === clientId || c.name === clientName);
      const targetWalletIds = new Set((targetClient?.wallets || []).map(w => w.id));
      const targetPhones = new Set((targetClient?.wallets || []).map(w => w.phoneNumber).filter(Boolean));
      (transactions || []).forEach(t => {
        const isClientTx = t.clientId === clientId || t.customerId === clientId ||
          (t.walletId && targetWalletIds.has(t.walletId)) ||
          (t.walletPhone && targetPhones.has(t.walletPhone));
        if (isClientTx) {
          next.add(t.id);
          next.add(`tx_${t.id}`);
        }
      });
      storage.saveDismissedArchiveIds(Array.from(next));
      return next;
    });
    showToast('تم مسح أرشيف العميل بنجاح دون التأثير على المبيعات أو حركات الخط', 'success');
  };

  // Delete transaction (reverts the deduction from limit)
  const deleteTransaction = (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    setTransactions(prev => prev.filter(t => t.id !== txId));
    realtime.deleteTransaction(txId);
    if (currentUser && shopId) deleteTransactionFromCloud(shopId, txId);
    if (tx.type === 'client_payment') {
      showToast(`تم حذف حركة السداد بقيمة ${formatCurrency(tx.amount)}`, 'info');
    } else if (tx.type === 'product_sale') {
      if (tx.productId && tx.variantColor) {
        setInventory(prev => {
          const next = prev.map(p => {
            if (p.id === tx.productId) {
              const updatedVariants = (p.variants || []).map(v => {
                if (v.color === tx.variantColor) {
                  return { ...v, quantity: (Number(v.quantity) || 0) + (Number(tx.quantity) || 1) };
                }
                return v;
              });
              const newTotal = updatedVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
              return { ...p, variants: updatedVariants, totalQuantity: newTotal };
            }
            return p;
          });
          const updated = next.find(p => p.id === tx.productId);
          if (updated) realtime.saveProduct(updated);
          if (currentUser && shopId && updated) syncProductToCloud(shopId, updated);
          return next;
        });
      }
      showToast(`تم حذف حركة البيع وإعادة (${tx.quantity || 1}) قطعة إلى مخزون "${tx.productName || 'المنتج'}"`, 'info');
    } else {
      showToast(`تم حذف التحويل وإعادة ${formatCurrency(tx.amount)} إلى ليميت المحفظة`, 'info');
    }
  };

  // Update transaction details
  const updateTransaction = (txId, updatedFields) => {
    setTransactions(prev =>
      prev.map(t => (t.id === txId ? { ...t, ...updatedFields } : t))
    );
    showToast('تم تحديث بيانات المعاملة بنجاح');
  };

  // ==========================================
  // INVENTORY & MOBILE SHOP MANAGEMENT (المخزون والمنتجات)
  // ==========================================
  
  const addProduct = (productData) => {
    const variants = Array.isArray(productData.variants) ? productData.variants : [];
    const totalQty = variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

    const newProduct = {
      id: `prod-${Date.now()}`,
      category: productData.category || 'phones', // 'phones' | 'accessories' | 'chargers' | 'screen_protectors' | 'powerbanks' | 'earphones' | 'services'
      name: productData.name.trim(),
      brand: (productData.brand || '').trim(),
      storage: (productData.storage || '').trim(),
      costPrice: Number(productData.costPrice) || 0,
      salePrice: Number(productData.salePrice) || 0,
      minStockAlert: Number(productData.minStockAlert) !== undefined ? Number(productData.minStockAlert) : 5,
      notes: (productData.notes || '').trim(),
      createdAt: new Date().toISOString(),
      variants: variants.map(v => ({
        color: (v.color || 'افتراضي').trim(),
        quantity: Math.max(0, Number(v.quantity) || 0)
      })),
      totalQuantity: totalQty
    };

    setInventory(prev => [newProduct, ...prev]);
    realtime.saveProduct(newProduct);
    if (currentUser && shopId) syncProductToCloud(shopId, newProduct);
    showToast(`تمت إضافة "${newProduct.name}" بإجمالي ${newProduct.totalQuantity} قطع بنجاح!`);
    return newProduct;
  };

  const updateProduct = (productId, updatedFields) => {
    setInventory(prev => {
      const next = prev.map(p => {
        if (p.id !== productId) return p;

        const merged = { ...p, ...updatedFields };
        if (Array.isArray(updatedFields.variants)) {
          merged.variants = updatedFields.variants.map(v => ({
            color: (v.color || 'افتراضي').trim(),
            quantity: Math.max(0, Number(v.quantity) || 0)
          }));
          merged.totalQuantity = merged.variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
        }
        return merged;
      });
      const updated = next.find(p => p.id === productId);
      if (updated) realtime.saveProduct(updated);
      if (currentUser && shopId && updated) syncProductToCloud(shopId, updated);
      return next;
    });
    showToast('تم تحديث بيانات الصنف بنجاح');
  };

  const deleteProduct = (productId) => {
    const prod = inventory.find(p => p.id === productId);
    if (!prod) return;

    // Move to Trash
    const trashedProduct = {
      ...prod,
      deletedAt: new Date().toISOString()
    };
    setTrash(prev => ({
      ...prev,
      products: [trashedProduct, ...(prev.products || []).filter(p => p.id !== productId)]
    }));

    setInventory(prev => prev.filter(p => p.id !== productId));
    realtime.deleteProduct(productId);
    if (currentUser && shopId) deleteProductFromCloud(shopId, productId);
    showToast(`تم نقل "${prod.name}" إلى سلة المحذوفات`, 'info');
  };

  /**
   * Sell / deduct product variant from stock
   */
  const sellProductVariant = (productId, colorName, quantitySold = 1, notes = '', customSalePrice = null) => {
    const prod = inventory.find(p => p.id === productId);
    if (!prod) {
      showToast('المنتج غير موجود بالمخزون', 'error');
      return false;
    }

    const qtyToDeduct = Math.max(1, Number(quantitySold) || 1);
    let soldVariantFound = false;

    const updatedVariants = (prod.variants || []).map(v => {
      if (v.color === colorName) {
        soldVariantFound = true;
        if (v.quantity < qtyToDeduct) {
          return v;
        }
        return {
          ...v,
          quantity: Math.max(0, v.quantity - qtyToDeduct)
        };
      }
      return v;
    });

    const targetVariant = prod.variants?.find(v => v.color === colorName);
    if (targetVariant && targetVariant.quantity < qtyToDeduct) {
      showToast(`الكمية المتاحة من اللون (${colorName}) غير كافية! المتبقي: ${targetVariant.quantity}`, 'error');
      return false;
    }

    const newTotal = updatedVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

    setInventory(prev => {
      const next = prev.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            variants: updatedVariants,
            totalQuantity: newTotal
          };
        }
        return p;
      });
      const updated = next.find(p => p.id === productId);
      if (updated) realtime.saveProduct(updated);
      if (currentUser && shopId && updated) syncProductToCloud(shopId, updated);
      return next;
    });

    triggerConfetti();
    const effectivePrice = customSalePrice !== null && !isNaN(Number(customSalePrice)) ? Number(customSalePrice) : Number(prod.salePrice);
    const totalSaleAmount = effectivePrice * qtyToDeduct;

    // Record product sale transaction in daily ledger immediately
    const dateObj = new Date();
    const dateOnly = getLocalDateString(dateObj);
    const timeStr = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const custName = (notes || '').trim() || 'عميل نقدي (مبيعات أجهزة)';

    const saleTx = {
      id: `tx-sale-${Date.now()}`,
      type: 'product_sale',
      productId: prod.id,
      productName: prod.name,
      brand: prod.brand || '',
      category: prod.category || 'هواتف وأجهزة',
      variantColor: colorName,
      quantity: qtyToDeduct,
      unitPrice: effectivePrice,
      amount: totalSaleAmount,
      customerName: custName,
      transactionCode: `DEV-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: notes.trim()
        ? `بيع (${qtyToDeduct}) ${prod.name} [لون: ${colorName}] - العميل/ملاحظات: ${notes.trim()}`
        : `بيع (${qtyToDeduct}) ${prod.name} [لون: ${colorName}]`,
      date: dateObj.toISOString(),
      dateOnly,
      time: timeStr
    };

    setTransactions(prev => [saleTx, ...prev]);
    realtime.addTransaction(saleTx);
    if (currentUser && shopId) {
      syncTransactionToCloud(shopId, saleTx);
    }

    showToast(`تم تسجيل بيع (${qtyToDeduct}) قطعة [لون: ${colorName}] بقيمة ${formatCurrency(totalSaleAmount)} وتوثيقها في المبيعات`);

    // Check low stock alert (< 5)
    const alertThreshold = prod.minStockAlert !== undefined ? prod.minStockAlert : 5;
    if (newTotal === 0) {
      showAlert({
        title: '⛔ نفد المخزون بالكامل!',
        message: `لقد نفدت جميع قطع المنتج "${prod.name}" من المحل (0 متبقي). يرجى عمل طلبية جديدة للموزع.`,
        type: 'danger'
      });
    } else if (newTotal < alertThreshold) {
      showAlert({
        title: '⚠️ تنبيه نواقص: اقترب من النفاد!',
        message: `تنبيه: متبقي فقط (${newTotal}) قطع من "${prod.name}" بالمحل (أقل من الحد الأدنى ${alertThreshold} قطع). يرجى إعادة الطلب.`,
        type: 'warning'
      });
    }

    return true;
  };

  /**
   * Restock / add quantity to product variant
   */
  const restockProductVariant = (productId, colorName, quantityAdded) => {
    const qty = Math.max(1, Number(quantityAdded) || 1);
    
    setInventory(prev => {
      const next = prev.map(p => {
        if (p.id !== productId) return p;

        let found = false;
        const updatedVariants = (p.variants || []).map(v => {
          if (v.color === colorName) {
            found = true;
            return { ...v, quantity: v.quantity + qty };
          }
          return v;
        });

        if (!found) {
          updatedVariants.push({ color: colorName, quantity: qty });
        }

        const newTotal = updatedVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

        return {
          ...p,
          variants: updatedVariants,
          totalQuantity: newTotal
        };
      });
      const updated = next.find(p => p.id === productId);
      if (updated) realtime.saveProduct(updated);
      if (currentUser && shopId && updated) syncProductToCloud(shopId, updated);
      return next;
    });

    showToast(`تمت إضافة ${qty} قطع إلى مخزون لون (${colorName}) بنجاح`);
  };

  const handleResetInventoryDemo = () => {
    setInventory(INITIAL_DEMO_INVENTORY);
    showToast('تمت استعادة نماذج الهواتف والإكسسوارات الافتراضية بنجاح');
  };

  // Reset demo data
  const handleResetDemo = () => {
    const demo = storage.resetToDemo();
    setClients(demo.clients);
    setTransactions(demo.transactions);
    setInventory(demo.inventory);
    setShopWallets(demo.shopWallets || INITIAL_SHOP_WALLETS);
    setClientArchives(demo.clientArchives || []);
    showToast('تم استعادة البيانات التجريبية الافتراضية بنجاح');
  };

  // Clear all data
  const handleClearAll = () => {
    const empty = storage.clearAll();
    setClients(empty.clients);
    setTransactions(empty.transactions);
    setInventory(empty.inventory);
    setTrash(empty.trash);
    setShopWallets([]);
    setClientArchives([]);
    showToast('تم مسح جميع البيانات بنجاح', 'info');
  };

  // Export data
  const handleExport = () => {
    storage.exportFullBackup(clients, transactions, inventory, trash, shopWallets, clientArchives);
    showToast('تم تصدير النسخة الاحتياطية بنجاح');
  };

  // Import data
  const handleImport = (backupData) => {
    if (!backupData || !Array.isArray(backupData.clients) || !Array.isArray(backupData.transactions)) {
      showToast('ملف النسخة الاحتياطية غير صالح', 'error');
      return false;
    }
    setClients(backupData.clients);
    setTransactions(backupData.transactions);
    if (Array.isArray(backupData.inventory)) {
      setInventory(backupData.inventory);
    }
    if (Array.isArray(backupData.shopWallets)) {
      setShopWallets(backupData.shopWallets);
    }
    if (backupData.trash && typeof backupData.trash === 'object') {
      setTrash(backupData.trash);
    }
    if (Array.isArray(backupData.clientArchives)) {
      setClientArchives(backupData.clientArchives);
    }
    showToast('تم استيراد البيانات بنجاح');
    return true;
  };

  // ==========================================
  // TRASH & RECYCLE BIN ACTIONS (سلة المحذوفات)
  // ==========================================
  
  const restoreWallet = (walletId) => {
    const wallet = trash.wallets?.find(w => w.id === walletId);
    if (!wallet) return false;

    setTrash(prev => ({
      ...prev,
      wallets: (prev.wallets || []).filter(w => w.id !== walletId)
    }));

    const { clientId, clientName, deletedAt, ...cleanWallet } = wallet;

    // If it's a shop line, restore back to shopWallets!
    if (wallet.isShopWallet) {
      setShopWallets(prev => [cleanWallet, ...prev]);
      triggerConfetti();
      showToast(`تمت استعادة خط المحل ${wallet.phoneNumber} بنجاح!`, 'success');
      return true;
    }

    const clientExists = clients.some(c => c.id === clientId);
    if (clientExists) {
      setClients(prev => {
        const next = prev.map(c => {
          if (c.id === clientId) {
            return {
              ...c,
              wallets: [...(c.wallets || []), cleanWallet]
            };
          }
          return c;
        });
        const updated = next.find(c => c.id === clientId);
        if (updated) realtime.saveClient(updated);
        if (currentUser && shopId && updated) syncClientToCloud(shopId, updated);
        return next;
      });
    } else {
      const trashedClient = trash.clients?.find(c => c.id === clientId);
      let clientToRestore;
      if (trashedClient) {
        const { deletedAt: dAt, ...cData } = trashedClient;
        clientToRestore = {
          ...cData,
          wallets: [...(cData.wallets || []).filter(w => w.id !== cleanWallet.id), cleanWallet]
        };
        setTrash(prev => ({
          ...prev,
          clients: (prev.clients || []).filter(c => c.id !== clientId)
        }));
      } else {
        clientToRestore = {
          id: clientId || `client-${Date.now()}`,
          name: clientName || 'عميل مستعاد',
          notes: 'تمت استعادة العميل تلقائياً مع المحفظة',
          createdAt: new Date().toISOString(),
          wallets: [cleanWallet]
        };
      }
      setClients(prev => [clientToRestore, ...prev]);
      realtime.saveClient(clientToRestore);
      if (currentUser && shopId) syncClientToCloud(shopId, clientToRestore);
    }

    triggerConfetti();
    showToast(`تمت استعادة الرقم ${wallet.phoneNumber} بنجاح!`, 'success');
    return true;
  };

  const restoreClient = (clientId) => {
    const client = trash.clients?.find(c => c.id === clientId);
    if (!client) return false;

    setTrash(prev => ({
      ...prev,
      clients: (prev.clients || []).filter(c => c.id !== clientId)
    }));

    const { deletedAt, ...cleanClient } = client;
    setClients(prev => [cleanClient, ...prev]);
    realtime.saveClient(cleanClient);
    if (currentUser && shopId) syncClientToCloud(shopId, cleanClient);

    triggerConfetti();
    showToast(`تمت استعادة العميل "${client.name}" بكافة محافظه بنجاح!`, 'success');
    return true;
  };

  const restoreProduct = (productId) => {
    const product = trash.products?.find(p => p.id === productId);
    if (!product) return false;

    setTrash(prev => ({
      ...prev,
      products: (prev.products || []).filter(p => p.id !== productId)
    }));

    const { deletedAt, ...cleanProduct } = product;
    setInventory(prev => [cleanProduct, ...prev]);
    realtime.saveProduct(cleanProduct);
    if (currentUser && shopId) syncProductToCloud(shopId, cleanProduct);

    triggerConfetti();
    showToast(`تمت استعادة الصنف "${product.name}" إلى المخزون بنجاح!`, 'success');
    return true;
  };

  const permanentlyDeleteWallet = (walletId) => {
    setTrash(prev => ({
      ...prev,
      wallets: (prev.wallets || []).filter(w => w.id !== walletId)
    }));
    showToast('تم حذف الرقم نهائياً من سلة المحذوفات', 'info');
  };

  const permanentlyDeleteClient = (clientId) => {
    setTrash(prev => ({
      ...prev,
      clients: (prev.clients || []).filter(c => c.id !== clientId)
    }));
    showToast('تم حذف العميل نهائياً من سلة المحذوفات', 'info');
  };

  const permanentlyDeleteProduct = (productId) => {
    setTrash(prev => ({
      ...prev,
      products: (prev.products || []).filter(p => p.id !== productId)
    }));
    showToast('تم حذف الصنف نهائياً من سلة المحذوفات', 'info');
  };

  const emptyTrash = (type = 'all') => {
    if (type === 'wallets') {
      setTrash(prev => ({ ...prev, wallets: [], clients: [] }));
    } else if (type === 'products') {
      setTrash(prev => ({ ...prev, products: [] }));
    } else {
      setTrash({ wallets: [], clients: [], products: [] });
    }
    showToast('تم تفريغ سلة المحذوفات بنجاح', 'info');
  };

  const walletsTrashCount = (trash.wallets?.length || 0) + (trash.clients?.length || 0);
  const productsTrashCount = (trash.products?.length || 0);
  const totalTrashCount = walletsTrashCount + productsTrashCount;

  // Global calculations
  const totalClientsCount = clients.length;
  const totalWalletsCount = clients.reduce((acc, c) => acc + (c.wallets?.length || 0), 0);
  
  // Total limits and remaining across all wallets
  let globalTotalLimit = 0;
  let globalRemainingLimit = 0;
  let globalTransferredAllTime = 0;

  clients.forEach(c => {
    (c.wallets || []).forEach(w => {
      const stats = calculateWalletStats(w, transactions);
      globalTotalLimit += stats.totalLimit;
      globalRemainingLimit += stats.remainingLimit;
      globalTransferredAllTime += stats.totalTransfersOut;
    });
  });

  // Today's summary
  const todayStr = getTodayString();
  const todayTransactions = transactions.filter(t => t.dateOnly === todayStr);
  const todayTotalAmount = todayTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const todayTotalFees = todayTransactions.reduce((sum, t) => sum + (Number(t.fee) || 0), 0);

  // Selected date transactions
  const selectedDateTransactions = transactions.filter(t => t.dateOnly === selectedDate);
  const selectedDateTotalAmount = selectedDateTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const selectedDateTotalFees = selectedDateTransactions.reduce((sum, t) => sum + (Number(t.fee) || 0), 0);

  // Inventory Metrics & Alerts
  const lowStockProducts = inventory.filter(p => p.totalQuantity < (p.minStockAlert !== undefined ? p.minStockAlert : 5));
  const lowStockProductsCount = lowStockProducts.length;
  const outOfStockCount = inventory.filter(p => p.totalQuantity === 0).length;
  const totalInventoryUnits = inventory.reduce((sum, p) => sum + (Number(p.totalQuantity) || 0), 0);
  const totalInventoryCost = inventory.reduce((sum, p) => sum + ((Number(p.costPrice) || 0) * (Number(p.totalQuantity) || 0)), 0);
  const totalInventorySaleValue = inventory.reduce((sum, p) => sum + ((Number(p.salePrice) || 0) * (Number(p.totalQuantity) || 0)), 0);
  const totalPhonesCount = inventory.filter(p => p.category === 'phones').length;
  const totalAccessoriesCount = inventory.filter(p => p.category !== 'phones').length;

  return (
    <CashContext.Provider
      value={{
        clients,
        transactions,
        inventory,
        shopWallets,
        theme,
        toggleTheme,
        selectedDate,
        setSelectedDate,
        toast,
        showToast,
        confirmModal,
        askConfirm,
        showAlert,
        handleConfirmClose,
        activeModal,
        setActiveModal,
        modalData,
        setModalData,
        
        // Actions
        addClient,
        updateClient,
        deleteClient,
        addWallet,
        updateWallet,
        deleteWallet,
        addShopWallet,
        updateShopWallet,
        deleteShopWallet,
        addTransaction,
        addRecharge,
        addClientPayment,
        archiveClientCycle,
        deleteClientArchive,
        clearClientArchive,
        clientArchives,
        dismissedArchiveIds,
        deleteTransaction,
        updateTransaction,
        findWalletAndClient,

        // Inventory Actions
        addProduct,
        updateProduct,
        deleteProduct,
        sellProductVariant,
        restockProductVariant,
        handleResetInventoryDemo,
        
        // Data tools
        backendStatus,
        uploadToCloud,
        handleResetDemo,
        handleClearAll,
        handleExport,
        handleImport,
        
        // Stats
        totalClientsCount,
        totalWalletsCount,
        globalTotalLimit,
        globalRemainingLimit,
        globalTransferredAllTime,
        todayTransactions,
        todayTotalAmount,
        todayTotalFees,
        selectedDateTransactions,
        selectedDateTotalAmount,
        selectedDateTotalFees,

        // Inventory Stats & Alerts
        lowStockProducts,
        lowStockProductsCount,
        outOfStockCount,
        totalInventoryUnits,
        totalInventoryCost,
        totalInventorySaleValue,
        totalPhonesCount,
        totalAccessoriesCount,

        // Trash & Recycle Bin
        trash,
        restoreWallet,
        restoreClient,
        restoreProduct,
        permanentlyDeleteWallet,
        permanentlyDeleteClient,
        permanentlyDeleteProduct,
        emptyTrash,
        walletsTrashCount,
        productsTrashCount,
        totalTrashCount
      }}
    >
      {children}
    </CashContext.Provider>
  );
}

export function useCash() {
  const context = useContext(CashContext);
  if (!context) {
    throw new Error('useCash must be used within a CashProvider');
  }
  return context;
}
