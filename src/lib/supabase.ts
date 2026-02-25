import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton browser client (carries user session cookies for RLS)
let browserClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
    if (typeof window !== 'undefined') {
        // Client-side: use browser client with auth cookies
        if (!browserClient) {
            browserClient = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
        }
        return browserClient;
    }
    // Server-side fallback (API routes should use supabase-server.ts instead)
    return createClient(supabaseUrl, supabaseAnonKey);
}

// Export for direct usage
export const supabase = typeof window !== 'undefined'
    ? createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey)
    : createClient(supabaseUrl, supabaseAnonKey);

// Browser client for 'use client' components (auth, signOut, etc.)
export function createBrowserSupabaseClient() {
    return getSupabase();
}

// Types for database operations
export interface DbConversation {
    id: string;
    user_id?: string;
    title: string;
    original_input: string;
    language: string;
    created_at: string;
    updated_at: string;
}

export interface DbMessage {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'agent' | 'system';
    agent_id?: string;
    content: string;
    metadata?: Record<string, unknown>;
    created_at: string;
}

export interface UserProfile {
    id: string;
    plan: 'free' | 'pro';
    messages_used: number;
    messages_limit: number;
    total_tokens_used: number;
    total_cost_usd: number;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    plan_expires_at?: string;
    created_at: string;
    updated_at: string;
}

// Conversation operations
export async function createConversation(title: string, originalInput: string, language: string = 'ru', userId?: string) {
    const { data, error } = await supabase
        .from('conversations')
        .insert({ title, original_input: originalInput, language, user_id: userId })
        .select()
        .single();

    if (error) throw error;
    return data as DbConversation;
}

export async function getConversations() {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as DbConversation[];
}

export async function getConversation(id: string) {
    const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as DbConversation;
}

export async function updateConversation(id: string, updates: Partial<DbConversation>) {
    const { data, error } = await supabase
        .from('conversations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as DbConversation;
}

// Message operations
export async function addMessage(
    conversationId: string,
    role: DbMessage['role'],
    content: string,
    agentId?: string,
    metadata?: Record<string, unknown>
) {
    const { data, error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            role,
            agent_id: agentId,
            content,
            metadata,
        })
        .select()
        .single();

    if (error) throw error;

    // Update conversation's updated_at
    await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    return data as DbMessage;
}

export async function getMessages(conversationId: string, agentId?: string) {
    let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (agentId) {
        query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as DbMessage[];
}

// Agent types and operations
export interface DbAgent {
    id: string;
    name: string;
    description: string;
    emoji: string;
    prompt: string;
    image_url?: string;
    stats?: {
        warmth: number;
        humor: number;
        assertiveness: number;
        creativity: number;
        logic: number;
    };
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export async function getAgents() {
    const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as DbAgent[];
}

export async function getAgent(id: string) {
    const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as DbAgent;
}

export async function updateAgent(id: string, updates: Partial<DbAgent>) {
    const { data, error } = await supabase
        .from('agents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as DbAgent;
}

export async function createAgent(agent: Omit<DbAgent, 'id' | 'created_at' | 'updated_at' | 'is_active'>) {
    const { data, error } = await supabase
        .from('agents')
        .insert(agent)
        .select()
        .single();

    if (error) throw error;
    return data as DbAgent;
}

export async function deleteAgent(id: string) {
    const { error } = await supabase
        .from('agents')
        .update({ is_active: false })
        .eq('id', id);

    if (error) throw error;
}

// User profile operations
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) return null;
    return data as UserProfile;
}

export async function incrementMessagesUsed(userId: string) {
    const { error } = await supabase.rpc('increment_messages_used', { user_id_input: userId });
    if (error) {
        // Fallback: direct update if RPC not available
        const profile = await getUserProfile(userId);
        if (profile) {
            await supabase
                .from('user_profiles')
                .update({ messages_used: profile.messages_used + 1, updated_at: new Date().toISOString() })
                .eq('id', userId);
        }
    }
}

export async function logUsage(
    userId: string,
    conversationId: string,
    promptTokens: number,
    completionTokens: number,
    model: string,
    costUsd: number
) {
    const { error } = await supabase
        .from('usage_log')
        .insert({
            user_id: userId,
            conversation_id: conversationId,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
            model,
            cost_usd: costUsd,
        });

    if (error) console.error('Failed to log usage:', error);

    // Update totals in profile
    const profile = await getUserProfile(userId);
    if (profile) {
        await supabase
            .from('user_profiles')
            .update({
                total_tokens_used: profile.total_tokens_used + promptTokens + completionTokens,
                total_cost_usd: profile.total_cost_usd + costUsd,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
    }
}
