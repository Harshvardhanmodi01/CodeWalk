import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import Groq from 'groq-sdk';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate admin user
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

    // 3. Fetch questions with generic expected answers using service role client
    const { data: genericQs, error: fetchErr } = await serviceRoleClient
      .from('question_bank')
      .select('id, topic, question_text, expected_answer')
      .or('expected_answer->>ideal_explanation.like.%highlighting its practical usage%,expected_answer->>ideal_explanation.like.%A strong candidate should explain%')
      .limit(20); // Process up to 20 questions per run to prevent Vercel execution timeouts

    if (fetchErr) {
      console.error('Error fetching generic questions:', fetchErr);
      throw fetchErr;
    }

    if (!genericQs || genericQs.length === 0) {
      return NextResponse.json({ 
        message: 'All questions have specific expected answers. No generic templates left to fix!',
        fixedCount: 0
      });
    }

    console.log(`Found ${genericQs.length} questions with generic expected answers. Fixing in batches of 5...`);

    let fixedCount = 0;
    const batchSize = 5;

    for (let i = 0; i < genericQs.length; i += batchSize) {
      const batch = genericQs.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(genericQs.length / batchSize)}...`);

      // Process batch items concurrently
      const updatePromises = batch.map(async (q) => {
        const systemPrompt = `For this specific interview question: ${q.question_text} about ${q.topic}, generate a detailed JSON expected answer object. Return ONLY valid JSON, no markdown, no code blocks. Fields required: ideal_explanation (explain specifically what this concept is, how it works, give a technically accurate answer a senior developer would give, minimum 5 sentences, be specific to THIS exact question), key_concepts (array of actual specific technical terms required to answer this question well), common_mistakes (array of actual mistakes candidates make on THIS specific question), follow_up (a meaningful follow-up that tests deeper understanding of this specific topic), red_flags (array of specific signs candidate does not understand this particular concept)`;

        const userPrompt = `Generate the expected_answer JSON object for Question: "${q.question_text}" under topic "${q.topic}"`;

        try {
          const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.6,
            response_format: { type: 'json_object' }
          });

          let resultText = completion.choices?.[0]?.message?.content || '{}';
          
          let cleaned = resultText.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
          }

          let parsedAnswer;
          try {
            parsedAnswer = JSON.parse(cleaned);
          } catch (parseErr) {
            console.error(`Failed to parse Groq response for question ID ${q.id}:`, parseErr);
            console.log("Raw response was:", resultText);
            return;
          }

          if (parsedAnswer && parsedAnswer.ideal_explanation) {
            // Update question in database using service role client
            const { error: updateErr } = await serviceRoleClient
              .from('question_bank')
              .update({ expected_answer: parsedAnswer })
              .eq('id', q.id);

            if (updateErr) {
              console.error(`Failed to update question ID ${q.id}:`, updateErr);
            } else {
              fixedCount++;
            }
          }
        } catch (itemErr) {
          console.error(`Error fixing expected answer for question ID ${q.id}:`, itemErr);
        }
      });

      await Promise.all(updatePromises);
      
      // Delay 1 second between batches
      if (i + batchSize < genericQs.length) {
        await delay(1000);
      }
    }

    return NextResponse.json({
      message: `Successfully fixed expected answers.`,
      fixedCount,
      totalGenericFound: genericQs.length
    });

  } catch (err: any) {
    console.error('API fix-expected-answers error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
