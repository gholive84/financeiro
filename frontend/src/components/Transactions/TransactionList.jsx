import React from 'react';
import { Pencil, Trash2, Repeat } from 'lucide-react';
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

function Badge({ children, style, className = '' }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${className}`} style={style}>{children}</span>;
}

function AccountTag({ name }) {
  return <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-medium">{name}</span>;
}

export default function TransactionList({ transactions, onEdit, onDelete, onDetail, selectedIds = [], onToggleSelect }) {
  const selecting = selectedIds.length > 0;

  if (!transactions.length) {
    return <p className="text-center text-slate-400 py-10 text-sm">Nenhuma transação encontrada.</p>;
  }

  return (
    <div className="space-y-2">
      {transactions.map(t => {
        const isSelected = selectedIds.includes(t.id);
        const isFixed = t.expense_nature === 'fixed';
        return (
          <div key={t.id}
            className={`bg-white dark:bg-slate-800 rounded-xl border px-4 py-3 hover:shadow-sm transition-shadow cursor-pointer flex items-center gap-3 ${isSelected ? 'border-blue-300 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-700'}`}
            onClick={() => selecting ? onToggleSelect?.(t.id) : onDetail?.(t)}>

            <div
              className={`flex-shrink-0 transition-opacity ${selecting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={e => { e.stopPropagation(); onToggleSelect?.(t.id); }}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                onClick={e => { e.stopPropagation(); onToggleSelect?.(t.id); }}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
              />
            </div>

            <CategoryIcon icon={t.category?.icon} color={t.category?.color || '#64748B'} />

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{t.description}</p>

                <div className="hidden sm:flex items-center gap-1.5 flex-wrap flex-shrink-0">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {String(t.date).split('T')[0].split('-').reverse().join('/')}
                  </span>
                  {t.category && (
                    <Badge style={{ backgroundColor: t.category.color + '22', color: t.category.color }}>
                      {t.category.parent_name ? `${t.category.parent_name} › ${t.category.name}` : t.category.name}
                    </Badge>
                  )}
                  {isFixed && (
                    <Badge className={t.credit_card ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'}>
                      <span className="flex items-center gap-0.5"><Repeat size={9} /> {t.credit_card ? 'Recorrente' : 'Fixa'}</span>
                    </Badge>
                  )}
                  {t.installment_total > 1 && (
                    <Badge className="bg-purple-50 text-purple-500">{t.installment_current}/{t.installment_total}x</Badge>
                  )}
                  {t.status === 'pending' && <Badge className="bg-amber-50 text-amber-600">Pendente</Badge>}
                  {/* Tags */}
                  {t.tags?.slice(0, 3).map(tag => (
                    <span key={tag.id}
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ backgroundColor: tag.color + '22', color: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                </div>

                <p className="sm:hidden text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {String(t.date).split('T')[0].split('-').reverse().join('/')}
                  {t.user && <span className="ml-1 text-slate-300">· @{t.user.username}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:flex flex-col items-end gap-0.5">
                {t.account && <AccountTag name={t.account.name} />}
                {t.credit_card && (
                  <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ backgroundColor: t.credit_card.color + '22', color: t.credit_card.color }}>
                    {t.credit_card.name}
                  </span>
                )}
                {t.user && <span className="text-[10px] text-slate-300 hidden sm:inline">@{t.user.username}</span>}
              </div>
              <span className={`text-sm font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}
              </span>
              {!selecting && <>
                <button onClick={e => { e.stopPropagation(); onEdit(t); }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-300 hover:text-blue-600 transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete(t.id); }}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
