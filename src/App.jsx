import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CashProvider, useCash } from './context/CashContext';
import Navbar from './components/Navbar';
import StatCards from './components/StatCards';
import ClientCard from './components/ClientCard';
import DailyLogView from './components/DailyLogView';
import LimitMatrixView from './components/LimitMatrixView';
import InboundCalculatorView from './components/InboundCalculatorView';
import InventoryView from './components/InventoryView';
import ReportsView from './components/ReportsView';
import TrashView from './components/TrashView';
import Toast from './components/Toast';

// Modals
import NewTransferModal from './components/NewTransferModal';
import AddClientModal from './components/AddClientModal';
import AddWalletModal from './components/AddWalletModal';
import EditLimitModal from './components/EditLimitModal';
import ReceiptModal from './components/ReceiptModal';
import BackupModal from './components/BackupModal';
import ConfirmModal from './components/ConfirmModal';
import AddProductModal from './components/AddProductModal';
import SellProductModal from './components/SellProductModal';
import RestockModal from './components/RestockModal';
import ProductDetailsModal from './components/ProductDetailsModal';
import CloudSyncModal from './components/CloudSyncModal';
import RechargeWalletModal from './components/RechargeWalletModal';

import { UserPlus, Send, Search, Users, AlertCircle, Sparkles } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState('clients'); // 'clients', 'daily', 'inventory', 'matrix', 'inbound', 'reports'
  const [searchQuery, setSearchQuery] = useState('');

  const { clients, setActiveModal } = useCash();

  // Filter clients based on search query
  const filteredClients = clients.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchName = c.name?.toLowerCase().includes(q);
    const matchNotes = c.notes?.toLowerCase().includes(q);
    const matchPhone = (c.wallets || []).some(w => w.phoneNumber?.includes(q) || w.label?.toLowerCase().includes(q));
    return matchName || matchNotes || matchPhone;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 relative selection:bg-red-500 selection:text-white">
      
      {/* Subtle top ambient glow */}
      <div className="fixed top-0 inset-x-0 h-96 bg-gradient-to-b from-red-500/5 via-transparent to-transparent pointer-events-none dark:from-red-600/10" />

      {/* Top Sticky Navbar - Decluttered and Streamlined with Mobile Bottom Bar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Container - 1600px Width with Mobile Bottom Bar Clearance */}
      <main className="max-w-[1600px] mx-auto px-2.5 sm:px-6 lg:px-8 py-3.5 sm:py-8 pb-28 sm:pb-32 lg:pb-8 relative">
        
        {/* KPI Stat Cards (Only on clients, daily, matrix tabs) */}
        {activeTab !== 'inventory' && activeTab !== 'inbound' && activeTab !== 'trash' && (
          <StatCards onSelectDailyTab={() => setActiveTab('daily')} />
        )}

        {/* Tab 1: Clients & Wallets */}
        {activeTab === 'clients' && (
          <section className="space-y-6 animate-view-fade">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  <span>دليل العملاء ومحافظ فودافون كاش</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  إدارة المحافظ، تعيين الليميت الشهري (200,000 ج.م تلقائياً)، وحد التحويل اليومي 60,000 ج.م مع إمكانية شحن الرصيد
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveModal('addClient')}
                  className="btn-interactive flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-red-600 dark:hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة عميل جديد</span>
                </button>

                <button
                  onClick={() => setActiveModal('transfer')}
                  className="btn-interactive flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/25 ring-1 ring-red-500/30"
                >
                  <Send className="w-4 h-4 rotate-180" />
                  <span>تحويل سريع</span>
                </button>
              </div>
            </div>

            {/* Clients List */}
            {filteredClients.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/90 dark:border-slate-800 shadow-sm">
                <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {searchQuery ? 'لا توجد نتائج بحث مطابقة' : 'لا يوجد عملاء مسجلين حالياً'}
                </h3>
                <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                  {searchQuery 
                    ? `لم يتم العثور على عملاء أو أرقام تطابق "${searchQuery}". جرب البحث برقم آخر.`
                    : 'ابدأ الآن بإضافة أول عميل مع أرقام محافظ فودافون كاش والليميت الخاص به.'}
                </p>
                <button
                  onClick={() => setActiveModal('addClient')}
                  className="btn-interactive inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة عميل جديد</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClients.map(client => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </div>
            )}

          </section>
        )}

        {/* Tab 2: Daily Log (سجل اليوم بكل تفاصيله) */}
        {activeTab === 'daily' && (
          <div className="animate-view-fade">
            <DailyLogView />
          </div>
        )}

        {/* Tab 3: Mobile Shop Inventory & Stock (مخزون الهواتف والإكسسوارات) */}
        {activeTab === 'inventory' && (
          <div className="animate-view-fade">
            <InventoryView />
          </div>
        )}

        {/* Tab 4: Wallets Limit Monitor (مراقبة الليميت) */}
        {activeTab === 'matrix' && (
          <div className="animate-view-fade">
            <LimitMatrixView />
          </div>
        )}

        {/* Tab 5: Inbound & Commission Ledger (الوارد والعمولة - له) */}
        {activeTab === 'inbound' && (
          <div className="animate-view-fade">
            <InboundCalculatorView />
          </div>
        )}

        {/* Tab 6: Overall Reports & Analytics (الإحصائيات والتقارير) */}
        {activeTab === 'reports' && (
          <div className="animate-view-fade">
            <ReportsView />
          </div>
        )}

        {/* Tab 7: Trash & Recycle Bin (سلة المحذوفات واسترجاع البيانات) */}
        {activeTab === 'trash' && (
          <div className="animate-view-fade">
            <TrashView />
          </div>
        )}

      </main>

      {/* All Dialogs & Modals */}
      <NewTransferModal />
      <AddClientModal />
      <AddWalletModal />
      <EditLimitModal />
      <ReceiptModal />
      <BackupModal />
      <ConfirmModal />
      <AddProductModal />
      <SellProductModal />
      <RestockModal />
      <ProductDetailsModal />
      <CloudSyncModal />
      <RechargeWalletModal />

      {/* Toast Notification */}
      <Toast />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CashProvider>
        <MainApp />
      </CashProvider>
    </AuthProvider>
  );
}