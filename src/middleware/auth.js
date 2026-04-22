const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'financeiro_secret_key';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autorizado' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

function superAdminOnly(req, res, next) {
  if (req.user?.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

async function workspaceAuth(req, res, next) {
  try {
    const wid = parseInt(req.headers['x-workspace-id']);
    if (!wid) return res.status(400).json({ error: 'Workspace não especificado' });
    if (req.user.role === 'super_admin') {
      req.workspace_id = wid;
      req.workspace_role = 'owner';
      return next();
    }
    const [rows] = await db.query(
      'SELECT role FROM workspace_users WHERE workspace_id = ? AND user_id = ?',
      [wid, req.user.id]
    );
    if (!rows.length) return res.status(403).json({ error: 'Sem acesso a este workspace' });
    req.workspace_id = wid;
    req.workspace_role = rows[0].role;
    next();
  } catch (err) { next(err); }
}

module.exports = { auth, adminOnly, superAdminOnly, workspaceAuth };
