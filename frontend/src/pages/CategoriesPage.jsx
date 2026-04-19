import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import api from '../services/api';
import Modal from '../components/shared/Modal';

const toIconName = (s) => s?.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (_, c) => c.toUpperCase());

const iconOptions = [
  'utensils','coffee','pizza','wine','beer','sandwich','salad','cake','ice-cream-2','chef-hat',
  'car','bus','train','plane','bike','fuel','truck','navigation','map-pin','ship',
  'shopping-cart','shopping-bag','tag','gift','package','store','shirt','scissors','gem',
  'home','sofa','lamp','tool','wrench','bath','bed','tv','wifi','plug',
  'heart','activity','pill','stethoscope','dumbbell','apple','brain','thermometer','syringe',
  'gamepad-2','music','film','ticket','camera','palette','mic','headphones','book','book-open',
  'graduation-cap','pen','pencil','notebook-pen','library','monitor','laptop','code',
  'credit-card','dollar-sign','trending-up','trending-down','wallet','piggy-bank','coins','banknote','percent','receipt',
  'briefcase','building','building-2','users','phone','mail','calendar','clock','bar-chart-3','pie-chart',
  'star','sun','moon','zap','leaf','globe','baby','dog','cat','flower-2',
];

function CatIcon({ icon, color, size = 16 }) {
  const LucideIcon = Icons[toIconName(icon)] || Icons.Tag;
  return <LucideIcon size={size} style={{ color }} />;
}

function IconPicker({ value, color, onChange }) {
  const [search, setSearch] = useState('');
  const filtered = search ? iconOptions.filter(i => i.includes(search.toLowerCase())) : iconOptions;

  return (
    <div>
      <input placeholder="Buscar ícone..." className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={search} onChange={e => setSearch(e.target.value)} />
      <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
        {filtered.map(ic => {
          const Icon = Icons[toIconName(ic)] || Icons.Tag;
          const active = value === ic;
          return (
            <button key={ic} type="button" title={ic} onClick={() => onChange(ic)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${active ? 'ring-2' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              style={active ? { backgroundColor: color + '22', outlineColor: color, ringColor: color } : {}}>
              <Icon size={15} style={{ color: active ? color : '#94a3b8' }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const emptyCategory = { name: '', icon: 'tag', color: '#6366F1', type: 'expense', parent_id: '' };

function CategoryForm({ initial, categories, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial, parent_id: initial.parent_id || '' } : emptyCategory);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    if (k === 'parent_id' && v) {
      const parent = categories.find(c => String(c.id) === String(v));
      if (parent) { updated.type = parent.type; updated.color = parent.color; }
    }
    return updated;
  });

  const isSubcategory = !!form.parent_id;
  // Pais disponíveis: apenas categorias sem parent (top-level) do mesmo tipo
  const parents = categories.filter(c => !c.parent_id && c.id !== initial?.id && c.type === form.type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, parent_id: form.parent_id || null };
      if (initial?.id) await api.put(`/categories/${initial.id}`, payload);
      else await api.post('/categories', payload);
      onSave();
    } catch { alert('Erro ao salvar categoria'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={`flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 ${isSubcategory ? 'opacity-60 pointer-events-none' : ''}`}>
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
      {isSubcategory && <p className="text-xs text-slate-400 -mt-2">Tipo herdado da categoria pai</p>}

      <input required placeholder="Nome da categoria" className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={form.name} onChange={e => set('name', e.target.value)} />

      {parents.length > 0 && (
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Subcategoria de (opcional)</label>
          <select className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
            <option value="">— Categoria principal —</option>
            {parents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Cor{isSubcategory && ' (do pai)'}</label>
          <input type="color" className={`w-14 h-10 border border-slate-200 dark:border-slate-600 rounded-xl px-1 ${isSubcategory ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            value={form.color} onChange={e => !isSubcategory && set('color', e.target.value)}
            disabled={isSubcategory} />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Ícone: <span className="font-semibold text-slate-700 dark:text-slate-200">{form.icon}</span></label>
          <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-2">
            <IconPicker value={form.icon} color={form.color} onChange={v => set('icon', v)} />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: form.color + '22' }}>
          <CatIcon icon={form.icon} color={form.color} />
        </span>
        <div className="flex-1 min-w-0">
          {form.parent_id && (
            <p className="text-xs text-slate-400">{parents.find(p => String(p.id) === String(form.parent_id))?.name}</p>
          )}
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{form.name || 'Preview'}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${form.type === 'expense' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
          {form.type === 'expense' ? 'Despesa' : 'Receita'}
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
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
    if (!confirm('Deletar esta categoria? Subcategorias ficam sem categoria pai.')) return;
    await api.delete(`/categories/${id}`);
    load();
  };

  const openNew = (parentId = null) => {
    if (parentId) {
      const parent = categories.find(c => c.id === parentId);
      setEditing({ parent_id: parentId, type: parent?.type || 'expense', color: parent?.color || '#6366F1' });
    } else {
      setEditing(null);
    }
    setModal(true);
  };

  const filtered = filter === 'all' ? categories : categories.filter(c => c.type === filter);

  // Separa pais e filhos
  const parents = filtered.filter(c => !c.parent_id);
  const children = filtered.filter(c => c.parent_id);
  const childrenByParent = children.reduce((acc, c) => {
    if (!acc[c.parent_id]) acc[c.parent_id] = [];
    acc[c.parent_id].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Categorias</h1>
        <button onClick={() => openNew()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} /> Nova Categoria
        </button>
      </div>

      <div className="flex gap-2">
        {[['all', 'Todas'], ['expense', 'Despesas'], ['income', 'Receitas']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors
              ${filter === val ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {parents.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Tag size={48} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma categoria encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {parents.map(c => (
            <div key={c.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              {/* Categoria pai */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.color + '22' }}>
                  <CatIcon icon={c.icon} color={c.color} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{c.name}</p>
                  <span className={`text-xs ${c.type === 'expense' ? 'text-red-400' : 'text-green-500'}`}>
                    {c.type === 'expense' ? 'Despesa' : 'Receita'}
                    {childrenByParent[c.id]?.length > 0 && ` · ${childrenByParent[c.id].length} subcategoria(s)`}
                  </span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openNew(c.id)} title="Nova subcategoria"
                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 transition-colors">
                    <Plus size={13} />
                  </button>
                  <button onClick={() => { setEditing(c); setModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Subcategorias */}
              {childrenByParent[c.id]?.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30">
                  <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 flex-shrink-0 ml-3" />
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: sub.color + '22' }}>
                    <CatIcon icon={sub.icon} color={sub.color} size={13} />
                  </span>
                  <p className="flex-1 text-sm text-slate-700 dark:text-slate-200 min-w-0 truncate">{sub.name}</p>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditing(sub); setModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(sub.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing?.id ? 'Editar Categoria' : 'Nova Categoria'} size="sm">
        <CategoryForm
          initial={editing}
          categories={categories}
          onSave={() => { setModal(false); setEditing(null); load(); }}
          onCancel={() => { setModal(false); setEditing(null); }}
        />
      </Modal>
    </div>
  );
}
