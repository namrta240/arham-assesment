# Software Engineer Technical Assessment — Internal Operations Portal

This repository contains **Part A** (Mock BSE API simulator) and **Part B** (Internal Operations Backend & React Portal) for stock broking operations.

---

## 📁 Repository Layout

- `bse-mock-service/` — Part A: Simulates slow/unreliable BSE feed & instant internal endpoints.
- `internal-backend/` — Part B Backend: Handles background syncing, MySQL integration, retries, and SSE live updates.
- `internal-portal/` — Part B Frontend: React + Vite dashboard.

---

## 🚀 Prerequisites

- **Node.js** (v18+)
- **MySQL Server** (Running locally on port 3306)

---

## ⚙️ Setup Instructions

### 1. Database Setup
Run the SQL script from `internal-backend/schema.sql` in your MySQL client to set up the database and initial seed data.

### 2. Part A — Start Mock BSE Service (Port 5000)
```bash
cd bse-mock-service
npm install
node server.js

### 3. Part B — Start Backend Server (Port 4000)
```bash
cd internal-backend
npm install
node server.js

### 4. Part B — Start React Dashboard (Port 5173)
```bash
cd internal-portal
npm install
npm run dev

Visit http://localhost:5173 to access the dashboard.