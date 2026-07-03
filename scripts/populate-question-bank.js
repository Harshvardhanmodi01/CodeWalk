const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const { seedQuestions } = require('./seed-questions');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  console.log(`Starting to seed ${seedQuestions.length} questions into public.question_bank...`);

  // Clear existing pre-built questions to avoid duplicate entries during testing
  console.log('Clearing existing pre-built questions from question_bank...');
  const { error: deleteErr } = await supabase
    .from('question_bank')
    .delete()
    .is('created_by', null);

  if (deleteErr) {
    console.error('Error clearing old questions:', deleteErr);
    process.exit(1);
  }

  // Insert in batches of 20
  const batchSize = 20;
  let successCount = 0;

  for (let i = 0; i < seedQuestions.length; i += batchSize) {
    const batch = seedQuestions.slice(i, i + batchSize);
    console.log(`Inserting batch ${i / batchSize + 1} of ${Math.ceil(seedQuestions.length / batchSize)}...`);

    const { error: insertErr } = await supabase
      .from('question_bank')
      .insert(batch);

    if (insertErr) {
      console.error(`Error inserting batch starting at index ${i}:`, insertErr);
      process.exit(1);
    }

    successCount += batch.length;
  }

  console.log(`Success! Successfully seeded ${successCount} questions into public.question_bank.`);
}

main().catch(console.error);
