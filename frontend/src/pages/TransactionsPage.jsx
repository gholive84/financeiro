import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Trash2, Pencil, X, CheckSquare, Calendar, Hash } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/shared/Modal';
import TransactionForm from '../components/Transactions/TransactionForm';
import TransactionList from '../components/Transactions/TransactionList';
import { useApp } from '../context/AppContext';

// --- Utilitário de períodos ---
const PERIOD_PRESETS = [
  { key: 'today',      label: 'Hoje' },
  { key: 'month',      label: 'Este mês' },
  { key: 'last_month', label: 'Mês anterior' },
  { key: 'custom',     label: 'Personalizado' },
];

function getPeriodParams(mode, customStart, customEnd) {
  const today = new Date();
  const fmt = d => d.toISOString().split('T')[0];

  switch (mode) {
    case 'today':
      return { start_date: fmt(today), end_date: fmt(today) };
    case '7days': {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return { start_date: fmt(s), end_date: fmt(today) };
    }
    case '15days': {
      const s = new Date(today); s.setDate(s.getDate() - 14);
      return { start_date: fmt(s), end_date: fmt(today) };
    }
    case 'month':
      return { month: today.getMonth() + 1, year: today.getFullYear() };
    case 'last_month': {
      const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    }
    case 'custom':
      return customStart && customEnd
        ? { start_date: customStart, end_date: customEnd }
        : { month: today.getMonth() + 1, year: today.getFullYear() };
    default:
      return { month: today.getMonth() + 1, year: today.getFullYear() };
  }
}

