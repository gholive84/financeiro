const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/accounts
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM accounts ORDER BY name');
    // Garante is_default como booleano mesmo se a coluna ainda não existir
    const accounts = rows.map(a => ({ ...a, is_default: !!a.is_default }));
    res.json(accounts.sort((a, b) => b.is_default - a.is_default));
  } catch (err) { next(err); }
});

// POST /api/accounts
router.post('/', async (req, res, next) => {
  try {
    const { name, type, balance = 0, color = '#6366F1', icon, is_default = false } = req.body;

    // Tenta usar is_default; se a coluna não existir, insere sem ela
    let result;
    try {
      if (is_default) await db.query('UPDATE accounts SET is_default = 0');
      [result] = await db.query(
        'INSERT INTO accounts (name, type, balance, color, icon, is_default) VALUES (?, ?, ?, ?, ?, ?)',
        [name, type, balance, color, icon, is_default ? 1 : 0]
      );
    } catch {
      [result] = await db.query(
        'INSERT INTO accounts (name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?)',
        [name, type, balance, color, icon]
      );
    }

    const [rows] = await db.query('SELECT * FROM accounts WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...rows[0], is_default: !!rows[0].is_default });
  } catch (err) { next(err); }
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, type, balance, color, icon, is_default } = req.body;

    // Tenta atualizar com is_default; se a coluna não existir, atualiza sem ela
    try {
      if (is_default) await db.query('UPDATE accounts SET is_default = 0 WHERE id != ?', [req.params.id]);
      await db.query(
        'UPDATE accounts SET name=?, type=?, balance=?, color=?, icon=?, is_default=? WHERE id=?',
        [name, type, balance, color, icon, is_default ? 1 : 0, req.params.id]
      );
    } catch {
      await db.query(
        'UPDATE accounts SET name=?, type=?, balance=?, color=?, icon=? WHERE id=?',
        [name, type, balance, color, icon, req.params.id]
      );
    }

    const [rows] = await db.query('SELECT * FROM accounts WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json({ ...rows[0], is_default: !!rows[0].is_default });
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
