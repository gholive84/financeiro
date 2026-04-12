import React, { useState, useEffect, useMemo } from 'react';
import CalendarGrid from '../components/Calendar/CalendarGrid';
import api from '../services/api';
import { X, Trash2, ChevronLeft, Search, Calendar } from 'lucide-react';

// --- Utilitário de períodos ---
const PERIOD_PRESETS = [
  { key: 'today',      label: 'Hoje' },
  { key: '7days',      label: '7 dias' },
  { key: '15days',     label: '15 dias' },
  { key: 'month',      label: 'Este mês' },
  { key: 'last_month', label: 'Mês anterior' },
  { key: 'custom',     label: 'Personalizado' },
];

function getPeriodRange(mode, customStart, customEnd) {
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];

  switch (mode) {
    case 'today':
      return { start: fmt(today), end: fmt(today), year: today.getFullYear(), month: today.getMonth() + 1 };
    case '7days': {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return { start: fmt(s), end: fmt(today), year: today.getFullYear(), month: today.getMonth() + 1 };
    }
    case '15days': {
      const s = new Date(today); s.setDate(s.getDate() - 14);
      return { start: fmt(s), end: fmt(today), year: today.getFullYear(), month: today.getMonth() + 1 };
    }
    case 'month':
      return { start: null, end: null, year: today.getFullYear(), month: today.getMonth() + 1 };
    case 'last_month': {
      const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { start: null, end: null, year: d.getFullYear(), month: d.getMonth() + 1 };
    }
    case 'custom': {
      if (customStart && customEnd) {
        const d = new Date(customStart + 'T12:00:00');
        return { start: customStart, end: customEnd, year: d.getFullYear(), month: d.getMonth() + 1 };
      }
      return { start: null, end: null, year: today.getFullYear(), month: today.getMonth() + 1 };
    }
    default:
      return { start: null, end: null, year: today.getFullYear(), month: today.getMonth() + 1 };
  }
}

