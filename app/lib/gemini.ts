import Groq from 'groq-sdk';

const MODEL = 'llama-3.3-70b-versatile';
//const MODEL = process.env.DEBUG ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 30000;
const MAX_LINES_BEFORE_FILTER = 500; // trigger two‑pass filtering for files > 500 lines
const CONTEXT_LINES_AROUND_IMPORTANT = 2; // lines of context around important AST nodes

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');
    client = new Groq({ apiKey });
  }
  return client;
}

// ---------- Quality filter ----------
function isLowQualityQuestion(text: string): boolean {
  const lowQualityPatterns = [
    /what does this (function|code|block|line) do/i,
    /what is the purpose of/i,
    /can you explain/i,
    /what is this variable/i,
    /what does this mean/i,
    /tell me about/i,
    /describe how/i,
  ];
  return lowQualityPatterns.some(pattern => pattern.test(text));
}

function isValidQuestion(q: any): boolean {
  if (!q.text || typeof q.text !== 'string') return false;
  if (!q.answer || typeof q.answer !== 'string') return false;
  if (q.answer.length < 10 || q.answer.length > 500) return false;
  if (isLowQualityQuestion(q.text)) return false;
  const hasLineRef = /\bline\s+\d+\b/i.test(q.text);
  const hasBlockRef = /\blines?\s+\d+\s*[-–]\s*\d+\b/i.test(q.text);
  if (!hasLineRef && !hasBlockRef) return false;
  return true;
}

// ---------- Adversarial critique (upgraded) ----------
/**
 * Adversarial critique: evaluates questions harshly, checks if they can be
 * guessed without code, penalizes textbook answers, and validates difficulty.
 * Returns an object: { score, validQuestions, reasons }.
 */
async function adversarialCritique(
  questionsArray: any[],
  code: string,
  readmeContext?: string
): Promise<{ score: number; validQuestions: any[]; reasons: string[] }> {
  const critiquePrompt = `You are a skeptical senior engineer interviewing a candidate. Your job is to find every flaw in these interview questions. Be harsh — you are actively trying to reject them.

### Evaluation criteria:
1. **Can this be guessed without the code?** For each question, ask: "Could a competent engineer who has NEVER seen this code guess this answer correctly just from common patterns and best practices, without reading the actual implementation?" If YES, mark as "GUESSABLE" and reject.
2. **Does the question contain a concrete observation about the code?** It must state what the code does at that line before asking why. Example: "Line 34 uses a fixed retry limit of 3 instead of exponential backoff — what's the tradeoff?" vs. "Why was this approach used?" — the latter is weak.
3. **Does the answer read like a textbook?** Penalise answers that are generic (e.g., "improves performance," "increases security," "follows best practices") rather than specific to THIS code.
4. **Is the difficulty label correct?** ★ (Junior) = single‑fact recall, ★★ (Mid) = requires reasoning, ★★★ (Senior) = multi‑step reasoning or architectural tradeoff.
5. **Is the question phrased with variety?** Not all design questions should start with "Why was X chosen over Y." Mix phrasing: "What would break if...", "What problem does this solve...", "Walk through what happens when...".
6. **Does the question align with the project's purpose (README)?** If README says "real‑time recommendation engine," questions about unrelated utilities may be low quality.
7. **Is the line reference actually relevant?** Does the question genuinely require reading that specific line, or could it be answered by looking elsewhere?

### Questions to review:
${JSON.stringify(questionsArray, null, 2)}

### Code context (for reference):
${code.slice(0, 2000)}${readmeContext ? `\n\nREADME excerpt:\n${readmeContext.slice(0, 800)}` : ''}

Return JSON: 
{
  "validQuestions": [ // only the questions that PASS all checks
    { "index": 0, "score": 8, "reasons": ["..."] }
  ],
  "rejected": [ { "index": 1, "reason": "GUESSABLE: ..." } ],
  "averageScore": 7.5,
  "summary": "Brief overall assessment."
}`;

  const system = "You are a ruthless code‑reviewer. Output only valid JSON. Be critical — your job is to find problems.";
  try {
    const response = await callGroq(system, critiquePrompt);
    const parsed = JSON.parse(response);
    const validIndices = new Set(parsed.validQuestions?.map((v: any) => v.index) || []);
    const validQuestions = questionsArray.filter((_, i) => validIndices.has(i));
    const score = parsed.averageScore || 5;
    const reasons = parsed.rejected?.map((r: any) => r.reason) || [];
    return { score, validQuestions, reasons };
  } catch (err) {
    console.warn('Adversarial critique failed, using fallback scoring:', err);
    return { score: 5, validQuestions: questionsArray, reasons: ['Critique failed – using fallback'] };
  }
}

