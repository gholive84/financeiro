import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, ArrowLeftRight, CreditCard,
  PieChart, PiggyBank, Wallet, Tag, Sparkles, Users, LogOut, X, Shield, User, Upload,
  TrendingUp, Hash,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/ai', icon: Sparkles, label: 'Lançar com IA', highlight: true },
  { to: '/calendar', icon: Calendar, label: 'Calendário' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/flow', icon: TrendingUp, label: 'Fluxo Mensal' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/credit-cards', icon: CreditCard, label: 'Cartões' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
  { to: '/tags', icon: Hash, label: 'Tags' },
  { to: '/budget', icon: PieChart, label: 'Orçamento' },
  { to: '/savings', icon: PiggyBank, label: 'Caixinhas' },
  { to: '/import', icon: Upload, label: 'Importar' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-100 z-40 flex flex-col
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <span className="text-xl font-bold text-blue-600">financeiro</span>
          <button className="lg:hidden p-1 rounded hover:bg-slate-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label, highlight }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive
                  ? 'bg-blue-50 text-blue-600'
                  : highlight
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }>
              <Icon size={18} /> {label}
            </NavLink>
          ))}

          {/* Usuários — admin only */}
          {user?.role === 'admin' && (
            <NavLink to="/users" onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
              }>
              <Users size={18} /> Usuários
            </NavLink>
          )}
        </nav>

        {/* Usuário logado */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              {user?.role === 'admin' ? <Shield size={15} className="text-blue-600" /> : <User size={15} className="text-slate-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-slate-400 truncate">@{user?.username}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors font-medium">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
