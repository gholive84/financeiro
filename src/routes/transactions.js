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
    expense_nature: row.expense_nature || null,
    fixed_group_id: row.fixed_group_id || null,
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
    tags: [],
  };
}

async function attachTags(transactions) {
  if (!transactions.length) return transactions;
  const ids = transactions.map(t => t.id);
  try {
    const placeholders = ids.map(() => '?').join(',');
    const [tagRows] = await db.query(
      `SELECT tt.transaction_id, tg.id, tg.name, tg.color
       FROM transaction_tags tt JOIN tags tg ON tt.tag_id = tg.id
       WHERE tt.transaction_id IN (${placeholders})`,
      ids
    );
    const map = {};
    for (const tr of tagRows) {
      if (!map[tr.transaction_id]) map[tr.transaction_id] = [];
      map[tr.transaction_id].push({ id: tr.id, name: tr.name, color: tr.color });
    }
    return transactions.map(t => ({ ...t, tags: map[t.id] || [] }));
  } catch {
    return transactions;
  }
}

async function setTags(transactionId, tagIds) {
  try {
    await db.query('DELETE FROM transaction_tags WHERE transaction_id = ?', [transactionId]);
    for (const tagId of (tagIds || [])) {
      await db.query('INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)', [transactionId, tagId]);
    }
  } catch { /* tags table may not exist yet */ }
}

// GET /api/transactions
router.get('/', async (req, res, next) => {
  try {
    const { month, year, type, account_id, credit_card_id, status, start_date, end_date } = req.query;
    let sql = transactionSelect + ' WHERE 1=1';
    const params = [];

    if (start_date && end_date) {
      sql += ' AND t.date >= ? AND t.date <= ?';
      params.push(start_date, end_date);
    } else if (month && year) {
      sql += ' AND MONTH(t.date) = ? AND YEAR(t.date) = ?';
      params.push(month, year);
    }
    if (type) { sql += ' AND t.type = ?'; params.push(type); }
    if (account_id) { sql += ' AND t.account_id = ?'; params.push(account_id); }
    if (credit_card_id) { sql += ' AND t.credit_card_id = ?'; params.push(credit_card_id); }
    if (status) { sql += ' AND t.status = ?'; params.push(status); }
    if (req.query.category_id === 'none') { sql += ' AND t.category_id IS NULL'; }
    else if (req.query.category_id) { sql += ' AND (t.category_id = ? OR t.category_id IN (SELECT id FROM categories WHERE parent_id = ?))'; params.push(req.query.category_id, req.query.category_id); }
    if (req.query.tag_id) { sql += ' AND t.id IN (SELECT transaction_id FROM transaction_tags WHERE tag_id = ?)'; params.push(req.query.tag_id); }

    sql += ' ORDER BY t.date DESC, t.created_at DESC';
    const [rows] = await db.query(sql, params);
    const formatted = rows.map(formatTransaction);
    res.json(await attachTags(formatted));
  } catch (err) { next(err); }
});

// GET /api/transactions/calendar/:year/:month
router.get('/calendar/:year/:month', async (req, res, next) => {
  try {
    const { year, month } = req.params;
    const sql = transactionSelect + ' WHERE YEAR(t.date) = ? AND MONTH(t.date) = ? ORDER BY t.date, t.created_at';
    const [rows] = await db.query(sql, [year, month]);

    const formatted = await attachTags(rows.map(formatTransaction));

    const calendar = {};
    for (const tx of formatted) {
      const dateKey = tx.date instanceof Date
        ? tx.date.toISOString().split('T')[0]
        : String(tx.date).split('T')[0];

      if (!calendar[dateKey]) {
        calendar[dateKey] = { total_income: 0, total_expense: 0, transactions: [] };
      }
      if (tx.type === 'income') calendar[dateKey].total_income += tx.amount;
      else calendar[dateKey].total_expense += tx.amount;
      calendar[dateKey].transactions.push(tx);
    }
    res.json(calendar);
  } catch (err) { next(err); }
});

