import React, { useState, useEffect } from 'react';
import CalendarGrid from '../components/Calendar/CalendarGrid';
import api from '../services/api';
import { X } from 'lucide-react';

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const load = async (y, m) => {
    setLoading(true);
    const { data: d } = await api.get(`/transactions/calendar/${y}/${m}`);
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(year, month); }, [year, month]);

  const handleMonthChange = (y, m) => { setYear(y); setMonth(m); setSelectedDay(null); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Calendário</h1>

      {loading && <p className="text-slate-400 text-sm">Carregando...</p>}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <CalendarGrid
            year={year} month={month} data={data}
            onDayClick={(key, dayData) => setSelectedDay({ key, ...dayData })}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* Day panel */}
        {selectedDay && (
          <div className="lg:w-80 bg-white rounded-2xl border border-slate-100 p-5 h-fit">
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
            <div className="space-y-2">
              {selectedDay.transactions.map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{t.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {t.category && (
                        <span className="text-xs" style={{ color: t.category.color }}>{t.category.name}</span>
                      )}
                      {t.credit_card && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: t.credit_card.color + '22', color: t.credit_card.color }}>
                          {t.credit_card.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
