/**
 * Storage manager with localStorage persistence, sample data, and backup/restore
 */

const STORAGE_KEYS = {
  CLIENTS: 'elaasar_cash_clients_v3',
  TRANSACTIONS: 'elaasar_cash_transactions_v3',
  SETTINGS: 'elaasar_cash_settings_v3',
  THEME: 'elaasar_cash_theme_v3',
  INVENTORY: 'elaasar_cash_inventory_v3',
  TRASH: 'elaasar_cash_trash_v1',
  SHOP_WALLETS: 'elaasar_cash_shop_wallets_v1',
};

// Generates today's date string and some earlier timestamps
function getRecentDate(daysAgo = 0, hours = 10, minutes = 30) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function getLocalDateOnly(dateObj = new Date()) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const INITIAL_DEMO_CLIENTS = [
  {
    id: 'client-1',
    name: 'الحاج إبراهيم الأعصر',
    notes: 'عميل مميز - تاجر تجزئة وجملة',
    createdAt: getRecentDate(15),
    wallets: [
      {
        id: 'wallet-1-1',
        phoneNumber: '01098765432',
        label: 'محفظة المبيعات المركزية',
        totalLimit: 200000,
        createdAt: getRecentDate(15)
      },
      {
        id: 'wallet-1-2',
        phoneNumber: '01011223344',
        label: 'محفظة فرع المحطة',
        totalLimit: 200000,
        createdAt: getRecentDate(10)
      },
      {
        id: 'wallet-1-3',
        phoneNumber: '01055667788',
        label: 'محفظة كبار العملاء (ليميت مخصص)',
        totalLimit: 250000,
        createdAt: getRecentDate(5)
      }
    ]
  },
  {
    id: 'client-2',
    name: 'شركة الأمل للتوزيع والتجارة',
    notes: 'حساب توريدات يومية',
    createdAt: getRecentDate(20),
    wallets: [
      {
        id: 'wallet-2-1',
        phoneNumber: '01023456789',
        label: 'محفظة إدارة الحسابات',
        totalLimit: 200000,
        createdAt: getRecentDate(20)
      },
      {
        id: 'wallet-2-2',
        phoneNumber: '01034567890',
        label: 'محفظة المشتريات الخارجية',
        totalLimit: 150000,
        createdAt: getRecentDate(12)
      }
    ]
  },
  {
    id: 'client-3',
    name: 'أحمد محمود الصاوي',
    notes: 'مكتب خدمات شحن ودفع إلكتروني',
    createdAt: getRecentDate(8),
    wallets: [
      {
        id: 'wallet-3-1',
        phoneNumber: '01099887766',
        label: 'محفظة التحويلات الفورية',
        totalLimit: 200000,
        createdAt: getRecentDate(8)
      }
    ]
  }
];

export const INITIAL_SHOP_WALLETS = [
  {
    id: 'wallet-1-1',
    phoneNumber: '01098765432',
    label: 'محفظة المبيعات المركزية (المحل)',
    totalLimit: 200000,
    createdAt: getRecentDate(15)
  },
  {
    id: 'wallet-1-2',
    phoneNumber: '01011223344',
    label: 'محفظة فرع المحطة (المحل)',
    totalLimit: 200000,
    createdAt: getRecentDate(10)
  },
  {
    id: 'wallet-1-3',
    phoneNumber: '01055667788',
    label: 'محفظة كبار العملاء والسيولة (المحل)',
    totalLimit: 200000,
    createdAt: getRecentDate(5)
  },
  {
    id: 'wallet-2-1',
    phoneNumber: '01023456789',
    label: 'محفظة إدارة الحسابات (المحل)',
    totalLimit: 200000,
    createdAt: getRecentDate(20)
  },
  {
    id: 'wallet-2-2',
    phoneNumber: '01034567890',
    label: 'محفظة المشتريات والتوريدات (المحل)',
    totalLimit: 200000,
    createdAt: getRecentDate(12)
  },
  {
    id: 'wallet-3-1',
    phoneNumber: '01099887766',
    label: 'محفظة التحويلات الفورية (المحل)',
    totalLimit: 200000,
    createdAt: getRecentDate(8)
  }
];

