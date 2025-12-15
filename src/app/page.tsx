'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  Menu, X, Plus, History, Settings, ArrowLeft, MessageCircle, Send,
  Loader2, Edit, AlertCircle, CheckCircle2, AlertTriangle, Info, Bot
} from 'lucide-react';

import { STANCE_CONFIG, VERDICT_CONFIG, DEFAULT_AGENTS, JUDGE_AGENT } from '@/lib/constants';
import { chatWithAgent } from '@/lib/openai';
import {
  getAgents,
  createConversation,
  getConversations,
  getConversation,
  addMessage,
  getMessages,
  updateConversation,
  DbAgent,
  DbConversation
} from '@/lib/supabase';
import SettingsDropdown from '@/components/SettingsDropdown';
import AgentCard from '@/components/AgentCard';
import EditAgentModal from '@/components/EditAgentModal';
import { AnalysisResult, Message, AgentReport } from '@/types';
import { translations, Language } from '@/lib/translations';


export default function Home() {
  const [input, setInput] = useState('');
  const [originalInput, setOriginalInput] = useState(''); // Store for Judge chat context
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [view, setView] = useState<'home' | 'analysis' | 'chat'>('home');
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sidebar state
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Settings state
  const [uiLanguage, setUiLanguage] = useState<Language>('ru');
  const [language, setLanguage] = useState('ru'); // Output language
  const [model, setModel] = useState('gpt-4o');
  const [theme, setTheme] = useState('system'); // 'light' | 'dark' | 'system'

  // Agents state
  const [agents, setAgents] = useState<DbAgent[]>([]);
  const [editingAgent, setEditingAgent] = useState<DbAgent | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedUiLang = localStorage.getItem('roundtable-ui-language');
    const savedLang = localStorage.getItem('roundtable-language');
    const savedModel = localStorage.getItem('roundtable-model');
    const savedTheme = localStorage.getItem('roundtable-theme');

    // Validate UI language
    if (savedUiLang && ['en', 'ru', 'ka'].includes(savedUiLang)) {
      setUiLanguage(savedUiLang as Language);
    }

    if (savedLang) setLanguage(savedLang);
    if (savedModel) setModel(savedModel);
    if (savedTheme) setTheme(savedTheme);
  }, []);

  // Translations
  const t = translations[uiLanguage];

  // Apply theme with system listener
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark = theme === 'dark' || (theme === 'system' && isSystemDark);

      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  // Load conversations and agents on mount
  useEffect(() => {
    loadConversations();
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const data = await getAgents();
      if (data && data.length > 0) {
        setAgents(data);
      } else {
        // Fallback to defaults if DB is empty (should not happen if initialized)
        // setAgents(DEFAULT_AGENTS);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

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
      setOriginalInput(input); // Save for Judge chat context
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
    setMessages([
      {
        id: 'init-insight',
        role: 'assistant',
        content: report.insights.join('\n\n'),
        conversation_id: currentConversationId || 'temp',
        created_at: new Date().toISOString()
      }
    ]);
    setView('chat');
  };

  const handleJudgeClick = () => {
    if (!result) return;
    setActiveAgent('judge');
    setMessages([
      {
        id: 'init-verdict',
        role: 'assistant',
        content: `${result.verdict.signal} — ${result.verdict.core_conflict}\n\n${result.verdict.reasoning}\n\nЗадайте мне вопросы о моём вердикте или попросите углубиться в конкретные аспекты.`,
        conversation_id: currentConversationId || 'temp',
        created_at: new Date().toISOString()
      }
    ]);
    setView('chat');
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !activeAgent) return;

    // Check if Judge needs context but doesn't have it
    if (activeAgent === 'judge' && !result) {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: '⚠️ Контекст анализа потерян. Пожалуйста, запустите новый анализ чтобы общаться с Судьёй.',
        conversation_id: currentConversationId || 'temp',
        created_at: new Date().toISOString()
      }]);
      return;
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      conversation_id: currentConversationId || 'temp',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      // Save user message to Supabase
      if (currentConversationId) {
        await addMessage(currentConversationId, 'user', chatInput, activeAgent || undefined);
      }

      // Build request body - add judgeContext if chatting with Judge
      const requestBody: Record<string, unknown> = {
        agentId: activeAgent,
        messages: [...messages, newUserMessage].map(m => ({ role: m.role, content: m.content })),
        language: 'ru'
      };

      // If chatting with Judge, include full context
      if (activeAgent === 'judge' && result) {
        requestBody.judgeContext = {
          originalInput,
          reports: result.agent_reports,
          verdict: result.verdict
        };
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const assistantResponse = data.response;

      // Save agent response to Supabase
      if (currentConversationId) {
        await addMessage(currentConversationId, 'assistant', assistantResponse, activeAgent || undefined);
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-response',
        role: 'assistant',
        content: assistantResponse,
        conversation_id: currentConversationId || 'temp',
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error(error);
      // Show error to user
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: `❌ Ошибка: ${error instanceof Error ? error.message : 'Не удалось получить ответ'}`,
        conversation_id: currentConversationId || 'temp',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleNewConversation = () => {
    setInput('');
    setResult(null);
    setActiveAgent(null);
    setMessages([]);
    setCurrentConversationId(null);
    setView('home');
    setSidebarOpen(false);
  };

  const getAgentConfig = (name: string) => {
    return DEFAULT_AGENTS.find(a => a.name === name) || DEFAULT_AGENTS[0];
  };

  // Handle selecting a conversation from history
  const handleSelectConversation = async (id: string) => {
    try {
      setSidebarOpen(false);
      const msgs = await getMessages(id);

      // Find analysis result
      const analysisMsg = msgs.find(m => m.metadata?.type === 'analysis_result');

      if (analysisMsg) {
        // Parse result from stringified content
        try {
          const data = JSON.parse(analysisMsg.content);
          setResult(data);
          setView('analysis');
        } catch (e) {
          console.error('Failed to parse analysis result:', e);
          setView('home');
        }
      } else {
        // Fallback: If no analysis result found, just go to home or maybe handle as chat?
        // For now, we assume analysis result exists for valid conversations
        setView('home');
      }

      // Find initial user input to populate
      const userMsg = msgs.find(m => m.role === 'user');
      if (userMsg) {
        setInput(userMsg.content);
        // Also update title if needed
      }

      setCurrentConversationId(id);
      // Reset active agent and chat messages when switching conversation
      setActiveAgent(null);
      setMessages(msgs.filter(m => m.role !== 'system') as Message[]);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  // Sidebar component
  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <History className="w-5 h-5" />
            {t.history}
          </h2>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded">
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
            {t.newAnalysis}
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t.noConversations}</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`w-full text-left p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${currentConversationId === conv.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800' : ''
                  }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{conv.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
      <div className="min-h-screen bg-white dark:bg-gray-950 flex">
        <Sidebar />

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex-1">
          {/* Mobile header */}
          <div className="lg:hidden p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="font-semibold text-gray-900 dark:text-gray-100">🏰 RoundTable</h1>
            </div>
            <SettingsDropdown
              uiLanguage={uiLanguage}
              language={language}
              model={model}
              theme={theme}
              onUiLanguageChange={(l) => { setUiLanguage(l); localStorage.setItem('roundtable-ui-language', l); }}
              onLanguageChange={(l) => { setLanguage(l); localStorage.setItem('roundtable-language', l); }}
              onModelChange={(m) => { setModel(m); localStorage.setItem('roundtable-model', m); }}
              onThemeChange={(t) => { setTheme(t); localStorage.setItem('roundtable-theme', t); }}
            />
          </div>

          {/* Desktop header */}
          <div className="hidden lg:flex items-center justify-end gap-2 p-4 border-b border-gray-200 dark:border-gray-800">
            <Link href="/agents" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <Edit className="w-4 h-4" />
              <span>{t.edit}</span>
            </Link>
            <SettingsDropdown
              uiLanguage={uiLanguage}
              language={language}
              model={model}
              theme={theme}
              onUiLanguageChange={(l) => { setUiLanguage(l); localStorage.setItem('roundtable-ui-language', l); }}
              onLanguageChange={(l) => { setLanguage(l); localStorage.setItem('roundtable-language', l); }}
              onModelChange={(m) => { setModel(m); localStorage.setItem('roundtable-model', m); }}
              onThemeChange={(t) => { setTheme(t); localStorage.setItem('roundtable-theme', t); }}
            />
          </div>

          <div className="max-w-3xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">🏰 RoundTable</h1>
              <p className="text-gray-500 dark:text-gray-400">{t.subtitle}</p>
            </div>

            {/* Input Area */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 mb-8">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t.describeIdea}
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.placeholder}
                className="w-full h-40 p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading || !input.trim()}
                className="mt-4 w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.analyzing}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {t.startAnalysis}
                  </>
                )}
              </button>
            </div>

            {/* Agents Grid */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t.roundTableTitle}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    id={agent.id}
                    name={agent.name}
                    description={agent.description}
                    emoji={agent.emoji}
                    imageUrl={agent.image_url}
                    onClick={() => setEditingAgent(agent)}
                  />
                ))}
              </div>

              {/* Edit Agent Modal */}
              {editingAgent && (
                <EditAgentModal
                  agent={editingAgent}
                  isOpen={!!editingAgent}
                  uiLanguage={uiLanguage}
                  onClose={() => setEditingAgent(null)}
                  onSave={loadAgents}
                />
              )}
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
      <div className="min-h-screen bg-white dark:bg-gray-950 flex">
        <Sidebar />

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex-1">
          <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Back button */}
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.newAnalysis}
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
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{result.verdict.confidence}%</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t.confidence}</div>
                </div>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{result.verdict.core_conflict}</p>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">📋 {t.actionPlan}</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {result.verdict.action_plan.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ol>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ⏱️ {result.execution_time_seconds.toFixed(1)}s | 🔄 {result.total_llm_calls} LLM calls
              </span>
              <button
                onClick={handleJudgeClick}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                {t.chatWithJudge || 'Chat with Judge'}
              </button>
            </div>
          </div>

          {/* Agent Reports */}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            🏰 {t.advisorsOpinions}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">{t.clickToChat}</span>
          </h2>
          <div className="space-y-3">
            {result.agent_reports.map((report) => {
              const agent = getAgentConfig(report.agent_name);
              const stanceConfig = STANCE_CONFIG[report.stance];
              return (
                <div
                  key={report.agent_name}
                  onClick={() => handleAgentClick(agent.id, report)}
                  className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{agent.emoji}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{report.agent_name}</span>
                        <span style={{ color: stanceConfig.color }}>{stanceConfig.emoji} {report.stance}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{t.risk}: {report.risk_score}%</span>
                      </div>
                      {report.insights.map((insight, i) => (
                        <p key={i} className="text-sm text-gray-600 dark:text-gray-400 mb-1">└─ {insight}</p>
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

    );
  }

  // CHAT VIEW
  if (view === 'chat' && activeAgent) {
    const agent = activeAgent === 'judge'
      ? JUDGE_AGENT
      : DEFAULT_AGENTS.find(a => a.id === activeAgent)!;

    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex">
        <Sidebar />

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('analysis')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-2xl">{agent.emoji}</span>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{agent.name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{agent.description}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder={t.askQuestion}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