// POST /api/transactions
router.post('/', async (req, res, next) => {
  try {
    const {
      description, amount, date, type,
      account_id, credit_card_id, category_id,
      is_recurring, recurring_template_id,
      status, notes, installments,
      expense_nature, fixed_months,
      tag_ids,
    } = req.body;

    const todayStr = new Date().toISOString().split('T')[0];

    // --- FIXA (conta) ou RECORRENTE (cartão) ---
    if (expense_nature === 'fixed') {
      const numMonths = parseInt(fixed_months) || 12;
      const groupId = uuidv4();
      const [baseDate] = (date || todayStr).split('T');
      const [y, m, d] = baseDate.split('-').map(Number);
      const insertedIds = [];

      for (let i = 0; i < numMonths; i++) {
        const fixedDate = new Date(y, m - 1 + i, d);
        const fixedDateStr = fixedDate.toISOString().split('T')[0];
        // CC purchases are always pending; account-based use date comparison
        const fixedStatus = credit_card_id ? 'pending' : (fixedDateStr <= todayStr ? 'paid' : 'pending');
        const [result] = await db.query(
          `INSERT INTO transactions
            (description, amount, date, type, account_id, credit_card_id, category_id, status, notes, user_id, expense_nature, fixed_group_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fixed', ?)`,
          [description, amount, fixedDateStr, type,
           credit_card_id ? null : (account_id || null),
           credit_card_id || null,
           category_id || null, fixedStatus, notes || null, req.user?.id || null, groupId]
        );
        if (fixedStatus === 'paid' && account_id) {
          const delta = type === 'income' ? parseFloat(amount) : -parseFloat(amount);
          await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, account_id]);
        }
        insertedIds.push(result.insertId);
      }
      await setTags(insertedIds[0], tag_ids);
      const [rows] = await db.query(transactionSelect + ' WHERE t.id = ?', [insertedIds[0]]);
      return res.status(201).json((await attachTags([formatTransaction(rows[0])]))[0]);
    }

    // --- PARCELADO ---
    const numInstallments = parseInt(installments) || 1;
    if (numInstallments > 1 && credit_card_id) {
      const groupId = uuidv4();
      const installmentAmount = parseFloat((amount / numInstallments).toFixed(2));
      const [baseDate] = (date || todayStr).split('T');
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
      await setTags(insertedIds[0], tag_ids);
      const [rows] = await db.query(transactionSelect + ' WHERE t.id = ?', [insertedIds[0]]);
      return res.status(201).json((await attachTags([formatTransaction(rows[0])]))[0]);
    }

    // --- TRANSAÇÃO SIMPLES ---
    const [result] = await db.query(
      `INSERT INTO transactions (description, amount, date, type, account_id, credit_card_id, category_id, is_recurring, recurring_template_id, status, notes, user_id, expense_nature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [description, amount, date, type, account_id || null, credit_card_id || null, category_id || null, is_recurring || false, recurring_template_id || null, status || 'paid', notes || null, req.user?.id || null, expense_nature || null]
    );

    if ((status === 'paid' || !status) && account_id) {
      const delta = type === 'income' ? parseFloat(amount) : -parseFloat(amount);
      await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, account_id]);
    }

    await setTags(result.insertId, tag_ids);
    const [rows] = await db.query(transactionSelect + ' WHERE t.id = ?', [result.insertId]);
    res.status(201).json((await attachTags([formatTransaction(rows[0])]))[0]);
  } catch (err) { next(err); }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { description, amount, date, type, account_id, credit_card_id, category_id,
            is_recurring, status, notes, expense_nature, fixed_months, tag_ids,
            update_remaining } = req.body;

    const [old] = await db.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Transação não encontrada' });
    const prev = old[0];

    if (prev.status === 'paid' && prev.account_id) {
      const revert = prev.type === 'income' ? -parseFloat(prev.amount) : parseFloat(prev.amount);
      await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [revert, prev.account_id]);
    }

    // Convertendo para fixa/recorrente (sem grupo existente)
    const becomingFixed = expense_nature === 'fixed' && !prev.fixed_group_id;
    if (becomingFixed) {
      const numMonths = parseInt(fixed_months) || 12;
      const groupId = uuidv4();
      const [baseDate] = (date || String(prev.date)).split('T');
      const [y, m, d] = baseDate.split('-').map(Number);
      const todayStr = new Date().toISOString().split('T')[0];
      const effectiveAccountId = credit_card_id ? null : (account_id || null);
      const effectiveCCId = credit_card_id || null;

      await db.query(
        `UPDATE transactions SET description=?, amount=?, date=?, type=?, account_id=?, credit_card_id=?, category_id=?, is_recurring=?, status=?, notes=?, expense_nature='fixed', fixed_group_id=? WHERE id=?`,
        [description, amount, date, type, effectiveAccountId, effectiveCCId, category_id || null, is_recurring || false, status || 'paid', notes || null, groupId, req.params.id]
      );
      if ((status === 'paid' || !status) && account_id) {
        const delta = type === 'income' ? parseFloat(amount) : -parseFloat(amount);
        await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, account_id]);
      }

      for (let i = 1; i < numMonths; i++) {
        const fixedDate = new Date(y, m - 1 + i, d);
        const fixedDateStr = fixedDate.toISOString().split('T')[0];
        const fixedStatus = effectiveCCId ? 'pending' : (fixedDateStr <= todayStr ? 'paid' : 'pending');
        await db.query(
          `INSERT INTO transactions (description, amount, date, type, account_id, credit_card_id, category_id, status, notes, user_id, expense_nature, fixed_group_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fixed', ?)`,
          [description, amount, fixedDateStr, type, effectiveAccountId, effectiveCCId, category_id || null, fixedStatus, notes || null, req.user?.id || null, groupId]
        );
        if (fixedStatus === 'paid' && account_id) {
          const delta = type === 'income' ? parseFloat(amount) : -parseFloat(amount);
          await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, account_id]);
        }
      }

      await setTags(req.params.id, tag_ids);
      const [rows] = await db.query(transactionSelect + ' WHERE t.id = ?', [req.params.id]);
      return res.json((await attachTags([formatTransaction(rows[0])]))[0]);
    }

    await db.query(
      `UPDATE transactions SET description=?, amount=?, date=?, type=?, account_id=?, credit_card_id=?, category_id=?, is_recurring=?, status=?, notes=?, expense_nature=? WHERE id=?`,
      [description, amount, date, type, account_id || null, credit_card_id || null, category_id || null, is_recurring || false, status || 'paid', notes || null, expense_nature || null, req.params.id]
    );

    if ((status === 'paid' || !status) && account_id) {
      const delta = type === 'income' ? parseFloat(amount) : -parseFloat(amount);
      await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, account_id]);
    }

    // Aplicar alterações às próximas ocorrências do grupo
    if (update_remaining) {
      if (prev.fixed_group_id) {
        const prevDateStr = String(prev.date).split('T')[0];
        await db.query(
          `UPDATE transactions SET description=?, amount=?, category_id=?, notes=?
           WHERE fixed_group_id = ? AND date > ? AND id != ?`,
          [description, amount, category_id || null, notes || null, prev.fixed_group_id, prevDateStr, req.params.id]
        );
      } else if (prev.installment_group_id) {
        await db.query(
          `UPDATE transactions SET description=?, category_id=?, notes=?
           WHERE installment_group_id = ? AND installment_current > ?`,
          [description, category_id || null, notes || null, prev.installment_group_id, prev.installment_current]
        );
      }
    }

    await setTags(req.params.id, tag_ids);
    const [rows] = await db.query(transactionSelect + ' WHERE t.id = ?', [req.params.id]);
    res.json((await attachTags([formatTransaction(rows[0])]))[0]);
  } catch (err) { next(err); }
});

