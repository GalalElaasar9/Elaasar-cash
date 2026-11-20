import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data', 'database.json');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Helper: Get local network IP addresses
function getLocalIpAddresses() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, address: net.address });
      }
    }
  }
  return results;
}

// Helper: Load database from disk
function loadDatabase() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }

  // Default initial schema if empty
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
    shopInfo: {
      name: 'الأعصر لخدمات المحمول',
      syncId: 'elaasar_main'
    },
    user: null,
    clients: [],
    transactions: [],
    inventory: [],
    inboundLedger: []
  };
}

// In-memory state backed by disk
let dbState = loadDatabase();

// Helper: Save database to disk atomically
function saveDatabase() {
  try {
    dbState.lastUpdated = new Date().toISOString();
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(dbState, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Error saving database to disk:', err);
  }
}

// Helper: Broadcast to all connected WebSocket clients except the sender
function broadcast(message, senderSocket = null) {
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client !== senderSocket) {
      try {
        client.send(payload);
      } catch (err) {
        console.error('Error broadcasting to client:', err);
      }
    }
  });
}

// WebSocket Connection Handler
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[WebSocket] New client connected from ${clientIp} (Total: ${wss.clients.size})`);

  // Send current full database state on connection
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    payload: {
      clients: dbState.clients,
      transactions: dbState.transactions,
      inventory: dbState.inventory,
      inboundLedger: dbState.inboundLedger,
      user: dbState.user,
      shopInfo: dbState.shopInfo,
      lastUpdated: dbState.lastUpdated
    }
  }));

  // Handle incoming real-time messages from clients
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleClientMessage(msg, ws);
    } catch (err) {
      console.error('[WebSocket] Invalid JSON message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected (Remaining: ${wss.clients.size})`);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Error:', err);
  });
});

// Process client mutations and broadcast to others
function handleClientMessage(msg, senderSocket) {
  const { type, payload } = msg;

  switch (type) {
    case 'SYNC_ALL':
      if (payload) {
        if (Array.isArray(payload.clients)) dbState.clients = payload.clients;
        if (Array.isArray(payload.transactions)) dbState.transactions = payload.transactions;
        if (Array.isArray(payload.inventory)) dbState.inventory = payload.inventory;
        if (Array.isArray(payload.inboundLedger)) dbState.inboundLedger = payload.inboundLedger;
        if (payload.user !== undefined) dbState.user = payload.user;
        saveDatabase();
        broadcast({ type: 'DATABASE_UPDATED', payload: dbState }, senderSocket);
      }
      break;

    case 'CLIENT_SAVE':
      if (payload && payload.id) {
        const idx = dbState.clients.findIndex(c => c.id === payload.id);
        if (idx >= 0) {
          dbState.clients[idx] = { ...dbState.clients[idx], ...payload };
        } else {
          dbState.clients.unshift(payload);
        }
        saveDatabase();
        broadcast({ type: 'CLIENT_UPDATED', payload }, senderSocket);
      }
      break;

    case 'CLIENT_DELETE':
      if (payload && payload.id) {
        dbState.clients = dbState.clients.filter(c => c.id !== payload.id);
        saveDatabase();
        broadcast({ type: 'CLIENT_DELETED', payload: { id: payload.id } }, senderSocket);
      }
      break;

    case 'TRANSACTION_ADD':
      if (payload && payload.id) {
        dbState.transactions.unshift(payload);
        // Also update client remaining limit if wallet exists
        if (payload.walletId) {
          dbState.clients = dbState.clients.map(client => {
            const hasWallet = (client.wallets || []).some(w => w.id === payload.walletId);
            if (!hasWallet) return client;
            return { ...client };
          });
        }
        saveDatabase();
        broadcast({ type: 'TRANSACTION_ADDED', payload }, senderSocket);
      }
      break;

    case 'TRANSACTION_DELETE':
      if (payload && payload.id) {
        dbState.transactions = dbState.transactions.filter(t => t.id !== payload.id);
        saveDatabase();
        broadcast({ type: 'TRANSACTION_DELETED', payload: { id: payload.id } }, senderSocket);
      }
      break;

    case 'PRODUCT_SAVE':
      if (payload && payload.id) {
        const idx = dbState.inventory.findIndex(p => p.id === payload.id);
        if (idx >= 0) {
          dbState.inventory[idx] = { ...dbState.inventory[idx], ...payload };
        } else {
          dbState.inventory.unshift(payload);
        }
        saveDatabase();
        broadcast({ type: 'PRODUCT_UPDATED', payload }, senderSocket);
      }
      break;

    case 'PRODUCT_DELETE':
      if (payload && payload.id) {
        dbState.inventory = dbState.inventory.filter(p => p.id !== payload.id);
        saveDatabase();
        broadcast({ type: 'PRODUCT_DELETED', payload: { id: payload.id } }, senderSocket);
      }
      break;

    case 'LEDGER_SAVE':
      if (Array.isArray(payload)) {
        dbState.inboundLedger = payload;
        saveDatabase();
        broadcast({ type: 'LEDGER_UPDATED', payload }, senderSocket);
      }
      break;

    case 'USER_LOGIN':
      if (payload) {
        dbState.user = payload;
        saveDatabase();
        broadcast({ type: 'USER_UPDATED', payload }, senderSocket);
      }
      break;

    case 'USER_LOGOUT':
      dbState.user = null;
      saveDatabase();
      broadcast({ type: 'USER_UPDATED', payload: null }, senderSocket);
      break;

    default:
      console.log('[WebSocket] Unknown message type:', type);
  }
}

