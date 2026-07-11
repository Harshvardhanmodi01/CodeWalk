import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

import { requireAuth } from '@/app/lib/auth-middleware';
import { sanitizeString } from '@/app/lib/validation';

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const body = await req.json().catch(() => ({}));
    const topic = sanitizeString(body.topic || 'General Technology');
    const difficulty = body.difficulty || 'mixed';
    const count = body.count || 8;

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are a professional technical and behavioral interviewer.
Your task is to generate exactly ${count} interview questions for the topic: "${topic}" with difficulty level: "${difficulty}".

You MUST determine the category of the topic:
1. Technical (e.g. Python, SQL, System Design):
   - category: "technical"
   - subcategory: one of: programming-languages, frontend, backend, databases, devops, cs-fundamentals
   - expected_answer format:
     {
       "ideal_explanation": "how a strong candidate should explain this code/concept",
       "key_concepts": ["term 1", "term 2"],
       "correct_approach": "what the right technical answer or reasoning is",
       "follow_up_if_struggle": "one suggested follow-up question to help candidate think deeper",
       "red_flags": ["indicator of weak answer 1", "indicator of weak answer 2"]
     }
2. Behavioral (e.g. Leadership, Teamwork, HR):
   - category: "behavioral"
   - subcategory: "behavioral"
   - expected_answer format:
     {
       "star_format": "Situation, Task, Action, Result framework ideal response guide",
       "key_phrases": ["phrase 1", "phrase 2"],
       "red_flags": ["red flag 1", "red flag 2"]
     }
3. Logical (e.g. Aptitude, Puzzles, Math):
   - category: "logical"
   - subcategory: "logical"
   - expected_answer format:
     {
       "correct_answer": "the direct correct answer key",
       "step_by_step": ["step 1 reasoning", "step 2 reasoning"],
       "common_mistakes": ["mistake 1", "mistake 2"],
       "time_guide_seconds": 120,
       "red_flags": ["logical fallacy 1", "logical fallacy 2"]
     }

If logical category, you can optionally include an "options" field (array of 4 strings e.g. ["A) Option A", "B) Option B", ...]) if it fits a multiple choice format. Otherwise "options" should be null. For other categories (technical/behavioral), "options" must be null.

Return a valid JSON object matching this schema:
{
  "questions": [
    {
      "question_text": "...",
      "code_snippet": "...", // optional code snippet if technical, otherwise empty string ""
      "file_path": "Question Bank",
      "line_start": 0,
      "line_end": 0,
      "difficulty": "easy" | "medium" | "hard",
      "category": "technical" | "behavioral" | "logical",
      "subcategory": "...",
      "expected_answer": { ... }, // matching the category selected above
      "options": null | ["A) ...", "B) ...", "C) ...", "D) ..."],
      "tags": ["tag1", "tag2"]
    }
  ]
}

Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON. All difficulty fields inside the questions must be strictly "easy", "medium", or "hard".`;

    const userPrompt = `Generate exactly ${count} questions for:
Topic: ${topic}
Target Difficulty: ${difficulty}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' }
    });

    const resultText = completion.choices?.[0]?.message?.content || '{"questions":[]}';
    const parsed = JSON.parse(resultText);

    return NextResponse.json({
      questions: (parsed.questions || []).slice(0, count)
    });

  } catch (err: any) {
    console.error('API topic-generate questions error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
