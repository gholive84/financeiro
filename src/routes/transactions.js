const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const transactionSelect = `
  SELECT
    t.*,
    c.name as category_name, c.icon as category_icon, c.color as category_color, c.parent_id as category_parent_id,
    pc.name as category_parent_name,
    a.name as account_name, a.type as account_type, a.color as account_color,
    cc.name as credit_card_name, cc.color as credit_card_color, cc.bank as credit_card_bank,
    u.username as user_username, u.name as user_name
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  LEFT JOIN categories pc ON c.parent_id = pc.id
  LEFT JOIN accounts a ON t.account_id = a.id
  LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
  LEFT JOIN users u ON t.user_id = u.id
`;

function formatTransaction(row) {
  return {
    id: row.id,
    description: row.description,
    amount: parseFloat(row.amount),
    date: row.date,
    type: row.type,
    status: row.status,
    notes: row.notes,
    is_recurring: row.is_recurring,
    recurring_template_id: row.recurring_template_id,
    category: row.category_id ? {
      id: row.category_id,
      name: row.category_name,
      icon: row.category_icon,
      color: row.category_color,
      parent_id: row.category_parent_id || null,
      parent_name: row.category_parent_name || null,
    } : null,
    account: row.account_id ? {
      id: row.account_id,
      name: row.account_name,
      type: row.account_type,
      color: row.account_color,
    } : null,
    credit_card: row.credit_card_id ? {
      id: row.credit_card_id,
      name: row.credit_card_name,
      color: row.credit_card_color,
      bank: row.credit_card_bank,
    } : null,
    user: row.user_id ? { id: row.user_id, username: row.user_username, name: row.user_name } : null,
    installment_total: row.installment_total || null,
    installment_current: row.installment_current || null,
    installment_group_id: row.installment_group_id || null,
  };
}

// GET /api/transactions
router.get('/', async (req, res, next) => {
  try {
    const { month, year, type, account_id, credit_card_id, status } = req.query;
    let sql = transactionSelect + ' WHERE 1=1';
    const params = [];

    if (month && year) {
      sql += ' AND MONTH(t.date) = ? AND YEAR(t.date) = ?';
      params.push(month, year);
    }
    if (type) { sql += ' AND t.type = ?'; params.push(type); }
    if (account_id) { sql += ' AND t.account_id = ?'; params.push(account_id); }
    if (credit_card_id) { sql += ' AND t.credit_card_id = ?'; params.push(credit_card_id); }
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (req.query.category_id) { sql += ' AND (t.category_id = ? OR t.category_id IN (SELECT id FROM categories WHERE parent_id = ?))'; params.push(req.query.category_id, req.query.category_id); }

    sql += ' ORDER BY t.date DESC, t.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows.map(formatTransaction));
  } catch (err) { next(err); }
});

// GET /api/transactions/calendar/:year/:month
router.get('/calendar/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const sql = transactionSelect + ' WHERE YEAR(t.date) = ? AND MONTH(t.date) = ? ORDER BY t.date, t.created_at';
    const [rows] = await db.query(sql, [year, month]);

    const calendar = {};
    for (const row of rows) {
      const dateKey = row.date instanceof Date
        ? row.date.toISOString().split('T')[0]
        : String(row.date).split('T')[0];

      if (!calendar[dateKey]) {
        calendar[dateKey] = { total_income: 0, total_expense: 0, transactions: [] };
      }
      const amount = parseFloat(row.amount);
      if (row.type === 'income') calendar[dateKey].total_income += amount;
      else calendar[dateKey].total_expense += amount;
      calendar[dateKey].transactions.push(formatTransaction(row));
    }
    res.json(calendar);
  } catch (err) { next(err); }
});

