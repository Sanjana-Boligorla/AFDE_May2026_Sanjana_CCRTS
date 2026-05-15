const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

// GET /api/users  (Admin/Supervisor)
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.is_active, u.last_login, u.created_at,
             r.name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (role) { query += ' AND r.name = ?'; params.push(role); }
    if (search) { query += ' AND (u.name LIKE ? OR u.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    // Count
    const countQuery = query.replace(
      'SELECT u.id, u.name, u.email, u.phone, u.is_active, u.last_login, u.created_at,\n             r.name AS role',
      'SELECT COUNT(*) AS total'
    );
    const [countResult] = await pool.query(countQuery, params);

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [users] = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: countResult[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countResult[0].total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
const getUserById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.last_login, u.created_at,
              r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, data: { user: rows[0] } });
  } catch (error) {
    next(error);
  }
};

// POST /api/users  (Admin creates agents/supervisors)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', [role]);
    if (!roles.length) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone, role_id) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashed, phone || null, roles[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: { userId: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id  (Admin)
const updateUser = async (req, res, next) => {
  try {
    const { name, phone, role, is_active } = req.body;
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let roleId;
    if (role) {
      const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', [role]);
      if (!roles.length) return res.status(400).json({ success: false, message: 'Invalid role.' });
      roleId = roles[0].id;
    }

    await pool.query(
      `UPDATE users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        role_id = COALESCE(?, role_id),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, phone, roleId, is_active, id]
    );

    res.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id  (Admin - soft delete by deactivating)
const deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
    }

    await pool.query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);
    res.json({ success: true, message: 'User deactivated.' });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/agents  (list of agents for assignment - Admin/Supervisor)
const getAgents = async (req, res, next) => {
  try {
    const [agents] = await pool.query(
      `SELECT u.id, u.name, u.email,
              COUNT(c.id) AS active_complaints
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN complaints c ON c.assigned_to = u.id AND c.status NOT IN ('Resolved', 'Closed')
       WHERE r.name = 'Agent' AND u.is_active = TRUE
       GROUP BY u.id
       ORDER BY active_complaints ASC`,
    );
    res.json({ success: true, data: { agents } });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/profile  (own profile)
const getProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.last_login, u.created_at, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.user.id]
    );
    res.json({ success: true, data: { user: rows[0] } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/profile  (update own profile)
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    await pool.query('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?', [
      name, phone, req.user.id,
    ]);
    res.json({ success: true, message: 'Profile updated.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deactivateUser, getAgents, getProfile, updateProfile };
