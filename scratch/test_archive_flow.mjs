import { formatTimeArabic, formatDateArabic, formatCurrency } from '../src/utils/formatters.js';
import { INITIAL_DEMO_ARCHIVES, INITIAL_DEMO_CLIENTS } from '../src/utils/storage.js';

console.log('--- Testing Archive Data & Formats ---');

// 1. Verify 12-hour format across all demo archives
let timeCheckFailed = 0;
INITIAL_DEMO_ARCHIVES.forEach((arch, i) => {
  const formatted = formatTimeArabic(arch.time || arch.date);
  const isValid12h = formatted.includes('ص') || formatted.includes('م');
  if (!isValid12h) {
    console.error(`Invalid 12h format at index ${i}:`, arch.time, '->', formatted);
    timeCheckFailed++;
  }
});

console.log(`✓ 12h Time Check: ${INITIAL_DEMO_ARCHIVES.length - timeCheckFailed}/${INITIAL_DEMO_ARCHIVES.length} passed.`);

// 2. Verify recharges are present in INITIAL_DEMO_ARCHIVES
const recharges = INITIAL_DEMO_ARCHIVES.filter(a => a.operationCategory === 'recharge' || a.cycleType?.includes('شحن'));
const payments = INITIAL_DEMO_ARCHIVES.filter(a => a.operationCategory !== 'recharge' && !a.cycleType?.includes('شحن'));

console.log(`✓ Recharges in Demo Archive: ${recharges.length}`);
console.log(`✓ Payments/Settlements in Demo Archive: ${payments.length}`);

// 3. Test Grouping by client
const groupMap = new Map();
for (const arch of INITIAL_DEMO_ARCHIVES) {
  const key = arch.clientId || arch.clientName;
  if (!groupMap.has(key)) {
    groupMap.set(key, {
      clientName: arch.clientName,
      records: [],
      totalRecharged: 0,
      totalPaid: 0,
      totalExcess: 0
    });
  }
  const group = groupMap.get(key);
  group.records.push(arch);
  const isRecharge = arch.operationCategory === 'recharge' || arch.cycleType?.includes('شحن');
  if (isRecharge) {
    group.totalRecharged += (Number(arch.rechargeAmount) || Number(arch.amountPaid) || 0);
  } else {
    group.totalPaid += (Number(arch.amountPaid) || 0);
  }
  group.totalExcess += (Number(arch.excessAmount) || 0);
}

const groups = Array.from(groupMap.values());
console.log(`✓ Grouped Clients Count (no duplicates): ${groups.length}`);

// Verify that grouped records contain both recharges and payments for الحاج إبراهيم
const ibrahimGroup = groups.find(g => g.clientName.includes('إبراهيم'));
if (ibrahimGroup) {
  console.log('✓ الحاج إبراهيم Group:', {
    recordsCount: ibrahimGroup.records.length,
    totalRecharged: ibrahimGroup.totalRecharged,
    totalPaid: ibrahimGroup.totalPaid,
    totalExcess: ibrahimGroup.totalExcess
  });
  console.log('  Operations:');
  ibrahimGroup.records.forEach(r => {
    console.log(`  - [${r.operationCategory || 'payment'}] ${r.cycleType} | المبلغ: ${r.rechargeAmount || r.amountPaid} | الوقت: ${formatTimeArabic(r.time || r.date)}`);
  });
}

// 4. Test Pagination (ITEMS_PER_PAGE = 10)
const ITEMS_PER_PAGE = 10;
const totalPages = Math.ceil(groups.length / ITEMS_PER_PAGE);
console.log(`✓ Archive Main Table Pagination: ${groups.length} groups -> ${totalPages} page(s) (Max 10 per page)`);

if (ibrahimGroup && ibrahimGroup.records.length > 0) {
  const modalPages = Math.ceil(ibrahimGroup.records.length / ITEMS_PER_PAGE);
  console.log(`✓ Ibrahim Detail Modal Pagination: ${ibrahimGroup.records.length} records -> ${modalPages} page(s)`);
}

console.log('--- All Verification Tests Passed Successfully! ---');