// POST /api/transactions
router.post('/', async (req, res, next) => {
  try {
    const { description, amount, date, type, account_id, credit_card_id, category_id, is_recurring, recurring_template_id, status, notes, installments } = req.body;

    const numInstallments = parseInt(installments) || 1;

    // Parcelado: cria N transações
    if (numInstallments > 1 && credit_card_id) {
      const groupId = uuidv4();
      const installmentAmount = parseFloat((amount / numInstallments).toFixed(2));
      const [baseDate] = date.split('T');
      const [y, m, d] = baseDate.split('-').map(Number);
      const insertedIds = [];

      for (let i = 0; i < numInstallments; i++) {
        const installDate = new Date(y, m - 1 + i, d);
        const installDateStr = installDate.toISOString().split('T')[0];
        const desc = `${description} (${i + 1}/${numInstallments})`;
        const [result] = await db.query(
          `INSERT INTO transactions (description, amount, date, type, account_id, credit_card_id, category_id, status, notes, user_id, installment_total, installment_current, installment_group_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [desc, installmentAmount, installDateStr, type, null, credit_card_id, category_id || null, 'pending', notes || null, req.user?.id || null, numInstallments, i + 1, groupId]
        );
        insertedIds.push(result.insertId);
      }

      const [rows] = await db.query(transactionSelect + ' WHERE t.id = ?', [insertedIds[0]]);
      return res.status(201).json(formatTransaction(rows[0]));
    }

    // Transação simples
    const [result] = await db.query(
      `INSERT INTO transactions (description, amount, date, type, account_id, credit_card_id, category_id, is_recurring, recurring_template_id, status, notes, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [description, amount, date, type, account_id || null, credit_card_id || null, category_id || null, is_recurring || false, recurring_template_id || null, status || 'paid', notes || null, req.user?.id || null]
    );

    if ((status === 'paid' || !status) && account_id) {
      const delta = type === 'income' ? amount : -amount;
      await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, account_id]);
    }

    const [rows] = await db.query(transactionSelect + ' WHERE t.id = ?', [result.insertId]);
    res.status(201).json(formatTransaction(rows[0]));
  } catch (err) { next(err); }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { description, amount, date, type, account_id, credit_card_id, category_id, is_recurring, status, notes } = req.body;

    // Revert old balance
    const [old] = await db.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Transação não encontrada' });
    const prev = old[0];

    if (prev.status === 'paid' && prev.account_id) {
      const revert = prev.type === 'income' ? -prev.amount : parseFloat(prev.amount);
      await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [revert, prev.account_id]);
    }

    await db.query(
      `UPDATE transactions SET description=?, amount=?, date=?, type=?, account_id=?, credit_card_id=?, category_id=?, is_recurring=?, status=?, notes=? WHERE id=?`,
      [description, amount, date, type, account_id || null, credit_card_id || null, category_id || null, is_recurring || false, status || 'paid', notes || null, req.params.id]
    );

    // Apply new balance
    if ((status === 'paid' || !status) && account_id) {
      const delta = type === 'income' ? amount : -amount;
      await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, account_id]);
    }

    const [rows] = await db.query(transactionSelect + ' WHERE t.id = ?', [req.params.id]);
    res.json(formatTransaction(rows[0]));
  } catch (err) { next(err); }
});

// DELETE /api/transactions/:id?all=true (deleta todas as parcelas do grupo)
router.delete('/:id', async (req, res, next) => {
  try {
    const [old] = await db.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Transação não encontrada' });
    const prev = old[0];

    if (req.query.all === 'true' && prev.installment_group_id) {
      // Deleta todas as parcelas do grupo
      const [group] = await db.query('SELECT * FROM transactions WHERE installment_group_id = ?', [prev.installment_group_id]);
      for (const t of group) {
        if (t.status === 'paid' && t.account_id) {
          const revert = t.type === 'income' ? -parseFloat(t.amount) : parseFloat(t.amount);
          await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [revert, t.account_id]);
        }
      }
      await db.query('DELETE FROM transactions WHERE installment_group_id = ?', [prev.installment_group_id]);
      return res.json({ message: 'Todas as parcelas deletadas', deleted: group.length });
    }

    // Deleta apenas esta parcela
    if (prev.status === 'paid' && prev.account_id) {
      const revert = prev.type === 'income' ? -parseFloat(prev.amount) : parseFloat(prev.amount);
      await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [revert, prev.account_id]);
    }
    await db.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Transação deletada' });
  } catch (err) { next(err); }
});

module.exports = router;
