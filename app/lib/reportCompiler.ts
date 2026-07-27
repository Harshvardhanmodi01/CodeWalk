import { supabaseAdmin } from './supabaseAdmin';
import Groq from 'groq-sdk';

export async function compileAndSaveReport(sessionId: string, forceRefresh = false): Promise<any> {
  try {
    // 1. Check existing cache in DB if not forced
    if (!forceRefresh) {
      const { data: existingReport } = await supabaseAdmin
        .from('session_reports')
        .select('code_story_summary')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (existingReport && existingReport.code_story_summary) {
        try {
          const parsed = JSON.parse(existingReport.code_story_summary);
          if (parsed && parsed.overall_score !== undefined) {
            return parsed;
          }
        } catch (e) {
          // ignore parsing error and proceed to generate
        }
      }
    }

    // 2. Fetch session details
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessErr || !session) {
      throw new Error('Session not found');
    }

    // 3. Fetch questions
    const { data: qs, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true });

    if (qErr || !qs) {
      throw new Error('Questions not found');
    }

    // 4. Fetch answers
    const { data: answers, error: ansErr } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('session_id', sessionId);

    if (ansErr || !answers) {
      throw new Error('Answers not found');
    }

    // 5. Consolidate questions and answers for LLM
    const consolidatedAnswers = qs.map((q: any) => {
      const matchingAns = answers.find((a: any) => a.question_id === q.id);
      const hasAnswer = matchingAns && matchingAns.answer_text && matchingAns.answer_text.trim() !== '' && matchingAns.answer_text !== 'No response recorded.' && matchingAns.answer_text !== 'time_expired';
      return {
        id: q.id,
        question_text: q.question_text,
        file_path: q.file_path,
        category: q.category,
        difficulty: q.difficulty,
        answer_text: matchingAns?.answer_text || 'No response recorded.',
        score: hasAnswer ? (matchingAns.ai_score !== undefined && matchingAns.ai_score !== null ? matchingAns.ai_score : 5) : 0
      };
    });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    const groq = new Groq({ apiKey: groqKey });

    const mode = session.interview_mode || 'technical';
    const behavioralScores = session.behavioral_scores || [];
    const logicalScores = session.logical_scores || [];

    const systemPrompt = `You are a senior technical screener evaluating a candidate's software engineering interview.
The interview was conducted in "${mode}" mode.
Analyze the list of questions, candidate answers, recruiter scores, and specialized ratings.

Based on the interview mode, formulate a comprehensive evaluation report.
- If behavioral round ratings are provided, evaluate their communication clarity, confidence level, and relevance.
- If logical round results are provided, evaluate their cognitive ability, number sequences accuracy, and deduction skills.
- If fullstack or custom modes are used, combine all evaluations together.
- For the "score" field under "question_analysis", you MUST independently evaluate the candidate's answer based on correctness, technical depth, and completeness. Grade it on a scale of 0 to 10. A strong, detailed, and correct answer should receive a high score (9 or 10). If the candidate skipped or provided an empty/expired response, the score MUST be 0. Do NOT simply copy the default "Recruiter score given" value.

You must return a valid JSON object matching this schema:
{
  "overall_score": 85, // 0 to 100 integer. (For Fullstack: calculate as 50% Technical score + 30% Behavioral score + 20% Logical score)
  "hire_recommendation": "hire" | "maybe" | "pass",
  "recommendation_reasoning": "A concise explanation of the recommendation.",
  "strengths": ["Strength 1", "Strength 2"],
  "areas_of_improvement": ["Area 1", "Area 2"],
  "technical_summary": "Detailed technical analysis (if technical section is active, otherwise empty).",
  "behavioral_summary": "Detailed HR behavioral analysis, communication, and culture fit (if behavioral section is active, otherwise empty).",
  "logical_summary": "Detailed logical aptitude and problem solving analysis (if logical section is active, otherwise empty).",
  "question_analysis": [
    {
      "question": "Question text...",
      "score": 8, // 1 to 10 integer
      "feedback": "AI evaluation of candidate's answer for this question."
    }
  ],
  "final_summary": "Overall technical overview of the candidate's logical ability and fit."
}
Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON.`;

    const userPrompt = `Interview Details:
Mode: ${mode}
Answers & Recruiter Notes:
${consolidatedAnswers.map((a, i) => `[Question ${i + 1}] Category: ${a.category}, Difficulty: ${a.difficulty}
Q: ${a.question_text}
Candidate Answer/Recruiter Notes: ${a.answer_text || 'No response recorded.'}
Recruiter score given: ${(a.score !== undefined && a.score !== null) ? a.score : 5}/10`).join('\n\n')}

${behavioralScores.length > 0 ? `HR Behavioral Ratings:
${JSON.stringify(behavioralScores, null, 2)}` : ''}

${logicalScores.length > 0 ? `Logical Reasoning Results:
${JSON.stringify(logicalScores, null, 2)}` : ''}
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

    const resultText = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(resultText);

    // Apply proctoring weighted score calculation:
    // overall_score = 0.85 * (Groq performance score) + 0.15 * (proctoring integrity score)
    const { data: summary } = await supabaseAdmin
      .from('proctoring_summary')
      .select('overall_integrity_score')
      .eq('session_id', sessionId)
      .maybeSingle();

    const integrityScore = summary ? summary.overall_integrity_score : 100;
    const responseScore = parsed.overall_score || 50;
    const finalScore = Math.round(0.85 * responseScore + 0.15 * integrityScore);
    parsed.overall_score = Math.max(0, Math.min(100, finalScore));

    // Fetch repo_authenticity, challenge_evaluation and match skills from the session's worker results
    const repoAuthenticity = (session.result as any)?.repoAuthenticity || null;
    if (repoAuthenticity) {
      parsed.repo_authenticity = repoAuthenticity;
    }

    const challengeEvaluation = (session.result as any)?.challenge_evaluation || null;
    if (challengeEvaluation) {
      parsed.challenge_evaluation = challengeEvaluation;
    }

    // JD-to-Skill Gap Matching logic
    try {
      let positionId: string | null = null;
      if (session.candidate_id) {
        const { data: candData } = await supabaseAdmin
          .from('candidates')
          .select('position_id')
          .eq('id', session.candidate_id)
          .maybeSingle();
        positionId = candData?.position_id || null;
      }

      let positionJd: string | null = null;
      if (positionId) {
        const { data: posData } = await supabaseAdmin
          .from('positions')
          .select('job_description')
          .eq('id', positionId)
          .maybeSingle();
        positionJd = posData?.job_description || null;
      }

      const jdText = (session.mode_config as any)?.jobDescription || positionJd || '';
      if (jdText.trim()) {
        // Check cache in sibling sessions under the same position
        let cachedJdSkills: any = null;
        if (positionId) {
          const { data: siblingCands } = await supabaseAdmin
            .from('candidates')
            .select('id')
            .eq('position_id', positionId);

          const siblingCandIds = (siblingCands || []).map(c => c.id);
          if (siblingCandIds.length > 0) {
            const { data: siblingSessions } = await supabaseAdmin
              .from('sessions')
              .select('result')
              .in('candidate_id', siblingCandIds);

            for (const sess of (siblingSessions || [])) {
              const sessCachedJd = (sess.result as any)?.cached_jd;
              if (sessCachedJd && sessCachedJd.text === jdText && sessCachedJd.skills) {
                cachedJdSkills = sessCachedJd.skills;
                break;
              }
            }
          }
        }

        const { extractSkillsFromJD, compareSkills } = require('./skillMatcher');
        let jdSkills = cachedJdSkills;
        if (!jdSkills) {
          jdSkills = await extractSkillsFromJD(jdText);
        }

        if (jdSkills) {
          const skillMatchReport = await compareSkills(jdSkills, session.result);
          if (skillMatchReport) {
            parsed.skill_match_report = skillMatchReport;

            // Cache it back to this session's result
            const updatedResult = {
              ...(session.result as any),
              cached_jd: {
                text: jdText,
                skills: jdSkills
              }
            };

            await supabaseAdmin
              .from('sessions')
              .update({ result: updatedResult })
              .eq('id', sessionId);
          }
        }
      }
    } catch (jdErr: any) {
      console.warn('[report-compiler] Skill matching failed:', jdErr.message);
    }

    // Save the updated AI scores back to the answers table
    if (parsed.question_analysis && Array.isArray(parsed.question_analysis)) {
      const updatePromises = parsed.question_analysis.map(async (qa: any) => {
        const matchedQ = qs.find((q: any) => q.question_text === qa.question);
        if (matchedQ) {
          await supabaseAdmin
            .from('answers')
            .update({ ai_score: qa.score })
            .eq('session_id', sessionId)
            .eq('question_id', matchedQ.id);
        }
      });
      await Promise.all(updatePromises);
    }

    // Save/Upsert the final compiled report JSON to session_reports table
    const completedCount = consolidatedAnswers.filter((a: any) => a.answer_text.trim().length > 0).length;
    const payload: any = {
      session_id: sessionId,
      overall_score: parsed.overall_score || 50,
      custom_score: parsed.overall_score || 50,
      hire_recommendation: parsed.hire_recommendation || 'maybe',
      code_story_summary: JSON.stringify(parsed),
      total_questions: consolidatedAnswers.length,
      completed_questions: completedCount,
      generated_at: new Date().toISOString()
    };

    await supabaseAdmin
      .from('session_reports')
      .upsert(payload, { onConflict: 'session_id' });

    return parsed;
  } catch (err: any) {
    console.error('[report-compiler] Failed to compile and save report:', err.message);
    throw err;
  }
}
