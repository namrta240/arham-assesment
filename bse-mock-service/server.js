const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

// Configurable delay in milliseconds (Set low for local dev, e.g., 2000ms)
const DELAY_MS = process.env.DELAY_MS || 2000; 

// Middleware to simulate network delays and 20% mid-pull failures
const simulateBseBehavior = (req, res, next) => {
  // 20% random failure rate requirement
  if (Math.random() < 0.20) {
    return res.status(500).json({ error: 'BSE Connection Dropped Mid-Pull. Please retry.' });
  }

  // Artificial delay
  setTimeout(() => {
    next();
  }, DELAY_MS);
};

// 1. Slow/Unreliable BSE Clients Endpoint
app.get('/bse/clients', simulateBseBehavior, (req, res) => {
  res.json([
    { id: 'cli_101', name: 'John Doe', email: 'john@example.com' },
    { id: 'cli_102', name: 'Jane Smith', email: 'jane@example.com' },
    { id: 'cli_103', name: 'Rahul Sharma', email: 'rahul@example.com' }
  ]);
});

// 2. Slow/Unreliable BSE Trades Endpoint
app.get('/bse/trades', simulateBseBehavior, (req, res) => {
  res.json([
    { id: 'trd_1', client_id: 'cli_101', amount: 15000.00, trade_date: '2026-08-01' },
    { id: 'trd_2', client_id: 'cli_102', amount: 45000.50, trade_date: '2026-08-01' },
    { id: 'trd_3', client_id: 'cli_103', amount: 80000.00, trade_date: '2026-07-31' }
  ]);
});

// 3. INSTANT Endpoint (Internal employee mappings - No delay, no failures)
app.get('/internal/mappings', (req, res) => {
  res.json({
    employees: [
      { id: 'emp_1', name: 'Alice (RM)', role: 'rm' },
      { id: 'emp_2', name: 'Bob (RM)', role: 'rm' },
      { id: 'mgr_1', name: 'Charlie (Manager)', role: 'manager' }
    ],
    mappings: [
      { employee_id: 'emp_1', client_id: 'cli_101' },
      { employee_id: 'emp_1', client_id: 'cli_102' },
      { employee_id: 'emp_2', client_id: 'cli_103' }
    ]
  });
});

app.listen(5000, () => console.log('Mock BSE Server running on http://localhost:5000'));