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

    const userPrompt = `Analyze this business idea through your specific lens:

${userInput}

OUTPUT — Return ONLY valid JSON matching this exact schema:
{
  "agent_name": "${agent.name}",
  "stance": "YES" | "NO" | "MIXED",
  "risk_score": 0-100,
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "one_liner": "your verdict in one sentence",
  "insights": ["3-5 specific bullets, no generic advice"],
  "assumptions": ["1-3 things that MUST be true for this to work"],
  "unknowns": ["1-3 questions you cannot answer with given info"],
  "next_step": "one concrete action doable within 48 hours"
}

RULES:
- Do not include any keys not listed above.
- All array values must be strings.
- Be concise. If uncertain, say so under unknowns — do not hedge in other fields.`;

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
    const raw = JSON.parse(content);

    // Helper to ensure array contains only strings
    const toStringArray = (arr: unknown, max: number): string[] => {
        if (!Array.isArray(arr)) return [];
        return arr.filter((x): x is string => typeof x === 'string').slice(0, max);
    };

    // Validate and normalize the response
    return {
        agent_name: agent.name, // Never trust model for this - we know the agent
        stance: ['YES', 'NO', 'MIXED'].includes(raw.stance) ? raw.stance : 'MIXED',
        risk_score: typeof raw.risk_score === 'number' ? Math.min(100, Math.max(0, raw.risk_score)) : 50,
        confidence: ['LOW', 'MEDIUM', 'HIGH'].includes(raw.confidence) ? raw.confidence : 'MEDIUM',
        one_liner: typeof raw.one_liner === 'string' && raw.one_liner
            ? raw.one_liner
            : toStringArray(raw.insights, 1)[0] || 'No summary provided',
        insights: toStringArray(raw.insights, 5),
        assumptions: toStringArray(raw.assumptions, 3).length > 0 ? toStringArray(raw.assumptions, 3) : undefined,
        unknowns: toStringArray(raw.unknowns, 3).length > 0 ? toStringArray(raw.unknowns, 3) : undefined,
        next_step: typeof raw.next_step === 'string' ? raw.next_step : undefined,
    };
}

export async function runAllAgents(
    userInput: string,
    language: string = LANGUAGE
): Promise<AgentReport[]> {
    const promises = DEFAULT_AGENTS.map(agent =>
        runAgent(agent.id, userInput, language).catch(err => ({
            agent_name: agent.name,
            stance: 'MIXED' as const,
            risk_score: 50,
            confidence: 'LOW' as const,
            one_liner: `Error: ${err.message.slice(0, 100)}`,
            insights: [`Analysis failed: ${err.message.slice(0, 100)}`],
        }))
    );

    return Promise.all(promises);
}

export async function runJudge(
    reports: AgentReport[],
    userInput: string,
    language: string = LANGUAGE
): Promise<FinalVerdict> {
    const systemPrompt = `You are THE SUPREME JUDGE — final synthesizer of all 10 advisor perspectives. Your job is to deliver a verdict based on evidence, not vibes.

YOUR LENS: "What is the best decision under uncertainty?"

METHODOLOGY — Synthesis process:
1. Identify the STRONGEST argument FOR this idea (cite which advisor)
2. Identify the STRONGEST concern AGAINST this idea (cite which advisor)
3. Extract top 3 CONSENSUS points (themes repeated across advisors)
4. Extract top 2 CONFLICTS (where advisors disagree) and name what data would resolve it
5. Apply JUDGMENT — which concerns are fatal vs. mitigatable?

SIGNAL DEFINITIONS:
- 🟢 GREEN: No fatal risks. Assumptions testable. Upside outweighs downside. "Proceed with confidence."
- 🟡 YELLOW: Potentially viable, but 2-3 key unknowns MUST be resolved first. "Proceed with caution."
- 🟠 SOFT_RED: Current form is flawed. Requires major pivot (customer/offer/distribution/model). "Rethink before proceeding." Name the single pivot that could move this to YELLOW.
- 🔴 HARD_RED: Fatal issues with no realistic mitigation (illegal, unworkable economics, blocked distribution). "Do not proceed."

CRITICAL RULES:
- Do NOT invent facts to resolve conflicts
- If evidence is insufficient, choose YELLOW and list what's missing
- This is NOT a moral verdict — it's "readiness to proceed given current info"
- If SOFT_RED or HARD_RED, you MUST name what pivot could change the verdict

PERSONALITY: Decisive but transparent. No theatrics. Evidence-based.` + getLanguageInstruction(language);

    // Build structured summary with full report data
    const structuredReports = reports.map(r => ({
        agent: r.agent_name,
        stance: r.stance,
        risk_score: r.risk_score,
        confidence: r.confidence,
        one_liner: r.one_liner,
        insights: r.insights,
        assumptions: r.assumptions,
        unknowns: r.unknowns,
        next_step: r.next_step,
    }));

    const userPrompt = `=== ORIGINAL IDEA ===
${userInput.slice(0, 1500)}

=== 10 ADVISOR REPORTS (full data) ===
${JSON.stringify(structuredReports, null, 2)}

Based on all data above, synthesize and issue your verdict.

OUTPUT — Return ONLY valid JSON:
{
  "signal": "GREEN" | "YELLOW" | "SOFT_RED" | "HARD_RED",
  "confidence": 0-100,
  "core_conflict": "the central issue in one sentence",
  "deciding_factor": "what tipped the scales",
  "action_plan": ["exactly 3 concrete, reversible steps"],
  "reasoning": "2-4 sentences citing advisors by name",
  "dissent_note": "if any strong minority view exists, state it; otherwise 'None'"
}`;

    const response = await getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 2000,
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