// ---------- Self-critique (legacy, kept for compatibility) ----------
async function selfCritiqueQuestions(questionsArray: any[], code: string): Promise<number> {
  const critiquePrompt = `You are a strict judge. Score each question 1-10 based on:
- Specificity (references exact line/block) [0-3]
- Tests reasoning, not trivia [0-3]
- Answer uniquely derivable from code [0-2]
- Senior engineer would find it insightful [0-2]

Questions:
${JSON.stringify(questionsArray, null, 2)}

Return only valid JSON: { "scores": [score1, score2, ...], "average": number }`;

  const system = "You are a precise evaluator. Output only JSON.";
  try {
    const response = await callGroq(system, critiquePrompt);
    const parsed = JSON.parse(response);
    return parsed.average || 5;
  } catch {
    return 5;
  }
}

// ---------- System prompt (upgraded with anchoring, variety, and README awareness) ----------
const SYSTEM_PROMPT = `You are an expert senior engineer conducting a technical interview. Generate EXACTLY 5 interview questions about the code below following a strict taxonomy.

### TAXONOMY (you MUST generate exactly these 5 question types, in this order):
1. [SURFACE — 1 question] Test basic code comprehension. Ask about a specific return value, variable state, or execution path at a named line. Difficulty: ★ (Junior)
2. [DESIGN — 1st of 2] Test architectural judgment. Ask WHY a specific approach was chosen at a named line — but ANCHOR the question with a concrete observation about what the code does. Difficulty: ★★ (Mid)
3. [DESIGN — 2nd of 2] Test deeper design reasoning. Ask about a tradeoff, data structure choice, or algorithmic decision at a named line. Again, include a concrete observation. Difficulty: ★★ (Mid)
4. [EDGE CASE — 1 question] Test boundary condition thinking. Ask what happens at a specific line when input is null, empty, zero, very large, or malformed. Difficulty: ★★ (Mid)
5. [ADVERSARIAL — 1 question] Test code-review skill. Point to a specific line and ask the candidate to identify a real bug, vulnerability, race condition, or performance trap that exists in the code. Difficulty: ★★★ (Senior)

### RULES:
1. Output ONLY valid JSON matching the schema below. No markdown, no explanation.
2. Generate EXACTLY 5 questions — one per taxonomy type, in the order above.
3. Every question MUST reference a SPECIFIC line number or block (e.g. "Line 34", "Lines 56-58").
4. Answers must be 1–2 sentences, derivable ONLY from the provided code — no outside knowledge.
5. NEVER ask "what does this do" or "what is the purpose of". Every question must be specific and pointed.
6. The adversarial question MUST identify a real flaw in the code — do not invent one. If the code is clean, find a subtle inefficiency or unhandled edge case.
7. Category mapping:
   - Surface → C (CodeLogic)
   - Design → A (Architecture)
   - Edge Case → C (CodeLogic) with edge-case framing
   - Adversarial → B (Bug) or S (Security) or P (Performance), whichever fits
8. VARY your phrasing across the two design questions. Do not always use "Why was X chosen over Y." Use alternatives like:
   - "What would break if you replaced X with Y here?"
   - "What problem does this specific implementation solve that a simpler approach wouldn't?"
   - "Walk through what happens at line X when [edge case] occurs."

### EXAMPLE GOOD QUESTIONS (one per type):
Surface:      {"text":"[C★] Line 18: What value does processToken() return when the token has expired?","lineStart":18,"lineEnd":null,"category":"C","difficulty":"★","answer":"It returns null and sets the session flag to false."}
Design:       {"text":"[A★★] Line 34: The code uses a Map to store sessions with numeric user IDs — what advantage does this have over a plain object?","lineStart":34,"lineEnd":null,"category":"A","difficulty":"★★","answer":"Maps preserve insertion order and allow non-string keys, which is needed for the numeric user IDs used here."}
Design:       {"text":"[A★★] Lines 51-55: The function returns early on error instead of using an else branch — what problem does this early-return pattern solve?","lineStart":51,"lineEnd":55,"category":"A","difficulty":"★★","answer":"Early return reduces nesting depth and makes the happy path easier to follow; it also avoids the dangling-else problem."}
Edge Case:    {"text":"[C★★] Line 72: What does the slice() call return when the input array is empty?","lineStart":72,"lineEnd":null,"category":"C","difficulty":"★★","answer":"slice() on an empty array returns [], so the loop below it never executes — no error is thrown but the caller silently gets an empty result."}
Adversarial:  {"text":"[B★★★] Lines 88-91: The retry counter is only incremented inside the success branch — what bug does this create?","lineStart":88,"lineEnd":91,"category":"B","difficulty":"★★★","answer":"The retry counter is never incremented on failure, so a persistent error would loop indefinitely, causing a hang."}

### OUTPUT JSON SCHEMA:
{"questions":[{"text":"...","lineStart":42,"lineEnd":null,"category":"C","difficulty":"★★","answer":"..."}]}

### CATEGORIES: C=CodeLogic, B=Bug, S=Security, P=Performance, A=Architecture, T=Testability
### DIFFICULTY: ★ Junior, ★★ Mid, ★★★ Senior

### INPUT CODE (with line numbers):`;

