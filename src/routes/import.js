const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const OPENAI_KEY = process.env.OPENAI_API_KEY;

function buildJsonSchema(categories, accounts, creditCards, today) {
  return `Categorias disponíveis:
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
- Extraia TODAS as transações que encontrar
- Se não conseguir determinar a data, use hoje (${today})
- Valores sempre positivos
- Se for fatura de cartão, use credit_card_id quando possível
- Ignore totais, saldos e linhas que não sejam transações individuais`;
}

function parseGPTResponse(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`IA não retornou JSON válido: ${raw.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

async function interpretWithGPT(text, categories, accounts, creditCards) {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `Você é um assistente de finanças pessoais. Analise o texto abaixo (extrato bancário, fatura de cartão, lista de despesas em CSV ou qualquer formato financeiro) e extraia TODAS as transações encontradas.

Texto:
${text.slice(0, 8000)}

Data de hoje: ${today}

${buildJsonSchema(categories, accounts, creditCards, today)}`;

  const gptRes = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
  }, {
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    timeout: 60000,
  });

  const raw = gptRes.data.choices[0].message.content.trim();
  return parseGPTResponse(raw);
}

async function interpretImageWithGPT(imageBuffer, mimeType, categories, accounts, creditCards) {
  const today = new Date().toISOString().split('T')[0];
  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const prompt = `Você é um assistente de finanças pessoais. Analise a imagem abaixo (pode ser um print de extrato bancário, fatura de cartão, comprovante de pagamento, print de app de banco, ou qualquer documento financeiro) e extraia TODAS as transações encontradas.

Data de hoje: ${today}

${buildJsonSchema(categories, accounts, creditCards, today)}`;

  const gptRes = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
        { type: 'text', text: prompt },
      ],
    }],
    temperature: 0.1,
  }, {
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    timeout: 90000,
  });

  const raw = gptRes.data.choices[0].message.content.trim();
  return parseGPTResponse(raw);
}

// Tenta parsear CSV estruturado diretamente (sem GPT), retorna null se não conseguir
function parseCSVDirect(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;

  // Detecta separador
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.replace(/"/g, '').trim().toLowerCase());

  // Mapeia colunas comuns de extratos brasileiros
  const colDate = headers.findIndex(h => h.includes('data'));
  const colDesc = headers.findIndex(h => h.includes('descri') || h.includes('histór') || h.includes('lançamento') || h.includes('estabelecimento'));
  // Pega a ÚLTIMA coluna com "valor" (geralmente é o valor em R$)
  let colAmount = -1;
  for (let i = headers.length - 1; i >= 0; i--) {
    if (headers[i].includes('valor') || headers[i].includes('r$')) { colAmount = i; break; }
  }
  const colParcela = headers.findIndex(h => h.includes('parcela'));

  if (colDate === -1 || colDesc === -1 || colAmount === -1) return null;

  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.replace(/"/g, '').trim());
    if (cols.length <= colAmount) continue;

    const rawAmount = parseFloat(cols[colAmount].replace(',', '.'));
    if (isNaN(rawAmount) || rawAmount === 0) continue;

    // Ignora linhas de totais/saldos/encargos sem descrição útil
    const desc = cols[colDesc];
    if (!desc || /^(total|saldo|encargo|juros|multa|iof|anuidade|inclusao|estorno)/i.test(desc)) continue;

    // Converte data DD/MM/YYYY → YYYY-MM-DD
    let date = cols[colDate];
    const dateParts = date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (dateParts) date = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;

    const today = new Date().toISOString().split('T')[0];
    const status = date <= today ? 'paid' : 'pending';

    // Parcelas: "2/10" → { current: 2, total: 10 }
    let installmentInfo = null;
    if (colParcela !== -1 && cols[colParcela]) {
      const m = cols[colParcela].match(/(\d+)\/(\d+)/);
      if (m) installmentInfo = { current: parseInt(m[1]), total: parseInt(m[2]) };
    }

    transactions.push({
      description: desc,
      amount: Math.abs(rawAmount),
      date,
      type: rawAmount < 0 ? 'income' : 'expense',
      category_id: null,
      account_id: null,
      credit_card_id: null,
      status,
      _installmentInfo: installmentInfo,
    });
  }

  return transactions.length > 0 ? transactions : null;
}

// POST /api/import/preview — analisa arquivo e retorna transações para revisão
router.post('/preview', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não recebido' });

    const [categories] = await db.query('SELECT id, name, type FROM categories WHERE workspace_id = ?', [req.workspace_id]);
    const [accounts] = await db.query('SELECT id, name FROM accounts WHERE workspace_id = ?', [req.workspace_id]);
    const [creditCards] = await db.query('SELECT id, name, bank FROM credit_cards WHERE workspace_id = ?', [req.workspace_id]);

    const mime = req.file.mimetype;
    const buffer = req.file.buffer;
    const isPDF = mime === 'application/pdf' || req.file.originalname?.endsWith('.pdf');
    const isCSV = !isPDF && (req.file.originalname?.endsWith('.csv') || mime.includes('csv'));
    const isImage = /^image\/(png|jpe?g|webp|gif)$/i.test(mime) ||
      /\.(png|jpe?g|webp|gif)$/i.test(req.file.originalname || '');

    // Para imagens: usa GPT-4o vision
    if (isImage) {
      const result = await interpretImageWithGPT(buffer, mime, categories, accounts, creditCards);
      return res.json({ transactions: result.transactions, total: result.transactions.length, source: 'vision' });
    }

    // Para CSV: tenta parse direto primeiro (sem IA, sem timeout)
    if (isCSV) {
      const utf8 = buffer.toString('utf8');
      const text = utf8.includes('\uFFFD') ? buffer.toString('latin1') : utf8;
      const parsed = parseCSVDirect(text);
      if (parsed) {
        return res.json({ transactions: parsed, total: parsed.length, source: 'csv-parse' });
      }
    }

    // Para PDF ou CSV não reconhecido: usa GPT
    let text = '';
    if (isPDF) {
      const pdfParse = require('pdf-parse');
      const pdfOptions = {};
      if (req.body.password) pdfOptions.password = req.body.password;
      const data = await pdfParse(buffer, pdfOptions);
      text = data.text;
    } else {
      const utf8 = buffer.toString('utf8');
      text = utf8.includes('\uFFFD') ? buffer.toString('latin1') : utf8;
    }

    if (!text.trim()) return res.status(400).json({ error: 'Não foi possível extrair texto do arquivo' });

    const result = await interpretWithGPT(text, categories, accounts, creditCards);
    res.json({ transactions: result.transactions, total: result.transactions.length, source: 'gpt' });
  } catch (err) {
    next(err);
  }
});

// POST /api/import/save — salva todas as transações confirmadas
router.post('/save', async (req, res, next) => {
  try {
    const { transactions } = req.body;
    if (!transactions?.length) return res.status(400).json({ error: 'Nenhuma transação para salvar' });

    // Gera group_id para transações parceladas do mesmo grupo (mesma descrição + total)
    const groupMap = {};
    for (const t of transactions) {
      if (t._installmentInfo) {
        const key = `${t.description}|${t._installmentInfo.total}`;
        if (!groupMap[key]) groupMap[key] = uuidv4();
      }
    }

    let saved = 0;
    for (const t of transactions) {
      const info = t._installmentInfo;
      const groupId = info ? groupMap[`${t.description}|${info.total}`] : null;

      await db.query(
        `INSERT INTO transactions (description, amount, date, type, account_id, credit_card_id, category_id, status, user_id, installment_total, installment_current, installment_group_id, workspace_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.description, t.amount, t.date, t.type, t.account_id || null, t.credit_card_id || null, t.category_id || null, t.status || 'paid', req.user?.id || null,
         info ? info.total : null, info ? info.current : null, groupId, req.workspace_id]
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
