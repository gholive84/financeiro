const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/tags
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM tags WHERE workspace_id = ? ORDER BY name', [req.workspace_id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/tags
router.post('/', async (req, res, next) => {
  try {
    const { name, color = '#6366F1' } = req.body;
    const [result] = await db.query('INSERT INTO tags (name, color, workspace_id) VALUES (?, ?, ?)', [name, color, req.workspace_id]);
    const [rows] = await db.query('SELECT * FROM tags WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/tags/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    await db.query('UPDATE tags SET name=?, color=? WHERE id=? AND workspace_id=?', [name, color, req.params.id, req.workspace_id]);
    const [rows] = await db.query('SELECT * FROM tags WHERE id = ? AND workspace_id = ?', [req.params.id, req.workspace_id]);
    if (!rows.length) return res.status(404).json({ error: 'Tag não encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/tags/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM tags WHERE id = ? AND workspace_id = ?', [req.params.id, req.workspace_id]);
    res.json({ message: 'Tag deletada' });
  } catch (err) { next(err); }
});

module.exports = router;
