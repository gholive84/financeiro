import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Wallet, Star } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/shared/Modal';

const typeLabels = { debit: 'Conta Corrente', cash: 'Dinheiro', pix: 'PIX' };
const emptyAccount = { name: '', type: 'debit', balance: '', color: '#6366F1', icon: '', is_default: false };

function AccountForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial
    ? { ...initial, balance: String(initial.balance), is_default: !!initial.is_default }
    : emptyAccount);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, balance: parseFloat(form.balance) || 0 };
      if (initial?.id) await api.put(`/accounts/${initial.id}`, payload);
      else await api.post('/accounts', payload);
      onSave();
    } catch { alert('Erro ao salvar conta'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input required placeholder="Nome da conta" className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={form.name} onChange={e => set('name', e.target.value)} />

      <select required className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={form.type} onChange={e => set('type', e.target.value)}>
        <option value="debit">Conta Corrente</option>
        <option value="cash">Dinheiro</option>
        <option value="pix">PIX</option>
      </select>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Saldo inicial (R$)</label>
          <input type="number" step="0.01" placeholder="0,00" className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            value={form.balance} onChange={e => set('balance', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Cor</label>
          <input type="color" className="w-full h-10 border border-slate-200 dark:border-slate-600 rounded-xl px-2 cursor-pointer"
            value={form.color} onChange={e => set('color', e.target.value)} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => set('is_default', !form.is_default)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
          ${form.is_default
            ? 'border-amber-300 bg-amber-50 text-amber-700'
            : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
      >
        <Star size={15} className={form.is_default ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
        {form.is_default ? 'Conta padrão (pré-selecionada no lançamento com IA)' : 'Definir como conta padrão'}
      </button>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get('/accounts');
    setAccounts(data);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Deletar esta conta?')) return;
    await api.delete(`/accounts/${id}`);
    load();
  };

  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Contas</h1>
          {accounts.length > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              Saldo total: <span className="font-semibold text-slate-700 dark:text-slate-200">R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          )}
        </div>
        <button onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} /> Nova Conta
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wallet size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma conta cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => (
            <div key={a.id} className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 ${a.is_default ? 'border-amber-200' : 'border-slate-100 dark:border-slate-700'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: a.color + '22' }}>
                    <Wallet size={18} style={{ color: a.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{a.name}</p>
                      {a.is_default && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <Star size={9} className="fill-amber-500 text-amber-500" /> Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{typeLabels[a.type]}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(a); setModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className={`text-2xl font-bold ${parseFloat(a.balance) < 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-100'}`}>
                R$ {parseFloat(a.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Editar Conta' : 'Nova Conta'} size="sm">
        <AccountForm initial={editing}
          onSave={() => { setModal(false); setEditing(null); load(); }}
          onCancel={() => { setModal(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}