// ==========================================
// REST API ROUTES
// ==========================================

// Server & Database Health Status
app.get('/api/status', (req, res) => {
  const ips = getLocalIpAddresses();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    lastUpdated: dbState.lastUpdated,
    activeConnections: wss.clients.size,
    localIps: ips,
    stats: {
      clients: dbState.clients.length,
      transactions: dbState.transactions.length,
      inventory: dbState.inventory.length
    }
  });
});

// Full Database Retrieval
app.get('/api/data', (req, res) => {
  res.json({
    clients: dbState.clients,
    transactions: dbState.transactions,
    inventory: dbState.inventory,
    inboundLedger: dbState.inboundLedger,
    user: dbState.user,
    shopInfo: dbState.shopInfo,
    lastUpdated: dbState.lastUpdated
  });
});

// Full / Bulk Sync
app.post('/api/sync', (req, res) => {
  const { clients, transactions, inventory, inboundLedger, user } = req.body;
  if (Array.isArray(clients)) dbState.clients = clients;
  if (Array.isArray(transactions)) dbState.transactions = transactions;
  if (Array.isArray(inventory)) dbState.inventory = inventory;
  if (Array.isArray(inboundLedger)) dbState.inboundLedger = inboundLedger;
  if (user !== undefined) dbState.user = user;

  saveDatabase();
  broadcast({ type: 'DATABASE_UPDATED', payload: dbState });

  res.json({ success: true, message: 'تمت المزامنة بنجاح وحفظ البيانات في قاعدة البيانات' });
});

// Save or Update Client
app.post('/api/client', (req, res) => {
  const client = req.body;
  if (!client || !client.id) {
    return res.status(400).json({ error: 'بيانات العميل غير مكتملة' });
  }

  const idx = dbState.clients.findIndex(c => c.id === client.id);
  if (idx >= 0) {
    dbState.clients[idx] = { ...dbState.clients[idx], ...client };
  } else {
    dbState.clients.unshift(client);
  }

  saveDatabase();
  broadcast({ type: 'CLIENT_UPDATED', payload: client });

  res.json({ success: true, client });
});

// Delete Client
app.delete('/api/client/:id', (req, res) => {
  const id = req.params.id;
  dbState.clients = dbState.clients.filter(c => c.id !== id);
  saveDatabase();
  broadcast({ type: 'CLIENT_DELETED', payload: { id } });
  res.json({ success: true });
});

// Save Transaction
app.post('/api/transaction', (req, res) => {
  const tx = req.body;
  if (!tx || !tx.id) {
    return res.status(400).json({ error: 'بيانات المعاملة غير مكتملة' });
  }

  dbState.transactions.unshift(tx);
  saveDatabase();
  broadcast({ type: 'TRANSACTION_ADDED', payload: tx });

  res.json({ success: true, transaction: tx });
});

// Delete Transaction
app.delete('/api/transaction/:id', (req, res) => {
  const id = req.params.id;
  dbState.transactions = dbState.transactions.filter(t => t.id !== id);
  saveDatabase();
  broadcast({ type: 'TRANSACTION_DELETED', payload: { id } });
  res.json({ success: true });
});

// Save Product
app.post('/api/product', (req, res) => {
  const product = req.body;
  if (!product || !product.id) {
    return res.status(400).json({ error: 'بيانات المنتج غير مكتملة' });
  }

  const idx = dbState.inventory.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    dbState.inventory[idx] = { ...dbState.inventory[idx], ...product };
  } else {
    dbState.inventory.unshift(product);
  }

  saveDatabase();
  broadcast({ type: 'PRODUCT_UPDATED', payload: product });

  res.json({ success: true, product });
});

// Delete Product
app.delete('/api/product/:id', (req, res) => {
  const id = req.params.id;
  dbState.inventory = dbState.inventory.filter(p => p.id !== id);
  saveDatabase();
  broadcast({ type: 'PRODUCT_DELETED', payload: { id } });
  res.json({ success: true });
});

// Save Inbound Ledger
app.post('/api/ledger', (req, res) => {
  const { entries } = req.body;
  if (Array.isArray(entries)) {
    dbState.inboundLedger = entries;
    saveDatabase();
    broadcast({ type: 'LEDGER_UPDATED', payload: entries });
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'صيغة البيانات غير صحيحة' });
});

// Google / User Session
app.post('/api/auth/google', (req, res) => {
  const user = req.body;
  dbState.user = user;
  saveDatabase();
  broadcast({ type: 'USER_UPDATED', payload: user });
  res.json({ success: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  dbState.user = null;
  saveDatabase();
  broadcast({ type: 'USER_UPDATED', payload: null });
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`[الأعصر كاش] سيرفر الباك إند وقاعدة البيانات يعمل بنجاح!`);
  console.log(`- المنفذ المحلي: http://localhost:${PORT}`);
  const ips = getLocalIpAddresses();
  ips.forEach(ip => {
    console.log(`- شبكة الواي فاي (للموبايل): http://${ip.address}:${PORT}`);
  });
  console.log(`- مسار قاعدة البيانات: ${DATA_FILE}`);
  console.log('====================================================');
});
