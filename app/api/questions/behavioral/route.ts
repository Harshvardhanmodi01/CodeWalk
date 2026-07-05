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
    const roleTitle = sanitizeString(body.role_title || body.positionTitle || 'Software Engineer');
    const experienceLevel = sanitizeString(body.experience_level || 'mid-level');
    const count = body.count || 10;

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are an expert HR interviewer conducting a behavioral screening.
Your task is to generate ${count} structured behavioral questions for a candidate applying for the role of "${roleTitle}" with "${experienceLevel}" experience.

The questions should be split proportionately across these five categories:
1. Teamwork (collaboration, supporting peers, cross-functional work)
2. Leadership (taking initiative, mentorship, driving projects)
3. Conflict Resolution (handling disagreements, dealing with difficult peers/clients)
4. Career Goals (motivation, future planning, fit for this company)
5. Culture Fit (values, adaptability, work environment preference)

Each question must assess candidate behaviors using the STAR (Situation, Task, Action, Result) methodology.
Include 2-3 specific follow-up questions that help drill down into details.

Return a valid JSON object matching this schema:
{
  "questions": [
    {
      "question_text": "Describe a situation when...",
      "code_snippet": "",
      "file_path": "Behavioral",
      "line_start": 0,
      "line_end": 0,
      "difficulty": "medium",
      "category": "teamwork" | "leadership" | "conflict-resolution" | "career-goals" | "culture-fit",
      "why_asked": "Assesses candidate's ability to handle peer disagreements and prioritize product outcomes.",
      "expected_answer": {
        "star_format": "STAR format breakdown of the ideal candidate response, explaining the Situation, Task, Action, and Result they should present.",
        "key_phrases": ["phrase to listen for 1", "phrase to listen for 2"],
        "red_flags": ["indicator of poor teamwork/leadership 1", "indicator of poor teamwork/leadership 2"]
      },
      "follow_up_questions": [
        "What would you do differently if that happened today?",
        "How did the rest of the team react to your proposal?"
      ]
    }
  ]
}
Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON. Category must be strictly one of: teamwork, leadership, conflict-resolution, career-goals, culture-fit. Difficulty must be: easy, medium, or hard.`;

    const userPrompt = `Generate exactly ${count} behavioral questions for:
Role: ${roleTitle}
Experience Level: ${experienceLevel}`;

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
    console.error('API behavioral questions error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
