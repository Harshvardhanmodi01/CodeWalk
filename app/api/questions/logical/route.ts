import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

import { requireAuth } from '@/app/lib/auth-middleware';

export async function POST(req: Request) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const body = await req.json().catch(() => ({}));
    const count = body.count || 15;

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are a cognitive screener creating aptitude tests.
Generate exactly ${count} logical reasoning and aptitude questions.

The questions should be split proportionately across these categories:
1. Number Series (numerical sequences requiring mathematical deduction)
2. Pattern/Sequence Recognition (abstract pattern or sequence relations)
3. Logical Deduction (propositional logic: 'if A then B' or syllogisms)
4. Situational Judgement (work-related cognitive dilemmas requiring a logical course of action)
5. Verbal Reasoning (critical reading analysis and deduction)

For categories that have standard solutions (like Number Series, Pattern Recognition, Logical Deduction), provide exactly 4 multiple-choice options in the "options" field (e.g., ["A) 144", "B) 156", "C) 168", "D) 180"]).
For open-ended categories (like Verbal Reasoning or Situational Judgement), provide null or an empty array in the "options" field.

Return a valid JSON object matching this schema:
{
  "questions": [
    {
      "question_text": "Find the next number in the sequence: 2, 4, 8, 16, ...",
      "code_snippet": "",
      "file_path": "Logical",
      "line_start": 0,
      "line_end": 0,
      "difficulty": "easy" | "medium" | "hard",
      "category": "number-series" | "pattern-recognition" | "logical-deduction" | "situational-judgement" | "verbal-reasoning",
      "why_asked": "Tests geometric sequence multiplication recognition.",
      "expected_answer": {
        "correct_answer": "The correct option or open-ended answer description.",
        "step_by_step": ["Step 1 explanation", "Step 2 explanation"],
        "common_mistakes": ["common mistake 1", "common mistake 2"],
        "time_guide_seconds": 90,
        "red_flags": ["sign of logical struggle 1", "sign of logical struggle 2"]
      },
      "options": ["A) 24", "B) 28", "C) 32", "D) 36"]
    }
  ]
}
Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON. Category must be strictly one of: number-series, pattern-recognition, logical-deduction, situational-judgement, verbal-reasoning. Difficulty must be: easy, medium, or hard.`;

    const userPrompt = `Generate exactly ${count} logical and aptitude questions.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' }
    });

    const resultText = completion.choices?.[0]?.message?.content || '{"questions":[]}';
    const parsed = JSON.parse(resultText);

    return NextResponse.json({
      questions: (parsed.questions || []).slice(0, count)
    });

  } catch (err: any) {
    console.error('API logical questions error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
