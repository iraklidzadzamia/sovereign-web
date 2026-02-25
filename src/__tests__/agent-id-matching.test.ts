import { describe, it, expect } from 'vitest'

/**
 * Test: agent_id matching between save and load
 * 
 * BUG: Messages are saved with agent_id = character.toLowerCase() (e.g. "socrates")
 * but loaded with agents.find(a => a.id === m.agent_id) where a.id is a UUID.
 * This means old conversations lose character names and emojis.
 */

// Helper: simulates how agents look when loaded from Supabase
const mockAgents = [
    { id: 'uuid-111', name: 'Socrates', emoji: '🧠', description: 'Philosopher', prompt: '...' },
    { id: 'uuid-222', name: 'Shark', emoji: '🦈', description: 'Investor', prompt: '...' },
    { id: 'uuid-333', name: 'Futurist', emoji: '🔮', description: 'Futurist', prompt: '...' },
]

// This is how messages are SAVED (character name in lowercase)
const savedMessages = [
    { role: 'assistant', content: 'Hello', agent_id: 'socrates' },
    { role: 'assistant', content: 'Numbers!', agent_id: 'shark' },
    { role: 'user', content: 'My idea', agent_id: null },
]

// CURRENT broken logic (bug #7)
function findAgentBroken(agentId: string | null, agents: typeof mockAgents) {
    return agents.find(a => a.id === agentId)
}

// FIXED logic: match by name OR id
function findAgentFixed(agentId: string | null, agents: typeof mockAgents) {
    if (!agentId) return undefined
    return agents.find(a => a.id === agentId || a.name.toLowerCase() === agentId)
}

describe('Agent ID Matching', () => {
    it('BROKEN: find by UUID fails when agent_id is a name', () => {
        const agent = findAgentBroken('socrates', mockAgents)
        // This WILL be undefined — that's the bug
        expect(agent).toBeUndefined()
    })

    it('FIXED: find by name OR UUID works for name-based agent_id', () => {
        const agent = findAgentFixed('socrates', mockAgents)
        expect(agent).toBeDefined()
        expect(agent!.name).toBe('Socrates')
        expect(agent!.emoji).toBe('🧠')
    })

    it('FIXED: find by name OR UUID works for UUID-based agent_id', () => {
        const agent = findAgentFixed('uuid-222', mockAgents)
        expect(agent).toBeDefined()
        expect(agent!.name).toBe('Shark')
    })

    it('FIXED: returns undefined for null agent_id (user messages)', () => {
        const agent = findAgentFixed(null, mockAgents)
        expect(agent).toBeUndefined()
    })

    it('FIXED: find is case-insensitive', () => {
        const agent = findAgentFixed('shark', mockAgents)
        expect(agent).toBeDefined()
        expect(agent!.name).toBe('Shark')
    })

    it('All saved assistant messages should resolve to an agent', () => {
        const assistantMessages = savedMessages.filter(m => m.role === 'assistant')
        for (const msg of assistantMessages) {
            const agent = findAgentFixed(msg.agent_id, mockAgents)
            expect(agent, `agent_id "${msg.agent_id}" should match an agent`).toBeDefined()
        }
    })
})
