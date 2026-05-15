const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/categories
router.get('/', authenticate, async (req, res, next) => {
  try {
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE is_active = TRUE ORDER BY name'
    );
    res.json({ success: true, data: { categories } });
  } catch (error) {
    next(error);
  }
});

// POST /api/categories (Admin)
router.post('/', authenticate, authorize('Admin'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description]
    );
    res.status(201).json({ success: true, message: 'Category created.', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/categories/:id (Admin)
router.put('/:id', authenticate, authorize('Admin'), async (req, res, next) => {
  try {
    const { name, description, is_active } = req.body;
    await pool.query(
      'UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description), is_active = COALESCE(?, is_active) WHERE id = ?',
      [name, description, is_active, req.params.id]
    );
    res.json({ success: true, message: 'Category updated.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
