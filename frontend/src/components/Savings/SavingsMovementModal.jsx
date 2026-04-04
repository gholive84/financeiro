import React, { useState } from 'react';
import Modal from '../shared/Modal';
import api from '../../services/api';

const today = () => new Date().toISOString().split('T')[0];

export default function SavingsMovementModal({ box, type, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);

  if (!box) return null;

  const isDeposit = type === 'deposit';
  const title = isDeposit ? `Depositar em ${box.name}` : `Retirar de ${box.name}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/savings/${box.id}/movements`, { amount: parseFloat(amount), description, date, type });
      onSave();
    } catch {
      alert('Erro ao registrar movimentação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={title} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required type="number" step="0.01" min="0.01" placeholder="Valor (R$)"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={amount} onChange={e => setAmount(e.target.value)}
        />
        <input
          type="date"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={date} onChange={e => setDate(e.target.value)}
        />
        <input
          placeholder="Descrição (opcional)"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={description} onChange={e => setDescription(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50
              ${isDeposit ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
            {loading ? 'Salvando...' : isDeposit ? 'Depositar' : 'Retirar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
