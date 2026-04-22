const express = require('express');
const router = express.Router();
const db = require('../db');
const { superAdminOnly } = require('../middleware/auth');

// GET /api/workspaces — workspaces do usuário logado (ou todos se super_admin)
router.get('/', async (req, res, next) => {
  try {
    let rows;
    if (req.user.role === 'super_admin') {
      [rows] = await db.query(`
        SELECT w.*, COUNT(wu.user_id) as member_count
        FROM workspaces w
        LEFT JOIN workspace_users wu ON w.id = wu.workspace_id
        GROUP BY w.id ORDER BY w.created_at
      `);
    } else {
      [rows] = await db.query(`
        SELECT w.*, wu.role as my_role, COUNT(wu2.user_id) as member_count
        FROM workspaces w
        JOIN workspace_users wu ON w.id = wu.workspace_id AND wu.user_id = ?
        LEFT JOIN workspace_users wu2 ON w.id = wu2.workspace_id
        GROUP BY w.id, wu.role ORDER BY w.created_at
      `, [req.user.id]);
    }
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/workspaces — super_admin cria workspace
router.post('/', superAdminOnly, async (req, res, next) => {
  try {
    const { name, user_ids = [] } = req.body;
    const [result] = await db.query(
      'INSERT INTO workspaces (name, created_by) VALUES (?, ?)',
      [name, req.user.id]
    );
    const wid = result.insertId;
    // Add creator as owner
    await db.query('INSERT INTO workspace_users (workspace_id, user_id, role) VALUES (?, ?, ?)', [wid, req.user.id, 'owner']);
    // Add additional users as members
    for (const uid of user_ids) {
      await db.query('INSERT IGNORE INTO workspace_users (workspace_id, user_id, role) VALUES (?, ?, ?)', [wid, uid, 'member']);
    }
    const [ws] = await db.query('SELECT * FROM workspaces WHERE id = ?', [wid]);
    res.status(201).json(ws[0]);
  } catch (err) { next(err); }
});

// PUT /api/workspaces/:id — rename (owner/admin of workspace or super_admin)
router.put('/:id', async (req, res, next) => {
  try {
    const wid = parseInt(req.params.id);
    if (req.user.role !== 'super_admin') {
      const [rows] = await db.query(
        "SELECT role FROM workspace_users WHERE workspace_id = ? AND user_id = ? AND role IN ('owner','admin')",
        [wid, req.user.id]
      );
      if (!rows.length) return res.status(403).json({ error: 'Sem permissão' });
    }
    await db.query('UPDATE workspaces SET name = ? WHERE id = ?', [req.body.name, wid]);
    const [ws] = await db.query('SELECT * FROM workspaces WHERE id = ?', [wid]);
    res.json(ws[0]);
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/:id — super_admin only
router.delete('/:id', superAdminOnly, async (req, res, next) => {
  try {
    await db.query('DELETE FROM workspaces WHERE id = ?', [req.params.id]);
    res.json({ message: 'Workspace deletado' });
  } catch (err) { next(err); }
});

// GET /api/workspaces/:id/members
router.get('/:id/members', async (req, res, next) => {
  try {
    const wid = parseInt(req.params.id);
    if (req.user.role !== 'super_admin') {
      const [check] = await db.query('SELECT id FROM workspace_users WHERE workspace_id = ? AND user_id = ?', [wid, req.user.id]);
      if (!check.length) return res.status(403).json({ error: 'Sem acesso' });
    }
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.name, u.role as system_role, wu.role, wu.joined_at
      FROM workspace_users wu
      JOIN users u ON wu.user_id = u.id
      WHERE wu.workspace_id = ?
      ORDER BY wu.role, u.name
    `, [wid]);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/workspaces/:id/members — add member (owner/admin or super_admin)
router.post('/:id/members', async (req, res, next) => {
  try {
    const wid = parseInt(req.params.id);
    if (req.user.role !== 'super_admin') {
      const [check] = await db.query(
        "SELECT role FROM workspace_users WHERE workspace_id = ? AND user_id = ? AND role IN ('owner','admin')",
        [wid, req.user.id]
      );
      if (!check.length) return res.status(403).json({ error: 'Sem permissão' });
    }
    const { user_id, role = 'member' } = req.body;
    await db.query('INSERT IGNORE INTO workspace_users (workspace_id, user_id, role) VALUES (?, ?, ?)', [wid, user_id, role]);
    res.status(201).json({ message: 'Membro adicionado' });
  } catch (err) { next(err); }
});

// PUT /api/workspaces/:id/members/:uid — change role
router.put('/:id/members/:uid', async (req, res, next) => {
  try {
    const wid = parseInt(req.params.id);
    if (req.user.role !== 'super_admin') {
      const [check] = await db.query(
        "SELECT role FROM workspace_users WHERE workspace_id = ? AND user_id = ? AND role IN ('owner','admin')",
        [wid, req.user.id]
      );
      if (!check.length) return res.status(403).json({ error: 'Sem permissão' });
    }
    await db.query('UPDATE workspace_users SET role = ? WHERE workspace_id = ? AND user_id = ?', [req.body.role, wid, req.params.uid]);
    res.json({ message: 'Role atualizado' });
  } catch (err) { next(err); }
});

// DELETE /api/workspaces/:id/members/:uid — remove member
router.delete('/:id/members/:uid', async (req, res, next) => {
  try {
    const wid = parseInt(req.params.id);
    if (req.user.role !== 'super_admin') {
      const [check] = await db.query(
        "SELECT role FROM workspace_users WHERE workspace_id = ? AND user_id = ? AND role IN ('owner','admin')",
        [wid, req.user.id]
      );
      if (!check.length) return res.status(403).json({ error: 'Sem permissão' });
    }
    await db.query('DELETE FROM workspace_users WHERE workspace_id = ? AND user_id = ?', [wid, req.params.uid]);
    res.json({ message: 'Membro removido' });
  } catch (err) { next(err); }
});

module.exports = router;
