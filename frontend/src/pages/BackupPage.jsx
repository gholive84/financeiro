import React, { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, RefreshCw, Database, CheckCircle, AlertCircle, HardDrive } from 'lucide-react';
import api from '../services/api';

const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const fmtDate = (d) => new Date(d).toLocaleString('pt-BR');

export default function BackupPage() {
  const [backups, setBackups] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { ok, counts } | { error }
  const [deletingFile, setDeletingFile] = useState(null);

  const loadBackups = useCallback(async () => {
    try {
      const { data } = await api.get('/backup');
      setBackups(data);
    } catch { setBackups([]); }
  }, []);

  useEffect(() => { loadBackups(); }, [loadBackups]);

  const handleGenerate = async () => {
    setGenerating(true);
    setLastResult(null);
    try {
      const { data } = await api.post('/backup');
      setLastResult({ ok: true, counts: data.counts });
      await loadBackups();
    } catch {
      setLastResult({ error: true });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (filename) => {
    const token = localStorage.getItem('token');
    const url = `/api/backup/${filename}`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    // add auth header via fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const burl = URL.createObjectURL(blob);
        a.href = burl;
        a.click();
        URL.revokeObjectURL(burl);
      });
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Excluir o backup "${filename}"?`)) return;
    setDeletingFile(filename);
    try {
      await api.delete(`/backup/${filename}`);
      await loadBackups();
    } catch { alert('Erro ao excluir backup.'); }
    setDeletingFile(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Backup</h1>
        <p className="text-sm text-slate-400 mt-1">Gere e gerencie backups dos dados salvos no servidor.</p>
      </div>

      {/* Gerar backup */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Database size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">Gerar novo backup</p>
            <p className="text-sm text-slate-400 mt-0.5">
              Exporta todas as transações, categorias, contas, cartões, tags, orçamentos, caixinhas e usuários
              para um arquivo JSON salvo no servidor.
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-semibold transition-colors">
          {generating ? <RefreshCw size={15} className="animate-spin" /> : <HardDrive size={15} />}
          {generating ? 'Gerando...' : 'Gerar backup no servidor'}
        </button>

        {lastResult?.ok && (
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold text-sm">
              <CheckCircle size={15} /> Backup gerado com sucesso
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pl-5">
              {Object.entries(lastResult.counts).map(([k, v]) => (
                <span key={k}><span className="font-medium text-slate-700 dark:text-slate-300">{v}</span> {k}</span>
              ))}
            </div>
          </div>
        )}

        {lastResult?.error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-600 dark:text-red-400 text-sm font-medium">
            <AlertCircle size={15} /> Erro ao gerar backup.
          </div>
        )}
      </div>

      {/* Lista de backups */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Backups no servidor</p>
          <button onClick={loadBackups} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <RefreshCw size={14} />
          </button>
        </div>

        {backups.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">Nenhum backup encontrado.</p>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {backups.map(b => (
              <div key={b.filename} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{b.filename}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{fmtDate(b.created_at)} · {fmtSize(b.size)}</p>
                </div>
                <button onClick={() => handleDownload(b.filename)}
                  title="Baixar"
                  className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 transition-colors">
                  <Download size={15} />
                </button>
                <button onClick={() => handleDelete(b.filename)}
                  disabled={deletingFile === b.filename}
                  title="Excluir"
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
