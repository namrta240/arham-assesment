-- Stores raw/processed trades synced from BSE
CREATE TABLE IF NOT EXISTS trades (
    id VARCHAR(50) PRIMARY KEY,
    client_id VARCHAR(50),
    amount DECIMAL(12, 2),
    trade_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stores clients synced from BSE
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100)
);

-- Internal mappings (instant source)
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    role VARCHAR(50) -- 'manager' or 'rm' (Relationship Manager)
);

CREATE TABLE IF NOT EXISTS employee_client_map (
    employee_id VARCHAR(50),
    client_id VARCHAR(50),
    PRIMARY KEY (employee_id, client_id)
);

-- Seed initial internal employee data
INSERT IGNORE INTO employees (id, name, role) VALUES 
('emp_1', 'Alice (RM)', 'rm'),
('emp_2', 'Bob (RM)', 'rm'),
('mgr_1', 'Charlie (Manager)', 'manager');

INSERT IGNORE INTO employee_client_map (employee_id, client_id) VALUES 
('emp_1', 'cli_101'),
('emp_1', 'cli_102'),
('emp_2', 'cli_103');
