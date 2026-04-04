const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const db = require('../db');

const upload = multer({ dest: '/tmp/uploads/' });

const OPENAI_KEY = process.env.OPENAI_API_KEY;

// POST /api/ai/transcribe — recebe áudio e retorna transação interpretada
router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Áudio não recebido' });

    // 1. Transcrever com Whisper
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: 'audio.webm',
      contentType: req.file.mimetype || 'audio/webm',
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const whisperRes = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: { ...formData.getHeaders(), Authorization: `Bearer ${OPENAI_KEY}` },
    });
    const transcript = whisperRes.data.text;

    // 2. Buscar dados para contexto
    const [categories] = await db.query('SELECT id, name, type FROM categories');
    const [accounts] = await db.query('SELECT id, name, type FROM accounts');
    const [creditCards] = await db.query('SELECT id, name, bank FROM credit_cards');

    const today = new Date().toISOString().split('T')[0];

    // 3. Interpretar com GPT
    const prompt = `Você é um assistente de finanças pessoais. Interprete o texto abaixo e extraia os dados de uma transação financeira.

Texto do usuário: "${transcript}"

Data de hoje: ${today}

Categorias disponíveis:
${categories.map(c => `- id:${c.id} "${c.name}" (${c.type})`).join('\n')}

Contas disponíveis:
${accounts.map(a => `- id:${a.id} "${a.name}" (${a.type})`).join('\n')}

Cartões de crédito disponíveis:
${creditCards.map(c => `- id:${c.id} "${c.name}" ${c.bank ? `(${c.bank})` : ''}`).join('\n')}

Retorne SOMENTE um JSON válido com esta estrutura (sem markdown, sem explicação):
{
  "description": "descrição da transação",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "type": "expense" ou "income",
  "category_id": número ou null,
  "account_id": número ou null,
  "credit_card_id": número ou null,
  "status": "paid" ou "pending",
  "confidence": "descrição breve do que você entendeu"
}

Regras:
- Se mencionou cartão de crédito, preencha credit_card_id e deixe account_id null
- Se não mencionou cartão, tente identificar a conta pelo contexto, senão null
- Se não mencionou data, use hoje (${today})
- Valores sempre positivos
- Se não conseguir extrair um valor claro, retorne amount: 0`;

    const gptRes = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }, {
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    });

    const raw = gptRes.data.choices[0].message.content.trim();
    const transaction = JSON.parse(raw);

    // Limpar arquivo temporário
    fs.unlinkSync(req.file.path);

    res.json({ transcript, transaction });
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
});

// POST /api/ai/text — recebe texto e retorna transação interpretada + salva direto
router.post('/text', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Texto não recebido' });

    const [categories] = await db.query('SELECT id, name, type FROM categories');
    const [accounts] = await db.query('SELECT id, name, type FROM accounts');
    const [creditCards] = await db.query('SELECT id, name, bank FROM credit_cards');
    const today = new Date().toISOString().split('T')[0];

    const prompt = `Você é um assistente de finanças pessoais. Interprete o texto abaixo e extraia os dados de uma transação financeira.

Texto do usuário: "${text}"

Data de hoje: ${today}

Categorias disponíveis:
${categories.map(c => `- id:${c.id} "${c.name}" (${c.type})`).join('\n')}

Contas disponíveis:
${accounts.map(a => `- id:${a.id} "${a.name}" (${a.type})`).join('\n')}

Cartões de crédito disponíveis:
${creditCards.map(c => `- id:${c.id} "${c.name}" ${c.bank ? `(${c.bank})` : ''}`).join('\n')}

Retorne SOMENTE um JSON válido com esta estrutura (sem markdown, sem explicação):
{
  "description": "descrição da transação",
  "amount": 0.00,
  "date": "YYYY-MM-DD",
  "type": "expense" ou "income",
  "category_id": número ou null,
  "account_id": número ou null,
  "credit_card_id": número ou null,
  "status": "paid" ou "pending",
  "confidence": "descrição breve do que você entendeu"
}

Regras:
- Se mencionou cartão de crédito, preencha credit_card_id e deixe account_id null
- Se não mencionou cartão, tente identificar a conta pelo contexto, senão null
- Se não mencionou data, use hoje (${today})
- Valores sempre positivos`;

    const gptRes = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }, {
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    });

    const raw = gptRes.data.choices[0].message.content.trim();
    const transaction = JSON.parse(raw);

    // Salvar direto
    const [result] = await db.query(
      `INSERT INTO transactions (description, amount, date, type, account_id, credit_card_id, category_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [transaction.description, transaction.amount, transaction.date, transaction.type,
       transaction.account_id || null, transaction.credit_card_id || null,
       transaction.category_id || null, transaction.status || 'paid']
    );

    if ((transaction.status === 'paid' || !transaction.status) && transaction.account_id) {
      const delta = transaction.type === 'income' ? transaction.amount : -transaction.amount;
      await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [delta, transaction.account_id]);
    }

    res.json({ transaction, id: result.insertId });
  } catch (err) { next(err); }
});

module.exports = router;
