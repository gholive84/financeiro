import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import api from '../../services/api';

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmt(v) {
  return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2 shadow-md text-sm">
      <p className="font-semibold text-slate-700 dark:text-slate-200">{d.category}</p>
      <p className="text-red-500 font-bold">{fmt(d.total)}</p>
      <p className="text-xs text-slate-400 mt-0.5">Clique para ver transações</p>
    </div>
  );
}

function TransactionPanel({ categoryId, categoryName, categoryColor, month, year, onClose }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/transactions?month=${month}&year=${year}&category_id=${categoryId}&type=expense`)
      .then(r => setTxs(r.data))
      .finally(() => setLoading(false));
  }, [categoryId, month, year]);

  const total = txs.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative bg-white dark:bg-slate-800 w-full max-w-sm h-full shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor || '#64748b' }} />
            <p className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm">{categoryName}</p>
            <span className="text-xs text-slate-400 flex-shrink-0">{MONTH_NAMES[month - 1]}/{year}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
        ) : txs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Nenhuma transação.</div>
        ) : (
          <>
            <div className="px-4 py-2 bg-red-50 border-b border-red-100">
              <p className="text-xs text-slate-500">Total: <span className="font-bold text-red-500">{fmt(total)}</span></p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700">
              {txs.map(t => (
                <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{t.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {String(t.date).split('T')[0].split('-').reverse().join('/')}
                      {t.status === 'pending' && <span className="ml-1.5 text-amber-500">· Pendente</span>}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-500 flex-shrink-0">
                    - {fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ExpensesChart({ month: propMonth, year: propYear }) {
  const now = new Date();
  const controlled = propMonth != null && propYear != null;
  const [intMonth, setIntMonth] = useState(now.getMonth() + 1);
  const [intYear,  setIntYear]  = useState(now.getFullYear());
  const month = controlled ? propMonth : intMonth;
  const year  = controlled ? propYear  : intYear;
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get(`/dashboard/expenses-chart?month=${month}&year=${year}`)
      .then(r => setChartData(r.data))
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setSelected(null); }, [month, year]);

  function prevMonth() {
    if (intMonth === 1) { setIntMonth(12); setIntYear(y => y - 1); }
    else setIntMonth(m => m - 1);
  }
  function nextMonth() {
    const isCurrent = intMonth === now.getMonth() + 1 && intYear === now.getFullYear();
    if (isCurrent) return;
    if (intMonth === 12) { setIntMonth(1); setIntYear(y => y + 1); }
    else setIntMonth(m => m + 1);
  }

  const handleBarClick = (entry) => {
    if (!entry) return;
    setSelected({ categoryId: entry.category_id, categoryName: entry.category, categoryColor: entry.color });
  };

  const isCurrentMonth = intMonth === now.getMonth() + 1 && intYear === now.getFullYear();
  const total = chartData?.data.reduce((s, d) => s + d.total, 0) ?? 0;

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Gastos por Categoria</h2>
          {!controlled && (
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-20 text-center">
                {MONTH_NAMES[intMonth - 1]} {intYear}
              </span>
              <button onClick={nextMonth} disabled={isCurrentMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
        ) : !chartData?.data.length ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">Nenhum gasto registrado neste mês.</div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">
              Total: <span className="font-semibold text-red-500">{fmt(total)}</span>
              <span className="ml-2 text-slate-300 dark:text-slate-500">· clique numa barra para ver transações</span>
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData.data} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={v => `R$${v}`}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                  {chartData.data.map((entry, i) => (
                    <Cell key={i} fill={entry.color || '#2563EB'}
                      opacity={selected && selected.categoryId !== entry.category_id ? 0.4 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {selected && (
        <TransactionPanel
          categoryId={selected.categoryId}
          categoryName={selected.categoryName}
          categoryColor={selected.categoryColor}
          month={month}
          year={year}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
