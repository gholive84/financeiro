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

  const expenses = useMemo(() => data.categories.filter(c => c.category_type === 'expense'), [data]);
  const incomes  = useMemo(() => data.categories.filter(c => c.category_type === 'income'),  [data]);

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
    return (
      <>
        <tr>
          <td colSpan={14} className="px-3 py-2 text-xs font-bold uppercase tracking-wider"
            style={{ color, backgroundColor: color + '11' }}>{title}</td>
        </tr>
        {rows.map(cat => (
          <tr key={`${cat.category_type}_${cat.category_id}`} className="hover:bg-slate-50 border-b border-slate-50">
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
              {fmt(type === 'expense' ? monthTotals.exp[m] : monthTotals.inc[m])}
            </td>
          ))}
          <td className={`px-3 py-2 text-right text-xs font-bold whitespace-nowrap ${type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
            {fmt(rows.reduce((s, c) => s + c.total, 0))}
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
            <Section title="Receitas" rows={incomes}  type="income"  color="#16a34a" />
            <Section title="Despesas" rows={expenses} type="expense" color="#dc2626" />
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
                  {card.categories.map(cat => (
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

// ── Página principal ──────────────────────────────────────────────────────────
export default function FlowPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState('geral');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fluxo Mensal</h1>
          <p className="text-sm text-slate-400 mt-1">Receitas e despesas por categoria e mês.</p>
        </div>
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
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[{ key: 'geral', label: 'Geral' }, { key: 'cartoes', label: 'Cartões' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'geral' ? <FlowGeral year={year} /> : <FlowCartoes year={year} />}
    </div>
  );
}