// ---------- Executable line detection ----------
export function getExecutableLineNumbers(code: string): number[] {
  const lines = code.split('\n');
  const validLines: number[] = [];
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    if (inBlockComment) {
      if (line.includes('*/')) inBlockComment = false;
      continue;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlockComment = true;
      continue;
    }
    if (!line) continue;
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('#')) continue;
    const cleanLine = line.replace(/[{}\[\]();,\s]/g, '');
    if (cleanLine.length === 0) continue;

    validLines.push(lineNum);
  }

  if (validLines.length === 0) {
    return Array.from({ length: lines.length }, (_, idx) => idx + 1);
  }

  return validLines;
}

// ---------- Helper: extract important lines from AST ----------
function getImportantLinesFromAST(astAnalysis: any): Set<number> {
  const important = new Set<number>();
  if (!astAnalysis) return important;

  // Functions
  if (astAnalysis.functions) {
    for (const fn of astAnalysis.functions) {
      if (fn.startLine) important.add(fn.startLine);
      if (fn.endLine) important.add(fn.endLine);
    }
  }
  // Conditionals
  if (astAnalysis.conditionals) {
    for (const cond of astAnalysis.conditionals) {
      if (cond.line) important.add(cond.line);
    }
  }
  // Loops
  if (astAnalysis.loops) {
    for (const loop of astAnalysis.loops) {
      if (loop.line) important.add(loop.line);
    }
  }
  // Async calls
  if (astAnalysis.asyncCalls) {
    for (const call of astAnalysis.asyncCalls) {
      if (call.line) important.add(call.line);
    }
  }
  // Try-catch
  if (astAnalysis.tryCatch) {
    for (const tc of astAnalysis.tryCatch) {
      if (tc.line) important.add(tc.line);
    }
  }
  return important;
}

