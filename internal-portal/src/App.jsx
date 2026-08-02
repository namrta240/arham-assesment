import React, { useEffect, useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [trades, setTrades] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // Fetch local data instantly from Backend (Port 4000)
  const loadData = () => {
    fetch('http://localhost:4000/api/clients').then(res => res.json()).then(setClients);
    fetch('http://localhost:4000/api/trades').then(res => res.json()).then(setTrades);
    fetch('http://localhost:4000/api/incentives').then(res => res.json()).then(setIncentives);
  };

  useEffect(() => {
    loadData();

    // SSE Setup: Hard Requirement #2 (Update screen without refreshing page)
    const eventSource = new EventSource('http://localhost:4000/api/live-updates');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'DATA_UPDATED') {
        loadData(); // Seamless background update
        setSyncing(false);
      }
    };

    return () => eventSource.close();
  }, []);

  const triggerManualSync = () => {
    setSyncing(true);
    fetch('http://localhost:4000/api/trigger-sync', { method: 'POST' });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Internal Operations Portal</h1>
      <button onClick={triggerManualSync} disabled={syncing}>
        {syncing ? 'Syncing BSE Feed in Background...' : 'Trigger BSE Data Sync'}
      </button>

      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('clients')}>Clients</button>
        <button onClick={() => setActiveTab('trades')} style={{ marginLeft: '10px' }}>Trades</button>
        <button onClick={() => setActiveTab('incentives')} style={{ marginLeft: '10px' }}>Incentives</button>
      </div>

      <hr />

      {activeTab === 'clients' && (
        <div>
          <h2>Clients List</h2>
          <ul>
            {clients.map(c => <li key={c.id}><b>{c.name}</b> ({c.email})</li>)}
          </ul>
        </div>
      )}

      {activeTab === 'trades' && (
        <div>
          <h2>Trade Records</h2>
          <ul>
            {trades.map(t => <li key={t.id}>Trade ID: {t.id} | Amount: ₹{t.amount} | Date: {t.trade_date}</li>)}
          </ul>
        </div>
      )}

      {/* {activeTab === 'incentives' && (
        <div>
          <h2>Employee Incentives</h2>
          <ul>
            {incentives.map(i => <li key={i.employee_id}><b>{i.employee_name}</b>: ₹{i.total_incentive}</li>)}
          </ul>
        </div>
      )} */}

      {activeTab === 'incentives' && (
  <div>
    <h2>Employee Incentives</h2>
    <ul>
      {incentives.map(i => (
        <li key={i.employee_id}>
          <b>{i.employee_name}</b>: ₹{Number(i.total_incentive).toFixed(2)}
        </li>
      ))}
    </ul>
  </div>
)}
    </div>
  );
}