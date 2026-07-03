import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const questionsText = body.questions_text || '';
    
    // Parse questions: split by newline, filter empty lines
    const lines = questionsText
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const fallbackQuestions = [
      {
        question_text: 'Describe your experience working with dynamic team environments.',
        expected_answer: {
          ideal_answer_summary: 'Candidate should describe their collaborative mindset, active communication habits, and a concrete example of working on a cross-functional team.',
          key_points: ['Active communication', 'Empathy for team members', 'Shared ownership of successes and failures'],
          red_flags: ['Blaming others for project delays', 'Preferring to work in isolation all the time']
        }
      },
      {
        question_text: 'What is your preferred approach to learning new technologies or frameworks?',
        expected_answer: {
          ideal_answer_summary: 'Candidate should outline a structured approach to learning, such as reading official documentation, building side projects, and seeking peer feedback.',
          key_points: ['Structured learning approach', 'Hands-on experimentation', 'Proactive curiosity'],
          red_flags: ['Waiting to be micro-managed or spoon-fed training', 'Resistance to learning tools outside their comfort zone']
        }
      },
      {
        question_text: 'How do you prioritize tasks when working under tight deadlines?',
        expected_answer: {
          ideal_answer_summary: 'Candidate should explain their prioritization framework (like Eisenhower matrix or impact/effort), how they manage expectations, and when they raise blockers.',
          key_points: ['Prioritization framework', 'Stakeholder communication', 'Managing stress under deadlines'],
          red_flags: ['Working silently without communicating blockers until it is too late', 'Panic or lack of organization']
        }
      }
    ];

    let questions = [];

    const groqKey = process.env.GROQ_API_KEY;

    if (lines.length === 0) {
      // Return fallback questions directly
      questions = fallbackQuestions.map((q, idx) => ({
        question_text: q.question_text,
        code_snippet: '',
        file_path: 'Custom Question',
        line_start: 0,
        line_end: 0,
        difficulty: 'medium',
        category: 'custom',
        why_asked: 'Fallback custom question.',
        expected_answer: q.expected_answer,
        follow_up_questions: []
      }));
    } else {
      if (groqKey) {
        try {
          const groq = new Groq({ apiKey: groqKey });
          const systemPrompt = `You are an expert technical and HR interviewer.
You are given a list of interview questions created by a recruiter.
For each question, generate a structured guide for what an ideal candidate's answer should include.

For each question, output:
- ideal_answer_summary: a brief summary of a strong, complete answer.
- key_points: an array of critical points, topics, or terms the candidate should mention.
- red_flags: an array of warning signs or indicators of a poor response.

Return a valid JSON object matching this schema:
{
  "guides": [
    {
      "ideal_answer_summary": "...",
      "key_points": ["...", "..."],
      "red_flags": ["...", "..."]
    }
  ]
}
Return ONLY valid JSON. No markdown, no extra text.`;

          const userPrompt = `Generate expected answer guides for these ${lines.length} questions:
${lines.map((q: string, i: number) => `Q${i + 1}: ${q}`).join('\n')}`;

          const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
          });

          const resultText = completion.choices?.[0]?.message?.content || '{"guides":[]}';
          const parsed = JSON.parse(resultText);
          const guides = parsed.guides || [];

          questions = lines.map((text: string, idx: number) => {
            const guide = guides[idx] || {
              ideal_answer_summary: 'Review candidate response based on company expectations.',
              key_points: ['Relevant project experience', 'Problem-solving approach'],
              red_flags: ['Vague or generic answers', 'Lack of detail']
            };

            return {
              question_text: text,
              code_snippet: '',
              file_path: 'Custom Question',
              line_start: 0,
              line_end: 0,
              difficulty: 'medium',
              category: 'custom',
              why_asked: 'Recruiter custom interview question.',
              expected_answer: {
                ideal_answer_summary: guide.ideal_answer_summary,
                key_points: guide.key_points,
                red_flags: guide.red_flags
              },
              follow_up_questions: []
            };
          });
        } catch (groqErr) {
          console.warn('Groq custom question generation failed, using fallback answers:', groqErr);
          questions = lines.map((text: string) => ({
            question_text: text,
            code_snippet: '',
            file_path: 'Custom Question',
            line_start: 0,
            line_end: 0,
            difficulty: 'medium',
            category: 'custom',
            why_asked: 'Recruiter custom interview question.',
            expected_answer: {
              ideal_answer_summary: 'Review candidate response based on company expectations.',
              key_points: ['Relevant experience', 'Strong communication'],
              red_flags: ['Unable to provide specific examples']
            },
            follow_up_questions: []
          }));
        }
      } else {
        // No Groq key: return fallback guide structure directly
        questions = lines.map((text: string) => ({
          question_text: text,
          code_snippet: '',
          file_path: 'Custom Question',
          line_start: 0,
          line_end: 0,
          difficulty: 'medium',
          category: 'custom',
          why_asked: 'Recruiter custom interview question.',
          expected_answer: {
            ideal_answer_summary: 'Review candidate response based on company expectations.',
            key_points: ['Relevant experience', 'Strong communication'],
            red_flags: ['Unable to provide specific examples']
          },
          follow_up_questions: []
        }));
      }
    }

    return NextResponse.json({ questions });

  } catch (err: any) {
    console.error('API custom questions error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
