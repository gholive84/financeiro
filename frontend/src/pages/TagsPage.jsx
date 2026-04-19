import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/shared/Modal';

const COLORS = ['#6366F1','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#8B5CF6','#14B8A6','#F97316','#64748B'];
const emptyTag = { name: '', color: '#6366F1' };

function TagForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyTag);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial?.id) await api.put(`/tags/${initial.id}`, form);
      else await api.post('/tags', form);
      onSave();
    } catch { alert('Erro ao salvar tag'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input required placeholder="Nome da tag" maxLength={50}
        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={form.name} onChange={e => set('name', e.target.value)} />

      <div>
        <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block">Cor</label>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }} />
          ))}
          <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border border-slate-200" title="Cor personalizada" />
        </div>
      </div>

      <div className="pt-1">
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Pré-visualização</p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: form.color + '22', color: form.color }}>
          <Tag size={10} /> {form.name || 'Nome da tag'}
        </span>
      </div>

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

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get('/tags');
      setTags(data);
    } catch { setTags([]); }
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Deletar esta tag? Ela será removida de todas as transações.')) return;
    await api.delete(`/tags/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tags</h1>
          <p className="text-sm text-slate-400 mt-1">Marque transações com tags para organizar e filtrar.</p>
        </div>
        <button onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} /> Nova Tag
        </button>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Tag size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma tag cadastrada.</p>
          <p className="text-sm mt-1">Crie tags para marcar e filtrar suas transações.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tags.map(tag => (
            <div key={tag.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{tag.name}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: tag.color + '22', color: tag.color }}>
                  <Tag size={9} /> {tag.name}
                </span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setEditing(tag); setModal(true); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(tag.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }}
        title={editing ? 'Editar Tag' : 'Nova Tag'} size="sm">
        <TagForm initial={editing}
          onSave={() => { setModal(false); setEditing(null); load(); }}
          onCancel={() => { setModal(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}
