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

// ---------- Self‑critique ----------
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

// ---------- System prompt (strict) ----------
const SYSTEM_PROMPT = `You are an expert senior engineer. Generate interview questions about the code below.

### RULES:
1. Output ONLY valid JSON matching the schema.
2. Generate 4–6 questions.
3. Every question must reference a SPECIFIC line number or block.
4. Answers must be 1–2 sentences, derivable ONLY from the code.
5. NEVER ask "what does this do". Use categories: return values, edge cases, security, performance.

### EXAMPLE GOOD:
{"text":"[C★★] Line 34: What does calculateDiscount() return when user is not logged in?","lineStart":34,"lineEnd":null,"category":"C","difficulty":"★★","answer":"It returns 0 and logs a warning."}

### OUTPUT JSON SCHEMA:
{"questions":[{"text":"...","lineStart":42,"lineEnd":null,"category":"C","difficulty":"★★","answer":"..."}]}

### CATEGORIES: C=CodeLogic, B=Bug, S=Security, P=Performance, A=Architecture, T=Testability
### DIFFICULTY: ★ Junior, ★★ Mid, ★★★ Senior

### INPUT CODE (with line numbers):`;

/**
 * Build prompt with optional AST hints
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

  let prompt = `PROJECT: ${projectName || 'Unknown'}\nFILE: ${filename}\n\n`;
  if (readmeContext) prompt += `README EXCERPT:\n${readmeContext.slice(0, 1500)}\n\n`;

  if (astAnalysis && astAnalysis.complexity !== undefined) {
    prompt += `## Code Analysis:\n- Complexity: ${astAnalysis.complexity}\n`;
    if (astAnalysis.conditionals?.length) prompt += `- Conditionals: ${astAnalysis.conditionals.length} (edge cases)\n`;
    if (astAnalysis.loops?.length) prompt += `- Loops: ${astAnalysis.loops.length} (ask about complexity)\n`;
    if (astAnalysis.asyncCalls?.length) prompt += `- Async calls: ${astAnalysis.asyncCalls.map((c:any)=>c.callee).join(', ')} (error handling)\n`;
    prompt += `\n`;
  }

  prompt += `CODE:\n\`\`\`\n${numbered}\n\`\`\`\n\n`;
  prompt += `Generate 4–6 JSON questions. Output ONLY the JSON object.`;
  return prompt;
}

function buildFinalPrompt(readme: string, projectName?: string): string {
  return `PROJECT: ${projectName || 'Unknown'}\nREADME:\n${readme.slice(0,4000)}\n\nGenerate 3 final JSON questions. Output ONLY JSON.`;
}

/**
 * Call Groq with timeout
 */
async function callGroq(systemPrompt: string, userPrompt: string): Promise<string> {
  const groq = getClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const completion = await groq.chat.completions.create(
      {
        model: MODEL,
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

/**
 * Extract JSON from LLM response (handles markdown, extra text)
 */
function extractJSON(text: string): any | null {
  // Remove markdown code fences
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  // Find first '{' and last '}'
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

/**
 * Generate questions for a single file (with self‑critique)
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
        const retryPrompt = userPrompt + '\n\nIMPORTANT: Output ONLY valid JSON. Follow the schema exactly.';
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

  // Fallback if still no questions (should not happen)
  if (bestQuestions.length === 0) {
    bestQuestions = [{
      text: "[C★] Line 1: What is the purpose of this file?",
      lineStart: 1,
      lineEnd: null,
      category: "C",
      difficulty: "★",
      answer: "This file contains the main logic of the module.",
    }];
  }
  return bestQuestions;
}

/**
 * Final slide questions
 */
export async function generateFinalQuestions(readme: string, projectName?: string): Promise<any[]> {
  const userPrompt = buildFinalPrompt(readme, projectName);
  const finalSystem = `You are an expert interviewer. Generate final slide questions as JSON only. Output ONLY JSON.`;
  const response = await callGroq(finalSystem, userPrompt);
  const parsed = extractJSON(response);
  return parsed?.questions || [];
}