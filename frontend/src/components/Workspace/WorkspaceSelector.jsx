import React from 'react';
import { Building2, ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function WorkspaceSelector({ onSelect }) {
  const { workspaces } = useWorkspace();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={28} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Selecionar conta</h1>
          <p className="text-sm text-slate-400 mt-1">Escolha com qual conta deseja trabalhar</p>
        </div>

        <div className="space-y-2">
          {workspaces.map(ws => (
            <button key={ws.id} onClick={() => onSelect(ws)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all text-left group">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {ws.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{ws.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {ws.member_count} {ws.member_count === 1 ? 'membro' : 'membros'}
                  {ws.my_role && ` · ${ws.my_role}`}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
