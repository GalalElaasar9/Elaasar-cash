import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCash } from '../context/CashContext';
import { 
  Cloud, 
  Database,
  LogIn, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Monitor, 
  Copy, 
  Check, 
  UploadCloud, 
  Settings, 
  ExternalLink, 
  X,
  Sparkles,
  Zap
} from 'lucide-react';

export default function CloudSyncModal() {
  const { 
    currentUser, 
    loginWithGoogle, 
    logout, 
    syncStatus, 
    isConfigured, 
    shopId, 
    updateShopId, 
    updateFirebaseConfig,
    storedConfig 
  } = useAuth();

  const { 
    activeModal, 
    setActiveModal, 
    uploadToCloud, 
    backendStatus,
    showToast,
    showAlert
  } = useCash();

  const dialogRef = useRef(null);

  const [copied, setCopied] = useState(false);
  const [copiedPhoneUrl, setCopiedPhoneUrl] = useState(false);
  const [editingShopId, setEditingShopId] = useState(shopId);
  const [showConfigEditor, setShowConfigEditor] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const currentPort = typeof window !== 'undefined' && window.location.port ? window.location.port : '3000';
  const mobileWifiUrl = typeof window !== 'undefined' 
    ? `http://${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '192.168.1.12' : window.location.hostname}:${currentPort}`
    : `http://192.168.1.12:${currentPort}`;

  const handleCopyMobileUrl = () => {
    navigator.clipboard.writeText(mobileWifiUrl);
    setCopiedPhoneUrl(true);
    showToast('تم نسخ رابط فتح الموقع على الهاتف');
    setTimeout(() => setCopiedPhoneUrl(false), 2000);
  };

  // Raw Firebase Config JSON input
  const [configJson, setConfigJson] = useState(() => 
    storedConfig ? JSON.stringify(storedConfig, null, 2) : ''
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'cloudSync') {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal]);

  const handleClose = () => {
    setActiveModal(null);
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      showToast('تم تسجيل الدخول بنجاح وتفعيل المزامنة اللحظية!');
    } catch (err) {
      if (!isConfigured) {
        setShowConfigEditor(true);
      }
      showAlert({
        title: 'تسجيل الدخول بجوجل',
        message: err.message || 'حدث خطأ أثناء الاتصال بجوجل. يرجى التأكد من إضافة مفاتيح فايربيس (Firebase Config).',
        type: 'warning'
      });
    }
  };

  const handleCopyShopId = () => {
    navigator.clipboard.writeText(shopId);
    setCopied(true);
    showToast('تم نسخ رمز المحل لمشاركته على الأجهزة الأخرى');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveShopId = (e) => {
    e.preventDefault();
    updateShopId(editingShopId);
    showToast('تم تحديث معرف المحل');
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(configJson);
      if (!parsed.apiKey || !parsed.projectId) {
        throw new Error('الملف يجب أن يحتوي على apiKey و projectId');
      }
      updateFirebaseConfig(parsed);
      showToast('تم حفظ إعدادات فايربيس بنجاح!');
      setShowConfigEditor(false);
    } catch (err) {
      showAlert({
        title: 'خطأ في تنسيق الإعدادات',
        message: 'يرجى لصق كود Firebase Config بصيغة JSON صحيحة.',
        details: err.message,
        type: 'danger'
      });
    }
  };

  const handlePushLocalData = async () => {
    setIsUploading(true);
    try {
      await uploadToCloud();
      showToast('تم رفع ومزامنة كل البيانات المحلية إلى قاعدة البيانات السحابية بنجاح!');
    } catch (err) {
      showAlert({
        title: 'خطأ في المزامنة',
        message: 'تعذر رفع البيانات إلى السحابة. تأكد من اتصال الإنترنت وصلاحيات قاعدة البيانات.',
        details: err.message,
        type: 'danger'
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (activeModal !== 'cloudSync') return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="cloud-sync-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/65 overflow-hidden animate-scale-in"
    >
      {/* Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="cloud-sync-title" className="text-base sm:text-lg font-black flex items-center gap-2">
              <span>السحابة والمزامنة الفورية للأجهزة</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/30 text-white border border-white/20">
                Live Realtime
              </span>
            </h2>
            <p className="text-xs text-blue-100 mt-0.5">
              ربط الهاتف بالكمبيوتر والتحديث في نفس اللحظة عبر Google Cloud
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        
        {/* 1. Realtime Local Backend & Database Card */}
        <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>الباك إند وقاعدة البيانات اللحظية</span>
                  <span className={`w-2 h-2 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {backendStatus === 'connected' ? '🟢 متصل ويعمل - أي تعديل يسمع فوراً في نفس اللحظة' : '🟡 جاري الاتصال بالباك إند...'}
                </p>
              </div>
            </div>

            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full">
              Realtime WebSocket
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>رابط فتح الموقع على الهاتف (شبكة الواي فاي):</span>
              </span>
              <button
                onClick={handleCopyMobileUrl}
                type="button"
                className="btn-interactive inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {copiedPhoneUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPhoneUrl ? 'تم النسخ' : 'نسخ الرابط'}</span>
              </button>
            </div>

            <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/40 p-2 rounded-lg break-all select-all">
              {mobileWifiUrl}
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              💡 افتح هذا الرابط على متصفح هاتفك المحمول (متصلين على نفس شبكة الواي فاي) - أي تحويل أو بيع هاتف تسجله على الموبايل هيظهر على شاشة الكمبيوتر في نفس الثانية تلقائياً وبدون ريفريش!
            </p>
          </div>
        </div>

        {/* 2. User Auth Status Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          {currentUser ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'User'} 
                    className="w-12 h-12 rounded-full ring-2 ring-emerald-500 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                    {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {currentUser.displayName || 'مستخدم مسجل'}
                    </h4>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      متصل ومزامن
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                className="btn-interactive inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-400 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل خروج</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-center sm:text-right">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5 justify-center sm:justify-start">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>تسجيل الدخول بالإيميل (جوجل)</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    سجل دخول بحساب جوجل لمزامنة التحويلات والمخزون لحظياً على أي هاتف أو كمبيوتر في نفس اللحظة.
                  </p>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  className="btn-interactive flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-600 shadow-sm transition-all shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>تسجيل الدخول بجوجل</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Device Linking & Live Synchronization Key */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                <Smartphone className="w-4 h-4" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                رمز ربط الأجهزة (Shop Sync ID)
              </h4>
            </div>
            
            <span className="text-[10px] text-blue-700 dark:text-blue-300 font-bold bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
              مزامنة فورية (موبايل + كاشير)
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            لربط الموقع على هاتفك وعلى كمبيوتر المحل، تأكد أن كلا الجهازين يستخدمان نفس رمز المحل أدناه:
          </p>

          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={editingShopId}
              onChange={(e) => setEditingShopId(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="elaasar_main"
            />
            
            <button
              onClick={handleSaveShopId}
              type="button"
              className="btn-interactive px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0"
            >
              حفظ الرمز
            </button>

            <button
              onClick={handleCopyShopId}
              type="button"
              className="btn-interactive p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 shrink-0"
              title="نسخ الرمز"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 3. Push Local Data to Cloud Database */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-indigo-500" />
              <span>رفع البيانات الحالية للسحابة</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              رفع كل العملاء، والمحافظ، وسجل اليوم، والمخزون المسجل محلياً إلى قاعدة البيانات لتظهر فوراً على هاتفك.
            </p>
          </div>

          <button
            onClick={handlePushLocalData}
            disabled={isUploading}
            className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shrink-0 disabled:opacity-50"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{isUploading ? 'جاري الرفع...' : 'رفع ومزامنة'}</span>
          </button>
        </div>

        {/* 4. Firebase Configuration Toggle & Editor */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setShowConfigEditor(!showConfigEditor)}
            type="button"
            className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <span className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              <span>إعدادات مفاتيح Google Firebase (قاعدة البيانات السحابية)</span>
            </span>
            <span className="text-[10px] text-blue-600">
              {showConfigEditor ? 'إخفاء' : 'عرض / تعديل'}
            </span>
          </button>

          {showConfigEditor && (
            <form onSubmit={handleSaveConfig} className="mt-3 space-y-3 animate-fadeIn">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                الصق كود الـ <span className="font-mono font-bold">firebaseConfig</span> الخاص بمشروعك من لوحة تحكم Google Firebase (مجاني بالكامل):
              </p>

              <textarea
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                rows={7}
                placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "elaasar-cash.firebaseapp.com",\n  "projectId": "elaasar-cash",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
                className="w-full p-3 font-mono text-[11px] bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex items-center justify-between gap-2">
                <a
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>فتح لوحة تحكم Google Firebase</span>
                </a>

                <button
                  type="submit"
                  className="btn-interactive px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  حفظ وتطبيق المفاتيح
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </dialog>
  );
}
