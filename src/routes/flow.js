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
      GROUP BY t.type, c.id, MONTH(t.date)
      ORDER BY t.type DESC, COALESCE(pc.name, c.name, 'Sem categoria'), c.name, month
    `, [year]);

    // Build map: key = "type_categoryId"
    const catMap = {};
    for (const row of rows) {
      const key = `${row.tx_type}_${row.category_id}`;
      if (!catMap[key]) {
        const label = row.sub_name
          ? `${row.category_name} › ${row.sub_name}`
          : row.category_name;
        catMap[key] = {
          category_id: row.category_id,
          category_name: label,
          category_color: row.category_color,
          category_type: row.tx_type,
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

module.exports = router;
