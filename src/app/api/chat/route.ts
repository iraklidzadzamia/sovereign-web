import { NextRequest, NextResponse } from 'next/server';
import { groupChat, chatWithSingleAgent, type ChatMessage } from '@/lib/openai';
import { getAgents, DbAgent } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cost per 1M tokens (approximate, for logging purposes)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-5.2': { input: 5.00, output: 15.00 },
};

async function getAuthenticatedSupabase() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll() { /* read-only in route handlers */ },
            },
        }
    );
}

export async function POST(request: NextRequest) {
    try {
        const { messages, language = 'ru', targetAgent, model = 'gpt-4o', conversationId, lastRespondents } = await request.json();

        if (!Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'messages array is required' },
                { status: 400 }
            );
        }

        // Get authenticated Supabase client (carries user session for RLS)
        let userId: string | undefined;
        let authSupabase: Awaited<ReturnType<typeof getAuthenticatedSupabase>> | null = null;

        try {
            authSupabase = await getAuthenticatedSupabase();
            const { data: { user } } = await authSupabase.auth.getUser();
            userId = user?.id;
        } catch (e) {
            console.error('Auth check failed, proceeding without user:', e);
        }

        // Check usage limit for free users (using authenticated client for RLS)
        if (userId && authSupabase) {
            try {
                const { data: profile } = await authSupabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (profile && profile.plan === 'free' && profile.messages_used >= profile.messages_limit) {
                    return NextResponse.json({ error: 'limit_reached' }, { status: 403 });
                }
            } catch (e) {
                console.error('Profile check failed, proceeding:', e);
            }
        }

        // Load agents from Supabase (agents have public SELECT, so anon client works)
        const agents = await getAgents();

        if (!agents || agents.length === 0) {
            return NextResponse.json(
                { error: 'No agents found. Please seed agents first: POST /api/agents/seed' },
                { status: 500 }
            );
        }

        // Format messages for OpenAI
        const chatMessages: ChatMessage[] = messages.map((m: { role: string; content: string; character?: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            character: m.character
        }));

        let response: { character: string; message: string }[];
        let usage: { prompt_tokens: number; completion_tokens: number } | undefined;

        if (targetAgent) {
            const agent = agents.find((a: DbAgent) => a.id === targetAgent || a.name.toLowerCase() === targetAgent.toLowerCase());
            if (!agent) {
                return NextResponse.json(
                    { error: `Agent not found: ${targetAgent}` },
                    { status: 404 }
                );
            }
            const result = await chatWithSingleAgent(agent, chatMessages, language, model);
            response = [{ character: agent.name, message: result.text }];
            usage = result.usage;
        } else {
            const result = await groupChat(agents, chatMessages, language, model, lastRespondents);
            response = result.responses;
            usage = result.usage;
        }

        // Log usage and increment message count using AUTHENTICATED client (for RLS)
        if (userId && authSupabase && usage) {
            const costs = MODEL_COSTS[model] || MODEL_COSTS['gpt-4o'];
            const costUsd = (usage.prompt_tokens * costs.input + usage.completion_tokens * costs.output) / 1_000_000;

            // Increment messages_used via SECURITY DEFINER RPC (bypasses RLS)
            authSupabase.rpc('increment_messages_used', { user_id_input: userId }).then(({ error }) => {
                if (error) console.error('Failed to increment messages:', error);
            });

            // Log usage via authenticated client (RLS allows auth.uid() = user_id)
            if (conversationId) {
                authSupabase.from('usage_log').insert({
                    user_id: userId,
                    conversation_id: conversationId,
                    prompt_tokens: usage.prompt_tokens,
                    completion_tokens: usage.completion_tokens,
                    total_tokens: usage.prompt_tokens + usage.completion_tokens,
                    model,
                    cost_usd: costUsd,
                }).then(({ error }) => {
                    if (error) console.error('Failed to log usage:', error);
                });

                // Update totals in profile
                authSupabase.from('user_profiles')
                    .select('total_tokens_used, total_cost_usd')
                    .eq('id', userId)
                    .single()
                    .then(({ data: profile }) => {
                        if (profile) {
                            authSupabase!.from('user_profiles').update({
                                total_tokens_used: profile.total_tokens_used + usage!.prompt_tokens + usage!.completion_tokens,
                                total_cost_usd: profile.total_cost_usd + costUsd,
                                updated_at: new Date().toISOString(),
                            }).eq('id', userId!).then(({ error }) => {
                                if (error) console.error('Failed to update profile totals:', error);
                            });
                        }
                    });
            }
        }

        return NextResponse.json({ responses: response });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Chat failed' },
            { status: 500 }
        );
    }
}
