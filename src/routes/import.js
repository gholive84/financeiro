const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const db = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function interpretWithGPT(text, categories, accounts, creditCards) {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `Você é um assistente de finanças pessoais. Analise o texto abaixo (extrato bancário, fatura de cartão, lista de despesas em CSV ou qualquer formato financeiro) e extraia TODAS as transações encontradas.

Texto:
${text.slice(0, 8000)}

Data de hoje: ${today}

Categorias disponíveis:
${categories.map(c => `- id:${c.id} "${c.name}" (${c.type})`).join('\n')}

Contas disponíveis:
${accounts.map(a => `- id:${a.id} "${a.name}"`).join('\n')}

Cartões de crédito disponíveis:
${creditCards.map(c => `- id:${c.id} "${c.name}" ${c.bank ? `(${c.bank})` : ''}`).join('\n')}

Retorne SOMENTE um JSON válido com esta estrutura (sem markdown, sem explicação):
{
  "transactions": [
    {
      "description": "descrição",
      "amount": 0.00,
      "date": "YYYY-MM-DD",
      "type": "expense" ou "income",
      "category_id": número ou null,
      "account_id": número ou null,
      "credit_card_id": número ou null,
      "status": "paid" ou "pending"
    }
  ]
}

Regras:
- Extraia TODAS as transações que encontrar no texto
- Se não conseguir determinar a data, use hoje (${today})
- Valores sempre positivos
- Se for fatura de cartão, use credit_card_id quando possível
- Ignore totais, saldos e linhas que não sejam transações`;

  const gptRes = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
  }, {
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
  });

  let raw = gptRes.data.choices[0].message.content.trim();
  // Remove markdown code blocks if present
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  return JSON.parse(raw);
}

// POST /api/import/preview — analisa arquivo e retorna transações para revisão
router.post('/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não recebido' });

    const [categories] = await db.query('SELECT id, name, type FROM categories');
    const [accounts] = await db.query('SELECT id, name FROM accounts');
    const [creditCards] = await db.query('SELECT id, name, bank FROM credit_cards');

    let text = '';
    const mime = req.file.mimetype;
    const buffer = req.file.buffer;

    if (mime === 'application/pdf' || req.file.originalname?.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      text = data.text;
    } else {
      // CSV ou TXT — tenta UTF-8, fallback para Latin-1 (padrão dos bancos brasileiros)
      const utf8 = buffer.toString('utf8');
      text = utf8.includes('\uFFFD') ? buffer.toString('latin1') : utf8;
    }

    if (!text.trim()) return res.status(400).json({ error: 'Não foi possível extrair texto do arquivo' });

    const result = await interpretWithGPT(text, categories, accounts, creditCards);
    res.json({ transactions: result.transactions, total: result.transactions.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/import/save — salva todas as transações confirmadas
router.post('/save', async (req, res, next) => {
  try {
    const { transactions } = req.body;
    if (!transactions?.length) return res.status(400).json({ error: 'Nenhuma transação para salvar' });

    let saved = 0;
    for (const t of transactions) {
      await db.query(
        `INSERT INTO transactions (description, amount, date, type, account_id, credit_card_id, category_id, status, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.description, t.amount, t.date, t.type, t.account_id || null, t.credit_card_id || null, t.category_id || null, t.status || 'paid', req.user?.id || null]
      );

      if ((t.status === 'paid' || !t.status) && t.account_id) {
        const delta = t.type === 'income' ? t.amount : -t.amount;
        await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, t.account_id]);
      }
      saved++;
    }

    res.json({ saved });
  } catch (err) { next(err); }
});

module.exports = router;
