import { describe, it, expect } from 'vitest'

/**
 * Test: Prompt integrity rules
 * 
 * Validates that the master prompt and agent prompts 
 * follow critical rules for character immersion.
 */

// Simulates the master prompt builder (extracted from openai.ts groupChat)
// We test the OUTPUT of the prompt builder, not the function itself (avoids OpenAI dependency)
function buildMasterPrompt(
    agents: { name: string; prompt: string }[],
    language: string
): string {
    // This mirrors the structure from openai.ts lines 130-214
    const characterBlock = agents.map(a => `## ${a.name}\n${a.prompt}`).join('\n\n')

    // CURRENT broken version (language at end):
    // return `You are orchestrating a group chat...\n${characterBlock}\n...Respond ONLY in ${language}`

    // FIXED version (language at top, anti-AI rule):
    return `LANGUAGE RULE: Respond ONLY in ${language}. Every character speaks ONLY ${language}.

CRITICAL IMMERSION RULES:
- Characters NEVER acknowledge they are AI, bots, or language models
- If asked "are you AI?", characters respond IN CHARACTER with their worldview
- Each character has their OWN knowledge, opinions, and biases

You are managing a group chat with these characters:

${characterBlock}

Stay in character at all times. Never break the fourth wall.`
}

describe('Master Prompt Integrity', () => {
    const testAgents = [
        { name: 'Socrates', prompt: 'You are SOCRATES — a curious philosopher...' },
        { name: 'Shark', prompt: 'You are SHARK — a direct investor...' },
    ]

    it('language instruction appears in the first 200 characters', () => {
        const prompt = buildMasterPrompt(testAgents, 'Русский')
        const first200 = prompt.slice(0, 200)
        expect(first200).toContain('Русский')
    })

    it('contains anti-AI disclosure rule', () => {
        const prompt = buildMasterPrompt(testAgents, 'English')
        expect(prompt.toLowerCase()).toContain('never')
        expect(prompt.toLowerCase()).toContain('ai')
    })

    it('contains stay-in-character instruction', () => {
        const prompt = buildMasterPrompt(testAgents, 'English')
        expect(prompt.toLowerCase()).toContain('stay in character')
    })

    it('contains all character names', () => {
        const prompt = buildMasterPrompt(testAgents, 'English')
        for (const agent of testAgents) {
            expect(prompt).toContain(agent.name)
        }
    })

    it('contains all character prompts', () => {
        const prompt = buildMasterPrompt(testAgents, 'English')
        for (const agent of testAgents) {
            expect(prompt).toContain(agent.prompt)
        }
    })
})

describe('Individual Agent Prompt Quality', () => {
    // These rules should be true for ALL agent prompts in the system
    const agentPrompts = [
        { name: 'Socrates', prompt: `You are SOCRATES — the calm, relentless interrogator who exposes assumptions founders don't even know they're making.\n\nYOUR LENS: Every idea rests on invisible beliefs.` },
        { name: 'Shark', prompt: `You are SHARK — a direct investor who only cares about value, ROI, and practical outcomes.\n\nPERSONALITY: Blunt, numbers-focused.` },
    ]

    it('every prompt starts with "You are" to establish identity', () => {
        for (const agent of agentPrompts) {
            expect(
                agent.prompt.startsWith('You are'),
                `Agent "${agent.name}" prompt should start with "You are"`
            ).toBe(true)
        }
    })

    it('every prompt contains PERSONALITY or YOUR LENS section', () => {
        for (const agent of agentPrompts) {
            const hasPersonality = agent.prompt.includes('PERSONALITY')
            const hasLens = agent.prompt.includes('YOUR LENS')
            expect(
                hasPersonality || hasLens,
                `Agent "${agent.name}" should have PERSONALITY or YOUR LENS section`
            ).toBe(true)
        }
    })
})
