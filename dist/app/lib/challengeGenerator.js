"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMicroChallenge = generateMicroChallenge;
const gemini_1 = require("./gemini");
/**
 * Generates a repository micro-challenge scoped to a single file.
 */
async function generateMicroChallenge(code, filePath, focusArea = 'All', typePreference = 'any') {
    const chosenType = typePreference === 'any'
        ? (Math.random() > 0.5 ? 'bug' : 'feature')
        : typePreference;
    const systemPrompt = `You are a senior developer creating a coding test for an interview candidate.
You are given a file from the candidate's repository.
Your task is to generate a single self-contained coding challenge scoped strictly to this file.

Depending on the task type, you must follow these rules:

1. CHALLENGE TYPE: "bug" (Bug Fix)
- Select a specific function or block (20-80 lines) in the file.
- Plant a single subtle logical bug (e.g. off-by-one index, flipped condition, wrong operator, shallow copy instead of deep copy, incorrect variable reference).
- The bug MUST be logical, NOT a syntax error. The code must still compile/parse.
- The starterCode should contain the ENTIRE file, but with the bug planted in the chosen section.
- The taskDescription should explain the expected behavior and what is failing. It must NOT tell the candidate exactly where the bug is or how to fix it.
- referenceSolution should contain the corrected code.

2. CHALLENGE TYPE: "feature" (Feature Addition)
- Select a specific function or section and prompt the candidate to extend it or add a small helper feature (e.g., adding an option parsing parameter, a logging decorator, or an extra lookup method).
- Keep the scope small (solvable in 10-15 minutes).
- starterCode should be the ENTIRE original file.
- taskDescription should clearly define the requirements for the new feature.
- referenceSolution should contain the file with the feature correctly implemented.

3. FALLBACK RULES:
- If the file is empty, has no logical structure, or cannot support a challenge, write a generic programming task (e.g. utility parser, rate limiter) styled to look like it belongs to the file, and set the filePath to the original filePath.

Your output must be a valid JSON object matching the schema:
{
  "challengeType": "bug" | "feature",
  "taskDescription": "Markdown description of the task requirements...",
  "starterCode": "Full file content with bug planted, or original code...",
  "originalCode": "Original file content...",
  "referenceSolution": "Full file content with the correct solution..."
}

CRITICAL: Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON.`;
    const userPrompt = `File Path: ${filePath}
Focus Area: ${focusArea}
Target Type: ${chosenType}

File Code Content:
\`\`\`
${code}
\`\`\``;
    try {
        const response = await (0, gemini_1.callGroq)(systemPrompt, userPrompt);
        let cleaned = response.trim();
        if (cleaned.startsWith('```json'))
            cleaned = cleaned.slice(7);
        else if (cleaned.startsWith('```'))
            cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```'))
            cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.challengeType &&
            parsed.taskDescription &&
            parsed.starterCode &&
            parsed.originalCode &&
            parsed.referenceSolution) {
            return {
                filePath,
                challengeType: parsed.challengeType,
                taskDescription: parsed.taskDescription,
                starterCode: parsed.starterCode,
                originalCode: parsed.originalCode,
                referenceSolution: parsed.referenceSolution,
            };
        }
    }
    catch (err) {
        console.error(`[generateMicroChallenge] Generation failed for ${filePath}:`, err.message);
    }
    // Graceful fallback challenge if generation fails or JSON parses incorrectly
    return {
        filePath,
        challengeType: chosenType,
        taskDescription: chosenType === 'bug'
            ? `### Bug Fix Challenge\nFind and resolve any logical bugs in ${filePath}. Ensure correctness, performance, and match the existing file style.`
            : `### Feature Challenge\nExtend ${filePath} by adding a small helper function/method that logs or prints output values. Make sure it integrates seamlessly with the code.`,
        starterCode: code,
        originalCode: code,
        referenceSolution: code,
    };
}
