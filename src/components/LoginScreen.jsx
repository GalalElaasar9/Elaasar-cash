import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCash } from '../context/CashContext';
import ElaasarLogo from './ElaasarLogo';
import {
  ShieldCheck,
  Cloud,
  Sparkles,
  Sun,
  Moon,
  AlertTriangle,
  Settings,
  CheckCircle2,
  Loader2,
  Lock
} from 'lucide-react';

export default function LoginScreen() {
  const {
    loginWithGoogle,
    loading,
    isConfigured,
    updateFirebaseConfig,
    storedConfig
  } = useAuth();

  const { theme, toggleTheme } = useCash();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showManualConfig, setShowManualConfig] = useState(!isConfigured);
  const [configJson, setConfigJson] = useState(() =>
    storedConfig ? JSON.stringify(storedConfig, null, 2) : ''
  );

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setErrorMsg(err?.message || 'تعذر تسجيل الدخول عبر جوجل. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveManualConfig = (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const parsed = JSON.parse(configJson);
      if (!parsed.apiKey || !parsed.projectId) {
        throw new Error('يجب أن يحتوي الإعداد على apiKey و projectId على الأقل.');
      }
      updateFirebaseConfig(parsed);
    } catch (err) {
      setErrorMsg(err?.message || 'صيغة JSON غير صحيحة. انسخ كود firebaseConfig كاملاً من لوحة Firebase.');
    }
  };

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6"
      >
        <ElaasarLogo size="lg" showSubtitle={true} />
        <div className="mt-6 flex items-center gap-2.5 text-sm font-bold text-slate-500 dark:text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-red-600" />
          <span>جاري التحقق من حالة الحساب والجلسة...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 transition-colors"
    >
      {/* Ambient Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-red-500/15 dark:bg-red-600/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/15 dark:bg-blue-600/15 blur-3xl" />
      </div>

      {/* Theme Switcher Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 left-4 z-20 p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-sm hover:scale-105 transition-all"
        title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
      </button>

      {/* Main Auth Card */}
      <div className="relative z-10 w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Accent Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Logo & Intro */}
          <div className="flex flex-col items-center text-center space-y-3">
            <ElaasarLogo size="lg" showSubtitle={true} />

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
              <Lock className="w-3.5 h-3.5 text-red-600" />
              <span>بوابة الدخول المؤمّنة بحساب Google Firebase</span>
            </div>

            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                تسجيل الدخول إلى النظام
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                سجّل الدخول بإيميل جوجل الخاص بك لفتح حسابات المحل، فودافون كاش، والمخزون مع المزامنة الفورية
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-start gap-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Google Sign In CTA */}
          {isConfigured ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="btn-interactive w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-white font-black text-sm border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{isSubmitting ? 'جاري فتح نافذة Google...' : 'تسجيل الدخول بإيميل جوجل'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>حماية كاملة للبيانات</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <Cloud className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>مزامنة لحظية بين الأجهزة</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-2 text-xs text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2 font-black">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>الموقع بانتظار ربط إعدادات مشروع Firebase</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                لم يتم العثور على مفاتيح <span className="font-mono font-bold">Firebase Config</span> بعد. الصق الإعدادات أدناه أو أكمل تفعيل مشروع Firebase أولاً.
              </p>
            </div>
          )}

          {/* Optional Firebase Config Editor (visible automatically if unconfigured, collapsible otherwise) */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowManualConfig(prev => !prev)}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                <span>{isConfigured ? 'تحديث إعدادات مشروع Firebase يدوياً' : 'إدخال مفاتيح Firebase Config (JSON)'}</span>
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {showManualConfig ? 'إخفاء' : 'عرض'}
              </span>
            </button>

            {showManualConfig && (
              <form onSubmit={handleSaveManualConfig} className="mt-3 space-y-2.5 animate-fadeIn">
                <textarea
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  rows={5}
                  dir="ltr"
                  placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "your-project.firebaseapp.com",\n  "projectId": "your-project",\n  "appId": "1:...:web:..."\n}`}
                  className="w-full p-2.5 font-mono text-[11px] bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="btn-interactive w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>حفظ وتشغيل الربط الآن</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
