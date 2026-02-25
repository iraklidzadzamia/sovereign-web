import { describe, it, expect } from 'vitest'

/**
 * Test: Summary cache should not collide between different conversations
 * 
 * BUG: Cache key = first 50 chars of first 3 messages.
 * Different conversations starting with same text share a summary.
 */

// Simulate the BROKEN cache key logic
function brokenCacheKey(messages: { content: string }[]): string {
    return messages.slice(0, 3).map(m => m.content.slice(0, 50)).join('|')
}

// FIXED cache key: includes conversationId
function fixedCacheKey(conversationId: string, messages: { content: string }[]): string {
    return `${conversationId}:${messages.slice(0, 3).map(m => m.content.slice(0, 50)).join('|')}`
}

describe('Summary Cache Keys', () => {
    const conv1Messages = [
        { content: 'I want to build an app for food delivery in Tbilisi' },
        { content: 'Interesting idea! Tell me more about your target audience.' },
        { content: 'Young professionals aged 25-35 who order food online.' },
    ]

    const conv2Messages = [
        { content: 'I want to build an app for food delivery in Tbilisi' },
        { content: 'Interesting idea! Tell me more about your target audience.' },
        { content: 'Young professionals aged 25-35 who order food online.' },
    ]

    it('BROKEN: same-start conversations produce same cache key', () => {
        const key1 = brokenCacheKey(conv1Messages)
        const key2 = brokenCacheKey(conv2Messages)
        // This WILL match — that's the bug
        expect(key1).toBe(key2)
    })

    it('FIXED: different conversations produce different cache keys', () => {
        const key1 = fixedCacheKey('conv-uuid-111', conv1Messages)
        const key2 = fixedCacheKey('conv-uuid-222', conv2Messages)
        expect(key1).not.toBe(key2)
    })

    it('FIXED: same conversation produces same cache key', () => {
        const key1 = fixedCacheKey('conv-uuid-111', conv1Messages)
        const key2 = fixedCacheKey('conv-uuid-111', conv1Messages)
        expect(key1).toBe(key2)
    })
})
