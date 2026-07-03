import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import Groq from 'groq-sdk';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate admin user using user session
    const anonSupabase = await createServerSupabaseClient();
    const { data: { session } } = await anonSupabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await anonSupabase
      .from('profiles')
      .select('email, plan')
      .eq('id', session.user.id)
      .single();

    const allowedEmails = ['singhalnikhil010@gmail.com', 'crazyminds667@gmail.com', 'jainharshvardhan11@gmail.com'];
    const isAdmin = profile?.plan?.toLowerCase() === 'enterprise' || allowedEmails.includes(profile?.email || '');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    // 2. Initialize service role client and Groq
    const serviceRoleClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    console.log("Running test generation for topic Python: 3 questions...");
    const systemPrompt = `Generate exactly 3 unique interview questions for the topic Python. Return ONLY a valid JSON array with no markdown, no code blocks, no extra text. Each object must have exactly these fields:
- question_text: a specific unique technically accurate question about Python
- difficulty: exactly one of easy, medium, or hard
- subtopic: the specific subtopic within Python
- tags: array of 3 to 5 relevant strings
- expected_answer: object with fields: ideal_explanation (minimum 4 sentences, specific to this exact question, never use generic phrases like highlight practical usage), key_concepts (array of 5 to 8 specific technical terms candidate must mention), common_mistakes (array of 3 common mistakes specific to this question), follow_up (one follow-up question), red_flags (array of 2 to 3 signs of weak answer)`;

    const userPrompt = `Generate exactly 3 questions for topic: "Python". Return ONLY a valid JSON array.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    let textResult = completion.choices?.[0]?.message?.content || '[]';
    
    // Strip markdown wrappers
    let cleaned = textResult.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    let parsedObj = JSON.parse(cleaned);
    const questions = Array.isArray(parsedObj) ? parsedObj : (parsedObj.questions || parsedObj.data || []);

    const dbQs = questions.map((q: any) => ({
      topic: 'Python',
      category: 'technical',
      subcategory: q.subtopic || q.subcategory || 'testing',
      question_text: q.question_text,
      difficulty: q.difficulty?.toLowerCase() || 'medium',
      expected_answer: q.expected_answer,
      tags: q.tags || [],
      is_ai_generated: true,
      is_verified: true,
      created_by: null,
      usage_count: 0
    }));

    // Insert using service role client and retrieve
    const { data: insertedData, error: insertErr } = await serviceRoleClient
      .from('question_bank')
      .insert(dbQs)
      .select();

    if (insertErr) {
      console.error("Test insert failed:", insertErr);
      return NextResponse.json({ error: 'Insert failed', details: insertErr }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      insertedCount: insertedData?.length || 0,
      questions: insertedData
    });

  } catch (err: any) {
    console.error('API test-generation error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
