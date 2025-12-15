'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, ArrowLeft, MessageCircle, Settings, History, Menu, Plus, X, Edit } from 'lucide-react';
import Link from 'next/link';
import { DEFAULT_AGENTS, VERDICT_CONFIG, STANCE_CONFIG } from '@/lib/constants';
import { AgentReport, FinalVerdict } from '@/types';
import SettingsDropdown from '@/components/SettingsDropdown';
import {
  createConversation,
  getConversations,
  addMessage,
  getMessages,
  DbConversation,
  DbMessage
} from '@/lib/supabase';

interface AnalysisResult {
  agent_reports: AgentReport[];
  verdict: FinalVerdict;
  execution_time_seconds: number;
  total_llm_calls: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentMessages, setAgentMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [view, setView] = useState<'home' | 'analysis' | 'chat'>('home');

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Settings state
  const [language, setLanguage] = useState('ru');
  const [model, setModel] = useState('gpt-4o');

  // Load settings from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('roundtable-language');
    const savedModel = localStorage.getItem('roundtable-model');
    if (savedLang) setLanguage(savedLang);
    if (savedModel) setModel(savedModel);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      // Create conversation in Supabase
      const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
      const conversation = await createConversation(title, input);
      setCurrentConversationId(conversation.id);

      // Save user message
      await addMessage(conversation.id, 'user', input);

