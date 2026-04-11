import React, { useState, useRef } from 'react';
import { Upload, FileText, Image, Loader2, CheckCircle, Trash2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useApp } from '../context/AppContext';
import { useEffect } from 'react';

const STEPS = { idle: 'idle', processing: 'processing', review: 'review', saving: 'saving', done: 'done' };

export default function ImportPage() {
  const [step, setStep] = useState(STEPS.idle);
  const [transactions, setTransactions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [pdfPassword, setPdfPassword] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef();
  const { categories, accounts, creditCards, loadCategories, loadAccounts, loadCreditCards } = useApp();

  useEffect(() => { loadCategories(); loadAccounts(); loadCreditCards(); }, []);

  const isPDF = (file) => file?.name?.toLowerCase().endsWith('.pdf') || file?.type === 'application/pdf';
  const isImage = (file) => /^image\/(png|jpe?g|webp|gif)$/i.test(file?.type) || /\.(png|jpe?g|webp|gif)$/i.test(file?.name || '');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setPdfPassword('');
    setImagePreview(null);
    if (isPDF(file)) {
      setPendingFile(file);  // aguarda senha antes de processar
    } else if (isImage(file)) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setPendingFile(file);  // mostra preview antes de processar
    } else {
      setPendingFile(null);
      submitFile(file, '');
    }
  };

  const submitFile = async (file, password) => {
    setStep(STEPS.processing);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (password) formData.append('password', password);
      const { data } = await api.post('/import/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTransactions(data.transactions.map((t, i) => ({ ...t, _id: i })));
      setSelected(data.transactions.map((_, i) => i));
      setPendingFile(null);
      setStep(STEPS.review);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao processar arquivo');
      setStep(STEPS.idle);
    }
  };

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  const updateTransaction = (id, key, value) => {
    setTransactions(ts => ts.map(t => t._id === id ? { ...t, [key]: value } : t));
  };

  const removeTransaction = (id) => {
    setTransactions(ts => ts.filter(t => t._id !== id));
    setSelected(s => s.filter(x => x !== id));
  };

  const handleSave = async () => {
    const toSave = transactions.filter(t => selected.includes(t._id));
    if (!toSave.length) return;
    setStep(STEPS.saving);
    try {
      const { data } = await api.post('/import/save', { transactions: toSave });
      setSavedCount(data.saved);
      setStep(STEPS.done);
    } catch {
      setError('Erro ao salvar transações');
      setStep(STEPS.review);
    }
  };

  const reset = () => {
    setStep(STEPS.idle); setTransactions([]); setSelected([]); setError(''); setFileName('');
    setPendingFile(null); setPdfPassword('');
    if (imagePreview) { URL.revokeObjectURL(imagePreview); setImagePreview(null); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const totalAmount = transactions.filter(t => selected.includes(t._id))
    .reduce((s, t) => t.type === 'income' ? s + parseFloat(t.amount) : s - parseFloat(t.amount), 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Importar Despesas</h1>
        <p className="text-slate-400 text-sm mt-1">Envie um PDF ou CSV — a IA interpreta e você confirma os lançamentos.</p>
      </div>

      {/* IDLE */}
      {step === STEPS.idle && !pendingFile && (
        <div
          className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => fileRef.current?.click()}>
          <Upload size={40} className="text-slate-300" />
          <div className="text-center">
            <p className="font-semibold text-slate-700">Clique para selecionar arquivo</p>
            <p className="text-sm text-slate-400 mt-1">PDF, CSV, TXT ou <strong>print/screenshot</strong> — a IA interpreta qualquer formato</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-500 px-3 py-1 rounded-full">PDF, CSV, TXT, PNG, JPG, WEBP</span>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <input ref={fileRef} type="file" accept=".pdf,.csv,.txt,.png,.jpg,.jpeg,.webp,.gif" className="hidden" onChange={handleFile} />
        </div>
      )}

      {/* PDF com senha */}
      {step === STEPS.idle && pendingFile && !imagePreview && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-5">
          <FileText size={40} className="text-blue-400" />
          <div className="text-center">
            <p className="font-semibold text-slate-800">{fileName}</p>
            <p className="text-sm text-slate-400 mt-1">Este PDF é protegido por senha</p>
          </div>
          <input
            type="password" placeholder="Senha do PDF"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={pdfPassword} onChange={e => setPdfPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitFile(pendingFile, pdfPassword)}
            autoFocus />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 w-full">
            <button onClick={reset} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={() => submitFile(pendingFile, pdfPassword)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
              Processar PDF
            </button>
          </div>
        </div>
      )}

      {/* Preview de imagem */}
      {step === STEPS.idle && pendingFile && imagePreview && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center gap-5">
          <div className="w-full rounded-xl overflow-hidden border border-slate-100 max-h-72 flex items-center justify-center bg-slate-50">
            <img src={imagePreview} alt="Preview" className="max-h-72 object-contain" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-800">{fileName}</p>
            <p className="text-sm text-slate-400 mt-1">A IA vai analisar a imagem e extrair as transações</p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 w-full">
            <button onClick={reset} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button onClick={() => submitFile(pendingFile, '')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <Image size={16} /> Analisar imagem
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING */}
      {step === STEPS.processing && (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-blue-600 animate-spin" />
          <div className="text-center">
            <p className="font-semibold text-slate-700">Analisando {fileName}...</p>
            <p className="text-sm text-slate-400 mt-1">{imagePreview ? 'A IA está interpretando a imagem e extraindo as transações' : 'A IA está extraindo as transações do arquivo'}</p>
          </div>
        </div>
      )}

      {/* REVIEW */}
      {step === STEPS.review && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-slate-800">{transactions.length} transações encontradas</p>
              <p className="text-sm text-slate-400">{selected.length} selecionadas · Arquivo: {fileName}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => setSelected(transactions.map(t => t._id))}
                className="border border-blue-200 rounded-xl px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors">
                Selecionar todas
              </button>
              <button onClick={handleSave} disabled={!selected.length}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors">
                Salvar {selected.length} transações
              </button>
            </div>
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Selecionadas</p>
              <p className="font-bold text-slate-800">{selected.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Total despesas</p>
              <p className="font-bold text-red-500">
                R$ {transactions.filter(t => selected.includes(t._id) && t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Total receitas</p>
              <p className="font-bold text-green-600">
                R$ {transactions.filter(t => selected.includes(t._id) && t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle size={14} /> {error}</p>}

          {/* Categorização em lote */}
          {selected.length > 1 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-blue-700">Categorizar {selected.length} selecionadas:</span>
              <select className="border border-blue-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none bg-white flex-1 min-w-0"
                onChange={e => {
                  if (!e.target.value) return;
                  const [id, type] = e.target.value.split('|');
                  setTransactions(ts => ts.map(t => selected.includes(t._id) && t.type === type ? { ...t, category_id: id } : t));
                  e.target.value = '';
                }}>
                <option value="">Aplicar categoria a todas despesas/receitas selecionadas...</option>
                <optgroup label="Despesas">
                  {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={`${c.id}|expense`}>{c.name}</option>)}
                </optgroup>
                <optgroup label="Receitas">
                  {categories.filter(c => c.type === 'income').map(c => <option key={c.id} value={`${c.id}|income`}>{c.name}</option>)}
                </optgroup>
              </select>
            </div>
          )}

          {/* Lista */}
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t._id} className={`bg-white rounded-xl border px-4 py-3 flex items-start gap-3 transition-all ${selected.includes(t._id) ? 'border-slate-100' : 'border-slate-100 opacity-50'}`}>
                <input type="checkbox" checked={selected.includes(t._id)} onChange={() => toggleSelect(t._id)} className="mt-1 cursor-pointer" />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center gap-1.5 sm:col-span-1">
                    <input
                      className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 min-w-0"
                      value={t.description} onChange={e => updateTransaction(t._id, 'description', e.target.value)} />
                    {t._installmentInfo && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500 font-semibold flex-shrink-0 whitespace-nowrap">
                        {t._installmentInfo.current}/{t._installmentInfo.total}x
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none flex-1"
                      value={t.type} onChange={e => updateTransaction(t._id, 'type', e.target.value)}>
                      <option value="expense">Despesa</option>
                      <option value="income">Receita</option>
                    </select>
                    <input type="number" step="0.01"
                      className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none w-24"
                      value={t.amount} onChange={e => updateTransaction(t._id, 'amount', e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <input type="date"
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none flex-1"
                      value={String(t.date).split('T')[0]} onChange={e => updateTransaction(t._id, 'date', e.target.value)} />
                    <select className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none flex-1"
                      value={t.category_id || ''} onChange={e => updateTransaction(t._id, 'category_id', e.target.value || null)}>
                      <option value="">Categoria</option>
                      {categories.filter(c => c.type === t.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => removeTransaction(t._id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={!selected.length}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-6 py-3 text-sm font-semibold transition-colors">
              Salvar {selected.length} transações
            </button>
          </div>
        </div>
      )}

      {/* SAVING */}
      {step === STEPS.saving && (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-blue-600 animate-spin" />
          <p className="font-semibold text-slate-700">Salvando transações...</p>
        </div>
      )}

      {/* DONE */}
      {step === STEPS.done && (
        <div className="bg-white rounded-2xl border border-green-100 p-12 flex flex-col items-center gap-6">
          <CheckCircle size={56} className="text-green-500" />
          <div className="text-center">
            <p className="font-bold text-slate-800 text-xl">{savedCount} transações importadas!</p>
            <p className="text-sm text-slate-400 mt-1">Todos os lançamentos foram salvos com sucesso.</p>
          </div>
          <button onClick={reset} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 py-3 font-semibold transition-colors">
            Importar outro arquivo
          </button>
        </div>
      )}

      {/* Dicas */}
      {step === STEPS.idle && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Formatos suportados</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: FileText, title: 'Fatura PDF', desc: 'Fatura de cartão de crédito em PDF' },
              { icon: FileText, title: 'Extrato CSV', desc: 'Extrato bancário exportado do banco' },
              { icon: Image, title: 'Print / Screenshot', desc: 'Print de app do banco, comprovante ou extrato em imagem (PNG, JPG, WEBP)' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 p-3 rounded-xl bg-slate-50">
                <Icon size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">{title}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
