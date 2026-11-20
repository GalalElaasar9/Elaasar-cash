import React, { useState } from 'react';
import { useCash } from '../context/CashContext';
import { useAuth } from '../context/AuthContext';
import ElaasarLogo from './ElaasarLogo';
import { 
  Send, 
  Sun, 
  Moon, 
  Database, 
  Cloud,
  Wallet, 
  Calendar, 
  BarChart3, 
  Search, 
  Layers, 
  ArrowDownToLine, 
  X, 
  Smartphone,
  Package,
  AlertTriangle,
  Trash2
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, searchQuery, setSearchQuery }) {
  const { currentUser, syncStatus } = useAuth();
  const { 
    theme, 
    toggleTheme, 
    setActiveModal, 
    setModalData,
    todayTransactions,
    lowStockProductsCount,
    totalTrashCount
  } = useCash();

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const navItems = [
    { id: 'clients', label: 'العملاء', shortLabel: 'العملاء', icon: Wallet },
    { 
      id: 'daily', 
      label: 'سجل اليوم', 
      shortLabel: 'اليوم',
      icon: Calendar, 
      badge: todayTransactions.length > 0 ? todayTransactions.length : null 
    },
    { 
      id: 'inventory', 
      label: 'المخزون', 
      shortLabel: 'المخزون',
      icon: Smartphone, 
      badge: lowStockProductsCount > 0 ? lowStockProductsCount : null,
      isWarning: lowStockProductsCount > 0
    },
    { id: 'matrix', label: 'الليميت', shortLabel: 'الليميت', icon: Layers },
    { id: 'inbound', label: 'الوارد (له)', shortLabel: 'الوارد', icon: ArrowDownToLine, isBlue: true },
    { id: 'reports', label: 'التقارير', shortLabel: 'التقارير', icon: BarChart3 },
    { 
      id: 'trash', 
      label: 'المحذوفات', 
      shortLabel: 'المحذوفات', 
      icon: Trash2, 
      badge: totalTrashCount > 0 ? totalTrashCount : null,
      isRose: true 
    },
  ];

  return (
    <>
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-18 gap-1.5 sm:gap-6">
            
            {/* 1. Brand Logo - Professional Elaasar Mobile Services Branding */}
            <ElaasarLogo 
              size="md" 
              onClick={() => setActiveTab('clients')}
              className="shrink-0"
            />

            {/* 2. Desktop Navigation Tabs (Hidden on mobile, handled in bottom bar) */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-inner">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 relative ${
                      isActive
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-600/50'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${
                      isActive 
                        ? (item.isBlue ? 'text-blue-600 dark:text-blue-400' : item.isRose ? 'text-rose-600 dark:text-rose-400' : 'text-red-600 dark:text-red-400')
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    <span>{item.label}</span>

                    {item.badge && (
                      <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-full text-white shadow-sm ${
                        item.isWarning 
                          ? 'bg-amber-500 animate-pulse' 
                          : 'bg-red-600'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* 3. Right Side: Quick Search + Primary Transfer CTA + Utilities */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              
              {/* Desktop Search Input */}
              <div className="relative hidden md:block">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="بحث سريع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 lg:w-44 focus:w-60 pl-3 pr-8 py-1.5 text-xs bg-slate-100/90 dark:bg-slate-800/90 border border-transparent focus:border-red-400 dark:focus:border-red-500 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:bg-white dark:focus:bg-slate-800 transition-all duration-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Mobile Search Toggle Icon */}
              <button
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className={`p-1.5 sm:p-2 rounded-xl md:hidden transition-colors ${
                  mobileSearchOpen || searchQuery
                    ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                    : 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300'
                }`}
                title="بحث عن عميل أو هاتف"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Primary Action Button - Prominent & Sleek */}
              <button
                onClick={() => {
                  setModalData(null);
                  setActiveModal('transfer');
                }}
                className="btn-interactive flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-600/25 ring-1 ring-red-500/40 shrink-0"
                title="تسجيل تحويل جديد وخصمه مباشرة من الليميت"
              >
                <Send className="w-3.5 h-3.5 rotate-180" />
                <span className="hidden sm:inline">تحويل كاش</span>
                <span className="sm:hidden">تحويل</span>
              </button>

              {/* Utilities Segment (Theme Switcher + Cloud Realtime + Backup Database) */}
              <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                
                {/* Cloud Live Sync & Google Login */}
                <button
                  onClick={() => setActiveModal('cloudSync')}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all relative flex items-center gap-1 ${
                    currentUser
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                  title={currentUser ? `متصل لحظياً بحساب جوجل (${currentUser.email}) - المزامنة مفعلة` : 'السحابة والمزامنة الفورية مع الهاتف وجوجل'}
                >
                  {currentUser?.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="Google User" 
                      className="w-4 h-4 rounded-full ring-1 ring-emerald-500" 
                    />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                  {currentUser && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>

                <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" />

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all"
                  title={theme === 'dark' ? 'التحويل للوضع المضيء (نهاري)' : 'التحويل للوضع الليلي'}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                  )}
                </button>

                <div className="hidden sm:block h-3.5 w-px bg-slate-200 dark:bg-slate-700" />

                {/* Database / Backup Modal (Desktop / Tablet - on mobile accessible via Cloud modal) */}
                <button
                  onClick={() => setActiveModal('backup')}
                  className="hidden sm:inline-flex p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all relative group"
                  title="النسخ الاحتياطي وإدارة البيانات (تصدير واسترجاع)"
                >
                  <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                </button>

              </div>

            </div>
          </div>

          {/* Mobile Search Expandable Drawer */}
          {mobileSearchOpen && (
            <div className="md:hidden py-2.5 pb-3 border-t border-slate-200/70 dark:border-slate-800/70 transition-all animate-fadeIn">
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="بحث باسم العميل، الملاحظات، أو موديل هاتف..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setMobileSearchOpen(false)}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 py-1.5 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

        </div>
      </header>

      {/* Modern Fixed Bottom Navigation Bar for Mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden w-full max-w-full overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-7 h-14 w-full max-w-full px-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const displayLabel = item.shortLabel || item.label;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-0.5 min-w-0 max-w-full overflow-hidden relative transition-all duration-150 active:scale-95 ${
                  isActive 
                    ? (item.isBlue ? 'text-blue-600 dark:text-blue-400 font-black' : item.isRose ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-red-600 dark:text-red-500 font-black')
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
                  <span className={`w-1 h-1 rounded-full mt-0.5 shrink-0 ${
                    item.isBlue ? 'bg-blue-600 dark:bg-blue-400' : item.isRose ? 'bg-rose-600 dark:bg-rose-400' : 'bg-red-600 dark:bg-red-500'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}