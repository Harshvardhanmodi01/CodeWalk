import Groq from 'groq-sdk';

/**
 * Interface representing the structured skills extracted from a Job Description.
 */
export interface JdSkills {
  required: string[];
  nice_to_have: string[];
  seniority: string;
}

/**
 * Interface representing a matched skill with justification.
 */
export interface SkillMatchItem {
  skill: string;
  justification: string;
}

/**
 * Interface representing the compared gap analysis result.
 */
export interface SkillMatchResult {
  strong_match: SkillMatchItem[];
  partial_match: SkillMatchItem[];
  no_evidence: SkillMatchItem[];
}

/**
 * Extract structured skills from raw Job Description text using Groq.
 */
export async function extractSkillsFromJD(jdText: string): Promise<JdSkills | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || !jdText.trim()) return null;

  try {
    const groq = new Groq({ apiKey: groqKey });
    const systemPrompt = `You are a technical recruiting assistant.
Analyze the provided Job Description text and extract:
1. required: Must-have technical skills, programming languages, frameworks, libraries, databases, or tools.
2. nice_to_have: Nice-to-have, optional, or preferred skills.
3. seniority: Seniority level (e.g. Junior, Mid, Senior, Lead, or Unknown).

Return ONLY a valid JSON object matching the schema:
{
  "required": ["React", "TypeScript", "Node.js"],
  "nice_to_have": ["GraphQL", "Docker"],
  "seniority": "Senior"
}
Do NOT wrap your JSON in markdown code blocks.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Job Description:\n${jdText}` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const contentText = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(contentText.trim());

    return {
      required: Array.isArray(parsed.required) ? parsed.required : [],
      nice_to_have: Array.isArray(parsed.nice_to_have) ? parsed.nice_to_have : [],
      seniority: parsed.seniority || 'Unknown'
    };
  } catch (err: any) {
    console.error('[extractSkillsFromJD] Error parsing skills:', err.message);
    return null;
  }
}

/**
 * Compare JD skills with candidate's demonstrated repository analysis data.
 */
export async function compareSkills(
  jdSkills: JdSkills,
  repoAnalysis: any
): Promise<SkillMatchResult | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    const groq = new Groq({ apiKey: groqKey });

    // Format files and snapshots for LLM context
    const filesContext = (repoAnalysis?.files || []).map((f: any) => {
      const snippets = (f.codeSnapshots || []).map((s: any) => s.snippet).join('\n\n');
      return `File: ${f.fileName}\nQuestions Generated: ${f.questions}\nCode Snippet:\n${snippets}`;
    }).join('\n\n=========================================\n\n');

    const systemPrompt = `You are a senior technical interviewer comparing a job description's expected skills against a candidate's analyzed repository codebase.
Analyze the expected JD skills and the candidate's repository file contents, path extensions, code snippets, and question categories.

Classify EACH technical skill from the Job Description (both required and nice_to_have) into exactly one of three categories:
1. strong_match: Clear, deep evidence of direct implementation in the codebase (e.g. central files, direct imports, heavy logic).
2. partial_match: Some minor usage, basic imports, or config setup, but no extensive codebase implementation.
3. no_evidence: Absolutely no presence of this technology, files, configuration, or imports in the candidate's repository.

For each item, write a single-sentence justification citing specific file paths or patterns (or explaining the complete absence of any).
Use a constructive, technical, and objective tone (e.g., "React: Utilized extensively across src/components/Button.tsx for stateful UI.").

Return ONLY a valid JSON object matching the schema:
{
  "strong_match": [
    { "skill": "React", "justification": "React functional components are utilized extensively across src/components/Button.tsx for stateful UI." }
  ],
  "partial_match": [
    { "skill": "TypeScript", "justification": "Used in src/index.ts but types are mostly set to 'any'." }
  ],
  "no_evidence": [
    { "skill": "Docker", "justification": "No Dockerfile or docker-compose configuration was found in the repository." }
  ]
}
Do NOT wrap your JSON in markdown code blocks.`;

    const userPrompt = `### Job Description Skills:
Required Skills: ${jdSkills.required.join(', ')}
Nice-to-Have Skills: ${jdSkills.nice_to_have.join(', ')}
Target Seniority: ${jdSkills.seniority}

### Candidate's Repository Ingest Output:
${filesContext}
`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const contentText = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(contentText.trim());

    return {
      strong_match: Array.isArray(parsed.strong_match) ? parsed.strong_match : [],
      partial_match: Array.isArray(parsed.partial_match) ? parsed.partial_match : [],
      no_evidence: Array.isArray(parsed.no_evidence) ? parsed.no_evidence : []
    };
  } catch (err: any) {
    console.error('[compareSkills] Error comparing skills:', err.message);
    return null;
  }
}
