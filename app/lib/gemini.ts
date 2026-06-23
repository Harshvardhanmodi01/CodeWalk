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

2. [C] Code Logic questions:
   - MUST reference an actual line number in the form "Line X:" that contains executable code logic (such as a function declaration, variable assignment, conditional statement, loop, or return statement).
   - NEVER reference an empty line, a comment-only line (e.g., lines starting with //, /*, *, or #), or a line containing only an opening/closing brace or bracket (e.g., {, }, [, ]).
   - The user will provide a list of valid line numbers. You MUST only select from these line numbers. Generating a question on any other line number is a strict failure.
   - MUST ask logical, code-comprehension questions about the behavior, purpose, inputs/outputs, conditional outcomes, loops, or state changes at that line. Focus on the programmatic logic, NOT trivial syntax or rules.
   - Must be answerable by reading the code shown
   - Include a 5-line context snippet from the code in the question text where helpful

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

5. NO hypotheticals. NO "what if" scenarios unrelated to the actual code block. NO opinions. Only factual code questions.
6. Answers: 2-3 sentences, under 60 words.
7. Questions: under 20 words.`;

/**
 * Parses code content and returns line numbers of lines containing executable logic
 * (filtering out comments, whitespace, and brackets/punctuation).
 */
export function getExecutableLineNumbers(code: string): number[] {
  const lines = code.split('\n');
  const validLines: number[] = [];
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    if (inBlockComment) {
      if (line.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) {
        inBlockComment = true;
      }
      continue;
    }

    // Skip empty lines
    if (!line) continue;

    // Skip comment lines
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('#')) {
      continue;
    }

    // Skip lines with only brackets, braces, parentheses, commas, semicolons
    const cleanLine = line.replace(/[{}\[\]();,\s]/g, '');
    if (cleanLine.length === 0) {
      continue;
    }

    validLines.push(lineNum);
  }

  // Fallback if no valid lines are detected
  if (validLines.length === 0) {
    return Array.from({ length: lines.length }, (_, idx) => idx + 1);
  }

  return validLines;
}

/**
 * Build the user prompt for a single file.
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
    if (astAnalysis.conditionals?.length) prompt += `- Conditionals: ${astAnalysis.conditionals.length} (edge cases)\n`;
    if (astAnalysis.loops?.length) prompt += `- Loops: ${astAnalysis.loops.length} (ask about complexity)\n`;
    if (astAnalysis.asyncCalls?.length) prompt += `- Async calls: ${astAnalysis.asyncCalls.map((c:any)=>c.callee).join(', ')} (error handling)\n`;
    prompt += `\n`;
  }
  prompt += `SOURCE CODE (with line numbers):\n\`\`\`\n${numbered}\n\`\`\`\n\n`;
  prompt += `CRITICAL: You are only allowed to choose from the following line numbers for [C] questions (these contain actual executable code logic, not comments, blank lines, or closing brackets):\n`;
  prompt += `${validLines.join(', ')}\n\n`;
  prompt += `Generate 2-3 [C] questions referencing real lines from the list above, plus 1-2 [P] questions about structure/patterns. Follow the strict format.`;
  return prompt;
}

/**
 * Build the prompt for the final slide (README + Generic).
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

/**
 * Call Groq with timeout
 */
async function callGroq(systemPrompt: string, userPrompt: string, customModel?: string): Promise<string> {
  const groq = getClient();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Map user-selected models to supported Groq models
  let modelToUse = customModel || MODEL;
  const lowerModel = modelToUse.toLowerCase();
  if (lowerModel.includes('gpt-4') || lowerModel.includes('claude') || lowerModel.includes('gpt-3.5')) {
    modelToUse = 'llama-3.3-70b-versatile'; // Fallback / mock map for custom dashboard models
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

/**
 * Extract JSON from LLM response (handles markdown, extra text)
 */
export async function generateQuestionsRaw(
  code: string,
  filename: string,
  readmeContext?: string,
  projectName?: string,
  model?: string
): Promise<string> {
  if (!code || !filename) {
    throw new Error('Code and filename are required');
  }
  const userPrompt = buildFilePrompt(code, filename, readmeContext, projectName);
  const response = await callGroq(SYSTEM_PROMPT, userPrompt, model);

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
export async function generateFinalQuestions(
  readme: string,
  projectName?: string,
  model?: string,
  hasReadme: boolean = true
): Promise<string> {
  const userPrompt = buildFinalPrompt(readme, projectName, hasReadme);
  const finalSystem = `You are an expert technical interviewer generating final-slide interview questions. Follow the user's format strictly.`;
  return await callGroq(finalSystem, userPrompt, model);
}