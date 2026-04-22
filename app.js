require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./src/middleware/errorHandler');
const { auth, workspaceAuth } = require('./src/middleware/auth');
const { startScheduler } = require('./src/scheduler');

const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/migrate', require('./src/routes/migrate'));

// Protected routes
app.use('/api/workspaces', auth, require('./src/routes/workspaces'));
app.use('/api/dashboard',    auth, workspaceAuth, require('./src/routes/dashboard'));
app.use('/api/accounts',     auth, workspaceAuth, require('./src/routes/accounts'));
app.use('/api/credit-cards', auth, workspaceAuth, require('./src/routes/creditCards'));
app.use('/api/categories',   auth, workspaceAuth, require('./src/routes/categories'));
app.use('/api/transactions',  auth, workspaceAuth, require('./src/routes/transactions'));
app.use('/api/budgets',      auth, workspaceAuth, require('./src/routes/budgets'));
app.use('/api/savings',      auth, workspaceAuth, require('./src/routes/savings'));
app.use('/api/ai',           auth, workspaceAuth, require('./src/routes/ai'));
app.use('/api/import',       auth, workspaceAuth, require('./src/routes/import'));
app.use('/api/tags',         auth, workspaceAuth, require('./src/routes/tags'));
app.use('/api/flow',         auth, workspaceAuth, require('./src/routes/flow'));
app.use('/api/backup',       auth, workspaceAuth, require('./src/routes/backup'));

// Serve frontend build in production
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// SPA fallback — all non-API routes serve index.html
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Financeiro rodando na porta ${PORT}`);
  startScheduler();
});

module.exports = app;
