require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./src/middleware/errorHandler');
const { auth } = require('./src/middleware/auth');
const { startScheduler } = require('./src/scheduler');

const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/migrate', require('./src/routes/migrate'));

// Protected routes
app.use('/api/dashboard', auth, require('./src/routes/dashboard'));
app.use('/api/accounts', auth, require('./src/routes/accounts'));
app.use('/api/credit-cards', auth, require('./src/routes/creditCards'));
app.use('/api/categories', auth, require('./src/routes/categories'));
app.use('/api/transactions', auth, require('./src/routes/transactions'));
app.use('/api/budgets', auth, require('./src/routes/budgets'));
app.use('/api/savings', auth, require('./src/routes/savings'));
app.use('/api/ai', auth, require('./src/routes/ai'));
app.use('/api/import', auth, require('./src/routes/import'));
app.use('/api/tags', auth, require('./src/routes/tags'));
app.use('/api/flow', auth, require('./src/routes/flow'));
app.use('/api/backup', auth, require('./src/routes/backup'));

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
