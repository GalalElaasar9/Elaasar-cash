import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCash } from '../context/CashContext';
import {
  Wallet,
  ShieldCheck,
  Smartphone,
  Package,
  Mail,
  Lock,
  User,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';

export default function LoginScreen() {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    loading
  } = useAuth();

  const { theme, toggleTheme } = useCash();

  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setErrorMsg(err?.message || 'تعذر تسجيل الدخول عبر Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    if (authMode === 'register' && !fullName.trim()) {
      setErrorMsg('يرجى كتابة اسم المستخدم أو اسم المحل.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(fullName, email, password);
      }
    } catch (err) {
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع، حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!email.trim()) {
      setErrorMsg('اكتب بريدك الإلكتروني أولاً في الخانة أعلاه ثم اضغط على استعادة كلمة المرور.');
      return;
    }
    try {
      await resetPassword(email);
      setSuccessMsg('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح.');
    } catch (err) {
      setErrorMsg(err?.message || 'تعذر إرسال رابط استعادة كلمة المرور.');
    }
  };

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen flex flex-col items-center justify-center bg-[#061116] text-white p-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4">
          <Wallet className="w-8 h-8 text-slate-950" />
        </div>
        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-300">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <span>جاري التحقق من جلسة الدخول وحفظ البيانات...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center bg-slate-100 dark:bg-[#050f14] text-slate-900 dark:text-white px-4 py-8 transition-colors"
    >
      {/* Ambient Radial Glow matching modern SaaS portal */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[560px] h-[360px] rounded-full bg-emerald-500/15 dark:bg-emerald-500/12 blur-[110px]" />
        <div className="absolute -bottom-32 right-1/4 w-[420px] h-[300px] rounded-full bg-teal-500/10 dark:bg-cyan-500/10 blur-[110px]" />
      </div>

      {/* Theme Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 left-4 z-20 p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md hover:scale-105 transition-all"
        title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
      </button>

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-[460px] rounded-[28px] bg-white/95 dark:bg-[#0b181f]/95 border border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-slate-900/10 dark:shadow-black/60 backdrop-blur-xl p-6 sm:p-8 space-y-5">

        {/* Top Emblem + Title + Badge */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Wallet className="w-8 h-8 stroke-[2.2]" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-2xl sm:text-[26px] font-black tracking-tight text-slate-900 dark:text-white">
              الأعصر كاش
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
              بوابة الدخول الآمنة
            </span>
          </div>

          <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
            سجّل دخولك الآن لإدارة التحويلات، خطوط فودافون كاش، والمخزون — كل حساب ببياناته الخاصة والمزامنة السحابية
          </p>
        </div>

        {/* 3 Highlights Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#102029] border border-slate-200/80 dark:border-slate-800/90 flex flex-col items-center text-center gap-1.5">
            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">متابعة التحويلات</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#102029] border border-slate-200/80 dark:border-slate-800/90 flex flex-col items-center text-center gap-1.5">
            <Package className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">إدارة المخزون</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#102029] border border-slate-200/80 dark:border-slate-800/90 flex flex-col items-center text-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">بيانات خاصة وآمنة</span>
          </div>
        </div>

        {/* Segmented Auth Mode Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-[#071116] border border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              authMode === 'login'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            تسجيل الدخول
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
              authMode === 'register'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isSubmitting}
          className="btn-interactive w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-slate-50 dark:bg-[#102029] hover:bg-slate-100 dark:hover:bg-[#152a35] text-slate-800 dark:text-white font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700/80 transition-all disabled:opacity-60"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>المتابعة عبر حساب Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-[#0b181f] whitespace-nowrap">
            أو بالبريد وكلمة المرور
          </span>
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-start gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-start gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmitForm} className="space-y-3.5">
          {authMode === 'register' && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                الاسم الكامل أو اسم المحل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: الأعصر كاش - الفرع الرئيسي"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071116] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              البريد الإلكتروني <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071116] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                كلمة المرور أو رمز الحماية <span className="text-rose-500">*</span>
              </label>
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071116] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            className="btn-interactive w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-105 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-60 mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : authMode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {isSubmitting
                ? 'جاري المعالجة...'
                : authMode === 'login'
                ? 'تسجيل الدخول الآن'
                : 'إنشاء الحساب والدخول'}
            </span>
          </button>
        </form>
      </div>

      {/* Footer Note */}
      <p className="relative z-10 mt-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 text-center">
        منظومة الأعصر كاش • محمي بآليات التشفير والمزامنة السحابية الخاصة بكل حساب
      </p>
    </div>
  );
}
