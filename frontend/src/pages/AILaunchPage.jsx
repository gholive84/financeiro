import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, CheckCircle, Send, Type, Wallet, CreditCard } from 'lucide-react';
import api from '../services/api';
import { useApp } from '../context/AppContext';

const STEPS = { idle: 'idle', recording: 'recording', processing: 'processing', review: 'review', saving: 'saving', done: 'done' };

export default function AILaunchPage() {
  const [step, setStep] = useState(STEPS.idle);
  const [mode, setMode] = useState('voice');
  const [textInput, setTextInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  // pré-seleção: 'account_ID' ou 'card_ID' ou ''
  const [preSelected, setPreSelected] = useState('');
  const { categories, accounts, creditCards, loadCategories, loadAccounts, loadCreditCards } = useApp();

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    loadCategories();
    loadAccounts();
    loadCreditCards();
  }, []);

  // Auto-seleciona o padrão quando as listas carregarem
  useEffect(() => {
    if (preSelected) return; // não sobrescreve seleção manual
    const defCard = creditCards.find(c => c.is_default);
    const defAccount = accounts.find(a => a.is_default);
    if (defCard) setPreSelected(`card_${defCard.id}`);
    else if (defAccount) setPreSelected(`account_${defAccount.id}`);
  }, [accounts, creditCards]);

  useEffect(() => {
    if (step === STEPS.recording) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  const reset = () => { setStep(STEPS.idle); setTransaction(null); setTranscript(''); setError(''); setTextInput(''); };
  const todayStr = () => new Date().toISOString().split('T')[0];
  const set = (k, v) => setTransaction(t => {
    const updated = { ...t, [k]: v };
    if (k === 'date') updated.status = v <= todayStr() ? 'paid' : 'pending';
    return updated;
  });

  // Aplica a pré-seleção à transação recebida da IA (só se a IA não detectou nada)
  const applyPreSelected = (tx) => {
    if (!preSelected) return tx;
    const hasSource = tx.account_id || tx.credit_card_id;
    if (hasSource) return tx; // IA já detectou — não sobrescreve
    if (preSelected.startsWith('account_')) {
      return { ...tx, account_id: parseInt(preSelected.replace('account_', '')), credit_card_id: null };
    }
    if (preSelected.startsWith('card_')) {
      return { ...tx, credit_card_id: parseInt(preSelected.replace('card_', '')), account_id: null };
    }
    return tx;
  };

  // Descrição amigável do pré-selecionado
  const preSelectedLabel = () => {
    if (!preSelected) return null;
    if (preSelected.startsWith('account_')) {
      const a = accounts.find(a => a.id === parseInt(preSelected.replace('account_', '')));
      return a ? { name: a.name, color: a.color, icon: 'account' } : null;
    }
    if (preSelected.startsWith('card_')) {
      const c = creditCards.find(c => c.id === parseInt(preSelected.replace('card_', '')));
      return c ? { name: c.name, color: c.color, icon: 'card' } : null;
    }
    return null;
  };

  // --- VOZ ---
  const startRecording = async () => {
    setError(''); setTransaction(null);
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
      const { data } = await api.post('/ai/transcribe', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTranscript(data.transcript);
      setTransaction(applyPreSelected(data.transaction));
      setStep(STEPS.review);
    } catch {
      setError('Erro ao processar o áudio. Tente novamente.');
      setStep(STEPS.idle);
    }
  };

  // --- TEXTO ---
  const processText = async () => {
    if (!textInput.trim()) return;
    setError(''); setStep(STEPS.processing);
    try {
      const { data } = await api.post('/ai/text', { text: textInput });
      setTranscript(textInput);
      setTransaction(applyPreSelected(data.transaction));
      setStep(STEPS.review);
    } catch {
      setError('Erro ao processar. Tente novamente.');
      setStep(STEPS.idle);
    }
  };

  // --- SALVAR ---
  const saveTransaction = async () => {
    setStep(STEPS.saving);
    try {
      await api.post('/transactions', {
        ...transaction,
        account_id: transaction.account_id || null,
        credit_card_id: transaction.credit_card_id || null,
        category_id: transaction.category_id || null,
        installments: transaction.installments || 1,
      });
      setStep(STEPS.done);
    } catch {
      setError('Erro ao salvar a transação.');
      setStep(STEPS.review);
    }
  };

  const formatTime = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const examples = [
    'Gastei 45 reais no almoço hoje no cartão Itaú',
    'Paguei 1200 de aluguel ontem em dinheiro',
    'Recebi 3500 de salário hoje na conta Nubank',
    'Comprei remédio por 89 reais no débito',
    'Comprei TV 1800 reais em 6x no cartão Bradesco',
  ];

  const label = preSelectedLabel();

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Lançar com IA</h1>
        <p className="text-slate-400 text-sm mt-1">Fale ou escreva — a IA interpreta e você confirma.</p>
      </div>

      {/* Toggle modo */}
      {step === STEPS.idle && (
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
          {[['voice', Mic, 'Voz'], ['text', Type, 'Texto']].map(([m, Icon, lbl]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors
                ${mode === m ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Icon size={15} /> {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Seletor de conta/cartão pré-selecionado */}
      {step === STEPS.idle && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Lançar em</label>
          <select
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={preSelected}
            onChange={e => setPreSelected(e.target.value)}
          >
            <option value="">Detectar automaticamente pela IA</option>
            {accounts.length > 0 && (
              <optgroup label="Contas">
                {accounts.map(a => (
                  <option key={`account_${a.id}`} value={`account_${a.id}`}>
                    {a.name}{a.is_default ? ' ★' : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {creditCards.length > 0 && (
              <optgroup label="Cartões de Crédito">
                {creditCards.map(c => (
                  <option key={`card_${c.id}`} value={`card_${c.id}`}>
                    {c.name}{c.bank ? ` · ${c.bank}` : ''}{c.is_default ? ' ★' : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {label && (
            <div className="flex items-center gap-2 px-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
              <span className="text-xs text-slate-500">
                {label.icon === 'card' ? 'Cartão' : 'Conta'} <strong>{label.name}</strong> pré-selecionado
                {label.icon === 'card' ? '' : ' — a IA pode substituir se detectar outro'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* IDLE — VOZ */}
      {step === STEPS.idle && mode === 'voice' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
            <Mic size={40} className="text-blue-600" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-800 mb-1">Pressione para gravar</p>
            <p className="text-sm text-slate-400">Ex: "Gastei 45 reais no almoço hoje"</p>
          </div>
          <button onClick={startRecording}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-semibold text-base transition-colors flex items-center justify-center gap-2">
            <Mic size={20} /> Iniciar Gravação
          </button>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
      )}

      {/* IDLE — TEXTO */}
      {step === STEPS.idle && mode === 'text' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          <textarea rows={3} placeholder='Ex: "Gastei 45 reais no almoço hoje no cartão Itaú"'
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={textInput} onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); processText(); } }} />
          <button onClick={processText} disabled={!textInput.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-2xl py-3 font-semibold text-sm transition-colors flex items-center justify-center gap-2">
            <Send size={16} /> Interpretar
          </button>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
      )}

      {/* GRAVANDO */}
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
            <MicOff size={20} /> Parar
          </button>
        </div>
      )}

      {/* PROCESSANDO */}
      {step === STEPS.processing && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-blue-600 animate-spin" />
          <p className="font-semibold text-slate-700">Processando com IA...</p>
          <p className="text-sm text-slate-400">Interpretando o lançamento</p>
        </div>
      )}

      {/* REVISÃO */}
      {step === STEPS.review && transaction && (
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Você disse</p>
            <p className="text-sm text-slate-700 italic">"{transcript}"</p>
            {transaction.confidence && <p className="text-xs text-blue-500 mt-2">✦ {transaction.confidence}</p>}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <p className="font-semibold text-slate-800 text-sm">Revise e confirme</p>

            <div className="flex rounded-xl overflow-hidden border border-slate-200">
              {['expense', 'income'].map(t => (
                <button type="button" key={t} onClick={() => set('type', t)}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors
                    ${transaction.type === t
                      ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                      : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                  {t === 'expense' ? 'Despesa' : 'Receita'}
                </button>
              ))}
            </div>

            <input placeholder="Descrição"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={transaction.description || ''} onChange={e => set('description', e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Valor (R$)</label>
                <input type="number" step="0.01"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={transaction.amount || ''} onChange={e => set('amount', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Data</label>
                <input type="date"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div>
                <label className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Wallet size={11} /> Conta</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={transaction.account_id || ''} disabled={!!transaction.credit_card_id}
                  onChange={e => { set('account_id', e.target.value || null); if (e.target.value) { set('credit_card_id', null); set('installments', 1); } }}>
                  <option value="">Nenhuma</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.is_default ? ' ★' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 flex items-center gap-1"><CreditCard size={11} /> Cartão</label>
                <select className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={transaction.credit_card_id || ''} disabled={!!transaction.account_id}
                  onChange={e => { set('credit_card_id', e.target.value || null); if (e.target.value) set('account_id', null); }}>
                  <option value="">Nenhum</option>
                  {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}{c.is_default ? ' ★' : ''}</option>)}
                </select>
              </div>
            </div>

            {transaction.credit_card_id && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Parcelas</label>
                <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={transaction.installments || 1} onChange={e => set('installments', parseInt(e.target.value))}>
                  <option value={1}>À vista (1x)</option>
                  {[2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
                    <option key={n} value={n}>{n}x {transaction.amount ? `de R$ ${(parseFloat(transaction.amount) / n).toFixed(2).replace('.', ',')}` : ''}</option>
                  ))}
                </select>
                {(transaction.installments || 1) > 1 && (
                  <p className="text-xs text-blue-500 mt-1">Serão criadas {transaction.installments} transações mensais.</p>
                )}
              </div>
            )}

            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={transaction.status || 'paid'} onChange={e => set('status', e.target.value)}>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 border border-slate-200 rounded-2xl py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button onClick={saveTransaction}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <Send size={16} /> Confirmar
            </button>
          </div>
        </div>
      )}

      {/* SALVANDO */}
      {step === STEPS.saving && (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-blue-600 animate-spin" />
          <p className="font-semibold text-slate-700">Salvando transação...</p>
        </div>
      )}

      {/* CONCLUÍDO */}
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

      {/* Exemplos clicáveis */}
      {step === STEPS.idle && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Exemplos</p>
          <div className="space-y-2">
            {examples.map((ex, i) => (
              <button key={i} onClick={() => { setMode('text'); setTextInput(ex); }}
                className="w-full text-left text-sm text-slate-500 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl px-3 py-2 transition-colors">
                "{ex}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
