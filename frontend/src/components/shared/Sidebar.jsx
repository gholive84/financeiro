import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, ArrowLeftRight, CreditCard,
  PieChart, PiggyBank, Wallet, Tag, Sparkles, Users, LogOut, X, Shield, User, Upload,
  TrendingUp, Hash, Moon, Sun, Settings, ChevronDown, Database, Building2, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/ai', icon: Sparkles, label: 'Lançar com IA', highlight: true },
  { to: '/flow', icon: TrendingUp, label: 'Fluxo Mensal' },
  { to: '/calendar', icon: Calendar, label: 'Calendário' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/accounts', icon: Wallet, label: 'Contas Bancárias' },
  { to: '/credit-cards', icon: CreditCard, label: 'Cartões' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
  { to: '/tags', icon: Hash, label: 'Tags' },
  { to: '/budget', icon: PieChart, label: 'Orçamento' },
  { to: '/savings', icon: PiggyBank, label: 'Caixinhas' },
  { to: '/import', icon: Upload, label: 'Importar' },
];

const linkClass = (isActive) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
  ${isActive
    ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400'
    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'}`;

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const { workspaces, current: workspace, selectWorkspace } = useWorkspace();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 z-40 flex flex-col
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <span className="text-xl font-bold text-blue-600">financeiro</span>
          <button className="lg:hidden p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700" onClick={onClose}>
            <X size={18} className="text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Workspace switcher */}
        {workspace && (
          <div className="px-3 pt-3">
            <button onClick={() => setWsOpen(o => !o)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{workspace.name.charAt(0).toUpperCase()}</span>
              </div>
              <span className="flex-1 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{workspace.name}</span>
              {workspaces.length > 1 && <ChevronDown size={12} className={`text-slate-400 transition-transform flex-shrink-0 ${wsOpen ? 'rotate-180' : ''}`} />}
            </button>
            {wsOpen && workspaces.length > 1 && (
              <div className="mt-1 space-y-0.5">
                {workspaces.filter(w => w.id !== workspace.id).map(w => (
                  <button key={w.id} onClick={() => { selectWorkspace(w); setWsOpen(false); onClose(); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left">
                    <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{w.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{w.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label, highlight }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400'
                  : highlight
                  ? 'text-blue-600 bg-blue-50 dark:bg-slate-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-600'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }>
              <Icon size={18} /> {label}
            </NavLink>
          ))}

          {/* Configurações — admin / super_admin */}
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <div>
              <button
                onClick={() => setSettingsOpen(o => !o)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100">
                <Settings size={18} />
                <span className="flex-1 text-left">Configurações</span>
                <ChevronDown size={14} className={`transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
              </button>

              {settingsOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 dark:border-slate-700 pl-3">
                  {user?.role === 'super_admin' && (
                    <NavLink to="/workspaces" onClick={onClose}
                      className={({ isActive }) => linkClass(isActive)}>
                      <Building2 size={16} /> Contas
                    </NavLink>
                  )}
                  <NavLink to="/users" onClick={onClose}
                    className={({ isActive }) => linkClass(isActive)}>
                    <Users size={16} /> Usuários
                  </NavLink>
                  <NavLink to="/backup" onClick={onClose}
                    className={({ isActive }) => linkClass(isActive)}>
                    <Database size={16} /> Backup
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Usuário logado */}
        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
              {user?.role === 'super_admin' ? <Shield size={15} className="text-purple-600" /> : user?.role === 'admin' ? <Shield size={15} className="text-blue-600" /> : <User size={15} className="text-slate-500 dark:text-slate-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">@{user?.username}</p>
            </div>
          </div>
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-medium mb-1">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? 'Modo claro' : 'Modo escuro'}
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors font-medium">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
