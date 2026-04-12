const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/migrate?secret=SEU_SEGREDO
// Roda as migrations de schema seguras (ADD COLUMN IF NOT EXISTS)
router.get('/', async (req, res) => {
  const secret = process.env.MIGRATE_SECRET || 'financeiro-migrate-2024';
  if (req.query.secret !== secret) {
    return res.status(403).send('Acesso negado. Informe ?secret=VALOR correto.');
  }

  const migrations = [
    {
      name: '011 — is_default em accounts',
      sql: "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE",
    },
    {
      name: '011 — is_default em credit_cards',
      sql: "ALTER TABLE credit_cards ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE",
    },
  ];

  const results = [];

  for (const m of migrations) {
    try {
      await db.query(m.sql);
      results.push({ name: m.name, status: 'OK' });
    } catch (err) {
      results.push({ name: m.name, status: 'ERRO', error: err.message });
    }
  }

  const allOk = results.every(r => r.status === 'OK');

  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Migrations</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 60px auto; padding: 0 20px; }
        h2 { color: #1e293b; }
        .item { padding: 12px 16px; border-radius: 8px; margin: 8px 0; font-size: 14px; }
        .ok   { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
        .erro { background: #fef2f2; border: 1px solid #fca5a5; color: #991b1b; }
        .done { margin-top: 24px; padding: 16px; border-radius: 8px; background: #eff6ff; border: 1px solid #93c5fd; color: #1d4ed8; font-weight: 600; }
      </style>
    </head>
    <body>
      <h2>Resultado das Migrations</h2>
      ${results.map(r => `
        <div class="item ${r.status === 'OK' ? 'ok' : 'erro'}">
          ${r.status === 'OK' ? '✓' : '✗'} <strong>${r.name}</strong>
          ${r.error ? `<br><small>${r.error}</small>` : ''}
        </div>
      `).join('')}
      ${allOk ? '<div class="done">✓ Banco atualizado com sucesso! Pode fechar esta página.</div>' : ''}
    </body>
    </html>
  `);
});

module.exports = router;