function TransactionDetail({ t, onClose, onEdit, onDelete }) {
  function Row({ label, value }) {
    return (
      <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
        <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>
        <span className="text-sm text-slate-700 font-medium text-right">{value}</span>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{t.description}</p>
          <p className={`text-xl font-bold mt-0.5 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
            {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>
      <div>
        <Row label="Data" value={String(t.date).split('T')[0].split('-').reverse().join('/')} />
        <Row label="Tipo" value={t.type === 'income' ? 'Receita' : 'Despesa'} />
        <Row label="Status" value={t.status === 'paid' ? 'Pago' : 'Pendente'} />
        {t.category && <Row label="Categoria" value={
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: t.category.color + '22', color: t.category.color }}>
            {t.category.parent_name ? `${t.category.parent_name} › ${t.category.name}` : t.category.name}
          </span>
        } />}
        {t.account && <Row label="Conta" value={t.account.name} />}
        {t.credit_card && <Row label="Cartão" value={
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: t.credit_card.color + '22', color: t.credit_card.color }}>
            {t.credit_card.name}
          </span>
        } />}
        {t.installment_total > 1 && <Row label="Parcela" value={`${t.installment_current}/${t.installment_total}x`} />}
        {t.notes && <Row label="Notas" value={t.notes} />}
        {t.user && <Row label="Usuário" value={`@${t.user.username}`} />}
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-semibold transition-colors">
          <Pencil size={14} /> Editar
        </button>
        <button onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold transition-colors">
          <Trash2 size={14} /> Excluir
        </button>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [periodMode, setPeriodMode] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filters, setFilters] = useState({ type: '', status: '', category_id: '', tag_id: '' });
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const { categories, accounts, creditCards, loadCategories, loadAccounts, loadCreditCards } = useApp();
  useEffect(() => {
    loadCategories(); loadAccounts(); loadCreditCards();
    api.get('/tags').then(({ data }) => setAllTags(data)).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    const period = getPeriodParams(periodMode, customStart, customEnd);
    if (period.start_date) { params.set('start_date', period.start_date); params.set('end_date', period.end_date); }
    else if (period.month) { params.set('month', period.month); params.set('year', period.year); }
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.category_id) params.set('category_id', filters.category_id);
    if (filters.tag_id) params.set('tag_id', filters.tag_id);
    const { data } = await api.get(`/transactions?${params}`);
    setTransactions(data);
    setLoading(false);
  }, [periodMode, customStart, customEnd, filters]);

  useEffect(() => { load(); }, [load]);

  const handleSave = () => { setModal(false); setEditing(null); setDetail(null); load(); };
  const handleEdit = (t) => { setDetail(null); setEditing(t); setModal(true); };

  const toggleSelect = (id) => setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const clearSelection = () => setSelectedIds([]);
  const selectAll = () => setSelectedIds(filtered.map(t => t.id));

  const handleBulkApply = async (field, value) => {
    if (!selectedIds.length) return;
    setBulkApplying(true);
    try {
      await api.patch('/transactions/bulk', { ids: selectedIds, [field]: value || null });
      await load();
      clearSelection();
    } finally {
      setBulkApplying(false);
    }
  };

  const handleDelete = async (id) => {
    const t = transactions.find(t => t.id === id);
    const isInstallment = t?.installment_total > 1 && t?.installment_group_id;
    const isFixed = t?.expense_nature === 'fixed' && t?.fixed_group_id;

    if (isInstallment) {
      const deleteAll = window.confirm(
        `Parcela ${t.installment_current}/${t.installment_total} — "${t.description}"\n\nOK = Excluir TODAS as ${t.installment_total} parcelas\nCancelar = Excluir só esta parcela`
      );
      await api.delete(`/transactions/${id}${deleteAll ? '?all=true' : ''}`);
    } else if (isFixed) {
      const deleteAll = window.confirm(
        `Despesa fixa — "${t.description}"\n\nOK = Excluir TODAS as ocorrências desta despesa fixa\nCancelar = Excluir só este mês`
      );
      await api.delete(`/transactions/${id}${deleteAll ? '?all=true' : ''}`);
    } else {
      if (!confirm('Deletar esta transação?')) return;
      await api.delete(`/transactions/${id}`);
    }
    load();
  };

  const filtered = transactions.filter(t =>
    !search || t.description.toLowerCase().includes(search.toLowerCase())
  );

  const handlePeriodChange = (key) => {
    setPeriodMode(key);
    if (key !== 'custom') { setCustomStart(''); setCustomEnd(''); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Transações</h1>
        <button
          onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> Nova Transação
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">

        {/* Filtro de período */}
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

        {/* Datas personalizadas */}
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

        {/* Demais filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar..."
              className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
          >
            <option value="">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">Todos os status</option>
            <option value="paid">Pagos</option>
            <option value="pending">Pendentes</option>
          </select>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.category_id} onChange={e => setFilters(f => ({ ...f, category_id: e.target.value }))}
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
        </div>

        {/* Filtro por tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Hash size={13} className="text-slate-400 flex-shrink-0" />
            {allTags.map(tag => {
              const active = filters.tag_id === String(tag.id);
              return (
                <button key={tag.id} type="button"
                  onClick={() => setFilters(f => ({ ...f, tag_id: active ? '' : String(tag.id) }))}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${active ? 'border-transparent' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  style={active ? { backgroundColor: tag.color + '22', color: tag.color, borderColor: tag.color + '55' } : {}}>
                  {tag.name}
                  {active && <X size={10} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Receitas', value: filtered.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0), color: 'text-green-600' },
            { label: 'Despesas', value: filtered.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0), color: 'text-red-500' },
            { label: 'Saldo', value: filtered.reduce((s,t)=>t.type==='income'?s+t.amount:s-t.amount,0), color: 'text-slate-800' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 text-center">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>R$ {Math.abs(value).toFixed(2).replace('.', ',')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Barra de seleção em massa */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-600 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-white text-sm font-semibold flex-shrink-0">
            {selectedIds.length} selecionada{selectedIds.length > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 flex-1 flex-wrap">
            <select disabled={bulkApplying}
              className="border border-blue-400 bg-blue-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-1 min-w-[150px] disabled:opacity-60"
              onChange={e => { if (e.target.value !== '') { handleBulkApply('category_id', e.target.value); e.target.value = ''; } }}>
              <option value="">Categoria...</option>
              <option value="">— Remover categoria —</option>
              <optgroup label="Despesas">
                {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
              <optgroup label="Receitas">
                {categories.filter(c => c.type === 'income').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            </select>

            <select disabled={bulkApplying}
              className="border border-blue-400 bg-blue-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-1 min-w-[150px] disabled:opacity-60"
              onChange={e => { if (e.target.value !== '') { handleBulkApply('credit_card_id', e.target.value); e.target.value = ''; } }}>
              <option value="">Cartão de crédito...</option>
              <option value="">— Remover cartão —</option>
              {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}{c.bank ? ` · ${c.bank}` : ''}</option>)}
            </select>

            <select disabled={bulkApplying}
              className="border border-blue-400 bg-blue-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none flex-1 min-w-[150px] disabled:opacity-60"
              onChange={e => { if (e.target.value !== '') { handleBulkApply('account_id', e.target.value); e.target.value = ''; } }}>
              <option value="">Conta bancária...</option>
              <option value="">— Remover conta —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={selectAll} className="text-xs text-blue-200 hover:text-white transition-colors">
              Todas ({filtered.length})
            </button>
            <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-blue-500 text-blue-200 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {selectedIds.length === 0 && !loading && filtered.length > 0 && (
        <p className="text-xs text-slate-400 text-right -mt-2">
          Clique em <CheckSquare size={11} className="inline" /> para selecionar transações em massa
        </p>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-10">Carregando...</p>
      ) : (
        <TransactionList
          transactions={filtered}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDetail={t => setDetail(t)}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Editar Transação' : 'Nova Transação'}>
        <TransactionForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setModal(false); setEditing(null); }}
        />
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalhes">
        {detail && (
          <TransactionDetail
            t={detail}
            onClose={() => setDetail(null)}
            onEdit={() => handleEdit(detail)}
            onDelete={() => handleDelete(detail.id)}
          />
        )}
      </Modal>
    </div>
  );
}
