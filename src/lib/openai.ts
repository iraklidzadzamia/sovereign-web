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

    // Build structured summary with full report data (not just insights[0])
    const structuredReports = reports.map(r => {
        const rAny = r as unknown as Record<string, unknown>;
        const report: Record<string, unknown> = {
            agent: r.agent_name,
            stance: r.stance,
            risk_score: r.risk_score,
            one_liner: rAny.one_liner || r.insights[0] || 'No summary',
            insights: r.insights,
        };
        // Include optional fields if they exist
        if (rAny.assumptions) {
            report.assumptions = rAny.assumptions;
        }
        if (rAny.unknowns) {
            report.unknowns = rAny.unknowns;
        }
        if (rAny.next_step) {
            report.next_step = rAny.next_step;
        }
        return report;
    });

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
