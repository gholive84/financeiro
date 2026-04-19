import React, { useState, useEffect } from 'react';
import { Plus, PiggyBank } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/shared/Modal';
import SavingsCard from '../components/Savings/SavingsCard';
import SavingsMovementModal from '../components/Savings/SavingsMovementModal';

const emptyBox = { name: '', icon: 'piggy-bank', color: '#10B981', target_amount: '', deadline: '' };

function BoxForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyBox);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const icons = ['piggy-bank','target','home','car','plane','graduation-cap','heart','star','gift','zap'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, target_amount: form.target_amount ? parseFloat(form.target_amount) : null, deadline: form.deadline || null };
      if (initial?.id) await api.put(`/savings/${initial.id}`, payload);
      else await api.post('/savings', payload);
      onSave();
    } catch { alert('Erro ao salvar caixinha'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input required placeholder="Nome da caixinha" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.name} onChange={e => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Cor</label>
          <input type="color" className="w-full h-10 border border-slate-200 rounded-xl px-2 cursor-pointer"
            value={form.color} onChange={e => set('color', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Ícone</label>
          <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.icon} onChange={e => set('icon', e.target.value)}>
            {icons.map(ic => <option key={ic} value={ic}>{ic}</option>)}
          </select>
        </div>
      </div>
      <input type="number" step="0.01" min="0" placeholder="Meta (R$) — opcional" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.target_amount} onChange={e => set('target_amount', e.target.value)} />
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Prazo (opcional)</label>
        <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.deadline} onChange={e => set('deadline', e.target.value)} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default function SavingsPage() {
  const [boxes, setBoxes] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [movement, setMovement] = useState(null); // { box, type }

  const load = async () => {
    const { data } = await api.get('/savings');
    setBoxes(data);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Deletar esta caixinha?')) return;
    await api.delete(`/savings/${id}`);
    load();
  };

  const totalSaved = boxes.reduce((s, b) => s + b.current_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Caixinhas</h1>
          {boxes.length > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              Total guardado: <span className="font-semibold text-slate-700">R$ {totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          )}
        </div>
        <button onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} /> Nova Caixinha
        </button>
      </div>

      {boxes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <PiggyBank size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma caixinha criada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boxes.map(box => (
            <SavingsCard
              key={box.id} box={box}
              onEdit={b => { setEditing(b); setModal(true); }}
              onDelete={handleDelete}
              onMove={(b, type) => setMovement({ box: b, type })}
            />
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Editar Caixinha' : 'Nova Caixinha'} size="sm">
        <BoxForm initial={editing}
          onSave={() => { setModal(false); setEditing(null); load(); }}
          onCancel={() => { setModal(false); setEditing(null); }} />
      </Modal>

      {movement && (
        <SavingsMovementModal
          box={movement.box} type={movement.type}
          onClose={() => setMovement(null)}
          onSave={() => { setMovement(null); load(); }}
        />
      )}
    </div>
  );
}
