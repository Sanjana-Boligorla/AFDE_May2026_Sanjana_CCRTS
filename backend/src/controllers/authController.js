const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendEmail, emailTemplates } = require('../utils/email');

// POST /api/auth/register  (Customer self-registration only)
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if email exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    // Get Customer role ID
    const [roles] = await pool.query("SELECT id FROM roles WHERE name = 'Customer'");
    if (!roles.length) {
      return res.status(500).json({ success: false, message: 'Customer role not found. Run seed first.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone, role_id) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, roles[0].id]
    );

    const userId = result.insertId;
    const token = generateAccessToken({ id: userId, role: 'Customer' });
    const refreshToken = generateRefreshToken({ id: userId });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        user: { id: userId, name, email, role: 'Customer' },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.password, u.phone, u.is_active, u.role_id,
              r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    },
  });
};

// POST /api/auth/refresh-token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = verifyRefreshToken(token);
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.is_active, r.name AS role
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const user = rows[0];
    const newAccessToken = generateAccessToken({ id: user.id, role: user.role });

    res.json({ success: true, data: { token: newAccessToken } });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const [rows] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email]);
    // Always respond with success to prevent email enumeration
    if (!rows.length) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens
    await pool.query('UPDATE password_reset_tokens SET is_used = TRUE WHERE user_id = ?', [user.id]);

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const { subject, html } = emailTemplates.passwordReset(user.name, resetUrl);
    await sendEmail({ to: email, subject, html });

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const [rows] = await pool.query(
      `SELECT prt.*, u.id AS uid, u.name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = ? AND prt.is_used = FALSE AND prt.expires_at > NOW()`,
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or expired.' });
    }

    const hashed = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, rows[0].uid]);
    await pool.query('UPDATE password_reset_tokens SET is_used = TRUE WHERE id = ?', [rows[0].id]);

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, refreshToken, forgotPassword, resetPassword, changePassword };
