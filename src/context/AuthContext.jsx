import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  isFirebaseConfigured, 
  initFirebase, 
  saveStoredFirebaseConfig,
  getStoredFirebaseConfig
} from '../firebase/config';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setSyncStatus('live');
        // If shopId is default, bind to user uid or keep custom
        if (!localStorage.getItem('elaasar_shop_id')) {
          const defaultShop = user.email ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : user.uid;
          setShopId(defaultShop);
          localStorage.setItem('elaasar_shop_id', defaultShop);
        }
      } else {
        setSyncStatus('offline');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isConfigured]);

  // Google Login
  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error('يرجى ضبط إعدادات فايربيس (Firebase Config) أولاً.');
    }
    try {
      setSyncStatus('syncing');
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user);
      setSyncStatus('live');
      return result.user;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      setSyncStatus(currentUser ? 'live' : 'offline');
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setCurrentUser(null);
    setSyncStatus('offline');
  };

  // Change / Set Shop ID for device linking
  const updateShopId = (newId) => {
    const cleanId = (newId || 'elaasar_main').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
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
