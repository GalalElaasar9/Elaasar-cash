import { db } from './config';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  writeBatch,
  getDocs
} from 'firebase/firestore';

const DEVICE_SESSION_ID = `dev_${Math.random().toString(36).slice(2, 10)}`;

export const USER_STORE_KEYS = [
  'clients',
  'transactions',
  'inventory',
  'purchases',
  'treasury',
  'shopWallets',
  'instapayAccounts',
  'dailyAudits',
  'dailyOpeningBalances',
  'clientArchives',
  'trash',
  'dismissedArchiveIds'
];

/**
 * Ensure user profile document exists under users/{uid}
 */
export async function syncUserProfileToCloud(user) {
  if (!db || !user?.uid) return;
  try {
    const profileRef = doc(db, 'users', user.uid);
    const nowIso = new Date().toISOString();
    await setDoc(
      profileRef,
      {
        uid: user.uid,
        ...(user.email ? { email: user.email } : {}),
        ...(user.displayName ? { displayName: user.displayName } : {}),
        ...(user.photoURL ? { photoURL: user.photoURL } : {}),
        lastLoginAt: nowIso,
        updatedAt: nowIso
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync user profile:', err?.code || err?.message);
  }
}

/**
 * Subscribe in real time to ALL store documents owned strictly by `uid` (`users/{uid}/store/{docId}`).
 */
export function subscribeUserStore(uid, onSnapshotData, onError) {
  if (!db || !uid) return () => {};
  const storeCol = collection(db, 'users', uid, 'store');

  return onSnapshot(
    storeCol,
    (snapshot) => {
      const updates = {};
      snapshot.docs.forEach((docSnap) => {
        const d = docSnap.data();
        if (!d) return;
        // Skip local pending echoes written by this exact browser tab
        if (snapshot.metadata.hasPendingWrites && d.updatedBy === DEVICE_SESSION_ID) {
          return;
        }
        if (Array.isArray(d.items)) {
          updates[docSnap.id] = d.items;
        } else if (d.data !== undefined) {
          updates[docSnap.id] = d.data;
        }
      });
      onSnapshotData(updates, snapshot.empty, snapshot.metadata.hasPendingWrites);
    },
    (err) => {
      console.error('Per-user Firestore listener error:', err?.code || err?.message);
      if (onError) onError(err);
    }
  );
}

/**
 * Persist a single store slice under `users/{uid}/store/{docKey}` complying strictly with firestore.rules.
 */
export async function syncUserStoreSlice(uid, docKey, value) {
  if (!db || !uid || !docKey) return;
  const ref = doc(db, 'users', uid, 'store', docKey);
  const nowIso = new Date().toISOString();

  const payload = Array.isArray(value)
    ? {
        uid,
        id: docKey,
        items: value,
        updatedAt: nowIso,
        updatedBy: DEVICE_SESSION_ID,
        version: 1
      }
    : {
        uid,
        id: docKey,
        data: value || {},
        updatedAt: nowIso,
        updatedBy: DEVICE_SESSION_ID,
        version: 1
      };

  await setDoc(ref, payload);
}

/**
 * Upload complete account dataset in one batch to `users/{uid}/store/*`
 */
export async function uploadAllLocalDataToCloud(uid, stateMap) {
  if (!db || !uid) throw new Error('يرجى تسجيل الدخول بحسابك أولاً');

  const batch = writeBatch(db);
  const nowIso = new Date().toISOString();

  USER_STORE_KEYS.forEach((docKey) => {
    if (!(docKey in stateMap)) return;
    const val = stateMap[docKey];
    const ref = doc(db, 'users', uid, 'store', docKey);
    const payload = Array.isArray(val)
      ? {
          uid,
          id: docKey,
          items: val,
          updatedAt: nowIso,
          updatedBy: DEVICE_SESSION_ID,
          version: 1
        }
      : {
          uid,
          id: docKey,
          data: val || {},
          updatedAt: nowIso,
          updatedBy: DEVICE_SESSION_ID,
          version: 1
        };
    batch.set(ref, payload);
  });

  await batch.commit();
}

/**
 * Check whether user already has any saved documents in Firestore
 */
export async function checkUserHasCloudData(uid) {
  if (!db || !uid) return false;
  const snap = await getDocs(collection(db, 'users', uid, 'store'));
  return !snap.empty;
}
