require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/accounts', require('./src/routes/accounts'));
app.use('/api/credit-cards', require('./src/routes/creditCards'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/transactions', require('./src/routes/transactions'));
app.use('/api/budgets', require('./src/routes/budgets'));
app.use('/api/savings', require('./src/routes/savings'));
app.use('/api/ai', require('./src/routes/ai'));

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
});

module.exports = app;
