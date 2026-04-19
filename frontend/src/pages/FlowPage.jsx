import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, CreditCard } from 'lucide-react';
import api from '../services/api';

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fmt = (v) => v === 0 ? '—' : `R$\u00a0${v.toFixed(2).replace('.', ',')}`;
const fmtFull = (v) => `R$ ${Math.abs(v).toFixed(2).replace('.', ',')}`;

// ── Tabela Geral ──────────────────────────────────────────────────────────────
function FlowGeral({ year }) {
  const [data, setData] = useState({ categories: [] });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailTxs, setDetailTxs] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/flow/monthly?year=${year}`)
      .then(r => setData(r.data))
      .catch(() => setData({ categories: [] }))
      .finally(() => setLoading(false));
  }, [year]);

  const incomes       = useMemo(() => data.categories.filter(c => c.category_type === 'income').sort((a, b) => b.total - a.total), [data]);
  const fixedExpenses = useMemo(() => data.categories.filter(c => c.category_type === 'expense' && c.expense_nature === 'fixed').sort((a, b) => b.total - a.total), [data]);
  const varExpenses   = useMemo(() => data.categories.filter(c => c.category_type === 'expense' && c.expense_nature !== 'fixed').sort((a, b) => b.total - a.total), [data]);
  const expenses      = useMemo(() => [...fixedExpenses, ...varExpenses], [fixedExpenses, varExpenses]);

  const monthTotals = useMemo(() => {
    const exp = {}, inc = {};
    for (let m = 1; m <= 12; m++) {
      exp[m] = expenses.reduce((s, c) => s + (c.months[m] || 0), 0);
      inc[m] = incomes.reduce((s,  c) => s + (c.months[m] || 0), 0);
    }
    return { exp, inc };
  }, [expenses, incomes]);

  const handleCellClick = async (category, month) => {
    if (category.months[month] === 0) return;
    setSelected({ category, month });
    setDetailLoading(true);
    setDetailTxs([]);
    try {
      const { data: txs } = await api.get(`/transactions?month=${month}&year=${year}&category_id=${category.category_id}`);
      setDetailTxs(txs);
    } catch { setDetailTxs([]); }
    setDetailLoading(false);
  };

  const cellClass = (type, value) => {
    if (value === 0) return 'text-slate-300 text-xs';
    return type === 'expense'
      ? 'text-red-600 font-medium text-xs cursor-pointer hover:bg-red-50 rounded'
      : 'text-green-600 font-medium text-xs cursor-pointer hover:bg-green-50 rounded';
  };

  function Section({ title, rows, type, color }) {
    if (!rows.length) return null;
    const secTotals = {};
    for (let m = 1; m <= 12; m++) secTotals[m] = rows.reduce((s, c) => s + (c.months[m] || 0), 0);
    const secTotal = rows.reduce((s, c) => s + c.total, 0);
    return (
      <>
        <tr>
          <td colSpan={14} className="px-3 py-2 text-xs font-bold uppercase tracking-wider"
            style={{ color, backgroundColor: color + '11' }}>{title}</td>
        </tr>
        {rows.map(cat => (
          <tr key={`${cat.category_type}_${cat.expense_nature}_${cat.category_id}`} className="hover:bg-slate-50 border-b border-slate-50">
            <td className="px-3 py-2 text-xs text-slate-700 font-medium whitespace-nowrap sticky left-0 bg-white z-10 min-w-[160px] max-w-[200px] truncate">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.category_color }} />
                {cat.category_name}
              </span>
            </td>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <td key={m} className={`px-2 py-2 text-right whitespace-nowrap ${cellClass(type, cat.months[m])}`}
                onClick={() => handleCellClick(cat, m)}>{fmt(cat.months[m])}</td>
            ))}
            <td className={`px-3 py-2 text-right text-xs font-bold whitespace-nowrap ${type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
              {fmt(cat.total)}
            </td>
          </tr>
        ))}
        <tr className="border-t border-slate-200">
          <td className="px-3 py-2 text-xs font-bold text-slate-600 sticky left-0 bg-slate-50 z-10">Total {title}</td>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <td key={m} className={`px-2 py-2 text-right text-xs font-bold whitespace-nowrap ${type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
              {fmt(secTotals[m])}
            </td>
          ))}
          <td className={`px-3 py-2 text-right text-xs font-bold whitespace-nowrap ${type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
            {fmt(secTotal)}
          </td>
        </tr>
      </>
    );
  }

  if (loading) return <p className="text-slate-400 text-sm text-center py-20">Carregando...</p>;

  return (
    <div className="flex gap-6">
      <div className="flex-1 overflow-x-auto bg-white rounded-2xl border border-slate-100">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 sticky left-0 bg-slate-50 z-10 min-w-[160px]">Categoria</th>
              {MONTHS.map((m, i) => (
                <th key={i} className="px-2 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{m}</th>
              ))}
              <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody>
            <Section title="Receitas"          rows={incomes}       type="income"  color="#16a34a" />
            <Section title="Despesas Fixas"    rows={fixedExpenses} type="expense" color="#7c3aed" />
            <Section title="Despesas Variáveis" rows={varExpenses}  type="expense" color="#dc2626" />
            {(incomes.length > 0 || expenses.length > 0) && (
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="px-3 py-3 text-xs font-bold text-slate-700 sticky left-0 bg-slate-50 z-10">Saldo</td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                  const balance = (monthTotals.inc[m] || 0) - (monthTotals.exp[m] || 0);
                  return (
                    <td key={m} className={`px-2 py-3 text-right text-xs font-bold whitespace-nowrap ${balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {balance === 0 ? '—' : `${balance > 0 ? '+' : ''}${fmtFull(balance)}`}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-right text-xs font-bold whitespace-nowrap text-slate-700">
                  {(() => {
                    const total = incomes.reduce((s,c) => s+c.total,0) - expenses.reduce((s,c) => s+c.total,0);
                    return total === 0 ? '—' : `${total > 0 ? '+' : ''}${fmtFull(total)}`;
                  })()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {expenses.length === 0 && incomes.length === 0 && (
          <p className="text-center text-slate-400 py-16 text-sm">Nenhuma transação encontrada para {year}.</p>
        )}

      </div>

      {selected && (
        <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-100 p-5 h-fit max-h-[80vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-semibold text-slate-800 text-sm">{selected.category.category_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{MONTHS[selected.month - 1]} · {year}</p>
              <p className={`text-lg font-bold mt-1 ${selected.category.category_type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                {fmtFull(selected.category.months[selected.month])}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          {detailLoading ? (
            <p className="text-slate-400 text-sm text-center py-6">Carregando...</p>
          ) : detailTxs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Nenhuma transação.</p>
          ) : (
            <div className="space-y-1">
              {detailTxs.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-2 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate font-medium">{t.description}</p>
                    <p className="text-xs text-slate-400">{String(t.date).split('T')[0].split('-').reverse().join('/')}</p>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'} {fmtFull(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tabela Cartões ────────────────────────────────────────────────────────────
function FlowCartoes({ year }) {
  const [data, setData] = useState({ cards: [] });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailTxs, setDetailTxs] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/flow/cards?year=${year}`)
      .then(r => setData(r.data))
      .catch(() => setData({ cards: [] }))
      .finally(() => setLoading(false));
  }, [year]);

  const handleCellClick = async (card, category, month) => {
    if (category.months[month] === 0) return;
    setSelected({ card, category, month });
    setDetailLoading(true);
    setDetailTxs([]);
    try {
      const { data: txs } = await api.get(
        `/transactions?month=${month}&year=${year}&category_id=${category.category_id}&credit_card_id=${card.card_id}`
      );
      setDetailTxs(txs);
    } catch { setDetailTxs([]); }
    setDetailLoading(false);
  };

  if (loading) return <p className="text-slate-400 text-sm text-center py-20">Carregando...</p>;
  if (!data.cards.length) return <p className="text-center text-slate-400 py-16 text-sm">Nenhum gasto em cartão para {year}.</p>;

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-6">
        {data.cards.map(card => {
          const sortedCategories = [...card.categories].sort((a, b) => b.total - a.total);
          const cardTotal = card.categories.reduce((s, c) => s + c.total, 0);
          const monthTotals = {};
          for (let m = 1; m <= 12; m++) {
            monthTotals[m] = card.categories.reduce((s, c) => s + (c.months[m] || 0), 0);
          }
          return (
            <div key={card.card_id} className="overflow-x-auto bg-white rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 px-4 py-3 border-b"
                style={{ borderColor: card.card_color + '33', backgroundColor: card.card_color + '11' }}>
                <CreditCard size={16} style={{ color: card.card_color }} />
                <span className="font-semibold text-sm" style={{ color: card.card_color }}>{card.card_name}</span>
                {card.card_bank && <span className="text-xs text-slate-400">· {card.card_bank}</span>}
                <span className="ml-auto text-xs font-bold text-red-600">{fmt(cardTotal)}</span>
              </div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 sticky left-0 bg-slate-50 z-10 min-w-[160px]">Categoria</th>
                    {MONTHS.map((m, i) => (
                      <th key={i} className="px-2 py-2 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{m}</th>
                    ))}
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map(cat => (
                    <tr key={cat.category_id} className="hover:bg-slate-50 border-b border-slate-50">
                      <td className="px-3 py-2 text-xs text-slate-700 font-medium whitespace-nowrap sticky left-0 bg-white z-10 min-w-[160px] max-w-[200px] truncate">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.category_color }} />
                          {cat.category_name}
                        </span>
                      </td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <td key={m}
                          className={`px-2 py-2 text-right whitespace-nowrap text-xs ${cat.months[m] === 0 ? 'text-slate-300' : 'text-red-600 font-medium cursor-pointer hover:bg-red-50 rounded'}`}
                          onClick={() => handleCellClick(card, cat, m)}>
                          {fmt(cat.months[m])}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right text-xs font-bold text-red-700 whitespace-nowrap">{fmt(cat.total)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <td className="px-3 py-2 text-xs font-bold text-slate-600 sticky left-0 bg-slate-50 z-10">Total</td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <td key={m} className="px-2 py-2 text-right text-xs font-bold text-red-700 whitespace-nowrap">{fmt(monthTotals[m])}</td>
                    ))}
                    <td className="px-3 py-2 text-right text-xs font-bold text-red-700">{fmt(cardTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-100 p-5 h-fit max-h-[80vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold mb-2 inline-block"
                style={{ backgroundColor: selected.card.card_color + '22', color: selected.card.card_color }}>
                {selected.card.card_name}
              </span>
              <p className="font-semibold text-slate-800 text-sm">{selected.category.category_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{MONTHS[selected.month - 1]} · {year}</p>
              <p className="text-lg font-bold mt-1 text-red-600">{fmtFull(selected.category.months[selected.month])}</p>
            </div>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          {detailLoading ? (
            <p className="text-slate-400 text-sm text-center py-6">Carregando...</p>
          ) : detailTxs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Nenhuma transação.</p>
          ) : (
            <div className="space-y-1">
              {detailTxs.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-2 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate font-medium">{t.description}</p>
                    <p className="text-xs text-slate-400">{String(t.date).split('T')[0].split('-').reverse().join('/')}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-500 flex-shrink-0">- {fmtFull(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cartão Parcelas ───────────────────────────────────────────────────────────
function FlowParcelas() {
  const [data, setData] = useState({ cards: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/flow/installments')
      .then(r => setData(r.data))
      .catch(() => setData({ cards: [] }))
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (d) => String(d).split('T')[0].split('-').reverse().join('/');
  const fmtBRL = (v) => `R$ ${parseFloat(v).toFixed(2).replace('.', ',')}`;

  if (loading) return <p className="text-slate-400 text-sm text-center py-20">Carregando...</p>;
  if (!data.cards.length) return <p className="text-center text-slate-400 py-16 text-sm">Nenhuma compra parcelada encontrada.</p>;

  return (
    <div className="space-y-6">
      {data.cards.map(card => (
        <div key={card.card_id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          {/* Cabeçalho do cartão */}
          <div className="flex items-center gap-2 px-5 py-3 border-b"
            style={{ borderColor: card.card_color + '33', backgroundColor: card.card_color + '11' }}>
            <CreditCard size={16} style={{ color: card.card_color }} />
            <span className="font-semibold text-sm" style={{ color: card.card_color }}>{card.card_name}</span>
            {card.card_bank && <span className="text-xs text-slate-400">· {card.card_bank}</span>}
            <span className="ml-auto text-xs font-bold text-slate-500">{card.groups.length} parcelamento{card.groups.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Lista de parcelamentos */}
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {card.groups.map(g => {
              const pct = Math.round((g.paid_count / g.installment_total) * 100);
              return (
                <div key={g.group_id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{g.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {fmtDate(g.first_date)} → {fmtDate(g.last_date)}
                      </p>
                      <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: g.category_color + '22', color: g.category_color }}>
                        {g.category_name}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmtBRL(g.amount_per_installment)}<span className="text-xs font-normal text-slate-400">/mês</span></p>
                      <p className="text-xs text-slate-400 mt-0.5">Total {fmtBRL(g.total_amount)}</p>
                    </div>
                  </div>

                  {/* Progresso */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{g.paid_count} paga{g.paid_count !== 1 ? 's' : ''} · {g.pending_count} pendente{g.pending_count !== 1 ? 's' : ''}</span>
                      <span className="font-semibold">{g.paid_count}/{g.installment_total}x</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: card.card_color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function FlowPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState('geral');

  const tabs = [
    { key: 'geral',     label: 'Geral' },
    { key: 'cartoes',   label: 'Cartões' },
    { key: 'parcelas',  label: 'Cartão Parcelas' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fluxo Mensal</h1>
          <p className="text-sm text-slate-400 mt-1">Receitas e despesas por categoria e mês.</p>
        </div>
        {tab !== 'parcelas' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setYear(y => y - 1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={16} className="text-slate-600" />
            </button>
            <span className="text-lg font-bold text-slate-800 w-16 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'geral'    && <FlowGeral year={year} />}
      {tab === 'cartoes'  && <FlowCartoes year={year} />}
      {tab === 'parcelas' && <FlowParcelas />}
    </div>
  );
}
