/**
 * Database Seeder
 * Run: node src/utils/runSeed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, testConnection } = require('../config/db');

const seed = async () => {
  await testConnection();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    console.log('🌱 Starting database seed...\n');

    // Roles
    const roles = [
      ['Admin',      'Full system access'],
      ['Supervisor', 'Monitor queues and handle escalations'],
      ['Agent',      'Handle assigned complaints'],
      ['Customer',   'Submit and track complaints'],
    ];
    for (const [name, desc] of roles) {
      await conn.query('INSERT IGNORE INTO roles (name, description) VALUES (?, ?)', [name, desc]);
    }
    console.log('✅ Roles seeded');

    // SLA Rules
    const slaRules = [
      ['Low',      24, 72],
      ['Medium',   8,  48],
      ['High',     4,  24],
      ['Critical', 1,  8],
    ];
    for (const [priority, response, resolution] of slaRules) {
      await conn.query(
        'INSERT IGNORE INTO sla_rules (priority, response_time_hours, resolution_time_hours) VALUES (?, ?, ?)',
        [priority, response, resolution]
      );
    }
    console.log('✅ SLA rules seeded');

    // Categories
    const categories = [
      ['Billing Issues',      'Problems related to invoices, payments, or charges'],
      ['Service Disruption',  'Interruptions or outages in service delivery'],
      ['Product Defects',     'Defective or damaged product complaints'],
      ['Technical Problems',  'Software or hardware technical issues'],
      ['Delivery Delays',     'Late or missing deliveries'],
      ['Account Issues',      'Problems with account access or settings'],
      ['Customer Service',    'Complaints about support staff behavior'],
      ['Refund Requests',     'Requests for refunds or returns'],
    ];
    for (const [name, desc] of categories) {
      await conn.query('INSERT IGNORE INTO categories (name, description) VALUES (?, ?)', [name, desc]);
    }
    console.log('✅ Categories seeded');

    // Users
    const password = 'Admin@123';
    const hashed   = await bcrypt.hash(password, 12);

    const [roleRows] = await conn.query('SELECT id, name FROM roles');
    const roleMap = Object.fromEntries(roleRows.map(r => [r.name, r.id]));

    const users = [
      ['System Admin',    'admin@complainttracker.com',      roleMap['Admin'],      '+1-555-0100'],
      ['Sarah Mitchell',  'supervisor@complainttracker.com', roleMap['Supervisor'], '+1-555-0101'],
      ['James Carter',    'agent1@complainttracker.com',     roleMap['Agent'],      '+1-555-0102'],
      ['Emily Rodriguez', 'agent2@complainttracker.com',     roleMap['Agent'],      '+1-555-0103'],
      ['John Smith',      'customer1@example.com',           roleMap['Customer'],   '+1-555-0104'],
      ['Lisa Wang',       'customer2@example.com',           roleMap['Customer'],   '+1-555-0105'],
    ];

    for (const [name, email, roleId, phone] of users) {
      const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
      if (!existing.length) {
        await conn.query(
          'INSERT INTO users (name, email, password, phone, role_id) VALUES (?, ?, ?, ?, ?)',
          [name, email, hashed, phone, roleId]
        );
        console.log(`  👤 Created: ${name} (${email})`);
      } else {
        console.log(`  ⏭️  Skipped (exists): ${email}`);
      }
    }
    console.log('✅ Users seeded');

    await conn.commit();

    console.log(`
✨ Seed complete! All demo users have password: ${password}
`);
  } catch (error) {
    await conn.rollback();
    console.error('❌ Seed failed:', error.message);
    throw error;
  } finally {
    conn.release();
    process.exit(0);
  }
};

seed();