function TransactionDetail({ transaction: t, onClose, onDelete }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
          <ChevronLeft size={16} className="text-slate-400" />
        </button>
        <p className="font-semibold text-slate-800 flex-1 truncate">{t.description}</p>
        <span className={`text-base font-bold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
          {t.type === 'income' ? '+' : '-'} R$ {parseFloat(t.amount).toFixed(2).replace('.', ',')}
        </span>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <Row label="Data" value={String(t.date).split('T')[0].split('-').reverse().join('/')} />
        <Row label="Tipo" value={t.type === 'income' ? 'Receita' : 'Despesa'} />
        <Row label="Status" value={t.status === 'paid' ? 'Pago' : 'Pendente'} />
        {t.category && (
          <Row label="Categoria" value={
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: t.category.color + '22', color: t.category.color }}>
              {t.category.parent_name ? `${t.category.parent_name} › ${t.category.name}` : t.category.name}
            </span>
          } />
        )}
        {t.account && <Row label="Conta" value={t.account.name} />}
        {t.credit_card && (
          <Row label="Cartão" value={
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: t.credit_card.color + '22', color: t.credit_card.color }}>
              {t.credit_card.name}
            </span>
          } />
        )}
        {t.installment_total > 1 && (
          <Row label="Parcela" value={
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-500 font-semibold">
              {t.installment_current}/{t.installment_total}x
            </span>
          } />
        )}
        {t.notes && <Row label="Notas" value={t.notes} />}
        {t.user && <Row label="Usuário" value={`@${t.user.username}`} />}
      </div>

      <button onClick={() => onDelete(t)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold transition-colors">
        <Trash2 size={14} /> Excluir lançamento
      </button>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}

function applyFilters(data, search, categoryId, startDate, endDate) {
  const q = search.toLowerCase().trim();
  const filtered = {};
  for (const [key, day] of Object.entries(data)) {
    if (startDate && key < startDate) continue;
    if (endDate && key > endDate) continue;
    const txs = day.transactions.filter(t => {
      const matchSearch = !q || t.description?.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q);
      const catId = Number(categoryId);
      const matchCat = !categoryId || t.category?.id === catId || t.category?.parent_id === catId;
      return matchSearch && matchCat;
    });
    if (txs.length === 0) continue;
    filtered[key] = {
      transactions: txs,
      total_income: txs.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0),
      total_expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0),
    };
  }
  return filtered;
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [periodMode, setPeriodMode] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const periodRange = useMemo(
    () => getPeriodRange(periodMode, customStart, customEnd),
    [periodMode, customStart, customEnd]
  );

  const load = async (y, m) => {
    setLoading(true);
    const { data: d } = await api.get(`/transactions/calendar/${y}/${m}`);
    setData(d);
    setLoading(false);
  };

  // Quando o período muda, navega para o mês correspondente
  useEffect(() => {
    const y = periodRange.year;
    const m = periodRange.month;
    setYear(y);
    setMonth(m);
    setSelectedDay(null);
    setSelectedTransaction(null);
    load(y, m);
  }, [periodRange.year, periodRange.month]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  const filteredData = useMemo(
    () => applyFilters(data, search, categoryId || null, periodRange.start, periodRange.end),
    [data, search, categoryId, periodRange]
  );

  const handleMonthChange = (y, m) => {
    setYear(y); setMonth(m);
    setSelectedDay(null); setSelectedTransaction(null);
    // Ao navegar manualmente, volta para "Este mês" se necessário
    setPeriodMode('month');
    setCustomStart(''); setCustomEnd('');
    load(y, m);
  };

  const handleDayClick = (key, dayData) => {
    setSelectedDay({ key, ...dayData });
    setSelectedTransaction(null);
  };

  const visibleSelectedDay = useMemo(() => {
    if (!selectedDay) return null;
    const fd = filteredData[selectedDay.key];
    if (!fd) return null;
    return { key: selectedDay.key, ...fd };
  }, [selectedDay, filteredData]);

  const handleDelete = async (t) => {
    const isInstallment = t.installment_total > 1 && t.installment_group_id;
    if (isInstallment) {
      const deleteAll = window.confirm(
        `Parcela ${t.installment_current}/${t.installment_total} — "${t.description}"\n\nOK = Excluir TODAS as ${t.installment_total} parcelas\nCancelar = Excluir só esta`
      );
      await api.delete(`/transactions/${t.id}${deleteAll ? '?all=true' : ''}`);
    } else {
      if (!confirm('Deletar esta transação?')) return;
      await api.delete(`/transactions/${t.id}`);
    }
    setSelectedTransaction(null);
    setSelectedDay(null);
    load(year, month);
  };

  const handlePeriodChange = (key) => {
    setPeriodMode(key);
    if (key !== 'custom') { setCustomStart(''); setCustomEnd(''); }
    setSelectedDay(null); setSelectedTransaction(null);
  };

  const hasFilters = search || categoryId;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Calendário</h1>

      {/* Filtro de período */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_PRESETS.map(p => (
            <button key={p.key} onClick={() => handlePeriodChange(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${periodMode === p.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {periodMode === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={14} className="text-slate-400 flex-shrink-0" />
            <input type="date"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span className="text-slate-400 text-sm">até</span>
            <input type="date"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
        )}

        {/* Busca e categoria */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar lançamento..."
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedDay(null); setSelectedTransaction(null); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
            />
          </div>
          <select
            value={categoryId}
            onChange={e => { setCategoryId(e.target.value); setSelectedDay(null); setSelectedTransaction(null); }}
            className="sm:w-52 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
          >
            <option value="">Todas as categorias</option>
            {categories.filter(c => !c.parent_id).map(parent => {
              const subs = categories.filter(c => String(c.parent_id) === String(parent.id));
              return subs.length > 0 ? (
                <optgroup key={parent.id} label={parent.name}>
                  <option value={parent.id}>{parent.name}</option>
                  {subs.map(c => <option key={c.id} value={c.id}>↳ {c.name}</option>)}
                </optgroup>
              ) : (
                <option key={parent.id} value={parent.id}>{parent.name}</option>
              );
            })}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setCategoryId(''); setSelectedDay(null); setSelectedTransaction(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors bg-white whitespace-nowrap"
            >
              <X size={14} /> Limpar
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-slate-400 text-sm">Carregando...</p>}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <CalendarGrid
            year={year} month={month} data={filteredData}
            onDayClick={handleDayClick}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* Painel lateral */}
        {visibleSelectedDay && (
          <div className="lg:w-80 bg-white rounded-2xl border border-slate-100 p-5 h-fit">
            {selectedTransaction ? (
              <TransactionDetail
                transaction={selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                onDelete={handleDelete}
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {new Date(visibleSelectedDay.key + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="flex gap-3 mt-1">
                      {visibleSelectedDay.total_income > 0 && (
                        <span className="text-xs text-green-600 font-semibold">+R$ {visibleSelectedDay.total_income.toFixed(2).replace('.', ',')}</span>
                      )}
                      {visibleSelectedDay.total_expense > 0 && (
                        <span className="text-xs text-red-500 font-semibold">-R$ {visibleSelectedDay.total_expense.toFixed(2).replace('.', ',')}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>
                <div className="space-y-1">
                  {visibleSelectedDay.transactions.map(t => (
                    <button key={t.id} onClick={() => setSelectedTransaction(t)}
                      className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{t.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {t.category && (
                            <span className="text-xs" style={{ color: t.category.color }}>
                              {t.category.parent_name ? `${t.category.parent_name} › ${t.category.name}` : t.category.name}
                            </span>
                          )}
                          {t.account && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 font-medium">
                              {t.account.name}
                            </span>
                          )}
                          {t.credit_card && (
                            <span className="text-[10px] px-1.5 py-0.5 font-medium"
                              style={{ backgroundColor: t.credit_card.color + '22', color: t.credit_card.color }}>
                              {t.credit_card.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'} R$ {parseFloat(t.amount).toFixed(2).replace('.', ',')}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
