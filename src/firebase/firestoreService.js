import { db } from './config';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

/**
 * Sync User Profile Metadata under users/{uid}
 */
export async function syncUserProfile(user) {
  if (!db || !user?.uid) return;
  try {
    const nowIso = new Date().toISOString();
    const providerId = user.providerData?.[0]?.providerId || 'password';
    const docRef = doc(db, 'users', user.uid);
    await setDoc(docRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      provider: providerId,
      updatedAt: nowIso,
      lastLoginAt: nowIso
    }, { merge: true });
  } catch (err) {
    // Non-fatal if Firestore API is still being enabled by project owner
    console.warn('User profile sync skipped:', err?.code || err?.message);
  }
}

/**
 * Subscribe to ALL account-private data documents under users/{uid}/store
 * Each document holds either { uid, items: [...] } or { uid, data: {...} }.
 */
export function subscribeToUserStore(uid, onUpdate, onError) {
  if (!db || !uid) return () => {};
  const colRef = collection(db, 'users', uid, 'store');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const storeMap = {};
      snapshot.docs.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && Array.isArray(d.items)) {
          storeMap[docSnap.id] = d.items;
        } else if (d && d.data !== undefined) {
          storeMap[docSnap.id] = d.data;
        }
      });
      onUpdate(storeMap, snapshot.metadata.hasPendingWrites);
    },
    (err) => {
      console.warn('Firestore user store listener error:', err?.code || err?.message);
      if (onError) onError(err);
    }
  );
}

/**
 * Write a single store slice under users/{uid}/store/{docId}
 */
export async function saveUserStoreDoc(uid, docId, payload) {
  if (!db || !uid || !docId) return;
  const nowIso = new Date().toISOString();
  const docRef = doc(db, 'users', uid, 'store', String(docId));
  const body = Array.isArray(payload)
    ? { uid, items: payload, updatedAt: nowIso }
    : { uid, data: payload, updatedAt: nowIso };
  await setDoc(docRef, body, { merge: false });
}

/**
 * Atomically push all store slices for a user account to Cloud Firestore
 */
export async function uploadAllUserStoreData(uid, storeBundle) {
  if (!db || !uid) return;
  const nowIso = new Date().toISOString();
  const batch = writeBatch(db);

  Object.entries(storeBundle || {}).forEach(([docId, payload]) => {
    if (payload === undefined) return;
    const docRef = doc(db, 'users', uid, 'store', String(docId));
    const body = Array.isArray(payload)
      ? { uid, items: payload, updatedAt: nowIso }
      : { uid, data: payload, updatedAt: nowIso };
    batch.set(docRef, body);
  });

  await batch.commit();
}

// =========================================================================
// Legacy / Shop-scoped helpers preserved for backward compatibility
// =========================================================================

export function subscribeToClients(shopId, onUpdate, onError) {
  if (!db || !shopId) return () => {};
  const colRef = collection(db, 'shops', shopId, 'clients');
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(list);
  }, (err) => {
    if (onError) onError(err);
  });
}

export function subscribeToTransactions(shopId, onUpdate, onError) {
  if (!db || !shopId) return () => {};
  const colRef = collection(db, 'shops', shopId, 'transactions');
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    onUpdate(list);
  }, (err) => {
    if (onError) onError(err);
  });
}

export function subscribeToInventory(shopId, onUpdate, onError) {
  if (!db || !shopId) return () => {};
  const colRef = collection(db, 'shops', shopId, 'inventory');
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(list);
  }, (err) => {
    if (onError) onError(err);
  });
}

export async function syncClientToCloud(shopId, client) {
  if (!db || !shopId || !client?.id) return;
  const docRef = doc(db, 'shops', shopId, 'clients', String(client.id));
  await setDoc(docRef, { ...client, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteClientFromCloud(shopId, clientId) {
  if (!db || !shopId || !clientId) return;
  const docRef = doc(db, 'shops', shopId, 'clients', String(clientId));
  await deleteDoc(docRef);
}

export async function syncTransactionToCloud(shopId, tx) {
  if (!db || !shopId || !tx?.id) return;
  const docRef = doc(db, 'shops', shopId, 'transactions', String(tx.id));
  await setDoc(docRef, { ...tx, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteTransactionFromCloud(shopId, txId) {
  if (!db || !shopId || !txId) return;
  const docRef = doc(db, 'shops', shopId, 'transactions', String(txId));
  await deleteDoc(docRef);
}

export async function syncProductToCloud(shopId, product) {
  if (!db || !shopId || !product?.id) return;
  const docRef = doc(db, 'shops', shopId, 'inventory', String(product.id));
  await setDoc(docRef, { ...product, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteProductFromCloud(shopId, productId) {
  if (!db || !shopId || !productId) return;
  const docRef = doc(db, 'shops', shopId, 'inventory', String(productId));
  await deleteDoc(docRef);
}

export async function uploadAllLocalDataToCloud(uidOrShopId, dataBundle) {
  return uploadAllUserStoreData(uidOrShopId, dataBundle);
}
