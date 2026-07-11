import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import Groq from 'groq-sdk';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(req: NextRequest) {
  try {
    // Verify x-admin-secret header
    const adminSecret = req.headers.get('x-admin-secret');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Forbidden. Invalid admin secret.' }, { status: 403 });
    }

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

    // 3. Fetch all distinct topics from question_bank table
    const { data: topicsData, error: topicsErr } = await serviceRoleClient
      .from('question_bank')
      .select('topic');
      
    if (topicsErr) throw topicsErr;
    
    // Unique list of topics
    const topicsList = Array.from(new Set((topicsData || []).map(t => t.topic)));
    if (topicsList.length === 0) {
      return NextResponse.json({ error: 'No topics found in question_bank table.' }, { status: 400 });
    }

    const results = [];

    // 4. Process ALL topics sequentially
    for (const topic of topicsList) {
      console.log(`Processing topic: "${topic}"...`);
      
      // Fetch current questions for this topic
      const { data: existingQs, error: existingErr } = await serviceRoleClient
        .from('question_bank')
        .select('question_text, difficulty')
        .eq('topic', topic)
        .is('created_by', null);

      if (existingErr) {
        console.error(`Error fetching questions for topic "${topic}":`, existingErr);
        continue;
      }

      const existingCount = existingQs?.length || 0;
      const questionsNeeded = 100 - existingCount;

      if (questionsNeeded <= 0) {
        results.push({
          topic,
          questionsGenerated: 0,
          totalNow: existingCount
        });
        continue;
      }

      // Calculate current difficulty distribution
      let easyCount = 0;
      let mediumCount = 0;
      let hardCount = 0;
      
      (existingQs || []).forEach(q => {
        const diff = q.difficulty?.toLowerCase();
        if (diff === 'easy') easyCount++;
        else if (diff === 'medium') mediumCount++;
        else if (diff === 'hard') hardCount++;
      });

      let easyNeeded = Math.max(0, 40 - easyCount);
      let mediumNeeded = Math.max(0, 35 - mediumCount);
      let hardNeeded = Math.max(0, 25 - hardCount);

      const existingTexts = (existingQs || []).map(q => q.question_text);
      let questionsGeneratedForTopic = 0;

      const batchCount = Math.ceil(questionsNeeded / 10);
      
      for (let batchIdx = 0; batchIdx < batchCount; batchIdx++) {
        const countForBatch = Math.min(10, questionsNeeded - questionsGeneratedForTopic);
        
        let requestedEasy = 0;
        let requestedMedium = 0;
        let requestedHard = 0;

        for (let i = 0; i < countForBatch; i++) {
          if (easyNeeded > 0) {
            requestedEasy++;
            easyNeeded--;
          } else if (mediumNeeded > 0) {
            requestedMedium++;
            mediumNeeded--;
          } else if (hardNeeded > 0) {
            requestedHard++;
            hardNeeded--;
          } else {
            requestedMedium++;
          }
        }

        const promptExisting = existingTexts.slice(-60).join('\n - ');

        const systemPrompt = `Generate exactly 10 unique interview questions for the topic ${topic}. Return ONLY a valid JSON array with no markdown, no code blocks, no extra text. Each object must have exactly these fields:
- question_text: a specific unique technically accurate question about ${topic}
- difficulty: exactly one of easy, medium, or hard
- subtopic: the specific subtopic within ${topic}
- tags: array of 3 to 5 relevant strings
- expected_answer: object with fields: ideal_explanation (minimum 4 sentences, specific to this exact question, never use generic phrases like highlight practical usage), key_concepts (array of 5 to 8 specific technical terms candidate must mention), common_mistakes (array of 3 common mistakes specific to this question), follow_up (one follow-up question), red_flags (array of 2 to 3 signs of weak answer)`;

        const userPrompt = `Generate exactly ${countForBatch} questions for topic: "${topic}". Make sure difficulty count matches: Easy: ${requestedEasy}, Medium: ${requestedMedium}, Hard: ${requestedHard}. Genuinely avoid these: \n - ${promptExisting}`;

        try {
          console.log(`Calling Groq for batch ${batchIdx + 1}/${batchCount} on topic "${topic}"...`);
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
          
          // Strip any markdown wrappers
          let cleaned = textResult.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
          }

          let parsedObj;
          try {
            parsedObj = JSON.parse(cleaned);
          } catch (parseErr) {
            console.error(`Failed to parse Groq response for topic "${topic}" batch ${batchIdx}:`, parseErr);
            console.log("Raw response was:", textResult);
            continue; // Skip failed batch, continue with next
          }

          const batchQs = Array.isArray(parsedObj) ? parsedObj : (parsedObj.questions || parsedObj.data || []);
          if (!Array.isArray(batchQs) || batchQs.length === 0) {
            console.warn(`No valid questions array found in response for topic "${topic}"`);
            continue;
          }

          // Map to DB structure
          const dbQs = batchQs.map((q: any) => ({
            topic,
            category: 'technical',
            subcategory: q.subtopic || q.subcategory || 'general',
            question_text: q.question_text,
            difficulty: q.difficulty?.toLowerCase() || 'medium',
            expected_answer: q.expected_answer,
            tags: q.tags || [],
            is_ai_generated: true,
            is_verified: true,
            created_by: null,
            usage_count: 0
          }));

          // Write batch and retrieve inserted rows to verify save success
          const { data: insertedData, error: insertErr } = await serviceRoleClient
            .from('question_bank')
            .insert(dbQs)
            .select();

          if (insertErr || !insertedData || insertedData.length === 0) {
            console.error(`Failed to verify row insert for topic "${topic}":`, insertErr);
            continue;
          }

          questionsGeneratedForTopic += insertedData.length;
          existingTexts.push(...insertedData.map((q: any) => q.question_text));

          // 500ms delay between batches
          await delay(500);

        } catch (batchErr) {
          console.error(`Error during batch ${batchIdx} for topic "${topic}":`, batchErr);
          await delay(1000);
        }
      }

      results.push({
        topic,
        questionsGenerated: questionsGeneratedForTopic,
        totalNow: existingCount + questionsGeneratedForTopic
      });
    }

    return NextResponse.json(results);

  } catch (err: any) {
    console.error('API bulk-generate error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
