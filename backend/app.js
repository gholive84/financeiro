require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/accounts', require('./src/routes/accounts'));
app.use('/api/credit-cards', require('./src/routes/creditCards'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/transactions', require('./src/routes/transactions'));
app.use('/api/budgets', require('./src/routes/budgets'));
app.use('/api/savings', require('./src/routes/savings'));

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Financeiro API rodando na porta ${PORT}`);
});

module.exports = app;
