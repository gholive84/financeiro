import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Users, Shield, User } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';

const emptyUser = { username: '', password: '', name: '', role: 'user' };

function UserForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial, password: '' } : emptyUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!initial && !form.password) { setError('Senha obrigatória'); return; }
    setLoading(true); setError('');
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (initial?.id) await api.put(`/auth/users/${initial.id}`, payload);
      else await api.post('/auth/users', payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input required placeholder="Nome completo" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.name} onChange={e => set('name', e.target.value)} />
      <input required={!initial} placeholder="Usuário (login)" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.username} onChange={e => set('username', e.target.value)} disabled={!!initial} />
      <input type="password" placeholder={initial ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.password} onChange={e => set('password', e.target.value)} />
      <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={form.role} onChange={e => set('role', e.target.value)}>
        <option value="user">Usuário</option>
        <option value="admin">Administrador</option>
      </select>
      {initial && (
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={form.active !== false} onChange={e => set('active', e.target.checked)} className="rounded" />
          Conta ativa
        </label>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get('/auth/users');
    setUsers(data);
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Deletar este usuário?')) return;
    try {
      await api.delete(`/auth/users/${id}`);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Erro ao deletar'); }
  };

  if (me?.role !== 'admin') {
    return (
      <div className="text-center py-16 text-slate-400">
        <Shield size={48} className="mx-auto mb-3 opacity-30" />
        <p>Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} usuário(s) cadastrado(s)</p>
        </div>
        <button onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.id} className={`bg-white rounded-2xl border p-5 ${!u.active ? 'opacity-50 border-slate-100' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.role === 'admin' ? 'bg-blue-50' : 'bg-slate-100'}`}>
                  {u.role === 'admin' ? <Shield size={18} className="text-blue-600" /> : <User size={18} className="text-slate-500" />}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{u.name || u.username}</p>
                  <p className="text-xs text-slate-400">@{u.username}</p>
                </div>
              </div>
              {u.id !== me.id && (
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(u); setModal(true); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'admin' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                {u.role === 'admin' ? 'Admin' : 'Usuário'}
              </span>
              {!u.active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-400 font-medium">Inativo</span>}
              {u.id === me.id && <span className="text-xs text-slate-400">(você)</span>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} title={editing ? 'Editar Usuário' : 'Novo Usuário'} size="sm">
        <UserForm initial={editing}
          onSave={() => { setModal(false); setEditing(null); load(); }}
          onCancel={() => { setModal(false); setEditing(null); }} />
      </Modal>
    </div>
  );
}
