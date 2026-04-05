import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';

const toIconName = (s) => s?.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (_, c) => c.toUpperCase());

function CategoryIcon({ icon, color }) {
  const LucideIcon = Icons[toIconName(icon)] || Icons.Tag;
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

            {/* Descrição + data (mobile: abaixo; desktop: inline) */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>

                {/* Badges — desktop: inline na mesma linha */}
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-slate-400">
                    {String(t.date).split('T')[0].split('-').reverse().join('/')}
                  </span>
                  {t.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: t.category.color + '22', color: t.category.color }}>
                      {t.category.parent_name ? `${t.category.parent_name} › ${t.category.name}` : t.category.name}
                    </span>
                  )}
                  {t.account && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 font-medium">
                      {t.account.name}
                    </span>
                  )}
                  {t.credit_card && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: t.credit_card.color + '22', color: t.credit_card.color }}>
                      {t.credit_card.name}
                    </span>
                  )}
                  {t.installment_total > 1 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-500 font-semibold">
                      {t.installment_current}/{t.installment_total}x
                    </span>
                  )}
                  {t.status === 'pending' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Pendente</span>
                  )}
                  {t.user && <span className="text-xs text-slate-300">@{t.user.username}</span>}
                </div>

                {/* Mobile: data abaixo */}
                <p className="sm:hidden text-xs text-slate-400 mt-0.5">
                  {String(t.date).split('T')[0].split('-').reverse().join('/')}
                  {t.user && <span className="ml-1 text-slate-300">· @{t.user.username}</span>}
                </p>
              </div>
            </div>

            {/* Valor + ações */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}
              </span>
              <button onClick={() => onEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-blue-600 transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={() => onDelete(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Badges — mobile: linha 2 */}
          <div className="sm:hidden flex flex-wrap items-center gap-1.5 mt-2 pl-11">
            {t.category && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: t.category.color + '22', color: t.category.color }}>
                {t.category.parent_name ? `${t.category.parent_name} › ${t.category.name}` : t.category.name}
              </span>
            )}
            {t.account && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                {t.account.name}
              </span>
            )}
            {t.credit_card && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: t.credit_card.color + '22', color: t.credit_card.color }}>
                {t.credit_card.name}
              </span>
            )}
            {t.installment_total > 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-500 font-semibold">
                {t.installment_current}/{t.installment_total}x
              </span>
            )}
            {t.status === 'pending' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Pendente</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
