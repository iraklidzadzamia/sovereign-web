'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Sparkles, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { DbAgent } from '@/lib/supabase';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';

interface AgentEditorProps {
    agent?: DbAgent | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (agent: Partial<DbAgent>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

interface AgentStats {
    warmth: number;
    humor: number;
    assertiveness: number;
    creativity: number;
    logic: number;
}

export default function AgentEditor({ agent, isOpen, onClose, onSave, onDelete }: AgentEditorProps) {
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('');
    const [description, setDescription] = useState('');
    const [prompt, setPrompt] = useState('');
    const [stats, setStats] = useState<AgentStats>({
        warmth: 5,
        humor: 5,
        assertiveness: 5,
        creativity: 5,
        logic: 5
    });

    // UI States
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        if (agent) {
            setName(agent.name);
            setEmoji(agent.emoji);
            setDescription(agent.description);
            setPrompt(agent.prompt);

            if (agent.stats) {
                setStats(agent.stats);
            } else {
                // Only analyze if no stats in DB
                analyzeStats(agent.name, agent.prompt);
            }
        } else {
            setName('');
            setEmoji('👤');
            setDescription('');
            setPrompt('');
            setStats({ warmth: 5, humor: 5, assertiveness: 5, creativity: 5, logic: 5 });
        }
    }, [agent]);

    // Analyze existing prompt for stats
    const analyzeStats = async (agentName: string, agentPrompt: string) => {
        if (!agentPrompt) return;

        try {
            const response = await fetch('/api/agents/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: agentName, prompt: agentPrompt })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.stats) setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to analyze stats:', error);
        }
    };

    // Auto-generate details when name enters
    const generateDetails = async (inputName: string) => {
        if (!inputName.trim()) return;

        setGenerating(true);
        try {
            const response = await fetch('/api/agents/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: inputName })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.emoji) setEmoji(data.emoji);
                if (data.description) setDescription(data.description);
                if (data.prompt) setPrompt(data.prompt);
                if (data.stats) setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to generate agent details:', error);
        } finally {
            setGenerating(false);
        }
    };

    const handleNameBlur = () => {
        // Trigger if:
        // 1. New agent (no agent) and fields empty
        // 2. Existing agent and name changed
        if (name && !generating) {
            if (!agent && !description && !prompt) {
                generateDetails(name);
            } else if (agent && name.trim() !== agent.name.trim()) {
                generateDetails(name);
            }
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                ...agent,
                name,
                emoji,
                description,
                prompt,
                stats // Now saving stats to DB
            });
            onClose();
        } catch (error) {
            console.error('Failed to save agent:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!agent?.id || !onDelete) return;
        if (!confirm('Are you sure you want to remove this character?')) return;

        setLoading(true);
        try {
            await onDelete(agent.id);
            onClose();
        } catch (error) {
            console.error('Failed to delete agent:', error);
        } finally {
            setLoading(false);
        }
    };

    // Prepare data for Radar Chart
    const radarData = [
        { subject: 'Warmth', A: stats.warmth, fullMark: 10 },
        { subject: 'Humor', A: stats.humor, fullMark: 10 },
        { subject: 'Assertiveness', A: stats.assertiveness, fullMark: 10 },
        { subject: 'Logic', A: stats.logic, fullMark: 10 },
        { subject: 'Creativity', A: stats.creativity, fullMark: 10 },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 dark:border-gray-800">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {agent ? 'Edit Character' : 'New Character'}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name & Emoji */}
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onBlur={handleNameBlur}
                                        className="w-full px-4 py-2 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. Elon Musk"
                                        required
                                    />
                                    {generating && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                                        </div>
                                    )}
                                    {!generating && name && (
                                        <button
                                            type="button"
                                            onClick={() => generateDetails(name)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                            title="Auto-generate details"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="w-24 space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Emoji</label>
                                <input
                                    type="text"
                                    value={emoji}
                                    onChange={(e) => setEmoji(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-center text-xl"
                                    placeholder="🗿"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Short role description..."
                                required
                            />
                        </div>

                        {/* Personality Matrix (Radar Chart) */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 flex flex-col items-center">
                            <h3 className="w-full text-left font-medium text-gray-900 dark:text-gray-100 mb-2">
                                🧠 Personality Profile
                            </h3>
                            <div className="h-[250px] w-full max-w-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="#e5e7eb" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 10]} hide />
                                        <Radar
                                            name="Character"
                                            dataKey="A"
                                            stroke="#4f46e5"
                                            strokeWidth={2}
                                            fill="#6366f1"
                                            fillOpacity={0.5}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Advanced (System Prompt) */}
                        <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                                {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                Advanced: System Prompt
                            </button>

                            {showAdvanced && (
                                <div className="mt-2 animate-fade-in">
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[150px] font-mono text-sm leading-relaxed"
                                        placeholder="System prompt..."
                                        required
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                            {agent && onDelete ? (
                                <button type="button" onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            ) : <div></div>}

                            <div className="flex gap-3">
                                <button type="button" onClick={onClose} className="px-6 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
                                    {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Character</>}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
