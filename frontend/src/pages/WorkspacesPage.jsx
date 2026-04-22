import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Users, Pencil, X, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/shared/Modal';

function WorkspaceForm({ onSave, onCancel, initial }) {
  const [name, setName] = useState(initial?.name || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial) {
        await api.put(`/workspaces/${initial.id}`, { name });
      } else {
        await api.post('/workspaces', { name });
      }
      onSave();
    } catch { alert('Erro ao salvar'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input required autoFocus placeholder="Nome da conta (ex: Pessoal, Empresa)"
        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        value={name} onChange={e => setName(e.target.value)} />
      <div className="flex gap-3">
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

function MembersPanel({ workspace, onClose }) {
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('member');
  const { user } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: m }, { data: u }] = await Promise.all([
      api.get(`/workspaces/${workspace.id}/members`),
      api.get('/auth/users'),
    ]);
    setMembers(m);
    setUsers(u);
    setLoading(false);
  }, [workspace.id]);

  useEffect(() => { load(); }, [load]);

  const memberIds = new Set(members.map(m => m.id));
  const availableUsers = users.filter(u => !memberIds.has(u.id));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addUserId) return;
    try {
      await api.post(`/workspaces/${workspace.id}/members`, { user_id: parseInt(addUserId), role: addRole });
      setAddUserId('');
      load();
    } catch { alert('Erro ao adicionar'); }
  };

  const handleRemove = async (uid) => {
    if (!confirm('Remover este membro?')) return;
    await api.delete(`/workspaces/${workspace.id}/members/${uid}`);
    load();
  };

  const handleRoleChange = async (uid, role) => {
    await api.put(`/workspaces/${workspace.id}/members/${uid}`, { role });
    load();
  };

  const roleLabel = { owner: 'Dono', admin: 'Admin', member: 'Membro' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Membros — {workspace.name}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
          <X size={15} className="text-slate-400" />
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 text-center py-4">Carregando...</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-2 py-2 border-b border-slate-50 dark:border-slate-700 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{m.name || m.username}</p>
                <p className="text-xs text-slate-400">@{m.username}</p>
              </div>
              <select value={m.role} onChange={e => handleRoleChange(m.id, e.target.value)}
                disabled={m.role === 'owner'}
                className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-50">
                <option value="owner">Dono</option>
                <option value="admin">Admin</option>
                <option value="member">Membro</option>
              </select>
              {m.role !== 'owner' && (
                <button onClick={() => handleRemove(m.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {availableUsers.length > 0 && (
        <form onSubmit={handleAdd} className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <select required value={addUserId} onChange={e => setAddUserId(e.target.value)}
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Adicionar usuário...</option>
            {availableUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name || u.username}</option>
            ))}
          </select>
          <select value={addRole} onChange={e => setAddRole(e.target.value)}
            className="border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-2 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none">
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-3 py-2 text-xs font-semibold transition-colors">
            Adicionar
          </button>
        </form>
      )}
    </div>
  );
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [modal, setModal] = useState(false);
  const [editWs, setEditWs] = useState(null);
  const [membersWs, setMembersWs] = useState(null);
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const load = useCallback(async () => {
    const { data } = await api.get('/workspaces');
    setWorkspaces(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Deletar esta conta e todos os dados? Esta ação não pode ser desfeita.')) return;
    await api.delete(`/workspaces/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Contas</h1>
        {isSuperAdmin && (
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> Nova conta
          </button>
        )}
      </div>

      {workspaces.length === 0 ? (
        <div className="text-center py-16 text-slate-400">Nenhuma conta encontrada.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map(ws => (
            <div key={ws.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                      {ws.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{ws.name}</p>
                    <p className="text-xs text-slate-400">{ws.member_count} {ws.member_count === 1 ? 'membro' : 'membros'}</p>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {(isSuperAdmin || ws.my_role === 'owner' || ws.my_role === 'admin') && (
                    <button onClick={() => setMembersWs(membersWs?.id === ws.id ? null : ws)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-500 transition-colors">
                      <Users size={14} />
                    </button>
                  )}
                  {(isSuperAdmin || ws.my_role === 'owner' || ws.my_role === 'admin') && (
                    <button onClick={() => setEditWs(ws)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-300 hover:text-blue-500 transition-colors">
                      <Pencil size={14} />
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(ws.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {membersWs?.id === ws.id && (
                <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                  <MembersPanel workspace={ws} onClose={() => setMembersWs(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova conta" size="sm">
        <WorkspaceForm onSave={() => { setModal(false); load(); }} onCancel={() => setModal(false)} />
      </Modal>

      <Modal open={!!editWs} onClose={() => setEditWs(null)} title="Renomear conta" size="sm">
        {editWs && (
          <WorkspaceForm initial={editWs} onSave={() => { setEditWs(null); load(); }} onCancel={() => setEditWs(null)} />
        )}
      </Modal>
    </div>
  );
}
