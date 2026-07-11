const fs = require('fs');
const path = require('path');
const { seedQuestions } = require('./seed-questions');

const migrationFilePath = path.resolve(__dirname, '../supabase_question_bank_migration.sql');

const escapeSql = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/'/g, "''");
};

async function main() {
  console.log('Generating migration SQL with 200 pre-populated questions...');

  let sql = `-- SQL MIGRATION FOR TOPIC-BASED QUESTION BANK SYSTEM
-- Execute this query in your Supabase Dashboard SQL Editor (https://supabase.com)

-- 1. Create question_bank table
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'behavioral', 'logical')),
  subcategory TEXT NOT NULL,
  question_text TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  expected_answer JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist to prevent duplication errors
DROP POLICY IF EXISTS select_question_bank ON public.question_bank;
DROP POLICY IF EXISTS insert_question_bank ON public.question_bank;
DROP POLICY IF EXISTS update_question_bank ON public.question_bank;
DROP POLICY IF EXISTS delete_question_bank ON public.question_bank;

-- 4. Create RLS Policies
CREATE POLICY select_question_bank ON public.question_bank
  FOR SELECT TO authenticated
  USING (created_by IS NULL OR created_by = auth.uid());

CREATE POLICY insert_question_bank ON public.question_bank
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY update_question_bank ON public.question_bank
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY delete_question_bank ON public.question_bank
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- 5. Optimize search indexing for topic searches
CREATE INDEX IF NOT EXISTS idx_qb_topic ON public.question_bank (topic);
CREATE INDEX IF NOT EXISTS idx_qb_category ON public.question_bank (category);
CREATE INDEX IF NOT EXISTS idx_qb_created_by ON public.question_bank (created_by);

-- 6. Clean existing pre-built questions to allow re-runs
DELETE FROM public.question_bank WHERE created_by IS NULL;

-- 7. Insert the 200 pre-populated questions
`;

  seedQuestions.forEach((item) => {
    const escapedTopic = escapeSql(item.topic);
    const escapedSubcategory = escapeSql(item.subcategory);
    const escapedQuestionText = escapeSql(item.question_text);
    const escapedDifficulty = escapeSql(item.difficulty);
    
    const jsonStr = JSON.stringify(item.expected_answer);
    const escapedExpectedAnswer = escapeSql(jsonStr);
    
    const tagsStr = item.tags && item.tags.length > 0 
      ? `ARRAY[${item.tags.map(t => `'${escapeSql(t)}'`).join(', ')}]::text[]` 
      : `'{}'::text[]`;

    sql += `INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  '${escapedTopic}', 
  'technical', 
  '${escapedSubcategory}', 
  '${escapedQuestionText}', 
  '${escapedDifficulty}', 
  '${escapedExpectedAnswer}'::jsonb, 
  ${tagsStr}, 
  false, 
  null
);\n`;
  });

  sql += `
-- 8. Reload schema cache
NOTIFY pgrst, 'reload schema';
`;

  fs.writeFileSync(migrationFilePath, sql, 'utf-8');
  console.log(`Success! Generated SQL migration file with all seed questions at: ${migrationFilePath}`);
}

main().catch(console.error);
