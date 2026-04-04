const jwt = require('jsonwebtoken');
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
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

module.exports = { auth, adminOnly };
