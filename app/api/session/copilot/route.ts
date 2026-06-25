import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { questionText, codeSnippet, recruiterNotes } = await req.json();

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are an AI Interview Copilot assisting a technical recruiter.
Analyze the current coding question, code snippet, and the recruiter's typed notes of the candidate's initial response.
Suggest a single, concise, and highly relevant technical follow-up question to probe deeper.
Return ONLY a JSON object:
{
  "follow_up": "Your suggested follow-up question."
}`;

    const userPrompt = `Question: ${questionText || 'Explain your code.'}
Code Snippet:
${codeSnippet || 'N/A'}

Recruiter Notes of Candidate's Answer:
${recruiterNotes || 'Candidate started explaining the logic.'}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const resultText = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(resultText);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('Session copilot API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
