import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { validateUUID, sanitizeString } from '@/app/lib/validation';

/**
 * Public/Candidate API to save or update an answer.
 * Validates session status (must be active) and sanitizes inputs before writing.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, questionId, answerText } = body;

    // Validate request parameters
    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId parameter is required.' }, { status: 400 });
    }
    if (!questionId || !validateUUID(questionId)) {
      return NextResponse.json({ error: 'Valid questionId parameter is required.' }, { status: 400 });
    }

    const sanitizedAnswer = sanitizeString(answerText || '');

    // 1. Verify session exists and is currently active
    const { data: session, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select('status, logical_scores, interview_mode')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'This session is no longer active. Answers are frozen.' }, { status: 400 });
    }

    // Get question details to check for options and expected_answer
    const { data: question, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('category, expected_answer, options')
      .eq('id', questionId)
      .single();

    if (qErr || !question) {
      console.error('Failed to find question details:', qErr);
      return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    }

    let calculatedScore = 5; // Default score for non-MCQ answers
    const hasOptions = question.options && question.options.length > 0;
    const isLogicalCategory = ['logical', 'number-series', 'pattern-recognition', 'logical-deduction', 'situational-judgement', 'verbal-reasoning'].includes(question.category);

    if (hasOptions && isLogicalCategory) {
      // Evaluate MCQ answer correctness
      let correctAnswer = '';
      if (question.expected_answer) {
        let parsedExpected = question.expected_answer;
        if (typeof question.expected_answer === 'string') {
          try {
            parsedExpected = JSON.parse(question.expected_answer);
          } catch (e) {
            // Fallback to raw string
            correctAnswer = question.expected_answer;
          }
        }
        correctAnswer = parsedExpected.correct_answer || parsedExpected;
      }

      let isCorrect = false;
      if (correctAnswer) {
        const optVal = sanitizedAnswer.trim();
        const ansVal = String(correctAnswer).trim();
        
        // Exact match (case insensitive)
        if (optVal.toLowerCase() === ansVal.toLowerCase()) {
          isCorrect = true;
        } else {
          // Extract letter prefix like "A)" or "A." or "A "
          const optLetter = optVal.match(/^([A-D])(?:\)|\]|\.|\s|$)/i)?.[1]?.toUpperCase();
          const ansLetter = ansVal.match(/^([A-D])(?:\)|\]|\.|\s|$)/i)?.[1]?.toUpperCase();
          if (optLetter && ansLetter && optLetter === ansLetter) {
            isCorrect = true;
          } else if (optLetter && ansVal.toUpperCase() === optLetter) {
            isCorrect = true;
          } else if (ansLetter && optVal.toUpperCase() === ansLetter) {
            isCorrect = true;
          }
        }
      }

      calculatedScore = isCorrect ? 10 : 0;

      // Update logical_scores array in the sessions table
      const logicalScores = session.logical_scores || [];
      const updated = [...logicalScores];
      const idx = updated.findIndex(item => item.question_id === questionId);
      const currentItem = idx >= 0 ? { ...updated[idx] } : { question_id: questionId, result: 'skipped', notes: '' };

      currentItem.result = isCorrect ? 'correct' : 'incorrect';
      currentItem.notes = sanitizedAnswer;

      if (idx >= 0) {
        updated[idx] = currentItem;
      } else {
        updated.push(currentItem);
      }

      await supabaseAdmin
        .from('sessions')
        .update({ logical_scores: updated })
        .eq('id', sessionId);
    } else if (sanitizedAnswer === 'time_expired' && isLogicalCategory) {
      calculatedScore = 0;

      // Update logical_scores array in the sessions table as time_expired
      const logicalScores = session.logical_scores || [];
      const updated = [...logicalScores];
      const idx = updated.findIndex(item => item.question_id === questionId);
      const currentItem = idx >= 0 ? { ...updated[idx] } : { question_id: questionId, result: 'skipped', notes: '' };

      currentItem.result = 'time_expired';
      currentItem.notes = 'Candidate failed to respond within the designated question limit.';

      if (idx >= 0) {
        updated[idx] = currentItem;
      } else {
        updated.push(currentItem);
      }

      await supabaseAdmin
        .from('sessions')
        .update({ logical_scores: updated })
        .eq('id', sessionId);
    }

    // 2. Check if answer already exists for this question in this session
    const { data: existing, error: findErr } = await supabaseAdmin
      .from('answers')
      .select('id, ai_score')
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (findErr) {
      console.error('Candidate answer search failed:', findErr);
      return NextResponse.json({ error: 'Database verification failed.' }, { status: 500 });
    }

    if (existing) {
      // 3a. Update existing answer text
      const { error: updErr } = await supabaseAdmin
        .from('answers')
        .update({
          answer_text: sanitizedAnswer,
          ai_score: calculatedScore,
          submitted_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updErr) {
        console.error('Candidate answer update failed:', updErr);
        return NextResponse.json({ error: 'Failed to update answer draft.' }, { status: 500 });
      }
    } else {
      // 3b. Insert new answer record
      const { error: insErr } = await supabaseAdmin
        .from('answers')
        .insert({
          session_id: sessionId,
          question_id: questionId,
          answer_text: sanitizedAnswer,
          ai_score: calculatedScore
        });

      if (insErr) {
        console.error('Candidate answer insert failed:', insErr);
        return NextResponse.json({ error: 'Failed to save new answer draft.' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Candidate answer POST error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
