import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  initFirebase,
  saveStoredFirebaseConfig,
  getStoredFirebaseConfig
} from '../firebase/config';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

const AuthContext = createContext();

function getFriendlyFirebaseAuthError(error) {
  const code = error?.code || '';
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  switch (code) {
    case 'auth/unauthorized-domain':
      return `النطاق الحالي (${host}) غير مضاف في Authorized Domains بلوحة تحكم Firebase (Authentication > Settings > Authorized domains).`;
    case 'auth/operation-not-allowed':
      return 'طريقة الدخول هذه غير مفعّلة في Firebase Console.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'تم إغلاق نافذة تسجيل الدخول بجوجل قبل إتمام التسجيل.';
    case 'auth/popup-blocked':
      return 'قام المتصفح بحظر النافذة المنبثقة. سيتم التحويل لصفحة Google مباشرة.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مسجل بالفعل — جرّب تسجيل الدخول بدلاً من إنشاء حساب جديد.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة جداً — يجب أن لا تقل عن 6 أحرف أو أرقام.';
    case 'auth/too-many-requests':
      return 'تم حظر المحاولات مؤقتاً لكثرة المحاولات الخاطئة. يرجى الانتظار قليلاً.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بخوادم Firebase، يرجى التحقق من اتصال الإنترنت.';
    case 'auth/invalid-api-key':
    case 'auth/configuration-not-found':
      return 'بيانات إعداد Firebase (apiKey / Auth) غير مكتملة.';
    default:
      return error?.message || 'حدث خطأ أثناء تسجيل الدخول.';
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('offline'); // 'live' | 'syncing' | 'offline' | 'unconfigured'
  const [isConfigured, setIsConfigured] = useState(() => isFirebaseConfigured());
  const [shopId, setShopId] = useState('elaasar_main');

  // Listen to Auth state & bind shopId strictly to authenticated user's UID
  useEffect(() => {
    if (!auth) {
      setIsConfigured(false);
      setSyncStatus('unconfigured');
      setLoading(false);
      return;
    }

    setIsConfigured(true);

    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          setCurrentUser(res.user);
          setShopId(res.user.uid);
          setSyncStatus('live');
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in check:', err?.code || err?.message);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setShopId(user.uid);
        setSyncStatus('live');
      } else {
        setShopId('guest');
        setSyncStatus('offline');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isConfigured]);

  // Google Sign-In
  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error('إعدادات Firebase غير مهيأة.');
    }
    try {
      setSyncStatus('syncing');
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
      setShopId(result.user.uid);
      setSyncStatus('live');
      return result.user;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      setSyncStatus(currentUser ? 'live' : 'offline');
      if (error?.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw new Error(getFriendlyFirebaseAuthError(error));
    }
  };

  // Email & Password Login
  const loginWithEmail = async (email, password) => {
    if (!auth) {
      throw new Error('إعدادات Firebase غير مهيأة.');
    }
    try {
      setSyncStatus('syncing');
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      setCurrentUser(result.user);
      setShopId(result.user.uid);
      setSyncStatus('live');
      return result.user;
    } catch (error) {
      console.error('Email Login Error:', error);
      setSyncStatus(currentUser ? 'live' : 'offline');
      throw new Error(getFriendlyFirebaseAuthError(error));
    }
  };

  // Email & Password Registration
  const registerWithEmail = async (displayName, email, password) => {
    if (!auth) {
      throw new Error('إعدادات Firebase غير مهيأة.');
    }
    try {
      setSyncStatus('syncing');
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName && displayName.trim()) {
        await updateProfile(result.user, { displayName: displayName.trim() });
      }
      const refreshedUser = { ...result.user, displayName: displayName?.trim() || result.user.displayName };
      setCurrentUser(result.user);
      setShopId(result.user.uid);
      setSyncStatus('live');
      return refreshedUser;
    } catch (error) {
      console.error('Email Register Error:', error);
      setSyncStatus(currentUser ? 'live' : 'offline');
      throw new Error(getFriendlyFirebaseAuthError(error));
    }
  };

  // Password Reset Email
  const resetPassword = async (email) => {
    if (!auth) {
      throw new Error('إعدادات Firebase غير مهيأة.');
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error) {
      throw new Error(getFriendlyFirebaseAuthError(error));
    }
  };

  // Logout
  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setCurrentUser(null);
    setShopId('guest');
    setSyncStatus('offline');
  };

  const updateShopId = (newId) => {
    const cleanId = (newId || currentUser?.uid || 'elaasar_main').trim();
    setShopId(cleanId);
  };

  const updateFirebaseConfig = (configObj) => {
    saveStoredFirebaseConfig(configObj);
    const result = initFirebase();
    setIsConfigured(result.isConfigured);
    if (result.isConfigured) {
      window.location.reload();
    }
  };

  const value = {
    currentUser,
    loading,
    syncStatus,
    setSyncStatus,
    isConfigured,
    shopId,
    updateShopId,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    logout,
    updateFirebaseConfig,
    storedConfig: getStoredFirebaseConfig()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
