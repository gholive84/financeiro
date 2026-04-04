import React from 'react';
import ProgressBar from '../shared/ProgressBar';
import * as Icons from 'lucide-react';

function CatIcon({ icon, color }) {
  const LucideIcon = Icons[icon?.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^(.)/,(_, c) => c.toUpperCase())] || Icons.Tag;
  return (
    <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
      <LucideIcon size={16} style={{ color }} />
    </span>
  );
}

export default function BudgetProgress({ budget }) {
  const { category_name, category_icon, category_color, amount_planned, amount_spent } = budget;
  const pct = amount_planned > 0 ? Math.min((amount_spent / amount_planned) * 100, 100) : 0;
  const remaining = amount_planned - amount_spent;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <CatIcon icon={category_icon} color={category_color} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm">{category_name}</p>
          <p className="text-xs text-slate-400">{pct.toFixed(0)}% utilizado</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${pct >= 100 ? 'text-red-500' : 'text-slate-800'}`}>
            R$ {amount_spent.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-xs text-slate-400">de R$ {amount_planned.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>
      <ProgressBar value={amount_spent} max={amount_planned} />
      <p className={`text-xs mt-2 ${remaining < 0 ? 'text-red-500' : 'text-slate-400'}`}>
        {remaining < 0
          ? `R$ ${Math.abs(remaining).toFixed(2).replace('.', ',')} acima do limite`
          : `R$ ${remaining.toFixed(2).replace('.', ',')} restantes`}
      </p>
    </div>
  );
}
