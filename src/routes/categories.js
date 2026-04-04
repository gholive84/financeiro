const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM categories';
    const params = [];
    if (type) { sql += ' WHERE type = ?'; params.push(type); }
    sql += ' ORDER BY name';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/categories
router.post('/', async (req, res, next) => {
  try {
    const { name, icon, color = '#6366F1', type } = req.body;
    const [result] = await db.query(
      'INSERT INTO categories (name, icon, color, type) VALUES (?, ?, ?, ?)',
      [name, icon, color, type]
    );
    const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, icon, color, type } = req.body;
    await db.query(
      'UPDATE categories SET name=?, icon=?, color=?, type=? WHERE id=?',
      [name, icon, color, type, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json({ message: 'Categoria deletada' });
  } catch (err) { next(err); }
});

module.exports = router;
