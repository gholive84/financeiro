import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/shared/Modal';
import TransactionForm from '../components/Transactions/TransactionForm';
import TransactionList from '../components/Transactions/TransactionList';

export default function TransactionsPage() {
  const now = new Date();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ month: now.getMonth() + 1, year: now.getFullYear(), type: '', status: '' });
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.month) params.set('month', filters.month);
    if (filters.year) params.set('year', filters.year);
    if (filters.type) params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    const { data } = await api.get(`/transactions?${params}`);
    setTransactions(data);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleSave = () => { setModal(false); setEditing(null); load(); };
  const handleEdit = (t) => { setEditing(t); setModal(true); };
  const handleDelete = async (id) => {
    if (!confirm('Deletar esta transação?')) return;
    await api.delete(`/transactions/${id}`);
    load();
  };

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const filtered = transactions.filter(t =>
    !search || t.description.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
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
            value={filters.month} onChange={e => setFilters(f => ({ ...f, month: e.target.value }))}
          >
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
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
        </div>
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

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-10">Carregando...</p>
      ) : (
        <TransactionList transactions={filtered} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Editar Transação' : 'Nova Transação'}>
        <TransactionForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setModal(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
