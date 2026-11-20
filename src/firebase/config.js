import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence 
} from 'firebase/firestore';

const CONFIG_STORAGE_KEY = 'elaasar_firebase_config';

/**
 * Default environment configuration or stored credentials
 */
export function getStoredFirebaseConfig() {
  try {
    const local = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {
    console.warn('Could not parse stored Firebase config:', e);
  }

  // Fallback to Vite environment variables if defined
  if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
    };
  }

  return null;
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
          // Multiple tabs open, persistence can only be enabled in one tab at a time.
          console.warn('Firestore persistence enabled in another tab');
        } else if (err.code === 'unimplemented') {
          // The current browser does not support persistence
          console.warn('Firestore persistence not supported in this browser');
        }
      });
    } catch (persistErr) {
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
