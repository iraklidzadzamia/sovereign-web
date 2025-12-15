import OpenAI from 'openai';
import { AgentReport, FinalVerdict } from '@/types';
import { DEFAULT_AGENTS } from './constants';

// Lazy initialization to avoid build errors without API key
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (!_openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

const MODEL = process.env.MODEL_PRIMARY || 'gpt-4o';
const LANGUAGE = process.env.OUTPUT_LANGUAGE || 'ru';

const LANGUAGE_NAMES: Record<string, string> = {
    ru: 'Русский',
    en: 'English',
    ka: 'ქართული',
    de: 'Deutsch',
};

function getLanguageInstruction(lang: string): string {
    const langName = LANGUAGE_NAMES[lang] || lang;
    return `\n\nIMPORTANT: Respond ONLY in ${langName} (${lang}). All text must be in ${langName}.`;
}

export async function runAgent(
    agentId: string,
    userInput: string,
    language: string = LANGUAGE
): Promise<AgentReport> {
    const agent = DEFAULT_AGENTS.find(a => a.id === agentId);
    if (!agent) throw new Error(`Unknown agent: ${agentId}`);

    const systemPrompt = agent.prompt + getLanguageInstruction(language);

    const userPrompt = `Analyze this business idea:

${userInput}

Provide your analysis as JSON with these fields:
- agent_name: "${agent.name}"
- stance: "YES" | "NO" | "MIXED"
- insights: [1-2 key insights as strings]
- risk_score: 0-100 (higher = more risky)
- confidence: 0-100 (your confidence in this assessment)

Be direct. No hedging. Give your honest assessment.`;

    const response = await getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 1000,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as AgentReport;
}

export async function runAllAgents(
    userInput: string,
    language: string = LANGUAGE
): Promise<AgentReport[]> {
    const promises = DEFAULT_AGENTS.map(agent =>
        runAgent(agent.id, userInput, language).catch(err => ({
            agent_name: agent.name,
            stance: 'MIXED' as const,
            insights: [`Error: ${err.message.slice(0, 100)}`],
            risk_score: 50,
            confidence: 0,
        }))
    );

    return Promise.all(promises);
}

export async function runJudge(
    reports: AgentReport[],
    userInput: string,
    language: string = LANGUAGE
): Promise<FinalVerdict> {
    const systemPrompt = `You are THE SUPREME JUDGE — the final decision-maker who synthesizes all perspectives.
Your role: Weigh all evidence, resolve conflicts, issue a binding verdict.

Verdicts:
- GREEN: Clear go. Proceed with confidence.
- YELLOW: Proceed, but address critical issues first.
- SOFT_RED: Major pivot required. Current form is flawed.
- HARD_RED: Kill this idea. Do not proceed.` + getLanguageInstruction(language);

    const summary = reports.map(r =>
        `${r.agent_name} (${r.stance}, Risk: ${r.risk_score}%): ${r.insights[0] || 'No insight'}`
    ).join('\n');

    const userPrompt = `=== AGENT REPORTS ===
${summary}

=== ORIGINAL IDEA ===
${userInput.slice(0, 1500)}

Based on all data above, issue your verdict.

Output JSON:
- signal: "GREEN" | "YELLOW" | "SOFT_RED" | "HARD_RED"
- confidence: 0-100
- core_conflict: the central issue (one sentence)
- action_plan: exactly 3 concrete action items
- reasoning: brief explanation (2-3 sentences)`;

    const response = await getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 1500,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content) as FinalVerdict;
}

export async function chatWithAgent(
    agentId: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    language: string = LANGUAGE
): Promise<string> {
    const agent = DEFAULT_AGENTS.find(a => a.id === agentId);
    if (!agent) throw new Error(`Unknown agent: ${agentId}`);

    const systemPrompt = agent.prompt + getLanguageInstruction(language) + `

You are now in a follow-up conversation. Continue advising based on your expertise.
Be concise but insightful. Ask clarifying questions if needed.`;

    const response = await getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        ],
        max_completion_tokens: 1000,
    });

    return response.choices[0].message.content || '';
}
