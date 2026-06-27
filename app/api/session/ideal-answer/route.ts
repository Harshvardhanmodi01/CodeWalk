import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { questionText, codeSnippet } = await req.json();

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are a senior technical interviewer.
Analyze the technical interview question and the provided code snippet.
Provide a concise, structured "Ideal Answer" guide for the recruiter.
Outline the key points, concepts, or code lines the candidate should mention to get a perfect score.
Keep it bulleted, professional, and easy to read.

Return ONLY a JSON object:
{
  "ideal_answer": "Your concise ideal answer points."
}`;

    const userPrompt = `Question: ${questionText || 'Explain your code.'}
Code Snippet:
${codeSnippet || 'N/A'}`;

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
    console.error('Session ideal answer API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
