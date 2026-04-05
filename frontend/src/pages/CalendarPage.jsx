import React, { useState, useEffect } from 'react';
import CalendarGrid from '../components/Calendar/CalendarGrid';
import api from '../services/api';
import { X, Trash2, ChevronLeft } from 'lucide-react';
import * as Icons from 'lucide-react';

const toIconName = (s) => s?.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^(.)/, (_, c) => c.toUpperCase());

function TransactionDetail({ transaction: t, onClose, onDelete }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
          <ChevronLeft size={16} className="text-slate-400" />
        </button>
        <p className="font-semibold text-slate-800 flex-1 truncate">{t.description}</p>
        <span className={`text-base font-bold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
          {t.type === 'income' ? '+' : '-'} R$ {parseFloat(t.amount).toFixed(2).replace('.', ',')}
        </span>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-3">
        <Row label="Data" value={String(t.date).split('T')[0].split('-').reverse().join('/')} />
        <Row label="Tipo" value={t.type === 'income' ? 'Receita' : 'Despesa'} />
        <Row label="Status" value={t.status === 'paid' ? 'Pago' : 'Pendente'} />
        {t.category && (
          <Row label="Categoria" value={
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: t.category.color + '22', color: t.category.color }}>
              {t.category.parent_name ? `${t.category.parent_name} › ${t.category.name}` : t.category.name}
            </span>
          } />
        )}
        {t.account && <Row label="Conta" value={t.account.name} />}
        {t.credit_card && (
          <Row label="Cartão" value={
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: t.credit_card.color + '22', color: t.credit_card.color }}>
              {t.credit_card.name}
            </span>
          } />
        )}
        {t.installment_total > 1 && (
          <Row label="Parcela" value={
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-500 font-semibold">
              {t.installment_current}/{t.installment_total}x
            </span>
          } />
        )}
        {t.notes && <Row label="Notas" value={t.notes} />}
        {t.user && <Row label="Usuário" value={`@${t.user.username}`} />}
      </div>

      <button onClick={() => onDelete(t)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold transition-colors">
        <Trash2 size={14} /> Excluir lançamento
      </button>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-700 font-medium text-right">{value}</span>
    </div>
  );
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const load = async (y, m) => {
    setLoading(true);
    const { data: d } = await api.get(`/transactions/calendar/${y}/${m}`);
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(year, month); }, [year, month]);

  const handleMonthChange = (y, m) => { setYear(y); setMonth(m); setSelectedDay(null); setSelectedTransaction(null); };

  const handleDelete = async (t) => {
    const isInstallment = t.installment_total > 1 && t.installment_group_id;
    if (isInstallment) {
      const deleteAll = window.confirm(
        `Parcela ${t.installment_current}/${t.installment_total} — "${t.description}"\n\nOK = Excluir TODAS as ${t.installment_total} parcelas\nCancelar = Excluir só esta`
      );
      await api.delete(`/transactions/${t.id}${deleteAll ? '?all=true' : ''}`);
    } else {
      if (!confirm('Deletar esta transação?')) return;
      await api.delete(`/transactions/${t.id}`);
    }
    setSelectedTransaction(null);
    setSelectedDay(null);
    load(year, month);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Calendário</h1>

      {loading && <p className="text-slate-400 text-sm">Carregando...</p>}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <CalendarGrid
            year={year} month={month} data={data}
            onDayClick={(key, dayData) => { setSelectedDay({ key, ...dayData }); setSelectedTransaction(null); }}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* Painel lateral */}
        {selectedDay && (
          <div className="lg:w-80 bg-white rounded-2xl border border-slate-100 p-5 h-fit">
            {selectedTransaction ? (
              <TransactionDetail
                transaction={selectedTransaction}
                onClose={() => setSelectedTransaction(null)}
                onDelete={handleDelete}
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {new Date(selectedDay.key + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="flex gap-3 mt-1">
                      {selectedDay.total_income > 0 && (
                        <span className="text-xs text-green-600 font-semibold">+R$ {selectedDay.total_income.toFixed(2).replace('.', ',')}</span>
                      )}
                      {selectedDay.total_expense > 0 && (
                        <span className="text-xs text-red-500 font-semibold">-R$ {selectedDay.total_expense.toFixed(2).replace('.', ',')}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>
                <div className="space-y-1">
                  {selectedDay.transactions.map(t => (
                    <button key={t.id} onClick={() => setSelectedTransaction(t)}
                      className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{t.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {t.category && (
                            <span className="text-xs" style={{ color: t.category.color }}>
                              {t.category.parent_name ? `${t.category.parent_name} › ${t.category.name}` : t.category.name}
                            </span>
                          )}
                          {t.account && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 font-medium">
                              {t.account.name}
                            </span>
                          )}
                          {t.credit_card && (
                            <span className="text-[10px] px-1.5 py-0.5 font-medium"
                              style={{ backgroundColor: t.credit_card.color + '22', color: t.credit_card.color }}>
                              {t.credit_card.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'} R$ {parseFloat(t.amount).toFixed(2).replace('.', ',')}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
