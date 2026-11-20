import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data', 'database.json');

// Read storage.js to extract the initial constants
import { 
  INITIAL_DEMO_CLIENTS, 
  INITIAL_DEMO_TRANSACTIONS, 
  INITIAL_DEMO_INVENTORY 
} from '../src/utils/storage.js';

const initialDb = {
  version: 1,
  lastUpdated: new Date().toISOString(),
  shopInfo: {
    name: 'الأعصر لخدمات المحمول',
    syncId: 'elaasar_main'
  },
  user: {
    displayName: 'الأعصر كاش',
    email: 'elaasar.cash@gmail.com'
  },
  clients: INITIAL_DEMO_CLIENTS,
  transactions: INITIAL_DEMO_TRANSACTIONS,
  inventory: INITIAL_DEMO_INVENTORY,
  inboundLedger: [
    { id: 'inbound-1', amount: 5000, date: new Date().toISOString() },
    { id: 'inbound-2', amount: 10000, date: new Date().toISOString() }
  ]
};

fs.writeFileSync(DATA_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
console.log('Database seeded successfully with clients, transactions, and inventory!');
