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
    {
      name: '012 — tabela tags',
      sql: `CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        color VARCHAR(7) DEFAULT '#6366F1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: '012 — tabela transaction_tags',
      sql: `CREATE TABLE IF NOT EXISTS transaction_tags (
        transaction_id INT NOT NULL,
        tag_id INT NOT NULL,
        PRIMARY KEY (transaction_id, tag_id),
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )`,
    },
    {
      name: '013 — expense_nature em transactions',
      sql: "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expense_nature ENUM('fixed','variable') DEFAULT NULL",
    },
    {
      name: '013 — fixed_group_id em transactions',
      sql: "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fixed_group_id VARCHAR(36) DEFAULT NULL",
    },
    // 014 — workspaces
    { name: '014 — tabela workspaces', sql: `CREATE TABLE IF NOT EXISTS workspaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
)` },
    { name: '014 — tabela workspace_users', sql: `CREATE TABLE IF NOT EXISTS workspace_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspace_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner','admin','member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wu (workspace_id, user_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)` },
    // 014 — super_admin role
    { name: '014 — super_admin role em users', sql: `ALTER TABLE users MODIFY COLUMN role ENUM('admin','user','super_admin') DEFAULT 'user'` },
    // 014 — workspace_id columns (DEFAULT 1, migrates existing data to workspace 1)
    { name: '014 — workspace_id em accounts',     sql: `ALTER TABLE accounts     ADD COLUMN IF NOT EXISTS workspace_id INT NOT NULL DEFAULT 1` },
    { name: '014 — workspace_id em credit_cards',  sql: `ALTER TABLE credit_cards  ADD COLUMN IF NOT EXISTS workspace_id INT NOT NULL DEFAULT 1` },
    { name: '014 — workspace_id em categories',   sql: `ALTER TABLE categories   ADD COLUMN IF NOT EXISTS workspace_id INT NOT NULL DEFAULT 1` },
    { name: '014 — workspace_id em transactions', sql: `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS workspace_id INT NOT NULL DEFAULT 1` },
    { name: '014 — workspace_id em budgets',      sql: `ALTER TABLE budgets      ADD COLUMN IF NOT EXISTS workspace_id INT NOT NULL DEFAULT 1` },
    { name: '014 — workspace_id em savings_boxes',sql: `ALTER TABLE savings_boxes ADD COLUMN IF NOT EXISTS workspace_id INT NOT NULL DEFAULT 1` },
    { name: '014 — workspace_id em tags',         sql: `ALTER TABLE tags         ADD COLUMN IF NOT EXISTS workspace_id INT NOT NULL DEFAULT 1` },
    // 014 — seed workspace 1 and memberships
    { name: '014 — seed workspace Pessoal', sql: `INSERT IGNORE INTO workspaces (id, name, created_by) SELECT 1, 'Pessoal', id FROM users WHERE role IN ('admin','super_admin') ORDER BY id LIMIT 1` },
    { name: '014 — seed workspace_users admin', sql: `INSERT IGNORE INTO workspace_users (workspace_id, user_id, role) SELECT 1, id, 'owner' FROM users WHERE role IN ('admin','super_admin')` },
    { name: '014 — seed workspace_users members', sql: `INSERT IGNORE INTO workspace_users (workspace_id, user_id, role) SELECT 1, id, 'member' FROM users WHERE role = 'user'` },
    // 015 — super_admin user
    { name: '015 — super_admin gholive', sql: `INSERT IGNORE INTO users (username, password_hash, name, role) VALUES ('gholive@gmail.com', '$2a$10$1fc7defRje3mNQUnLDj1suiXV8CmtVLJCg4LQMK1WMyRpwLw3j81u', 'Super Admin', 'super_admin')` },
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
