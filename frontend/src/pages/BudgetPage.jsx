import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import BudgetProgress from '../components/Budget/BudgetProgress';
import Modal from '../components/shared/Modal';

function BudgetForm({ categories, onSave, onCancel, month, year }) {
  const [form, setForm] = useState({ category_id: '', amount_planned: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/budgets', { ...form, amount_planned: parseFloat(form.amount_planned), month, year });
      onSave();
    } catch { alert('Erro ao salvar orçamento'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <select required className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={form.category_id} onChange={e => set('category_id', e.target.value)}>
        <option value="">Selecione a categoria</option>
        {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input required type="number" step="0.01" min="0.01" placeholder="Valor planejado (R$)"
        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={form.amount_planned} onChange={e => set('amount_planned', e.target.value)} />
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default function BudgetPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState([]);
  const [modal, setModal] = useState(false);
  const { categories, loadCategories } = useApp();

  useEffect(() => { loadCategories(); }, []);

  const load = useCallback(async () => {
    const { data } = await api.get(`/budgets?month=${month}&year=${year}`);
    setBudgets(data);
  }, [month, year]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Remover este orçamento?')) return;
    await api.delete(`/budgets/${id}`);
    load();
  };

  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const totalPlanned = budgets.reduce((s, b) => s + b.amount_planned, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.amount_spent, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Orçamento</h1>
        <div className="flex items-center gap-3">
          <select className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Total Planejado</p>
            <p className="text-xl font-bold text-slate-800">R$ {totalPlanned.toFixed(2).replace('.', ',')}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-400 mb-1">Total Gasto</p>
            <p className={`text-xl font-bold ${totalSpent > totalPlanned ? 'text-red-500' : 'text-slate-800'}`}>
              R$ {totalSpent.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p>Nenhum orçamento definido para este mês.</p>
          <button onClick={() => setModal(true)} className="mt-4 text-sm text-blue-600 hover:underline">
            Adicionar orçamento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(b => (
            <div key={b.id} className="relative group">
              <BudgetProgress budget={b} />
              <button onClick={() => handleDelete(b.id)}
                className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Orçamento" size="sm">
        <BudgetForm categories={categories} month={month} year={year}
          onSave={() => { setModal(false); load(); }}
          onCancel={() => setModal(false)} />
      </Modal>
    </div>
  );
}
