import { NextRequest, NextResponse } from 'next/server';
import { chatWithAgent } from '@/lib/openai';

export async function POST(request: NextRequest) {
    try {
        const { agentId, messages, language = 'ru' } = await request.json();

        if (!agentId || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'agentId and messages are required' },
                { status: 400 }
            );
        }

        const response = await chatWithAgent(agentId, messages, language);

        return NextResponse.json({ response });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Chat failed' },
            { status: 500 }
        );
    }
}
