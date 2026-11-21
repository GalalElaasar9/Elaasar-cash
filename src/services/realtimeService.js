/**
 * Realtime WebSocket & Backend Database Service
 * يوفر اتصال دائم ولحظي بسيرفر الباك إند وقاعدة البيانات
 * يسمع أي تغيير على الفور على كافة الأجهزة المتصلة (كمبيوتر وموبايل)
 */

class RealtimeService {
  constructor() {
    this.ws = null;
    this.reconnectTimer = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.status = 'disconnected'; // 'connected' | 'connecting' | 'disconnected'
    this.reconnectAttempts = 0;
    this.serverUrl = this.getWebSocketUrl();
  }

  getWebSocketUrl() {
    if (typeof window === 'undefined') return 'ws://localhost:3001/ws';
    const isHttps = window.location.protocol === 'https:';
    const host = window.location.host;
    const proto = isHttps ? 'wss:' : 'ws:';
    return `${proto}//${host}/ws`;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log('[Realtime] Connected to Elaasar Cash Backend Server!');
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.notifyListeners(message);
        } catch (err) {
          console.error('[Realtime] Message parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setStatus('disconnected');
      };
    } catch {
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectAttempts += 1;
      // Exponential backoff up to 30 seconds to prevent console spam if backend is offline
      const delay = Math.min(30000, 3000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 6)));
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, delay);
    }
  }

  setStatus(status) {
    this.status = status;
    this.statusListeners.forEach(fn => fn(status));
  }

  onStatusChange(fn) {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  onMessage(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notifyListeners(message) {
    this.listeners.forEach(fn => fn(message));
  }

  send(type, payload) {
    const data = JSON.stringify({ type, payload });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    }
    // Fallback: send via REST API if WebSocket is not open
    this.fallbackRest(type, payload);
    return false;
  }

  async fallbackRest(type, payload) {
    try {
      let endpoint = '';
      let method = 'POST';

      switch (type) {
        case 'SYNC_ALL':
          endpoint = '/api/sync';
          break;
        case 'CLIENT_SAVE':
          endpoint = '/api/client';
          break;
        case 'CLIENT_DELETE':
          endpoint = `/api/client/${payload.id}`;
          method = 'DELETE';
          break;
        case 'TRANSACTION_ADD':
          endpoint = '/api/transaction';
          break;
        case 'TRANSACTION_DELETE':
          endpoint = `/api/transaction/${payload.id}`;
          method = 'DELETE';
          break;
        case 'PRODUCT_SAVE':
          endpoint = '/api/product';
          break;
        case 'PRODUCT_DELETE':
          endpoint = `/api/product/${payload.id}`;
          method = 'DELETE';
          break;
        case 'LEDGER_SAVE':
          endpoint = '/api/ledger';
          payload = { entries: payload };
          break;
        default:
          return;
      }

      await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(payload) : undefined
      });
    } catch (e) {
      console.warn('[Realtime] REST fallback error:', e);
    }
  }

  // Helper mutation emitters
  syncAll(fullState) {
    return this.send('SYNC_ALL', fullState);
  }

  saveClient(client) {
    return this.send('CLIENT_SAVE', client);
  }

  deleteClient(id) {
    return this.send('CLIENT_DELETE', { id });
  }

  addTransaction(tx) {
    return this.send('TRANSACTION_ADD', tx);
  }

  deleteTransaction(id) {
    return this.send('TRANSACTION_DELETE', { id });
  }

  saveProduct(product) {
    return this.send('PRODUCT_SAVE', product);
  }

  deleteProduct(id) {
    return this.send('PRODUCT_DELETE', { id });
  }

  saveLedger(entries) {
    return this.send('LEDGER_SAVE', entries);
  }

  loginUser(user) {
    return this.send('USER_LOGIN', user);
  }

  logoutUser() {
    return this.send('USER_LOGOUT', {});
  }
}

export const realtime = new RealtimeService();
