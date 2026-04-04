import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import * as Icons from 'lucide-react';
import api from '../services/api';
import Modal from '../components/shared/Modal';

const iconOptions = [
  'tag', 'briefcase', 'laptop', 'trending-up', 'plus-circle',
  'utensils', 'car', 'home', 'heart', 'book', 'gamepad-2',
  'shirt', 'shopping-cart', 'credit-card', 'more-horizontal',
  'music', 'coffee', 'gift', 'plane', 'zap', 'star', 'sun',
  'moon', 'activity', 'dollar-sign', 'percent', 'truck',
];

function CatIcon({ icon, color, size = 16 }) {
  const name = icon?.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const LucideIcon = Icons[name] || Icons.Tag;
  return <LucideIcon size={size} style={{ color }} />;
}

const emptyCategory = { name: '', icon: 'tag', color: '#6366F1', type: 'expense' };

function CategoryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyCategory);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial?.id) await api.put(`/categories/${initial.id}`, form);
      else await api.post('/categories', form);
      onSave();
    } catch { alert('Erro ao salvar categoria'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex rounded-xl overflow-hidden border border-slate-200">
        {['expense', 'income'].map(t => (
          <button type="button" key={t}
            className={`flex-1 py-2 text-sm font-semibold transition-colors
              ${form.type === t
                ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            onClick={() => set('type', t)}>
            {t === 'expense' ? 'Despesa' : 'Receita'}
          </button>
        ))}
      </div>

      <input required placeholder="Nome da categoria" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {iconOptions.map(ic => <option key={ic} value={ic}>{ic}</option>)}
          </select>
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: form.color + '22' }}>
          <CatIcon icon={form.icon} color={form.color} />
        </span>
        <span className="text-sm font-medium text-slate-700">{form.name || 'Preview'}</span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${form.type === 'expense' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
          {form.type === 'expense' ? 'Despesa' : 'Receita'}
        </span>
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    const { data } = await api.get('/categories');
    setCategories(data);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Deletar esta categoria?')) return;
    await api.delete(`/categories/${id}`);
    load();
  };

  const filtered = filter === 'all' ? categories : categories.filter(c => c.type === filter);
  const income = categories.filter(c => c.type === 'income');
  const expense = categories.filter(c => c.type === 'expense');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Categorias</h1>
        <button onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[['all', 'Todas'], ['expense', 'Despesas'], ['income', 'Receitas']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors
              ${filter === val ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Tag size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma categoria encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 px-4 py-3 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.color + '22' }}>
                <CatIcon icon={c.icon} color={c.color} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                <span className={`text-xs ${c.type === 'expense' ? 'text-red-400' : 'text-green-500'}`}>
                  {c.type === 'expense' ? 'Despesa' : 'Receita'}
                </span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditing(c); setModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Editar Categoria' : 'Nova Categoria'} size="sm">
        <CategoryForm initial={editing}
          onSave={() => { setModal(false); setEditing(null); load(); }}
          onCancel={() => { setModal(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}
