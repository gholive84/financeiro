const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/credit-cards
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM credit_cards WHERE workspace_id = ? ORDER BY name', [req.workspace_id]);
    // Garante is_default como booleano mesmo se a coluna ainda não existir
    const cards = rows.map(c => ({ ...c, is_default: !!c.is_default }));
    res.json(cards.sort((a, b) => b.is_default - a.is_default));
  } catch (err) { next(err); }
});

// POST /api/credit-cards
router.post('/', async (req, res, next) => {
  try {
    const { name, bank, color = '#FF6B00', closing_day, due_day, credit_limit, is_default = false } = req.body;

    let result;
    try {
      if (is_default) await db.query('UPDATE credit_cards SET is_default = 0 WHERE workspace_id = ?', [req.workspace_id]);
      [result] = await db.query(
        'INSERT INTO credit_cards (name, bank, color, closing_day, due_day, credit_limit, is_default, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, bank, color, closing_day, due_day, credit_limit, is_default ? 1 : 0, req.workspace_id]
      );
    } catch {
      [result] = await db.query(
        'INSERT INTO credit_cards (name, bank, color, closing_day, due_day, credit_limit, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, bank, color, closing_day, due_day, credit_limit, req.workspace_id]
      );
    }

    const [rows] = await db.query('SELECT * FROM credit_cards WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...rows[0], is_default: !!rows[0].is_default });
  } catch (err) { next(err); }
});

// PUT /api/credit-cards/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, bank, color, closing_day, due_day, credit_limit, is_default } = req.body;

    try {
      if (is_default) await db.query('UPDATE credit_cards SET is_default = 0 WHERE id != ? AND workspace_id = ?', [req.params.id, req.workspace_id]);
      await db.query(
        'UPDATE credit_cards SET name=?, bank=?, color=?, closing_day=?, due_day=?, credit_limit=?, is_default=? WHERE id=? AND workspace_id=?',
        [name, bank, color, closing_day, due_day, credit_limit, is_default ? 1 : 0, req.params.id, req.workspace_id]
      );
    } catch {
      await db.query(
        'UPDATE credit_cards SET name=?, bank=?, color=?, closing_day=?, due_day=?, credit_limit=? WHERE id=? AND workspace_id=?',
        [name, bank, color, closing_day, due_day, credit_limit, req.params.id, req.workspace_id]
      );
    }

    const [rows] = await db.query('SELECT * FROM credit_cards WHERE id = ? AND workspace_id = ?', [req.params.id, req.workspace_id]);
    if (!rows.length) return res.status(404).json({ error: 'Cartão não encontrado' });
    res.json({ ...rows[0], is_default: !!rows[0].is_default });
  } catch (err) { next(err); }
});

// DELETE /api/credit-cards/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM credit_cards WHERE id = ? AND workspace_id = ?', [req.params.id, req.workspace_id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Cartão não encontrado' });
    res.json({ message: 'Cartão deletado' });
  } catch (err) { next(err); }
});

module.exports = router;
