'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getAgents, updateAgent, createAgent, deleteAgent, DbAgent } from '@/lib/supabase';
import { translations, Language } from '@/lib/translations';

export default function AgentsPage() {
    const [agents, setAgents] = useState<DbAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [editingAgent, setEditingAgent] = useState<DbAgent | null>(null);
    const [uiLanguage, setUiLanguage] = useState<Language>('ru');

    const t = translations[uiLanguage];

    useEffect(() => {
        // Load language from localStorage (synced with main page)
        const savedLang = localStorage.getItem('roundtable-ui-language') as Language;
        if (savedLang && translations[savedLang]) {
            setUiLanguage(savedLang);
        }
        loadAgents();
    }, []);

    const loadAgents = async () => {
        try {
            const data = await getAgents();
            setAgents(data);
        } catch (error) {
            console.error('Failed to load agents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (agent: DbAgent) => {
        setSaving(agent.id);
        try {
            await updateAgent(agent.id, {
                name: agent.name,
                description: agent.description,
                emoji: agent.emoji,
                prompt: agent.prompt,
                image_url: agent.image_url,
            });
            setEditingAgent(null);
            loadAgents();
        } catch (error) {
            console.error('Failed to save agent:', error);
            alert(t.saveError);
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t.deleteAgentConfirm)) return;
        try {
            await deleteAgent(id);
            loadAgents();
        } catch (error) {
            console.error('Failed to delete agent:', error);
        }
    };

    const handleAddNew = async () => {
        try {
            const newAgent = await createAgent({
                name: 'New Agent',
                description: '...',
                emoji: '🤖',
                prompt: 'You are a helpful advisor...',
                sort_order: agents.length + 1,
            });
            setAgents([...agents, newAgent]);
            setEditingAgent(newAgent);
        } catch (error) {
            console.error('Failed to create agent:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">⚙️ {t.agentEditor}</h1>
                            <p className="text-sm text-gray-500">{t.agentEditorSubtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4" />
                        {t.addAgent}
                    </button>
                </div>

                {/* Agent List */}
                <div className="space-y-4">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                        >
                            {editingAgent?.id === agent.id ? (
                                // Edit mode
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="text"
                                            value={editingAgent.emoji}
                                            onChange={(e) => setEditingAgent({ ...editingAgent, emoji: e.target.value })}
                                            className="w-16 text-center text-2xl p-2 border rounded-lg"
                                            placeholder="🤖"
                                        />
                                        <input
                                            type="text"
                                            value={editingAgent.name}
                                            onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                                            className="flex-1 px-4 py-2 border rounded-lg font-medium"
                                            placeholder={t.agentNamePlaceholder}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={editingAgent.description}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, description: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg text-sm"
                                        placeholder={t.agentDescPlaceholder}
                                    />
                                    <textarea
                                        value={editingAgent.prompt}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, prompt: e.target.value })}
                                        className="w-full h-32 px-4 py-2 border rounded-lg text-sm font-mono"
                                        placeholder={t.agentPromptPlaceholder}
                                    />
                                    <input
                                        type="text"
                                        value={editingAgent.image_url || ''}
                                        onChange={(e) => setEditingAgent({ ...editingAgent, image_url: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg text-sm"
                                        placeholder={t.agentImagePlaceholder}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleSave(editingAgent)}
                                            disabled={saving === agent.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {saving === agent.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            {t.save}
                                        </button>
                                        <button
                                            onClick={() => setEditingAgent(null)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                                        >
                                            {t.cancel}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View mode
                                <div className="flex items-center gap-4">
                                    <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                                    <span className="text-2xl">{agent.emoji}</span>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">{agent.name}</div>
                                        <div className="text-sm text-gray-500">{agent.description}</div>
                                    </div>
                                    <button
                                        onClick={() => setEditingAgent(agent)}
                                        className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                    >
                                        {t.edit}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(agent.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {agents.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        {t.noAgents}
                    </div>
                )}
            </div>
        </div>
    );
}
