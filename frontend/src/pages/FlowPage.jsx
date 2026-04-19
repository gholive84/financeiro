import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, CreditCard, Pencil, Scissors, RotateCcw, Target } from 'lucide-react';
import api from '../services/api';
import TransactionForm from '../components/Transactions/TransactionForm';

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
  const [editTx, setEditTx] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mode, setMode] = useState('accrual'); // 'accrual' | 'cash'
  // cutTxs: Map<id, { tx, catKey, month }>
  const [cutTxs, setCutTxs] = useState(new Map());
  // budgetMap: { [category_id]: { [month]: { amount_planned, amount_spent } } }
  const [budgetMap, setBudgetMap] = useState({});

  const getCatKey = (cat) => `${cat.category_id}_${cat.is_installment ? 1 : 0}_${cat.expense_nature}`;

  const toggleCut = (t) => {
    const catKey = getCatKey(selected.category);
    const month = selected.month;
    setCutTxs(m => {
      const n = new Map(m);
      n.has(t.id) ? n.delete(t.id) : n.set(t.id, { tx: t, catKey, month });
      return n;
    });
  };

  useEffect(() => {
    setLoading(true);
    setCutTxs(new Map());
    api.get(`/flow/monthly?year=${year}&mode=${mode}`)
      .then(r => setData(r.data))
      .catch(() => setData({ categories: [] }))
      .finally(() => setLoading(false));
    api.get(`/budgets?year=${year}`)
      .then(r => {
        const map = {};
        for (const b of r.data) {
          if (!map[b.category_id]) map[b.category_id] = {};
          map[b.category_id][b.month] = { planned: b.amount_planned, spent: b.amount_spent };
        }
        setBudgetMap(map);
      })
      .catch(() => setBudgetMap({}));
  }, [year, mode, refreshKey]);

  const incomes             = useMemo(() => data.categories.filter(c => c.category_type === 'income').sort((a, b) => b.total - a.total), [data]);
  const fixedExpenses       = useMemo(() => data.categories.filter(c => c.category_type === 'expense' && c.expense_nature === 'fixed' && !c.is_installment).sort((a, b) => b.total - a.total), [data]);
  const installmentExpenses = useMemo(() => data.categories.filter(c => c.category_type === 'expense' && c.is_installment).sort((a, b) => b.total - a.total), [data]);
  const varExpenses         = useMemo(() => data.categories.filter(c => c.category_type === 'expense' && c.expense_nature !== 'fixed' && !c.is_installment).sort((a, b) => b.total - a.total), [data]);
  const expenses            = useMemo(() => [...fixedExpenses, ...installmentExpenses, ...varExpenses], [fixedExpenses, installmentExpenses, varExpenses]);

  // net balance impact of cuts per month: expense cuts = +balance, income cuts = -balance
  const cutsPerMonth = useMemo(() => {
    const acc = {};
    for (let i = 1; i <= 12; i++) acc[i] = 0;
    for (const { tx, month } of cutTxs.values()) {
      if (tx.type === 'expense') acc[month] += tx.amount;
      else if (tx.type === 'income') acc[month] -= tx.amount;
    }
    return acc;
  }, [cutTxs]);

  const monthTotals = useMemo(() => {
    const exp = {}, inc = {};
    for (let m = 1; m <= 12; m++) {
      exp[m] = expenses.reduce((s, c) => s + (c.months[m] || 0), 0);
      inc[m] = incomes.reduce((s,  c) => s + (c.months[m] || 0), 0);
    }
    return { exp, inc };
  }, [expenses, incomes]);

  const fetchDetail = async (category, month) => {
    setDetailLoading(true);
    setDetailTxs([]);
    try {
      const cashParam = mode === 'cash' ? '&cash_mode=true' : '';
      const { data: txs } = await api.get(`/transactions?month=${month}&year=${year}&category_id=${category.category_id}${cashParam}`);
      const filtered = txs.filter(t => {
        if (category.is_installment)              return !!t.installment_group_id;
        if (category.expense_nature === 'fixed')  return t.expense_nature === 'fixed' && !t.installment_group_id;
        return t.expense_nature !== 'fixed' && !t.installment_group_id;
      });
      setDetailTxs(filtered);
    } catch { setDetailTxs([]); }
    setDetailLoading(false);
  };

  const handleCellClick = (category, month) => {
    if (category.months[month] === 0) return;
    setSelected({ category, month });
    fetchDetail(category, month);
  };

  const handleEditSave = () => {
    setEditTx(null);
    setRefreshKey(k => k + 1);
    if (selected) fetchDetail(selected.category, selected.month);
  };

  const cutForCatMonth = (cat, m) => {
    const ck = getCatKey(cat);
    let sum = 0;
    for (const { tx, catKey, month } of cutTxs.values())
      if (catKey === ck && month === m) sum += tx.amount;
    return sum;
  };

  function Section({ title, rows, type, color }) {
    if (!rows.length) return null;
    const secTotals = {}, secCuts = {};
    for (let m = 1; m <= 12; m++) {
      secTotals[m] = rows.reduce((s, c) => s + (c.months[m] || 0), 0);
      secCuts[m]   = rows.reduce((s, c) => s + cutForCatMonth(c, m), 0);
    }
    const secTotal  = rows.reduce((s, c) => s + c.total, 0);
    const totalCuts = Object.values(secCuts).reduce((s, v) => s + v, 0);

    return (
      <>
        <tr>
          <td colSpan={14} className="px-3 py-2 text-xs font-bold uppercase tracking-wider"
            style={{ color, backgroundColor: color + '11' }}>{title}</td>
        </tr>
        {rows.map(cat => {
          const catCutTotal = Array.from({length:12},(_,i)=>i+1).reduce((s,m)=>s+cutForCatMonth(cat,m),0);
          return (
            <tr key={`${cat.category_type}_${cat.expense_nature}_${cat.category_id}`} className="hover:bg-slate-50 border-b border-slate-50">
              <td className="px-3 py-2 text-xs text-slate-700 font-medium whitespace-nowrap sticky left-0 bg-white z-10 min-w-[160px] max-w-[200px] truncate">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.category_color }} />
                  {cat.category_name}
                </span>
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                const orig = cat.months[m] || 0;
                const cutAmt = cutForCatMonth(cat, m);
                const display = orig - cutAmt;
                const budget = budgetMap[cat.category_id]?.[m];
                const cls = orig === 0
                  ? 'text-slate-300 text-xs'
                  : cutAmt > 0
                    ? 'text-emerald-600 font-medium text-xs cursor-pointer bg-emerald-50/70 rounded'
                    : type === 'expense'
                      ? 'text-red-600 font-medium text-xs cursor-pointer hover:bg-red-50 rounded'
                      : 'text-green-600 font-medium text-xs cursor-pointer hover:bg-green-50 rounded';
                return (
                  <td key={m} className={`px-2 py-2 text-right whitespace-nowrap ${cls}`}
                    onClick={() => handleCellClick(cat, m)}>
                    <div className="inline-flex flex-col items-end gap-0.5">
                      {fmt(display)}
                      {budget && (
                        <div className="w-full min-w-[32px] h-0.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, budget.planned > 0 ? (budget.spent / budget.planned) * 100 : 0)}%`,
                              backgroundColor: budget.spent > budget.planned ? '#ef4444' : '#22c55e',
                            }} />
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
              <td className={`px-3 py-2 text-right text-xs font-bold whitespace-nowrap ${catCutTotal > 0 ? 'text-emerald-700' : type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
                {fmt(cat.total - catCutTotal)}
              </td>
            </tr>
          );
        })}
        {totalCuts > 0 && (
          <tr className="border-t border-emerald-100 bg-emerald-50/50">
            <td className="px-3 py-1.5 sticky left-0 bg-emerald-50/50 z-10">
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold italic">
                <Scissors size={10} /> Cortes simulados
              </span>
            </td>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <td key={m} className="px-2 py-1.5 text-right text-xs text-emerald-600 font-medium whitespace-nowrap">
                {secCuts[m] > 0 ? `−${fmtFull(secCuts[m])}` : ''}
              </td>
            ))}
            <td className="px-3 py-1.5 text-right text-xs text-emerald-700 font-bold whitespace-nowrap">
              −{fmtFull(totalCuts)}
            </td>
          </tr>
        )}
        <tr className="border-t border-slate-200">
          <td className="px-3 py-2 text-xs font-bold text-slate-600 sticky left-0 bg-slate-50 z-10">Total {title}</td>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const adj = (secTotals[m] || 0) - (secCuts[m] || 0);
            return (
              <td key={m} className={`px-2 py-2 text-right text-xs font-bold whitespace-nowrap ${secCuts[m] > 0 ? 'text-emerald-700' : type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
                {fmt(adj)}
              </td>
            );
          })}
          <td className={`px-3 py-2 text-right text-xs font-bold whitespace-nowrap ${totalCuts > 0 ? 'text-emerald-700' : type === 'expense' ? 'text-red-700' : 'text-green-700'}`}>
            {fmt(secTotal - totalCuts)}
          </td>
        </tr>
      </>
    );
  }

  if (loading) return <p className="text-slate-400 text-sm text-center py-20">Carregando...</p>;

  return (
    <div className="space-y-3">
      {/* Regime toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 font-medium">Regime:</span>
        <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-semibold">
          <button onClick={() => setMode('accrual')}
            className={`px-3 py-1.5 transition-colors ${mode === 'accrual' ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            Competência
          </button>
          <button onClick={() => setMode('cash')}
            className={`px-3 py-1.5 transition-colors ${mode === 'cash' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            Caixa
          </button>
        </div>
        {mode === 'cash' && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
            Despesas de cartão contam no mês seguinte ao lançamento
          </span>
        )}
      </div>

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
            <Section title="Receitas"             rows={incomes}             type="income"  color="#16a34a" />
            <Section title="Despesas Fixas"       rows={fixedExpenses}       type="expense" color="#7c3aed" />
            <Section title="Despesas Parceladas"  rows={installmentExpenses} type="expense" color="#2563eb" />
            <Section title="Despesas Variáveis"   rows={varExpenses}         type="expense" color="#dc2626" />
            {(incomes.length > 0 || expenses.length > 0) && (<>
              <tr className="border-t border-slate-200 bg-green-50/40">
                <td className="px-3 py-2 text-xs font-bold text-green-700 sticky left-0 bg-green-50/40 z-10">Total Receitas</td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                  const incCut = Array.from(cutTxs.values()).filter(c => c.tx.type === 'income' && c.month === m).reduce((s,c) => s + c.tx.amount, 0);
                  const val = (monthTotals.inc[m] || 0) - incCut;
                  return (
                    <td key={m} className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap text-green-700">
                      {val === 0 ? '—' : fmt(val)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap text-green-700">
                  {(() => {
                    const incCuts = Array.from(cutTxs.values()).filter(c => c.tx.type === 'income').reduce((s,c) => s + c.tx.amount, 0);
                    const val = incomes.reduce((s,c) => s+c.total,0) - incCuts;
                    return val === 0 ? '—' : fmt(val);
                  })()}
                </td>
              </tr>
              <tr className="bg-red-50/40">
                <td className="px-3 py-2 text-xs font-bold text-red-700 sticky left-0 bg-red-50/40 z-10">Total Despesas</td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                  const expCut = Array.from(cutTxs.values()).filter(c => c.tx.type === 'expense' && c.month === m).reduce((s,c) => s + c.tx.amount, 0);
                  const val = (monthTotals.exp[m] || 0) - expCut;
                  return (
                    <td key={m} className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap text-red-700">
                      {val === 0 ? '—' : fmt(val)}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap text-red-700">
                  {(() => {
                    const expCuts = Array.from(cutTxs.values()).filter(c => c.tx.type === 'expense').reduce((s,c) => s + c.tx.amount, 0);
                    const val = expenses.reduce((s,c) => s+c.total,0) - expCuts;
                    return val === 0 ? '—' : fmt(val);
                  })()}
                </td>
              </tr>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="px-3 py-3 text-xs font-bold text-slate-700 sticky left-0 bg-slate-50 z-10">Saldo</td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                  const balance = (monthTotals.inc[m] || 0) - (monthTotals.exp[m] || 0) + (cutsPerMonth[m] || 0);
                  return (
                    <td key={m} className={`px-2 py-3 text-right text-xs font-bold whitespace-nowrap ${balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {balance === 0 ? '—' : `${balance > 0 ? '+' : ''}${fmtFull(balance)}`}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-right text-xs font-bold whitespace-nowrap text-slate-700">
                  {(() => {
                    const expCuts = Array.from(cutTxs.values()).filter(c => c.tx.type === 'expense').reduce((s, c) => s + c.tx.amount, 0);
                    const incCuts = Array.from(cutTxs.values()).filter(c => c.tx.type === 'income').reduce((s, c) => s + c.tx.amount, 0);
                    const total = incomes.reduce((s,c) => s+c.total,0) - expenses.reduce((s,c) => s+c.total,0) + expCuts - incCuts;
                    return total === 0 ? '—' : `${total > 0 ? '+' : ''}${fmtFull(total)}`;
                  })()}
                </td>
              </tr>
            </>)}
          </tbody>
        </table>
        {expenses.length === 0 && incomes.length === 0 && (
          <p className="text-center text-slate-400 py-16 text-sm">Nenhuma transação encontrada para {year}.</p>
        )}
      </div>

      {selected && (() => {
        const originalTotal = detailTxs.reduce((s, t) => s + t.amount, 0);
        const cutTotal = detailTxs.filter(t => cutTxs.has(t.id)).reduce((s, t) => s + t.amount, 0);
        const hasCuts = cutTotal > 0;
        return (
          <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-100 p-5 h-fit max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{selected.category.category_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{MONTHS[selected.month - 1]} · {year}</p>
                {mode === 'cash' && (
                  <p className="text-[10px] text-blue-500 mt-0.5">
                    Cartão: lançamentos de {selected.month === 1 ? `Dez/${year - 1}` : `${MONTHS[selected.month - 2]}/${year}`}
                  </p>
                )}
                <p className={`text-lg font-bold mt-1 ${selected.category.category_type === 'expense' ? 'text-red-600' : 'text-green-600'} ${hasCuts ? 'line-through opacity-40 text-base' : ''}`}>
                  {fmtFull(originalTotal)}
                </p>
                {hasCuts && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-lg font-bold text-emerald-600">{fmtFull(originalTotal - cutTotal)}</p>
                    <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                      <Scissors size={11} /> economia simulada de {fmtFull(cutTotal)}
                    </p>
                  </div>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-slate-100 flex-shrink-0">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {/* Budget block */}
            {(() => {
              const b = budgetMap[selected.category.category_id]?.[selected.month];
              if (!b) return null;
              const spent = b.spent;
              const planned = b.planned;
              const remaining = planned - spent;
              const pct = planned > 0 ? Math.min(100, (spent / planned) * 100) : 0;
              const over = spent > planned;
              return (
                <div className={`mb-4 rounded-xl border p-3 space-y-2 ${over ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20'}`}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <Target size={12} /> Orçamento
                    </span>
                    <span className="text-xs text-slate-500">R$ {planned.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: over ? '#ef4444' : '#22c55e' }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Gasto: <span className="font-semibold text-slate-700 dark:text-slate-200">R$ {spent.toFixed(2).replace('.', ',')}</span></span>
                    <span className={over ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                      {over ? `Excedido R$ ${Math.abs(remaining).toFixed(2).replace('.', ',')}` : `Saldo R$ ${remaining.toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>
                </div>
              );
            })()}

            {cutTxs.size > 0 && (
              <button onClick={() => setCutTxs(new Map())}
                className="mb-3 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors">
                <RotateCcw size={11} /> resetar simulação
              </button>
            )}

            {detailLoading ? (
              <p className="text-slate-400 text-sm text-center py-6">Carregando...</p>
            ) : detailTxs.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Nenhuma transação.</p>
            ) : (
              <div className="space-y-0.5">
                {detailTxs.map(t => {
                  const cut = cutTxs.has(t.id);
                  return (
                    <div key={t.id} className={`flex items-center gap-2 py-2 border-b border-slate-50 last:border-0 transition-colors ${cut ? 'opacity-40' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm text-slate-700 truncate font-medium ${cut ? 'line-through' : ''}`}>{t.description}</p>
                        <p className="text-xs text-slate-400">{String(t.date).split('T')[0].split('-').reverse().join('/')}</p>
                      </div>
                      <span className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'} ${cut ? 'line-through' : ''}`}>
                        {t.type === 'income' ? '+' : '-'} {fmtFull(t.amount)}
                      </span>
                      <button onClick={() => toggleCut(t)} title={cut ? 'Restaurar' : 'Simular corte'}
                        className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${cut ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:text-orange-400 hover:bg-orange-50'}`}>
                        {cut ? <RotateCcw size={13} /> : <Scissors size={13} />}
                      </button>
                      <button onClick={() => setEditTx(t)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-500 flex-shrink-0 transition-colors">
                        <Pencil size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {editTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Editar transação</h2>
              <button onClick={() => setEditTx(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <TransactionForm
              initial={editTx}
              onSave={handleEditSave}
              onCancel={() => setEditTx(null)}
            />
          </div>
        </div>
      )}
    </div>
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
  const [editTx, setEditTx] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get(`/flow/cards?year=${year}`)
      .then(r => setData(r.data))
      .catch(() => setData({ cards: [] }))
      .finally(() => setLoading(false));
  }, [year, refreshKey]);

  const fetchDetail = async (card, category, month) => {
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

  const handleCellClick = (card, category, month) => {
    if (category.months[month] === 0) return;
    setSelected({ card, category, month });
    fetchDetail(card, category, month);
  };

  const handleEditSave = () => {
    setEditTx(null);
    setRefreshKey(k => k + 1);
    if (selected) fetchDetail(selected.card, selected.category, selected.month);
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
                <div key={t.id} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate font-medium">{t.description}</p>
                    <p className="text-xs text-slate-400">{String(t.date).split('T')[0].split('-').reverse().join('/')}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-500 flex-shrink-0">- {fmtFull(t.amount)}</span>
                  <button onClick={() => setEditTx(t)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-500 flex-shrink-0 transition-colors">
                    <Pencil size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Editar transação</h2>
              <button onClick={() => setEditTx(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <X size={16} className="text-slate-400" />
              </button>
            </div>
            <TransactionForm
              initial={editTx}
              onSave={handleEditSave}
              onCancel={() => setEditTx(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cartão Parcelas ───────────────────────────────────────────────────────────
function FlowParcelas({ year }) {
  const [data, setData] = useState({ cards: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/flow/installments?year=${year}`)
      .then(r => setData(r.data))
      .catch(() => setData({ cards: [] }))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <p className="text-slate-400 text-sm text-center py-20">Carregando...</p>;
  if (!data.cards.length) return <p className="text-center text-slate-400 py-16 text-sm">Nenhuma compra parcelada em {year}.</p>;

  return (
    <div className="space-y-6">
      {data.cards.map(card => {
        const monthTotals = {};
        for (let m = 1; m <= 12; m++)
          monthTotals[m] = card.groups.reduce((s, g) => s + (g.months[m] || 0), 0);
        const cardTotal = card.groups.reduce((s, g) => s + g.total, 0);

        return (
          <div key={card.card_id} className="overflow-x-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            {/* Cabeçalho */}
            <div className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: card.card_color + '33', backgroundColor: card.card_color + '11' }}>
              <CreditCard size={16} style={{ color: card.card_color }} />
              <span className="font-semibold text-sm" style={{ color: card.card_color }}>{card.card_name}</span>
              {card.card_bank && <span className="text-xs text-slate-400">· {card.card_bank}</span>}
              <span className="ml-auto text-xs font-bold text-red-600">{fmt(cardTotal)}</span>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 min-w-[180px]">Descrição</th>
                  {MONTHS.map((m, i) => (
                    <th key={i} className="px-2 py-2 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">{m}</th>
                  ))}
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 whitespace-nowrap">No ano</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-purple-500 whitespace-nowrap">Montante</th>
                </tr>
              </thead>
              <tbody>
                {card.groups.map(g => (
                  <tr key={g.group_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 border-b border-slate-50 dark:border-slate-700">
                    <td className="px-3 py-2 sticky left-0 bg-white dark:bg-slate-800 z-10 min-w-[180px] max-w-[240px]">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{g.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: g.category_color + '22', color: g.category_color }}>
                          {g.category_name}
                        </span>
                        <span className="text-[10px] text-slate-400">{g.paid_count}/{g.installment_total}x</span>
                      </div>
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <td key={m} className={`px-2 py-2 text-right whitespace-nowrap text-xs ${g.months[m] === 0 ? 'text-slate-300 dark:text-slate-600' : 'text-red-600 font-medium'}`}>
                        {fmt(g.months[m])}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right text-xs font-bold text-red-700 whitespace-nowrap">{fmt(g.total)}</td>
                    <td className="px-3 py-2 text-right text-xs font-bold text-purple-600 whitespace-nowrap">{fmt(g.full_total)}</td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/30">
                  <td className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">Total</td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <td key={m} className="px-2 py-2 text-right text-xs font-bold text-red-700 whitespace-nowrap">{fmt(monthTotals[m])}</td>
                  ))}
                  <td className="px-3 py-2 text-right text-xs font-bold text-red-700">{fmt(cardTotal)}</td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-purple-600">{fmt(card.groups.reduce((s, g) => s + g.full_total, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
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
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'geral'    && <FlowGeral year={year} />}
      {tab === 'cartoes'  && <FlowCartoes year={year} />}
      {tab === 'parcelas' && <FlowParcelas year={year} />}
    </div>
  );
}
