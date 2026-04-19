import React, { useState } from 'react';
import { Download, CheckCircle, AlertCircle, Database } from 'lucide-react';
import api from '../services/api';

export default function BackupPage() {
  const [status, setStatus] = useState(null); // null | 'loading' | 'ok' | 'error'
  const [info, setInfo] = useState(null);

  const handleBackup = async () => {
    setStatus('loading');
    setInfo(null);
    try {
      const res = await api.get('/backup', { responseType: 'blob' });
      const date = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financeiro-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Parse counts from blob
      const text = await res.data.text();
      const json = JSON.parse(text);
      setInfo(json.counts);
      setStatus('ok');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Backup</h1>
        <p className="text-sm text-slate-400 mt-1">Exporte todos os dados do sistema em formato JSON.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Database size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">Exportar dados completos</p>
            <p className="text-sm text-slate-400 mt-0.5">
              Inclui transações, categorias, contas, cartões, tags, orçamentos, caixinhas e usuários.
              O arquivo JSON pode ser usado para restauração ou análise externa.
            </p>
          </div>
        </div>

        <button
          onClick={handleBackup}
          disabled={status === 'loading'}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-semibold transition-colors">
          <Download size={16} />
          {status === 'loading' ? 'Gerando backup...' : 'Baixar backup (JSON)'}
        </button>

        {status === 'ok' && info && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold text-sm">
              <CheckCircle size={16} /> Backup gerado com sucesso
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pl-6">
              {Object.entries(info).map(([k, v]) => (
                <span key={k}><span className="font-medium text-slate-700 dark:text-slate-300">{v}</span> {k}</span>
              ))}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400 text-sm font-medium">
            <AlertCircle size={16} /> Erro ao gerar backup. Tente novamente.
          </div>
        )}
      </div>
    </div>
  );
}
