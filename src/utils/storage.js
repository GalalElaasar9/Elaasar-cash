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
  CLIENT_ARCHIVES: 'elaasar_cash_client_archives_v1',
  DISMISSED_ARCHIVE_IDS: 'elaasar_cash_dismissed_archive_ids_v1',
};

// Generates today's date string and some earlier timestamps
function getRecentDate(daysAgo = 0, hours = 10, minutes = 30) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  // Ensure that demo data for today never has future timestamps
  if (daysAgo === 0 && d.getTime() > Date.now()) {
    d.setTime(Date.now() - (Math.max(1, 24 - hours) * 120000));
  }
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
    clientType: 'مدين',
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
    clientType: 'عادي',
    notes: 'حساب توريدات يومية (خالص مسدد)',
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
    clientType: 'دائن',
    excessCredit: 1200,
    excessCreditDate: getRecentDate(1, 14, 0),
    notes: 'مكتب خدمات شحن - سدد بزيادة وله رصيد دائن 1,200 ج.م',
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
  },
  {
    id: 'client-4',
    name: 'م / طارق عبد الرحمن (مركز اتصالات)',
    clientType: 'مدين',
    notes: 'مركز اتصالات - مديونية شحن نشطة',
    createdAt: getRecentDate(12),
    wallets: [
      {
        id: 'wallet-4-1',
        phoneNumber: '01066778899',
        label: 'محفظة السنترال الرئيسية',
        totalLimit: 200000,
        createdAt: getRecentDate(12)
      }
    ]
  },
  {
    id: 'client-5',
    name: 'كابتن حسام حسن',
    clientType: 'مدين',
    notes: 'عميل آجل - سدد دفعة جزئية (4,000 ج.م) ومتبقي 3,000 ج.م',
    createdAt: getRecentDate(7),
    wallets: [
      {
        id: 'wallet-5-1',
        phoneNumber: '01033445566',
        label: 'محفظة العمليات الشخصية',
        totalLimit: 200000,
        createdAt: getRecentDate(7)
      }
    ]
  },
  {
    id: 'client-6',
    name: 'سنتر النور للخدمات المتكاملة',
    clientType: 'عادي',
    notes: 'حساب خدمات سريعة - حساب مسدد خالص',
    createdAt: getRecentDate(14),
    wallets: [
      {
        id: 'wallet-6-1',
        phoneNumber: '01077889900',
        label: 'محفظة الكاش المباشر',
        totalLimit: 200000,
        createdAt: getRecentDate(14)
      }
    ]
  },
  {
    id: 'client-7',
    name: 'مؤسسة البركة للتجارة والتوريدات',
    clientType: 'عادي',
    notes: 'شركة توريدات كبرى - لديها سجل تسويات وأرشيف مكثف',
    createdAt: getRecentDate(30),
    wallets: [
      {
        id: 'wallet-7-1',
        phoneNumber: '01012345670',
        label: 'محفظة التحويلات البنكية',
        totalLimit: 300000,
        createdAt: getRecentDate(30)
      },
      {
        id: 'wallet-7-2',
        phoneNumber: '01012345671',
        label: 'محفظة التوريد الميداني',
        totalLimit: 200000,
        createdAt: getRecentDate(25)
      }
    ]
  },
  {
    id: 'client-8',
    name: 'سوبر ماركت الفيروز',
    clientType: 'دائن',
    excessCredit: 750,
    excessCreditDate: getRecentDate(2, 11, 0),
    notes: 'حساب توريد كاش - له رصيد دائن 750 ج.م',
    createdAt: getRecentDate(18),
    wallets: [
      {
        id: 'wallet-8-1',
        phoneNumber: '01044556677',
        label: 'محفظة الكاشير',
        totalLimit: 200000,
        createdAt: getRecentDate(18)
      }
    ]
  },
  {
    id: 'client-9',
    name: 'معرض الإيمان للأجهزة الكهربائية',
    clientType: 'مدين',
    notes: 'معرض أجهزة - عليه مديونية 6,800 ج.م',
    createdAt: getRecentDate(10),
    wallets: [
      {
        id: 'wallet-9-1',
        phoneNumber: '01088990011',
        label: 'محفظة مبيعات المعرض',
        totalLimit: 200000,
        createdAt: getRecentDate(10)
      }
    ]
  },
  {
    id: 'client-10',
    name: 'الأستاذ ياسر جلال',
    clientType: 'عادي',
    notes: 'حساب شخصي عادي خالص',
    createdAt: getRecentDate(16),
    wallets: [
      {
        id: 'wallet-10-1',
        phoneNumber: '01022334455',
        label: 'محفظة شخصية',
        totalLimit: 200000,
        createdAt: getRecentDate(16)
      }
    ]
  },
  {
    id: 'client-11',
    name: 'محطة القدس للخدمات البترولية',
    clientType: 'مدين',
    notes: 'محطة وقود وخدمات - مديونية شحن 2,200 ج.م',
    createdAt: getRecentDate(9),
    wallets: [
      {
        id: 'wallet-11-1',
        phoneNumber: '01055443322',
        label: 'محفظة إدارة المحطة',
        totalLimit: 200000,
        createdAt: getRecentDate(9)
      }
    ]
  },
  {
    id: 'client-12',
    name: 'شركة الفتح للشحن السريع',
    clientType: 'عادي',
    notes: 'شركة شحن لوجستي - حساب خالص مسدد',
    createdAt: getRecentDate(22),
    wallets: [
      {
        id: 'wallet-12-1',
        phoneNumber: '01099112233',
        label: 'محفظة المناديب الرئيسية',
        totalLimit: 250000,
        createdAt: getRecentDate(22)
      }
    ]
  },
  {
    id: 'client-13',
    name: 'صيدلية الدكتور وليد الشناوي',
    clientType: 'دائن',
    excessCredit: 500,
    excessCreditDate: getRecentDate(3, 16, 0),
    notes: 'صيدلية الشناوي - له رصيد دائن 500 ج.م',
    createdAt: getRecentDate(11),
    wallets: [
      {
        id: 'wallet-13-1',
        phoneNumber: '01011335577',
        label: 'محفظة حسابات الصيدلية',
        totalLimit: 200000,
        createdAt: getRecentDate(11)
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
  // Today's active recharges for debtors
  {
    id: 'tx-rc-101',
    walletId: 'wallet-1-1',
    walletPhone: '01098765432',
    walletLabel: 'محفظة المبيعات المركزية',
    customerId: 'client-1',
    customerName: 'الحاج إبراهيم الأعصر',
    type: 'recharge',
    amount: 5000,
    fee: 10,
    notes: 'شحن رصيد نقدي لحساب المحفظة',
    date: getRecentDate(0, 9, 15),
    dateOnly: getLocalDateOnly()
  },
  {
    id: 'tx-rc-102',
    walletId: 'wallet-1-2',
    walletPhone: '01011223344',
    walletLabel: 'محفظة فرع المحطة',
    customerId: 'client-1',
    customerName: 'الحاج إبراهيم الأعصر',
    type: 'recharge',
    amount: 3500,
    fee: 10,
    notes: 'شحن رصيد للفرع',
    date: getRecentDate(0, 11, 40),
    dateOnly: getLocalDateOnly()
  },
  {
    id: 'tx-rc-103',
    walletId: 'wallet-4-1',
    walletPhone: '01066778899',
    walletLabel: 'محفظة السنترال الرئيسية',
    customerId: 'client-4',
    customerName: 'م / طارق عبد الرحمن (مركز اتصالات)',
    type: 'recharge',
    amount: 4500,
    fee: 15,
    notes: 'شحن رصيد للسنترال',
    date: getRecentDate(0, 10, 20),
    dateOnly: getLocalDateOnly()
  },
  {
    id: 'tx-rc-104',
    walletId: 'wallet-5-1',
    walletPhone: '01033445566',
    walletLabel: 'محفظة العمليات الشخصية',
    customerId: 'client-5',
    customerName: 'كابتن حسام حسن',
    type: 'recharge',
    amount: 7000,
    fee: 20,
    notes: 'شحن رصيد على الحساب الآجل',
    date: getRecentDate(0, 8, 30),
    dateOnly: getLocalDateOnly()
  },
  {
    id: 'tx-pay-105',
    walletId: 'wallet-5-1',
    walletPhone: '01033445566',
    walletLabel: 'محفظة العمليات الشخصية',
    clientId: 'client-5',
    customerId: 'client-5',
    customerName: 'كابتن حسام حسن',
    type: 'client_payment',
    amount: 4000,
    paymentMethod: 'vodafone_cash',
    fee: 0,
    notes: 'سداد دفعة جزئية (4,000 ج.م) من إجمالي 7,000 ج.م',
    date: getRecentDate(0, 13, 15),
    dateOnly: getLocalDateOnly()
  },
  {
    id: 'tx-rc-106',
    walletId: 'wallet-9-1',
    walletPhone: '01088990011',
    walletLabel: 'محفظة مبيعات المعرض',
    customerId: 'client-9',
    customerName: 'معرض الإيمان للأجهزة الكهربائية',
    type: 'recharge',
    amount: 6800,
    fee: 20,
    notes: 'شحن رصيد أجهزة وتوريد',
    date: getRecentDate(0, 12, 45),
    dateOnly: getLocalDateOnly()
  },
  {
    id: 'tx-rc-107',
    walletId: 'wallet-11-1',
    walletPhone: '01055443322',
    walletLabel: 'محفظة إدارة المحطة',
    customerId: 'client-11',
    customerName: 'محطة القدس للخدمات البترولية',
    type: 'recharge',
    amount: 2200,
    fee: 10,
    notes: 'شحن رصيد فوري للمحطة',
    date: getRecentDate(0, 14, 10),
    dateOnly: getLocalDateOnly()
  },
  // Yesterday's transactions
  {
    id: 'tx-108',
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
    id: 'tx-109',
    walletId: 'wallet-2-1',
    walletPhone: '01023456789',
    walletLabel: 'محفظة إدارة الحسابات',
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

export const INITIAL_DEMO_ARCHIVES = [
  // 1. مؤسسة البركة للتجارة والتوريدات (12 تسوية لاختبار Pagination داخل المودال التفصيلي)
  {
    id: 'arch-baraka-1',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(1, 14, 30),
    time: '02:30 م',
    debtBefore: 28000,
    amountPaid: 28000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'bank',
    notes: 'سداد تحويل بنكي لكامل دفعة توريدات الأسبوع'
  },
  {
    id: 'arch-baraka-2',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(2, 11, 15),
    time: '11:15 ص',
    debtBefore: 35000,
    amountPaid: 35000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'instapay',
    notes: 'تسوية شحنات المحفظة المركزية بالكامل'
  },
  {
    id: 'arch-baraka-3',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية مع فائض (تحول لدائن)',
    date: getRecentDate(3, 16, 45),
    time: '04:45 م',
    debtBefore: 20000,
    amountPaid: 22000,
    excessAmount: 2000,
    finalBalance: 2000,
    resultingType: 'دائن',
    paymentMethod: 'bank',
    notes: 'سداد بزيادة تحويل بنكي لترحيل رصيد دائن'
  },
  {
    id: 'arch-baraka-4',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'صرف مستحقات دائن كاملة',
    date: getRecentDate(4, 13, 20),
    time: '01:20 م',
    creditBefore: 2000,
    amountPaid: 2000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'cash',
    notes: 'صرف الرصيد الدائن المستحق كاش وتصفير الحساب'
  },
  {
    id: 'arch-baraka-5',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(5, 10, 0),
    time: '10:00 ص',
    debtBefore: 18500,
    amountPaid: 18500,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'vodafone_cash',
    notes: 'تسوية مبيعات فودافون كاش'
  },
  {
    id: 'arch-baraka-6',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(6, 17, 30),
    time: '05:30 م',
    debtBefore: 42000,
    amountPaid: 42000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'bank',
    notes: 'سداد فاتورة التوريد الكبرى'
  },
  {
    id: 'arch-baraka-7',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(7, 12, 10),
    time: '12:10 م',
    debtBefore: 15000,
    amountPaid: 15000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'instapay',
    notes: 'سداد إنستاباي فوري'
  },
  {
    id: 'arch-baraka-8',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(8, 15, 40),
    time: '03:40 م',
    debtBefore: 26000,
    amountPaid: 26000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'bank',
    notes: 'تسوية حساب توريد محطات'
  },
  {
    id: 'arch-baraka-9',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(9, 9, 30),
    time: '09:30 ص',
    debtBefore: 31000,
    amountPaid: 31000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'vodafone_cash',
    notes: 'سداد دفعات كاش'
  },
  {
    id: 'arch-baraka-10',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(10, 18, 15),
    time: '06:15 م',
    debtBefore: 24500,
    amountPaid: 24500,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'instapay',
    notes: 'تسوية مسائية عبر إنستاباي'
  },
  {
    id: 'arch-baraka-11',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(11, 11, 45),
    time: '11:45 ص',
    debtBefore: 19000,
    amountPaid: 19000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'cash',
    notes: 'سداد نقدي مباشر بالفرع'
  },
  {
    id: 'arch-baraka-12',
    clientId: 'client-7',
    clientName: 'مؤسسة البركة للتجارة والتوريدات',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(12, 14, 0),
    time: '02:00 م',
    debtBefore: 27500,
    amountPaid: 27500,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'bank',
    notes: 'سداد بنكي لإغلاق دورة سابقة'
  },

  // 2. الحاج إبراهيم الأعصر (شحنات وتسويات سابقة)
  {
    id: 'arch-ibrahim-rc-1',
    clientId: 'client-1',
    clientName: 'الحاج إبراهيم الأعصر',
    cycleType: 'شحن رصيد للخط',
    operationCategory: 'recharge',
    date: getRecentDate(2, 9, 15),
    time: '09:15 ص',
    rechargeAmount: 15000,
    amountPaid: 0,
    debtBefore: 0,
    excessAmount: 0,
    finalBalance: 15000,
    resultingType: 'مدين',
    paymentMethod: 'recharge',
    walletPhone: '01098765432',
    walletLabel: 'فودافون كاش - الخط الرئيسي',
    notes: 'شحن رصيد للخط الرئيسي 01098765432'
  },
  {
    id: 'arch-ibrahim-1',
    clientId: 'client-1',
    clientName: 'الحاج إبراهيم الأعصر',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(2, 10, 30),
    time: '10:30 ص',
    debtBefore: 15000,
    amountPaid: 15000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'vodafone_cash',
    notes: 'سداد مديونية كاش بالكامل وتصفير الدورة السابقة'
  },
  {
    id: 'arch-ibrahim-rc-2',
    clientId: 'client-1',
    clientName: 'الحاج إبراهيم الأعصر',
    cycleType: 'شحن رصيد للخط',
    operationCategory: 'recharge',
    date: getRecentDate(5, 14, 0),
    time: '02:00 م',
    rechargeAmount: 8500,
    amountPaid: 0,
    debtBefore: 0,
    excessAmount: 0,
    finalBalance: 8500,
    resultingType: 'مدين',
    paymentMethod: 'recharge',
    walletPhone: '01011223344',
    walletLabel: 'فودافون كاش - خط المعاملات',
    notes: 'شحن رصيد لخط المعاملات 01011223344'
  },
  {
    id: 'arch-ibrahim-2',
    clientId: 'client-1',
    clientName: 'الحاج إبراهيم الأعصر',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(5, 15, 45),
    time: '03:45 م',
    debtBefore: 8500,
    amountPaid: 8500,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'cash',
    notes: 'سداد نقدي في المحل'
  },

  // 3. شركة الأمل للتوزيع والتجارة (شحنات وتسويات)
  {
    id: 'arch-amal-rc-1',
    clientId: 'client-2',
    clientName: 'شركة الأمل للتوزيع والتجارة',
    cycleType: 'شحن رصيد للخط',
    operationCategory: 'recharge',
    date: getRecentDate(1, 11, 30),
    time: '11:30 ص',
    rechargeAmount: 12000,
    amountPaid: 0,
    debtBefore: 0,
    excessAmount: 0,
    finalBalance: 12000,
    resultingType: 'مدين',
    paymentMethod: 'recharge',
    walletPhone: '01023456789',
    walletLabel: 'محفظة التوزيع 1',
    notes: 'شحن رصيد تجاري لخط التوزيع 01023456789'
  },
  {
    id: 'arch-amal-1',
    clientId: 'client-2',
    clientName: 'شركة الأمل للتوزيع والتجارة',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(1, 14, 15),
    time: '02:15 م',
    debtBefore: 12000,
    amountPaid: 12000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'instapay',
    notes: 'تسوية شحنات الأمس بالكامل وتحويل الحساب لعادي خالص'
  },
  {
    id: 'arch-amal-rc-2',
    clientId: 'client-2',
    clientName: 'شركة الأمل للتوزيع والتجارة',
    cycleType: 'شحن رصيد للخط',
    operationCategory: 'recharge',
    date: getRecentDate(4, 9, 0),
    time: '09:00 ص',
    rechargeAmount: 6000,
    amountPaid: 0,
    debtBefore: 0,
    excessAmount: 0,
    finalBalance: 6000,
    resultingType: 'مدين',
    paymentMethod: 'recharge',
    walletPhone: '01034567890',
    walletLabel: 'محفظة التوزيع 2',
    notes: 'شحن رصيد لمحفظة التوزيع 2'
  },
  {
    id: 'arch-amal-2',
    clientId: 'client-2',
    clientName: 'شركة الأمل للتوزيع والتجارة',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(4, 11, 20),
    time: '11:20 ص',
    debtBefore: 6000,
    amountPaid: 6000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'bank',
    notes: 'تحويل بنكي مسدد'
  },

  // 4. أحمد محمود الصاوي (سداد بفائض دائن)
  {
    id: 'arch-sawi-1',
    clientId: 'client-3',
    clientName: 'أحمد محمود الصاوي',
    cycleType: 'سداد مديونية مع فائض (تحول لدائن)',
    date: getRecentDate(1, 16, 45),
    time: '04:45 م',
    debtBefore: 7000,
    amountPaid: 8200,
    excessAmount: 1200,
    finalBalance: 1200,
    resultingType: 'دائن',
    paymentMethod: 'vodafone_cash',
    notes: 'سداد مبلغ 8,200 ج.م بزيادة 1,200 ج.م كفائض دائن لصالحه'
  },

  // 5. م / طارق عبد الرحمن (مركز اتصالات)
  {
    id: 'arch-tarek-rc-1',
    clientId: 'client-4',
    clientName: 'م / طارق عبد الرحمن (مركز اتصالات)',
    cycleType: 'شحن رصيد للخط',
    operationCategory: 'recharge',
    date: getRecentDate(3, 9, 30),
    time: '09:30 ص',
    rechargeAmount: 9000,
    amountPaid: 0,
    debtBefore: 0,
    excessAmount: 0,
    finalBalance: 9000,
    resultingType: 'مدين',
    paymentMethod: 'recharge',
    walletPhone: '01056789012',
    walletLabel: 'فودافون كاش - سنترال',
    notes: 'شحن رصيد سنترال الاتصالات'
  },
  {
    id: 'arch-tarek-1',
    clientId: 'client-4',
    clientName: 'م / طارق عبد الرحمن (مركز اتصالات)',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(3, 11, 0),
    time: '11:00 ص',
    debtBefore: 9000,
    amountPaid: 9000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'instapay',
    notes: 'تسوية حساب السنترال بالكامل'
  },

  // 6. كابتن حسام حسن (شحن ثم سداد دفعة جزئية وباقي عليه 3,000 ج.م)
  {
    id: 'arch-hossam-rc-1',
    clientId: 'client-5',
    clientName: 'كابتن حسام حسن',
    cycleType: 'شحن رصيد للخط',
    operationCategory: 'recharge',
    date: getRecentDate(0, 10, 0),
    time: '10:00 ص',
    rechargeAmount: 7000,
    amountPaid: 0,
    debtBefore: 0,
    excessAmount: 0,
    finalBalance: 7000,
    resultingType: 'مدين',
    paymentMethod: 'recharge',
    walletPhone: '01033445566',
    walletLabel: 'محفظة الكابتن الشخصية',
    notes: 'شحن رصيد كاش للكابتن'
  },
  {
    id: 'arch-hossam-1',
    clientId: 'client-5',
    clientName: 'كابتن حسام حسن',
    cycleType: 'سداد دفعة من الحساب',
    date: getRecentDate(0, 13, 15),
    time: '01:15 م',
    debtBefore: 7000,
    amountPaid: 4000,
    excessAmount: 0,
    finalBalance: 3000,
    resultingType: 'مدين',
    paymentMethod: 'vodafone_cash',
    notes: 'سداد دفعة جزئية (4,000 ج.م) من الحساب الآجل ومتبقي عليه 3,000 ج.م'
  },

  // 7. سنتر النور للخدمات المتكاملة
  {
    id: 'arch-nour-1',
    clientId: 'client-6',
    clientName: 'سنتر النور للخدمات المتكاملة',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(2, 15, 30),
    time: '03:30 م',
    debtBefore: 5500,
    amountPaid: 5500,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'cash',
    notes: 'تسوية كاش بالكامل'
  },

  // 8. سوبر ماركت الفيروز (سداد بفائض دائن)
  {
    id: 'arch-fairouz-1',
    clientId: 'client-8',
    clientName: 'سوبر ماركت الفيروز',
    cycleType: 'سداد مديونية مع فائض (تحول لدائن)',
    date: getRecentDate(2, 12, 10),
    time: '12:10 م',
    debtBefore: 3000,
    amountPaid: 3750,
    excessAmount: 750,
    finalBalance: 750,
    resultingType: 'دائن',
    paymentMethod: 'vodafone_cash',
    notes: 'سداد بفائض 750 ج.م كرصيد دائن مستحق'
  },

  // 9. معرض الإيمان للأجهزة الكهربائية
  {
    id: 'arch-eiman-1',
    clientId: 'client-9',
    clientName: 'معرض الإيمان للأجهزة الكهربائية',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(4, 17, 20),
    time: '05:20 م',
    debtBefore: 8000,
    amountPaid: 8000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'bank',
    notes: 'تسوية دورة شحنات سابقة'
  },

  // 10. الأستاذ ياسر جلال
  {
    id: 'arch-yasser-1',
    clientId: 'client-10',
    clientName: 'الأستاذ ياسر جلال',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(3, 10, 0),
    time: '10:00 ص',
    debtBefore: 3200,
    amountPaid: 3200,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'cash',
    notes: 'سداد نقدي فوري وتصفير الحساب'
  },

  // 11. محطة القدس للخدمات البترولية
  {
    id: 'arch-quds-1',
    clientId: 'client-11',
    clientName: 'محطة القدس للخدمات البترولية',
    cycleType: 'سداد مديونية كاملة',
    date: getRecentDate(5, 19, 15),
    time: '07:15 م',
    debtBefore: 4000,
    amountPaid: 4000,
    excessAmount: 0,
    finalBalance: 0,
    resultingType: 'عادي',
    paymentMethod: 'vodafone_cash',
    notes: 'تسوية دورة وقود سابقة'
  },

  // 12. صيدلية الدكتور وليد الشناوي
  {
    id: 'arch-walid-1',
    clientId: 'client-13',
    clientName: 'صيدلية الدكتور وليد الشناوي',
    cycleType: 'سداد مديونية مع فائض (تحول لدائن)',
    date: getRecentDate(3, 9, 40),
    time: '09:40 ص',
    debtBefore: 2500,
    amountPaid: 3000,
    excessAmount: 500,
    finalBalance: 500,
    resultingType: 'دائن',
    paymentMethod: 'instapay',
    notes: 'تحويل إنستاباي مع فائض 500 ج.م'
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

  getClientArchives() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CLIENT_ARCHIVES);
      if (data === null) {
        localStorage.setItem(STORAGE_KEYS.CLIENT_ARCHIVES, JSON.stringify(INITIAL_DEMO_ARCHIVES));
        return INITIAL_DEMO_ARCHIVES;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      console.error('Error reading client archives from storage:', e);
      return [];
    }
  },

  saveClientArchives(archives) {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENT_ARCHIVES, JSON.stringify(archives || []));
    } catch (e) {
      console.error('Error saving client archives:', e);
    }
  },

  getDismissedArchiveIds() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DISMISSED_ARCHIVE_IDS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error reading dismissed archive ids:', e);
      return [];
    }
  },

  saveDismissedArchiveIds(ids) {
    try {
      localStorage.setItem(STORAGE_KEYS.DISMISSED_ARCHIVE_IDS, JSON.stringify(ids || []));
    } catch (e) {
      console.error('Error saving dismissed archive ids:', e);
    }
  },

  exportFullBackup(clients, transactions, inventory, trash, shopWallets, clientArchives = []) {
    const backup = {
      version: '3.4',
      system: 'Elaasar Cash & Mobile Shop Management System',
      exportDate: new Date().toISOString(),
      clients,
      transactions,
      inventory: inventory || [],
      trash: trash || { wallets: [], clients: [], products: [] },
      shopWallets: shopWallets || [],
      clientArchives: clientArchives || []
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
    localStorage.setItem(STORAGE_KEYS.CLIENT_ARCHIVES, JSON.stringify(INITIAL_DEMO_ARCHIVES));
    localStorage.removeItem(STORAGE_KEYS.TRASH);
    localStorage.removeItem(STORAGE_KEYS.DISMISSED_ARCHIVE_IDS);
    return {
      clients: INITIAL_DEMO_CLIENTS,
      transactions: INITIAL_DEMO_TRANSACTIONS,
      inventory: INITIAL_DEMO_INVENTORY,
      shopWallets: INITIAL_SHOP_WALLETS,
      trash: { wallets: [], clients: [], products: [] },
      clientArchives: INITIAL_DEMO_ARCHIVES
    };
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.CLIENTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY);
    localStorage.removeItem(STORAGE_KEYS.SHOP_WALLETS);
    localStorage.removeItem(STORAGE_KEYS.TRASH);
    localStorage.removeItem(STORAGE_KEYS.CLIENT_ARCHIVES);
    localStorage.removeItem(STORAGE_KEYS.DISMISSED_ARCHIVE_IDS);
    return {
      clients: [],
      transactions: [],
      inventory: [],
      shopWallets: [],
      trash: { wallets: [], clients: [], products: [] },
      clientArchives: []
    };
  }
};
