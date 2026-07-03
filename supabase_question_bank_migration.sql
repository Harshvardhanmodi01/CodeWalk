-- SQL MIGRATION FOR TOPIC-BASED QUESTION BANK SYSTEM
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
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Python', 
  'technical', 
  'programming-languages', 
  'GIL in Python, multi-threading impact & bypass strategies.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"GIL in Python, multi-threading impact & bypass strategies.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["concurrency","gil","best practices","performance"],"correct_approach":"The correct technical approach for \"GIL in Python, multi-threading impact & bypass strategies.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"GIL in Python, multi-threading impact & bypass strategies.\" in your past work?","red_flags":["Fails to explain basic concepts of Python","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['concurrency', 'gil']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Python', 
  'technical', 
  'programming-languages', 
  'Custom decorator that measures function execution time.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Custom decorator that measures function execution time.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["decorators","performance","best practices","performance"],"correct_approach":"The correct technical approach for \"Custom decorator that measures function execution time.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Custom decorator that measures function execution time.\" in your past work?","red_flags":["Fails to explain basic concepts of Python","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['decorators', 'performance']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Python', 
  'technical', 
  'programming-languages', 
  'List comprehensions vs generator expressions in Python.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"List comprehensions vs generator expressions in Python.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["generators","memory","best practices","performance"],"correct_approach":"The correct technical approach for \"List comprehensions vs generator expressions in Python.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"List comprehensions vs generator expressions in Python.\" in your past work?","red_flags":["Fails to explain basic concepts of Python","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['generators', 'memory']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Python', 
  'technical', 
  'programming-languages', 
  'Reference counting vs generational garbage collection in Python.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Reference counting vs generational garbage collection in Python.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["memory","gc","best practices","performance"],"correct_approach":"The correct technical approach for \"Reference counting vs generational garbage collection in Python.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Reference counting vs generational garbage collection in Python.\" in your past work?","red_flags":["Fails to explain basic concepts of Python","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['memory', 'gc']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Python', 
  'technical', 
  'programming-languages', 
  'Deepcopy vs shallow copy of compound mutable objects.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Deepcopy vs shallow copy of compound mutable objects.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["deepcopy","copy","best practices","performance"],"correct_approach":"The correct technical approach for \"Deepcopy vs shallow copy of compound mutable objects.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Deepcopy vs shallow copy of compound mutable objects.\" in your past work?","red_flags":["Fails to explain basic concepts of Python","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['deepcopy', 'copy']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Python', 
  'technical', 
  'programming-languages', 
  'Exception handling differences between except and finally clauses.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Exception handling differences between except and finally clauses.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["exceptions","error-handling","best practices","performance"],"correct_approach":"The correct technical approach for \"Exception handling differences between except and finally clauses.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Exception handling differences between except and finally clauses.\" in your past work?","red_flags":["Fails to explain basic concepts of Python","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['exceptions', 'error-handling']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Python', 
  'technical', 
  'programming-languages', 
  'Python MRO and the super() function in multiple inheritance.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Python MRO and the super() function in multiple inheritance.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["mro","inheritance","best practices","performance"],"correct_approach":"The correct technical approach for \"Python MRO and the super() function in multiple inheritance.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Python MRO and the super() function in multiple inheritance.\" in your past work?","red_flags":["Fails to explain basic concepts of Python","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['mro', 'inheritance']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Python', 
  'technical', 
  'programming-languages', 
  'Usage of *args and **kwargs in generic forwarding functions.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Usage of *args and **kwargs in generic forwarding functions.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["args","kwargs","best practices","performance"],"correct_approach":"The correct technical approach for \"Usage of *args and **kwargs in generic forwarding functions.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Usage of *args and **kwargs in generic forwarding functions.\" in your past work?","red_flags":["Fails to explain basic concepts of Python","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['args', 'kwargs']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Python', 
  'technical', 
  'programming-languages', 
  'Context managers: implementing __enter__ and __exit__ methods.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Context managers: implementing __enter__ and __exit__ methods.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["context-manager","with","best practices","performance"],"correct_approach":"The correct technical approach for \"Context managers: implementing __enter__ and __exit__ methods.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Context managers: implementing __enter__ and __exit__ methods.\" in your past work?","red_flags":["Fails to explain basic concepts of Python","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['context-manager', 'with']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Python', 
  'technical', 
  'programming-languages', 
  'list.sort() in-place sorting vs sorted() new list return.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"list.sort() in-place sorting vs sorted() new list return.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["sorting","timsort","best practices","performance"],"correct_approach":"The correct technical approach for \"list.sort() in-place sorting vs sorted() new list return.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"list.sort() in-place sorting vs sorted() new list return.\" in your past work?","red_flags":["Fails to explain basic concepts of Python","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['sorting', 'timsort']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'JavaScript', 
  'technical', 
  'programming-languages', 
  'Event Loop microtasks (Promises) vs macrotasks (setTimeout).', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Event Loop microtasks (Promises) vs macrotasks (setTimeout).\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["event-loop","asynchronous","best practices","performance"],"correct_approach":"The correct technical approach for \"Event Loop microtasks (Promises) vs macrotasks (setTimeout).\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Event Loop microtasks (Promises) vs macrotasks (setTimeout).\" in your past work?","red_flags":["Fails to explain basic concepts of JavaScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['event-loop', 'asynchronous']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'JavaScript', 
  'technical', 
  'programming-languages', 
  'Closures: scope preservation and state encapsulation.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Closures: scope preservation and state encapsulation.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["closures","scopes","best practices","performance"],"correct_approach":"The correct technical approach for \"Closures: scope preservation and state encapsulation.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Closures: scope preservation and state encapsulation.\" in your past work?","red_flags":["Fails to explain basic concepts of JavaScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['closures', 'scopes']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'JavaScript', 
  'technical', 
  'programming-languages', 
  'var vs let vs const: scope, hoisting, and Temporal Dead Zone.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"var vs let vs const: scope, hoisting, and Temporal Dead Zone.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["hoisting","scope","best practices","performance"],"correct_approach":"The correct technical approach for \"var vs let vs const: scope, hoisting, and Temporal Dead Zone.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"var vs let vs const: scope, hoisting, and Temporal Dead Zone.\" in your past work?","red_flags":["Fails to explain basic concepts of JavaScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['hoisting', 'scope']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'JavaScript', 
  'technical', 
  'programming-languages', 
  'Prototypal inheritance and walking the prototype chain.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Prototypal inheritance and walking the prototype chain.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["prototypes","inheritance","best practices","performance"],"correct_approach":"The correct technical approach for \"Prototypal inheritance and walking the prototype chain.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Prototypal inheritance and walking the prototype chain.\" in your past work?","red_flags":["Fails to explain basic concepts of JavaScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['prototypes', 'inheritance']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'JavaScript', 
  'technical', 
  'programming-languages', 
  'Double equals (==) coercion vs strict triple equals (===).', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Double equals (==) coercion vs strict triple equals (===).\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["comparison","coercion","best practices","performance"],"correct_approach":"The correct technical approach for \"Double equals (==) coercion vs strict triple equals (===).\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Double equals (==) coercion vs strict triple equals (===).\" in your past work?","red_flags":["Fails to explain basic concepts of JavaScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['comparison', 'coercion']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'JavaScript', 
  'technical', 
  'programming-languages', 
  'Lexical binding of ''this'' in arrow functions vs normal functions.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Lexical binding of ''this'' in arrow functions vs normal functions.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["this-binding","arrow","best practices","performance"],"correct_approach":"The correct technical approach for \"Lexical binding of ''this'' in arrow functions vs normal functions.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Lexical binding of ''this'' in arrow functions vs normal functions.\" in your past work?","red_flags":["Fails to explain basic concepts of JavaScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['this-binding', 'arrow']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'JavaScript', 
  'technical', 
  'concurrency', 
  'Promise.all fail-fast vs Promise.allSettled full compliance.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Promise.all fail-fast vs Promise.allSettled full compliance.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["promises","best practices","performance"],"correct_approach":"The correct technical approach for \"Promise.all fail-fast vs Promise.allSettled full compliance.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Promise.all fail-fast vs Promise.allSettled full compliance.\" in your past work?","red_flags":["Fails to explain basic concepts of JavaScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['promises']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'JavaScript', 
  'technical', 
  'frontend', 
  'DOM Event Bubbling, Capturing, and preventDefault vs stopPropagation.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"DOM Event Bubbling, Capturing, and preventDefault vs stopPropagation.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["dom","events","best practices","performance"],"correct_approach":"The correct technical approach for \"DOM Event Bubbling, Capturing, and preventDefault vs stopPropagation.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"DOM Event Bubbling, Capturing, and preventDefault vs stopPropagation.\" in your past work?","red_flags":["Fails to explain basic concepts of JavaScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['dom', 'events']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'JavaScript', 
  'technical', 
  'frontend', 
  'Debounce (delay executions) vs Throttle (limit frequency) systems.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Debounce (delay executions) vs Throttle (limit frequency) systems.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["performance","debounce","best practices","performance"],"correct_approach":"The correct technical approach for \"Debounce (delay executions) vs Throttle (limit frequency) systems.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Debounce (delay executions) vs Throttle (limit frequency) systems.\" in your past work?","red_flags":["Fails to explain basic concepts of JavaScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['performance', 'debounce']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'JavaScript', 
  'technical', 
  'programming-languages', 
  'Generator functions, yield statement, and next() protocol.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Generator functions, yield statement, and next() protocol.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["generators","iterators","best practices","performance"],"correct_approach":"The correct technical approach for \"Generator functions, yield statement, and next() protocol.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Generator functions, yield statement, and next() protocol.\" in your past work?","red_flags":["Fails to explain basic concepts of JavaScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['generators', 'iterators']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'TypeScript', 
  'technical', 
  'programming-languages', 
  'Interface vs Type Alias: declaration merging and extension rules.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Interface vs Type Alias: declaration merging and extension rules.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["interfaces","types","best practices","performance"],"correct_approach":"The correct technical approach for \"Interface vs Type Alias: declaration merging and extension rules.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Interface vs Type Alias: declaration merging and extension rules.\" in your past work?","red_flags":["Fails to explain basic concepts of TypeScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['interfaces', 'types']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'TypeScript', 
  'technical', 
  'programming-languages', 
  'Generics: creating reusable components with type parameters.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Generics: creating reusable components with type parameters.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["generics","reusability","best practices","performance"],"correct_approach":"The correct technical approach for \"Generics: creating reusable components with type parameters.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Generics: creating reusable components with type parameters.\" in your past work?","red_flags":["Fails to explain basic concepts of TypeScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['generics', 'reusability']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'TypeScript', 
  'technical', 
  'programming-languages', 
  'Union types vs Intersection types and key matching logic.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Union types vs Intersection types and key matching logic.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["union","intersection","best practices","performance"],"correct_approach":"The correct technical approach for \"Union types vs Intersection types and key matching logic.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Union types vs Intersection types and key matching logic.\" in your past work?","red_flags":["Fails to explain basic concepts of TypeScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['union', 'intersection']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'TypeScript', 
  'technical', 
  'programming-languages', 
  'Type Guarding using ''typeof'', ''instanceof'', and user-defined predicates.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Type Guarding using ''typeof'', ''instanceof'', and user-defined predicates.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["type-guards","narrowing","best practices","performance"],"correct_approach":"The correct technical approach for \"Type Guarding using ''typeof'', ''instanceof'', and user-defined predicates.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Type Guarding using ''typeof'', ''instanceof'', and user-defined predicates.\" in your past work?","red_flags":["Fails to explain basic concepts of TypeScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['type-guards', 'narrowing']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'TypeScript', 
  'technical', 
  'programming-languages', 
  'Utility types: Partial, Readonly, Pick, and Omit implementation.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Utility types: Partial, Readonly, Pick, and Omit implementation.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["utility-types","helper","best practices","performance"],"correct_approach":"The correct technical approach for \"Utility types: Partial, Readonly, Pick, and Omit implementation.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Utility types: Partial, Readonly, Pick, and Omit implementation.\" in your past work?","red_flags":["Fails to explain basic concepts of TypeScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['utility-types', 'helper']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'TypeScript', 
  'technical', 
  'programming-languages', 
  'Keyof operator and Mapped Types for dynamic schemas.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Keyof operator and Mapped Types for dynamic schemas.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["mapped-types","keyof","best practices","performance"],"correct_approach":"The correct technical approach for \"Keyof operator and Mapped Types for dynamic schemas.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Keyof operator and Mapped Types for dynamic schemas.\" in your past work?","red_flags":["Fails to explain basic concepts of TypeScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['mapped-types', 'keyof']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'TypeScript', 
  'technical', 
  'programming-languages', 
  'Abstract classes vs Interfaces: implementation details and syntax.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Abstract classes vs Interfaces: implementation details and syntax.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["classes","abstract","best practices","performance"],"correct_approach":"The correct technical approach for \"Abstract classes vs Interfaces: implementation details and syntax.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Abstract classes vs Interfaces: implementation details and syntax.\" in your past work?","red_flags":["Fails to explain basic concepts of TypeScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['classes', 'abstract']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'TypeScript', 
  'technical', 
  'programming-languages', 
  'Conditional Types: infer keyword and dynamic return types.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Conditional Types: infer keyword and dynamic return types.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["conditional-types","infer","best practices","performance"],"correct_approach":"The correct technical approach for \"Conditional Types: infer keyword and dynamic return types.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Conditional Types: infer keyword and dynamic return types.\" in your past work?","red_flags":["Fails to explain basic concepts of TypeScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['conditional-types', 'infer']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'TypeScript', 
  'technical', 
  'programming-languages', 
  'TypeScript Decorators: class, method, and property interception.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"TypeScript Decorators: class, method, and property interception.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["decorators","meta","best practices","performance"],"correct_approach":"The correct technical approach for \"TypeScript Decorators: class, method, and property interception.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"TypeScript Decorators: class, method, and property interception.\" in your past work?","red_flags":["Fails to explain basic concepts of TypeScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['decorators', 'meta']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'TypeScript', 
  'technical', 
  'programming-languages', 
  'Any vs Unknown: type safety and assertion requirement.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Any vs Unknown: type safety and assertion requirement.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["any","unknown","best practices","performance"],"correct_approach":"The correct technical approach for \"Any vs Unknown: type safety and assertion requirement.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Any vs Unknown: type safety and assertion requirement.\" in your past work?","red_flags":["Fails to explain basic concepts of TypeScript","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['any', 'unknown']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'React.js', 
  'technical', 
  'frontend', 
  'React Reconciliation algorithm and the virtual DOM diffing.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"React Reconciliation algorithm and the virtual DOM diffing.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["virtual-dom","diffing","best practices","performance"],"correct_approach":"The correct technical approach for \"React Reconciliation algorithm and the virtual DOM diffing.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"React Reconciliation algorithm and the virtual DOM diffing.\" in your past work?","red_flags":["Fails to explain basic concepts of React.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['virtual-dom', 'diffing']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'React.js', 
  'technical', 
  'frontend', 
  'useMemo vs useCallback: referential equality and performance.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"useMemo vs useCallback: referential equality and performance.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["hooks","performance","best practices","performance"],"correct_approach":"The correct technical approach for \"useMemo vs useCallback: referential equality and performance.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"useMemo vs useCallback: referential equality and performance.\" in your past work?","red_flags":["Fails to explain basic concepts of React.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['hooks', 'performance']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'React.js', 
  'technical', 
  'frontend', 
  'React state batching and updates in async vs sync code blocks.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"React state batching and updates in async vs sync code blocks.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["state","batching","best practices","performance"],"correct_approach":"The correct technical approach for \"React state batching and updates in async vs sync code blocks.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"React state batching and updates in async vs sync code blocks.\" in your past work?","red_flags":["Fails to explain basic concepts of React.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['state', 'batching']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'React.js', 
  'technical', 
  'frontend', 
  'Custom React hooks: encapsulating event listeners or API queries.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Custom React hooks: encapsulating event listeners or API queries.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["hooks","custom","best practices","performance"],"correct_approach":"The correct technical approach for \"Custom React hooks: encapsulating event listeners or API queries.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Custom React hooks: encapsulating event listeners or API queries.\" in your past work?","red_flags":["Fails to explain basic concepts of React.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['hooks', 'custom']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'React.js', 
  'technical', 
  'frontend', 
  'Context API vs Redux: prop drilling solutions and scaling limits.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Context API vs Redux: prop drilling solutions and scaling limits.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["context","redux","best practices","performance"],"correct_approach":"The correct technical approach for \"Context API vs Redux: prop drilling solutions and scaling limits.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Context API vs Redux: prop drilling solutions and scaling limits.\" in your past work?","red_flags":["Fails to explain basic concepts of React.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['context', 'redux']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'React.js', 
  'technical', 
  'frontend', 
  'React 19 Server Components (RSC) vs Client Components.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"React 19 Server Components (RSC) vs Client Components.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["rsc","nextjs","best practices","performance"],"correct_approach":"The correct technical approach for \"React 19 Server Components (RSC) vs Client Components.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"React 19 Server Components (RSC) vs Client Components.\" in your past work?","red_flags":["Fails to explain basic concepts of React.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['rsc', 'nextjs']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'React.js', 
  'technical', 
  'frontend', 
  'Strict Mode side-effects and double rendering in development.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Strict Mode side-effects and double rendering in development.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["strict-mode","debugging","best practices","performance"],"correct_approach":"The correct technical approach for \"Strict Mode side-effects and double rendering in development.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Strict Mode side-effects and double rendering in development.\" in your past work?","red_flags":["Fails to explain basic concepts of React.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['strict-mode', 'debugging']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'React.js', 
  'technical', 
  'frontend', 
  'useEffect cleanup functions: preventing memory leaks and duplicates.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"useEffect cleanup functions: preventing memory leaks and duplicates.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["hooks","cleanup","best practices","performance"],"correct_approach":"The correct technical approach for \"useEffect cleanup functions: preventing memory leaks and duplicates.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"useEffect cleanup functions: preventing memory leaks and duplicates.\" in your past work?","red_flags":["Fails to explain basic concepts of React.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['hooks', 'cleanup']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'React.js', 
  'technical', 
  'frontend', 
  'Error Boundaries: capturing runtime rendering errors safely.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Error Boundaries: capturing runtime rendering errors safely.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["error-boundary","exceptions","best practices","performance"],"correct_approach":"The correct technical approach for \"Error Boundaries: capturing runtime rendering errors safely.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Error Boundaries: capturing runtime rendering errors safely.\" in your past work?","red_flags":["Fails to explain basic concepts of React.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['error-boundary', 'exceptions']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'React.js', 
  'technical', 
  'frontend', 
  'React.memo vs pure components: shallow prop comparisons.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"React.memo vs pure components: shallow prop comparisons.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["memo","optimization","best practices","performance"],"correct_approach":"The correct technical approach for \"React.memo vs pure components: shallow prop comparisons.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"React.memo vs pure components: shallow prop comparisons.\" in your past work?","red_flags":["Fails to explain basic concepts of React.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['memo', 'optimization']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Next.js', 
  'technical', 
  'frontend', 
  'App Router directory routing vs Pages Router convention.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"App Router directory routing vs Pages Router convention.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["routing","app-router","best practices","performance"],"correct_approach":"The correct technical approach for \"App Router directory routing vs Pages Router convention.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"App Router directory routing vs Pages Router convention.\" in your past work?","red_flags":["Fails to explain basic concepts of Next.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['routing', 'app-router']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Next.js', 
  'technical', 
  'frontend', 
  'Server Actions: executing server database writes directly from client.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Server Actions: executing server database writes directly from client.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["server-actions","forms","best practices","performance"],"correct_approach":"The correct technical approach for \"Server Actions: executing server database writes directly from client.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Server Actions: executing server database writes directly from client.\" in your past work?","red_flags":["Fails to explain basic concepts of Next.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['server-actions', 'forms']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Next.js', 
  'technical', 
  'frontend', 
  'Static Site Generation (SSG) vs Server-Side Rendering (SSR).', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Static Site Generation (SSG) vs Server-Side Rendering (SSR).\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["ssr","ssg","best practices","performance"],"correct_approach":"The correct technical approach for \"Static Site Generation (SSG) vs Server-Side Rendering (SSR).\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Static Site Generation (SSG) vs Server-Side Rendering (SSR).\" in your past work?","red_flags":["Fails to explain basic concepts of Next.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['ssr', 'ssg']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Next.js', 
  'technical', 
  'frontend', 
  'Incremental Static Regeneration (ISR) configuration and revalidate.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Incremental Static Regeneration (ISR) configuration and revalidate.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["isr","caching","best practices","performance"],"correct_approach":"The correct technical approach for \"Incremental Static Regeneration (ISR) configuration and revalidate.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Incremental Static Regeneration (ISR) configuration and revalidate.\" in your past work?","red_flags":["Fails to explain basic concepts of Next.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['isr', 'caching']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Next.js', 
  'technical', 
  'frontend', 
  'Next.js middleware: cookies validation, routing, and redirects.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Next.js middleware: cookies validation, routing, and redirects.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["middleware","auth","best practices","performance"],"correct_approach":"The correct technical approach for \"Next.js middleware: cookies validation, routing, and redirects.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Next.js middleware: cookies validation, routing, and redirects.\" in your past work?","red_flags":["Fails to explain basic concepts of Next.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['middleware', 'auth']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Next.js', 
  'technical', 
  'frontend', 
  'Next.js Image component: layout optimization and lazy loading.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Next.js Image component: layout optimization and lazy loading.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["optimization","images","best practices","performance"],"correct_approach":"The correct technical approach for \"Next.js Image component: layout optimization and lazy loading.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Next.js Image component: layout optimization and lazy loading.\" in your past work?","red_flags":["Fails to explain basic concepts of Next.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['optimization', 'images']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Next.js', 
  'technical', 
  'frontend', 
  'Dynamic imports and code-splitting with React.lazy.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Dynamic imports and code-splitting with React.lazy.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["code-splitting","performance","best practices","performance"],"correct_approach":"The correct technical approach for \"Dynamic imports and code-splitting with React.lazy.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Dynamic imports and code-splitting with React.lazy.\" in your past work?","red_flags":["Fails to explain basic concepts of Next.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['code-splitting', 'performance']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Next.js', 
  'technical', 
  'frontend', 
  'Next.js routing interceptors and parallel layouts.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Next.js routing interceptors and parallel layouts.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["routing","parallel-routes","best practices","performance"],"correct_approach":"The correct technical approach for \"Next.js routing interceptors and parallel layouts.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Next.js routing interceptors and parallel layouts.\" in your past work?","red_flags":["Fails to explain basic concepts of Next.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['routing', 'parallel-routes']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Next.js', 
  'technical', 
  'frontend', 
  'Caching layers in Next.js: Fetch cache vs Route cache.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Caching layers in Next.js: Fetch cache vs Route cache.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["caching","performance","best practices","performance"],"correct_approach":"The correct technical approach for \"Caching layers in Next.js: Fetch cache vs Route cache.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Caching layers in Next.js: Fetch cache vs Route cache.\" in your past work?","red_flags":["Fails to explain basic concepts of Next.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['caching', 'performance']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Next.js', 
  'technical', 
  'frontend', 
  'SEO tags injection and metadata layouts in Next.js.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"SEO tags injection and metadata layouts in Next.js.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["seo","metadata","best practices","performance"],"correct_approach":"The correct technical approach for \"SEO tags injection and metadata layouts in Next.js.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"SEO tags injection and metadata layouts in Next.js.\" in your past work?","red_flags":["Fails to explain basic concepts of Next.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['seo', 'metadata']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Node.js', 
  'technical', 
  'backend', 
  'Event Emitter pattern and custom listener implementation.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Event Emitter pattern and custom listener implementation.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["events","design-pattern","best practices","performance"],"correct_approach":"The correct technical approach for \"Event Emitter pattern and custom listener implementation.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Event Emitter pattern and custom listener implementation.\" in your past work?","red_flags":["Fails to explain basic concepts of Node.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['events', 'design-pattern']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Node.js', 
  'technical', 
  'backend', 
  'Streams API: readable, writable, duplex, and piping big files.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Streams API: readable, writable, duplex, and piping big files.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["streams","files","best practices","performance"],"correct_approach":"The correct technical approach for \"Streams API: readable, writable, duplex, and piping big files.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Streams API: readable, writable, duplex, and piping big files.\" in your past work?","red_flags":["Fails to explain basic concepts of Node.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['streams', 'files']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Node.js', 
  'technical', 
  'backend', 
  'Cluster module and fork child processes for CPU load balancing.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Cluster module and fork child processes for CPU load balancing.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["clustering","scaling","best practices","performance"],"correct_approach":"The correct technical approach for \"Cluster module and fork child processes for CPU load balancing.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Cluster module and fork child processes for CPU load balancing.\" in your past work?","red_flags":["Fails to explain basic concepts of Node.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['clustering', 'scaling']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Node.js', 
  'technical', 
  'backend', 
  'Buffer class: binary data handling and performance comparison.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Buffer class: binary data handling and performance comparison.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["buffers","memory","best practices","performance"],"correct_approach":"The correct technical approach for \"Buffer class: binary data handling and performance comparison.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Buffer class: binary data handling and performance comparison.\" in your past work?","red_flags":["Fails to explain basic concepts of Node.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['buffers', 'memory']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Node.js', 
  'technical', 
  'backend', 
  'Asynchronous patterns: callbacks, promises, and async/await.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Asynchronous patterns: callbacks, promises, and async/await.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["async","promises","best practices","performance"],"correct_approach":"The correct technical approach for \"Asynchronous patterns: callbacks, promises, and async/await.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Asynchronous patterns: callbacks, promises, and async/await.\" in your past work?","red_flags":["Fails to explain basic concepts of Node.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['async', 'promises']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Node.js', 
  'technical', 
  'backend', 
  'require (CommonJS) vs import (ESM) module system differences.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"require (CommonJS) vs import (ESM) module system differences.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["modules","commonjs","best practices","performance"],"correct_approach":"The correct technical approach for \"require (CommonJS) vs import (ESM) module system differences.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"require (CommonJS) vs import (ESM) module system differences.\" in your past work?","red_flags":["Fails to explain basic concepts of Node.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['modules', 'commonjs']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Node.js', 
  'technical', 
  'backend', 
  'Libuv pool size: executing async file systems and crypto operations.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Libuv pool size: executing async file systems and crypto operations.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["libuv","threadpool","best practices","performance"],"correct_approach":"The correct technical approach for \"Libuv pool size: executing async file systems and crypto operations.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Libuv pool size: executing async file systems and crypto operations.\" in your past work?","red_flags":["Fails to explain basic concepts of Node.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['libuv', 'threadpool']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Node.js', 
  'technical', 
  'backend', 
  'Node.js memory leaks profiling using heap dumps and inspect.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Node.js memory leaks profiling using heap dumps and inspect.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["memory-leak","profiling","best practices","performance"],"correct_approach":"The correct technical approach for \"Node.js memory leaks profiling using heap dumps and inspect.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Node.js memory leaks profiling using heap dumps and inspect.\" in your past work?","red_flags":["Fails to explain basic concepts of Node.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['memory-leak', 'profiling']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Node.js', 
  'technical', 
  'backend', 
  'Handling process crashes using uncaughtException and exit code.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Handling process crashes using uncaughtException and exit code.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["process","error-handling","best practices","performance"],"correct_approach":"The correct technical approach for \"Handling process crashes using uncaughtException and exit code.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Handling process crashes using uncaughtException and exit code.\" in your past work?","red_flags":["Fails to explain basic concepts of Node.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['process', 'error-handling']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Node.js', 
  'technical', 
  'backend', 
  'Node path utility: resolve vs join vs relative directories.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Node path utility: resolve vs join vs relative directories.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["path","filesystem","best practices","performance"],"correct_approach":"The correct technical approach for \"Node path utility: resolve vs join vs relative directories.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Node path utility: resolve vs join vs relative directories.\" in your past work?","red_flags":["Fails to explain basic concepts of Node.js","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['path', 'filesystem']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'SQL/PostgreSQL', 
  'technical', 
  'databases', 
  'Database indexing: B-Tree vs Hash index structures and limits.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Database indexing: B-Tree vs Hash index structures and limits.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["indexing","performance","best practices","performance"],"correct_approach":"The correct technical approach for \"Database indexing: B-Tree vs Hash index structures and limits.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Database indexing: B-Tree vs Hash index structures and limits.\" in your past work?","red_flags":["Fails to explain basic concepts of SQL/PostgreSQL","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['indexing', 'performance']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'SQL/PostgreSQL', 
  'technical', 
  'databases', 
  'Transaction isolation levels: Read Committed vs Serializable.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Transaction isolation levels: Read Committed vs Serializable.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["transactions","acid","best practices","performance"],"correct_approach":"The correct technical approach for \"Transaction isolation levels: Read Committed vs Serializable.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Transaction isolation levels: Read Committed vs Serializable.\" in your past work?","red_flags":["Fails to explain basic concepts of SQL/PostgreSQL","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['transactions', 'acid']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'SQL/PostgreSQL', 
  'technical', 
  'databases', 
  'Inner Join vs Left Join vs Full Join comparison.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Inner Join vs Left Join vs Full Join comparison.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["joins","queries","best practices","performance"],"correct_approach":"The correct technical approach for \"Inner Join vs Left Join vs Full Join comparison.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Inner Join vs Left Join vs Full Join comparison.\" in your past work?","red_flags":["Fails to explain basic concepts of SQL/PostgreSQL","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['joins', 'queries']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'SQL/PostgreSQL', 
  'technical', 
  'databases', 
  'Window Functions: ROW_NUMBER() vs RANK() vs DENSE_RANK().', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Window Functions: ROW_NUMBER() vs RANK() vs DENSE_RANK().\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["window-functions","analytics","best practices","performance"],"correct_approach":"The correct technical approach for \"Window Functions: ROW_NUMBER() vs RANK() vs DENSE_RANK().\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Window Functions: ROW_NUMBER() vs RANK() vs DENSE_RANK().\" in your past work?","red_flags":["Fails to explain basic concepts of SQL/PostgreSQL","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['window-functions', 'analytics']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'SQL/PostgreSQL', 
  'technical', 
  'databases', 
  'Explain Plan analysis: identifying sequential scans and index hits.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Explain Plan analysis: identifying sequential scans and index hits.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["query-optimization","explain","best practices","performance"],"correct_approach":"The correct technical approach for \"Explain Plan analysis: identifying sequential scans and index hits.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Explain Plan analysis: identifying sequential scans and index hits.\" in your past work?","red_flags":["Fails to explain basic concepts of SQL/PostgreSQL","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['query-optimization', 'explain']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'SQL/PostgreSQL', 
  'technical', 
  'databases', 
  'Primary Key vs Unique Key constraint differences.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Primary Key vs Unique Key constraint differences.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["keys","constraints","best practices","performance"],"correct_approach":"The correct technical approach for \"Primary Key vs Unique Key constraint differences.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Primary Key vs Unique Key constraint differences.\" in your past work?","red_flags":["Fails to explain basic concepts of SQL/PostgreSQL","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['keys', 'constraints']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'SQL/PostgreSQL', 
  'technical', 
  'databases', 
  'ACID properties: Atomicity, Consistency, Isolation, Durability.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"ACID properties: Atomicity, Consistency, Isolation, Durability.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["acid","transactions","best practices","performance"],"correct_approach":"The correct technical approach for \"ACID properties: Atomicity, Consistency, Isolation, Durability.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"ACID properties: Atomicity, Consistency, Isolation, Durability.\" in your past work?","red_flags":["Fails to explain basic concepts of SQL/PostgreSQL","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['acid', 'transactions']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'SQL/PostgreSQL', 
  'technical', 
  'databases', 
  'Foreign Keys: ON DELETE CASCADE vs ON DELETE SET NULL.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Foreign Keys: ON DELETE CASCADE vs ON DELETE SET NULL.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["keys","cascade","best practices","performance"],"correct_approach":"The correct technical approach for \"Foreign Keys: ON DELETE CASCADE vs ON DELETE SET NULL.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Foreign Keys: ON DELETE CASCADE vs ON DELETE SET NULL.\" in your past work?","red_flags":["Fails to explain basic concepts of SQL/PostgreSQL","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['keys', 'cascade']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'SQL/PostgreSQL', 
  'technical', 
  'databases', 
  'Database normalization: 1NF, 2NF, and 3NF database designs.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Database normalization: 1NF, 2NF, and 3NF database designs.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["normalization","design","best practices","performance"],"correct_approach":"The correct technical approach for \"Database normalization: 1NF, 2NF, and 3NF database designs.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Database normalization: 1NF, 2NF, and 3NF database designs.\" in your past work?","red_flags":["Fails to explain basic concepts of SQL/PostgreSQL","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['normalization', 'design']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'SQL/PostgreSQL', 
  'technical', 
  'databases', 
  'PostgreSQL JSONB columns vs JSON text performance.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"PostgreSQL JSONB columns vs JSON text performance.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["jsonb","postgresql","best practices","performance"],"correct_approach":"The correct technical approach for \"PostgreSQL JSONB columns vs JSON text performance.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"PostgreSQL JSONB columns vs JSON text performance.\" in your past work?","red_flags":["Fails to explain basic concepts of SQL/PostgreSQL","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['jsonb', 'postgresql']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'MongoDB', 
  'technical', 
  'databases', 
  'NoSQL document store vs Relational databases, trade-offs.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"NoSQL document store vs Relational databases, trade-offs.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["nosql","comparison","best practices","performance"],"correct_approach":"The correct technical approach for \"NoSQL document store vs Relational databases, trade-offs.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"NoSQL document store vs Relational databases, trade-offs.\" in your past work?","red_flags":["Fails to explain basic concepts of MongoDB","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['nosql', 'comparison']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'MongoDB', 
  'technical', 
  'databases', 
  'MongoDB indexing: Single Field vs Compound indexes, prefix rule.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"MongoDB indexing: Single Field vs Compound indexes, prefix rule.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["indexing","performance","best practices","performance"],"correct_approach":"The correct technical approach for \"MongoDB indexing: Single Field vs Compound indexes, prefix rule.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"MongoDB indexing: Single Field vs Compound indexes, prefix rule.\" in your past work?","red_flags":["Fails to explain basic concepts of MongoDB","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['indexing', 'performance']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'MongoDB', 
  'technical', 
  'databases', 
  'Aggregation Pipeline: match, group, project, and lookup stages.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Aggregation Pipeline: match, group, project, and lookup stages.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["aggregation","queries","best practices","performance"],"correct_approach":"The correct technical approach for \"Aggregation Pipeline: match, group, project, and lookup stages.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Aggregation Pipeline: match, group, project, and lookup stages.\" in your past work?","red_flags":["Fails to explain basic concepts of MongoDB","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['aggregation', 'queries']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'MongoDB', 
  'technical', 
  'databases', 
  'Document referencing (joins) vs nesting (embedding) schema design.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Document referencing (joins) vs nesting (embedding) schema design.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["schema-design","embedding","best practices","performance"],"correct_approach":"The correct technical approach for \"Document referencing (joins) vs nesting (embedding) schema design.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Document referencing (joins) vs nesting (embedding) schema design.\" in your past work?","red_flags":["Fails to explain basic concepts of MongoDB","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['schema-design', 'embedding']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'MongoDB', 
  'technical', 
  'databases', 
  'Replica Sets: primary election, secondary syncing, high availability.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Replica Sets: primary election, secondary syncing, high availability.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["replication","replica-set","best practices","performance"],"correct_approach":"The correct technical approach for \"Replica Sets: primary election, secondary syncing, high availability.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Replica Sets: primary election, secondary syncing, high availability.\" in your past work?","red_flags":["Fails to explain basic concepts of MongoDB","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['replication', 'replica-set']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'MongoDB', 
  'technical', 
  'databases', 
  'Sharding: partition key selection and horizontal scaling.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Sharding: partition key selection and horizontal scaling.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["sharding","scaling","best practices","performance"],"correct_approach":"The correct technical approach for \"Sharding: partition key selection and horizontal scaling.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Sharding: partition key selection and horizontal scaling.\" in your past work?","red_flags":["Fails to explain basic concepts of MongoDB","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['sharding', 'scaling']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'MongoDB', 
  'technical', 
  'databases', 
  'Mongoose middleware (pre/post hooks) and schema validations.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Mongoose middleware (pre/post hooks) and schema validations.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["mongoose","orm","best practices","performance"],"correct_approach":"The correct technical approach for \"Mongoose middleware (pre/post hooks) and schema validations.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Mongoose middleware (pre/post hooks) and schema validations.\" in your past work?","red_flags":["Fails to explain basic concepts of MongoDB","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['mongoose', 'orm']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'MongoDB', 
  'technical', 
  'databases', 
  'Transactions in MongoDB: multi-document ACID transactions.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Transactions in MongoDB: multi-document ACID transactions.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["transactions","acid","best practices","performance"],"correct_approach":"The correct technical approach for \"Transactions in MongoDB: multi-document ACID transactions.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Transactions in MongoDB: multi-document ACID transactions.\" in your past work?","red_flags":["Fails to explain basic concepts of MongoDB","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['transactions', 'acid']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'MongoDB', 
  'technical', 
  'databases', 
  'Cursor operations: skip, limit, and sort pagination optimization.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Cursor operations: skip, limit, and sort pagination optimization.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["pagination","performance","best practices","performance"],"correct_approach":"The correct technical approach for \"Cursor operations: skip, limit, and sort pagination optimization.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Cursor operations: skip, limit, and sort pagination optimization.\" in your past work?","red_flags":["Fails to explain basic concepts of MongoDB","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['pagination', 'performance']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'MongoDB', 
  'technical', 
  'databases', 
  'MongoDB Write Concerns: acknowledged, wmajority, and journaled.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"MongoDB Write Concerns: acknowledged, wmajority, and journaled.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["write-concern","replication","best practices","performance"],"correct_approach":"The correct technical approach for \"MongoDB Write Concerns: acknowledged, wmajority, and journaled.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"MongoDB Write Concerns: acknowledged, wmajority, and journaled.\" in your past work?","red_flags":["Fails to explain basic concepts of MongoDB","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['write-concern', 'replication']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'System Design', 
  'technical', 
  'cs-fundamentals', 
  'Rate Limiter design: Token Bucket vs Leaky Bucket algorithms.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Rate Limiter design: Token Bucket vs Leaky Bucket algorithms.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["rate-limiting","scaling","best practices","performance"],"correct_approach":"The correct technical approach for \"Rate Limiter design: Token Bucket vs Leaky Bucket algorithms.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Rate Limiter design: Token Bucket vs Leaky Bucket algorithms.\" in your past work?","red_flags":["Fails to explain basic concepts of System Design","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['rate-limiting', 'scaling']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'System Design', 
  'technical', 
  'cs-fundamentals', 
  'Load Balancers: Round Robin vs Least Connections vs Layer 4/7.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Load Balancers: Round Robin vs Least Connections vs Layer 4/7.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["load-balancing","scaling","best practices","performance"],"correct_approach":"The correct technical approach for \"Load Balancers: Round Robin vs Least Connections vs Layer 4/7.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Load Balancers: Round Robin vs Least Connections vs Layer 4/7.\" in your past work?","red_flags":["Fails to explain basic concepts of System Design","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['load-balancing', 'scaling']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'System Design', 
  'technical', 
  'databases', 
  'Database Sharding: horizontal scaling vs master-slave replication.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Database Sharding: horizontal scaling vs master-slave replication.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["sharding","replication","best practices","performance"],"correct_approach":"The correct technical approach for \"Database Sharding: horizontal scaling vs master-slave replication.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Database Sharding: horizontal scaling vs master-slave replication.\" in your past work?","red_flags":["Fails to explain basic concepts of System Design","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['sharding', 'replication']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'System Design', 
  'technical', 
  'cs-fundamentals', 
  'CDN systems: edge locations, cache invalidation, and latency.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"CDN systems: edge locations, cache invalidation, and latency.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["cdn","caching","best practices","performance"],"correct_approach":"The correct technical approach for \"CDN systems: edge locations, cache invalidation, and latency.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"CDN systems: edge locations, cache invalidation, and latency.\" in your past work?","red_flags":["Fails to explain basic concepts of System Design","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['cdn', 'caching']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'System Design', 
  'technical', 
  'cs-fundamentals', 
  'Caching strategies: Write-Through vs Write-Back vs Cache-Aside.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Caching strategies: Write-Through vs Write-Back vs Cache-Aside.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["caching","memcached","best practices","performance"],"correct_approach":"The correct technical approach for \"Caching strategies: Write-Through vs Write-Back vs Cache-Aside.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Caching strategies: Write-Through vs Write-Back vs Cache-Aside.\" in your past work?","red_flags":["Fails to explain basic concepts of System Design","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['caching', 'memcached']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'System Design', 
  'technical', 
  'cs-fundamentals', 
  'Consistent Hashing: node mapping, virtual nodes, and routing.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Consistent Hashing: node mapping, virtual nodes, and routing.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["hashing","scaling","best practices","performance"],"correct_approach":"The correct technical approach for \"Consistent Hashing: node mapping, virtual nodes, and routing.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Consistent Hashing: node mapping, virtual nodes, and routing.\" in your past work?","red_flags":["Fails to explain basic concepts of System Design","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['hashing', 'scaling']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'System Design', 
  'technical', 
  'cs-fundamentals', 
  'Microservices Architecture: API Gateway, service discovery, mesh.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Microservices Architecture: API Gateway, service discovery, mesh.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["microservices","api-gateway","best practices","performance"],"correct_approach":"The correct technical approach for \"Microservices Architecture: API Gateway, service discovery, mesh.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Microservices Architecture: API Gateway, service discovery, mesh.\" in your past work?","red_flags":["Fails to explain basic concepts of System Design","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['microservices', 'api-gateway']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'System Design', 
  'technical', 
  'cs-fundamentals', 
  'Horizontal scaling vs Vertical scaling CPU/RAM constraints.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Horizontal scaling vs Vertical scaling CPU/RAM constraints.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["scaling","infrastructure","best practices","performance"],"correct_approach":"The correct technical approach for \"Horizontal scaling vs Vertical scaling CPU/RAM constraints.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Horizontal scaling vs Vertical scaling CPU/RAM constraints.\" in your past work?","red_flags":["Fails to explain basic concepts of System Design","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['scaling', 'infrastructure']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'System Design', 
  'technical', 
  'cs-fundamentals', 
  'Monolithic vs Microservices modularity and maintenance.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Monolithic vs Microservices modularity and maintenance.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["architecture","microservices","best practices","performance"],"correct_approach":"The correct technical approach for \"Monolithic vs Microservices modularity and maintenance.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Monolithic vs Microservices modularity and maintenance.\" in your past work?","red_flags":["Fails to explain basic concepts of System Design","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['architecture', 'microservices']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'System Design', 
  'technical', 
  'cs-fundamentals', 
  'Message Queues: Kafka log offsets vs RabbitMQ push message routing.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Message Queues: Kafka log offsets vs RabbitMQ push message routing.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["message-queue","kafka","best practices","performance"],"correct_approach":"The correct technical approach for \"Message Queues: Kafka log offsets vs RabbitMQ push message routing.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Message Queues: Kafka log offsets vs RabbitMQ push message routing.\" in your past work?","red_flags":["Fails to explain basic concepts of System Design","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['message-queue', 'kafka']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Data Structures', 
  'technical', 
  'cs-fundamentals', 
  'Singly Linked List vs Doubly Linked List node links.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Singly Linked List vs Doubly Linked List node links.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["linked-list","nodes","best practices","performance"],"correct_approach":"The correct technical approach for \"Singly Linked List vs Doubly Linked List node links.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Singly Linked List vs Doubly Linked List node links.\" in your past work?","red_flags":["Fails to explain basic concepts of Data Structures","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['linked-list', 'nodes']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Data Structures', 
  'technical', 
  'cs-fundamentals', 
  'Hash Map collisions resolution: chaining vs open addressing.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Hash Map collisions resolution: chaining vs open addressing.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["hashmap","collisions","best practices","performance"],"correct_approach":"The correct technical approach for \"Hash Map collisions resolution: chaining vs open addressing.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Hash Map collisions resolution: chaining vs open addressing.\" in your past work?","red_flags":["Fails to explain basic concepts of Data Structures","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['hashmap', 'collisions']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Data Structures', 
  'technical', 
  'cs-fundamentals', 
  'Stack vs Queue: FIFO vs LIFO memory and pointers.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Stack vs Queue: FIFO vs LIFO memory and pointers.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["stack","queue","best practices","performance"],"correct_approach":"The correct technical approach for \"Stack vs Queue: FIFO vs LIFO memory and pointers.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Stack vs Queue: FIFO vs LIFO memory and pointers.\" in your past work?","red_flags":["Fails to explain basic concepts of Data Structures","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['stack', 'queue']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Data Structures', 
  'technical', 
  'cs-fundamentals', 
  'Binary Search Tree (BST) properties and search complexity.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Binary Search Tree (BST) properties and search complexity.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["bst","binary-tree","best practices","performance"],"correct_approach":"The correct technical approach for \"Binary Search Tree (BST) properties and search complexity.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Binary Search Tree (BST) properties and search complexity.\" in your past work?","red_flags":["Fails to explain basic concepts of Data Structures","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['bst', 'binary-tree']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Data Structures', 
  'technical', 
  'cs-fundamentals', 
  'Array vs Linked List: cache locality and random access index.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Array vs Linked List: cache locality and random access index.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["array","linked-list","best practices","performance"],"correct_approach":"The correct technical approach for \"Array vs Linked List: cache locality and random access index.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Array vs Linked List: cache locality and random access index.\" in your past work?","red_flags":["Fails to explain basic concepts of Data Structures","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['array', 'linked-list']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Data Structures', 
  'technical', 
  'cs-fundamentals', 
  'Graph representation: Adjacency List vs Adjacency Matrix.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Graph representation: Adjacency List vs Adjacency Matrix.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["graphs","adjacency","best practices","performance"],"correct_approach":"The correct technical approach for \"Graph representation: Adjacency List vs Adjacency Matrix.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Graph representation: Adjacency List vs Adjacency Matrix.\" in your past work?","red_flags":["Fails to explain basic concepts of Data Structures","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['graphs', 'adjacency']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Data Structures', 
  'technical', 
  'cs-fundamentals', 
  'Trie data structure: autocomplete dictionary word prefix matching.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Trie data structure: autocomplete dictionary word prefix matching.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["trie","autocomplete","best practices","performance"],"correct_approach":"The correct technical approach for \"Trie data structure: autocomplete dictionary word prefix matching.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Trie data structure: autocomplete dictionary word prefix matching.\" in your past work?","red_flags":["Fails to explain basic concepts of Data Structures","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['trie', 'autocomplete']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Data Structures', 
  'technical', 
  'cs-fundamentals', 
  'Min-Heap vs Max-Heap binary tree bubble up insertion logic.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Min-Heap vs Max-Heap binary tree bubble up insertion logic.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["heap","priority-queue","best practices","performance"],"correct_approach":"The correct technical approach for \"Min-Heap vs Max-Heap binary tree bubble up insertion logic.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Min-Heap vs Max-Heap binary tree bubble up insertion logic.\" in your past work?","red_flags":["Fails to explain basic concepts of Data Structures","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['heap', 'priority-queue']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Data Structures', 
  'technical', 
  'cs-fundamentals', 
  'Circular Queue implementation using modulo pointer math.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Circular Queue implementation using modulo pointer math.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["queue","circular","best practices","performance"],"correct_approach":"The correct technical approach for \"Circular Queue implementation using modulo pointer math.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Circular Queue implementation using modulo pointer math.\" in your past work?","red_flags":["Fails to explain basic concepts of Data Structures","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['queue', 'circular']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Data Structures', 
  'technical', 
  'cs-fundamentals', 
  'Balanced Trees: AVL Tree vs Red-Black Tree rotation rules.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Balanced Trees: AVL Tree vs Red-Black Tree rotation rules.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["avl","red-black","best practices","performance"],"correct_approach":"The correct technical approach for \"Balanced Trees: AVL Tree vs Red-Black Tree rotation rules.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Balanced Trees: AVL Tree vs Red-Black Tree rotation rules.\" in your past work?","red_flags":["Fails to explain basic concepts of Data Structures","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['avl', 'red-black']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Algorithms', 
  'technical', 
  'cs-fundamentals', 
  'Binary Search algorithm implementation on sorted collections.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Binary Search algorithm implementation on sorted collections.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["search","binary-search","best practices","performance"],"correct_approach":"The correct technical approach for \"Binary Search algorithm implementation on sorted collections.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Binary Search algorithm implementation on sorted collections.\" in your past work?","red_flags":["Fails to explain basic concepts of Algorithms","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['search', 'binary-search']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Algorithms', 
  'technical', 
  'cs-fundamentals', 
  'Quick Sort vs Merge Sort: recursion, time complexity, and memory.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Quick Sort vs Merge Sort: recursion, time complexity, and memory.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["sorting","divide-and-conquer","best practices","performance"],"correct_approach":"The correct technical approach for \"Quick Sort vs Merge Sort: recursion, time complexity, and memory.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Quick Sort vs Merge Sort: recursion, time complexity, and memory.\" in your past work?","red_flags":["Fails to explain basic concepts of Algorithms","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['sorting', 'divide-and-conquer']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Algorithms', 
  'technical', 
  'cs-fundamentals', 
  'Breadth-First Search (BFS) vs Depth-First Search (DFS) on graph.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Breadth-First Search (BFS) vs Depth-First Search (DFS) on graph.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["graphs","dfs-bfs","best practices","performance"],"correct_approach":"The correct technical approach for \"Breadth-First Search (BFS) vs Depth-First Search (DFS) on graph.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Breadth-First Search (BFS) vs Depth-First Search (DFS) on graph.\" in your past work?","red_flags":["Fails to explain basic concepts of Algorithms","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['graphs', 'dfs-bfs']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Algorithms', 
  'technical', 
  'cs-fundamentals', 
  'Dijkstra''s shortest path algorithm: edge weights and relaxation.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Dijkstra''s shortest path algorithm: edge weights and relaxation.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["dijkstra","graphs","best practices","performance"],"correct_approach":"The correct technical approach for \"Dijkstra''s shortest path algorithm: edge weights and relaxation.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Dijkstra''s shortest path algorithm: edge weights and relaxation.\" in your past work?","red_flags":["Fails to explain basic concepts of Algorithms","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['dijkstra', 'graphs']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Algorithms', 
  'technical', 
  'cs-fundamentals', 
  'Dynamic Programming: memoization vs tabulation optimization.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Dynamic Programming: memoization vs tabulation optimization.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["dynamic-programming","memoization","best practices","performance"],"correct_approach":"The correct technical approach for \"Dynamic Programming: memoization vs tabulation optimization.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Dynamic Programming: memoization vs tabulation optimization.\" in your past work?","red_flags":["Fails to explain basic concepts of Algorithms","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['dynamic-programming', 'memoization']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Algorithms', 
  'technical', 
  'cs-fundamentals', 
  'Sliding Window technique: sub-array maximums and string matches.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Sliding Window technique: sub-array maximums and string matches.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["sliding-window","array","best practices","performance"],"correct_approach":"The correct technical approach for \"Sliding Window technique: sub-array maximums and string matches.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Sliding Window technique: sub-array maximums and string matches.\" in your past work?","red_flags":["Fails to explain basic concepts of Algorithms","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['sliding-window', 'array']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Algorithms', 
  'technical', 
  'cs-fundamentals', 
  'Two Pointers approach: checking palindromes or reversing lists.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Two Pointers approach: checking palindromes or reversing lists.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["two-pointers","in-place","best practices","performance"],"correct_approach":"The correct technical approach for \"Two Pointers approach: checking palindromes or reversing lists.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Two Pointers approach: checking palindromes or reversing lists.\" in your past work?","red_flags":["Fails to explain basic concepts of Algorithms","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['two-pointers', 'in-place']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Algorithms', 
  'technical', 
  'cs-fundamentals', 
  'Greedy Algorithms vs Dynamic Programming: optimal substructure.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Greedy Algorithms vs Dynamic Programming: optimal substructure.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["greedy","algorithms","best practices","performance"],"correct_approach":"The correct technical approach for \"Greedy Algorithms vs Dynamic Programming: optimal substructure.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Greedy Algorithms vs Dynamic Programming: optimal substructure.\" in your past work?","red_flags":["Fails to explain basic concepts of Algorithms","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['greedy', 'algorithms']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Algorithms', 
  'technical', 
  'cs-fundamentals', 
  'Floyd''s Cycle-Finding algorithm: slow and fast pointer loop.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Floyd''s Cycle-Finding algorithm: slow and fast pointer loop.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["cycle-detection","pointers","best practices","performance"],"correct_approach":"The correct technical approach for \"Floyd''s Cycle-Finding algorithm: slow and fast pointer loop.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Floyd''s Cycle-Finding algorithm: slow and fast pointer loop.\" in your past work?","red_flags":["Fails to explain basic concepts of Algorithms","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['cycle-detection', 'pointers']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Algorithms', 
  'technical', 
  'cs-fundamentals', 
  'Kruskal''s vs Prim''s Minimum Spanning Tree (MST) algorithms.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Kruskal''s vs Prim''s Minimum Spanning Tree (MST) algorithms.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["mst","prim-kruskal","best practices","performance"],"correct_approach":"The correct technical approach for \"Kruskal''s vs Prim''s Minimum Spanning Tree (MST) algorithms.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Kruskal''s vs Prim''s Minimum Spanning Tree (MST) algorithms.\" in your past work?","red_flags":["Fails to explain basic concepts of Algorithms","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['mst', 'prim-kruskal']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'REST APIs', 
  'technical', 
  'backend', 
  'REST API HTTP Methods: GET, POST, PUT, DELETE, PATCH usage.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"REST API HTTP Methods: GET, POST, PUT, DELETE, PATCH usage.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["rest","http","best practices","performance"],"correct_approach":"The correct technical approach for \"REST API HTTP Methods: GET, POST, PUT, DELETE, PATCH usage.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"REST API HTTP Methods: GET, POST, PUT, DELETE, PATCH usage.\" in your past work?","red_flags":["Fails to explain basic concepts of REST APIs","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['rest', 'http']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'REST APIs', 
  'technical', 
  'backend', 
  'HTTP Status codes: 200 vs 201, 400 vs 401 vs 403, 500 series.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"HTTP Status codes: 200 vs 201, 400 vs 401 vs 403, 500 series.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["status-codes","http","best practices","performance"],"correct_approach":"The correct technical approach for \"HTTP Status codes: 200 vs 201, 400 vs 401 vs 403, 500 series.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"HTTP Status codes: 200 vs 201, 400 vs 401 vs 403, 500 series.\" in your past work?","red_flags":["Fails to explain basic concepts of REST APIs","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['status-codes', 'http']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'REST APIs', 
  'technical', 
  'backend', 
  'Idempotency in REST APIs: which HTTP methods are idempotent.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Idempotency in REST APIs: which HTTP methods are idempotent.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["idempotency","rest","best practices","performance"],"correct_approach":"The correct technical approach for \"Idempotency in REST APIs: which HTTP methods are idempotent.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Idempotency in REST APIs: which HTTP methods are idempotent.\" in your past work?","red_flags":["Fails to explain basic concepts of REST APIs","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['idempotency', 'rest']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'REST APIs', 
  'technical', 
  'backend', 
  'REST API Pagination: Offset vs Cursor/Keyset pagination scaling.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"REST API Pagination: Offset vs Cursor/Keyset pagination scaling.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["pagination","scaling","best practices","performance"],"correct_approach":"The correct technical approach for \"REST API Pagination: Offset vs Cursor/Keyset pagination scaling.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"REST API Pagination: Offset vs Cursor/Keyset pagination scaling.\" in your past work?","red_flags":["Fails to explain basic concepts of REST APIs","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['pagination', 'scaling']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'REST APIs', 
  'technical', 
  'backend', 
  'REST API Security: OAuth2, JWT tokens, and CORS configurations.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"REST API Security: OAuth2, JWT tokens, and CORS configurations.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["jwt","cors","best practices","performance"],"correct_approach":"The correct technical approach for \"REST API Security: OAuth2, JWT tokens, and CORS configurations.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"REST API Security: OAuth2, JWT tokens, and CORS configurations.\" in your past work?","red_flags":["Fails to explain basic concepts of REST APIs","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['jwt', 'cors']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'REST APIs', 
  'technical', 
  'backend', 
  'Rate limiting APIs: client headers (Retry-After, X-RateLimit).', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Rate limiting APIs: client headers (Retry-After, X-RateLimit).\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["rate-limiting","headers","best practices","performance"],"correct_approach":"The correct technical approach for \"Rate limiting APIs: client headers (Retry-After, X-RateLimit).\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Rate limiting APIs: client headers (Retry-After, X-RateLimit).\" in your past work?","red_flags":["Fails to explain basic concepts of REST APIs","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['rate-limiting', 'headers']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'REST APIs', 
  'technical', 
  'backend', 
  'REST API versioning: URI versioning vs Custom Header versioning.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"REST API versioning: URI versioning vs Custom Header versioning.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["versioning","rest","best practices","performance"],"correct_approach":"The correct technical approach for \"REST API versioning: URI versioning vs Custom Header versioning.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"REST API versioning: URI versioning vs Custom Header versioning.\" in your past work?","red_flags":["Fails to explain basic concepts of REST APIs","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['versioning', 'rest']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'REST APIs', 
  'technical', 
  'backend', 
  'GraphQL vs REST APIs: over-fetching and under-fetching limits.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"GraphQL vs REST APIs: over-fetching and under-fetching limits.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["graphql","comparison","best practices","performance"],"correct_approach":"The correct technical approach for \"GraphQL vs REST APIs: over-fetching and under-fetching limits.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"GraphQL vs REST APIs: over-fetching and under-fetching limits.\" in your past work?","red_flags":["Fails to explain basic concepts of REST APIs","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['graphql', 'comparison']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'REST APIs', 
  'technical', 
  'backend', 
  'Optimistic Locking vs Pessimistic Locking in concurrent APIs.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Optimistic Locking vs Pessimistic Locking in concurrent APIs.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["locking","concurrency","best practices","performance"],"correct_approach":"The correct technical approach for \"Optimistic Locking vs Pessimistic Locking in concurrent APIs.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Optimistic Locking vs Pessimistic Locking in concurrent APIs.\" in your past work?","red_flags":["Fails to explain basic concepts of REST APIs","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['locking', 'concurrency']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'REST APIs', 
  'technical', 
  'backend', 
  'REST API payload design: filtering, sorting, and nested models.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"REST API payload design: filtering, sorting, and nested models.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["rest-design","query","best practices","performance"],"correct_approach":"The correct technical approach for \"REST API payload design: filtering, sorting, and nested models.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"REST API payload design: filtering, sorting, and nested models.\" in your past work?","red_flags":["Fails to explain basic concepts of REST APIs","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['rest-design', 'query']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Docker', 
  'technical', 
  'devops', 
  'Docker Image vs Docker Container filesystem namespaces.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Docker Image vs Docker Container filesystem namespaces.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["docker","basics","best practices","performance"],"correct_approach":"The correct technical approach for \"Docker Image vs Docker Container filesystem namespaces.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Docker Image vs Docker Container filesystem namespaces.\" in your past work?","red_flags":["Fails to explain basic concepts of Docker","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['docker', 'basics']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Docker', 
  'technical', 
  'devops', 
  'Docker Multi-stage Builds: optimizing production image sizes.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Docker Multi-stage Builds: optimizing production image sizes.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["multi-stage","optimization","best practices","performance"],"correct_approach":"The correct technical approach for \"Docker Multi-stage Builds: optimizing production image sizes.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Docker Multi-stage Builds: optimizing production image sizes.\" in your past work?","red_flags":["Fails to explain basic concepts of Docker","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['multi-stage', 'optimization']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Docker', 
  'technical', 
  'devops', 
  'Docker Compose: local service dependencies, networks, volumes.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Docker Compose: local service dependencies, networks, volumes.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["docker-compose","networking","best practices","performance"],"correct_approach":"The correct technical approach for \"Docker Compose: local service dependencies, networks, volumes.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Docker Compose: local service dependencies, networks, volumes.\" in your past work?","red_flags":["Fails to explain basic concepts of Docker","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['docker-compose', 'networking']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Docker', 
  'technical', 
  'devops', 
  'Docker Volume storage: Bind Mount vs Named Volume persistence.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Docker Volume storage: Bind Mount vs Named Volume persistence.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["volumes","storage","best practices","performance"],"correct_approach":"The correct technical approach for \"Docker Volume storage: Bind Mount vs Named Volume persistence.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Docker Volume storage: Bind Mount vs Named Volume persistence.\" in your past work?","red_flags":["Fails to explain basic concepts of Docker","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['volumes', 'storage']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Docker', 
  'technical', 
  'devops', 
  'Docker networking: Bridge vs Host vs Overlay network isolation.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Docker networking: Bridge vs Host vs Overlay network isolation.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["networking","networks","best practices","performance"],"correct_approach":"The correct technical approach for \"Docker networking: Bridge vs Host vs Overlay network isolation.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Docker networking: Bridge vs Host vs Overlay network isolation.\" in your past work?","red_flags":["Fails to explain basic concepts of Docker","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['networking', 'networks']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Docker', 
  'technical', 
  'devops', 
  'Caching Docker layers: instruction ordering in Dockerfile.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Caching Docker layers: instruction ordering in Dockerfile.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["caching","dockerfile","best practices","performance"],"correct_approach":"The correct technical approach for \"Caching Docker layers: instruction ordering in Dockerfile.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Caching Docker layers: instruction ordering in Dockerfile.\" in your past work?","red_flags":["Fails to explain basic concepts of Docker","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['caching', 'dockerfile']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Docker', 
  'technical', 
  'devops', 
  'Running Docker rootless: security implications and UID maps.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Running Docker rootless: security implications and UID maps.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["security","rootless","best practices","performance"],"correct_approach":"The correct technical approach for \"Running Docker rootless: security implications and UID maps.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Running Docker rootless: security implications and UID maps.\" in your past work?","red_flags":["Fails to explain basic concepts of Docker","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['security', 'rootless']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Docker', 
  'technical', 
  'devops', 
  'Docker entrypoint vs cmd instruction override hierarchy.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Docker entrypoint vs cmd instruction override hierarchy.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["entrypoint","cmd","best practices","performance"],"correct_approach":"The correct technical approach for \"Docker entrypoint vs cmd instruction override hierarchy.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Docker entrypoint vs cmd instruction override hierarchy.\" in your past work?","red_flags":["Fails to explain basic concepts of Docker","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['entrypoint', 'cmd']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Docker', 
  'technical', 
  'devops', 
  'Docker Swarm vs Kubernetes basic container orchestration.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Docker Swarm vs Kubernetes basic container orchestration.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["orchestration","swarm","best practices","performance"],"correct_approach":"The correct technical approach for \"Docker Swarm vs Kubernetes basic container orchestration.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Docker Swarm vs Kubernetes basic container orchestration.\" in your past work?","red_flags":["Fails to explain basic concepts of Docker","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['orchestration', 'swarm']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Docker', 
  'technical', 
  'devops', 
  'Handling environment secrets in Docker run and Dockerfile.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Handling environment secrets in Docker run and Dockerfile.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["secrets","security","best practices","performance"],"correct_approach":"The correct technical approach for \"Handling environment secrets in Docker run and Dockerfile.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Handling environment secrets in Docker run and Dockerfile.\" in your past work?","red_flags":["Fails to explain basic concepts of Docker","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['secrets', 'security']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Git', 
  'technical', 
  'devops', 
  'Git Rebase vs Git Merge commit histories and conflict math.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Git Rebase vs Git Merge commit histories and conflict math.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["rebase","merge","best practices","performance"],"correct_approach":"The correct technical approach for \"Git Rebase vs Git Merge commit histories and conflict math.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Git Rebase vs Git Merge commit histories and conflict math.\" in your past work?","red_flags":["Fails to explain basic concepts of Git","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['rebase', 'merge']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Git', 
  'technical', 
  'devops', 
  'Git cherry-pick: applying single commits to target branch.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Git cherry-pick: applying single commits to target branch.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["cherry-pick","commits","best practices","performance"],"correct_approach":"The correct technical approach for \"Git cherry-pick: applying single commits to target branch.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Git cherry-pick: applying single commits to target branch.\" in your past work?","red_flags":["Fails to explain basic concepts of Git","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['cherry-pick', 'commits']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Git', 
  'technical', 
  'devops', 
  'Git stash: saving local dirty workspace states temporarily.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Git stash: saving local dirty workspace states temporarily.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["stash","workspace","best practices","performance"],"correct_approach":"The correct technical approach for \"Git stash: saving local dirty workspace states temporarily.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Git stash: saving local dirty workspace states temporarily.\" in your past work?","red_flags":["Fails to explain basic concepts of Git","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['stash', 'workspace']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Git', 
  'technical', 
  'devops', 
  'Resolving Git merge conflicts: local markers and aborting.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Resolving Git merge conflicts: local markers and aborting.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["conflicts","merges","best practices","performance"],"correct_approach":"The correct technical approach for \"Resolving Git merge conflicts: local markers and aborting.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Resolving Git merge conflicts: local markers and aborting.\" in your past work?","red_flags":["Fails to explain basic concepts of Git","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['conflicts', 'merges']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Git', 
  'technical', 
  'devops', 
  'Git Fetch vs Git Pull: network synchronization difference.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Git Fetch vs Git Pull: network synchronization difference.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["fetch","pull","best practices","performance"],"correct_approach":"The correct technical approach for \"Git Fetch vs Git Pull: network synchronization difference.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Git Fetch vs Git Pull: network synchronization difference.\" in your past work?","red_flags":["Fails to explain basic concepts of Git","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['fetch', 'pull']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Git', 
  'technical', 
  'devops', 
  'Git Reflog: recovering deleted commits and branches.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Git Reflog: recovering deleted commits and branches.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["reflog","disaster-recovery","best practices","performance"],"correct_approach":"The correct technical approach for \"Git Reflog: recovering deleted commits and branches.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Git Reflog: recovering deleted commits and branches.\" in your past work?","red_flags":["Fails to explain basic concepts of Git","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['reflog', 'disaster-recovery']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Git', 
  'technical', 
  'devops', 
  'Git hook triggers: pre-commit and pre-push validation setups.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Git hook triggers: pre-commit and pre-push validation setups.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["hooks","pre-commit","best practices","performance"],"correct_approach":"The correct technical approach for \"Git hook triggers: pre-commit and pre-push validation setups.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Git hook triggers: pre-commit and pre-push validation setups.\" in your past work?","red_flags":["Fails to explain basic concepts of Git","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['hooks', 'pre-commit']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Git', 
  'technical', 
  'devops', 
  'Squash commits: cleaning up pull request branch merge histories.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Squash commits: cleaning up pull request branch merge histories.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["squash","pr","best practices","performance"],"correct_approach":"The correct technical approach for \"Squash commits: cleaning up pull request branch merge histories.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Squash commits: cleaning up pull request branch merge histories.\" in your past work?","red_flags":["Fails to explain basic concepts of Git","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['squash', 'pr']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Git', 
  'technical', 
  'devops', 
  'Git Reset (soft, mixed, hard) difference on working tree.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Git Reset (soft, mixed, hard) difference on working tree.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["reset","index","best practices","performance"],"correct_approach":"The correct technical approach for \"Git Reset (soft, mixed, hard) difference on working tree.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Git Reset (soft, mixed, hard) difference on working tree.\" in your past work?","red_flags":["Fails to explain basic concepts of Git","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['reset', 'index']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Git', 
  'technical', 
  'devops', 
  'Git Submodules: managing embedded external repository links.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Git Submodules: managing embedded external repository links.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["submodules","subprojects","best practices","performance"],"correct_approach":"The correct technical approach for \"Git Submodules: managing embedded external repository links.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Git Submodules: managing embedded external repository links.\" in your past work?","red_flags":["Fails to explain basic concepts of Git","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['submodules', 'subprojects']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'OOPS Concepts', 
  'technical', 
  'cs-fundamentals', 
  'Four Pillars of OOP: Encapsulation, Inheritance, Polymorphism, Abstraction.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Four Pillars of OOP: Encapsulation, Inheritance, Polymorphism, Abstraction.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["oop","theory","best practices","performance"],"correct_approach":"The correct technical approach for \"Four Pillars of OOP: Encapsulation, Inheritance, Polymorphism, Abstraction.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Four Pillars of OOP: Encapsulation, Inheritance, Polymorphism, Abstraction.\" in your past work?","red_flags":["Fails to explain basic concepts of OOPS Concepts","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['oop', 'theory']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'OOPS Concepts', 
  'technical', 
  'cs-fundamentals', 
  'Method Overloading (static) vs Method Overriding (dynamic).', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Method Overloading (static) vs Method Overriding (dynamic).\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["overloading","overriding","best practices","performance"],"correct_approach":"The correct technical approach for \"Method Overloading (static) vs Method Overriding (dynamic).\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Method Overloading (static) vs Method Overriding (dynamic).\" in your past work?","red_flags":["Fails to explain basic concepts of OOPS Concepts","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['overloading', 'overriding']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'OOPS Concepts', 
  'technical', 
  'cs-fundamentals', 
  'Abstract Class vs Interface declarations and multi-implementations.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Abstract Class vs Interface declarations and multi-implementations.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["interfaces","abstract","best practices","performance"],"correct_approach":"The correct technical approach for \"Abstract Class vs Interface declarations and multi-implementations.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Abstract Class vs Interface declarations and multi-implementations.\" in your past work?","red_flags":["Fails to explain basic concepts of OOPS Concepts","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['interfaces', 'abstract']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'OOPS Concepts', 
  'technical', 
  'cs-fundamentals', 
  'Composition vs Inheritance: dynamic runtime flexibility.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Composition vs Inheritance: dynamic runtime flexibility.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["composition","inheritance","best practices","performance"],"correct_approach":"The correct technical approach for \"Composition vs Inheritance: dynamic runtime flexibility.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Composition vs Inheritance: dynamic runtime flexibility.\" in your past work?","red_flags":["Fails to explain basic concepts of OOPS Concepts","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['composition', 'inheritance']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'OOPS Concepts', 
  'technical', 
  'cs-fundamentals', 
  'Single Responsibility Principle (SRP) in class design.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Single Responsibility Principle (SRP) in class design.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["solid","srp","best practices","performance"],"correct_approach":"The correct technical approach for \"Single Responsibility Principle (SRP) in class design.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Single Responsibility Principle (SRP) in class design.\" in your past work?","red_flags":["Fails to explain basic concepts of OOPS Concepts","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['solid', 'srp']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'OOPS Concepts', 
  'technical', 
  'cs-fundamentals', 
  'Interface Segregation Principle (ISP) SOLID refactoring.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Interface Segregation Principle (ISP) SOLID refactoring.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["solid","isp","best practices","performance"],"correct_approach":"The correct technical approach for \"Interface Segregation Principle (ISP) SOLID refactoring.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Interface Segregation Principle (ISP) SOLID refactoring.\" in your past work?","red_flags":["Fails to explain basic concepts of OOPS Concepts","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['solid', 'isp']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'OOPS Concepts', 
  'technical', 
  'cs-fundamentals', 
  'Open-Closed Principle (OCP): extending classes without edits.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Open-Closed Principle (OCP): extending classes without edits.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["solid","ocp","best practices","performance"],"correct_approach":"The correct technical approach for \"Open-Closed Principle (OCP): extending classes without edits.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Open-Closed Principle (OCP): extending classes without edits.\" in your past work?","red_flags":["Fails to explain basic concepts of OOPS Concepts","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['solid', 'ocp']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'OOPS Concepts', 
  'technical', 
  'cs-fundamentals', 
  'Liskov Substitution Principle (LSP): subtypes constraints.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Liskov Substitution Principle (LSP): subtypes constraints.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["solid","lsp","best practices","performance"],"correct_approach":"The correct technical approach for \"Liskov Substitution Principle (LSP): subtypes constraints.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Liskov Substitution Principle (LSP): subtypes constraints.\" in your past work?","red_flags":["Fails to explain basic concepts of OOPS Concepts","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['solid', 'lsp']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'OOPS Concepts', 
  'technical', 
  'cs-fundamentals', 
  'Dependency Inversion Principle (DIP) abstraction decoupling.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Dependency Inversion Principle (DIP) abstraction decoupling.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["solid","dip","best practices","performance"],"correct_approach":"The correct technical approach for \"Dependency Inversion Principle (DIP) abstraction decoupling.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Dependency Inversion Principle (DIP) abstraction decoupling.\" in your past work?","red_flags":["Fails to explain basic concepts of OOPS Concepts","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['solid', 'dip']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'OOPS Concepts', 
  'technical', 
  'cs-fundamentals', 
  'Polymorphism: runtime method dispatch and vtable pointers.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Polymorphism: runtime method dispatch and vtable pointers.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["polymorphism","vtable","best practices","performance"],"correct_approach":"The correct technical approach for \"Polymorphism: runtime method dispatch and vtable pointers.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Polymorphism: runtime method dispatch and vtable pointers.\" in your past work?","red_flags":["Fails to explain basic concepts of OOPS Concepts","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['polymorphism', 'vtable']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Operating Systems', 
  'technical', 
  'cs-fundamentals', 
  'Process vs Thread memory sharing, context switch cost.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Process vs Thread memory sharing, context switch cost.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["process","thread","best practices","performance"],"correct_approach":"The correct technical approach for \"Process vs Thread memory sharing, context switch cost.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Process vs Thread memory sharing, context switch cost.\" in your past work?","red_flags":["Fails to explain basic concepts of Operating Systems","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['process', 'thread']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Operating Systems', 
  'technical', 
  'cs-fundamentals', 
  'Virtual Memory: paging, page tables, page faults, thrashing.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Virtual Memory: paging, page tables, page faults, thrashing.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["paging","memory","best practices","performance"],"correct_approach":"The correct technical approach for \"Virtual Memory: paging, page tables, page faults, thrashing.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Virtual Memory: paging, page tables, page faults, thrashing.\" in your past work?","red_flags":["Fails to explain basic concepts of Operating Systems","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['paging', 'memory']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Operating Systems', 
  'technical', 
  'cs-fundamentals', 
  'CPU Scheduling: Shortest Job First vs Round Robin queues.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"CPU Scheduling: Shortest Job First vs Round Robin queues.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["scheduling","cpu","best practices","performance"],"correct_approach":"The correct technical approach for \"CPU Scheduling: Shortest Job First vs Round Robin queues.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"CPU Scheduling: Shortest Job First vs Round Robin queues.\" in your past work?","red_flags":["Fails to explain basic concepts of Operating Systems","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['scheduling', 'cpu']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Operating Systems', 
  'technical', 
  'cs-fundamentals', 
  'Deadlocks: four Coffman conditions and prevention strategies.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Deadlocks: four Coffman conditions and prevention strategies.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["deadlock","coffman","best practices","performance"],"correct_approach":"The correct technical approach for \"Deadlocks: four Coffman conditions and prevention strategies.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Deadlocks: four Coffman conditions and prevention strategies.\" in your past work?","red_flags":["Fails to explain basic concepts of Operating Systems","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['deadlock', 'coffman']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Operating Systems', 
  'technical', 
  'cs-fundamentals', 
  'Mutex vs Semaphore synchronization: ownership difference.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Mutex vs Semaphore synchronization: ownership difference.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["mutex","semaphore","best practices","performance"],"correct_approach":"The correct technical approach for \"Mutex vs Semaphore synchronization: ownership difference.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Mutex vs Semaphore synchronization: ownership difference.\" in your past work?","red_flags":["Fails to explain basic concepts of Operating Systems","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['mutex', 'semaphore']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Operating Systems', 
  'technical', 
  'cs-fundamentals', 
  'System Calls: user space to kernel space mode transitions.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"System Calls: user space to kernel space mode transitions.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["syscall","kernel","best practices","performance"],"correct_approach":"The correct technical approach for \"System Calls: user space to kernel space mode transitions.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"System Calls: user space to kernel space mode transitions.\" in your past work?","red_flags":["Fails to explain basic concepts of Operating Systems","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['syscall', 'kernel']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Operating Systems', 
  'technical', 
  'cs-fundamentals', 
  'Memory fragmentation: internal vs external, compaction.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Memory fragmentation: internal vs external, compaction.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["fragmentation","compaction","best practices","performance"],"correct_approach":"The correct technical approach for \"Memory fragmentation: internal vs external, compaction.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Memory fragmentation: internal vs external, compaction.\" in your past work?","red_flags":["Fails to explain basic concepts of Operating Systems","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['fragmentation', 'compaction']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Operating Systems', 
  'technical', 
  'cs-fundamentals', 
  'RAID arrays: striping vs mirroring performance differences.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"RAID arrays: striping vs mirroring performance differences.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["raid","storage","best practices","performance"],"correct_approach":"The correct technical approach for \"RAID arrays: striping vs mirroring performance differences.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"RAID arrays: striping vs mirroring performance differences.\" in your past work?","red_flags":["Fails to explain basic concepts of Operating Systems","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['raid', 'storage']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Operating Systems', 
  'technical', 
  'cs-fundamentals', 
  'Context Switch: saving register values and reload queues.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Context Switch: saving register values and reload queues.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["context-switch","concurrency","best practices","performance"],"correct_approach":"The correct technical approach for \"Context Switch: saving register values and reload queues.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Context Switch: saving register values and reload queues.\" in your past work?","red_flags":["Fails to explain basic concepts of Operating Systems","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['context-switch', 'concurrency']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Operating Systems', 
  'technical', 
  'cs-fundamentals', 
  'Inter-Process Communication (IPC): pipes vs sockets vs shared memory.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Inter-Process Communication (IPC): pipes vs sockets vs shared memory.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["ipc","sockets","best practices","performance"],"correct_approach":"The correct technical approach for \"Inter-Process Communication (IPC): pipes vs sockets vs shared memory.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Inter-Process Communication (IPC): pipes vs sockets vs shared memory.\" in your past work?","red_flags":["Fails to explain basic concepts of Operating Systems","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['ipc', 'sockets']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Computer Networks', 
  'technical', 
  'cs-fundamentals', 
  'OSI Model: 7 Layers and their corresponding network protocols.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"OSI Model: 7 Layers and their corresponding network protocols.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["osi","protocols","best practices","performance"],"correct_approach":"The correct technical approach for \"OSI Model: 7 Layers and their corresponding network protocols.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"OSI Model: 7 Layers and their corresponding network protocols.\" in your past work?","red_flags":["Fails to explain basic concepts of Computer Networks","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['osi', 'protocols']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Computer Networks', 
  'technical', 
  'cs-fundamentals', 
  'TCP 3-way handshake sequence and connection termination.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"TCP 3-way handshake sequence and connection termination.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["tcp","handshake","best practices","performance"],"correct_approach":"The correct technical approach for \"TCP 3-way handshake sequence and connection termination.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"TCP 3-way handshake sequence and connection termination.\" in your past work?","red_flags":["Fails to explain basic concepts of Computer Networks","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['tcp', 'handshake']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Computer Networks', 
  'technical', 
  'cs-fundamentals', 
  'TCP (connection-oriented) vs UDP (connectionless) comparison.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"TCP (connection-oriented) vs UDP (connectionless) comparison.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["tcp","udp","best practices","performance"],"correct_approach":"The correct technical approach for \"TCP (connection-oriented) vs UDP (connectionless) comparison.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"TCP (connection-oriented) vs UDP (connectionless) comparison.\" in your past work?","red_flags":["Fails to explain basic concepts of Computer Networks","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['tcp', 'udp']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Computer Networks', 
  'technical', 
  'cs-fundamentals', 
  'DNS Resolution: recursive vs iterative queries, cache.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"DNS Resolution: recursive vs iterative queries, cache.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["dns","queries","best practices","performance"],"correct_approach":"The correct technical approach for \"DNS Resolution: recursive vs iterative queries, cache.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"DNS Resolution: recursive vs iterative queries, cache.\" in your past work?","red_flags":["Fails to explain basic concepts of Computer Networks","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['dns', 'queries']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Computer Networks', 
  'technical', 
  'cs-fundamentals', 
  'HTTP vs HTTPS: SSL/TLS handshake and asymmetric encryption.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"HTTP vs HTTPS: SSL/TLS handshake and asymmetric encryption.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["https","ssl","best practices","performance"],"correct_approach":"The correct technical approach for \"HTTP vs HTTPS: SSL/TLS handshake and asymmetric encryption.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"HTTP vs HTTPS: SSL/TLS handshake and asymmetric encryption.\" in your past work?","red_flags":["Fails to explain basic concepts of Computer Networks","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['https', 'ssl']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Computer Networks', 
  'technical', 
  'cs-fundamentals', 
  'IP Addressing: IPv4 subnetting vs IPv6 address spaces.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"IP Addressing: IPv4 subnetting vs IPv6 address spaces.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["ipv4","subnetting","best practices","performance"],"correct_approach":"The correct technical approach for \"IP Addressing: IPv4 subnetting vs IPv6 address spaces.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"IP Addressing: IPv4 subnetting vs IPv6 address spaces.\" in your past work?","red_flags":["Fails to explain basic concepts of Computer Networks","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['ipv4', 'subnetting']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Computer Networks', 
  'technical', 
  'cs-fundamentals', 
  'HTTP/1.1 pipelining vs HTTP/2 multiplexing vs HTTP/3 QUIC.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"HTTP/1.1 pipelining vs HTTP/2 multiplexing vs HTTP/3 QUIC.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["http2","quic","best practices","performance"],"correct_approach":"The correct technical approach for \"HTTP/1.1 pipelining vs HTTP/2 multiplexing vs HTTP/3 QUIC.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"HTTP/1.1 pipelining vs HTTP/2 multiplexing vs HTTP/3 QUIC.\" in your past work?","red_flags":["Fails to explain basic concepts of Computer Networks","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['http2', 'quic']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Computer Networks', 
  'technical', 
  'cs-fundamentals', 
  'NAT (Network Address Translation): private to public IPs.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"NAT (Network Address Translation): private to public IPs.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["nat","routing","best practices","performance"],"correct_approach":"The correct technical approach for \"NAT (Network Address Translation): private to public IPs.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"NAT (Network Address Translation): private to public IPs.\" in your past work?","red_flags":["Fails to explain basic concepts of Computer Networks","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['nat', 'routing']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Computer Networks', 
  'technical', 
  'cs-fundamentals', 
  'WebSockets vs Server-Sent Events (SSE): bi-directional streaming.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"WebSockets vs Server-Sent Events (SSE): bi-directional streaming.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["websockets","sse","best practices","performance"],"correct_approach":"The correct technical approach for \"WebSockets vs Server-Sent Events (SSE): bi-directional streaming.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"WebSockets vs Server-Sent Events (SSE): bi-directional streaming.\" in your past work?","red_flags":["Fails to explain basic concepts of Computer Networks","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['websockets', 'sse']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Computer Networks', 
  'technical', 
  'cs-fundamentals', 
  'ARP (Address Resolution Protocol): IP to MAC mapping.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"ARP (Address Resolution Protocol): IP to MAC mapping.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["arp","mac","best practices","performance"],"correct_approach":"The correct technical approach for \"ARP (Address Resolution Protocol): IP to MAC mapping.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"ARP (Address Resolution Protocol): IP to MAC mapping.\" in your past work?","red_flags":["Fails to explain basic concepts of Computer Networks","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['arp', 'mac']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Django', 
  'technical', 
  'backend', 
  'Django MVT (Model-View-Template) pattern architecture.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Django MVT (Model-View-Template) pattern architecture.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["django","mvt","best practices","performance"],"correct_approach":"The correct technical approach for \"Django MVT (Model-View-Template) pattern architecture.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Django MVT (Model-View-Template) pattern architecture.\" in your past work?","red_flags":["Fails to explain basic concepts of Django","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['django', 'mvt']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Django', 
  'technical', 
  'backend', 
  'Django ORM: lazy evaluation, select_related vs prefetch_related.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Django ORM: lazy evaluation, select_related vs prefetch_related.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["orm","n-plus-one","best practices","performance"],"correct_approach":"The correct technical approach for \"Django ORM: lazy evaluation, select_related vs prefetch_related.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Django ORM: lazy evaluation, select_related vs prefetch_related.\" in your past work?","red_flags":["Fails to explain basic concepts of Django","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['orm', 'n-plus-one']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Django', 
  'technical', 
  'backend', 
  'Django Middleware: request/response interception lifecycle.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Django Middleware: request/response interception lifecycle.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["middleware","lifecycle","best practices","performance"],"correct_approach":"The correct technical approach for \"Django Middleware: request/response interception lifecycle.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Django Middleware: request/response interception lifecycle.\" in your past work?","red_flags":["Fails to explain basic concepts of Django","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['middleware', 'lifecycle']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Django', 
  'technical', 
  'backend', 
  'Django migrations: makemigrations vs migrate dependency resolution.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Django migrations: makemigrations vs migrate dependency resolution.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["migrations","cli","best practices","performance"],"correct_approach":"The correct technical approach for \"Django migrations: makemigrations vs migrate dependency resolution.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Django migrations: makemigrations vs migrate dependency resolution.\" in your past work?","red_flags":["Fails to explain basic concepts of Django","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['migrations', 'cli']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Django', 
  'technical', 
  'backend', 
  'Custom Django managers: overriding get_queryset() for filters.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Custom Django managers: overriding get_queryset() for filters.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["managers","queryset","best practices","performance"],"correct_approach":"The correct technical approach for \"Custom Django managers: overriding get_queryset() for filters.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Custom Django managers: overriding get_queryset() for filters.\" in your past work?","red_flags":["Fails to explain basic concepts of Django","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['managers', 'queryset']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Django', 
  'technical', 
  'backend', 
  'Django REST Framework (DRF) serializers and validators.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Django REST Framework (DRF) serializers and validators.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["drf","serialization","best practices","performance"],"correct_approach":"The correct technical approach for \"Django REST Framework (DRF) serializers and validators.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Django REST Framework (DRF) serializers and validators.\" in your past work?","red_flags":["Fails to explain basic concepts of Django","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['drf', 'serialization']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Django', 
  'technical', 
  'backend', 
  'Django session management: cookies, database-backed sessions.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Django session management: cookies, database-backed sessions.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["sessions","cookies","best practices","performance"],"correct_approach":"The correct technical approach for \"Django session management: cookies, database-backed sessions.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Django session management: cookies, database-backed sessions.\" in your past work?","red_flags":["Fails to explain basic concepts of Django","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['sessions', 'cookies']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Django', 
  'technical', 
  'backend', 
  'Django class-based views (CBV) vs function-based views (FBV).', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Django class-based views (CBV) vs function-based views (FBV).\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["views","cbv","best practices","performance"],"correct_approach":"The correct technical approach for \"Django class-based views (CBV) vs function-based views (FBV).\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Django class-based views (CBV) vs function-based views (FBV).\" in your past work?","red_flags":["Fails to explain basic concepts of Django","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['views', 'cbv']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Django', 
  'technical', 
  'backend', 
  'Django signal receivers: post_save triggers and loops risk.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Django signal receivers: post_save triggers and loops risk.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["signals","triggers","best practices","performance"],"correct_approach":"The correct technical approach for \"Django signal receivers: post_save triggers and loops risk.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Django signal receivers: post_save triggers and loops risk.\" in your past work?","red_flags":["Fails to explain basic concepts of Django","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['signals', 'triggers']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Django', 
  'technical', 
  'backend', 
  'Django security: CSRF token generation, XSS, and SQL injection.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Django security: CSRF token generation, XSS, and SQL injection.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["security","csrf","best practices","performance"],"correct_approach":"The correct technical approach for \"Django security: CSRF token generation, XSS, and SQL injection.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Django security: CSRF token generation, XSS, and SQL injection.\" in your past work?","red_flags":["Fails to explain basic concepts of Django","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['security', 'csrf']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Java', 
  'technical', 
  'programming-languages', 
  'JVM, JRE, and JDK differences, bytecode execution flows.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"JVM, JRE, and JDK differences, bytecode execution flows.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["jvm","architecture","best practices","performance"],"correct_approach":"The correct technical approach for \"JVM, JRE, and JDK differences, bytecode execution flows.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"JVM, JRE, and JDK differences, bytecode execution flows.\" in your past work?","red_flags":["Fails to explain basic concepts of Java","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['jvm', 'architecture']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Java', 
  'technical', 
  'programming-languages', 
  'Garbage Collection algorithms in Java: G1GC vs ZGC execution.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Garbage Collection algorithms in Java: G1GC vs ZGC execution.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["gc","memory","best practices","performance"],"correct_approach":"The correct technical approach for \"Garbage Collection algorithms in Java: G1GC vs ZGC execution.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Garbage Collection algorithms in Java: G1GC vs ZGC execution.\" in your past work?","red_flags":["Fails to explain basic concepts of Java","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['gc', 'memory']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Java', 
  'technical', 
  'programming-languages', 
  'String constant pool: reference equality of literal strings.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"String constant pool: reference equality of literal strings.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["strings","memory","best practices","performance"],"correct_approach":"The correct technical approach for \"String constant pool: reference equality of literal strings.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"String constant pool: reference equality of literal strings.\" in your past work?","red_flags":["Fails to explain basic concepts of Java","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['strings', 'memory']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Java', 
  'technical', 
  'programming-languages', 
  'HashMap internal details: bucket array, entry node trees.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"HashMap internal details: bucket array, entry node trees.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["hashmap","buckets","best practices","performance"],"correct_approach":"The correct technical approach for \"HashMap internal details: bucket array, entry node trees.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"HashMap internal details: bucket array, entry node trees.\" in your past work?","red_flags":["Fails to explain basic concepts of Java","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['hashmap', 'buckets']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Java', 
  'technical', 
  'programming-languages', 
  'Checked Exceptions (compile-time) vs Unchecked Exceptions.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Checked Exceptions (compile-time) vs Unchecked Exceptions.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["exceptions","error-handling","best practices","performance"],"correct_approach":"The correct technical approach for \"Checked Exceptions (compile-time) vs Unchecked Exceptions.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Checked Exceptions (compile-time) vs Unchecked Exceptions.\" in your past work?","red_flags":["Fails to explain basic concepts of Java","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['exceptions', 'error-handling']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Java', 
  'technical', 
  'programming-languages', 
  'Java multi-threading: synchronized blocks vs ReentrantLock.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Java multi-threading: synchronized blocks vs ReentrantLock.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["concurrency","locks","best practices","performance"],"correct_approach":"The correct technical approach for \"Java multi-threading: synchronized blocks vs ReentrantLock.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Java multi-threading: synchronized blocks vs ReentrantLock.\" in your past work?","red_flags":["Fails to explain basic concepts of Java","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['concurrency', 'locks']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Java', 
  'technical', 
  'programming-languages', 
  'Functional interfaces: Lambda expressions and Stream API.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Functional interfaces: Lambda expressions and Stream API.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["streams","lambdas","best practices","performance"],"correct_approach":"The correct technical approach for \"Functional interfaces: Lambda expressions and Stream API.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Functional interfaces: Lambda expressions and Stream API.\" in your past work?","red_flags":["Fails to explain basic concepts of Java","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['streams', 'lambdas']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Java', 
  'technical', 
  'programming-languages', 
  'Java Generics type erasure: runtime JVM signatures limits.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Java Generics type erasure: runtime JVM signatures limits.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["generics","type-erasure","best practices","performance"],"correct_approach":"The correct technical approach for \"Java Generics type erasure: runtime JVM signatures limits.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Java Generics type erasure: runtime JVM signatures limits.\" in your past work?","red_flags":["Fails to explain basic concepts of Java","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['generics', 'type-erasure']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Java', 
  'technical', 
  'programming-languages', 
  'Abstract classes vs Interfaces default methods differences.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Abstract classes vs Interfaces default methods differences.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["interfaces","abstract","best practices","performance"],"correct_approach":"The correct technical approach for \"Abstract classes vs Interfaces default methods differences.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Abstract classes vs Interfaces default methods differences.\" in your past work?","red_flags":["Fails to explain basic concepts of Java","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['interfaces', 'abstract']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'Java', 
  'technical', 
  'programming-languages', 
  'Java ClassLoader delegation model: bootstrap, extension, app.', 
  'hard', 
  '{"ideal_explanation":"A strong candidate should explain \"Java ClassLoader delegation model: bootstrap, extension, app.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["classloader","security","best practices","performance"],"correct_approach":"The correct technical approach for \"Java ClassLoader delegation model: bootstrap, extension, app.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Java ClassLoader delegation model: bootstrap, extension, app.\" in your past work?","red_flags":["Fails to explain basic concepts of Java","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['classloader', 'security']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'CSS/Tailwind', 
  'technical', 
  'frontend', 
  'CSS Box Model: margin, border, padding, and box-sizing.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"CSS Box Model: margin, border, padding, and box-sizing.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["box-model","css","best practices","performance"],"correct_approach":"The correct technical approach for \"CSS Box Model: margin, border, padding, and box-sizing.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"CSS Box Model: margin, border, padding, and box-sizing.\" in your past work?","red_flags":["Fails to explain basic concepts of CSS/Tailwind","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['box-model', 'css']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'CSS/Tailwind', 
  'technical', 
  'frontend', 
  'Flexbox vs Grid: 1D layout distribution vs 2D structural grid.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Flexbox vs Grid: 1D layout distribution vs 2D structural grid.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["flexbox","grid","best practices","performance"],"correct_approach":"The correct technical approach for \"Flexbox vs Grid: 1D layout distribution vs 2D structural grid.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Flexbox vs Grid: 1D layout distribution vs 2D structural grid.\" in your past work?","red_flags":["Fails to explain basic concepts of CSS/Tailwind","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['flexbox', 'grid']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'CSS/Tailwind', 
  'technical', 
  'frontend', 
  'CSS specificity hierarchy: id, class, element, inline calculations.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"CSS specificity hierarchy: id, class, element, inline calculations.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["specificity","selectors","best practices","performance"],"correct_approach":"The correct technical approach for \"CSS specificity hierarchy: id, class, element, inline calculations.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"CSS specificity hierarchy: id, class, element, inline calculations.\" in your past work?","red_flags":["Fails to explain basic concepts of CSS/Tailwind","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['specificity', 'selectors']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'CSS/Tailwind', 
  'technical', 
  'frontend', 
  'Tailwind CSS Utility-first concept: compilation and PurgeCSS.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Tailwind CSS Utility-first concept: compilation and PurgeCSS.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["tailwind","compilation","best practices","performance"],"correct_approach":"The correct technical approach for \"Tailwind CSS Utility-first concept: compilation and PurgeCSS.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Tailwind CSS Utility-first concept: compilation and PurgeCSS.\" in your past work?","red_flags":["Fails to explain basic concepts of CSS/Tailwind","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['tailwind', 'compilation']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'CSS/Tailwind', 
  'technical', 
  'frontend', 
  'Position properties: absolute vs relative vs fixed vs sticky.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Position properties: absolute vs relative vs fixed vs sticky.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["position","layout","best practices","performance"],"correct_approach":"The correct technical approach for \"Position properties: absolute vs relative vs fixed vs sticky.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Position properties: absolute vs relative vs fixed vs sticky.\" in your past work?","red_flags":["Fails to explain basic concepts of CSS/Tailwind","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['position', 'layout']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'CSS/Tailwind', 
  'technical', 
  'frontend', 
  'CSS variables (custom properties) vs Sass preprocessor variables.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"CSS variables (custom properties) vs Sass preprocessor variables.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["variables","sass","best practices","performance"],"correct_approach":"The correct technical approach for \"CSS variables (custom properties) vs Sass preprocessor variables.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"CSS variables (custom properties) vs Sass preprocessor variables.\" in your past work?","red_flags":["Fails to explain basic concepts of CSS/Tailwind","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['variables', 'sass']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'CSS/Tailwind', 
  'technical', 
  'frontend', 
  'Flexbox alignment: justify-content vs align-items vs align-self.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Flexbox alignment: justify-content vs align-items vs align-self.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["flexbox","alignment","best practices","performance"],"correct_approach":"The correct technical approach for \"Flexbox alignment: justify-content vs align-items vs align-self.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Flexbox alignment: justify-content vs align-items vs align-self.\" in your past work?","red_flags":["Fails to explain basic concepts of CSS/Tailwind","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['flexbox', 'alignment']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'CSS/Tailwind', 
  'technical', 
  'frontend', 
  'Tailwind custom configs: theme extensions and plugins.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"Tailwind custom configs: theme extensions and plugins.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["tailwind","configs","best practices","performance"],"correct_approach":"The correct technical approach for \"Tailwind custom configs: theme extensions and plugins.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Tailwind custom configs: theme extensions and plugins.\" in your past work?","red_flags":["Fails to explain basic concepts of CSS/Tailwind","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['tailwind', 'configs']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'CSS/Tailwind', 
  'technical', 
  'frontend', 
  'CSS Transitions vs Keyframe Animations performance and timelines.', 
  'medium', 
  '{"ideal_explanation":"A strong candidate should explain \"CSS Transitions vs Keyframe Animations performance and timelines.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["animations","keyframes","best practices","performance"],"correct_approach":"The correct technical approach for \"CSS Transitions vs Keyframe Animations performance and timelines.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"CSS Transitions vs Keyframe Animations performance and timelines.\" in your past work?","red_flags":["Fails to explain basic concepts of CSS/Tailwind","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['animations', 'keyframes']::text[], 
  false, 
  null
);
INSERT INTO public.question_bank (topic, category, subcategory, question_text, difficulty, expected_answer, tags, is_ai_generated, created_by) VALUES (
  'CSS/Tailwind', 
  'technical', 
  'frontend', 
  'Responsive design: CSS media queries vs Tailwind breakpoints.', 
  'easy', 
  '{"ideal_explanation":"A strong candidate should explain \"Responsive design: CSS media queries vs Tailwind breakpoints.\" by highlighting its practical usage, internal mechanics, and common real-world implications in a production environment.","key_concepts":["responsive","media-queries","best practices","performance"],"correct_approach":"The correct technical approach for \"Responsive design: CSS media queries vs Tailwind breakpoints.\" is to start with a high-level definition, walk through coding patterns or implementation specifics, and explain optimization or safety limits (e.g. edge cases).","follow_up_if_struggle":"Can you describe a scenario where you had to debug or scale an issue related to \"Responsive design: CSS media queries vs Tailwind breakpoints.\" in your past work?","red_flags":["Fails to explain basic concepts of CSS/Tailwind","Unaware of performance trade-offs or memory leaks","Relies entirely on textbook definitions without hands-on reasoning"]}'::jsonb, 
  ARRAY['responsive', 'media-queries']::text[], 
  false, 
  null
);

-- 8. Reload schema cache
NOTIFY pgrst, 'reload schema';
