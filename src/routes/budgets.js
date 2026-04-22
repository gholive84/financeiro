const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/budgets?month=&year= OR ?year= (all months)
router.get('/', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const yearOnly = year && !month;
    const [rows] = await db.query(`
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.category_id = b.category_id
            AND MONTH(t.date) = b.month AND YEAR(t.date) = b.year
            AND t.type = 'expense' AND t.status = 'paid'
            AND t.workspace_id = b.workspace_id
        ), 0) as amount_spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.workspace_id = ? AND ${yearOnly ? 'b.year = ?' : 'b.month = ? AND b.year = ?'}
      ORDER BY b.month, c.name
    `, yearOnly ? [req.workspace_id, year] : [req.workspace_id, month, year]);

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
      `INSERT INTO budgets (category_id, month, year, amount_planned, workspace_id)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount_planned = ?`,
      [category_id, month, year, amount_planned, req.workspace_id, amount_planned]
    );
    const [rows] = await db.query('SELECT * FROM budgets WHERE category_id=? AND month=? AND year=? AND workspace_id=?', [category_id, month, year, req.workspace_id]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM budgets WHERE id = ? AND workspace_id = ?', [req.params.id, req.workspace_id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json({ message: 'Orçamento deletado' });
  } catch (err) { next(err); }
});

module.exports = router;