// ---------- Prompt builders (upgraded) ----------
function buildFilePrompt(
  code: string,
  filename: string,
  readmeContext?: string,
  projectName?: string,
  astAnalysis?: any
): string {
  const lines = code.split('\n');
  const totalLines = lines.length;

  // 1. Determine which lines to include (filtering)
  let lineNumbersToKeep: Set<number>;

  // If AST is available and file is large, use AST to select important lines
  if (astAnalysis && totalLines > MAX_LINES_BEFORE_FILTER) {
    const important = getImportantLinesFromAST(astAnalysis);
    const expanded = new Set<number>();
    for (const ln of important) {
      for (let offset = -CONTEXT_LINES_AROUND_IMPORTANT; offset <= CONTEXT_LINES_AROUND_IMPORTANT; offset++) {
        const neighbor = ln + offset;
        if (neighbor >= 1 && neighbor <= totalLines) expanded.add(neighbor);
      }
    }
    // Fallback: if expansion yields too few lines, keep executable lines
    if (expanded.size < 10) {
      // fallback to executable lines filter
      const execLines = new Set(getExecutableLineNumbers(code));
      lineNumbersToKeep = execLines;
    } else {
      lineNumbersToKeep = expanded;
    }
  } else {
    // Use executable lines filter (always applied to reduce noise)
    const execLines = new Set(getExecutableLineNumbers(code));
    lineNumbersToKeep = execLines;
  }

  // Build filtered code block (preserve original line numbers)
  const filteredLines = lines
    .map((line, idx) => ({ num: idx + 1, text: line }))
    .filter(({ num }) => lineNumbersToKeep.has(num))
    .map(({ num, text }) => `${num}: ${text}`)
    .join('\n');

  // Rough token estimate (characters/4)
  const estimatedTokens = Math.round(filteredLines.length / 4);
  console.log(`[gemini] ${filename}: ${totalLines} lines → ${filteredLines.split('\n').length} kept, ~${estimatedTokens} tokens`);

  // Build prompt
  let prompt = `PROJECT: ${projectName || 'Unknown'}\nFILE: ${filename}\n\n`;
  if (readmeContext) prompt += `README EXCERPT:\n${readmeContext.slice(0, 1500)}\n\n`;

  // Move AST hints to the END (right before output instructions)
  let astHints = '';
  if (astAnalysis && astAnalysis.complexity !== undefined) {
    astHints += `\n## Code Analysis:\n- Complexity: ${astAnalysis.complexity}\n`;
    if (astAnalysis.conditionals?.length) astHints += `- Conditionals: ${astAnalysis.conditionals.length} (use for edge case question)\n`;
    if (astAnalysis.loops?.length) astHints += `- Loops: ${astAnalysis.loops.length} (check for off-by-one or infinite loop in adversarial question)\n`;
    if (astAnalysis.asyncCalls?.length) astHints += `- Async calls: ${astAnalysis.asyncCalls.map((c: any) => c.callee).join(', ')} (check error handling for adversarial question)\n`;
  }

  // Add code block
  prompt += `CODE (filtered – only lines containing executable logic; original line numbers preserved):\n\`\`\`\n${filteredLines}\n\`\`\`\n\n`;

  // Add AST hints at the end (just before output instructions)
  if (astHints) {
    prompt += `## Structural hints (use these to guide your questions):\n${astHints}\n`;
  }

  // Repeat taxonomy reminder briefly at the end
  prompt += `REMINDER: Generate EXACTLY 5 questions in this order:\n`;
  prompt += `1. SURFACE (★, C) — return value or execution path\n`;
  prompt += `2. DESIGN #1 (★★, A) — why this approach (with concrete observation)\n`;
  prompt += `3. DESIGN #2 (★★, A) — tradeoff or data structure choice\n`;
  prompt += `4. EDGE CASE (★★, C) — boundary behaviour\n`;
  prompt += `5. ADVERSARIAL (★★★, B/S/P) — real bug or vulnerability\n\n`;
  prompt += `Output ONLY the JSON object. No markdown. No explanation.`;

  return prompt;
}

function buildFinalPrompt(readme: string, projectName?: string, hasReadme: boolean = true): string {
  if (!hasReadme || !readme.trim()) {
    return `PROJECT: ${projectName || 'Unknown'}

Generate the FINAL slide questions only. Format strictly:

[G1] One generic domain/real-world question about how this kind of system is used
A: Answer

[G2] One more generic domain question (use cases, real-world application)
A: Answer

NO code line references here. Focus on domain knowledge.`;
  }

  return `PROJECT: ${projectName || 'Unknown'}

README:
${readme.slice(0, 4000)}

Generate the FINAL slide questions only. Format strictly:

[D] One question answerable from the README (under 20 words)
A: Answer in 2-3 sentences

[G1] One generic domain/real-world question about how this kind of system is used
A: Answer

[G2] One more generic domain question (use cases, real-world application)
A: Answer

NO code line references here. Focus on documentation and domain knowledge.`;
}

