import { NextRequest, NextResponse } from 'next/server';
import { groupChat, chatWithSingleAgent, type ChatMessage } from '@/lib/openai';
import { getAgents, DbAgent } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { messages, language = 'ru', targetAgent } = await request.json();

        if (!Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'messages array is required' },
                { status: 400 }
            );
        }

        // Load agents from Supabase
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

        if (targetAgent) {
            // 1-on-1 mode: only the specified agent responds
            const agent = agents.find(a => a.id === targetAgent || a.name.toLowerCase() === targetAgent.toLowerCase());
            if (!agent) {
                return NextResponse.json(
                    { error: `Agent not found: ${targetAgent}` },
                    { status: 404 }
                );
            }
            const singleResponse = await chatWithSingleAgent(agent, chatMessages, language);
            response = [{ character: agent.name, message: singleResponse }];
        } else {
            // Group chat mode: multiple agents respond
            response = await groupChat(agents, chatMessages, language);
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
