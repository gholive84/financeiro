import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, CreditCard, Star } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/shared/Modal';

const emptyCard = { name: '', bank: '', color: '#FF6B00', closing_day: 1, due_day: 10, credit_limit: '', is_default: false };

function CardForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial
    ? { ...initial, is_default: !!initial.is_default }
    : emptyCard);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null };
      if (initial?.id) await api.put(`/credit-cards/${initial.id}`, payload);
      else await api.post('/credit-cards', payload);
      onSave();
    } catch { alert('Erro ao salvar cartão'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input required placeholder="Nome do cartão" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.name} onChange={e => set('name', e.target.value)} />
      <input placeholder="Banco" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.bank} onChange={e => set('bank', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Cor</label>
          <input type="color" className="w-full h-10 border border-slate-200 rounded-xl px-2 cursor-pointer"
            value={form.color} onChange={e => set('color', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Limite (R$)</label>
          <input type="number" step="0.01" placeholder="0,00" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.credit_limit} onChange={e => set('credit_limit', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Dia de fechamento</label>
          <input required type="number" min={1} max={31} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.closing_day} onChange={e => set('closing_day', parseInt(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Dia de vencimento</label>
          <input required type="number" min={1} max={31} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.due_day} onChange={e => set('due_day', parseInt(e.target.value))} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => set('is_default', !form.is_default)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
          ${form.is_default
            ? 'border-amber-300 bg-amber-50 text-amber-700'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
      >
        <Star size={15} className={form.is_default ? 'fill-amber-400 text-amber-400' : 'text-slate-400'} />
        {form.is_default ? 'Cartão padrão (pré-selecionado no lançamento com IA)' : 'Definir como cartão padrão'}
      </button>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default function CreditCardsPage() {
  const [cards, setCards] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get('/credit-cards');
    setCards(data);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Deletar este cartão?')) return;
    await api.delete(`/credit-cards/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Cartões de Crédito</h1>
        <button onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} /> Novo Cartão
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CreditCard size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum cartão cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(c => (
            <div key={c.id} className={`bg-white rounded-2xl border p-5 ${c.is_default ? 'border-amber-200' : 'border-slate-100'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.color }}>
                    <CreditCard size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-slate-800">{c.name}</p>
                      {c.is_default && (
                        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <Star size={9} className="fill-amber-500 text-amber-500" /> Padrão
                        </span>
                      )}
                    </div>
                    {c.bank && <p className="text-xs text-slate-400">{c.bank}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(c); setModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {c.credit_limit && (
                <p className="text-sm text-slate-600 mb-2">
                  Limite: <span className="font-semibold">R$ {parseFloat(c.credit_limit).toFixed(2).replace('.', ',')}</span>
                </p>
              )}
              <div className="flex gap-4 text-xs text-slate-500">
                <span>Fecha dia <strong>{c.closing_day}</strong></span>
                <span>Vence dia <strong>{c.due_day}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Editar Cartão' : 'Novo Cartão'}>
        <CardForm initial={editing} onSave={() => { setModal(false); setEditing(null); load(); }} onCancel={() => { setModal(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}
