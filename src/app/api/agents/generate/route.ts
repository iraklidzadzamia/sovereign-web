import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'edge';

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
        // UPDATED LOGIC: Strict entity recognition for deeper personas
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert character creator and prompt engineer.
          
          YOUR GOAL: Create a highly specific, authentic system prompt for an AI agent based on the user's input NAME.
          
          CRITICAL INSTRUCTION:
          1. ANALYZE THE ENTITY: Determine if the 'Name' refers to a specific Real Person, a Book, a Fictional Character, or a General Role.
          2. IF IT IS A SPECIFIC ENTITY (e.g., 'Elon Musk', '100M Offers Book', 'Hitler', 'Steve Jobs'):
             - The System Prompt MUST explicitly mention the source material/person.
             - ADOPT the exact speaking style, vocabulary, and beliefs of that entity.
             - IF A BOOK: The character should act as the AUTHOR or the EMBODIMENT of the book's principles. (e.g. for '$100M Offers', act like Alex Hormozi, focus on 'Grand Slam Offers', 'Value Equation', etc.).
             - DO NOT generate generic descriptions like "financial expert". Be specific: "You are the embodiment of the $100M Offers methodology by Alex Hormozi..."
          3. IF IT IS A GENERAL ROLE (e.g., 'Archaeologist'):
             - Create a vivid, archetypal persona with specific quirks.
             
          PARAMETERS (1-10 scale):
          - warmth: Empathy and friendliness
          - humor: Wit and playfulness
          - assertiveness: Directness and confidence
          - creativity: Originality and imagination
          - logic: Analytical thinking and rationality
          
          Return JSON (valid JSON object):
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
            "prompt": "EXTREMELY DETAILED system prompt. Use the 'You are [Entity]...' format. Include key concepts, catchphrases, and behavioral rules specific to that entity."
          }`
                },
                {
                    role: 'user',
                    content: `Create character profile for: "${name}"`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 800
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
