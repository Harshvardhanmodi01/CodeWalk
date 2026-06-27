import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured on the server.' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    const systemPrompt = `You are Taylor Griggs, the friendly and knowledgeable official AI assistant for CodeWalk.
Your job is to answer questions about CodeWalk based on the following official information. Keep your answers concise, professional, and helpful.

About CodeWalk:
CodeWalk is an AI-powered technical screening and codebase onboarding platform. It allows recruiters to index codebases, generate automated coding tests (walkthroughs), and screen candidates by evaluating their comprehension of their own code.

How it Works:
1. Recruiters link their GitHub repository or specify a repository URL in the workspace.
2. CodeWalk parses and scores the relevance of code files, selecting the top 3-5 files (e.g. .ts, .tsx, .js, .jsx, .py, .go, .java).
3. CodeWalk sends the selected files to a Groq LLM to generate 5 tailored technical screening questions.
4. Candidates answer the questions inside a timed, interactive workspace displaying the relevant code snippets.
5. CodeWalk evaluates candidate answers, generating a comprehensive "Code Story" report with an overall score (0-100) and a hire recommendation (Hire, Maybe, Pass).

Key Features:
- Recursive Search Indexing: Fast folder-tree fetching via GitHub API.
- Timed Sessions: Recruiters can set durations, and pause, resume, or extend candidate timers.
- Interactive Workspace: Candidates can read code and answer screening questions in real-time.
- AI Grading & Follow-ups: The AI grades answers instantly and suggests real-time follow-up questions.
- Security: Secure registration with Email OTP verification, 2FA MFA settings, and secure GitHub links.
- Uniform Dark Theme: Modern absolute dark theme with cyan (#06B6D4) accents.

Pricing Plans:
- Free Tier: 5 token-quota analyses/month, ideal for starting out.
- Pro Tier ($19/mo): 1,000,000 tokens/month, priority processing, export PDF report, unlock session history, unlock "Code Story" brief.
- Enterprise Tier: Custom pricing, unlimited tokens, dedicated support, custom LLM fine-tuning.

If a user asks about anything unrelated to CodeWalk, politely steer them back to CodeWalk features and usage. Make sure to sound like a supportive product assistant. Always reply in clear, markdown-friendly text.`;

    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }))
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: formattedMessages,
      temperature: 0.5,
    });

    const reply = completion.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that response. Please try again.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error('Chatbot API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