export const INITIAL_DEMO_TRANSACTIONS = [
  // Today's transactions
  {
    id: 'tx-101',
    walletId: 'wallet-1-1',
    walletPhone: '01098765432',
    walletLabel: 'محفظة المبيعات المركزية',
    customerId: 'client-1',
    customerName: 'الحاج إبراهيم الأعصر',
    type: 'transfer_out',
    amount: 3500,
    recipientPhone: '01012344321',
    transactionCode: 'VF-982341',
    fee: 10,
    notes: 'تحويل دفعة بضاعة لمورد الأغذية',
    date: getRecentDate(0, 9, 15),
    dateOnly: getLocalDateOnly()
  },
  {
    id: 'tx-102',
    walletId: 'wallet-1-1',
    walletPhone: '01098765432',
    walletLabel: 'محفظة المبيعات المركزية',
    customerId: 'client-1',
    customerName: 'الحاج إبراهيم الأعصر',
    type: 'transfer_out',
    amount: 8000,
    recipientPhone: '01088776655',
    transactionCode: 'VF-982389',
    fee: 20,
    notes: 'سداد فاتورة توريدات أجهزة',
    date: getRecentDate(0, 11, 40),
    dateOnly: getLocalDateOnly()
  },
  {
    id: 'tx-103',
    walletId: 'wallet-1-2',
    walletPhone: '01011223344',
    walletLabel: 'محفظة فرع المحطة',
    customerId: 'client-1',
    customerName: 'الحاج إبراهيم الأعصر',
    type: 'transfer_out',
    amount: 1500,
    recipientPhone: '01066554433',
    transactionCode: 'VF-982410',
    fee: 10,
    notes: 'حوالة سريعة للفرع',
    date: getRecentDate(0, 13, 20),
    dateOnly: getLocalDateOnly()
  },
  {
    id: 'tx-104',
    walletId: 'wallet-2-1',
    walletPhone: '01023456789',
    walletLabel: 'محفظة إدارة الحسابات',
    customerId: 'client-2',
    customerName: 'شركة الأمل للتوزيع والتجارة',
    type: 'transfer_out',
    amount: 12000,
    recipientPhone: '01044332211',
    transactionCode: 'VF-982512',
    fee: 30,
    notes: 'دفعة مستحقات شحن',
    date: getRecentDate(0, 14, 55),
    dateOnly: getLocalDateOnly()
  },
  {
    id: 'tx-105',
    walletId: 'wallet-3-1',
    walletPhone: '01099887766',
    walletLabel: 'محفظة التحويلات الفورية',
    customerId: 'client-3',
    customerName: 'أحمد محمود الصاوي',
    type: 'transfer_out',
    amount: 5000,
    recipientPhone: '01022114455',
    transactionCode: 'VF-982633',
    fee: 15,
    notes: 'تحويل لتاجر جملة',
    date: getRecentDate(0, 16, 10),
    dateOnly: getLocalDateOnly()
  },
  // Yesterday's transactions
  {
    id: 'tx-106',
    walletId: 'wallet-1-1',
    walletPhone: '01098765432',
    walletLabel: 'محفظة المبيعات المركزية',
    customerId: 'client-1',
    customerName: 'الحاج إبراهيم الأعصر',
    type: 'transfer_out',
    amount: 9000,
    recipientPhone: '01077665544',
    transactionCode: 'VF-981105',
    fee: 20,
    notes: 'تحويل بنكي / كاش لمورد',
    date: getRecentDate(1, 10, 30),
    dateOnly: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return getLocalDateOnly(d);
    })()
  },
  {
    id: 'tx-107',
    walletId: 'wallet-2-2',
    walletPhone: '01034567890',
    walletLabel: 'محفظة المشتريات الخارجية',
    customerId: 'client-2',
    customerName: 'شركة الأمل للتوزيع والتجارة',
    type: 'transfer_out',
    amount: 4500,
    recipientPhone: '01033221199',
    transactionCode: 'VF-981240',
    fee: 10,
    notes: 'مشتريات مستلزمات مكتبية',
    date: getRecentDate(1, 15, 20),
    dateOnly: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return getLocalDateOnly(d);
    })()
  }
];

/**
 * Demo inventory tailored for a mobile shop with main + sub images & color palettes
 */
