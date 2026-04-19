import React from 'react';
import * as Icons from 'lucide-react';
import { Pencil, Trash2, Plus, Minus } from 'lucide-react';
import ProgressBar from '../shared/ProgressBar';

function SavingsIcon({ icon, color }) {
  const LucideIcon = Icons[icon?.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (_, c) => c.toUpperCase())] || Icons.PiggyBank;
  return (
    <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
      <LucideIcon size={22} style={{ color }} />
    </span>
  );
}

export default function SavingsCard({ box, onEdit, onDelete, onMove }) {
  const pct = box.target_amount ? Math.min((box.current_amount / box.target_amount) * 100, 100) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-start gap-3 mb-4">
        <SavingsIcon icon={box.icon} color={box.color} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800">{box.name}</p>
          {box.deadline && (
            <p className="text-xs text-slate-400 mt-0.5">
              Meta: {new Date(box.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(box)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(box.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-2xl font-bold text-slate-800">
            R$ {box.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {box.target_amount && (
            <span className="text-sm text-slate-400">
              / R$ {box.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
        {pct !== null && <ProgressBar value={box.current_amount} max={box.target_amount} color={box.color} />}
        {pct !== null && (
          <p className="text-xs text-slate-400 mt-1">{pct.toFixed(0)}% da meta</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onMove(box, 'deposit')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
        >
          <Plus size={14} /> Depositar
        </button>
        <button
          onClick={() => onMove(box, 'withdraw')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
        >
          <Minus size={14} /> Retirar
        </button>
      </div>
    </div>
  );
}
