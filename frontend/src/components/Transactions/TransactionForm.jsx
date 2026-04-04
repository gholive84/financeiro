import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';

const today = () => new Date().toISOString().split('T')[0];
const statusForDate = (date) => date <= today() ? 'paid' : 'pending';

const empty = {
  description: '', amount: '', date: today(), type: 'expense',
  account_id: '', credit_card_id: '', category_id: '',
  status: 'paid', notes: '', is_recurring: false, installments: 1,
};

export default function TransactionForm({ initial, onSave, onCancel }) {
  const { categories, accounts, creditCards, loadCategories, loadAccounts, loadCreditCards } = useApp();
  const [form, setForm] = useState(initial ? {
    ...initial,
    amount: String(initial.amount),
    date: String(initial.date).split('T')[0],
    account_id: initial.account?.id || '',
    credit_card_id: initial.credit_card?.id || '',
    category_id: initial.category?.id || '',
  } : empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories(); loadAccounts(); loadCreditCards();
  }, []);

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'date') updated.status = statusForDate(v);
    return updated;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        account_id: form.credit_card_id ? null : (form.account_id || null),
        credit_card_id: form.credit_card_id || null,
        category_id: form.category_id || null,
      };
      if (initial?.id) {
        await api.put(`/transactions/${initial.id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }
      onSave();
    } catch (err) {
      alert('Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === form.type);
  const parentCategories = filteredCategories.filter(c => !c.parent_id);
  const childCategories = filteredCategories.filter(c => c.parent_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo */}
      <div className="flex rounded-xl overflow-hidden border border-slate-200">
        {['expense', 'income'].map(t => (
          <button
            type="button" key={t}
            className={`flex-1 py-2 text-sm font-semibold transition-colors
              ${form.type === t
                ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            onClick={() => set('type', t)}
          >
            {t === 'expense' ? 'Despesa' : 'Receita'}
          </button>
        ))}
      </div>

      <input
        required placeholder="Descrição"
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.description} onChange={e => set('description', e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          required type="number" step="0.01" min="0.01" placeholder="Valor (R$)"
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.amount} onChange={e => set('amount', e.target.value)}
        />
        <input
          required type="date"
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.date} onChange={e => set('date', e.target.value)}
        />
      </div>

      <select
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.category_id} onChange={e => set('category_id', e.target.value)}
      >
        <option value="">Categoria (opcional)</option>
        {parentCategories.map(parent => {
          const subs = childCategories.filter(c => String(c.parent_id) === String(parent.id));
          return subs.length > 0 ? (
            <optgroup key={parent.id} label={parent.name}>
              <option value={parent.id}>{parent.name} (geral)</option>
              {subs.map(c => <option key={c.id} value={c.id}>↳ {c.name}</option>)}
            </optgroup>
          ) : (
            <option key={parent.id} value={parent.id}>{parent.name}</option>
          );
        })}
        {childCategories.filter(c => !parentCategories.find(p => p.id === c.parent_id)).map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Pagamento */}
      <div className="grid grid-cols-2 gap-3">
        <select
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.account_id} onChange={e => { set('account_id', e.target.value); if (e.target.value) { set('credit_card_id', ''); set('installments', 1); } }}
          disabled={!!form.credit_card_id}
        >
          <option value="">Conta</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select
          className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.credit_card_id} onChange={e => { set('credit_card_id', e.target.value); if (e.target.value) set('account_id', ''); }}
          disabled={!!form.account_id}
        >
          <option value="">Cartão de crédito</option>
          {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Parcelas — só aparece com cartão de crédito */}
      {form.credit_card_id && !initial?.id && (
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Parcelas</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.installments} onChange={e => set('installments', parseInt(e.target.value))}>
            <option value={1}>À vista (1x)</option>
            {[2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
              <option key={n} value={n}>{n}x {form.amount ? `de R$ ${(parseFloat(form.amount) / n).toFixed(2).replace('.', ',')}` : ''}</option>
            ))}
          </select>
          {form.installments > 1 && (
            <p className="text-xs text-blue-500 mt-1">
              Serão criadas {form.installments} transações mensais automaticamente.
            </p>
          )}
        </div>
      )}

      <select
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.status} onChange={e => set('status', e.target.value)}
      >
        <option value="paid">Pago</option>
        <option value="pending">Pendente</option>
      </select>

      <textarea
        placeholder="Observações (opcional)" rows={2}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        value={form.notes} onChange={e => set('notes', e.target.value)}
      />

      <div className="flex gap-3 pt-2">
        <button
          type="button" onClick={onCancel}
          className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit" disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
