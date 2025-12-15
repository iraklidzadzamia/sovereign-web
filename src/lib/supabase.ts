import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database operations
export interface DbConversation {
    id: string;
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

// Conversation operations
export async function createConversation(title: string, originalInput: string, language: string = 'ru') {
    const { data, error } = await supabase
        .from('conversations')
        .insert({ title, original_input: originalInput, language })
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

export async function createAgent(agent: Omit<DbAgent, 'created_at' | 'updated_at' | 'is_active'>) {
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
