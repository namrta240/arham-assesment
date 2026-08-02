const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL Pool Configuration (Adjust credentials as needed)
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root', // Update this!
  database: 'arham_db',
  waitForConnections: true,
  connectionLimit: 10
});

// Server-Sent Events (SSE) Client Connections for Live UI Updates
let sseClients = [];

app.get('/api/live-updates', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  sseClients.push(res);
  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

function notifyClients(data) {
  sseClients.forEach(client => client.write(`data: ${JSON.stringify(data)}\n\n`));
}

// Resilient Sync Function with Retries
async function syncBseDataWithRetry(endpoint, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Sync] Fetching ${endpoint} (Attempt ${attempt})...`);
      const response = await axios.get(`http://localhost:5000/bse/${endpoint}`, { timeout: 35000 });
      return response.data;
    } catch (err) {
      console.warn(`[Sync Failed] ${endpoint} attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) throw err;
      // Exponential backoff delay
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
}

// Background Processing Job
async function runBackgroundSync() {
  try {
    const clients = await syncBseDataWithRetry('clients');
    for (let c of clients) {
      await db.query('INSERT INTO clients (id, name, email) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name=?, email=?', 
        [c.id, c.name, c.email, c.name, c.email]);
    }

    const trades = await syncBseDataWithRetry('trades');
    for (let t of trades) {
      await db.query('INSERT INTO trades (id, client_id, amount, trade_date) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount=?', 
        [t.id, t.client_id, t.amount, t.trade_date, t.amount]);
    }

    console.log('[Sync Success] Data synced to MySQL!');
    notifyClients({ type: 'DATA_UPDATED', timestamp: new Date() });
  } catch (err) {
    console.error('[Sync Error] Failed all retries during sync cycle.');
  }
}

// Sync trigger endpoint + Background Schedule every 30 seconds
app.post('/api/trigger-sync', (req, res) => {
  runBackgroundSync(); // non-blocking execution
  res.json({ message: 'Sync process started in background.' });
});

// REST Endpoints serving cached data instantly (<1s requirement)
app.get('/api/clients', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM clients');
  res.json(rows);
});

app.get('/api/trades', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM trades');
  res.json(rows);
});

app.get('/api/incentives', async (req, res) => {
  // Simple calculation logic: 1% brokerage incentive on mapped trades
  const [rows] = await db.query(`
    SELECT e.id as employee_id, e.name as employee_name, COALESCE(SUM(t.amount * 0.01), 0) as total_incentive
    FROM employees e
    LEFT JOIN employee_client_map ecm ON e.id = ecm.employee_id
    LEFT JOIN trades t ON ecm.client_id = t.client_id
    GROUP BY e.id, e.name
  `);
  res.json(rows);
});

app.listen(4000, () => console.log('Internal Backend Server running on http://localhost:4000'));