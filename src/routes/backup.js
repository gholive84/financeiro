const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminOnly } = require('../middleware/auth');

// GET /api/backup — admin only, returns full JSON export
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const [transactions]     = await db.query('SELECT * FROM transactions ORDER BY date DESC');
    const [categories]       = await db.query('SELECT * FROM categories');
    const [accounts]         = await db.query('SELECT * FROM accounts');
    const [credit_cards]     = await db.query('SELECT * FROM credit_cards');
    const [tags]             = await db.query('SELECT * FROM tags');
    const [transaction_tags] = await db.query('SELECT * FROM transaction_tags');
    const [budgets]          = await db.query('SELECT * FROM budgets');
    const [savings]          = await db.query('SELECT * FROM savings');
    const [users]            = await db.query('SELECT id, username, name, email, role, created_at FROM users');

    const backup = {
      exported_at: new Date().toISOString(),
      version: 1,
      counts: {
        transactions: transactions.length,
        categories: categories.length,
        accounts: accounts.length,
        credit_cards: credit_cards.length,
        tags: tags.length,
        budgets: budgets.length,
        savings: savings.length,
        users: users.length,
      },
      data: { transactions, categories, accounts, credit_cards, tags, transaction_tags, budgets, savings, users },
    };

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="financeiro-backup-${date}.json"`);
    res.json(backup);
  } catch (err) { next(err); }
});

module.exports = router;
