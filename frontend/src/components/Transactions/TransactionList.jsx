import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';

function CategoryIcon({ icon, color }) {
  const LucideIcon = Icons[icon?.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] || Icons.Tag;
  return (
    <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
      <LucideIcon size={15} style={{ color }} />
    </span>
  );
}

export default function TransactionList({ transactions, onEdit, onDelete }) {
  if (!transactions.length) {
    return <p className="text-center text-slate-400 py-10 text-sm">Nenhuma transação encontrada.</p>;
  }

  return (
    <div className="space-y-2">
      {transactions.map(t => (
        <div key={t.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3">
            <CategoryIcon icon={t.category?.icon} color={t.category?.color || '#64748B'} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {String(t.date).split('T')[0].split('-').reverse().join('/')}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}
              </span>
              <button onClick={() => onEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                <Pencil size={14} />
              </button>
              <button onClick={() => onDelete(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {(t.category || t.credit_card || t.status === 'pending' || t.installment_total > 1 || t.user) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-11">
              {t.category && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.category.color + '22', color: t.category.color }}>
                  {t.category.name}
                </span>
              )}
              {t.credit_card && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: t.credit_card.color + '22', color: t.credit_card.color }}>
                  {t.credit_card.name}
                </span>
              )}
              {t.status === 'pending' && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Pendente</span>
              )}
              {t.installment_total > 1 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500 font-medium">
                  {t.installment_current}/{t.installment_total}
                </span>
              )}
              {t.user && (
                <span className="text-xs text-slate-300">@{t.user.username}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
