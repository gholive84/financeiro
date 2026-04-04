const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/credit-cards
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM credit_cards ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/credit-cards
router.post('/', async (req, res, next) => {
  try {
    const { name, bank, color = '#FF6B00', closing_day, due_day, credit_limit } = req.body;
    const [result] = await db.query(
      'INSERT INTO credit_cards (name, bank, color, closing_day, due_day, credit_limit) VALUES (?, ?, ?, ?, ?, ?)',
      [name, bank, color, closing_day, due_day, credit_limit]
    );
    const [rows] = await db.query('SELECT * FROM credit_cards WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/credit-cards/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, bank, color, closing_day, due_day, credit_limit } = req.body;
    await db.query(
      'UPDATE credit_cards SET name=?, bank=?, color=?, closing_day=?, due_day=?, credit_limit=? WHERE id=?',
      [name, bank, color, closing_day, due_day, credit_limit, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM credit_cards WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cartão não encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/credit-cards/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM credit_cards WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Cartão não encontrado' });
    res.json({ message: 'Cartão deletado' });
  } catch (err) { next(err); }
});

module.exports = router;
