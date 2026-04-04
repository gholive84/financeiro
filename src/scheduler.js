const cron = require('node-cron');
const db = require('./db');

// Roda todo dia à meia-noite: marca como pago lançamentos pendentes com data <= hoje
async function markOverdueAsPaid() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Busca parcelas pendentes cuja data já passou ou é hoje
    const [rows] = await db.query(
      `SELECT id, amount, type, account_id FROM transactions
       WHERE status = 'pending' AND date <= ? AND installment_group_id IS NOT NULL`,
      [today]
    );

    if (!rows.length) return;

    for (const t of rows) {
      await db.query(`UPDATE transactions SET status = 'paid' WHERE id = ?`, [t.id]);

      // Atualiza saldo da conta (cartão de crédito não tem account_id)
      if (t.account_id) {
        const delta = t.type === 'income' ? t.amount : -t.amount;
        await db.query(`UPDATE accounts SET balance = balance + ? WHERE id = ?`, [delta, t.account_id]);
      }
    }

    console.log(`[scheduler] ${rows.length} lançamento(s) marcado(s) como pago em ${today}`);
  } catch (err) {
    console.error('[scheduler] Erro ao atualizar lançamentos:', err.message);
  }
}

function startScheduler() {
  // Roda todo dia à meia-noite
  cron.schedule('0 0 * * *', markOverdueAsPaid);

  // Roda também na inicialização para cobrir lançamentos anteriores
  markOverdueAsPaid();

  console.log('[scheduler] Agendador iniciado');
}

module.exports = { startScheduler };
