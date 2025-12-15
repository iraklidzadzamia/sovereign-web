import { NextRequest, NextResponse } from 'next/server';
import { chatWithAgent, chatWithJudge } from '@/lib/openai';

export async function POST(request: NextRequest) {
    try {
        const { agentId, messages, language = 'ru', judgeContext } = await request.json();

        if (!agentId || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'agentId and messages are required' },
                { status: 400 }
            );
        }

        let response: string;

        // Special handling for Judge - needs full context
        if (agentId === 'judge' && judgeContext) {
            response = await chatWithJudge(messages, judgeContext, language);
        } else {
            response = await chatWithAgent(agentId, messages, language);
        }

        return NextResponse.json({ response });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Chat failed' },
            { status: 500 }
        );
    }
}
