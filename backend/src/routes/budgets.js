const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/budgets?month=&year=
router.get('/', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const [rows] = await db.query(`
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.category_id = b.category_id
            AND MONTH(t.date) = b.month AND YEAR(t.date) = b.year
            AND t.type = 'expense' AND t.status = 'paid'
        ), 0) as amount_spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.month = ? AND b.year = ?
      ORDER BY c.name
    `, [month, year]);

    res.json(rows.map(r => ({
      ...r,
      amount_planned: parseFloat(r.amount_planned),
      amount_spent: parseFloat(r.amount_spent),
    })));
  } catch (err) { next(err); }
});

// POST /api/budgets
router.post('/', async (req, res, next) => {
  try {
    const { category_id, month, year, amount_planned } = req.body;
    await db.query(
      `INSERT INTO budgets (category_id, month, year, amount_planned)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount_planned = ?`,
      [category_id, month, year, amount_planned, amount_planned]
    );
    const [rows] = await db.query('SELECT * FROM budgets WHERE category_id=? AND month=? AND year=?', [category_id, month, year]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM budgets WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json({ message: 'Orçamento deletado' });
  } catch (err) { next(err); }
});

module.exports = router;
