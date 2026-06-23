// // /**
// //  * @fileoverview Groq API integration for CodeWalk question generation.
// //  * Uses Groq's llama-3.3-70b-versatile model for fast, high-quality
// //  * code comprehension question generation.
// //  *
// //  * @module app/lib/gemini
// //  */

// // import Groq from 'groq-sdk';

// // /**
// //  * Groq client instance configured with API key from environment variables.
// //  * Timeout set to 30 seconds for all requests.
// //  */
// // const groqClient = new Groq({
// //   apiKey: process.env.GROQ_API_KEY,
// //   timeout: 30 * 1000, // 30 second timeout
// // });

// // /** Model identifier for Groq's fast, free LLaMA model */
// // const MODEL = 'llama-3.3-70b-versatile';

// // /**
// //  * Extracts a line number from a text string.
// //  * Searches for patterns like "Line 5:", "line 12:", or "Line {number}".
// //  *
// //  * @param text - The text to extract a line number from
// //  * @returns The extracted line number, or 1 if no line number is found
// //  *
// //  * @example
// //  * ```ts
// //  * extractLineNumber("[C] Line 7: What does this function return?");
// //  * // Returns: 7
// //  * ```
// //  */
// // export function extractLineNumber(text: string): number {
// //   const match = text.match(/[Ll]ine\s+(\d+)/);
// //   if (match && match[1]) {
// //     const num = parseInt(match[1], 10);
// //     return isNaN(num) ? 1 : num;
// //   }
// //   return 1;
// // }

// // /**
// //  * Generates exactly 4 comprehension questions for a given code snippet using Groq's LLM.
// //  *
// //  * The function produces questions in four categories:
// //  * - [C] Code-level: references a specific line number, asks what the code does
// //  * - [P] Project-level: asks about structure, organization, or design patterns
// //  * - [D] Documentation-level: asks about info found in the README
// //  * - [Domain] Domain-level: asks about real-world application or business logic
// //  *
// //  * @param code - The source code to generate questions about
// //  * @param filename - The filename/path of the source code
// //  * @param readmeContext - Optional README content for documentation-based questions
// //  * @param projectName - Optional project name for domain inference
// //  * @returns A promise resolving to the raw string of 4 formatted questions with answers
// //  *
// //  * @throws {Error} If the Groq API key is not configured
// //  * @throws {Error} If the API response is empty or malformed
// //  * @throws {Error} If the request times out (30 seconds)
// //  *
// //  * @example
// //  * ```ts
// //  * const questions = await generateQuestionsRaw(
// //  *   'const app = express();\napp.listen(3000);',
// //  *   'server.ts',
// //  *   '# My API\nA REST API for user management.',
// //  *   'user-management-api'
// //  * );
// //  * ```
// //  */
// // export async function generateQuestionsRaw(
// //   code: string,
// //   filename: string,
// //   readmeContext?: string,
// //   projectName?: string
// // ): Promise<string> {
// //   if (!process.env.GROQ_API_KEY) {
// //     throw new Error(
// //       'GROQ_API_KEY environment variable is not set. Please configure it to use CodeWalk question generation.'
// //     );
// //   }

// //   const numberedCode = code
// //     .split('\n')
// //     .map((line, i) => `${i + 1}: ${line}`)
// //     .join('\n');

// //   const totalLines = code.split('\n').length;

// //   const systemPrompt = `You are a code education assistant for CodeWalk. You generate exactly 4 questions to help developers understand code through active recall.

// // STRICT OUTPUT FORMAT (no deviations):

// // [C] Line {lineNumber}: {question about what the code DOES at that line}
// // A: {1-2 sentence factual answer}

// // [P] {question about project structure, file organization, or code patterns}
// // A: {1-2 sentence answer explaining common patterns or benefits}

// // [D] {question based on README or project documentation}
// // A: {1-2 sentence factual answer from documentation}

// // [Domain] {question about real-world application, domain logic, or use case}
// // A: {1-2 sentence answer about domain/business logic}

// // RULES:
// // - [C] MUST reference an actual line number between 1 and ${totalLines} from the code
// // - [C] Ask "What does this do?" or "What happens when..." — NEVER "Why" or "What if"
// // - [P] Ask about structure, organization, design patterns
// // - [D] MUST be answerable from the README provided (if no README, ask about what documentation would be useful)
// // - [Domain] Infer domain from project name, imports, and file structure
// // - NO hypothetical "what if" scenarios
// // - NO personal "why did you" questions
// // - Questions must be answerable without external knowledge
// // - Keep questions under 20 words
// // - Keep answers under 50 words
// // - Output ONLY the 4 questions in the exact format above, nothing else

