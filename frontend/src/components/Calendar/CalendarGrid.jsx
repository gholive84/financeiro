import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CalendarGrid({ year, month, data, onDayClick, onMonthChange }) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const prevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };
  const nextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft size={18} className="text-slate-600" />
        </button>
        <h2 className="text-base font-semibold text-slate-800">
          {monthNames[month - 1]} {year}
        </h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight size={18} className="text-slate-600" />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-slate-400 py-3">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-50" />;

          const pad = String(month).padStart(2, '0');
          const padDay = String(day).padStart(2, '0');
          const key = `${year}-${pad}-${padDay}`;
          const dayData = data[key];
          const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day;

          return (
            <div
              key={key}
              onClick={() => dayData && onDayClick(key, dayData)}
              className={`min-h-[52px] sm:min-h-[80px] border-b border-r border-slate-50 p-1 sm:p-2 transition-colors
                ${dayData ? 'cursor-pointer hover:bg-blue-50' : ''}
                ${isToday ? 'bg-blue-50' : ''}
              `}
            >
              <span className={`text-[10px] sm:text-xs font-semibold inline-flex w-5 h-5 sm:w-6 sm:h-6 items-center justify-center rounded-full
                ${isToday ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
                {day}
              </span>
              {dayData && (
                <div className="mt-0.5 space-y-0.5">
                  {dayData.total_expense > 0 && (
                    <p className="text-[9px] sm:text-xs text-red-500 font-semibold truncate leading-tight">
                      <span className="sm:hidden">-{dayData.total_expense.toFixed(0)}</span>
                      <span className="hidden sm:block">-R$ {dayData.total_expense.toFixed(2).replace('.', ',')}</span>
                    </p>
                  )}
                  {dayData.total_income > 0 && (
                    <p className="text-[9px] sm:text-xs text-green-600 font-semibold truncate leading-tight">
                      <span className="sm:hidden">+{dayData.total_income.toFixed(0)}</span>
                      <span className="hidden sm:block">+R$ {dayData.total_income.toFixed(2).replace('.', ',')}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
