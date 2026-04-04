import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import ProgressBar from '../components/shared/ProgressBar';

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
          <Icon size={18} style={{ color }} />
        </span>
      </div>
      <p className="text-2xl font-bold text-slate-800">R$ {value.toFixed(2).replace('.', ',')}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    setLoading(true);
    setData(null);
    api.get(`/dashboard?_=${Date.now()}`).then(r => setData(r.data)).finally(() => setLoading(false));
  }, [location.key]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>;
  if (!data) return null;

  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          {monthNames[data.monthly.month - 1]} {data.monthly.year}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Saldo Total" value={data.total_balance} icon={Wallet} color="#2563EB"
          sub={`${data.accounts.length} conta(s)`} />
        <StatCard label="Receitas do Mês" value={data.monthly.total_income} icon={TrendingUp} color="#22C55E" />
        <StatCard label="Despesas do Mês" value={data.monthly.total_expense} icon={TrendingDown} color="#EF4444" />
      </div>

      {/* Accounts */}
      {data.accounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Contas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.accounts.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: a.color + '11' }}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.type}</p>
                </div>
                <p className={`text-sm font-bold flex-shrink-0 ${a.balance < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                  R$ {a.balance.toFixed(2).replace('.', ',')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budgets */}
      {data.budgets.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Orçamento do Mês</h2>
            <Link to="/budget" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver tudo <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-4">
            {data.budgets.slice(0, 4).map(b => {
              const pct = b.amount_planned > 0 ? (b.amount_spent / b.amount_planned) * 100 : 0;
              return (
                <div key={b.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{b.category_name}</span>
                    <span className="text-sm text-slate-500">
                      R$ {b.amount_spent.toFixed(2).replace('.', ',')} / R$ {b.amount_planned.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <ProgressBar value={b.amount_spent} max={b.amount_planned} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Savings */}
      {data.savings.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Caixinhas</h2>
            <Link to="/savings" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver tudo <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.savings.slice(0, 4).map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{s.name}</p>
                  {s.target_amount && (
                    <div className="mt-1">
                      <ProgressBar value={s.current_amount} max={s.target_amount} color={s.color} />
                    </div>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-800 flex-shrink-0">
                  R$ {s.current_amount.toFixed(2).replace('.', ',')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent */}
      {data.recent_transactions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Transações Recentes</h2>
            <Link to="/transactions" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ver tudo <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {data.recent_transactions.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{t.description}</p>
                  <p className="text-xs text-slate-400">
                    {String(t.date).split('T')[0].split('-').reverse().join('/')}
                    {t.category_name && ` · ${t.category_name}`}
                  </p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'income' ? '+' : '-'} R$ {parseFloat(t.amount).toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