// // DOMAIN INFERENCE:
// // - Medical/health project → data privacy, compliance, patient records
// // - Spam detection → features, false positives, classification
// // - E-commerce → tax, inventory, checkout, payments
// // - API project → endpoints, authentication, rate limits
// // - Unknown → "What problem does this solve?" or "Who would use this?"`;

// //   const userPrompt = `File: ${filename}
// // ${projectName ? `Project: ${projectName}` : ''}
// // ${readmeContext ? `\nREADME Context:\n${readmeContext}\n` : '\nNo README available.\n'}
// // Code (with line numbers):
// // \`\`\`
// // ${numberedCode}
// // \`\`\`

// // Generate exactly 4 questions following the strict format.`;

// //   try {
// //     const chatCompletion = await groqClient.chat.completions.create({
// //       messages: [
// //         { role: 'system', content: systemPrompt },
// //         { role: 'user', content: userPrompt },
// //       ],
// //       model: MODEL,
// //       temperature: 0.4,
// //       max_tokens: 1024,
// //       top_p: 0.9,
// //     });

// //     const responseContent = chatCompletion.choices?.[0]?.message?.content;

// //     if (!responseContent || responseContent.trim().length === 0) {
// //       throw new Error(
// //         'Groq API returned an empty response. The model may be overloaded — please try again.'
// //       );
// //     }

// //     // Validate that the response contains the expected question markers
// //     const hasCodeQuestion = responseContent.includes('[C]');
// //     const hasProjectQuestion = responseContent.includes('[P]');
// //     const hasDocQuestion = responseContent.includes('[D]');
// //     const hasDomainQuestion = responseContent.includes('[Domain]');

// //     if (!hasCodeQuestion || !hasProjectQuestion || !hasDocQuestion || !hasDomainQuestion) {
// //       throw new Error(
// //         `Groq API response is missing required question categories. ` +
// //         `Got: [C]=${hasCodeQuestion}, [P]=${hasProjectQuestion}, [D]=${hasDocQuestion}, [Domain]=${hasDomainQuestion}. ` +
// //         `Response may be malformed — please retry.`
// //       );
// //     }

// //     return responseContent.trim();
// //   } catch (error: unknown) {
// //     if (error instanceof Groq.APIError) {
// //       if (error.status === 401) {
// //         throw new Error(
// //           'Groq API authentication failed. Please check your GROQ_API_KEY is valid.'
// //         );
// //       }
// //       if (error.status === 429) {
// //         throw new Error(
// //           'Groq API rate limit exceeded. Please wait a moment and try again.'
// //         );
// //       }
// //       if (error.status && error.status >= 500) {
// //         throw new Error(
// //           `Groq API server error (${error.status}). The service may be temporarily unavailable.`
// //         );
// //       }
// //       throw new Error(
// //         `Groq API error (${error.status}): ${error.message}`
// //       );
// //     }

// //     // Handle timeout errors from the SDK
// //     if (
// //       error instanceof Error &&
// //       error.message.toLowerCase().includes('timeout')
// //     ) {
// //       throw new Error(
// //         'Groq API request timed out after 30 seconds. Please check your network connection and try again.'
// //       );
// //     }

// //     // Re-throw errors that we already constructed with meaningful messages
// //     if (error instanceof Error && error.message.includes('Groq API')) {
// //       throw error;
// //     }

// //     // Generic fallback
// //     throw new Error(
// //       `Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
// //     );
// //   }
// // }

// // /**
// //  * Tests the Groq API connection by making a minimal request.
// //  * Useful for health checks and verifying API key configuration.
// //  *
// //  * @returns A promise resolving to `true` if the connection is successful, `false` otherwise
// //  *
// //  * @example
// //  * ```ts
// //  * const isConnected = await testGroqConnection();
// //  * if (!isConnected) {
// //  *   console.error('Groq API is not reachable');
// //  * }
// //  * ```
// //  */
// // export async function testGroqConnection(): Promise<boolean> {
// //   try {
// //     if (!process.env.GROQ_API_KEY) {
// //       console.error('[CodeWalk] GROQ_API_KEY is not set.');
// //       return false;
// //     }

