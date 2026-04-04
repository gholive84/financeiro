const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/accounts
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM accounts ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/accounts
router.post('/', async (req, res, next) => {
  try {
    const { name, type, balance = 0, color = '#6366F1', icon } = req.body;
    const [result] = await db.query(
      'INSERT INTO accounts (name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?)',
      [name, type, balance, color, icon]
    );
    const [rows] = await db.query('SELECT * FROM accounts WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, type, balance, color, icon } = req.body;
    await db.query(
      'UPDATE accounts SET name=?, type=?, balance=?, color=?, icon=? WHERE id=?',
      [name, type, balance, color, icon, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM accounts WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM accounts WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json({ message: 'Conta deletada' });
  } catch (err) { next(err); }
});

module.exports = router;
