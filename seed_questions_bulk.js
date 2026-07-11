const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function getTopicsAndCounts() {
  const { data, error } = await supabase
    .from('question_bank')
    .select('topic, category, id')
    .is('created_by', null);
  
  if (error) throw error;

  const map = {};
  data.forEach(q => {
    if (!map[q.topic]) map[q.topic] = { count: 0, category: q.category };
    map[q.topic].count++;
  });
  
  return map;
}

async function generateBatch(topic, category, countForBatch, existingTexts, easyN, medN, hardN) {
  let requestedEasy = 0, requestedMedium = 0, requestedHard = 0;
  let en = easyN, mn = medN, hn = hardN;

  for (let i = 0; i < countForBatch; i++) {
    if (en > 0) { requestedEasy++; en--; }
    else if (mn > 0) { requestedMedium++; mn--; }
    else if (hn > 0) { requestedHard++; hn--; }
    else { requestedMedium++; }
  }

  const isNonTech = category === 'behavioral' || category === 'logical';
  
  const systemPrompt = isNonTech
    ? `Generate exactly ${countForBatch} unique ${category} interview questions for the topic "${topic}".
Return ONLY a valid JSON array. Each object must have:
- question_text: a specific unique question
- difficulty: exactly "easy", "medium", or "hard"
- subtopic: the specific subtopic
- tags: array of 3-5 relevant strings
- expected_answer: object with fields: ideal_explanation (min 4 sentences), key_concepts (array of 5 strings), common_mistakes (array of 3 mistakes), follow_up (one follow-up question), red_flags (array of 2-3 signs of weak answer)`
    : `Generate exactly ${countForBatch} unique technical interview questions for the topic "${topic}".
Return ONLY a valid JSON array. Each object must have:
- question_text: a specific unique technically accurate question about ${topic}
- difficulty: exactly "easy", "medium", or "hard"
- subtopic: the specific subtopic within ${topic}
- tags: array of 3-5 relevant strings
- expected_answer: object with fields: ideal_explanation (min 4 sentences, specific to this exact question), key_concepts (array of 5-8 specific technical terms candidate must mention), common_mistakes (array of 3 common mistakes specific to this question), follow_up (one follow-up question), red_flags (array of 2-3 signs of weak answer)`;

  const avoidList = existingTexts.slice(-40).join('\n - ');
  const userPrompt = `Generate exactly ${countForBatch} questions for topic: "${topic}". Make sure difficulty count matches: Easy: ${requestedEasy}, Medium: ${requestedMedium}, Hard: ${requestedHard}. ${avoidList.length > 0 ? `Avoid these:\n - ${avoidList}` : ''}`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.75,
    response_format: { type: 'json_object' }
  });

  let text = completion.choices?.[0]?.message?.content || '[]';
  let cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  
  let parsed;
  try { parsed = JSON.parse(cleaned); }
  catch (e) {
    console.error('  JSON parse failed. Raw:', text.slice(0, 200));
    return [];
  }

  const arr = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || []);
  return arr;
}

async function seedTopic(topic, category, targetCount, existingCount) {
  const needed = targetCount - existingCount;
  if (needed <= 0) {
    console.log(`  [SKIP] ${topic}: already has ${existingCount}/${targetCount}`);
    return 0;
  }

  console.log(`\n🔧 ${topic} [${category}]: has ${existingCount}, needs ${needed} more...`);

  const { data: existingQs } = await supabase
    .from('question_bank')
    .select('question_text, difficulty')
    .eq('topic', topic)
    .is('created_by', null);

  const existingTexts = (existingQs || []).map(q => q.question_text);
  
  let easyCount = 0, mediumCount = 0, hardCount = 0;
  (existingQs || []).forEach(q => {
    if (q.difficulty === 'easy') easyCount++;
    else if (q.difficulty === 'medium') mediumCount++;
    else if (q.difficulty === 'hard') hardCount++;
  });

  let easyNeeded = Math.max(0, Math.floor(targetCount * 0.4) - easyCount);
  let mediumNeeded = Math.max(0, Math.floor(targetCount * 0.35) - mediumCount);
  let hardNeeded = Math.max(0, Math.floor(targetCount * 0.25) - hardCount);

  let generated = 0;
  const batchSize = 10;
  const batches = Math.ceil(needed / batchSize);

  for (let b = 0; b < batches; b++) {
    const countForBatch = Math.min(batchSize, needed - generated);
    console.log(`  Batch ${b+1}/${batches}: generating ${countForBatch} questions...`);

    try {
      const batchQs = await generateBatch(topic, category, countForBatch, existingTexts, easyNeeded, mediumNeeded, hardNeeded);
      
      if (!batchQs || batchQs.length === 0) {
        console.warn('  No questions returned. Skipping batch.');
        await delay(1000);
        continue;
      }

      const dbQs = batchQs.map(q => ({
        topic,
        category,
        subcategory: q.subtopic || q.subcategory || category,
        question_text: q.question_text || '',
        difficulty: (q.difficulty || 'medium').toLowerCase(),
        expected_answer: q.expected_answer || { ideal_explanation: '', key_concepts: [], common_mistakes: [], follow_up: '', red_flags: [] },
        tags: q.tags || [],
        is_ai_generated: true,
        is_verified: true,
        created_by: null,
        usage_count: 0,
        avg_score: 0
      })).filter(q => q.question_text.length > 10);

      const { data: inserted, error: insertErr } = await supabase
        .from('question_bank')
        .insert(dbQs)
        .select('id');

      if (insertErr) {
        console.error('  Insert error:', insertErr.message);
        await delay(1500);
        continue;
      }

      const insertedCount = inserted?.length || 0;
      generated += insertedCount;
      existingTexts.push(...batchQs.map(q => q.question_text));
      
      // Update difficulty counters
      batchQs.forEach(q => {
        const d = (q.difficulty || 'medium').toLowerCase();
        if (d === 'easy') { easyNeeded = Math.max(0, easyNeeded - 1); }
        else if (d === 'medium') { mediumNeeded = Math.max(0, mediumNeeded - 1); }
        else if (d === 'hard') { hardNeeded = Math.max(0, hardNeeded - 1); }
      });

      console.log(`  ✅ Inserted ${insertedCount} questions. Total generated for topic: ${generated}`);
      
      // Rate limit: 700ms between batches
      if (b < batches - 1) await delay(700);

    } catch (batchErr) {
      console.error(`  Batch error:`, batchErr.message || batchErr);
      await delay(2000);
    }
  }

  return generated;
}

async function main() {
  console.log('🚀 Starting bulk question seeding...\n');
  
  const topicsMap = await getTopicsAndCounts();
  const topics = Object.entries(topicsMap);
  
  console.log(`Found ${topics.length} topics in question_bank:\n`);
  topics.forEach(([t, info]) => console.log(`  ${t} [${info.category}]: ${info.count} questions`));
  console.log('');

  const TARGET = 100;
  let totalGenerated = 0;

  for (const [topic, info] of topics) {
    const generated = await seedTopic(topic, info.category, TARGET, info.count);
    totalGenerated += generated;
    // 1 second between topics
    if (generated > 0) await delay(1000);
  }

  console.log(`\n✅ Done! Total questions generated: ${totalGenerated}`);
  
  // Final count verification
  const finalMap = await getTopicsAndCounts();
  console.log('\n📊 Final counts:');
  Object.entries(finalMap).forEach(([t, info]) => {
    const icon = info.count >= TARGET ? '✅' : '⚠️';
    console.log(`  ${icon} ${t}: ${info.count}/${TARGET}`);
  });
}

main().catch(console.error);
