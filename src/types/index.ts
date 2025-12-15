// Database types for The Sovereign Web
export interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    user_id?: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'agent';
    agent_name?: string;
    content: string;
    metadata?: MessageMetadata;
    created_at: string;
}

export interface MessageMetadata {
    stance?: 'YES' | 'NO' | 'MIXED';
    risk_score?: number;
    confidence?: number;
    signal?: 'GREEN' | 'YELLOW' | 'SOFT_RED' | 'HARD_RED';
}

export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    prompt: string;
    emoji: string;
}

// Analysis result types
export interface AgentReport {
    agent_name: string;
    stance: 'YES' | 'NO' | 'MIXED';
    insights: string[];
    risk_score: number;
    confidence: number;
}

export interface FinalVerdict {
    signal: 'GREEN' | 'YELLOW' | 'SOFT_RED' | 'HARD_RED';
    confidence: number;
    core_conflict: string;
    action_plan: string[];
    reasoning: string;
}

export interface AnalysisResult {
    preflight?: { valid: boolean; missing: string[] };
    agent_reports: AgentReport[];
    verdict: FinalVerdict;
    execution_time_seconds: number;
    total_llm_calls: number;
}