export const INITIAL_DEMO_INVENTORY = [
  {
    id: 'prod-1',
    category: 'phones',
    name: 'Samsung Galaxy A55 5G',
    brand: 'سامسونج (Samsung)',
    storage: '256GB / 8GB RAM',
    costPrice: 16500,
    salePrice: 18200,
    minStockAlert: 5,
    notes: 'ضمان محلي سنة معتمد من الوكيل - شاحن مجاني',
    createdAt: getRecentDate(5),
    images: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80'
    ],
    variants: [
      { color: 'أزرق ثلجي', hex: '#38bdf8', quantity: 3 },
      { color: 'أسود كحلي', hex: '#0f172a', quantity: 4 },
      { color: 'أصفر ليموني', hex: '#facc15', quantity: 3 }
    ],
    totalQuantity: 10
  },
  {
    id: 'prod-2',
    category: 'phones',
    name: 'Apple iPhone 15',
    brand: 'آبل (Apple)',
    storage: '128GB',
    costPrice: 35000,
    salePrice: 37400,
    minStockAlert: 5,
    notes: 'نسخة دولية أصلية جديدة متبرشمة بضمان آبل',
    createdAt: getRecentDate(4),
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80'
    ],
    variants: [
      { color: 'أزرق سماوي', hex: '#60a5fa', quantity: 2 },
      { color: 'أسود فحمي', hex: '#18181b', quantity: 1 },
      { color: 'وردي هادئ', hex: '#f472b6', quantity: 1 }
    ],
    totalQuantity: 4 // < 5 (Triggers Low Stock Alert)
  },
  {
    id: 'prod-3',
    category: 'phones',
    name: 'Xiaomi Redmi Note 13 4G',
    brand: 'شاومي (Xiaomi)',
    storage: '128GB / 6GB RAM',
    costPrice: 7400,
    salePrice: 8200,
    minStockAlert: 5,
    notes: 'الأكثر مبيعاً - شاشة AMOLED 120Hz',
    createdAt: getRecentDate(8),
    images: [
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80'
    ],
    variants: [
      { color: 'أسود كلاسيك', hex: '#1e293b', quantity: 5 },
      { color: 'أزرق ثلجي', hex: '#0284c7', quantity: 4 },
      { color: 'أخضر نعناعي', hex: '#10b981', quantity: 3 }
    ],
    totalQuantity: 12
  },
  {
    id: 'prod-4',
    category: 'phones',
    name: 'Realme C67 4G',
    brand: 'ريلمي (Realme)',
    storage: '256GB / 8GB RAM',
    costPrice: 7100,
    salePrice: 7900,
    minStockAlert: 5,
    notes: 'كاميرا 108 ميجابكسل وشحن سريع 33W',
    createdAt: getRecentDate(3),
    images: [
      'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=600&auto=format&fit=crop&q=80'
    ],
    variants: [
      { color: 'أخضر واحة', hex: '#15803d', quantity: 1 },
      { color: 'أسود صخري', hex: '#1e293b', quantity: 1 }
    ],
    totalQuantity: 2 // < 5 (Triggers Low Stock Alert)
  },
  {
    id: 'prod-5',
    category: 'accessories',
    name: 'شاحن سامسونج سريع 25W Type-C أصلي',
    brand: 'سامسونج (Samsung)',
    storage: 'Super Fast Charging',
    costPrice: 380,
    salePrice: 550,
    minStockAlert: 5,
    notes: 'رأس شاحن أصلي معتمد يدعم شحن فائق السرعة',
    createdAt: getRecentDate(12),
    images: [
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=600&auto=format&fit=crop&q=80'
    ],
    variants: [
      { color: 'أبيض ناصع', hex: '#ffffff', quantity: 8 },
      { color: 'أسود ملكي', hex: '#0f172a', quantity: 7 }
    ],
    totalQuantity: 15
  },
  {
    id: 'prod-6',
    category: 'accessories',
    name: 'سماعة Anker Soundcore R50i TWS الأصلية',
    brand: 'أنكر (Anker)',
    storage: 'بلوتوث 5.3',
    costPrice: 750,
    salePrice: 990,
    minStockAlert: 5,
    notes: 'صوت بيز قوي وبطارية 30 ساعة مع العلبة',
    createdAt: getRecentDate(10),
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&auto=format&fit=crop&q=80'
    ],
    variants: [
      { color: 'أسود مطفي', hex: '#18181b', quantity: 2 },
      { color: 'أبيض عاجي', hex: '#f8fafc', quantity: 1 },
      { color: 'كحلي داكن', hex: '#1e3a8a', quantity: 1 }
    ],
    totalQuantity: 4 // < 5 (Triggers Low Stock Alert)
  },
  {
    id: 'prod-7',
    category: 'accessories',
    name: 'باور بانك Joyroom 10,000mAh شحن سريع 22.5W',
    brand: 'جويروم (Joyroom)',
    storage: '10,000 mAh',
    costPrice: 620,
    salePrice: 850,
    minStockAlert: 5,
    notes: 'شاشة ديجيتال لعرض نسبة الشحن وكابل مدمج',
    createdAt: getRecentDate(6),
    images: [
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80'
    ],
    variants: [
      { color: 'أسود كربوني', hex: '#18181b', quantity: 1 }
    ],
    totalQuantity: 1 // < 5 (Critical Low Stock Alert)
  },
  {
    id: 'prod-8',
    category: 'accessories',
    name: 'اسكرينات حماية سيراميك / زجاج 11D لجميع الهواتف',
    brand: 'عام (Universal)',
    storage: 'صلابة 9H ضد الكسر',
    costPrice: 20,
    salePrice: 50,
    minStockAlert: 10,
    notes: 'مجموعة شاملة لكافة أجهزة آيفون وسامسونج وشاومي',
    createdAt: getRecentDate(14),
    images: [
      'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600&auto=format&fit=crop&q=80'
    ],
    variants: [
      { color: 'شفاف عالي النقاء', hex: '#e2e8f0', quantity: 30 },
      { color: 'خصوصية (ضد التجسس)', hex: '#334155', quantity: 18 }
    ],
    totalQuantity: 48
  }
];

