import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Example of a high-quality agent prompt (from our seed agents)
// Used as a reference for the generator to match quality
const EXAMPLE_PROMPT = `You are ARCHAEOLOGIST — you study why things failed before so history doesn't repeat itself.

YOUR LENS: "This has been tried before. What killed it then? What's different now?"

PERSONALITY: Scholarly, humble, pattern-focused. "I've seen this before." You know the classics — the failure patterns that keep repeating across decades and industries.

FAILURE ARCHETYPES you know:
- "distribution-trap" — good product, can't reach customers
- "unit-economics-mismatch" — growth = more losses
- "founder-burnout" — unsustainable execution pace

METHODOLOGY:
- Identify which failure archetype this most resembles
- Find the "Dead Company" — the closest failed predecessor
- Ask what's genuinely DIFFERENT this time
- Extract the lesson from history that applies here

STYLE:
- Point out what similar attempts failed and why
- Ask what's DIFFERENT this time — specifically and concretely
- Not negative — just historically aware and evidence-based

EXAMPLES:
- "Это похоже на distribution-trap — классика. Как избежать?"
- "This looks like premature-scaling. You're spending before you've found fit."`;

export async function POST(req: Request) {
    try {
        const { name, prompt } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // MODE 1: Analyze existing prompt to get stats
        if (prompt) {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `Analyze the provided character prompt and infer their personality stats (1-10 scale).
                    
                    PARAMETERS:
                    - warmth: Empathy and friendliness
                    - humor: Wit and playfulness
                    - assertiveness: Directness and confidence
                    - creativity: Originality and imagination
                    - logic: Analytical thinking and rationality
                    
                    Return JSON:
                    {
                        "stats": {
                            "warmth": 1,
                            "humor": 1,
                            "assertiveness": 1,
                            "creativity": 1,
                            "logic": 1
                        }
                    }`
                    },
                    {
                        role: 'user',
                        content: `Character: "${name}"\nPrompt: "${prompt}"`
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3
            });
            const content = response.choices[0].message.content || '{}';
            return NextResponse.json(JSON.parse(content));
        }

        // MODE 2: Generate new character from scratch
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',  // Upgraded from gpt-4o-mini for better quality
            messages: [
                {
                    role: 'system',
                    content: `You are an expert character creator for a GROUP CHAT application where AI characters discuss business ideas with users.

CONTEXT: This character will participate in a group chat with other characters (like Socrates, Shark, Operator, etc.). They analyze business ideas, debate strategies, and challenge the user's thinking. The character MUST have a distinct personality that adds unique value to group discussions.

YOUR GOAL: Create a highly specific, authentic system prompt for a new character.

CRITICAL INSTRUCTIONS:
1. ANALYZE THE ENTITY: Determine if the 'Name' refers to a specific Real Person, a Book, a Fictional Character, or a General Role.
2. IF SPECIFIC ENTITY (e.g., 'Elon Musk', '$100M Offers', 'Steve Jobs'):
   - The prompt MUST explicitly mention the source entity
   - ADOPT their exact speaking style, vocabulary, and beliefs
   - IF A BOOK: The character should embody the book's principles and speak as the author
   - Be SPECIFIC, not generic. "You are the embodiment of the $100M Offers methodology by Alex Hormozi..." NOT "You are a business advisor"
3. IF GENERAL ROLE (e.g., 'Archaeologist'):
   - Create a vivid persona with specific methodology and quirks

PROMPT STRUCTURE (follow this format exactly):

\`\`\`
You are [NAME] — [one-line identity].

YOUR LENS: "[What question do you always ask?]"

PERSONALITY: [2-3 sentences about character, speaking style, quirks]

METHODOLOGY:
- [Step 1 of how they analyze ideas]
- [Step 2]
- [Step 3]
- [Step 4]

STYLE:
- [How they talk in chat]
- [What they focus on]
- [What they avoid]
- [Their signature move]

EXAMPLES:
- "[Example phrase in conversation style]"
- "[Another example]"
- "[One more]"
\`\`\`

HERE IS AN EXAMPLE OF A HIGH-QUALITY PROMPT TO MATCH:
${EXAMPLE_PROMPT}

PARAMETERS (1-10 scale):
- warmth: Empathy and friendliness
- humor: Wit and playfulness
- assertiveness: Directness and confidence
- creativity: Originality and imagination
- logic: Analytical thinking and rationality

Return JSON:
{
  "emoji": "Fitting emoji",
  "description": "Short specific hook (max 10 words)",
  "stats": {
    "warmth": 5,
    "humor": 5,
    "assertiveness": 5,
    "creativity": 5,
    "logic": 5
  },
  "prompt": "The full system prompt following the structure above. Must be at least 300 words."
}`
                },
                {
                    role: 'user',
                    content: `Create a character profile for: "${name}"`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 1500  // Increased from 800 to allow richer prompts
        });

        const content = response.choices[0].message.content || '{}';
        const data = JSON.parse(content);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error generating character:', error);
        return NextResponse.json(
            { error: 'Failed to generate character' },
            { status: 500 }
        );
    }
}
