const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminOnly } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// POST /api/backup — gera e salva no servidor
router.post('/', adminOnly, async (req, res, next) => {
  try {
    const [transactions]     = await db.query('SELECT * FROM transactions ORDER BY date DESC');
    const [categories]       = await db.query('SELECT * FROM categories');
    const [accounts]         = await db.query('SELECT * FROM accounts');
    const [credit_cards]     = await db.query('SELECT * FROM credit_cards');
    const [tags]             = await db.query('SELECT * FROM tags');
    const [transaction_tags] = await db.query('SELECT * FROM transaction_tags');
    const [budgets]          = await db.query('SELECT * FROM budgets');
    const [savings]          = await db.query('SELECT * FROM savings');
    const [users]            = await db.query('SELECT id, username, name, role, created_at FROM users');

    const counts = {
      transactions: transactions.length,
      categories: categories.length,
      accounts: accounts.length,
      credit_cards: credit_cards.length,
      tags: tags.length,
      budgets: budgets.length,
      savings: savings.length,
      users: users.length,
    };

    const backup = {
      exported_at: new Date().toISOString(),
      version: 1,
      counts,
      data: { transactions, categories, accounts, credit_cards, tags, transaction_tags, budgets, savings, users },
    };

    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `financeiro-backup-${date}.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    res.json({ ok: true, filename, counts });
  } catch (err) { next(err); }
});

// GET /api/backup — lista backups salvos
router.get('/', adminOnly, (req, res, next) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { filename: f, size: stat.size, created_at: stat.mtime };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(files);
  } catch (err) { next(err); }
});

// GET /api/backup/:filename — download de um backup
router.get('/:filename', adminOnly, (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Arquivo não encontrado' });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filepath);
  } catch (err) { next(err); }
});

// DELETE /api/backup/:filename — remove um backup
router.delete('/:filename', adminOnly, (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filepath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Arquivo não encontrado' });
    fs.unlinkSync(filepath);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
