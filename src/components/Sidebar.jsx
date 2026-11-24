import React, { useState } from 'react';
import { useCash } from '../context/CashContext';
import { useAuth } from '../context/AuthContext';
import ElaasarLogo from './ElaasarLogo';
import { 
  Sun, 
  Moon, 
  Database, 
  Cloud,
  Wallet, 
  Calendar, 
  BarChart2, 
  Search, 
  Layers, 
  ArrowDownToLine, 
  X, 
  Smartphone,
  Trash2,
  FileSpreadsheet,
  Menu,
  ChevronRight,
  ChevronLeft,
  Send,
  UserPlus,
  ShoppingBag,
  Coins
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  isCollapsed = false,
  onToggleCollapse
}) {
  const { currentUser } = useAuth();
  const { 
    theme, 
    toggleTheme, 
    setActiveModal, 
    todayTransactions,
    lowStockProductsCount,
    totalTrashCount,
    purchases
  } = useCash();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const navItems = [
    { id: 'clients', label: 'دليل العملاء', shortLabel: 'العملاء', icon: Wallet },
    { id: 'accounts', label: 'حسابات العملاء', shortLabel: 'الحسابات', icon: FileSpreadsheet, isEmerald: true },
    { 
      id: 'daily', 
      label: 'سجل المبيعات', 
      shortLabel: 'المبيعات',
      icon: Calendar, 
      badge: todayTransactions.length > 0 ? todayTransactions.length : null 
    },
    { 
      id: 'inventory', 
      label: 'مخزون الأجهزة', 
      shortLabel: 'المخزون',
      icon: Smartphone, 
      badge: lowStockProductsCount > 0 ? lowStockProductsCount : null,
      isWarning: lowStockProductsCount > 0
    },
    { 
      id: 'purchases', 
      label: 'سجل المشتريات', 
      shortLabel: 'المشتريات', 
      icon: ShoppingBag,
      badge: purchases?.length > 0 ? purchases.length : null 
    },
    { 
      id: 'capital', 
      label: 'رأس المال والسيولة', 
      shortLabel: 'رأس المال', 
      icon: Coins 
    },
    { id: 'matrix', label: 'مراقبة الليميت', shortLabel: 'الليميت', icon: Layers },
    { id: 'inbound', label: 'الوارد والعمولة (له)', shortLabel: 'الوارد', icon: ArrowDownToLine, isBlue: true },
    { id: 'reports', label: 'التقارير المالية', shortLabel: 'التقارير', icon: BarChart2 },
    { 
      id: 'trash', 
      label: 'سلة المحذوفات', 
      shortLabel: 'المحذوفات', 
      icon: Trash2, 
      badge: totalTrashCount > 0 ? totalTrashCount : null,
      isRose: true 
    },
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* =========================================================================
          1. Desktop Fixed Sidebar (visible only on lg: screens and up)
      ========================================================================= */}
      <aside
        className={`hidden lg:flex fixed top-0 bottom-0 right-0 z-40 bg-white dark:bg-slate-900 border-l border-slate-200/90 dark:border-slate-800 flex-col justify-between transition-all duration-300 shadow-sm ${
          isCollapsed ? 'w-20' : 'w-64 xl:w-72'
        }`}
      >
        {/* Top Segment: Brand, Quick Actions, Search & Navigation */}
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Brand Header */}
          {isCollapsed ? (
            <div className="flex flex-col items-center justify-center gap-2 py-3.5 px-2 border-b border-slate-200/80 dark:border-slate-800/80">
              <div 
                className="cursor-pointer transition-transform hover:scale-105 active:scale-95 flex items-center justify-center" 
                onClick={() => handleSelectTab('clients')}
                title="منظومة الأعصر كاش - اضغط للانتقال للرئيسية"
              >
                <ElaasarLogo size="md" hideText={true} />
              </div>
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center"
                title="توسيع القائمة الجانبية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
              <ElaasarLogo 
                size="md" 
                showSubtitle={true} 
                onClick={() => handleSelectTab('clients')} 
              />
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="طي القائمة الجانبية"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Actions (تحويل كاش سريع) */}
          <div className="p-3">
            {isCollapsed ? (
              <button
                type="button"
                onClick={() => setActiveModal('transfer')}
                className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white flex items-center justify-center shadow-md shadow-red-600/30 transition-transform active:scale-95"
                title="تحويل كاش سريع من خطوط المحل"
              >
                <Send className="w-5 h-5 rotate-180" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveModal('transfer')}
                className="w-full btn-interactive flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs sm:text-sm font-black shadow-md shadow-red-600/25 ring-1 ring-red-500/30 transition-all"
                title="تسجيل تحويل فوري من خطوط المحل"
              >
                <Send className="w-4 h-4 rotate-180" />
                <span>تحويل كاش سريع</span>
              </button>
            )}
          </div>

          {/* Quick Search in Sidebar (when expanded) */}
          {!isCollapsed && (
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث سريع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-8 py-2 text-xs bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Links List */}
          <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-1 custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                  } rounded-xl text-xs sm:text-sm font-bold transition-all relative group ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/25 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? 'scale-110 text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-red-600 dark:group-hover:text-red-400'
                    }`} />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>

                  {/* Badge */}
                  {item.badge && (
                    <span className={`${
                      isCollapsed ? 'absolute -top-1 -right-1' : ''
                    } px-1.5 py-0.5 min-w-[18px] text-[10px] font-black rounded-full leading-none shrink-0 ${
                      isActive
                        ? 'bg-white text-red-600'
                        : item.isWarning
                        ? 'bg-amber-500 text-white'
                        : item.isRose
                        ? 'bg-rose-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {/* Bottom Footer: User Sync & System Utilities */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
          
          {/* User Profile Card (when expanded and logged in) */}
          {!isCollapsed && currentUser && (
            <div 
              onClick={() => setActiveModal('cloudSync')}
              className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-colors group"
              title="إدارة المزامنة السحابية والحساب"
            >
              <div className="flex items-center gap-2 min-w-0">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="" className="w-7 h-7 rounded-full ring-2 ring-emerald-500 shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {currentUser.displayName || 'مستخدم جوجل'}
                  </p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>متصل لحظياً</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Utilities Row: Theme + Cloud + Backup */}
          <div className={`flex items-center ${
            isCollapsed ? 'flex-col gap-2' : 'justify-between'
          } bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/70`}>
            
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all flex-1 flex items-center justify-center"
              title={theme === 'dark' ? 'التحويل للوضع المضيء (نهاري)' : 'التحويل للوضع الليلي'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Cloud Sync Button */}
            <button
              type="button"
              onClick={() => setActiveModal('cloudSync')}
              className={`p-2 rounded-lg transition-all flex-1 flex items-center justify-center relative ${
                currentUser
                  ? 'text-emerald-600 hover:bg-white dark:hover:bg-slate-700'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700'
              }`}
              title="المزامنة السحابية الفورية"
            >
              <Cloud className="w-4 h-4" />
              {currentUser && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 animate-pulse" />}
            </button>

            {/* Backup Button */}
            <button
              type="button"
              onClick={() => setActiveModal('backup')}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all flex-1 flex items-center justify-center"
              title="النسخ الاحتياطي واسترجاع البيانات"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>

        </div>
      </aside>

      {/* =========================================================================
          2. Mobile & Tablet Top Bar (< lg screens)
      ========================================================================= */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          {/* Mobile Drawer Trigger (Hamburger Menu) */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="فتح القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
          </button>

          <ElaasarLogo 
            size="sm" 
            showSubtitle={false} 
            onClick={() => handleSelectTab('clients')} 
          />
        </div>

        {/* Mobile Header Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Search Toggle */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className={`p-2 rounded-xl transition-colors ${
              mobileSearchOpen || searchQuery
                ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="بحث"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Cloud Sync */}
          <button
            type="button"
            onClick={() => setActiveModal('cloudSync')}
            className={`p-2 rounded-xl transition-colors ${
              currentUser
                ? 'text-emerald-600'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="المزامنة"
          >
            <Cloud className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="الوضع الليلي"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Search Expandable Drawer */}
      {mobileSearchOpen && (
        <div className="lg:hidden fixed top-14 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-2.5 animate-fadeIn">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="بحث باسم العميل، الهاتف، أو الملاحظات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 py-1.5"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. Mobile Drawer Sidebar (Slides from Right)
      ========================================================================= */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs animate-right-sheet-backdrop" 
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Body (Fixed on Right) */}
          <div className="fixed top-0 bottom-0 right-0 w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between z-10 animate-right-sheet-in">
            
            <div className="flex flex-col flex-1 min-h-0">
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <ElaasarLogo size="sm" showSubtitle={true} onClick={() => handleSelectTab('clients')} />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Actions Button */}
              <div className="p-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setActiveModal('transfer');
                  }}
                  className="w-full btn-interactive flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-black shadow-md shadow-red-600/25"
                >
                  <Send className="w-4 h-4 rotate-180" />
                  <span>تحويل كاش سريع</span>
                </button>
              </div>

              {/* Drawer Nav Items */}
              <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/25 font-black'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-full leading-none ${
                          isActive
                            ? 'bg-white text-red-600'
                            : item.isWarning
                            ? 'bg-amber-500 text-white'
                            : item.isRose
                            ? 'bg-rose-600 text-white'
                            : 'bg-red-600 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setActiveModal('backup');
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
              >
                <Database className="w-4 h-4" />
                <span>النسخ الاحتياطي وإدارة البيانات</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          4. Mobile Bottom Quick Bar (< lg screens)
      ========================================================================= */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden w-full max-w-full overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-flow-col auto-cols-fr h-14 w-full max-w-full px-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const displayLabel = item.shortLabel || item.label;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-0.5 min-w-0 max-w-full overflow-hidden relative transition-all duration-150 active:scale-95 ${
                  isActive 
                    ? 'text-red-600 dark:text-red-500 font-black'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="relative shrink-0">
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {item.badge && (
                    <span className={`absolute -top-1.5 -right-2 px-1 text-[8px] sm:text-[9px] font-black rounded-full text-white shadow-xs ${
                      item.isWarning ? 'bg-amber-500 animate-pulse' : item.isRose ? 'bg-rose-600' : 'bg-red-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                
                <span className="text-[9px] mt-0.5 font-bold tracking-tight truncate w-full text-center leading-tight">
                  {displayLabel}
                </span>

                {isActive && (
                  <span className="w-1 h-1 rounded-full mt-0.5 shrink-0 bg-red-600 dark:bg-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
