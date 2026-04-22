const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const { type } = req.query;
    let sql = 'SELECT * FROM categories WHERE workspace_id = ?';
    const params = [req.workspace_id];
    if (type) { sql += ' AND type = ?'; params.push(type); }
    sql += ' ORDER BY COALESCE(parent_id, id), parent_id IS NOT NULL, name';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/categories
router.post('/', async (req, res, next) => {
  try {
    const { name, icon, color = '#6366F1', type, parent_id } = req.body;
    const [result] = await db.query(
      'INSERT INTO categories (name, icon, color, type, parent_id, workspace_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, icon, color, type, parent_id || null, req.workspace_id]
    );
    const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, icon, color, type, parent_id } = req.body;
    await db.query(
      'UPDATE categories SET name=?, icon=?, color=?, type=?, parent_id=? WHERE id=? AND workspace_id=?',
      [name, icon, color, type, parent_id || null, req.params.id, req.workspace_id]
    );
    const [rows] = await db.query('SELECT * FROM categories WHERE id = ? AND workspace_id = ?', [req.params.id, req.workspace_id]);
    if (!rows.length) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res, next) => {
  try {
    // Remove parent_id das subcategorias antes de deletar
    await db.query('UPDATE categories SET parent_id = NULL WHERE parent_id = ? AND workspace_id = ?', [req.params.id, req.workspace_id]);
    const [result] = await db.query('DELETE FROM categories WHERE id = ? AND workspace_id = ?', [req.params.id, req.workspace_id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Categoria não encontrada' });
    res.json({ message: 'Categoria deletada' });
  } catch (err) { next(err); }
});

module.exports = router;
