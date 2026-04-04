const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'financeiro_secret_key';

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND active = TRUE', [username]);
    if (!rows.length) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Usuário ou senha incorretos' });

    const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, username, name, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/auth/users — admin only
router.get('/users', auth, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT id, username, name, role, active, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/auth/users — admin only
router.post('/users', auth, adminOnly, async (req, res, next) => {
  try {
    const { username, password, name, role = 'user' } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)',
      [username, hash, name, role]
    );
    const [rows] = await db.query('SELECT id, username, name, role, active, created_at FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Usuário já existe' });
    next(err);
  }
});

// PUT /api/auth/users/:id — admin only
router.put('/users/:id', auth, adminOnly, async (req, res, next) => {
  try {
    const { name, role, active, password } = req.body;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE users SET name=?, role=?, active=?, password_hash=? WHERE id=?', [name, role, active, hash, req.params.id]);
    } else {
      await db.query('UPDATE users SET name=?, role=?, active=? WHERE id=?', [name, role, active, req.params.id]);
    }
    const [rows] = await db.query('SELECT id, username, name, role, active, created_at FROM users WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/auth/users/:id — admin only
router.delete('/users/:id', auth, adminOnly, async (req, res, next) => {
  try {
    if (req.params.id == req.user.id) return res.status(400).json({ error: 'Não pode deletar sua própria conta' });
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'Usuário deletado' });
  } catch (err) { next(err); }
});

module.exports = router;
