import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, CheckCircle, Edit3, Send } from 'lucide-react';
import api from '../services/api';
import { useApp } from '../context/AppContext';

const STEPS = { idle: 'idle', recording: 'recording', processing: 'processing', review: 'review', saving: 'saving', done: 'done' };

const typeLabels = { income: 'Receita', expense: 'Despesa' };

export default function AILaunchPage() {
  const [step, setStep] = useState(STEPS.idle);
  const [transcript, setTranscript] = useState('');
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const { categories, accounts, creditCards, loadCategories, loadAccounts, loadCreditCards } = useApp();

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    loadCategories(); loadAccounts(); loadCreditCards();
  }, []);

  useEffect(() => {
    if (step === STEPS.recording) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  const startRecording = async () => {
    setError('');
    setTranscript('');
    setTransaction(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); processAudio(); };
      mediaRef.current = recorder;
      recorder.start();
      setStep(STEPS.recording);
    } catch {
      setError('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop();
      setStep(STEPS.processing);
    }
  };

  const processAudio = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');
      const { data } = await api.post('/ai/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTranscript(data.transcript);
      setTransaction(data.transaction);
      setStep(STEPS.review);
    } catch (err) {
      setError('Erro ao processar o áudio. Tente novamente.');
      setStep(STEPS.idle);
    }
  };

  const saveTransaction = async () => {
    setStep(STEPS.saving);
    try {
      await api.post('/transactions', {
        ...transaction,
        account_id: transaction.account_id || null,
        credit_card_id: transaction.credit_card_id || null,
        category_id: transaction.category_id || null,
      });
      setStep(STEPS.done);
    } catch {
      setError('Erro ao salvar a transação.');
      setStep(STEPS.review);
    }
  };

  const reset = () => { setStep(STEPS.idle); setTranscript(''); setTransaction(null); setError(''); };

  const set = (k, v) => setTransaction(t => ({ ...t, [k]: v }));

  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const categoryName = categories.find(c => c.id === parseInt(transaction?.category_id))?.name;
  const accountName = accounts.find(a => a.id === parseInt(transaction?.account_id))?.name;
  const cardName = creditCards.find(c => c.id === parseInt(transaction?.credit_card_id))?.name;

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Lançar com IA</h1>
        <p className="text-slate-400 text-sm mt-1">Fale o lançamento e a IA preenche tudo automaticamente.</p>
      </div>

      {/* IDLE */}
      {step === STEPS.idle && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
            <Mic size={40} className="text-blue-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-800 mb-1">Pressione para gravar</p>
            <p className="text-sm text-slate-400">Ex: "Gastei 45 reais no almoço hoje no cartão Itaú"</p>
          </div>
          <button onClick={startRecording}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-semibold text-base transition-colors flex items-center justify-center gap-2">
            <Mic size={20} /> Iniciar Gravação
          </button>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
      )}

      {/* RECORDING */}
      {step === STEPS.recording && (
        <div className="bg-white rounded-2xl border border-red-100 p-8 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center animate-pulse">
              <Mic size={40} className="text-red-500" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800 font-mono">{formatTime(recordingTime)}</p>
            <p className="text-sm text-slate-400 mt-1">Gravando... fale seu lançamento</p>
          </div>
          <button onClick={stopRecording}
            className="w-full bg-red-500 hover:bg-red-600 text-white rounded-2xl py-4 font-semibold text-base transition-colors flex items-center justify-center gap-2">
            <MicOff size={20} /> Parar e Processar
          </button>
        </div>
      )}

      {/* PROCESSING */}
      {step === STEPS.processing && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-blue-600 animate-spin" />
          <p className="font-semibold text-slate-700">Processando com IA...</p>
          <p className="text-sm text-slate-400">Transcrevendo áudio e interpretando o lançamento</p>
        </div>
      )}

      {/* REVIEW */}
      {step === STEPS.review && transaction && (
        <div className="space-y-4">
          {/* Transcrição */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Você disse</p>
            <p className="text-sm text-slate-700 italic">"{transcript}"</p>
            {transaction.confidence && (
              <p className="text-xs text-blue-500 mt-2">✦ {transaction.confidence}</p>
            )}
          </div>

          {/* Formulário de revisão */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Edit3 size={16} className="text-slate-400" />
              <p className="font-semibold text-slate-800 text-sm">Revise e confirme</p>
            </div>

            {/* Tipo */}
            <div className="flex rounded-xl overflow-hidden border border-slate-200">
              {['expense', 'income'].map(t => (
                <button type="button" key={t}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors
                    ${transaction.type === t
                      ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  onClick={() => set('type', t)}>
                  {t === 'expense' ? 'Despesa' : 'Receita'}
                </button>
              ))}
            </div>

            <input placeholder="Descrição" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={transaction.description || ''} onChange={e => set('description', e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Valor (R$)</label>
                <input type="number" step="0.01" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={transaction.amount || ''} onChange={e => set('amount', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Data</label>
                <input type="date" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={transaction.date || ''} onChange={e => set('date', e.target.value)} />
              </div>
            </div>

            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={transaction.category_id || ''} onChange={e => set('category_id', e.target.value || null)}>
              <option value="">Categoria</option>
              {categories.filter(c => c.type === transaction.type).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <select className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={transaction.account_id || ''} onChange={e => { set('account_id', e.target.value || null); if (e.target.value) set('credit_card_id', null); }}
                disabled={!!transaction.credit_card_id}>
                <option value="">Conta</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={transaction.credit_card_id || ''} onChange={e => { set('credit_card_id', e.target.value || null); if (e.target.value) set('account_id', null); }}
                disabled={!!transaction.account_id}>
                <option value="">Cartão</option>
                {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={transaction.status || 'paid'} onChange={e => set('status', e.target.value)}>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 border border-slate-200 rounded-2xl py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button onClick={saveTransaction}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <Send size={16} /> Confirmar
            </button>
          </div>
        </div>
      )}

      {/* SAVING */}
      {step === STEPS.saving && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-blue-600 animate-spin" />
          <p className="font-semibold text-slate-700">Salvando transação...</p>
        </div>
      )}

      {/* DONE */}
      {step === STEPS.done && (
        <div className="bg-white rounded-2xl border border-green-100 p-8 flex flex-col items-center gap-6">
          <CheckCircle size={56} className="text-green-500" />
          <div className="text-center">
            <p className="font-bold text-slate-800 text-lg">Lançamento salvo!</p>
            <p className="text-sm text-slate-400 mt-1">A transação foi registrada com sucesso.</p>
          </div>
          <button onClick={reset}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-semibold transition-colors flex items-center justify-center gap-2">
            <Mic size={20} /> Novo Lançamento
          </button>
        </div>
      )}

      {/* Exemplos */}
      {step === STEPS.idle && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Exemplos de fala</p>
          <div className="space-y-2">
            {[
              'Gastei 45 reais no almoço hoje no cartão Itaú',
              'Paguei 1200 de aluguel ontem em dinheiro',
              'Recebi 3500 de salário hoje na conta Nubank',
              'Comprei remédio por 89 reais no débito',
            ].map((ex, i) => (
              <p key={i} className="text-sm text-slate-500 bg-slate-50 rounded-xl px-3 py-2">"{ex}"</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
