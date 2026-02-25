'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Menu, X, Plus, History, Settings, Edit, Users,
  Pencil, Check, Trash2
} from 'lucide-react';

import {
  getAgents,
  createConversation,
  getConversations,
  addMessage,
  getMessages,
  updateConversation,
  updateAgent,
  createAgent,
  deleteAgent,
  DbAgent,
  DbConversation,
  UserProfile,
  getUserProfile,
  createBrowserSupabaseClient,
} from '@/lib/supabase';
import SettingsDropdown from '@/components/SettingsDropdown';
import ChatBubble from '@/components/ChatBubble';
import ChatInput, { ChatInputRef } from '@/components/ChatInput';
import TypingIndicator from '@/components/TypingIndicator';
import AgentEditor from '@/components/AgentEditor';
import PaywallBanner from '@/components/PaywallBanner';
import { translations, Language } from '@/lib/translations';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  character?: string;
  emoji?: string;
  timestamp?: string;
}

export default function Home() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [typingCharacter, setTypingCharacter] = useState<{ name: string; emoji: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  // Conversation state
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [hiddenConversations, setHiddenConversations] = useState<string[]>([]);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Settings state
  const [uiLanguage, setUiLanguage] = useState<Language>('ru');
  const [language, setLanguage] = useState('ru');
  const [theme, setTheme] = useState('system');
  const [model, setModel] = useState('gpt-4o');

  // Agents state
  const [agents, setAgents] = useState<DbAgent[]>([]);

  // Agent Editing State
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editingAgent, setEditingAgent] = useState<DbAgent | null>(null);
  const [showAgentEditor, setShowAgentEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');

  // Auth state
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [lastRespondents, setLastRespondents] = useState<string[]>([]);

  // Random placeholder logic
  const [placeholderText, setPlaceholderText] = useState('');

  // Localization map for default characters
  const CHARACTER_TRANSLATIONS: Record<string, Record<string, string>> = {
    'Elon Musk': { ru: 'Илон Маск', ka: 'ილონ მასკი' },
    'Socrates': { ru: 'Сократ', ka: 'სოკრატე' },
    'Donald Trump': { ru: 'Дональд Трамп', ka: 'დონალდ ტრამპი' },
    'Nietzsche': { ru: 'Ницше', ka: 'ნიცშე' },
    'Carl Jung': { ru: 'Карл Юнг', ka: 'კარლ იუნგი' },
    'Robert Kiyosaki': { ru: 'Роберт Кийосаки', ka: 'რობერტ კიიოსაკი' },
    'Doctor': { ru: 'Доктор', ka: 'ექიმი' },
    'Bible': { ru: 'Библия', ka: 'ბიბლია' },
    '$100M Offers': { ru: '$100M Offers', ka: '$100M Offers' },
    '48 Laws of Power': { ru: '48 Законов Власти', ka: 'ძალაუფლების 48 კანონი' },
  };

  // Locale map for timestamps (bug #10 fix)
  const LOCALE_MAP: Record<string, string> = {
    ru: 'ru-RU',
    en: 'en-US',
    ka: 'ka-GE',
    de: 'de-DE',
  };

  const getLocalizedName = (name: string) => {
    return CHARACTER_TRANSLATIONS[name]?.[uiLanguage] || name;
  };

  // Load settings from localStorage
  useEffect(() => {
    const savedUiLang = localStorage.getItem('roundtable-ui-language');
    const savedLang = localStorage.getItem('roundtable-language');
    const savedTheme = localStorage.getItem('roundtable-theme');
    const savedHidden = localStorage.getItem('roundtable-hidden-conversations');

    if (savedUiLang && ['en', 'ru', 'ka'].includes(savedUiLang)) {
      setUiLanguage(savedUiLang as Language);
    }
    if (savedLang) setLanguage(savedLang);
    if (savedTheme) setTheme(savedTheme);
    if (savedHidden) setHiddenConversations(JSON.parse(savedHidden));
  }, []);

  const t = translations[uiLanguage];

  // Apply theme
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

  // Load data on mount
  useEffect(() => {
    // Get current user session
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        getUserProfile(user.id).then(profile => {
          if (profile) setUserProfile(profile);
        });
      }
    });

    loadConversations();
    loadAgents();
  }, []);

  // Update placeholder on language change
  useEffect(() => {
    const t = translations[uiLanguage];
    if (t.placeholders && t.placeholders.length > 0) {
      setPlaceholderText(t.placeholders[Math.floor(Math.random() * t.placeholders.length)]);
    }
  }, [uiLanguage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAgents = async () => {
    try {
      const data = await getAgents();
      if (data && data.length > 0) {
        setAgents(data);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const handleSaveAgent = async (agentData: Partial<DbAgent>) => {
    try {
      if (editorMode === 'edit' && agentData.id) {
        await updateAgent(agentData.id, agentData);
      } else {
        await createAgent({
          name: agentData.name!,
          emoji: agentData.emoji!,
          description: agentData.description!,
          prompt: agentData.prompt!,
          sort_order: agents.length + 1,
          image_url: agentData.image_url ?? ''
        });
      }
      await loadAgents();
      setShowAgentEditor(false);
    } catch (error) {
      console.error('Failed to save agent:', error);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      await deleteAgent(id);
      await loadAgents();
      setShowAgentEditor(false);
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const openNewAgentEditor = () => {
    setEditorMode('create');
    setEditingAgent(null);
    setShowAgentEditor(true);
  };

  const openEditAgentEditor = (agent: DbAgent) => {
    setEditorMode('edit');
    setEditingAgent(agent);
    setShowAgentEditor(true);
  };

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const getAgentEmoji = (characterName: string): string => {
    const agent = agents.find(a => a.name === characterName);
    return agent?.emoji || '🤖';
  };

  // Insert @mention when clicking on a character chip
  const insertMention = (agentName: string) => {
    chatInputRef.current?.insertText(`@${agentName.toLowerCase()}`);
  };

  const handleSend = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    setLoading(true);

    // Create conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      try {
        const title = messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '');
        const conversation = await createConversation(title, messageText, language, userId || undefined);
        convId = conversation.id;
        setCurrentConversationId(convId);
        loadConversations();
      } catch (error) {
        console.error('Failed to create conversation:', error);
        setLoading(false);
        return;
      }
    }

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString(LOCALE_MAP[uiLanguage] || 'ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);

    // Save user message to Supabase
    try {
      await addMessage(convId, 'user', messageText);
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    // Build messages for API
    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
      character: m.character
    }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, language, model, conversationId: currentConversationId, lastRespondents }),
      });
      const data = await res.json();

      if (data.error) {
        if (data.error === 'limit_reached') {
          setLimitReached(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error);
      }

      // Add each character's response with staggered timing for realistic effect
      const responses = data.responses || [];

      // Track who responded for next round
      setLastRespondents(responses.map((r: { character: string }) => r.character));

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const emoji = getAgentEmoji(response.character);

        // Show typing indicator
        setTypingCharacter({ name: response.character, emoji });

        // Random delay between 800ms and 2500ms for realistic effect
        const baseDelay = i === 0 ? 800 : 1200;
        const randomExtra = Math.random() * 1500;
        await new Promise(resolve => setTimeout(resolve, baseDelay + randomExtra));

        // Hide typing indicator and add the message
        setTypingCharacter(null);

        const timestamp = new Date().toLocaleTimeString(LOCALE_MAP[uiLanguage] || 'ru-RU', { hour: '2-digit', minute: '2-digit' });
        const assistantMessage: Message = {
          id: Date.now().toString() + '-' + response.character,
          role: 'assistant',
          content: response.message,
          character: response.character,
          emoji,
          timestamp
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Save to Supabase (don't await to keep UI responsive)
        addMessage(convId!, 'assistant', response.message, response.character.toLowerCase())
          .catch(error => console.error('Failed to save assistant message:', error));

        // Small pause before next typing indicator (random variation)
        if (i < responses.length - 1 && Math.random() > 0.25) {
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        character: 'System',
        emoji: '⚠️',
        timestamp: new Date().toLocaleTimeString(LOCALE_MAP[uiLanguage] || 'ru-RU', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
      setTypingCharacter(null);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setLastRespondents([]);
    setSidebarOpen(false);
  };

  const handleSelectConversation = async (id: string) => {
    try {
      setSidebarOpen(false);
      const msgs = await getMessages(id);

      // Convert DB messages to UI format
      const uiMessages: Message[] = msgs
        .filter(m => m.role !== 'system')
        .map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          character: m.agent_id ? (agents.find(a => a.id === m.agent_id || a.name.toLowerCase() === m.agent_id))?.name : undefined,
          emoji: m.agent_id ? (agents.find(a => a.id === m.agent_id || a.name.toLowerCase() === m.agent_id))?.emoji : undefined,
          timestamp: new Date(m.created_at).toLocaleTimeString(LOCALE_MAP[uiLanguage] || 'ru-RU', { hour: '2-digit', minute: '2-digit' })
        }));

      setMessages(uiMessages);
      setCurrentConversationId(id);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleRenameConversation = async (id: string) => {
    if (!newTitle.trim()) return;
    try {
      await updateConversation(id, { title: newTitle });
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, title: newTitle } : c
      ));
      setEditingTitle(null);
      setNewTitle('');
    } catch (error) {
      console.error('Failed to rename:', error);
    }
  };

  const handleHideConversation = (id: string) => {
    const updated = [...hiddenConversations, id];
    setHiddenConversations(updated);
    localStorage.setItem('roundtable-hidden-conversations', JSON.stringify(updated));
    if (currentConversationId === id) {
      handleNewConversation();
    }
  };

  // Sidebar component
  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-r border-gray-100 dark:border-gray-800/50 shadow-[4px_0_24px_-8px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_24px_-8px_rgba(0,0,0,0.3)] transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
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
        <div className="p-4">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all duration-300 shadow-[0_4px_14px_0_rgba(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 font-medium"
          >
            <Plus className="w-5 h-5" />
            {t.newAnalysis}
          </button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {conversations.filter(c => !hiddenConversations.includes(c.id)).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t.noConversations}</p>
          ) : (
            conversations
              .filter(c => !hiddenConversations.includes(c.id))
              .map((conv) => (
                <div
                  key={conv.id}
                  className={`group relative p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${currentConversationId === conv.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800' : ''}`}
                >
                  {editingTitle === conv.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameConversation(conv.id)}
                        className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700"
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameConversation(conv.id)}
                        className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingTitle(null); setNewTitle(''); }}
                        className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        onClick={() => handleSelectConversation(conv.id)}
                        className="cursor-pointer"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate pr-16">{conv.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(conv.created_at).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingTitle(conv.id); setNewTitle(conv.title); }}
                          className="p-1 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleHideConversation(conv.id); }}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Hide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
          )}
        </div>

        {/* Characters info */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <Link
            href="/agents"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>{agents.length} {t.characters}</span>
            <Edit className="w-3 h-3 ml-auto" />
          </Link>
        </div>
      </div>
    </div>
  );

  // Welcome screen when no messages
  const WelcomeScreen = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-gray-50/30 dark:bg-transparent overflow-y-auto">

      {/* Header Section - Tightened margins for mobile */}
      <div className="flex flex-col items-center justify-center mb-5 sm:mb-8 mt-2 sm:mt-0">
        <div className="text-5xl sm:text-6xl mb-3 sm:mb-5 drop-shadow-sm">🏰</div>
        <h1 className="text-[2.25rem] sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-gray-50 mb-1 sm:mb-3">
          RoundTable
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-[280px] sm:max-w-md text-[13px] sm:text-base leading-snug">
          {t.subtitle}
        </p>
      </div>

      {/* Show agents - clickable to insert @mention OR edit 
          Uses a structured flex layout to wrap gracefully.
      */}
      <div className="flex flex-wrap justify-center content-center gap-2 sm:gap-3.5 mb-5 sm:mb-8 w-full max-w-[500px] sm:max-w-3xl relative px-1 sm:px-2">
        {agents.map(agent => (
          <button
            key={agent.id}
            onClick={() => isEditingMode ? openEditAgentEditor(agent) : insertMention(agent.name)}
            className={`flex items-center gap-2 sm:gap-3 pr-3.5 pl-2 sm:pr-6 sm:pl-3.5 py-1.5 sm:py-2.5 rounded-full text-[13px] sm:text-sm font-medium transition-all duration-300 cursor-pointer relative group flex-shrink-0 ${isEditingMode
              ? 'bg-indigo-50 dark:bg-[#18181b] ring-2 ring-indigo-500 hover:bg-indigo-100 dark:hover:bg-[#27272a]'
              : 'bg-white dark:bg-[#121212] border border-gray-100 dark:border-gray-800/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:border-indigo-100 dark:hover:border-indigo-900/50'
              }`}
            style={{ maxWidth: '100%' }} // Prevents blowout on tiny screens
          >
            <span className="text-[14px] sm:text-base bg-gray-50 dark:bg-gray-800/80 p-1 sm:p-1.5 rounded-full transform group-hover:scale-110 transition-transform flex-shrink-0 leading-none flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8">
              {agent.emoji}
            </span>
            <span className="text-gray-700 dark:text-gray-200 truncate pr-1 sm:pr-3">
              {getLocalizedName(agent.name)}
            </span>

            {/* The pencil is always in the DOM but hidden unless editing, preventing layout shifts */}
            <div className={`absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 transition-opacity duration-300 ${isEditingMode ? 'opacity-100' : 'opacity-0'}`}>
              <Pencil className="w-3.5 h-3.5 text-indigo-500 drop-shadow-sm" />
            </div>
          </button>
        ))}
      </div>

      {/* Add Character button row (separate from the main grid to avoid pushing elements) */}
      <div className={`flex justify-center h-10 sm:h-12 w-full transition-all duration-300 ${isEditingMode ? 'opacity-100 mb-6' : 'opacity-0 mb-0 overflow-hidden h-0'}`}>
        {isEditingMode && (
          <button
            onClick={openNewAgentEditor}
            className="flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-full text-[13px] sm:text-sm font-medium bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Character</span>
          </button>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col items-center mt-0 pb-2 sm:pb-0">
        <button
          onClick={() => setIsEditingMode(!isEditingMode)}
          className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 mb-3 sm:mb-4 rounded-full text-[13px] sm:text-sm font-medium transition-all duration-300 ${isEditingMode
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-600/30'
            : 'bg-white dark:bg-[#121212] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)] hover:border-gray-300 dark:hover:border-gray-700'
            }`}
        >
          {isEditingMode ? (
            <>
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t.doneEditing}
            </>
          ) : (
            <>
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t.customizeCharacters}
            </>
          )}
        </button>

        <p className="text-[12px] sm:text-sm text-gray-400 dark:text-gray-500 px-4">
          {t.startTyping}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#fafafa] dark:bg-[#0a0a0c] flex">
      <Sidebar />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col h-[100dvh]">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={handleNewConversation}
              className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              🏰 RoundTable
            </button>
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
            onLogout={async () => {
              const supabase = createBrowserSupabaseClient();
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
          />
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <div className="max-w-4xl mx-auto px-4 py-6">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  character={msg.character}
                  emoji={msg.emoji}
                  timestamp={msg.timestamp}
                  onCharacterClick={insertMention}
                />
              ))}
              {typingCharacter && (
                <TypingIndicator
                  character={typingCharacter.name}
                  emoji={typingCharacter.emoji}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input or Paywall */}
        {limitReached ? (
          <PaywallBanner
            messagesUsed={userProfile?.messages_used || 15}
            messagesLimit={userProfile?.messages_limit || 15}
            messageLimitReached={t.messageLimitReached}
            upgradeToPro={t.upgradeToPro}
          />
        ) : (
          <ChatInput
            ref={chatInputRef}
            onSend={handleSend}
            loading={loading}
            placeholder={placeholderText}
          />
        )}
      </div>
      <AgentEditor
        isOpen={showAgentEditor}
        onClose={() => setShowAgentEditor(false)}
        onSave={handleSaveAgent}
        onDelete={editorMode === 'edit' ? handleDeleteAgent : undefined}
        agent={editingAgent}
      />
    </div>
  );
}
