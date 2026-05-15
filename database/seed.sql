-- ============================================================
-- Seed Data for Customer Complaint & Resolution Tracking System
-- ============================================================

USE complaint_tracker;

-- ============================================================
-- ROLES
-- ============================================================
INSERT INTO roles (name, description) VALUES
('Admin', 'Full system access - manages users, categories, and all configurations'),
('Supervisor', 'Monitors complaint queues, handles escalations, generates reports'),
('Agent', 'Handles assigned complaints, updates status, resolves issues'),
('Customer', 'Registers complaints, tracks status, provides feedback');

-- ============================================================
-- SLA RULES
-- ============================================================
INSERT INTO sla_rules (priority, response_time_hours, resolution_time_hours) VALUES
('Low', 24, 72),
('Medium', 8, 48),
('High', 4, 24),
('Critical', 1, 8);

-- ============================================================
-- CATEGORIES
-- ============================================================
INSERT INTO categories (name, description) VALUES
('Billing Issues', 'Problems related to invoices, payments, or charges'),
('Service Disruption', 'Interruptions or outages in service delivery'),
('Product Defects', 'Defective or damaged product complaints'),
('Technical Problems', 'Software or hardware technical issues'),
('Delivery Delays', 'Late or missing deliveries'),
('Account Issues', 'Problems with account access or account settings'),
('Customer Service', 'Complaints about support staff behavior or service quality'),
('Refund Requests', 'Requests for refunds or returns');

-- ============================================================
-- USERS  (password for ALL: Admin@123)
-- bcrypt hash (10 rounds) for "Admin@123"
-- ============================================================
INSERT INTO users (name, email, password, phone, role_id) VALUES
('System Admin',    'admin@complainttracker.com',      '$2b$10$KB5JQLEeQ4kyTsjVvkaeyOdlhhBwUQMbLPiyj//wNZmulgjiQFDXq', '+1-555-0100', 1),
('Sarah Mitchell',  'supervisor@complainttracker.com', '$2b$10$KB5JQLEeQ4kyTsjVvkaeyOdlhhBwUQMbLPiyj//wNZmulgjiQFDXq', '+1-555-0101', 2),
('James Carter',    'agent1@complainttracker.com',     '$2b$10$KB5JQLEeQ4kyTsjVvkaeyOdlhhBwUQMbLPiyj//wNZmulgjiQFDXq', '+1-555-0102', 3),
('Emily Rodriguez', 'agent2@complainttracker.com',     '$2b$10$KB5JQLEeQ4kyTsjVvkaeyOdlhhBwUQMbLPiyj//wNZmulgjiQFDXq', '+1-555-0103', 3),
('John Smith',      'customer1@example.com',           '$2b$10$KB5JQLEeQ4kyTsjVvkaeyOdlhhBwUQMbLPiyj//wNZmulgjiQFDXq', '+1-555-0104', 4),
('Lisa Wang',       'customer2@example.com',           '$2b$10$KB5JQLEeQ4kyTsjVvkaeyOdlhhBwUQMbLPiyj//wNZmulgjiQFDXq', '+1-555-0105', 4);

-- All users above → password: Admin@123
