import OpenAI from 'openai';
import { DbAgent } from './supabase';

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
const SUMMARIZE_MODEL = 'gpt-4o-mini'; // Cheaper model for summarization

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

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    character?: string; // For assistant messages, which character said it
}

interface CharacterResponse {
    character: string;
    message: string;
}

// Cache for conversation summaries
const summaryCache = new Map<string, string>();

/**
 * Summarize old messages to save context space
 * Uses cheaper model for summarization
 */
async function summarizeOldMessages(
    messages: ChatMessage[],
    language: string
): Promise<string> {
    // Create cache key from first few messages
    const cacheKey = messages.slice(0, 3).map(m => m.content.slice(0, 50)).join('|');

    if (summaryCache.has(cacheKey)) {
        console.log('Using cached summary');
        return summaryCache.get(cacheKey)!;
    }

    const historyText = messages.map(m => {
        if (m.role === 'user') {
            return `User: ${m.content}`;
        } else {
            return `${m.character || 'Assistant'}: ${m.content}`;
        }
    }).join('\n');

    const response = await getOpenAI().chat.completions.create({
        model: SUMMARIZE_MODEL,
        messages: [
            {
                role: 'system',
                content: `Summarize this conversation in 2-3 sentences. Focus on:
- Main topics discussed
- Key decisions or conclusions
- Important context for continuing the conversation

Keep it brief and in ${LANGUAGE_NAMES[language] || language}.`
            },
            { role: 'user', content: historyText }
        ],
        max_completion_tokens: 200,
    });

    const summary = response.choices[0].message.content || '';

    // Cache the result
    summaryCache.set(cacheKey, summary);

    console.log('Generated summary:', summary.substring(0, 100));
    return summary;
}

/**
 * Prepare conversation history with optional summarization
 * If history > 25 messages: summarize first part, keep last 20 full
 */
async function prepareHistoryContext(
    messages: ChatMessage[],
    language: string
): Promise<string> {
    const FULL_HISTORY_LIMIT = 20;
    const SUMMARIZE_THRESHOLD = 25;

    // Exclude last message (will be sent separately as current user message)
    const historyMessages = messages.slice(0, -1);

    if (historyMessages.length <= SUMMARIZE_THRESHOLD) {
        // Short history - use full messages
        return formatChatHistory(historyMessages);
    }

    // Long history - summarize old part
    const oldMessages = historyMessages.slice(0, -FULL_HISTORY_LIMIT);
    const recentMessages = historyMessages.slice(-FULL_HISTORY_LIMIT);

    console.log(`Summarizing ${oldMessages.length} old messages, keeping ${recentMessages.length} recent`);

    const summary = await summarizeOldMessages(oldMessages, language);
    const recentHistory = formatChatHistory(recentMessages);

    return `[Earlier conversation summary: ${summary}]\n\n${recentHistory}`;
}

/**
 * Build the master system prompt that orchestrates all characters
 */
function buildMasterPrompt(agents: DbAgent[], language: string): string {
    const characterDescriptions = agents.map(agent =>
        `### ${agent.name} (${agent.emoji})
${agent.prompt}`
    ).join('\n\n');

    const characterNames = agents.map(a => a.name).join(', ');

    return `You are orchestrating a group chat with ${agents.length} unique characters: ${characterNames}.

## CHARACTERS:

${characterDescriptions}

## CRITICAL: DETECT USER INTENT FIRST

Before generating responses, you MUST analyze the user's message to detect their INTENT.

### 1-ON-1 MODE — ONLY ONE character responds

**Detect 1-on-1 when user:**
- Addresses a character BY NAME (any language/spelling): "Сократ,", "sokrat", "hey Shark", "Шарк", "оператор"
- Asks a character DIRECTLY: "что ты думаешь, Сократ?", "Shark what's your take?", "как думаешь sokrat"
- Uses phrases suggesting private talk: "давай поговорим", "let's talk", "хочу спросить тебя", "поговорим"
- Continues a conversation with ONE character from context

**Name variations to recognize:**
- Socrates = Сократ, sokrat, сократа
- Shark = Шарк, акула
- Operator = Оператор
- Guardian = Хранитель, гардиан
- Futurist = Футурист
- Skeptic = Скептик
- Storyteller = Рассказчик
- Archaeologist = Археолог
- Black Swan = Чёрный лебедь, лебедь
- Broker = Брокер

**IF 1-ON-1 DETECTED: Return ONLY that one character's response. This is mandatory.**

### GROUP MODE — 2-5 characters respond

**Use group mode when:**
- User asks a general question to everyone
- No specific character is addressed
- New topic without addressing anyone

**SMART CONTEXT RULE:**
If user sends a message without addressing anyone specific (like "kstati pro dengi" or "а что насчёт..."), look at WHO RESPONDED in the last 3-5 messages. Those characters should respond again, as they are part of the ongoing conversation. Don't randomly bring in new characters unless the topic changed significantly.

### CLARIFY MODE — Judge asks for clarification (RARE)

**Use clarify mode ONLY when:**
- Intent is genuinely ambiguous and could go either way
- You cannot determine from context who should respond
- Important decision that user should make explicitly

Return:
{"mode": "clarify", "clarification_question": "Ты хочешь спросить [X и Y] или всю группу?", "responses": []}

**IMPORTANT: Use clarify mode VERY RARELY. Most cases can be inferred from context.**

## OUTPUT FORMAT

You MUST return valid JSON:

{
  "mode": "1-on-1" | "group" | "clarify",
  "target": "CharacterName" | null,
  "clarification_question": "..." | null,
  "responses": [
    {"character": "CharacterName", "message": "Their response..."}
  ]
}

## RULES

1. **Intent over keywords**: Understand WHAT the user wants, detect the intent
2. **Strict 1-on-1**: If you detect 1-on-1 intent, return ONLY that character. No exceptions.
3. **Smart context**: If no addressee, recent responders continue the conversation
4. **Natural chat**: Keep responses 1-3 sentences, like real messaging
5. **Stay in character**: Each character has a unique voice
6. **Match language**: Respond in user's language
7. **Clarify rarely**: Only when genuinely ambiguous` + getLanguageInstruction(language);
}

