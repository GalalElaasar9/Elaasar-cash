import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  storage, 
  INITIAL_DEMO_INVENTORY, 
  INITIAL_SHOP_WALLETS, 
  INITIAL_DEMO_PURCHASES, 
  INITIAL_DEMO_TREASURY,
  INITIAL_INSTAPAY_ACCOUNTS,
  INITIAL_DEMO_DAILY_AUDITS,
  INITIAL_DEMO_DAILY_OPENING_BALANCES
} from '../utils/storage';
import { 
  calculateWalletStats, 
  getTodayString, 
  getLocalDateString,
  getCurrentMonthKey,
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
  const [shopWallets, setShopWallets] = useState(() => {
    const loaded = storage.getShopWallets();
    return (loaded || []).map((w, idx) => ({
      ...w,
      balance: w.balance !== undefined ? Number(w.balance) || 0 : (idx === 0 ? 30000 : idx === 1 ? 20000 : idx === 2 ? 15000 : 5000)
    }));
  });
  const [purchases, setPurchases] = useState(() => storage.getPurchases());
  const [treasury, setTreasury] = useState(() => storage.getTreasury());
  const [instapayAccounts, setInstapayAccounts] = useState(() => storage.getInstapayAccounts());
  const [dailyAudits, setDailyAudits] = useState(() => storage.getDailyAudits());
  const [dailyOpeningBalances, setDailyOpeningBalances] = useState(() => storage.getDailyOpeningBalances());
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

  // Sync purchases to localStorage
  useEffect(() => {
    storage.savePurchases(purchases);
  }, [purchases]);

  // Sync treasury to localStorage
  useEffect(() => {
    storage.saveTreasury(treasury);
  }, [treasury]);

  // Sync instapayAccounts to localStorage
  useEffect(() => {
    storage.saveInstapayAccounts(instapayAccounts);
  }, [instapayAccounts]);

  // Sync dailyAudits to localStorage
  useEffect(() => {
    storage.saveDailyAudits(dailyAudits);
  }, [dailyAudits]);

  // Sync dailyOpeningBalances to localStorage
  useEffect(() => {
    storage.saveDailyOpeningBalances(dailyOpeningBalances);
  }, [dailyOpeningBalances]);

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
  const addClient = ({ name, notes = '', clientType = 'عادي', whatsappPhone = '', initialPhoneNumber, initialWalletLabel = 'المحفظة الأساسية', initialLimit = 200000, wallets = [] }) => {
    const finalType = clientType || 'عادي';
    const cleanWhatsapp = whatsappPhone ? cleanEgyptianPhone(whatsappPhone) : '';
    const newClient = {
      id: `client-${Date.now()}`,
      name: name.trim(),
      notes: notes.trim(),
      clientType: finalType,
      whatsappPhone: cleanWhatsapp,
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
  const addShopWallet = ({ phoneNumber, label = 'خط المحل', totalLimit = 200000, initialBalance = 0 }) => {
    const cleanPhone = cleanEgyptianPhone(phoneNumber);
    if (!isValidEgyptianPhone(cleanPhone)) {
      showToast(getEgyptianPhoneError(cleanPhone) || 'رقم الخط غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً', 'error');
      return null;
    }
    const cleanLimit = Number(totalLimit) || 200000;
    const initBal = Math.max(0, Number(initialBalance) || 0);

    const newWallet = {
      id: `shop-wallet-${Date.now()}`,
      phoneNumber: cleanPhone,
      label: label.trim() || 'خط المحل',
      totalLimit: cleanLimit,
      balance: initBal,
      isShopWallet: true,
      createdAt: new Date().toISOString()
    };

    setShopWallets(prev => [newWallet, ...prev]);

    if (initBal > 0) {
      setTreasury(prev => ({
        ...prev,
        vodafoneCash: (Number(prev.vodafoneCash) || 0) + initBal,
        lastUpdated: new Date().toISOString(),
        history: [
          {
            id: `mov-${Date.now()}-init-vf`,
            date: new Date().toISOString(),
            type: 'deposit',
            channel: 'vodafoneCash',
            amount: initBal,
            notes: `رصيد افتتاحي عند إضافة خط المحل: ${newWallet.label} (${cleanPhone})`
          },
          ...(prev.history || [])
        ]
      }));
    }

    showToast(`تمت إضافة خط المحل (${cleanPhone}) بليميت ${formatCurrency(cleanLimit)}`);
    return newWallet;
  };

  const updateShopWallet = (walletId, updatedFields) => {
    const existingWallet = shopWallets.find(w => w.id === walletId);
    const fieldsToUpdate = { ...updatedFields };
    if (fieldsToUpdate.phoneNumber) {
      const cleanPhone = cleanEgyptianPhone(fieldsToUpdate.phoneNumber);
      if (!isValidEgyptianPhone(cleanPhone)) {
        showToast(getEgyptianPhoneError(cleanPhone) || 'رقم الخط غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً', 'error');
        return;
      }
      fieldsToUpdate.phoneNumber = cleanPhone;
    }

    if (fieldsToUpdate.balance !== undefined && existingWallet) {
      const newBal = Math.max(0, Number(fieldsToUpdate.balance) || 0);
      const oldBal = Number(existingWallet.balance) || 0;
      const diff = newBal - oldBal;
      fieldsToUpdate.balance = newBal;

      if (diff !== 0) {
        setTreasury(prev => ({
          ...prev,
          vodafoneCash: Math.max(0, (Number(prev.vodafoneCash) || 0) + diff),
          lastUpdated: new Date().toISOString(),
          history: [
            {
              id: `mov-${Date.now()}-adj-vf`,
              date: new Date().toISOString(),
              type: 'adjustment',
              channel: 'vodafoneCash',
              amount: Math.abs(diff),
              isIncrease: diff >= 0,
              notes: `تعديل رصيد خط فودافون كاش (${fieldsToUpdate.label || existingWallet.label}): الفرق ${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`
            },
            ...(prev.history || [])
          ]
        }));
      }
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

    const bal = Number(wallet.balance) || 0;
    if (bal > 0) {
      setTreasury(prev => ({
        ...prev,
        vodafoneCash: Math.max(0, (Number(prev.vodafoneCash) || 0) - bal),
        lastUpdated: new Date().toISOString(),
        history: [
          {
            id: `mov-${Date.now()}-del-vf`,
            date: new Date().toISOString(),
            type: 'withdraw',
            channel: 'vodafoneCash',
            amount: bal,
            notes: `خصم رصيد خط المحل المحذوف: ${wallet.label} (${wallet.phoneNumber})`
          },
          ...(prev.history || [])
        ]
      }));
    }

    setShopWallets(prev => prev.filter(w => w.id !== walletId));
    showToast(`تم نقل خط المحل (${wallet.phoneNumber}) إلى سلة المحذوفات`, 'info');
  };

  // ==========================================
  // SHOP INSTAPAY ACCOUNTS MANAGEMENT (حسابات إنستاباي المحل)
  // ==========================================
  const addInstapayAccount = ({
    accountName,
    handle,
    phone = '',
    bankName = '',
    initialBalance = 0,
    notes = '',
    isDefault = false
  }) => {
    const cleanHandle = (handle || '').trim();
    if (!cleanHandle) {
      showToast('يرجى إدخال عنوان الدفع أو رقم الهاتف الخاص بحساب إنستاباي', 'error');
      return null;
    }

    const initBal = Math.max(0, Number(initialBalance) || 0);

    const newAccount = {
      id: `insta-${Date.now()}`,
      accountName: accountName?.trim() || `حساب إنستاباي (${cleanHandle})`,
      handle: cleanHandle,
      phone: phone?.trim() || (cleanEgyptianPhone(cleanHandle) || ''),
      bankName: bankName?.trim() || 'إنستاباي',
      balance: initBal,
      isDefault: Boolean(isDefault),
      notes: notes?.trim() || '',
      createdAt: new Date().toISOString()
    };

    setInstapayAccounts(prev => {
      let updated = prev;
      if (newAccount.isDefault) {
        updated = prev.map(a => ({ ...a, isDefault: false }));
      }
      return [newAccount, ...updated];
    });

    if (initBal > 0) {
      setTreasury(prev => ({
        ...prev,
        instapay: (Number(prev.instapay) || 0) + initBal,
        lastUpdated: new Date().toISOString(),
        history: [
          {
            id: `mov-${Date.now()}-init-insta`,
            date: new Date().toISOString(),
            type: 'deposit',
            channel: 'instapay',
            amount: initBal,
            notes: `رصيد افتتاحي عند إضافة حساب إنستاباي: ${newAccount.accountName}`
          },
          ...(prev.history || [])
        ]
      }));
    }

    showToast(`تمت إضافة حساب إنستاباي (${newAccount.accountName}) بنجاح!`, 'success');
    return newAccount;
  };

  const updateInstapayAccount = (id, updatedFields) => {
    const existingAcc = instapayAccounts.find(a => a.id === id);
    const fieldsToUpdate = { ...updatedFields };

    if (fieldsToUpdate.balance !== undefined && existingAcc) {
      const newBal = Math.max(0, Number(fieldsToUpdate.balance) || 0);
      const oldBal = Number(existingAcc.balance) || 0;
      const diff = newBal - oldBal;
      fieldsToUpdate.balance = newBal;

      if (diff !== 0) {
        setTreasury(prev => ({
          ...prev,
          instapay: Math.max(0, (Number(prev.instapay) || 0) + diff),
          lastUpdated: new Date().toISOString(),
          history: [
            {
              id: `mov-${Date.now()}-adj-insta`,
              date: new Date().toISOString(),
              type: 'adjustment',
              channel: 'instapay',
              amount: Math.abs(diff),
              isIncrease: diff >= 0,
              notes: `تعديل رصيد حساب إنستاباي (${fieldsToUpdate.accountName || existingAcc.accountName}): الفرق ${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`
            },
            ...(prev.history || [])
          ]
        }));
      }
    }

    setInstapayAccounts(prev => {
      return prev.map(a => {
        if (a.id === id) {
          return { ...a, ...fieldsToUpdate };
        }
        if (fieldsToUpdate.isDefault && a.id !== id) {
          return { ...a, isDefault: false };
        }
        return a;
      });
    });
    showToast('تم تحديث بيانات حساب إنستاباي بنجاح');
  };

  const deleteInstapayAccount = (id) => {
    const acc = instapayAccounts.find(a => a.id === id);
    if (!acc) return;

    const bal = Number(acc.balance) || 0;
    if (bal > 0) {
      setTreasury(prev => ({
        ...prev,
        instapay: Math.max(0, (Number(prev.instapay) || 0) - bal),
        lastUpdated: new Date().toISOString(),
        history: [
          {
            id: `mov-${Date.now()}-del-insta`,
            date: new Date().toISOString(),
            type: 'withdraw',
            channel: 'instapay',
            amount: bal,
            notes: `خصم رصيد حساب إنستاباي المحذوف: ${acc.accountName}`
          },
          ...(prev.history || [])
        ]
      }));
    }

    setInstapayAccounts(prev => prev.filter(a => a.id !== id));
    showToast(`تم حذف حساب إنستاباي (${acc.accountName})`, 'info');
  };

  // تحويل مباشر من حسابات إنستاباي المحل
  const transferFromInstapay = ({
    instapayAccountId,
    amount,
    recipient,
    recipientClientId = null,
    recipientClientName = null,
    recipientWalletId = null,
    recordClientRecharge = false,
    transactionCode,
    notes = '',
    date = null
  }) => {
    const acc = instapayAccounts.find(a => a.id === instapayAccountId);
    if (!acc) {
      showToast('حساب إنستاباي غير موجود أو تم حذفه', 'error');
      return null;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('يرجى إدخال مبلغ تحويل صحيح أكبر من 0', 'error');
      return null;
    }

    const curBal = Number(acc.balance) || 0;
    if (numAmount > curBal) {
      showToast(`الرصيد المتاح في حساب (${acc.accountName}) هو (${formatCurrency(curBal)}) وهو أقل من المبلغ المطلوب تحويله!`, 'error');
      return null;
    }

    const dateObj = date ? new Date(date) : new Date();
    const dateOnly = getLocalDateString(dateObj);
    const timeStr = formatTimeArabic(dateObj);
    const code = (transactionCode || `INSTA-${Math.floor(100000 + Math.random() * 900000)}`).trim();

    // 1. Update InstaPay Account Balance
    setInstapayAccounts(prev => prev.map(a => 
      a.id === instapayAccountId 
        ? { ...a, balance: Math.max(0, curBal - numAmount) } 
        : a
    ));

    // 2. Deduct from Treasury InstaPay
    setTreasury(prev => ({
      ...prev,
      instapay: Math.max(0, (Number(prev.instapay) || 0) - numAmount),
      lastUpdated: new Date().toISOString(),
      history: [
        {
          id: `mov-${Date.now()}-insta-out`,
          date: dateObj.toISOString(),
          type: 'withdraw',
          channel: 'instapay',
          amount: numAmount,
          notes: notes.trim()
            ? `تحويل إنستاباي: ${notes.trim()} (من ${acc.accountName})`
            : `تحويل إنستاباي من ${acc.accountName} إلى ${recipientClientName ? `العميل: ${recipientClientName}` : recipient}`
        },
        ...(prev.history || [])
      ]
    }));

    // 3. Record in Transactions Ledger
    const newTx = {
      id: `tx-insta-${Date.now()}`,
      type: 'transfer_out',
      paymentMethod: 'instapay',
      instapayAccountId: acc.id,
      instapayAccountName: acc.accountName,
      instapayHandle: acc.handle,
      walletPhone: acc.handle || acc.phone,
      walletLabel: acc.accountName,
      amount: numAmount,
      limitAfter: Math.max(0, curBal - numAmount),
      recipientPhone: recipient,
      recipientClientId: recipientClientId || null,
      recipientClientName: recipientClientName || null,
      recipientWalletId: recipientWalletId || null,
      transactionCode: code,
      fee: 0,
      notes: notes.trim() || `تحويل إنستاباي من ${acc.accountName} إلى ${recipientClientName ? `العميل: ${recipientClientName}` : recipient}`,
      date: dateObj.toISOString(),
      dateOnly,
      time: timeStr
    };

    setTransactions(prev => [newTx, ...prev]);
    realtime.addTransaction(newTx);
    if (currentUser && shopId) syncTransactionToCloud(shopId, newTx);

    // 4. If recorded as Client Recharge
    if (recordClientRecharge && recipientClientId && recipientWalletId) {
      addRecharge({
        walletId: recipientWalletId,
        amount: numAmount,
        notes: `شحن رصيد آجل محول من إنستاباي المحل (${acc.accountName}) - كود ${code}`,
        date: dateObj.toISOString()
      });
      showToast(`تم خصم ${formatCurrency(numAmount)} من حساب إنستاباي وشحن رصيد العميل "${recipientClientName}" بنجاح!`, 'success');
    } else if (recordClientRecharge && recipientClientId && !recipientWalletId) {
      const client = clients.find(c => c.id === recipientClientId);
      if (client) {
        updateClient(client.id, {
          clientType: 'مدين',
          excessDebt: (Number(client.excessDebt) || 0) + numAmount,
          excessDebtDate: dateObj.toISOString()
        });
        showToast(`تم خصم ${formatCurrency(numAmount)} من إنستاباي وزيادة مديونية العميل "${client.name}" آجل!`, 'success');
      }
    } else {
      showToast(`تم إتمام تحويل إنستاباي بقيمة ${formatCurrency(numAmount)} بنجاح!`, 'success');
    }

    triggerConfetti();
    return newTx;
  };

  // Transaction Management
  const addTransaction = ({
    walletId,
    amount,
    recipientPhone = '',
    recipientClientId = null,
    recipientClientName = null,
    recipientWalletId = null,
    transactionCode,
    fee = 0,
    notes = '',
    date = null,
    type = 'transfer_out',
    allowEmptyRecipient = false,
    skipBalanceSync = false
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
    if (!allowEmptyRecipient) {
      if (!cleanRecipient) {
        showToast('يرجى إدخال رقم المحول إليه (المستلم)', 'error');
        return null;
      }
      if (!isValidEgyptianPhone(cleanRecipient)) {
        showToast('رقم المحول إليه غير صحيح! يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً', 'error');
        return null;
      }
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
      type,
      isShopWallet,
      amount: numAmount,
      limitAfter,
      recipientPhone: cleanRecipient,
      recipientClientId: recipientClientId || null,
      recipientClientName: recipientClientName || null,
      recipientWalletId: recipientWalletId || null,
      transactionCode: (transactionCode || `VF-${Math.floor(100000 + Math.random() * 900000)}`).trim(),
      fee: Number(fee) || 0,
      notes: notes.trim(),
      date: dateObj.toISOString(),
      dateOnly
    };

    // Sync shop wallet balance & treasury.vodafoneCash on outgoing transfer from a shop line
    if (isShopWallet && !skipBalanceSync && numAmount > 0) {
      setShopWallets(prev => prev.map(w =>
        w.id === walletId
          ? { ...w, balance: Math.max(0, (Number(w.balance) || 0) - numAmount) }
          : w
      ));

      setTreasury(prev => ({
        ...prev,
        vodafoneCash: Math.max(0, (Number(prev.vodafoneCash) || 0) - numAmount),
        lastUpdated: new Date().toISOString(),
        history: [
          {
            id: `mov-${Date.now()}-vf-out`,
            date: dateObj.toISOString(),
            type: 'withdraw',
            channel: 'vodafoneCash',
            amount: numAmount,
            notes: notes.trim()
              ? `تحويل فودافون كاش من (${wallet.label}): ${notes.trim()}`
              : `تحويل فودافون كاش من خط المحل (${wallet.label} - ${wallet.phoneNumber}) إلى ${cleanRecipient || 'مستلم'}`
          },
          ...(prev.history || [])
        ]
      }));
    }

    setTransactions(prev => [newTx, ...prev]);
    realtime.addTransaction(newTx);
    if (currentUser && shopId) {
      syncTransactionToCloud(shopId, newTx);
      const parentClient = clients.find(c => c.id === client?.id);
      if (parentClient) syncClientToCloud(shopId, parentClient);
    }

    // Celebrate and notify
    if (!skipBalanceSync) {
      triggerConfetti();
      showToast(
        `تم تسجيل التحويل بنجاح بقيمة ${formatCurrency(numAmount)} - المتبقي: ${formatCurrency(limitAfter)}`,
        'success'
      );
    }

    return newTx;
  };

  // Recharge / Add balance to wallet (Open receiving, no daily limit)
  const addRecharge = ({ walletId, amount, notes = '', date = null, skipBalanceSync = false }) => {
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
      isShopWallet,
      amount: numAmount,
      limitAfter,
      transactionCode: `RC-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: notes.trim() || 'إضافة وشحن رصيد للمحفظة',
      date: dateObj.toISOString(),
      dateOnly,
      time: formatTimeArabic(dateObj),
      isSettled: false
    };

    if (isShopWallet && !skipBalanceSync && numAmount > 0) {
      setShopWallets(prev => prev.map(w =>
        w.id === walletId
          ? { ...w, balance: (Number(w.balance) || 0) + numAmount }
          : w
      ));

      setTreasury(prev => ({
        ...prev,
        vodafoneCash: (Number(prev.vodafoneCash) || 0) + numAmount,
        lastUpdated: new Date().toISOString(),
        history: [
          {
            id: `mov-${Date.now()}-vf-in`,
            date: dateObj.toISOString(),
            type: 'deposit',
            channel: 'vodafoneCash',
            amount: numAmount,
            notes: notes.trim()
              ? `شحن رصيد خط المحل (${wallet.label}): ${notes.trim()}`
              : `شحن وإيداع رصيد لخط المحل (${wallet.label} - ${wallet.phoneNumber})`
          },
          ...(prev.history || [])
        ]
      }));
    }

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
    shopWalletId = null,
    instapayAccountId = null,
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

    const treasuryAmt = Number(rawAmount) || numAmount;
    const channelMap = {
      cash: 'drawerCash',
      vodafone_cash: 'vodafoneCash',
      wallet: 'vodafoneCash',
      instapay: 'instapay',
      bank: 'bankAccounts'
    };
    const targetChannel = channelMap[paymentMethod] || 'drawerCash';

    const selectedShopWallet = shopWalletId ? shopWallets.find(w => w.id === shopWalletId) : null;
    const selectedInstapayAcc = instapayAccountId ? instapayAccounts.find(a => a.id === instapayAccountId) : null;

    const paymentSourceLabel = selectedInstapayAcc
      ? `إنستاباي (${selectedInstapayAcc.accountName})`
      : selectedShopWallet
      ? `فودافون كاش (${selectedShopWallet.label || selectedShopWallet.phoneNumber})`
      : targetChannel === 'vodafoneCash'
      ? 'فودافون كاش'
      : targetChannel === 'instapay'
      ? 'إنستاباي'
      : targetChannel === 'bankAccounts'
      ? 'تحويل بنكي'
      : 'كاش بالدرج';

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
      rawAmount: treasuryAmt,
      excessDebt: Number(excessDebt) || 0,
      creditBefore: Number(creditBefore) || 0,
      paymentMethod: paymentMethod || 'cash',
      paidChannel: targetChannel,
      shopWalletId: selectedShopWallet?.id || null,
      instapayAccountId: selectedInstapayAcc?.id || null,
      paymentSourceLabel,
      notes: notes.trim() || (isCreditorPayout ? 'صرف وسداد مستحقات للعميل الدائن' : 'سداد دفعة من الحساب'),
      date: dateObj.toISOString(),
      dateOnly,
      time: timeStr,
      transactionCode: `PAY-${Math.floor(100000 + Math.random() * 900000)}`
    };

    // Update linked Shop Wallet or InstaPay Account balance
    if (targetChannel === 'vodafoneCash' && selectedShopWallet) {
      setShopWallets(prev => prev.map(w => {
        if (w.id !== selectedShopWallet.id) return w;
        const curBal = Number(w.balance) || 0;
        const nextBal = isCreditorPayout ? Math.max(0, curBal - treasuryAmt) : curBal + treasuryAmt;
        return { ...w, balance: nextBal };
      }));
    }

    if (targetChannel === 'instapay' && selectedInstapayAcc) {
      setInstapayAccounts(prev => prev.map(acc => {
        if (acc.id !== selectedInstapayAcc.id) return acc;
        const curBal = Number(acc.balance) || 0;
        const nextBal = isCreditorPayout ? Math.max(0, curBal - treasuryAmt) : curBal + treasuryAmt;
        return { ...acc, balance: nextBal };
      }));
    }

    // Sync with Treasury (رأس المال والخزينة)
    setTreasury(prev => {
      const curBal = Number(prev[targetChannel]) || 0;
      const nextBal = isCreditorPayout ? Math.max(0, curBal - treasuryAmt) : curBal + treasuryAmt;

      const historyEntry = {
        id: `mov-${Date.now()}-clpay`,
        date: dateObj.toISOString(),
        type: isCreditorPayout ? 'client_payout' : 'client_collection',
        channel: targetChannel,
        amount: treasuryAmt,
        isIncrease: !isCreditorPayout,
        notes: isCreditorPayout
          ? `صرف مستحقات للعميل الدائن (${client.name}) عبر ${paymentSourceLabel}`
          : `تحصيل سداد من العميل (${client.name}) إلى ${paymentSourceLabel}`
      };

      return {
        ...prev,
        [targetChannel]: nextBal,
        lastUpdated: new Date().toISOString(),
        history: [historyEntry, ...(prev.history || [])]
      };
    });

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

  // Delete transaction (reverts the deduction from limit & synced treasury/accounts)
  const deleteTransaction = (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    setTransactions(prev => prev.filter(t => t.id !== txId));
    realtime.deleteTransaction(txId);
    if (currentUser && shopId) deleteTransactionFromCloud(shopId, txId);

    if (tx.type === 'client_payment') {
      const treasuryAmt = Number(tx.rawAmount) || Number(tx.amount) || 0;
      const channelMap = {
        cash: 'drawerCash',
        vodafone_cash: 'vodafoneCash',
        wallet: 'vodafoneCash',
        instapay: 'instapay',
        bank: 'bankAccounts'
      };
      const ch = tx.paidChannel || channelMap[tx.paymentMethod] || 'drawerCash';

      if (treasuryAmt > 0) {
        if (ch === 'vodafoneCash' && tx.shopWalletId) {
          setShopWallets(prev => prev.map(w => {
            if (w.id !== tx.shopWalletId) return w;
            const cur = Number(w.balance) || 0;
            return { ...w, balance: tx.isCreditorPayout ? cur + treasuryAmt : Math.max(0, cur - treasuryAmt) };
          }));
        }
        if (ch === 'instapay' && tx.instapayAccountId) {
          setInstapayAccounts(prev => prev.map(acc => {
            if (acc.id !== tx.instapayAccountId) return acc;
            const cur = Number(acc.balance) || 0;
            return { ...acc, balance: tx.isCreditorPayout ? cur + treasuryAmt : Math.max(0, cur - treasuryAmt) };
          }));
        }
        setTreasury(prev => ({
          ...prev,
          [ch]: tx.isCreditorPayout
            ? (Number(prev[ch]) || 0) + treasuryAmt
            : Math.max(0, (Number(prev[ch]) || 0) - treasuryAmt),
          lastUpdated: new Date().toISOString()
        }));
      }
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

      // Reverse treasury & sub-account revenue if product sale had credited a channel
      const saleAmt = Number(tx.amount) || 0;
      const revChannel = tx.paidChannel || (
        tx.paymentMethod === 'vodafone_cash' ? 'vodafoneCash' :
        tx.paymentMethod === 'instapay' ? 'instapay' :
        tx.paymentMethod === 'bank' ? 'bankAccounts' :
        tx.paymentMethod === 'cash' ? 'drawerCash' : null
      );
      if (revChannel && saleAmt > 0) {
        if (revChannel === 'vodafoneCash' && tx.shopWalletId) {
          setShopWallets(prev => prev.map(w =>
            w.id === tx.shopWalletId ? { ...w, balance: Math.max(0, (Number(w.balance) || 0) - saleAmt) } : w
          ));
        } else if (revChannel === 'instapay' && tx.instapayAccountId) {
          setInstapayAccounts(prev => prev.map(a =>
            a.id === tx.instapayAccountId ? { ...a, balance: Math.max(0, (Number(a.balance) || 0) - saleAmt) } : a
          ));
        }
        setTreasury(prev => ({
          ...prev,
          [revChannel]: Math.max(0, (Number(prev[revChannel]) || 0) - saleAmt),
          lastUpdated: new Date().toISOString(),
          history: [
            {
              id: `mov-${Date.now()}-rev-sale`,
              date: new Date().toISOString(),
              type: 'product_sale_reversal',
              channel: revChannel,
              amount: saleAmt,
              isIncrease: false,
              notes: `عكس مبيعات محذوفة: ${tx.productName || 'منتج'} (${formatCurrency(saleAmt)})`
            },
            ...(prev.history || [])
          ]
        }));
      }

      showToast(`تم حذف حركة البيع وإعادة (${tx.quantity || 1}) قطعة إلى مخزون "${tx.productName || 'المنتج'}"`, 'info');
    } else if (tx.type === 'transfer_out' && tx.paymentMethod === 'instapay' && tx.instapayAccountId) {
      const amt = Number(tx.amount) || 0;
      setInstapayAccounts(prev => prev.map(a =>
        a.id === tx.instapayAccountId ? { ...a, balance: (Number(a.balance) || 0) + amt } : a
      ));
      setTreasury(prev => ({
        ...prev,
        instapay: (Number(prev.instapay) || 0) + amt,
        lastUpdated: new Date().toISOString()
      }));
      showToast(`تم حذف تحويل إنستاباي وإعادة ${formatCurrency(amt)} إلى رصيد الحساب`, 'info');
    } else if ((tx.type === 'transfer_out' || tx.type === 'recharge') && (tx.isShopWallet || shopWallets.some(w => w.id === tx.walletId))) {
      const amt = Number(tx.amount) || 0;
      const isOut = tx.type === 'transfer_out';
      setShopWallets(prev => prev.map(w =>
        w.id === tx.walletId
          ? { ...w, balance: isOut ? (Number(w.balance) || 0) + amt : Math.max(0, (Number(w.balance) || 0) - amt) }
          : w
      ));
      setTreasury(prev => ({
        ...prev,
        vodafoneCash: isOut ? (Number(prev.vodafoneCash) || 0) + amt : Math.max(0, (Number(prev.vodafoneCash) || 0) - amt),
        lastUpdated: new Date().toISOString()
      }));
      showToast(`تم حذف العملية وإعادة ضبط رصيد خط المحل بمقدار ${formatCurrency(amt)}`, 'info');
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
   * Sell / deduct product variant from stock and add revenue to liquid capital / treasury
   */
  const sellProductVariant = (productId, colorName, quantitySold = 1, notes = '', customSalePrice = null, paymentOptions = {}) => {
    const {
      paymentMethod = 'cash',
      shopWalletId = null,
      instapayAccountId = null
    } = paymentOptions || {};

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

    const effectivePrice = customSalePrice !== null && !isNaN(Number(customSalePrice)) ? Number(customSalePrice) : Number(prod.salePrice);
    const totalSaleAmount = effectivePrice * qtyToDeduct;
    const unitCost = Number(prod.costPrice) || 0;
    const totalProfit = totalSaleAmount - (unitCost * qtyToDeduct);

    const channelMap = {
      cash: 'drawerCash',
      vodafone_cash: 'vodafoneCash',
      instapay: 'instapay',
      bank: 'bankAccounts'
    };
    const channelLabels = {
      drawerCash: 'كاش الدرج',
      vodafoneCash: 'فودافون كاش',
      instapay: 'إنستاباي',
      bankAccounts: 'الحساب البنكي'
    };
    const paidChannel = channelMap[paymentMethod] || 'drawerCash';
    const selectedWallet = paidChannel === 'vodafoneCash' && shopWalletId
      ? shopWallets.find(w => w.id === shopWalletId)
      : null;
    const selectedInsta = paidChannel === 'instapay' && instapayAccountId
      ? instapayAccounts.find(a => a.id === instapayAccountId)
      : null;

    if (paidChannel === 'vodafoneCash' && shopWallets.length > 0 && shopWalletId && !selectedWallet) {
      showToast('يرجى اختيار خط فودافون كاش صحيح لاستلام المبلغ', 'error');
      return false;
    }
    if (paidChannel === 'instapay' && instapayAccounts.length > 0 && instapayAccountId && !selectedInsta) {
      showToast('يرجى اختيار حساب إنستاباي صحيح لاستلام المبلغ', 'error');
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

    // Credit revenue to liquid treasury and sub-account so total capital increases by profit
    if (totalSaleAmount > 0) {
      if (selectedWallet) {
        setShopWallets(prev => prev.map(w =>
          w.id === selectedWallet.id ? { ...w, balance: (Number(w.balance) || 0) + totalSaleAmount } : w
        ));
      } else if (selectedInsta) {
        setInstapayAccounts(prev => prev.map(a =>
          a.id === selectedInsta.id ? { ...a, balance: (Number(a.balance) || 0) + totalSaleAmount } : a
        ));
      }

      const channelDesc = selectedInsta
        ? `${channelLabels[paidChannel]} (${selectedInsta.accountName})`
        : selectedWallet
        ? `${channelLabels[paidChannel]} (${selectedWallet.label})`
        : channelLabels[paidChannel];

      setTreasury(prev => ({
        ...prev,
        [paidChannel]: (Number(prev[paidChannel]) || 0) + totalSaleAmount,
        lastUpdated: new Date().toISOString(),
        history: [
          {
            id: `mov-${Date.now()}-sale`,
            date: new Date().toISOString(),
            type: 'product_sale',
            channel: paidChannel,
            amount: totalSaleAmount,
            isIncrease: true,
            notes: `مبيعات: (${qtyToDeduct}) ${prod.name} [${colorName}] -> ${channelDesc}`
          },
          ...(prev.history || [])
        ]
      }));
    }

    triggerConfetti();

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
      costPrice: unitCost,
      profit: totalProfit,
      amount: totalSaleAmount,
      paymentMethod,
      paidChannel,
      shopWalletId: selectedWallet?.id || null,
      instapayAccountId: selectedInsta?.id || null,
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

    showToast(`تم تسجيل بيع (${qtyToDeduct}) قطعة [لون: ${colorName}] بقيمة ${formatCurrency(totalSaleAmount)} وإضافتها لرأس المال`);

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

  // ==========================================
  // PURCHASES & SUPPLIERS & EXPENSES MANAGEMENT (المشتريات والموردين والمصروفات)
  // ==========================================

  const addPurchase = (purchaseData) => {
    const isGoods = purchaseData.type === 'inventory_goods';
    const isLiquidity = purchaseData.type === 'cash_liquidity';
    const totalAmount = Number(purchaseData.totalAmount) || 0;
    const paidAmount = Number(purchaseData.paidAmount) || 0;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const paymentStatus = remainingAmount <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');
    
    let defaultPrefix = 'EXP';
    if (isGoods) defaultPrefix = 'PUR';
    if (isLiquidity) defaultPrefix = 'CASH';

    const invoiceNumber = (purchaseData.invoiceNumber || '').trim() || `${defaultPrefix}-${Date.now().toString().slice(-6)}`;

    const channelMap = {
      cash: 'drawerCash',
      wallet: 'vodafoneCash',
      instapay: 'instapay',
      bank: 'bankAccounts'
    };
    const paidChannel = purchaseData.paidChannel || channelMap[purchaseData.paymentMethod] || 'drawerCash';
    const purchasedCashAmount = isLiquidity 
      ? (Number(purchaseData.purchasedCashAmount) || totalAmount) 
      : 0;

    const paidWalletObj = purchaseData.paidFromWalletId
      ? shopWallets.find(w => w.id === purchaseData.paidFromWalletId)
      : null;
    const paidInstapayObj = purchaseData.paidFromInstapayAccountId
      ? instapayAccounts.find(a => a.id === purchaseData.paidFromInstapayAccountId)
      : null;

    const initialPayments = [];
    if (paidAmount > 0) {
      initialPayments.push({
        id: `pay-${Date.now()}`,
        date: purchaseData.date || new Date().toISOString(),
        amount: paidAmount,
        method: purchaseData.paymentMethod || 'cash',
        channel: paidChannel,
        walletId: paidWalletObj?.id || null,
        walletLabel: paidWalletObj ? `${paidWalletObj.label} (${paidWalletObj.phoneNumber})` : null,
        instapayAccountId: paidInstapayObj?.id || null,
        instapayAccountName: paidInstapayObj?.accountName || null,
        notes: isLiquidity 
          ? 'سداد قيمة شراء رصيد كاش' 
          : (isGoods ? 'دفعة أولى عند استلام فاتورة الشراء' : 'سداد قيمة المصروف')
      });
    }

    const newPurchase = {
      id: `pur-${Date.now()}`,
      invoiceNumber,
      type: purchaseData.type || 'inventory_goods',
      expenseCategory: purchaseData.expenseCategory || null,
      date: purchaseData.date || new Date().toISOString(),
      supplierName: (purchaseData.supplierName || (isLiquidity ? 'موزع فودافون كاش' : (isGoods ? 'مورد عام' : 'مصروف عام للمحل'))).trim(),
      supplierPhone: (purchaseData.supplierPhone || '').trim(),
      targetWalletId: purchaseData.targetWalletId || null,
      targetWalletPhone: purchaseData.targetWalletPhone || null,
      purchasedCashAmount: isLiquidity ? purchasedCashAmount : 0,
      items: Array.isArray(purchaseData.items) ? purchaseData.items : [],
      totalAmount,
      paidAmount,
      remainingAmount,
      paymentMethod: purchaseData.paymentMethod || 'cash',
      paidChannel,
      paymentStatus,
      paidFromWalletId: paidWalletObj?.id || null,
      paidFromWalletLabel: paidWalletObj ? `${paidWalletObj.label} (${paidWalletObj.phoneNumber})` : null,
      paidFromInstapayAccountId: paidInstapayObj?.id || null,
      paidFromInstapayAccountName: paidInstapayObj?.accountName || null,
      notes: (purchaseData.notes || '').trim(),
      updateInventory: !!purchaseData.updateInventory,
      payments: initialPayments,
      createdAt: new Date().toISOString()
    };

    // 1. If linked to inventory and has items, update inventory automatically
    if (isGoods && purchaseData.updateInventory && Array.isArray(purchaseData.items)) {
      setInventory(prev => {
        let updatedList = [...prev];
        purchaseData.items.forEach(item => {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) return;

          const existingIdx = updatedList.findIndex(p => (item.productId && p.id === item.productId) || (p.name && item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase()));

          if (existingIdx !== -1) {
            const prod = updatedList[existingIdx];
            const targetColor = item.color || prod.variants?.[0]?.color || 'افتراضي';
            let colorFound = false;
            const updatedVariants = (prod.variants || []).map(v => {
              if (v.color === targetColor) {
                colorFound = true;
                return { ...v, quantity: (Number(v.quantity) || 0) + qty };
              }
              return v;
            });
            if (!colorFound) {
              updatedVariants.push({ color: targetColor, quantity: qty });
            }
            const newTotalQty = updatedVariants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);
            const updatedProd = {
              ...prod,
              costPrice: Number(item.unitCost) > 0 ? Number(item.unitCost) : prod.costPrice,
              salePrice: Number(item.suggestedSalePrice) > 0 ? Number(item.suggestedSalePrice) : prod.salePrice,
              variants: updatedVariants,
              totalQuantity: newTotalQty
            };
            updatedList[existingIdx] = updatedProd;
            realtime.saveProduct(updatedProd);
            if (currentUser && shopId) syncProductToCloud(shopId, updatedProd);
          } else {
            const targetColor = item.color || 'افتراضي';
            const brandNewProd = {
              id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              category: item.category || 'accessories',
              name: (item.name || 'صنف جديد').trim(),
              brand: (item.brand || 'عام').trim(),
              storage: (item.storage || '').trim(),
              costPrice: Number(item.unitCost) || 0,
              salePrice: Number(item.suggestedSalePrice) || Math.round((Number(item.unitCost) || 0) * 1.2),
              minStockAlert: 5,
              notes: `تمت الإضافة تلقائياً من فاتورة شراء ${invoiceNumber}`,
              createdAt: new Date().toISOString(),
              images: [],
              variants: [{ color: targetColor, quantity: qty }],
              totalQuantity: qty
            };
            updatedList.unshift(brandNewProd);
            realtime.saveProduct(brandNewProd);
            if (currentUser && shopId) syncProductToCloud(shopId, brandNewProd);
          }
        });
        return updatedList;
      });
    }

    // 2A. If paid via shop Vodafone Cash wallet, deduct balance & log limit usage
    if (paidAmount > 0 && paidChannel === 'vodafoneCash' && paidWalletObj) {
      setShopWallets(prev => prev.map(w =>
        w.id === paidWalletObj.id
          ? { ...w, balance: Math.max(0, (Number(w.balance) || 0) - paidAmount) }
          : w
      ));

      addTransaction({
        walletId: paidWalletObj.id,
        amount: paidAmount,
        recipientPhone: newPurchase.supplierPhone || '',
        type: 'purchase_payment',
        allowEmptyRecipient: true,
        skipBalanceSync: true,
        notes: `سداد ${isLiquidity ? 'شراء رصيد كاش' : (isGoods ? 'فاتورة مشتريات' : 'مصروف')}: ${invoiceNumber} (${newPurchase.supplierName})`,
        date: purchaseData.date || new Date().toISOString()
      });
    }

    // 2B. If paid via specific InstaPay account, deduct from that InstaPay account's balance
    if (paidAmount > 0 && paidChannel === 'instapay' && paidInstapayObj) {
      setInstapayAccounts(prev => prev.map(acc =>
        acc.id === paidInstapayObj.id
          ? { ...acc, balance: Math.max(0, (Number(acc.balance) || 0) - paidAmount) }
          : acc
      ));
    }

    // 3. If cash_liquidity, recharge target shop wallet so limit & balance increase
    if (isLiquidity && purchasedCashAmount > 0 && purchaseData.targetWalletId) {
      setShopWallets(prev => prev.map(w => 
        w.id === purchaseData.targetWalletId 
          ? { ...w, balance: (Number(w.balance) || 0) + purchasedCashAmount }
          : w
      ));

      addRecharge({
        walletId: purchaseData.targetWalletId,
        amount: purchasedCashAmount,
        skipBalanceSync: true,
        notes: `تغذية وتوريد رصيد كاش من المورد: ${newPurchase.supplierName} (فاتورة ${invoiceNumber})`,
        date: purchaseData.date || new Date().toISOString()
      });
    }

    // 4. CAPITAL / TREASURY DEDUCTION & ELECTRONIC CASH STOCK ADDITION:
    setTreasury(prev => {
      const nextTreasury = { ...prev };
      const newHistory = [...(prev.history || [])];
      const channelNames = {
        drawerCash: 'كاش الدرج والخزينة',
        vodafoneCash: 'فودافون كاش ومحافظ المحمول',
        instapay: 'إنستاباي',
        bankAccounts: 'الحسابات البنكية'
      };

      const sourceDetail = paidInstapayObj
        ? `حساب إنستاباي (${paidInstapayObj.accountName})`
        : paidWalletObj
        ? `خط فودافون كاش (${paidWalletObj.label})`
        : (channelNames[paidChannel] || paidChannel);

      if (paidAmount > 0 && paidChannel && nextTreasury[paidChannel] !== undefined) {
        const curBal = Number(nextTreasury[paidChannel]) || 0;
        nextTreasury[paidChannel] = Math.max(0, curBal - paidAmount);

        newHistory.unshift({
          id: `mov-${Date.now()}-deduct`,
          date: purchaseData.date || new Date().toISOString(),
          type: 'purchase_deduction',
          channel: paidChannel,
          amount: paidAmount,
          isIncrease: false,
          notes: `خصم سداد فاتورة ${isLiquidity ? 'شراء رصيد كاش' : (isGoods ? 'مشتريات بضاعة' : 'مصروف')}: ${invoiceNumber} من ${sourceDetail} (${newPurchase.supplierName})`
        });
      }

      if (isLiquidity && purchasedCashAmount > 0) {
        const curVf = Number(nextTreasury.vodafoneCash) || 0;
        nextTreasury.vodafoneCash = curVf + purchasedCashAmount;

        newHistory.unshift({
          id: `mov-${Date.now()}-addcash`,
          date: purchaseData.date || new Date().toISOString(),
          type: 'cash_stock_in',
          channel: 'vodafoneCash',
          amount: purchasedCashAmount,
          isIncrease: true,
          notes: `تغذية رصيد فودافون كاش ومحافظ المحمول: فاتورة ${invoiceNumber} بمبلغ +${formatCurrency(purchasedCashAmount)} (${purchaseData.targetWalletPhone || ''})`
        });
      }

      nextTreasury.history = newHistory;
      nextTreasury.lastUpdated = new Date().toISOString();
      return nextTreasury;
    });

    setPurchases(prev => [newPurchase, ...prev]);

    let toastMsg = `تم حفظ فاتورة المشتريات رقم ${invoiceNumber} بنجاح!`;
    if (isLiquidity) {
      toastMsg = `تم تسجيل شراء رصيد كاش بقيمة ${formatCurrency(purchasedCashAmount)} وتغذية الخزينة ورأس المال بنجاح!`;
    } else if (!isGoods) {
      toastMsg = `تم تسجيل المصروف بقيمة ${formatCurrency(totalAmount)} وخصمه من الخزينة بنجاح!`;
    }
    showToast(toastMsg, 'success');
    return newPurchase;
  };

  const updatePurchase = (purchaseId, updatedFields) => {
    setPurchases(prev => prev.map(p => {
      if (p.id !== purchaseId) return p;
      const totalAmount = updatedFields.totalAmount !== undefined ? Number(updatedFields.totalAmount) : p.totalAmount;
      const paidAmount = updatedFields.paidAmount !== undefined ? Number(updatedFields.paidAmount) : p.paidAmount;
      const remainingAmount = Math.max(0, totalAmount - paidAmount);
      const paymentStatus = remainingAmount <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');
      return {
        ...p,
        ...updatedFields,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentStatus
      };
    }));
    showToast('تم تحديث بيانات الفاتورة بنجاح');
  };

  const deletePurchase = (purchaseId) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) return;

    if (purchase.paidAmount > 0 || (purchase.type === 'cash_liquidity' && purchase.purchasedCashAmount > 0)) {
      const channelMap = {
        cash: 'drawerCash',
        wallet: 'vodafoneCash',
        instapay: 'instapay',
        bank: 'bankAccounts'
      };
      const channel = purchase.paidChannel || channelMap[purchase.paymentMethod] || 'drawerCash';

      // Revert paid amounts to linked sub-accounts (per payment history if available, else initial channel)
      const paymentsList = Array.isArray(purchase.payments) && purchase.payments.length > 0
        ? purchase.payments
        : (purchase.paidAmount > 0
            ? [{
                amount: purchase.paidAmount,
                channel,
                walletId: purchase.paidFromWalletId || null,
                instapayAccountId: purchase.paidFromInstapayAccountId || null
              }]
            : []);

      paymentsList.forEach(pay => {
        const amt = Number(pay.amount) || 0;
        const payCh = pay.channel || channelMap[pay.method] || channel;
        if (amt <= 0) return;

        if (payCh === 'instapay' && pay.instapayAccountId) {
          setInstapayAccounts(prev => prev.map(acc =>
            acc.id === pay.instapayAccountId
              ? { ...acc, balance: (Number(acc.balance) || 0) + amt }
              : acc
          ));
        }

        if (payCh === 'vodafoneCash' && pay.walletId) {
          setShopWallets(prev => prev.map(w =>
            w.id === pay.walletId
              ? { ...w, balance: (Number(w.balance) || 0) + amt }
              : w
          ));
        }
      });

      if (purchase.type === 'cash_liquidity' && purchase.purchasedCashAmount > 0 && purchase.targetWalletId) {
        setShopWallets(prev => prev.map(w =>
          w.id === purchase.targetWalletId
            ? { ...w, balance: Math.max(0, (Number(w.balance) || 0) - purchase.purchasedCashAmount) }
            : w
        ));
      }
      
      setTreasury(prev => {
        const nextTreasury = { ...prev };
        const newHistory = [...(prev.history || [])];

        if (purchase.paidAmount > 0) {
          paymentsList.forEach((pay, idx) => {
            const amt = Number(pay.amount) || 0;
            const payCh = pay.channel || channelMap[pay.method] || channel;
            if (amt > 0 && nextTreasury[payCh] !== undefined) {
              nextTreasury[payCh] = (Number(nextTreasury[payCh]) || 0) + amt;
              newHistory.unshift({
                id: `mov-${Date.now()}-ref-${idx}`,
                date: new Date().toISOString(),
                type: 'purchase_reversal',
                channel: payCh,
                amount: amt,
                isIncrease: true,
                notes: `استرداد مبالغ فاتورة محذوفة (${purchase.invoiceNumber}) لحساب الخزينة`
              });
            }
          });
        }

        if (purchase.type === 'cash_liquidity' && purchase.purchasedCashAmount > 0) {
          const curVf = Number(nextTreasury.vodafoneCash) || 0;
          nextTreasury.vodafoneCash = Math.max(0, curVf - purchase.purchasedCashAmount);

          newHistory.unshift({
            id: `mov-${Date.now()}-revcash`,
            date: new Date().toISOString(),
            type: 'cash_stock_out',
            channel: 'vodafoneCash',
            amount: purchase.purchasedCashAmount,
            isIncrease: false,
            notes: `إلغاء رصيد كاش المشترى لفاتورة محذوفة (${purchase.invoiceNumber}) بمبلغ -${formatCurrency(purchase.purchasedCashAmount)}`
          });
        }

        nextTreasury.history = newHistory;
        nextTreasury.lastUpdated = new Date().toISOString();
        return nextTreasury;
      });
    }

    setPurchases(prev => prev.filter(p => p.id !== purchaseId));
    showToast('تم حذف الفاتورة واسترجاع أرصدة الخزينة بنجاح', 'info');
  };

  const recordSupplierPayment = (purchaseId, {
    amount,
    paymentMethod = 'cash',
    paidChannel = null,
    walletId = null,
    instapayAccountId = null,
    notes = ''
  }) => {
    const payAmt = Number(amount) || 0;
    if (payAmt <= 0) {
      showToast('يرجى إدخال مبلغ سداد صحيح أكبر من صفر', 'error');
      return false;
    }

    const channelMap = {
      cash: 'drawerCash',
      wallet: 'vodafoneCash',
      instapay: 'instapay',
      bank: 'bankAccounts'
    };
    const targetChannel = paidChannel || channelMap[paymentMethod] || 'drawerCash';

    const selectedWalletObj = walletId ? shopWallets.find(w => w.id === walletId) : null;
    const selectedInstapayObj = instapayAccountId ? instapayAccounts.find(a => a.id === instapayAccountId) : null;

    let foundPurchase = null;
    setPurchases(prev => prev.map(p => {
      if (p.id !== purchaseId) return p;
      foundPurchase = p;
      const newPaid = p.paidAmount + payAmt;
      const newRemaining = Math.max(0, p.totalAmount - newPaid);
      const newStatus = newRemaining <= 0 ? 'paid' : 'partial';

      const newPayment = {
        id: `pay-${Date.now()}`,
        date: new Date().toISOString(),
        amount: payAmt,
        method: paymentMethod,
        channel: targetChannel,
        walletId: selectedWalletObj?.id || null,
        walletLabel: selectedWalletObj ? `${selectedWalletObj.label} (${selectedWalletObj.phoneNumber})` : null,
        instapayAccountId: selectedInstapayObj?.id || null,
        instapayAccountName: selectedInstapayObj?.accountName || null,
        notes: notes || 'سداد دفعة من الحساب الآجل للمورد'
      };

      return {
        ...p,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        paymentStatus: newStatus,
        payments: [...(p.payments || []), newPayment]
      };
    }));

    if (!foundPurchase) return false;

    if (targetChannel === 'vodafoneCash' && selectedWalletObj) {
      setShopWallets(prev => prev.map(w => 
        w.id === selectedWalletObj.id 
          ? { ...w, balance: Math.max(0, (Number(w.balance) || 0) - payAmt) }
          : w
      ));

      addTransaction({
        walletId: selectedWalletObj.id,
        amount: payAmt,
        recipientPhone: foundPurchase.supplierPhone || '',
        type: 'purchase_payment',
        allowEmptyRecipient: true,
        skipBalanceSync: true,
        notes: `سداد دفعة آجل للمورد: ${foundPurchase.supplierName} (فاتورة ${foundPurchase.invoiceNumber})`,
        date: new Date().toISOString()
      });
    }

    if (targetChannel === 'instapay' && selectedInstapayObj) {
      setInstapayAccounts(prev => prev.map(acc =>
        acc.id === selectedInstapayObj.id
          ? { ...acc, balance: Math.max(0, (Number(acc.balance) || 0) - payAmt) }
          : acc
      ));
    }

    setTreasury(prev => {
      const curBal = Number(prev[targetChannel]) || 0;
      const channelNames = {
        drawerCash: 'كاش الدرج والخزينة',
        vodafoneCash: 'فودافون كاش ومحافظ المحمول',
        instapay: 'إنستاباي',
        bankAccounts: 'الحسابات البنكية'
      };

      const sourceDetail = selectedInstapayObj
        ? `حساب إنستاباي (${selectedInstapayObj.accountName})`
        : selectedWalletObj
        ? `خط فودافون كاش (${selectedWalletObj.label})`
        : (channelNames[targetChannel] || targetChannel);

      const newHistoryRecord = {
        id: `mov-${Date.now()}`,
        date: new Date().toISOString(),
        type: 'supplier_payment',
        channel: targetChannel,
        amount: payAmt,
        isIncrease: false,
        notes: `سداد دفعة آجل للمورد: ${foundPurchase.supplierName} (فاتورة ${foundPurchase.invoiceNumber}) من ${sourceDetail}`
      };

      return {
        ...prev,
        [targetChannel]: Math.max(0, curBal - payAmt),
        lastUpdated: new Date().toISOString(),
        history: [newHistoryRecord, ...(prev.history || [])]
      };
    });

    showToast(`تم تسجيل سداد دفعة للمورد بقيمة ${formatCurrency(payAmt)} وخصمها من الخزينة بنجاح!`, 'success');
    return true;
  };

  // ==========================================
  // CAPITAL & TREASURY MANAGEMENT (رأس المال والسيولة والخزينة)
  // ==========================================

  const updateTreasuryBalance = (channel, newBalance, reason = '', subAccountId = null) => {
    const num = Math.max(0, Number(newBalance) || 0);

    // If a specific Vodafone Cash line or InstaPay account is being adjusted
    if (channel === 'vodafoneCash' && subAccountId) {
      const wallet = shopWallets.find(w => w.id === subAccountId);
      if (wallet) {
        updateShopWallet(subAccountId, { balance: num });
        return true;
      }
    }
    if (channel === 'instapay' && subAccountId) {
      const acc = instapayAccounts.find(a => a.id === subAccountId);
      if (acc) {
        updateInstapayAccount(subAccountId, { balance: num });
        return true;
      }
    }

    const oldBal = Number(treasury[channel]) || 0;
    const diff = num - oldBal;

    const channelNames = {
      drawerCash: 'كاش الدرج والخزينة',
      vodafoneCash: 'فودافون كاش ومحافظ المحمول',
      instapay: 'إنستاباي',
      bankAccounts: 'الحسابات البنكية'
    };

    const newHistoryRecord = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'adjustment',
      channel,
      oldBalance: oldBal,
      newBalance: num,
      amount: Math.abs(diff),
      isIncrease: diff >= 0,
      notes: reason.trim() || `تسوية رصيد ${channelNames[channel] || channel} (الفرق: ${diff >= 0 ? '+' : ''}${formatCurrency(diff)})`
    };

    setTreasury(prev => ({
      ...prev,
      [channel]: num,
      lastUpdated: new Date().toISOString(),
      history: [newHistoryRecord, ...(prev.history || [])]
    }));

    showToast(`تم تحديث رصيد ${channelNames[channel] || channel} إلى ${formatCurrency(num)} بنجاح!`, 'success');
    return true;
  };

  const transferBetweenTreasury = (fromChannel, toChannel, amount, notes = '', options = {}) => {
    const { fromSubAccountId = null, toSubAccountId = null } = options || {};
    const num = Number(amount) || 0;
    if (num <= 0) {
      showToast('يرجى إدخال مبلغ تحويل صحيح أكبر من صفر', 'error');
      return false;
    }

    const fromWallet = fromChannel === 'vodafoneCash' && fromSubAccountId ? shopWallets.find(w => w.id === fromSubAccountId) : null;
    const fromInsta = fromChannel === 'instapay' && fromSubAccountId ? instapayAccounts.find(a => a.id === fromSubAccountId) : null;
    const toWallet = toChannel === 'vodafoneCash' && toSubAccountId ? shopWallets.find(w => w.id === toSubAccountId) : null;
    const toInsta = toChannel === 'instapay' && toSubAccountId ? instapayAccounts.find(a => a.id === toSubAccountId) : null;

    // Validate available balance (per selected sub-account if specified, or total channel)
    if (fromWallet) {
      const wBal = Number(fromWallet.balance) || 0;
      if (num > wBal) {
        showToast(`الرصيد المتاح في خط (${fromWallet.label}) هو (${formatCurrency(wBal)}) وهو أقل من المبلغ المطلوب!`, 'error');
        return false;
      }
    } else if (fromInsta) {
      const aBal = Number(fromInsta.balance) || 0;
      if (num > aBal) {
        showToast(`الرصيد المتاح في حساب (${fromInsta.accountName}) هو (${formatCurrency(aBal)}) وهو أقل من المبلغ المطلوب!`, 'error');
        return false;
      }
    } else {
      const fromBal = Number(treasury[fromChannel]) || 0;
      if (num > fromBal) {
        showToast(`الرصيد المتاح في جهة التحويل (${formatCurrency(fromBal)}) غير كافٍ لتحويل (${formatCurrency(num)})!`, 'error');
        return false;
      }
    }

    // Update sub-accounts (works both across channels AND between two accounts of the same channel!)
    if (fromWallet || toWallet) {
      setShopWallets(prev => prev.map(w => {
        let bal = Number(w.balance) || 0;
        if (fromWallet && w.id === fromWallet.id) bal = Math.max(0, bal - num);
        if (toWallet && w.id === toWallet.id) bal = bal + num;
        return (fromWallet?.id === w.id || toWallet?.id === w.id) ? { ...w, balance: bal } : w;
      }));
    }

    if (fromInsta || toInsta) {
      setInstapayAccounts(prev => prev.map(acc => {
        let bal = Number(acc.balance) || 0;
        if (fromInsta && acc.id === fromInsta.id) bal = Math.max(0, bal - num);
        if (toInsta && acc.id === toInsta.id) bal = bal + num;
        return (fromInsta?.id === acc.id || toInsta?.id === acc.id) ? { ...acc, balance: bal } : acc;
      }));
    }

    const channelNames = {
      drawerCash: 'كاش الدرج',
      vodafoneCash: 'فودافون كاش',
      instapay: 'إنستاباي',
      bankAccounts: 'الحسابات البنكية'
    };

    const fromDesc = fromInsta
      ? `${channelNames[fromChannel]} (${fromInsta.accountName})`
      : fromWallet
      ? `${channelNames[fromChannel]} (${fromWallet.label})`
      : channelNames[fromChannel];

    const toDesc = toInsta
      ? `${channelNames[toChannel]} (${toInsta.accountName})`
      : toWallet
      ? `${channelNames[toChannel]} (${toWallet.label})`
      : channelNames[toChannel];

    const newHistoryRecord = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'transfer',
      from: fromChannel,
      to: toChannel,
      amount: num,
      notes: notes.trim() || `تحويل من ${fromDesc} إلى ${toDesc}`
    };

    setTreasury(prev => {
      const next = {
        ...prev,
        lastUpdated: new Date().toISOString(),
        history: [newHistoryRecord, ...(prev.history || [])]
      };
      if (fromChannel !== toChannel) {
        next[fromChannel] = Math.max(0, (Number(prev[fromChannel]) || 0) - num);
        next[toChannel] = (Number(prev[toChannel]) || 0) + num;
      }
      return next;
    });

    showToast(`تم تحويل ${formatCurrency(num)} من ${fromDesc} إلى ${toDesc} بنجاح!`, 'success');
    return true;
  };

  const depositToTreasury = (channel, amount, notes = '', subAccountId = null) => {
    const num = Number(amount) || 0;
    if (num <= 0) return false;

    const targetWallet = channel === 'vodafoneCash' && subAccountId ? shopWallets.find(w => w.id === subAccountId) : null;
    const targetInsta = channel === 'instapay' && subAccountId ? instapayAccounts.find(a => a.id === subAccountId) : null;

    if (targetWallet) {
      setShopWallets(prev => prev.map(w =>
        w.id === targetWallet.id ? { ...w, balance: (Number(w.balance) || 0) + num } : w
      ));
    }
    if (targetInsta) {
      setInstapayAccounts(prev => prev.map(a =>
        a.id === targetInsta.id ? { ...a, balance: (Number(a.balance) || 0) + num } : a
      ));
    }

    const channelNames = {
      drawerCash: 'كاش الدرج',
      vodafoneCash: 'فودافون كاش',
      instapay: 'إنستاباي',
      bankAccounts: 'الحسابات البنكية'
    };

    const destLabel = targetInsta
      ? `${channelNames[channel]} (${targetInsta.accountName})`
      : targetWallet
      ? `${channelNames[channel]} (${targetWallet.label})`
      : (channelNames[channel] || channel);

    const newHistoryRecord = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'deposit',
      channel,
      amount: num,
      notes: notes.trim() || `إيداع وضخ سيولة إضافية في ${destLabel}`
    };

    setTreasury(prev => ({
      ...prev,
      [channel]: (Number(prev[channel]) || 0) + num,
      lastUpdated: new Date().toISOString(),
      history: [newHistoryRecord, ...(prev.history || [])]
    }));

    showToast(`تم إيداع ${formatCurrency(num)} في ${destLabel} بنجاح!`, 'success');
    return true;
  };

  const withdrawFromTreasury = (channel, amount, notes = '', subAccountId = null) => {
    const num = Number(amount) || 0;
    if (num <= 0) return false;

    const targetWallet = channel === 'vodafoneCash' && subAccountId ? shopWallets.find(w => w.id === subAccountId) : null;
    const targetInsta = channel === 'instapay' && subAccountId ? instapayAccounts.find(a => a.id === subAccountId) : null;

    if (targetWallet) {
      const wBal = Number(targetWallet.balance) || 0;
      if (num > wBal) {
        showToast(`الرصيد المتاح في (${targetWallet.label}) هو (${formatCurrency(wBal)}) أقل من المبلغ المطلوب سحبه`, 'error');
        return false;
      }
    } else if (targetInsta) {
      const aBal = Number(targetInsta.balance) || 0;
      if (num > aBal) {
        showToast(`الرصيد المتاح في (${targetInsta.accountName}) هو (${formatCurrency(aBal)}) أقل من المبلغ المطلوب سحبه`, 'error');
        return false;
      }
    } else {
      const curBal = Number(treasury[channel]) || 0;
      if (num > curBal) {
        showToast(`الرصيد المتاح (${formatCurrency(curBal)}) أقل من المبلغ المطلوب سحبه`, 'error');
        return false;
      }
    }

    if (targetWallet) {
      setShopWallets(prev => prev.map(w =>
        w.id === targetWallet.id ? { ...w, balance: Math.max(0, (Number(w.balance) || 0) - num) } : w
      ));
    }
    if (targetInsta) {
      setInstapayAccounts(prev => prev.map(a =>
        a.id === targetInsta.id ? { ...a, balance: Math.max(0, (Number(a.balance) || 0) - num) } : a
      ));
    }

    const channelNames = {
      drawerCash: 'كاش الدرج',
      vodafoneCash: 'فودافون كاش',
      instapay: 'إنستاباي',
      bankAccounts: 'الحسابات البنكية'
    };

    const srcLabel = targetInsta
      ? `${channelNames[channel]} (${targetInsta.accountName})`
      : targetWallet
      ? `${channelNames[channel]} (${targetWallet.label})`
      : (channelNames[channel] || channel);

    const newHistoryRecord = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'withdraw',
      channel,
      amount: num,
      notes: notes.trim() || `سحب مسحوبات خاصة من ${srcLabel}`
    };

    setTreasury(prev => ({
      ...prev,
      [channel]: Math.max(0, (Number(prev[channel]) || 0) - num),
      lastUpdated: new Date().toISOString(),
      history: [newHistoryRecord, ...(prev.history || [])]
    }));

    showToast(`تم سحب ${formatCurrency(num)} من ${srcLabel} بنجاح`, 'info');
    return true;
  };

  // Reconcile treasury total with sum of linked sub-accounts (خطوط فودافون كاش / حسابات إنستاباي)
  const syncTreasuryWithSubAccounts = (channel) => {
    if (channel === 'vodafoneCash') {
      const sum = shopWallets.reduce((acc, w) => acc + (Number(w.balance) || 0), 0);
      return updateTreasuryBalance('vodafoneCash', sum, 'مزامنة إجمالي فودافون كاش مع أرصدة الخطوط الفعلية');
    }
    if (channel === 'instapay') {
      const sum = instapayAccounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
      return updateTreasuryBalance('instapay', sum, 'مزامنة إجمالي إنستاباي مع أرصدة الحسابات الفعلية');
    }
    return false;
  };

  // ==========================================
  // DAILY AUDIT & END-OF-DAY CLOSING (جرد نهاية اليوم وإقفال اليومية وبدء يوم جديد)
  // ==========================================

  const recordDailyAudit = ({
    date = null,
    auditorName = '',
    notes = '',
    systemBalances,
    actualBalances,
    variances,
    daySummary,
    status = 'matched'
  }) => {
    const auditDate = date ? new Date(date) : new Date();
    const dateOnly = getLocalDateString(auditDate);
    const timeStr = formatTimeArabic(auditDate);
    
    const newAudit = {
      id: `audit-${Date.now()}`,
      date: auditDate.toISOString(),
      dateOnly,
      time: timeStr,
      auditorName: auditorName.trim() || 'صاحب المحل',
      notes: notes.trim(),
      status, // 'matched' | 'surplus' | 'deficit'
      systemBalances,
      actualBalances,
      variances,
      daySummary,
      createdAt: new Date().toISOString()
    };

    // 1. Update treasury actual balances to start the new day with counted cash
    if (actualBalances) {
      setTreasury(prev => {
        const next = { ...prev };
        const newHistory = [...(prev.history || [])];

        const channels = ['drawerCash', 'vodafoneCash', 'instapay', 'bankAccounts'];
        const channelNames = {
          drawerCash: 'كاش الدرج والخزينة',
          vodafoneCash: 'فودافون كاش ومحافظ المحمول',
          instapay: 'إنستاباي',
          bankAccounts: 'الحسابات البنكية'
        };

        channels.forEach(ch => {
          if (actualBalances[ch] !== undefined && actualBalances[ch] !== null) {
            const act = Number(actualBalances[ch]) || 0;
            const sys = Number(systemBalances?.[ch]) || Number(prev[ch]) || 0;
            const diff = act - sys;

            next[ch] = act;

            if (diff !== 0) {
              newHistory.unshift({
                id: `mov-${Date.now()}-audit-${ch}`,
                date: auditDate.toISOString(),
                type: 'daily_closing_audit',
                channel: ch,
                oldBalance: sys,
                newBalance: act,
                amount: Math.abs(diff),
                isIncrease: diff > 0,
                notes: `تسوية جرد نهاية اليومية: ${channelNames[ch]} (فرق الجرد: ${diff > 0 ? '+' : ''}${formatCurrency(diff)})`
              });
            }
          }
        });

        next.history = newHistory;
        next.lastUpdated = auditDate.toISOString();
        return next;
      });
    }

    // 2. Update shop wallets actual balances if provided in audit
    if (actualBalances?.shopWallets && Array.isArray(actualBalances.shopWallets)) {
      setShopWallets(prev => prev.map(w => {
        const counted = actualBalances.shopWallets.find(sw => sw.id === w.id);
        if (counted && counted.balance !== undefined) {
          return { ...w, balance: Number(counted.balance) || 0 };
        }
        return w;
      }));
    }

    // 3. Update instapay accounts actual balances if provided in audit
    if (actualBalances?.instapayAccounts && Array.isArray(actualBalances.instapayAccounts)) {
      setInstapayAccounts(prev => prev.map(a => {
        const counted = actualBalances.instapayAccounts.find(ia => ia.id === a.id);
        if (counted && counted.balance !== undefined) {
          return { ...a, balance: Number(counted.balance) || 0 };
        }
        return a;
      }));
    }

    // 4. Save audit log
    setDailyAudits(prev => [newAudit, ...(Array.isArray(prev) ? prev : [])]);

    showToast(
      status === 'matched' 
        ? 'تم اعتماد جرد اليومية بنجاح ومطابقة كافة الأرصدة لبدء يوم جديد!' 
        : `تم اعتماد جرد اليومية وتسوية الأرصدة (${status === 'deficit' ? 'يوجد عجز' : 'توجد زيادة'}) وبدء يوم جديد بنجاح!`,
      status === 'deficit' ? 'warning' : 'success'
    );

    triggerConfetti();
    return newAudit;
  };

  const deleteDailyAudit = (auditId) => {
    setDailyAudits(prev => prev.filter(a => a.id !== auditId));
    showToast('تم حذف سجل الجرد بنجاح', 'info');
  };

  // ==========================================
  // DAILY OPENING CAPITAL & BALANCES (رصيد بداية اليومية والافتتاح)
  // ==========================================
  const recordDailyOpeningBalance = ({
    date = null,
    recordedBy = 'محمود الأعصر (صاحب المحل)',
    drawerCash = 0,
    vodafoneCash = 0,
    instapay = 0,
    bankAccounts = 0,
    shopWallets: inputWallets = [],
    instapayAccounts: inputInstapay = [],
    notes = '',
    applyToLive = true
  }) => {
    const targetDate = date ? new Date(date) : new Date();
    const dateOnly = getLocalDateString(targetDate);
    const nowIso = new Date().toISOString();

    const dCash = Number(drawerCash) || 0;
    const vCash = Number(vodafoneCash) || 0;
    const iCash = Number(instapay) || 0;
    const bCash = Number(bankAccounts) || 0;
    const totalOpeningCash = dCash + vCash + iCash + bCash;

    const newOpening = {
      id: `open-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: targetDate.toISOString(),
      dateOnly,
      recordedAt: nowIso,
      recordedBy,
      drawerCash: dCash,
      vodafoneCash: vCash,
      instapay: iCash,
      bankAccounts: bCash,
      totalOpeningCash,
      shopWallets: Array.isArray(inputWallets) ? inputWallets : [],
      instapayAccounts: Array.isArray(inputInstapay) ? inputInstapay : [],
      notes: notes || '',
      applyToLive: Boolean(applyToLive)
    };

    setDailyOpeningBalances(prev => {
      const filtered = prev.filter(o => o.dateOnly !== dateOnly);
      return [newOpening, ...filtered];
    });

    if (applyToLive) {
      setTreasury(prev => ({
        ...prev,
        drawerCash: dCash,
        vodafoneCash: vCash,
        instapay: iCash,
        bankAccounts: bCash,
        history: [
          {
            id: `th-${Date.now()}`,
            date: nowIso,
            type: 'adjust',
            amount: totalOpeningCash,
            account: 'all',
            description: `تثبيت رصيد بداية اليومية والافتتاح (${dateOnly})`,
            performedBy: recordedBy
          },
          ...(prev.history || [])
        ]
      }));

      if (Array.isArray(inputWallets) && inputWallets.length > 0) {
        setShopWallets(prev => prev.map(sw => {
          const matched = inputWallets.find(iw => iw.id === sw.id);
          if (matched && matched.balance !== undefined) {
            return { ...sw, balance: Number(matched.balance) || 0 };
          }
          return sw;
        }));
      }

      if (Array.isArray(inputInstapay) && inputInstapay.length > 0) {
        setInstapayAccounts(prev => prev.map(acc => {
          const matched = inputInstapay.find(ia => ia.id === acc.id);
          if (matched && matched.balance !== undefined) {
            return { ...acc, balance: Number(matched.balance) || 0 };
          }
          return acc;
        }));
      }
    }

    showToast(`تم تسجيل وتثبيت رصيد بداية اليومية (${dateOnly}) بإجمالي ${totalOpeningCash.toLocaleString()} ج.م`);
    triggerConfetti();
    return newOpening;
  };

  const deleteDailyOpeningBalance = (openingId) => {
    setDailyOpeningBalances(prev => prev.filter(o => o.id !== openingId));
    showToast('تم حذف رصيد بداية اليومية بنجاح', 'info');
  };

  const getOpeningBalanceForDate = (dateOnly) => {
    if (!dateOnly) return null;
    const direct = dailyOpeningBalances.find(o => o.dateOnly === dateOnly);
    if (direct) return direct;
    
    // Check previous day's audit
    const prevAudit = dailyAudits.find(a => {
      const aDate = new Date(a.dateOnly || a.date);
      const targetDate = new Date(dateOnly);
      const diff = Math.round((targetDate - aDate) / (1000 * 60 * 60 * 24));
      return diff === 1;
    });

    if (prevAudit && prevAudit.actualBalances) {
      return {
        id: `open-from-prev-${dateOnly}`,
        dateOnly,
        isDerivedFromAudit: true,
        drawerCash: prevAudit.actualBalances.drawerCash || 0,
        vodafoneCash: prevAudit.actualBalances.vodafoneCash || 0,
        instapay: prevAudit.actualBalances.instapay || 0,
        bankAccounts: prevAudit.actualBalances.bankAccounts || 0,
        totalOpeningCash: prevAudit.actualTotal || 0,
        shopWallets: prevAudit.shopWallets || [],
        instapayAccounts: prevAudit.instapayAccounts || [],
        notes: `منقول تلقائياً من جرد إقفال اليوم السابق (${prevAudit.dateOnly})`
      };
    }
    return null;
  };

  const getClosingAuditForDate = (dateOnly) => {
    if (!dateOnly) return null;
    return dailyAudits.find(a => a.dateOnly === dateOnly || a.date?.startsWith(dateOnly)) || null;
  };

  // Reset demo data
  const handleResetDemo = () => {
    const demo = storage.resetToDemo();
    setClients(demo.clients);
    setTransactions(demo.transactions);
    setInventory(demo.inventory);
    setShopWallets(demo.shopWallets || INITIAL_SHOP_WALLETS);
    setInstapayAccounts(demo.instapayAccounts || INITIAL_INSTAPAY_ACCOUNTS);
    setClientArchives(demo.clientArchives || []);
    setPurchases(demo.purchases || INITIAL_DEMO_PURCHASES);
    setTreasury(demo.treasury || INITIAL_DEMO_TREASURY);
    setDailyAudits(demo.dailyAudits || INITIAL_DEMO_DAILY_AUDITS);
    setDailyOpeningBalances(demo.dailyOpeningBalances || INITIAL_DEMO_DAILY_OPENING_BALANCES);
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
    setInstapayAccounts([]);
    setClientArchives([]);
    setPurchases([]);
    setTreasury(empty.treasury || { drawerCash: 0, vodafoneCash: 0, instapay: 0, bankAccounts: 0, history: [] });
    setDailyAudits([]);
    setDailyOpeningBalances([]);
    showToast('تم مسح جميع البيانات بنجاح', 'info');
  };

  // Export data
  const handleExport = () => {
    storage.exportFullBackup(clients, transactions, inventory, trash, shopWallets, clientArchives, purchases, treasury, instapayAccounts, dailyAudits, dailyOpeningBalances);
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
    if (Array.isArray(backupData.instapayAccounts)) {
      setInstapayAccounts(backupData.instapayAccounts);
    }
    if (Array.isArray(backupData.purchases)) {
      setPurchases(backupData.purchases);
    }
    if (backupData.treasury && typeof backupData.treasury === 'object') {
      setTreasury(backupData.treasury);
    }
    if (Array.isArray(backupData.dailyAudits)) {
      setDailyAudits(backupData.dailyAudits);
    }
    if (Array.isArray(backupData.dailyOpeningBalances)) {
      setDailyOpeningBalances(backupData.dailyOpeningBalances);
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
      const bal = Number(cleanWallet.balance) || 0;
      if (bal > 0) {
        setTreasury(prev => ({
          ...prev,
          vodafoneCash: (Number(prev.vodafoneCash) || 0) + bal,
          lastUpdated: new Date().toISOString()
        }));
      }
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

  // Purchases Metrics & KPIs
  const currentMonthKey = getCurrentMonthKey();
  const todayPurchases = purchases.filter(p => {
    const pDate = p.date ? getLocalDateString(p.date) : '';
    return pDate === todayStr;
  });
  const todayPurchasesAmount = todayPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

  const monthPurchases = purchases.filter(p => {
    const pDate = p.date ? getLocalDateString(p.date) : '';
    return pDate.startsWith(currentMonthKey);
  });
  const monthPurchasesAmount = monthPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const totalSupplierDebt = purchases.reduce((sum, p) => sum + (Number(p.remainingAmount) || 0), 0);
  const inventoryPurchasesTotal = purchases.filter(p => p.type === 'inventory_goods').reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const generalExpensesTotal = purchases.filter(p => p.type === 'general_expense').reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
  const cashLiquidityPurchasesTotal = purchases.filter(p => p.type === 'cash_liquidity').reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

  const uniqueSuppliers = useMemo(() => {
    const set = new Set();
    purchases.forEach(p => {
      if (p.supplierName && (p.type === 'inventory_goods' || p.type === 'cash_liquidity')) set.add(p.supplierName.trim());
    });
    return Array.from(set);
  }, [purchases]);

  // Capital & Treasury Calculations
  const totalLiquidCash = (Number(treasury.drawerCash) || 0) + 
                          (Number(treasury.vodafoneCash) || 0) + 
                          (Number(treasury.instapay) || 0) + 
                          (Number(treasury.bankAccounts) || 0);

  const clientsTotalReceivables = useMemo(() => {
    return (clients || []).reduce((sum, client) => {
      const wallets = client.wallets || [];
      const walletIds = new Set(wallets.map(w => w.id));
      const recharges = transactions
        .filter(t => walletIds.has(t.walletId) && (t.type === 'recharge' || t.type === 'limit_reset') && !t.isSettled)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const payments = transactions
        .filter(t => (t.clientId === client.id || t.customerId === client.id) && t.type === 'client_payment')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const debt = Math.max(0, recharges - payments);
      return sum + debt;
    }, 0);
  }, [clients, transactions]);

  const totalCapitalNetWorth = totalLiquidCash + totalInventoryCost + clientsTotalReceivables - totalSupplierDebt;

  return (
    <CashContext.Provider
      value={{
        clients,
        transactions,
        inventory,
        shopWallets,
        instapayAccounts,
        purchases,
        treasury,
        dailyAudits,
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
        addInstapayAccount,
        updateInstapayAccount,
        deleteInstapayAccount,
        transferFromInstapay,
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

        // Purchases & Expenses Actions & Metrics
        addPurchase,
        updatePurchase,
        deletePurchase,
        recordSupplierPayment,
        todayPurchases,
        todayPurchasesAmount,
        monthPurchases,
        monthPurchasesAmount,
        totalPurchasesAmount,
        totalSupplierDebt,
        inventoryPurchasesTotal,
        generalExpensesTotal,
        cashLiquidityPurchasesTotal,
        uniqueSuppliers,

        // Capital & Treasury Actions & Metrics
        updateTreasuryBalance,
        transferBetweenTreasury,
        depositToTreasury,
        withdrawFromTreasury,
        syncTreasuryWithSubAccounts,
        totalLiquidCash,
        clientsTotalReceivables,
        totalCapitalNetWorth,

        // Daily Audit & Closing
        recordDailyAudit,
        deleteDailyAudit,

        // Daily Opening Capital & Balances
        dailyOpeningBalances,
        recordDailyOpeningBalance,
        deleteDailyOpeningBalance,
        getOpeningBalanceForDate,
        getClosingAuditForDate,

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
