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

module.exports = router;