// ---------- Groq caller ----------
async function callGroq(systemPrompt: string, userPrompt: string, customModel?: string): Promise<string> {
  const groq = getClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let modelToUse = customModel || MODEL;
  const lowerModel = modelToUse.toLowerCase();
  if (lowerModel.includes('gpt-4') || lowerModel.includes('claude') || lowerModel.includes('gpt-3.5')) {
    modelToUse = 'llama-3.3-70b-versatile';
  } else if (lowerModel.includes('llama-3.1-8b') || lowerModel.includes('llama3-8b')) {
    modelToUse = 'llama-3.1-8b-instant';
  } else if (lowerModel.includes('mixtral')) {
    modelToUse = 'mixtral-8x7b-32768';
  }

  try {
    const completion = await groq.chat.completions.create(
      {
        model: modelToUse,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      },
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response');
    return content.trim();
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Groq timeout');
    throw err;
  }
}

// ---------- JSON extraction ----------
function extractJSON(text: string): any | null {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return null;
  const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// ---------- Validation ----------
async function parseAndValidateResponse(rawResponse: string, retryCount = 0): Promise<any[]> {
  const parsedObj = extractJSON(rawResponse);
  if (!parsedObj) throw new Error('No JSON object found');
  if (!parsedObj.questions || !Array.isArray(parsedObj.questions)) {
    throw new Error('Missing "questions" array');
  }
  const valid = parsedObj.questions.filter(isValidQuestion);
  if (valid.length < 3 && retryCount < 2) {
    console.warn(`Only ${valid.length} valid questions, retrying...`);
    throw new Error('Not enough valid questions');
  }
  return valid;
}

// ---------- Public API ----------

export async function generateQuestionsRaw(
  code: string,
  filename: string,
  readmeContext?: string,
  projectName?: string,
  model?: string
): Promise<string> {
  if (!code || !filename) throw new Error('Code and filename are required');
  const userPrompt = buildFilePrompt(code, filename, readmeContext, projectName);
  return callGroq(SYSTEM_PROMPT, userPrompt, model);
}

/**
 * Generate questions with adversarial critique loop.
 * Upgraded to include "guessed without code" filter, anchoring, difficulty calibration, etc.
 */
export async function generateQuestionsForFile(
  code: string,
  filename: string,
  readmeContext?: string,
  projectName?: string,
  astAnalysis?: any
): Promise<any[]> {
  if (!code || !filename) throw new Error('Code and filename required');

  const userPrompt = buildFilePrompt(code, filename, readmeContext, projectName, astAnalysis);
  let bestQuestions: any[] = [];
  let bestScore = 0;

  for (let attempt = 0; attempt < 3; attempt++) { // up to 3 generation attempts
    let response = await callGroq(SYSTEM_PROMPT, userPrompt);
    let questions: any[];
    try {
      questions = await parseAndValidateResponse(response);
    } catch (err) {
      if (attempt < 2) {
        console.warn(`Retrying generation for ${filename} (attempt ${attempt + 1})`);
        const retryPrompt = userPrompt + '\n\nIMPORTANT: Output ONLY valid JSON. Follow the schema exactly. Generate EXACTLY 5 questions in the taxonomy order.';
        response = await callGroq(SYSTEM_PROMPT, retryPrompt);
        questions = await parseAndValidateResponse(response, 1);
      } else {
        throw err;
      }
    }

    // Run adversarial critique
    const { score, validQuestions, reasons } = await adversarialCritique(questions, code, readmeContext);

    // If any question was rejected or score is too low, regenerate
    if (validQuestions.length >= 4 && score >= 6) {
      // good enough
      bestQuestions = validQuestions.slice(0, 5); // keep top 5
      bestScore = score;
      break;
    } else {
      console.warn(`Adversarial critique for ${filename}: score=${score}, valid=${validQuestions.length}/${questions.length}. Reasons: ${reasons.join('; ')}. Retrying...`);
      if (attempt < 2) {
        continue;
      } else {
        bestQuestions = validQuestions.length > 0 ? validQuestions : questions;
        bestScore = score;
      }
    }
  }

  if (bestQuestions.length === 0) {
    bestQuestions = [{
      text: "[C★] Line 1: What is the entry point of this file?",
      lineStart: 1,
      lineEnd: null,
      category: "C",
      difficulty: "★",
      answer: "Line 1 is the first executable statement; review the file to trace the control flow from here.",
    }];
  }

  return bestQuestions;
}

export async function generateFinalQuestions(
  readme: string,
  projectName?: string,
  model?: string,
  hasReadme: boolean = true
): Promise<string> {
  const userPrompt = buildFinalPrompt(readme, projectName, hasReadme);
  const finalSystem = `You are an expert technical interviewer generating final-slide interview questions. Follow the user's format strictly.`;
  return callGroq(finalSystem, userPrompt, model);
}

export async function generateFinalQuestionsJson(
  readme: string,
  projectName?: string
): Promise<any[]> {
  const userPrompt = buildFinalPrompt(readme, projectName);
  const finalSystem = `You are an expert interviewer. Generate final slide questions as JSON only. Output ONLY JSON.`;
  const response = await callGroq(finalSystem, userPrompt);
  const parsed = extractJSON(response);
  return parsed?.questions || [];
}