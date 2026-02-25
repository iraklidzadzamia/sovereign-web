import { describe, it, expect } from 'vitest'
import { DEFAULT_AGENTS } from '@/lib/constants'

/**
 * Test: Seed agents data integrity
 * 
 * Validates that all default agents have required fields,
 * unique IDs, unique sort_orders, and meaningful prompt lengths.
 */

describe('Seed Agents Data Integrity', () => {
    it('has at least 5 agents', () => {
        expect(DEFAULT_AGENTS.length).toBeGreaterThanOrEqual(5)
    })

    it('every agent has all required fields', () => {
        for (const agent of DEFAULT_AGENTS) {
            expect(agent.id, `Agent missing id`).toBeTruthy()
            expect(agent.name, `Agent ${agent.id} missing name`).toBeTruthy()
            expect(agent.emoji, `Agent ${agent.id} missing emoji`).toBeTruthy()
            expect(agent.description, `Agent ${agent.id} missing description`).toBeTruthy()
            expect(agent.prompt, `Agent ${agent.id} missing prompt`).toBeTruthy()
        }
    })

    it('all agent IDs are unique', () => {
        const ids = DEFAULT_AGENTS.map(a => a.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it('sort_orders (if present) are unique', () => {
        const orders = DEFAULT_AGENTS
            .map(a => (a as any).sort_order)
            .filter(o => o !== undefined)
        if (orders.length > 0) {
            expect(new Set(orders).size).toBe(orders.length)
        }
    })

    it('every agent prompt is substantive (>50 chars)', () => {
        for (const agent of DEFAULT_AGENTS) {
            expect(
                agent.prompt.length,
                `Agent "${agent.name}" prompt too short (${agent.prompt.length} chars)`
            ).toBeGreaterThan(50)
        }
    })

    it('every agent name is non-empty and reasonable length', () => {
        for (const agent of DEFAULT_AGENTS) {
            expect(agent.name.length).toBeGreaterThan(0)
            expect(agent.name.length).toBeLessThan(50)
        }
    })

    it('every emoji is a single character or emoji', () => {
        for (const agent of DEFAULT_AGENTS) {
            // Emoji can be 1-2 code points (some are multi-byte)
            expect(
                [...agent.emoji].length,
                `Agent "${agent.name}" emoji "${agent.emoji}" should be a single emoji`
            ).toBeLessThanOrEqual(2)
        }
    })
})
