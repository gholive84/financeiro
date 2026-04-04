const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/savings
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM savings_boxes ORDER BY created_at DESC');
    res.json(rows.map(r => ({ ...r, current_amount: parseFloat(r.current_amount), target_amount: r.target_amount ? parseFloat(r.target_amount) : null })));
  } catch (err) { next(err); }
});

// POST /api/savings
router.post('/', async (req, res, next) => {
  try {
    const { name, icon, color = '#10B981', target_amount, deadline } = req.body;
    const [result] = await db.query(
      'INSERT INTO savings_boxes (name, icon, color, target_amount, deadline) VALUES (?, ?, ?, ?, ?)',
      [name, icon, color, target_amount || null, deadline || null]
    );
    const [rows] = await db.query('SELECT * FROM savings_boxes WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/savings/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, icon, color, target_amount, deadline } = req.body;
    await db.query(
      'UPDATE savings_boxes SET name=?, icon=?, color=?, target_amount=?, deadline=? WHERE id=?',
      [name, icon, color, target_amount || null, deadline || null, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM savings_boxes WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Caixinha não encontrada' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/savings/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await db.query('DELETE FROM savings_boxes WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Caixinha não encontrada' });
    res.json({ message: 'Caixinha deletada' });
  } catch (err) { next(err); }
});

// GET /api/savings/:id/movements
router.get('/:id/movements', async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM savings_movements WHERE savings_box_id = ? ORDER BY date DESC, id DESC',
      [req.params.id]
    );
    res.json(rows.map(r => ({ ...r, amount: parseFloat(r.amount) })));
  } catch (err) { next(err); }
});

// POST /api/savings/:id/movements
router.post('/:id/movements', async (req, res, next) => {
  try {
    const { amount, description, date, type } = req.body;
    const boxId = req.params.id;

    // Check box exists
    const [boxes] = await db.query('SELECT * FROM savings_boxes WHERE id = ?', [boxId]);
    if (!boxes.length) return res.status(404).json({ error: 'Caixinha não encontrada' });

    const [result] = await db.query(
      'INSERT INTO savings_movements (savings_box_id, amount, description, date, type) VALUES (?, ?, ?, ?, ?)',
      [boxId, amount, description || null, date, type]
    );

    // Update current_amount
    const delta = type === 'deposit' ? amount : -amount;
    await db.query('UPDATE savings_boxes SET current_amount = current_amount + ? WHERE id = ?', [delta, boxId]);

    const [rows] = await db.query('SELECT * FROM savings_movements WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