export const storage = {
  getClients() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_DEMO_CLIENTS));
        return INITIAL_DEMO_CLIENTS;
      }
      const parsed = JSON.parse(data);
      // Migrate legacy 60,000 limits to new 200,000 default limit
      let migrated = false;
      const updated = parsed.map(c => ({
        ...c,
        wallets: (c.wallets || []).map(w => {
          if (!w.totalLimit || w.totalLimit === 60000) {
            migrated = true;
            return { ...w, totalLimit: 200000 };
          }
          return w;
        })
      }));
      if (migrated) {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(updated));
      }
      return updated;
    } catch (e) {
      console.error('Error reading clients from storage:', e);
      return INITIAL_DEMO_CLIENTS;
    }
  },

  saveClients(clients) {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
    } catch (e) {
      console.error('Error saving clients:', e);
    }
  },

  getTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_DEMO_TRANSACTIONS));
        return INITIAL_DEMO_TRANSACTIONS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading transactions from storage:', e);
      return INITIAL_DEMO_TRANSACTIONS;
    }
  },

  saveTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error saving transactions:', e);
    }
  },

  getInventory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_DEMO_INVENTORY));
        return INITIAL_DEMO_INVENTORY;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading inventory from storage:', e);
      return INITIAL_DEMO_INVENTORY;
    }
  },

  saveInventory(inventory) {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
    } catch (e) {
      console.error('Error saving inventory:', e);
    }
  },

  getShopWallets() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHOP_WALLETS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.SHOP_WALLETS, JSON.stringify(INITIAL_SHOP_WALLETS));
        return INITIAL_SHOP_WALLETS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading shop wallets from storage:', e);
      return INITIAL_SHOP_WALLETS;
    }
  },

  saveShopWallets(wallets) {
    try {
      localStorage.setItem(STORAGE_KEYS.SHOP_WALLETS, JSON.stringify(wallets));
    } catch (e) {
      console.error('Error saving shop wallets:', e);
    }
  },

  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  },

  saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getTrash() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRASH);
      if (!data) return { wallets: [], clients: [], products: [] };
      const parsed = JSON.parse(data);
      return {
        wallets: Array.isArray(parsed.wallets) ? parsed.wallets : [],
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
        products: Array.isArray(parsed.products) ? parsed.products : []
      };
    } catch (e) {
      console.error('Error reading trash from storage:', e);
      return { wallets: [], clients: [], products: [] };
    }
  },

  saveTrash(trash) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(trash));
    } catch (e) {
      console.error('Error saving trash:', e);
    }
  },

  exportFullBackup(clients, transactions, inventory, trash, shopWallets) {
    const backup = {
      version: '3.4',
      system: 'Elaasar Cash & Mobile Shop Management System',
      exportDate: new Date().toISOString(),
      clients,
      transactions,
      inventory: inventory || [],
      trash: trash || { wallets: [], clients: [], products: [] },
      shopWallets: shopWallets || []
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elaasar-cash-inventory-backup-${getLocalDateOnly()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  resetToDemo() {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(INITIAL_DEMO_CLIENTS));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_DEMO_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_DEMO_INVENTORY));
    localStorage.setItem(STORAGE_KEYS.SHOP_WALLETS, JSON.stringify(INITIAL_SHOP_WALLETS));
    localStorage.removeItem(STORAGE_KEYS.TRASH);
    return {
      clients: INITIAL_DEMO_CLIENTS,
      transactions: INITIAL_DEMO_TRANSACTIONS,
      inventory: INITIAL_DEMO_INVENTORY,
      shopWallets: INITIAL_SHOP_WALLETS,
      trash: { wallets: [], clients: [], products: [] }
    };
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.CLIENTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY);
    localStorage.removeItem(STORAGE_KEYS.SHOP_WALLETS);
    localStorage.removeItem(STORAGE_KEYS.TRASH);
    return {
      clients: [],
      transactions: [],
      inventory: [],
      shopWallets: [],
      trash: { wallets: [], clients: [], products: [] }
    };
  }
};
