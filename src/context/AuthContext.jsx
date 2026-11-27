import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  initFirebase,
  saveStoredFirebaseConfig,
  getStoredFirebaseConfig
} from '../firebase/config';
import { syncUserProfile } from '../firebase/firestoreService';
import { storage } from '../utils/storage';
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

function getFriendlyFirebaseAuthError(error) {
  const code = error?.code || '';
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  switch (code) {
    case 'auth/unauthorized-domain':
      return `النطاق الحالي (${host}) غير مضاف في Authorized Domains بلوحة تحكم Firebase (Authentication > Settings > Authorized domains).`;
    case 'auth/operation-not-allowed':
      return 'طريقة الدخول هذه غير مفعلة بعد في مشروع Firebase.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'تم إغلاق نافذة تسجيل الدخول بجوجل قبل إتمام التسجيل.';
    case 'auth/popup-blocked':
      return 'قام المتصفح بحظر النافذة المنبثقة. سيتم التحويل إلى صفحة جوجل مباشرة.';
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مسجل بالفعل! يمكنك الانتقال إلى تبويب "تسجيل الدخول".';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة! يجب أن تتكون من 6 أحرف أو أرقام على الأقل.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'auth/too-many-requests':
      return 'محاولات دخول متكررة! يرجى الانتظار قليلاً ثم المحاولة مرة أخرى.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بخوادم Firebase، يرجى التحقق من اتصال الإنترنت.';
    case 'auth/invalid-api-key':
    case 'auth/configuration-not-found':
      return 'بيانات إعداد Firebase غير مكتملة أو تحتاج تفعيل Authentication أولاً.';
    default:
      return error?.message || 'حدث خطأ أثناء تسجيل الدخول.';
  }
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('offline'); // 'live' | 'syncing' | 'offline' | 'unconfigured'
  const [isConfigured, setIsConfigured] = useState(() => isFirebaseConfigured());
  const [shopId, setShopId] = useState(() => localStorage.getItem('elaasar_shop_id') || 'elaasar_main');

  // Listen to Auth state
  useEffect(() => {
    if (!auth) {
      setIsConfigured(false);
      setSyncStatus('unconfigured');
      setLoading(false);
      return;
    }

    setIsConfigured(true);

    // Complete redirect flow if fallback redirect sign-in occurred
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) {
          storage.setActiveUserScope(res.user.uid, res.user.email);
          setCurrentUser(res.user);
          setShopId(res.user.uid);
          setSyncStatus('live');
          syncUserProfile(res.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in check:', err?.code || err?.message);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        storage.setActiveUserScope(user.uid, user.email);
        setCurrentUser(user);
        setShopId(user.uid);
        localStorage.setItem('elaasar_shop_id', user.uid);
        setSyncStatus('live');
        syncUserProfile(user);
      } else {
        storage.setActiveUserScope(null, '');
        setCurrentUser(null);
        setSyncStatus('offline');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isConfigured]);

  // Google Login (Popup primary with Redirect fallback when popups are blocked)
  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error('يرجى ضبط إعدادات فايربيس (Firebase Config) أولاً.');
    }
    try {
      setSyncStatus('syncing');
      const result = await signInWithPopup(auth, googleProvider);
      storage.setActiveUserScope(result.user.uid, result.user.email);
      setCurrentUser(result.user);
      setShopId(result.user.uid);
      setSyncStatus('live');
      syncUserProfile(result.user);
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

  // Email + Password Login
  const loginWithEmail = async (email, password) => {
    if (!auth) {
      throw new Error('يرجى ضبط إعدادات فايربيس (Firebase Config) أولاً.');
    }
    try {
      setSyncStatus('syncing');
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      storage.setActiveUserScope(result.user.uid, result.user.email);
      setCurrentUser(result.user);
      setShopId(result.user.uid);
      setSyncStatus('live');
      syncUserProfile(result.user);
      return result.user;
    } catch (error) {
      setSyncStatus(currentUser ? 'live' : 'offline');
      throw new Error(getFriendlyFirebaseAuthError(error));
    }
  };

  // Email + Password Sign Up
  const registerWithEmail = async (name, email, password) => {
    if (!auth) {
      throw new Error('يرجى ضبط إعدادات فايربيس (Firebase Config) أولاً.');
    }
    try {
      setSyncStatus('syncing');
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name && name.trim()) {
        await updateProfile(result.user, { displayName: name.trim() });
      }
      const userObj = {
        ...result.user,
        displayName: (name && name.trim()) || result.user.displayName || email.split('@')[0]
      };
      storage.setActiveUserScope(result.user.uid, result.user.email);
      setCurrentUser(result.user);
      setShopId(result.user.uid);
      setSyncStatus('live');
      syncUserProfile(userObj);
      return result.user;
    } catch (error) {
      setSyncStatus(currentUser ? 'live' : 'offline');
      throw new Error(getFriendlyFirebaseAuthError(error));
    }
  };

  // Password Reset Email
  const resetPassword = async (email) => {
    if (!auth) {
      throw new Error('يرجى ضبط إعدادات فايربيس (Firebase Config) أولاً.');
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
    storage.setActiveUserScope(null, '');
    setCurrentUser(null);
    setSyncStatus('offline');
  };

  // Change / Set Shop ID (kept synced per account unless overridden)
  const updateShopId = (newId) => {
    const cleanId = (newId || currentUser?.uid || 'elaasar_main').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    setShopId(cleanId);
    localStorage.setItem('elaasar_shop_id', cleanId);
  };

  // Update Firebase Configuration dynamically
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
