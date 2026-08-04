const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Live Render BSE Mock Service URL
const BSE_SERVICE_URL = 'https://bse-mock-service.onrender.com';

// MySQL Pool Configuration for Aiven MySQL Database
const db = mysql.createPool({
  host: 'mysql-86309e5-arham-assesment.j.aivencloud.com',
  port: 16832,
  user: 'avnadmin',
  password: 'AVNS_WVTB54M8iLmwdsh6t4U',
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10
});

async function initDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id VARCHAR(50) PRIMARY KEY,
        client_id VARCHAR(50),
        amount DECIMAL(12, 2),
        trade_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100),
        role VARCHAR(50)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_client_map (
        employee_id VARCHAR(50),
        client_id VARCHAR(50),
        PRIMARY KEY (employee_id, client_id)
      );
    `);

    await db.query(`
      INSERT IGNORE INTO employees (id, name, role) VALUES 
      ('emp_1', 'Alice (RM)', 'rm'),
      ('emp_2', 'Bob (RM)', 'rm'),
      ('mgr_1', 'Charlie (Manager)', 'manager');
    `);

    await db.query(`
      INSERT IGNORE INTO employee_client_map (employee_id, client_id) VALUES 
      ('emp_1', 'cli_101'),
      ('emp_1', 'cli_102'),
      ('emp_2', 'cli_103');
    `);

    console.log('Database tables and seed data initialized successfully!');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Call table initialization
initDatabase();

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

// Resilient Sync Function with Retries (Pointing to Live BSE Render Service)
async function syncBseDataWithRetry(endpoint, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Sync] Fetching ${endpoint} (Attempt ${attempt})...`);
      const response = await axios.get(`${BSE_SERVICE_URL}/bse/${endpoint}`, { timeout: 35000 });
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

    console.log('[Sync Success] Data synced to Aiven MySQL!');
    notifyClients({ type: 'DATA_UPDATED', timestamp: new Date() });
  } catch (err) {
    console.error('[Sync Error] Failed all retries during sync cycle.');
  }
}

// Sync trigger endpoint
app.post('/api/trigger-sync', (req, res) => {
  runBackgroundSync(); // non-blocking execution
  res.json({ message: 'Sync process started in background.' });
});

// REST Endpoints serving cached data
app.get('/api/clients', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM clients');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trades', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM trades');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/incentives', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.id as employee_id, e.name as employee_name, COALESCE(SUM(t.amount * 0.01), 0) as total_incentive
      FROM employees e
      LEFT JOIN employee_client_map ecm ON e.id = ecm.employee_id
      LEFT JOIN trades t ON ecm.client_id = t.client_id
      GROUP BY e.id, e.name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Use dynamic environment port for Render deployment
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Internal Backend Server running on port ${PORT}`));
