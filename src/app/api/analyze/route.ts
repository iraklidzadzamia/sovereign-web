import { NextRequest, NextResponse } from 'next/server';
import { runAllAgents, runJudge } from '@/lib/openai';

export async function POST(request: NextRequest) {
    try {
        const { input, language = 'ru', model = 'gpt-4o' } = await request.json();

        if (!input || typeof input !== 'string') {
            return NextResponse.json(
                { error: 'Input is required' },
                { status: 400 }
            );
        }

        const startTime = Date.now();

        // Run all agents in parallel
        const agentReports = await runAllAgents(input, language);

        // Run judge
        const verdict = await runJudge(agentReports, input, language);

        const executionTime = (Date.now() - startTime) / 1000;

        return NextResponse.json({
            agent_reports: agentReports,
            verdict,
            execution_time_seconds: executionTime,
            total_llm_calls: agentReports.length + 1,
        });
    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Analysis failed' },
            { status: 500 }
        );
    }
}