/**
 * Format chat history for the context window
 */
function formatChatHistory(messages: ChatMessage[]): string {
    return messages.map(m => {
        if (m.role === 'user') {
            return `User: ${m.content}`;
        } else {
            return `${m.character || 'Assistant'}: ${m.content}`;
        }
    }).join('\n\n');
}

/**
 * Main group chat function - single GPT call with intent detection in prompt
 */
export async function groupChat(
    agents: DbAgent[],
    messages: ChatMessage[],
    language: string = 'ru'
): Promise<CharacterResponse[]> {
    if (messages.length === 0) {
        return [];
    }

    const lastUserMessage = messages[messages.length - 1];

    // Build master prompt with intent detection built-in
    const systemPrompt = buildMasterPrompt(agents, language);

    // Prepare history with summarization for long conversations
    const historyContext = await prepareHistoryContext(messages, language);

    const userPrompt = historyContext
        ? `Previous conversation:\n${historyContext}\n\nNow the user says:\n${lastUserMessage.content}`
        : `The user starts the conversation with:\n${lastUserMessage.content}`;

    console.log('Calling OpenAI with prompt length:', systemPrompt.length + userPrompt.length);

    // Retry logic for OpenAI calls
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
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
            console.log('OpenAI raw response:', content.substring(0, 500));

            // Parse the response
            const parsed = JSON.parse(content);
            console.log('Parsed - mode:', parsed.mode, 'target:', parsed.target);

            // Handle various response formats
            let responses: unknown[];
            if (Array.isArray(parsed)) {
                responses = parsed;
            } else if (parsed.responses && Array.isArray(parsed.responses)) {
                responses = parsed.responses;
            } else if (parsed.characters && Array.isArray(parsed.characters)) {
                responses = parsed.characters;
            } else {
                const keys = Object.keys(parsed);
                if (parsed.character && parsed.message) {
                    responses = [parsed];
                } else {
                    const arrayKey = keys.find(k => Array.isArray(parsed[k]));
                    if (arrayKey) {
                        responses = parsed[arrayKey];
                    } else {
                        console.log('Unexpected response format:', JSON.stringify(parsed).substring(0, 200));
                        responses = [];
                    }
                }
            }

            console.log('Found responses count:', responses.length);

            // Validate and normalize responses
            let validated = responses
                .filter((r: unknown): r is CharacterResponse =>
                    r !== null &&
                    typeof r === 'object' &&
                    'character' in r &&
                    'message' in r &&
                    typeof (r as CharacterResponse).character === 'string' &&
                    typeof (r as CharacterResponse).message === 'string'
                )
                .map((r: CharacterResponse) => ({
                    character: r.character,
                    message: r.message
                }));

            // 1-ON-1 VALIDATION: If mode is 1-on-1 but we got multiple responses, keep only first
            if (parsed.mode === '1-on-1' && validated.length > 1) {
                console.log('1-on-1 mode but got multiple responses, keeping only first');
                validated = [validated[0]];
            }

            console.log('Final responses count:', validated.length);
            return validated;

        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            console.error(`Attempt ${attempt + 1} failed:`, lastError.message);

            // Wait before retry
            if (attempt < 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // All retries failed
    console.error('All retry attempts failed:', lastError);
    return [{
        character: 'System',
        message: 'Sorry, I had trouble generating responses. Please try again.'
    }];
}

/**
 * Chat with a single agent in 1-on-1 mode (backup, now mainly handled by LLM)
 */
export async function chatWithSingleAgent(
    agent: DbAgent,
    messages: ChatMessage[],
    language: string = 'ru'
): Promise<string> {
    const systemPrompt = agent.prompt + `

You are now in a direct conversation. Respond naturally as ${agent.name}.
Be concise but insightful. Stay in character.` + getLanguageInstruction(language);

    const formattedMessages = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
    }));

    const response = await getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            ...formattedMessages,
        ],
        max_completion_tokens: 1000,
    });

    return response.choices[0].message.content || '';
}

// Legacy exports for backward compatibility during migration
export { getOpenAI };
