import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import { Tag, RepeatIcon } from 'lucide-react';

const today = () => new Date().toISOString().split('T')[0];
const statusForDate = (date) => date <= today() ? 'paid' : 'pending';

const empty = {
  description: '', amount: '', date: today(), type: 'expense',
  account_id: '', credit_card_id: '', category_id: '',
  status: 'paid', notes: '', is_recurring: false, installments: 1,
  expense_nature: null, fixed_months: 12,
  tag_ids: [],
};

export default function TransactionForm({ initial, onSave, onCancel }) {
  const { categories, accounts, creditCards, loadCategories, loadAccounts, loadCreditCards } = useApp();
  const [form, setForm] = useState(initial ? {
    ...empty,
    ...initial,
    amount: String(initial.amount),
    date: String(initial.date).split('T')[0],
    account_id: initial.account?.id || '',
    credit_card_id: initial.credit_card?.id || '',
    category_id: initial.category?.id || '',
    expense_nature: initial.expense_nature || null,
    fixed_months: initial.fixed_months || 12,
    tag_ids: (initial.tags || []).map(t => t.id),
  } : empty);
  const [loading, setLoading] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [updateRemaining, setUpdateRemaining] = useState(false);

  useEffect(() => {
    loadCategories(); loadAccounts(); loadCreditCards();
    api.get('/tags').then(({ data }) => setAllTags(data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'date') updated.status = statusForDate(v);
    if (k === 'type') updated.expense_nature = null;
    if (k === 'installments' && parseInt(v) > 1) updated.expense_nature = null;
    return updated;
  });

  const toggleTag = (id) => setForm(f => ({
    ...f,
    tag_ids: f.tag_ids.includes(id) ? f.tag_ids.filter(x => x !== id) : [...f.tag_ids, id],
  }));

  const isFixed = form.expense_nature === 'fixed';
  const isNew = !initial?.id;
  const isGrouped = !isNew && (initial?.fixed_group_id || initial?.installment_group_id);

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
        expense_nature: form.expense_nature || null,
        fixed_months: isFixed ? parseInt(form.fixed_months) || 12 : undefined,
        tag_ids: form.tag_ids,
        update_remaining: updateRemaining,
      };
      if (initial?.id) {
        await api.put(`/transactions/${initial.id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }
      onSave();
    } catch {
      alert('Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === form.type);
  const parentCategories = filteredCategories.filter(c => !c.parent_id);
  const childCategories = filteredCategories.filter(c => c.parent_id);

  const MonthSelector = ({ color }) => (
    <div className="space-y-2 pl-6">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name="fixed_type" checked={form.fixed_months === 0}
          onChange={() => set('fixed_months', 0)} className={`accent-${color}-600`} />
        <span className="text-sm text-slate-700 dark:text-slate-200">Todos os meses (12 meses)</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="radio" name="fixed_type" checked={form.fixed_months > 0}
          onChange={() => set('fixed_months', form.fixed_months > 0 ? form.fixed_months : 3)}
          className={`accent-${color}-600`} />
        <span className="text-sm text-slate-700 dark:text-slate-200">Por</span>
        <input type="number" min={1} max={60}
          className="w-16 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
          value={form.fixed_months > 0 ? form.fixed_months : 3}
          onChange={e => set('fixed_months', parseInt(e.target.value) || 1)}
          onClick={() => { if (form.fixed_months === 0) set('fixed_months', 3); }} />
        <span className="text-sm text-slate-700 dark:text-slate-200">meses</span>
      </label>
      <p className={`text-xs text-${color}-600`}>
        {isNew
          ? `Serão criadas ${form.fixed_months || 12} transações mensais a partir da data escolhida.`
          : `Esta transação + mais ${(form.fixed_months || 12) - 1} meses seguintes serão criados.`}
      </p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo */}
      <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
        {['expense', 'income'].map(t => (
          <button type="button" key={t}
            className={`flex-1 py-2 text-sm font-semibold transition-colors
              ${form.type === t
                ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
            onClick={() => set('type', t)}>
            {t === 'expense' ? 'Despesa' : 'Receita'}
          </button>
        ))}
      </div>

      <input required placeholder="Descrição"
        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={form.description} onChange={e => set('description', e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <input required type="number" step="0.01" min="0.01" placeholder="Valor (R$)"
          className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
          value={form.amount} onChange={e => set('amount', e.target.value)} />
        <input required type="date"
          className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
          value={form.date} onChange={e => set('date', e.target.value)} />
      </div>

      <select
        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={form.category_id} onChange={e => set('category_id', e.target.value)}>
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
          className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
          value={form.account_id}
          onChange={e => { set('account_id', e.target.value); if (e.target.value) set('credit_card_id', ''); }}
          disabled={!!form.credit_card_id}>
          <option value="">Conta</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select
          className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
          value={form.credit_card_id}
          onChange={e => { set('credit_card_id', e.target.value); if (e.target.value) set('account_id', ''); }}
          disabled={!!form.account_id}>
          <option value="">Cartão de crédito</option>
          {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Parcelas — cartão, despesa, sem recorrente */}
      {form.credit_card_id && form.type === 'expense' && isNew && !isFixed && (
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Parcelas</label>
          <select
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            value={form.installments} onChange={e => set('installments', parseInt(e.target.value))}>
            <option value={1}>À vista (1x)</option>
            {[2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
              <option key={n} value={n}>{n}x {form.amount ? `de R$ ${(parseFloat(form.amount) / n).toFixed(2).replace('.', ',')}` : ''}</option>
            ))}
          </select>
          {form.installments > 1 && (
            <p className="text-xs text-blue-500 mt-1">Serão criadas {form.installments} transações mensais automaticamente.</p>
          )}
        </div>
      )}

      {/* Compra recorrente no cartão */}
      {form.credit_card_id && form.type === 'expense' && form.installments <= 1 && (
        <div className={`rounded-xl border p-3 space-y-3 transition-colors ${isFixed ? 'border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-600'}`}>
          <button type="button" onClick={() => set('expense_nature', isFixed ? null : 'fixed')}
            className="flex items-center gap-2 w-full text-left">
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isFixed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
              {isFixed && <span className="w-2 h-2 bg-white rounded-sm block" />}
            </div>
            <RepeatIcon size={14} className={isFixed ? 'text-indigo-600' : 'text-slate-400'} />
            <span className={`text-sm font-medium ${isFixed ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'}`}>
              Compra recorrente (mesmo valor todo mês)
            </span>
          </button>
          {isFixed && <MonthSelector color="indigo" />}
        </div>
      )}

      {/* Despesa fixa — conta, despesa */}
      {form.type === 'expense' && !form.credit_card_id && (
        <div className={`rounded-xl border p-3 space-y-3 transition-colors ${isFixed ? 'border-violet-200 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-700' : 'border-slate-200 dark:border-slate-600'}`}>
          <button type="button" onClick={() => set('expense_nature', isFixed ? null : 'fixed')}
            className="flex items-center gap-2 w-full text-left">
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isFixed ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}>
              {isFixed && <span className="w-2 h-2 bg-white rounded-sm block" />}
            </div>
            <RepeatIcon size={14} className={isFixed ? 'text-violet-600' : 'text-slate-400'} />
            <span className={`text-sm font-medium ${isFixed ? 'text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-slate-300'}`}>
              Despesa fixa (recorrente)
            </span>
          </button>
          {isFixed && <MonthSelector color="violet" />}
        </div>
      )}

      <select
        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={form.status} onChange={e => set('status', e.target.value)}>
        <option value="paid">Pago</option>
        <option value="pending">Pendente</option>
      </select>

      {/* Aplicar às próximas ocorrências */}
      {isGrouped && (
        <label className="flex items-center gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 cursor-pointer">
          <input type="checkbox" checked={updateRemaining} onChange={e => setUpdateRemaining(e.target.checked)}
            className="w-4 h-4 accent-blue-600 flex-shrink-0" />
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            Aplicar alterações às próximas ocorrências
          </span>
        </label>
      )}

      {/* Tags */}
      {allTags.length > 0 && (
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1 block">
            <Tag size={11} /> Tags (opcional)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => {
              const active = form.tag_ids.includes(tag.id);
              return (
                <button type="button" key={tag.id} onClick={() => toggleTag(tag.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${active ? 'border-transparent' : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                  style={active ? { backgroundColor: tag.color + '22', color: tag.color, borderColor: tag.color + '44' } : {}}>
                  {active && '✓ '}{tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <textarea placeholder="Observações (opcional)" rows={2}
        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={form.notes} onChange={e => set('notes', e.target.value)} />

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