// PATCH /api/transactions/bulk
router.patch('/bulk', async (req, res, next) => {
  try {
    const { ids, category_id, account_id, credit_card_id } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'Nenhum ID informado' });

    const sets = [];
    const params = [];

    if (category_id !== undefined) { sets.push('category_id = ?'); params.push(category_id || null); }
    if (account_id !== undefined)  { sets.push('account_id = ?');  params.push(account_id || null); }
    if (credit_card_id !== undefined) { sets.push('credit_card_id = ?'); params.push(credit_card_id || null); }

    if (!sets.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    const placeholders = ids.map(() => '?').join(',');
    await db.query(`UPDATE transactions SET ${sets.join(', ')} WHERE id IN (${placeholders})`, [...params, ...ids]);
    res.json({ updated: ids.length });
  } catch (err) { next(err); }
});

// DELETE /api/transactions/:id
// ?all=true      → deleta todo o grupo
// ?remaining=true → deleta esta e as próximas (por data / número de parcela)
router.delete('/:id', async (req, res, next) => {
  try {
    const [old] = await db.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Transação não encontrada' });
    const prev = old[0];

    // Deletar todas do grupo
    if (req.query.all === 'true') {
      const groupId = prev.installment_group_id || prev.fixed_group_id;
      const groupCol = prev.installment_group_id ? 'installment_group_id' : 'fixed_group_id';
      if (groupId) {
        const [group] = await db.query(`SELECT * FROM transactions WHERE ${groupCol} = ?`, [groupId]);
        for (const t of group) {
          if (t.status === 'paid' && t.account_id) {
            const revert = t.type === 'income' ? -parseFloat(t.amount) : parseFloat(t.amount);
            await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [revert, t.account_id]);
          }
        }
        await db.query(`DELETE FROM transactions WHERE ${groupCol} = ?`, [groupId]);
        return res.json({ message: 'Grupo deletado', deleted: group.length });
      }
    }

    // Deletar esta e as próximas
    if (req.query.remaining === 'true') {
      const groupId = prev.installment_group_id || prev.fixed_group_id;
      if (groupId) {
        let group, deleteSql, deleteParams;
        if (prev.installment_group_id) {
          [group] = await db.query(
            `SELECT * FROM transactions WHERE installment_group_id = ? AND installment_current >= ?`,
            [groupId, prev.installment_current]
          );
          deleteSql = `DELETE FROM transactions WHERE installment_group_id = ? AND installment_current >= ?`;
          deleteParams = [groupId, prev.installment_current];
        } else {
          const prevDateStr = String(prev.date).split('T')[0];
          [group] = await db.query(
            `SELECT * FROM transactions WHERE fixed_group_id = ? AND date >= ?`,
            [groupId, prevDateStr]
          );
          deleteSql = `DELETE FROM transactions WHERE fixed_group_id = ? AND date >= ?`;
          deleteParams = [groupId, prevDateStr];
        }
        for (const t of group) {
          if (t.status === 'paid' && t.account_id) {
            const revert = t.type === 'income' ? -parseFloat(t.amount) : parseFloat(t.amount);
            await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [revert, t.account_id]);
          }
        }
        await db.query(deleteSql, deleteParams);
        return res.json({ message: 'Próximas deletadas', deleted: group.length });
      }
    }

    if (prev.status === 'paid' && prev.account_id) {
      const revert = prev.type === 'income' ? -parseFloat(prev.amount) : parseFloat(prev.amount);
      await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [revert, prev.account_id]);
    }
    await db.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Transação deletada' });
  } catch (err) { next(err); }
});

module.exports = router;
