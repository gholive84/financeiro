const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/flow/monthly?year=2024
router.get('/monthly', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [rows] = await db.query(`
      SELECT
        t.type as tx_type,
        COALESCE(t.expense_nature, 'variable') as expense_nature,
        COALESCE(c.id, 0) as category_id,
        COALESCE(pc.name, c.name, 'Sem categoria') as category_name,
        CASE WHEN pc.id IS NOT NULL THEN c.name ELSE NULL END as sub_name,
        COALESCE(c.color, '#64748B') as category_color,
        MONTH(t.date) as month,
        SUM(t.amount) as total
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
      WHERE YEAR(t.date) = ?
      GROUP BY t.type, t.expense_nature, c.id, MONTH(t.date)
      ORDER BY t.type DESC, COALESCE(pc.name, c.name, 'Sem categoria'), c.name, month
    `, [year]);

    // Build map: key = "type_nature_categoryId"
    const catMap = {};
    for (const row of rows) {
      const key = `${row.tx_type}_${row.expense_nature}_${row.category_id}`;
      if (!catMap[key]) {
        const label = row.sub_name
          ? `${row.category_name} › ${row.sub_name}`
          : row.category_name;
        catMap[key] = {
          category_id: row.category_id,
          category_name: label,
          category_color: row.category_color,
          category_type: row.tx_type,
          expense_nature: row.expense_nature,
          months: { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0 },
        };
      }
      catMap[key].months[row.month] = parseFloat(row.total);
    }

    const result = Object.values(catMap).map(cat => ({
      ...cat,
      total: Object.values(cat.months).reduce((s, v) => s + v, 0),
    }));

    res.json({ year, categories: result });
  } catch (err) { next(err); }
});

// GET /api/flow/cards?year=2024
router.get('/cards', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [rows] = await db.query(`
      SELECT
        cc.id as card_id,
        cc.name as card_name,
        cc.color as card_color,
        cc.bank as card_bank,
        COALESCE(c.id, 0) as category_id,
        COALESCE(pc.name, c.name, 'Sem categoria') as category_name,
        CASE WHEN pc.id IS NOT NULL THEN c.name ELSE NULL END as sub_name,
        COALESCE(c.color, '#64748B') as category_color,
        MONTH(t.date) as month,
        SUM(t.amount) as total
      FROM transactions t
      INNER JOIN credit_cards cc ON t.credit_card_id = cc.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN categories pc ON c.parent_id = pc.id
      WHERE YEAR(t.date) = ? AND t.type = 'expense'
      GROUP BY cc.id, c.id, MONTH(t.date)
      ORDER BY cc.name, COALESCE(pc.name, c.name, 'Sem categoria'), c.name, month
    `, [year]);

    const cardMap = {};
    for (const row of rows) {
      if (!cardMap[row.card_id]) {
        cardMap[row.card_id] = {
          card_id: row.card_id,
          card_name: row.card_name,
          card_color: row.card_color,
          card_bank: row.card_bank,
          categories: {},
        };
      }
      const catKey = row.category_id;
      if (!cardMap[row.card_id].categories[catKey]) {
        const label = row.sub_name ? `${row.category_name} › ${row.sub_name}` : row.category_name;
        cardMap[row.card_id].categories[catKey] = {
          category_id: row.category_id,
          category_name: label,
          category_color: row.category_color,
          months: { 1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0 },
        };
      }
      cardMap[row.card_id].categories[catKey].months[row.month] = parseFloat(row.total);
    }

    const cards = Object.values(cardMap).map(card => ({
      ...card,
      categories: Object.values(card.categories).map(cat => ({
        ...cat,
        total: Object.values(cat.months).reduce((s, v) => s + v, 0),
      })),
    }));

    res.json({ year, cards });
  } catch (err) { next(err); }
});

// GET /api/flow/installments?year=2024 — parcelas mês a mês por cartão
router.get('/installments', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [rows] = await db.query(`
      SELECT
        cc.id          AS card_id,
        cc.name        AS card_name,
        cc.color       AS card_color,
        cc.bank        AS card_bank,
        t.installment_group_id,
        t.installment_total,
        MONTH(t.date)                                             AS month,
        MIN(t.description)                                        AS description,
        SUM(t.amount)                                             AS month_amount,
        SUM(CASE WHEN t.status = 'paid'    THEN 1 ELSE 0 END)    AS paid_count,
        SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END)    AS pending_count,
        COALESCE(c.name, 'Sem categoria')                         AS category_name,
        COALESCE(c.color, '#64748B')                              AS category_color,
        (SELECT SUM(t2.amount) FROM transactions t2
          WHERE t2.installment_group_id = t.installment_group_id) AS full_total
      FROM transactions t
      INNER JOIN credit_cards cc ON t.credit_card_id = cc.id
      LEFT  JOIN categories   c  ON t.category_id    = c.id
      WHERE t.installment_group_id IS NOT NULL
        AND t.installment_total > 1
        AND YEAR(t.date) = ?
      GROUP BY cc.id, t.installment_group_id, MONTH(t.date)
      ORDER BY cc.name, t.installment_group_id, month
    `, [year]);

    const cardMap = {};
    for (const r of rows) {
      if (!cardMap[r.card_id]) {
        cardMap[r.card_id] = {
          card_id: r.card_id, card_name: r.card_name,
          card_color: r.card_color, card_bank: r.card_bank,
          groups: {},
        };
      }
      const gid = r.installment_group_id;
      if (!cardMap[r.card_id].groups[gid]) {
        const desc = String(r.description).replace(/ \(\d+\/\d+\)$/, '');
        cardMap[r.card_id].groups[gid] = {
          group_id: gid,
          description: desc,
          installment_total: r.installment_total,
          category_name: r.category_name,
          category_color: r.category_color,
          full_total: parseFloat(r.full_total) || 0,
          months: {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0},
          paid_count: 0,
          pending_count: 0,
        };
      }
      cardMap[r.card_id].groups[gid].months[r.month] = parseFloat(r.month_amount);
      cardMap[r.card_id].groups[gid].paid_count    += parseInt(r.paid_count)    || 0;
      cardMap[r.card_id].groups[gid].pending_count += parseInt(r.pending_count) || 0;
    }

    const cards = Object.values(cardMap).map(card => ({
      ...card,
      groups: Object.values(card.groups).map(g => ({
        ...g,
        total: Object.values(g.months).reduce((s, v) => s + v, 0),
      })),
    }));

    res.json({ year, cards });
  } catch (err) { next(err); }
});

module.exports = router;
