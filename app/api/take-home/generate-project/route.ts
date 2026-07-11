import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import Groq from 'groq-sdk';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const {
      candidate_name,
      experience_years,
      tech_stack = [],
      role_title,
      job_description = '',
      difficulty_override
    } = body;

    if (!candidate_name || !experience_years || !role_title) {
      return NextResponse.json(
        { error: 'Missing required fields: candidate_name, experience_years, and role_title' },
        { status: 400 }
      );
    }

    // 1. Calculate difficulty & duration
    let difficulty = 'mid';
    let duration = 5;

    const years = parseFloat(experience_years);
    if (years <= 2) {
      difficulty = 'junior';
      duration = 3;
    } else if (years <= 5) {
      difficulty = 'mid';
      duration = 5;
    } else if (years <= 8) {
      difficulty = 'senior';
      duration = 7;
    } else {
      difficulty = 'lead';
      duration = 10;
    }

    // Apply difficulty override if provided
    if (difficulty_override) {
      difficulty = difficulty_override;
      if (difficulty === 'junior') duration = 3;
      else if (difficulty === 'mid') duration = 5;
      else if (difficulty === 'senior') duration = 7;
      else if (difficulty === 'lead') duration = 10;
    }

    // 2. Initialize Groq
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey: groqKey });
    const techStackStr = tech_stack.join(', ') || 'Modern JavaScript/TypeScript';

    const systemPrompt = `You are a senior engineering hiring manager. Your job is to create rigorous, candidate-specific, and copy-resistant take-home project assignments. You must return your response in EXACT JSON format with no markdown wrappers, no backticks, and no text outside the JSON object.`;

    const userPrompt = `Generate a unique take-home project assignment for a candidate named "${candidate_name}" with ${experience_years} years of experience applying for the "${role_title}" position. 
Their tech stack is: [${techStackStr}].
${job_description ? `Here is the job description for context: ${job_description}` : ''}

Generate a project that:
1. Is completable in ${duration} days by a competent developer.
2. Specifically requires the candidate's skills: ${techStackStr}.
3. Is unique enough that candidates cannot easily copy each other.
4. Tests real-world problem-solving, not just tutorial following.
5. Has clear evaluation criteria.

Return ONLY a valid JSON object matching the following structure:
{
  "project_title": "Catchy and professional name for the project",
  "project_description": "2-3 sentence overview of what the candidate will build",
  "problem_statement": "The real-world business problem being solved",
  "core_requirements": [
    "Must-have feature 1",
    "Must-have feature 2",
    "Must-have feature 3",
    "Must-have feature 4",
    "Must-have feature 5",
    "Must-have feature 6"
  ],
  "bonus_requirements": [
    "Nice-to-have feature 1",
    "Nice-to-have feature 2",
    "Nice-to-have feature 3"
  ],
  "technical_constraints": [
    "Specific technical constraint 1",
    "Specific technical constraint 2"
  ],
  "unique_twist": "One unique requirement specific to this candidate to prevent copying (e.g., custom business logic, specific edge case handling)",
  "evaluation_criteria": {
    "code_quality": 25,
    "feature_completion": 35,
    "technical_choices": 20,
    "readme_quality": 10,
    "commit_history": 10
  },
  "suggested_tech_stack": [
    "Library A",
    "Tool B"
  ],
  "example_data": "Sample data, payload structure, or scenarios to use for testing",
  "deliverables": "Exactly what the candidate must submit (e.g. GitHub repository URL, readme, deployed link if applicable)",
  "evaluation_questions": [
    "Interview question 1 specifically about their architectural choices in this project",
    "Interview question 2 about edge case handling",
    "Interview question 3 about performance/scaling",
    "Interview question 4 about how they structured the data",
    "Interview question 5 about specific testing strategies used"
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const resContent = completion.choices?.[0]?.message?.content;
    if (!resContent) {
      throw new Error('Groq returned an empty response.');
    }

    const parsedBrief = JSON.parse(resContent);

    return NextResponse.json({
      success: true,
      difficulty,
      duration_days: duration,
      project: parsedBrief
    });
  } catch (err: any) {
    console.error('Failed to generate project:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate project' },
      { status: 500 }
    );
  }
}