// //     const response = await groqClient.chat.completions.create({
// //       messages: [{ role: 'user', content: 'Reply with "ok".' }],
// //       model: MODEL,
// //       max_tokens: 4,
// //       temperature: 0,
// //     });

// //     const content = response.choices?.[0]?.message?.content;
// //     return typeof content === 'string' && content.trim().length > 0;
// //   } catch (error: unknown) {
// //     console.error(
// //       '[CodeWalk] Groq connection test failed:',
// //       error instanceof Error ? error.message : 'Unknown error'
// //     );
// //     return false;
// //   }
// // }

// /**
//  * Groq AI integration for question generation using Llama 3.3 70B
//  */
// import Groq from 'groq-sdk';

// const groq = new Groq({
//   apiKey: process.env.GROQ_API_KEY || '',
// });

// const MODEL = 'llama-3.3-70b-versatile';
// const TIMEOUT_MS = 30000;

// /**
//  * Infer domain context from project name and code
//  */
// function inferDomainHint(projectName: string = '', code: string = ''): string {
//   const haystack = (projectName + ' ' + code).toLowerCase();
//   if (/(medical|health|patient|hipaa|clinical)/.test(haystack)) {
//     return 'Medical/health domain - ask about data privacy, HIPAA compliance, or patient records.';
//   }
//   if (/(spam|phish|classify|classifier)/.test(haystack)) {
//     return 'Spam/classification domain - ask about features, false positives, or classification thresholds.';
//   }
//   if (/(ecommerce|cart|checkout|payment|order|shop)/.test(haystack)) {
//     return 'E-commerce domain - ask about tax, inventory, checkout flow, or payments.';
//   }
//   if (/(api|endpoint|rest|graphql|fastapi|express)/.test(haystack)) {
//     return 'API project - ask about endpoints, authentication, or rate limits.';
//   }
//   return 'Unknown domain - ask "What problem does this solve?"';
// }

// /**
//  * Generate exactly 4 categorized interview questions for a code file.
//  * Categories: [C] Code Logic, [P] Project Logic, [D] Documentation, [Domain].
//  */
// export async function generateQuestionsRaw(
//   code: string,
//   filename: string,
//   readmeContext: string = '',
//   projectName: string = ''
// ): Promise<string> {
//   if (!process.env.GROQ_API_KEY) {
//     throw new Error('GROQ_API_KEY not configured in environment');
//   }

//   const domainHint = inferDomainHint(projectName, code);
//   const readmeSnippet = readmeContext
//     ? `\n--- README EXCERPT ---\n${readmeContext.slice(0, 2000)}\n--- END README ---\n`
//     : '\n[No README available]\n';

//   const systemPrompt = `You are a senior technical interviewer generating line-specific interview questions. You MUST output EXACTLY 4 questions in the precise format specified. No preamble, no markdown, no extra text.`;

//   const userPrompt = `Project: ${projectName || 'Unknown'}
// File: ${filename}
// ${readmeSnippet}

// --- CODE ---
// ${code}
// --- END CODE ---

// Domain hint: ${domainHint}

// Generate EXACTLY 4 questions in this EXACT format (no markdown, no extra blank lines beyond what's shown):

// [C] Line {lineNumber}: {question about what the code DOES at that line}
// A: {1-2 sentence factual answer}

// [P] {question about project structure, file organization, or code patterns}
// A: {1-2 sentence answer explaining common patterns}

// [D] {question based on README or project documentation}
// A: {1-2 sentence factual answer from documentation}

// [Domain] {question about real-world application, domain logic, or use case}
// A: {1-2 sentence answer about domain logic}

// STRICT RULES:
// - [C] MUST reference an actual line number visible in the code
// - [C] asks "What does this do?" - NOT "Why" or "What if"
// - [P] asks about structure, organization, or design patterns
// - [D] MUST be answerable from the README excerpt above
// - [Domain] infers real-world use from project name, imports, file structure
// - NO hypothetical "what if" scenarios
// - NO personal "why did you" questions
// - Questions under 20 words. Answers under 50 words.`;

//   // Use AbortController-style timeout via Promise.race
//   const completionPromise = groq.chat.completions.create({
//     model: MODEL,
//     messages: [
//       { role: 'system', content: systemPrompt },
//       { role: 'user', content: userPrompt },
//     ],
//     temperature: 0.4,
//     max_tokens: 1200,
//   });

