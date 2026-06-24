import Groq from 'groq-sdk';

const MODEL = 'llama-3.3-70b-versatile';
//const MODEL = process.env.DEBUG ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 30000;

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

// ---------- Self-critique ----------
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

// ---------- System prompt (taxonomy enforced) ----------
const SYSTEM_PROMPT = `You are an expert senior engineer conducting a technical interview. Generate EXACTLY 5 interview questions about the code below following a strict taxonomy.

### TAXONOMY (you MUST generate exactly these 5 question types, in this order):
1. [SURFACE — 1 question] Test basic code comprehension. Ask about a specific return value, variable state, or execution path at a named line. Difficulty: ★ (Junior)
2. [DESIGN — 1st of 2] Test architectural judgment. Ask WHY a specific approach was chosen at a named line — e.g. "Why use X over Y here?". Difficulty: ★★ (Mid)
3. [DESIGN — 2nd of 2] Test deeper design reasoning. Ask about a tradeoff, data structure choice, or algorithmic decision at a named line. Difficulty: ★★ (Mid)
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

### EXAMPLE GOOD QUESTIONS (one per type):
Surface:      {"text":"[C★] Line 18: What value does processToken() return when the token has expired?","lineStart":18,"lineEnd":null,"category":"C","difficulty":"★","answer":"It returns null and sets the session flag to false."}
Design:       {"text":"[A★★] Line 34: Why is a Map used here instead of a plain object for storing user sessions?","lineStart":34,"lineEnd":null,"category":"A","difficulty":"★★","answer":"Maps preserve insertion order and allow non-string keys, which is needed for the numeric user IDs used here."}
Design:       {"text":"[A★★] Lines 51-55: Why does this function return early instead of using an else branch?","lineStart":51,"lineEnd":55,"category":"A","difficulty":"★★","answer":"Early return reduces nesting depth and makes the happy path easier to follow; it also avoids the dangling-else problem."}
Edge Case:    {"text":"[C★★] Line 72: What happens at the slice() call when the input array is empty?","lineStart":72,"lineEnd":null,"category":"C","difficulty":"★★","answer":"slice() on an empty array returns [], so the loop below it never executes — no error is thrown but the caller silently gets an empty result."}
Adversarial:  {"text":"[B★★★] Lines 88-91: What bug exists in this retry loop that could cause it to run indefinitely under certain conditions?","lineStart":88,"lineEnd":91,"category":"B","difficulty":"★★★","answer":"The retry counter is only incremented inside the success branch, so a persistent failure never increments it and the loop never terminates."}

### OUTPUT JSON SCHEMA:
{"questions":[{"text":"...","lineStart":42,"lineEnd":null,"category":"C","difficulty":"★★","answer":"..."}]}

### CATEGORIES: C=CodeLogic, B=Bug, S=Security, P=Performance, A=Architecture, T=Testability
### DIFFICULTY: ★ Junior, ★★ Mid, ★★★ Senior

### INPUT CODE (with line numbers):`;

// ---------- Executable line detection ----------
/**
 * Returns line numbers that contain actual executable logic,
 * filtering out blank lines, comments, and bracket-only lines.
 * Used to prevent the LLM from referencing meaningless lines.
 */
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

    // Skip lines that are only brackets/braces/punctuation
    const cleanLine = line.replace(/[{}\[\]();,\s]/g, '');
    if (cleanLine.length === 0) continue;

    validLines.push(lineNum);
  }

  // Fallback: if nothing passes the filter, allow all lines
  if (validLines.length === 0) {
    return Array.from({ length: lines.length }, (_, idx) => idx + 1);
  }

  return validLines;
}

// ---------- Prompt builders ----------
/**
 * Build prompt with optional AST hints.
 * Taxonomy reminder injected at end so it's salient immediately before JSON output.
 */
function buildFilePrompt(
  code: string,
  filename: string,
  readmeContext?: string,
  projectName?: string,
  astAnalysis?: any
): string {
  const numbered = code
    .split('\n')
    .map((line, i) => `${i + 1}: ${line}`)
    .join('\n');

  const validLines = getExecutableLineNumbers(code);

  let prompt = `PROJECT: ${projectName || 'Unknown'}\nFILE: ${filename}\n\n`;
  if (readmeContext) prompt += `README EXCERPT:\n${readmeContext.slice(0, 1500)}\n\n`;

  if (astAnalysis && astAnalysis.complexity !== undefined) {
    prompt += `## Code Analysis:\n- Complexity: ${astAnalysis.complexity}\n`;
    if (astAnalysis.conditionals?.length) prompt += `- Conditionals: ${astAnalysis.conditionals.length} (use for edge case question)\n`;
    if (astAnalysis.loops?.length) prompt += `- Loops: ${astAnalysis.loops.length} (check for off-by-one or infinite loop in adversarial question)\n`;
    if (astAnalysis.asyncCalls?.length) prompt += `- Async calls: ${astAnalysis.asyncCalls.map((c: any) => c.callee).join(', ')} (check error handling for adversarial question)\n`;
    prompt += `\n`;
  }

  prompt += `CODE:\n\`\`\`\n${numbered}\n\`\`\`\n\n`;
  prompt += `VALID LINE NUMBERS (only reference these — they contain real executable logic):\n${validLines.join(', ')}\n\n`;
  prompt += `REQUIRED OUTPUT: Generate EXACTLY 5 questions in this order:
1. SURFACE (★, category C) — specific return value or execution path
2. DESIGN #1 (★★, category A) — why this approach vs an alternative
3. DESIGN #2 (★★, category A) — tradeoff or data structure choice
4. EDGE CASE (★★, category C) — behaviour at a boundary condition
5. ADVERSARIAL (★★★, category B/S/P) — real bug or vulnerability in the code

Output ONLY the JSON object. No markdown. No explanation.`;

  return prompt;
}

/**
 * Build the prompt for the final slide (README + generic domain questions).
 */
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
/**
 * Call Groq with timeout and model mapping.
 */
async function callGroq(systemPrompt: string, userPrompt: string, customModel?: string): Promise<string> {
  const groq = getClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Map any unsupported model strings to valid Groq models
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

/**
 * Generate raw LLM response string for a single file.
 * Used by the dashboard / streaming endpoints.
 */
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
 * Generate questions for a single file as a validated JSON array.
 * Used by the background worker.
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

  for (let attempt = 0; attempt < 2; attempt++) {
    let response = await callGroq(SYSTEM_PROMPT, userPrompt);
    let questions: any[];
    try {
      questions = await parseAndValidateResponse(response);
    } catch (err) {
      if (attempt === 0) {
        console.warn(`Retrying generation for ${filename}`);
        const retryPrompt = userPrompt + '\n\nIMPORTANT: Output ONLY valid JSON. Follow the schema exactly. Generate EXACTLY 5 questions in the taxonomy order.';
        response = await callGroq(SYSTEM_PROMPT, retryPrompt);
        questions = await parseAndValidateResponse(response, 1);
      } else {
        throw err;
      }
    }
    const score = await selfCritiqueQuestions(questions, code);
    if (score > bestScore) {
      bestScore = score;
      bestQuestions = questions;
    }
    if (score >= 7) break;
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

/**
 * Generate final slide questions as a raw string.
 * Used by dashboard / streaming endpoints.
 */
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

/**
 * Generate final slide questions as a validated JSON array.
 * Used by the background worker.
 */
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