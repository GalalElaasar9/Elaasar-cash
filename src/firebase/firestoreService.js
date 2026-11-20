import { db } from './config';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocs,
  query,
  orderBy 
} from 'firebase/firestore';

/**
 * Real-time listeners for Shop Collections
 */

export function subscribeToClients(shopId, onUpdate, onError) {
  if (!db || !shopId) return () => {};
  const colRef = collection(db, 'shops', shopId, 'clients');
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    onUpdate(list);
  }, (err) => {
    console.error('Clients real-time listener error:', err);
    if (onError) onError(err);
  });
}

export function subscribeToTransactions(shopId, onUpdate, onError) {
  if (!db || !shopId) return () => {};
  const colRef = collection(db, 'shops', shopId, 'transactions');
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort by timestamp descending
    list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    onUpdate(list);
  }, (err) => {
    console.error('Transactions real-time listener error:', err);
    if (onError) onError(err);
  });
}

export function subscribeToInventory(shopId, onUpdate, onError) {
  if (!db || !shopId) return () => {};
  const colRef = collection(db, 'shops', shopId, 'inventory');
  return onSnapshot(colRef, (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    onUpdate(list);
  }, (err) => {
    console.error('Inventory real-time listener error:', err);
    if (onError) onError(err);
  });
}

export function subscribeToLedger(shopId, onUpdate, onError) {
  if (!db || !shopId) return () => {};
  const docRef = doc(db, 'shops', shopId, 'meta', 'inboundLedger');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data().entries || []);
    }
  }, (err) => {
    console.error('Ledger real-time listener error:', err);
    if (onError) onError(err);
  });
}

/**
 * Single document mutations (Write to Cloud)
 */

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

export async function syncLedgerToCloud(shopId, entries) {
  if (!db || !shopId) return;
  const docRef = doc(db, 'shops', shopId, 'meta', 'inboundLedger');
  await setDoc(docRef, { entries, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Bulk upload local dataset to Cloud (Initial Seed / Cloud Push)
 */
export async function uploadAllLocalDataToCloud(shopId, { clients = [], transactions = [], inventory = [], inboundLedger = [] }) {
  if (!db || !shopId) return;

  const batch = writeBatch(db);

  // Clients
  clients.forEach(c => {
    const r = doc(db, 'shops', shopId, 'clients', String(c.id));
    batch.set(r, c);
  });

  // Transactions
  transactions.forEach(t => {
    const r = doc(db, 'shops', shopId, 'transactions', String(t.id));
    batch.set(r, t);
  });

  // Inventory
  inventory.forEach(p => {
    const r = doc(db, 'shops', shopId, 'inventory', String(p.id));
    batch.set(r, p);
  });

  // Inbound Ledger
  if (inboundLedger && inboundLedger.length > 0) {
    const lr = doc(db, 'shops', shopId, 'meta', 'inboundLedger');
    batch.set(lr, { entries: inboundLedger, updatedAt: new Date().toISOString() });
  }

  await batch.commit();
}