      // Run analysis
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, language, model }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Save analysis result as system message
      await addMessage(conversation.id, 'system', JSON.stringify(data), undefined, {
        type: 'analysis_result',
        verdict: data.verdict?.signal,
      });

      setResult(data);
      setView('analysis');
      loadConversations(); // Refresh sidebar
    } catch (error) {
      console.error(error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAgentClick = async (agentId: string, report: AgentReport) => {
    setActiveAgent(agentId);
    setAgentMessages([
      { role: 'assistant', content: report.insights.join('\n\n') }
    ]);
    setView('chat');
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !activeAgent) return;
    const newMessages = [...agentMessages, { role: 'user' as const, content: chatInput }];
    setAgentMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      // Save user message to Supabase
      if (currentConversationId) {
        await addMessage(currentConversationId, 'user', chatInput, activeAgent);
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: activeAgent,
          messages: newMessages,
          language: 'ru'
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Save agent response to Supabase
      if (currentConversationId) {
        await addMessage(currentConversationId, 'agent', data.response, activeAgent);
      }

      setAgentMessages([...newMessages, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error(error);
    } finally {
      setChatLoading(false);
    }
  };

  const handleNewConversation = () => {
    setInput('');
    setResult(null);
    setActiveAgent(null);
    setAgentMessages([]);
    setCurrentConversationId(null);
    setView('home');
    setSidebarOpen(false);
  };

  const getAgentConfig = (name: string) => {
    return DEFAULT_AGENTS.find(a => a.name === name) || DEFAULT_AGENTS[0];
  };

  // Sidebar component
  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5" />
            История
          </h2>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-gray-200 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New conversation button */}
        <div className="p-3">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Новый анализ
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Нет сохранённых разговоров</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  // TODO: Load conversation
                  setSidebarOpen(false);
                }}
                className={`w-full text-left p-3 rounded-xl hover:bg-gray-100 transition-colors ${currentConversationId === conv.id ? 'bg-indigo-50 border border-indigo-200' : ''
                  }`}
              >
                <div className="text-sm font-medium text-gray-900 truncate">{conv.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(conv.created_at).toLocaleDateString('ru-RU')}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // HOME VIEW
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex-1">
          {/* Mobile header */}
          <div className="lg:hidden p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="font-semibold text-gray-900">🏰 RoundTable</h1>
            </div>
            <SettingsDropdown
              language={language}
              model={model}
              onLanguageChange={(l) => { setLanguage(l); localStorage.setItem('roundtable-language', l); }}
              onModelChange={(m) => { setModel(m); localStorage.setItem('roundtable-model', m); }}
            />
          </div>

          {/* Desktop header */}
          <div className="hidden lg:flex items-center justify-end gap-2 p-4 border-b border-gray-200">
            <Link href="/agents" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              <Edit className="w-4 h-4" />
              <span>Редактировать</span>
            </Link>
            <SettingsDropdown
              language={language}
              model={model}
              onLanguageChange={(l) => { setLanguage(l); localStorage.setItem('roundtable-language', l); }}
              onModelChange={(m) => { setModel(m); localStorage.setItem('roundtable-model', m); }}
            />
          </div>

          <div className="max-w-3xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">🏰 RoundTable</h1>
              <p className="text-gray-500">Your Virtual Board of Advisors</p>
            </div>

            {/* Input Area */}
            <div className="bg-gray-50 rounded-2xl p-8 mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Опиши свою идею
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Например: Хочу открыть грузинскую пекарню в Германии..."
                className="w-full h-40 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading || !input.trim()}
                className="mt-4 w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Анализируем...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Запустить анализ
                  </>
                )}
              </button>
            </div>

            {/* Agents Grid */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Круглый стол (10 советников)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {DEFAULT_AGENTS.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-gray-50 rounded-xl p-4 text-center hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="text-2xl mb-1">{agent.emoji}</div>
                    <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{agent.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ANALYSIS VIEW
  if (view === 'analysis' && result) {
    const verdictConfig = VERDICT_CONFIG[result.verdict.signal];

    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex-1">
          <div className="lg:hidden p-4 border-b border-gray-200 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Back button */}
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Новый анализ
            </button>

            {/* Verdict Card */}
            <div
              className="rounded-2xl p-6 mb-8"
              style={{ backgroundColor: verdictConfig.color + '15', borderColor: verdictConfig.color, borderWidth: 2 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{verdictConfig.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: verdictConfig.color }}>
                    {verdictConfig.label}
                  </h2>
                  <p className="text-sm text-gray-600">{verdictConfig.description}</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold text-gray-900">{result.verdict.confidence}%</div>
                  <div className="text-xs text-gray-500">confidence</div>
                </div>
              </div>
              <p className="text-gray-700 mb-4">{result.verdict.core_conflict}</p>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">📋 План действий:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                  {result.verdict.action_plan.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                ⏱️ {result.execution_time_seconds.toFixed(1)}s | 🔄 {result.total_llm_calls} LLM calls
              </div>
            </div>

            {/* Agent Reports */}
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🏰 Мнения советников
              <span className="text-sm font-normal text-gray-500 ml-2">(нажми для чата)</span>
            </h2>
            <div className="space-y-3">
              {result.agent_reports.map((report) => {
                const agent = getAgentConfig(report.agent_name);
                const stanceConfig = STANCE_CONFIG[report.stance];
                return (
                  <div
                    key={report.agent_name}
                    onClick={() => handleAgentClick(agent.id, report)}
                    className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{agent.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{report.agent_name}</span>
                          <span style={{ color: stanceConfig.color }}>{stanceConfig.emoji} {report.stance}</span>
                          <span className="text-xs text-gray-500">Risk: {report.risk_score}%</span>
                        </div>
                        {report.insights.map((insight, i) => (
                          <p key={i} className="text-sm text-gray-600 mb-1">└─ {insight}</p>
                        ))}
                      </div>
                      <MessageCircle className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CHAT VIEW
  if (view === 'chat' && activeAgent) {
    const agent = DEFAULT_AGENTS.find(a => a.id === activeAgent)!;

    return (
      <div className="min-h-screen bg-white flex">
        <Sidebar />

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('analysis')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-2xl">{agent.emoji}</span>
            <div>
              <h2 className="font-semibold text-gray-900">{agent.name}</h2>
              <p className="text-xs text-gray-500">{agent.description}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
            {agentMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Задай вопрос..."
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