//   const timeoutPromise = new Promise<never>((_, reject) =>
//     setTimeout(() => reject(new Error('Groq request timed out after 30s')), TIMEOUT_MS)
//   );

//   const completion = await Promise.race([completionPromise, timeoutPromise]);
//   const text = completion.choices?.[0]?.message?.content?.trim() || '';

//   if (!text) {
//     throw new Error('Groq returned empty response');
//   }

//   // Validate that all 4 categories are present
//   const required = ['[C]', '[P]', '[D]', '[Domain]'];
//   const missing = required.filter((tag) => !text.includes(tag));
//   if (missing.length > 0) {
//     throw new Error(`Generated response missing categories: ${missing.join(', ')}`);
//   }

//   return text;
// }

// /**
//  * Quick connectivity test for the Groq API
//  */
// export async function testGroqConnection(): Promise<boolean> {
//   try {
//     if (!process.env.GROQ_API_KEY) return false;
//     const result = await groq.chat.completions.create({
//       model: MODEL,
//       messages: [{ role: 'user', content: 'Say "ok"' }],
//       max_tokens: 10,
//     });
//     return !!result.choices?.[0]?.message?.content;
//   } catch {
//     return false;
//   }
// }
/**
 * Groq AI integration for CodeWalk.
 * Uses llama-3.3-70b-versatile to generate interview questions
 * with strict structure: Code Logic, Project Logic, Documentation, Generic.
 */

import Groq from 'groq-sdk';

const MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 30000;

let client: Groq | null = null;

/**
 * Lazy-initialize the Groq client so the module can load without an API key.
 */
function getClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }
    client = new Groq({ apiKey });
  }
  return client;
}

/**
 * System prompt enforcing strict question format.
 */
const SYSTEM_PROMPT = `You are an expert technical interviewer generating questions about a real codebase.

STRICT RULES — DO NOT DEVIATE:

1. Per file, generate:
   - 2 to 3 Code Logic questions tagged [C1], [C2], [C3]
   - 1 to 2 Project Logic questions tagged [P1], [P2]

2. [C] Code Logic questions:
   - MUST reference an actual line number in the form "Line X:" that contains executable code logic (such as a function declaration, variable assignment, conditional statement, loop, or return statement).
   - NEVER reference an empty line, a comment-only line (e.g., lines starting with //, /*, *, or #), or a line containing only an opening/closing brace or bracket (e.g., {, }, [, ]).
   - The user will provide a list of valid line numbers. You MUST only select from these line numbers. Generating a question on any other line number is a strict failure.
   - MUST ask logical, code-comprehension questions about the behavior, purpose, inputs/outputs, conditional outcomes, loops, or state changes at that line. Focus on the programmatic logic, NOT trivial syntax or rules.
   - Must be answerable by reading the code shown
   - Include a 5-line context snippet from the code in the question text where helpful

3. [P] Project Logic questions:
   - Ask about file structure, design patterns, code organization
   - No personal "why did you" framing

4. Format strictly:
[C1] Line X: Question text under 20 words
A: Answer in 2-3 sentences under 60 words

[C2] Line Y: Question text
A: Answer

[P1] Question text
A: Answer

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
  projectName?: string
): string {
  const numbered = code
    .split('\n')
    .map((line, i) => `${i + 1}: ${line}`)
    .join('\n');

  const validLines = getExecutableLineNumbers(code);

  let prompt = `PROJECT: ${projectName || 'Unknown'}\nFILE: ${filename}\n\n`;
  if (readmeContext) {
    prompt += `README EXCERPT:\n${readmeContext.slice(0, 1500)}\n\n`;
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
 * Call the Groq chat completion API with timeout protection.
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
        temperature: 0.4,
        max_tokens: 2000,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);
    const content = completion.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Empty response from Groq');
    }
    return content.trim();
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Groq API request timed out after 30 seconds');
    }
    throw err;
  }
}

/**
 * Generate raw question text for a single file.
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

  // Basic validation — must contain at least one [C and one [P
  if (!/\[C\d?/.test(response) || !/\[P\d?/.test(response)) {
    throw new Error('Response missing required question tags ([C], [P])');
  }
  return response;
}

/**
 * Generate the final slide questions (README + Generic domain).
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
