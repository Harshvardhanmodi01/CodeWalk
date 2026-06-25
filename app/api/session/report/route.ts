import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { answers } = await req.json();
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers array is required' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are a senior technical screener evaluating a candidate's software engineering interview.
Analyze the list of questions, code snippets, candidate answers, and recruiter scores.
Generate an overall hiring report.
You must return a valid JSON object matching this schema:
{
  "overall_score": 85, // 0 to 100 integer
  "hire_recommendation": "hire" | "maybe" | "pass",
  "recommendation_reasoning": "A concise explanation of the recommendation.",
  "strengths": ["Strength 1", "Strength 2"],
  "areas_of_improvement": ["Area 1", "Area 2"],
  "question_analysis": [
    {
      "question": "Question text...",
      "score": 8, // 1 to 10 integer
      "feedback": "AI evaluation of candidate's answer for this question."
    }
  ],
  "final_summary": "Overall technical overview of the candidate's logical ability and fit."
}
Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON.`;

    const userPrompt = `Interview Q&A Records:
${answers.map((a, i) => `[Question ${i + 1}] Category: ${a.category}, Difficulty: ${a.difficulty}
Q: ${a.question_text}
Candidate Answer/Recruiter Notes: ${a.answer_text || 'No response recorded.'}
Recruiter score given: ${a.score || 5}/10`).join('\n\n')}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const resultText = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(resultText);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('Session report API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
