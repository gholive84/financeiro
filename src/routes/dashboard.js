const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/dashboard
router.get('/', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Total balance
    const [[{ total_balance }]] = await db.query('SELECT COALESCE(SUM(balance), 0) as total_balance FROM accounts');

    // Accounts
    const [accounts] = await db.query('SELECT * FROM accounts ORDER BY name');

    // Monthly income & expense
    const [[monthlyStats]] = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income' AND status='paid' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type='expense' AND status='paid' THEN amount ELSE 0 END), 0) as total_expense
      FROM transactions
      WHERE MONTH(date) = ? AND YEAR(date) = ?
    `, [month, year]);

    // Budget progress
    const [budgets] = await db.query(`
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

    // Savings boxes
    const [savings] = await db.query('SELECT * FROM savings_boxes ORDER BY created_at DESC');

    // Recent transactions (current month only)
    const [recentTransactions] = await db.query(`
      SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
        a.name as account_name, cc.name as credit_card_name, cc.color as credit_card_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
      WHERE MONTH(t.date) = ? AND YEAR(t.date) = ?
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 10
    `, [month, year]);

    res.json({
      total_balance: parseFloat(total_balance),
      accounts: accounts.map(a => ({ ...a, balance: parseFloat(a.balance) })),
      monthly: {
        month, year,
        total_income: parseFloat(monthlyStats.total_income),
        total_expense: parseFloat(monthlyStats.total_expense),
      },
      budgets: budgets.map(b => ({
        ...b,
        amount_planned: parseFloat(b.amount_planned),
        amount_spent: parseFloat(b.amount_spent),
      })),
      savings: savings.map(s => ({
        ...s,
        current_amount: parseFloat(s.current_amount),
        target_amount: s.target_amount ? parseFloat(s.target_amount) : null,
      })),
      recent_transactions: recentTransactions,
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/expenses-chart?month=4&year=2026
router.get('/expenses-chart', async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();

    const [rows] = await db.query(`
      SELECT
        t.category_id,
        COALESCE(c.name, 'Sem categoria') as category,
        COALESCE(c.color, '#94a3b8') as color,
        COALESCE(SUM(t.amount), 0) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense'
        AND t.status = 'paid'
        AND MONTH(t.date) = ?
        AND YEAR(t.date) = ?
      GROUP BY t.category_id, c.name, c.color
      ORDER BY total DESC
    `, [month, year]);

    res.json({
      month, year,
      data: rows.map(r => ({ category: r.category, color: r.color, total: parseFloat(r.total) })),
    });
  } catch (err) { next(err); }
});

module.exports = router;
