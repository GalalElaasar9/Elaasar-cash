import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence
} from 'firebase/firestore';

const CONFIG_STORAGE_KEY = 'elaasar_firebase_config';

// Public Firebase Web Client configuration for project "elaasar-cash-app"
// (Safe to bundle in client code; access control is enforced by Firebase Auth & Firestore Rules)
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyATfYl5diRhx9Nr7HWHpwJhfiWPpbP7W5Y',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'elaasar-cash-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'elaasar-cash-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'elaasar-cash-app.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '104147784267',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:104147784267:web:80579c01d99f4a6db333ce'
};

/**
 * Default environment configuration, stored credentials, or built-in project config
 */
export function getStoredFirebaseConfig() {
  try {
    const local = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not parse stored Firebase config:', e);
  }

  return DEFAULT_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config) {
  try {
    if (config) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save Firebase config to localStorage:', e);
  }
}

// Initialize instances
let app = null;
let auth = null;
let db = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function initFirebase() {
  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return { app: null, auth: null, db: null, isConfigured: false };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }

    auth = getAuth(app);
    db = getFirestore(app);

    // Enable offline persistence in browser
    try {
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Firestore persistence enabled in another tab');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore persistence not supported in this browser');
        }
      });
    } catch {
      // Ignore if already enabled
    }

    return { app, auth, db, isConfigured: true };
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return { app: null, auth: null, db: null, isConfigured: false };
  }
}

// Initial setup call
const initial = initFirebase();
app = initial.app;
auth = initial.auth;
db = initial.db;

export { app, auth, db, googleProvider };
export const isFirebaseConfigured = () => !!db && !!auth;
