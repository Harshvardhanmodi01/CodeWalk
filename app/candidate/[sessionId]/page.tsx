'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';

interface Question {
  id: string;
  question_text: string;
  code_snippet: string;
  file_path: string;
  line_start: number;
  line_end: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'frontend' | 'backend' | 'dsa' | 'system-design';
  order_index: number;
}

interface Session {
  id: string;
  repo_url: string;
  status: 'active' | 'completed' | 'cancelled';
  timer_duration_minutes: number;
  started_at: string;
}

export default function CandidateSessionPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Session & Questions
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQIndex, setActiveQIndex] = useState(0);

  // Candidate answers (typed thoughts, mapped by question_id)
  const [candidateNotes, setCandidateNotes] = useState<Record<string, string>>({});
  const [savingAnswer, setSavingAnswer] = useState<Record<string, boolean>>({});

  // Timer states
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const loadCandidateWorkspace = async () => {
      try {
        setLoading(true);
        // 1. Fetch Session (No auth required because of public SELECT policy)
        const { data: sessData, error: sessErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessErr || !sessData) throw new Error(sessErr?.message || 'Session not found');
        setSession(sessData);

        if (sessData.status !== 'active') {
          setTimerExpired(true);
        }

        // Calculate timer
        const durationSeconds = sessData.timer_duration_minutes * 60;
        const elapsedSeconds = Math.floor((Date.now() - new Date(sessData.started_at).getTime()) / 1000);
        const remaining = Math.max(0, durationSeconds - elapsedSeconds);
        setTimeLeftSeconds(remaining);
        if (remaining <= 0) {
          setTimerExpired(true);
        }

        // 2. Fetch Questions
        const { data: qData, error: qErr } = await supabase
          .from('questions')
          .select('*')
          .eq('session_id', sessionId)
          .order('order_index', { ascending: true });

        if (qErr) throw qErr;
        setQuestions(qData || []);

        // 3. Fetch existing answers (so candidate notes are restored if they refresh)
        const { data: ansData, error: ansErr } = await supabase
          .from('answers')
          .select('*')
          .eq('session_id', sessionId);

        if (ansErr) throw ansErr;
        
        const restoredNotes: Record<string, string> = {};
        (ansData || []).forEach(a => {
          restoredNotes[a.question_id] = a.answer_text || '';
        });
        setCandidateNotes(restoredNotes);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load candidate workspace.');
      } finally {
        setLoading(false);
      }
    };

    loadCandidateWorkspace();
  }, [sessionId]);

  // Timer countdown hook
  useEffect(() => {
    if (timeLeftSeconds <= 0 || timerExpired) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeftSeconds, timerExpired]);

  // Save notes to Supabase (autosave)
  const saveCandidateAnswer = async (qId: string, text: string) => {
    if (timerExpired || !sessionId) return;
    setSavingAnswer(prev => ({ ...prev, [qId]: true }));
    try {
      // Check if answer already exists
      const { data: existing, error: findErr } = await supabase
        .from('answers')
        .select('id, ai_score')
        .eq('session_id', sessionId)
        .eq('question_id', qId)
        .maybeSingle();

      if (findErr) throw findErr;

      const currentScore = existing?.ai_score || 5;

      if (existing) {
        // Update candidate notes while keeping recruiter score intact
        const { error: updErr } = await supabase
          .from('answers')
          .update({
            answer_text: text,
            submitted_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (updErr) throw updErr;
      } else {
        // Insert new answer log
        const { error: insErr } = await supabase
          .from('answers')
          .insert({
            session_id: sessionId,
            question_id: qId,
            answer_text: text,
            ai_score: currentScore
          });
        if (insErr) throw insErr;
      }
    } catch (err) {
      console.warn('Failed to autosave response thoughts:', err);
    } finally {
      setSavingAnswer(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleNotesChange = (text: string) => {
    const qId = questions[activeQIndex]?.id;
    if (!qId || timerExpired) return;
    setCandidateNotes(prev => ({ ...prev, [qId]: text }));
    saveCandidateAnswer(qId, text);
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-sm font-mono text-[#94A3B8]">Entering screening room...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-white p-8">
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-4 max-w-md text-center">
          <span className="material-symbols-outlined text-3xl font-bold mb-2">warning</span>
          <p className="font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (timerExpired || session?.status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-[#F1F5F9] p-8">
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-8 max-w-md text-center shadow-xl space-y-4">
          <span className="material-symbols-outlined text-5xl text-[#06B6D4] animate-pulse">lock</span>
          <h2 className="text-xl font-bold">Screening Completed</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            The timer has expired or the recruiter has concluded this interview session. Thank you for your time.
          </p>
        </div>
      </div>
    );
  }

  const currentQ = questions[activeQIndex];

  return (
    <div className="flex flex-col h-screen bg-[#0F172A] text-[#F1F5F9] overflow-hidden select-none">
      
      {/* Candidate Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-[#1E293B] border-b border-[#334155] z-10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm tracking-tight text-[#06B6D4]">CodeWalk Screening Room</h1>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping"></span>
            <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Candidate Workspace</span>
          </div>
          <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">
            Repository Context: {session?.repo_url.replace('https://github.com/', '')}
          </p>
        </div>

        {/* Timer Box */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0F172A] border border-[#334155] rounded-lg font-mono">
          <span className="material-symbols-outlined text-sm text-[#06B6D4]">timer</span>
          <span className="text-sm font-bold text-white">{formatTime(timeLeftSeconds)}</span>
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT NAV PANEL (Questions List) */}
        <div className="w-[20%] border-r border-[#334155] bg-[#1E293B]/40 flex flex-col p-4 overflow-y-auto custom-scrollbar">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-3">Interview Questions</span>
          
          <div className="space-y-2">
            {questions.map((q, idx) => {
              const isSelected = idx === activeQIndex;
              const hasContent = (candidateNotes[q.id] || '').trim().length > 0;

              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQIndex(idx)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#06B6D4]/10 border-[#06B6D4] text-white font-semibold'
                      : 'bg-[#1E293B]/40 border-[#334155] text-[#94A3B8] hover:bg-[#1E293B]'
                  }`}
                >
                  <span className="truncate">Question {idx + 1}</span>
                  {hasContent && (
                    <span className="material-symbols-outlined text-emerald-400 text-sm" title="Notes drafted">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN PANEL (Active Question + Thoughts Textbox) */}
        {currentQ ? (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left 50% - Question Text & Code Snippet Reference */}
            <div className="w-1/2 border-r border-[#334155] flex flex-col p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-xl space-y-4">
                <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider block">Question details</span>
                <h2 className="text-base font-bold leading-relaxed text-white">{currentQ.question_text}</h2>
                
                {currentQ.file_path && currentQ.file_path !== 'Custom Question' && (
                  <div className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-1 bg-[#0F172A]/50 px-2.5 py-1.5 rounded border border-[#334155]">
                    <span className="material-symbols-outlined text-xs">folder_open</span>
                    <span className="truncate">{currentQ.file_path} (Lines {currentQ.line_start}-{currentQ.line_end})</span>
                  </div>
                )}
              </div>

              {/* Code Snippet Box */}
              {currentQ.code_snippet ? (
                <div className="bg-[#0F172A] border border-[#334155] rounded-xl overflow-hidden shadow-lg flex flex-col flex-grow">
                  <div className="px-4 py-2 border-b border-[#334155] bg-[#1E293B]/40 flex items-center justify-between text-[10px] font-mono text-[#94A3B8]">
                    <span>Snippet Reference</span>
                    <span>Read-Only</span>
                  </div>
                  <div className="p-4 overflow-auto custom-scrollbar flex-1 font-mono text-xs text-[#94A3B8] leading-relaxed">
                    <pre className="whitespace-pre">{currentQ.code_snippet}</pre>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-8 text-center text-[#94A3B8] italic flex items-center justify-center flex-grow">
                  No code snippet associated with this question.
                </div>
              )}
            </div>

            {/* Right 50% - Explanation Text Area */}
            <div className="w-1/2 flex flex-col p-6 space-y-4 bg-[#1E293B]/10">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">
                  Your Solution Draft & Explanation
                </label>
                {savingAnswer[currentQ.id] && (
                  <span className="text-[10px] text-cyan-400 font-semibold animate-pulse inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                    Autosaving thoughts...
                  </span>
                )}
              </div>

              <div className="flex-grow flex flex-col bg-[#0F172A] border border-[#334155] rounded-xl overflow-hidden p-4 shadow-xl">
                <textarea
                  value={candidateNotes[currentQ.id] || ''}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="w-full h-full bg-transparent text-sm text-white focus:outline-none resize-none custom-scrollbar leading-relaxed"
                  placeholder="Draft your solution ideas, complexity analysis, or walkthrough notes here. The interviewer sees these updates in real-time."
                />
              </div>

              {/* Navigator footer */}
              <div className="flex justify-between items-center border-t border-[#334155] pt-4">
                <button
                  onClick={() => setActiveQIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeQIndex === 0}
                  className="px-3.5 py-1.5 border border-[#334155] text-xs font-bold rounded-lg text-[#94A3B8] hover:bg-[#0F172A] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-all inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">navigate_before</span>
                  Previous
                </button>
                <span className="text-xs text-[#94A3B8] font-mono">
                  {activeQIndex + 1} / {questions.length}
                </span>
                <button
                  onClick={() => setActiveQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={activeQIndex === questions.length - 1}
                  className="px-3.5 py-1.5 border border-[#334155] text-xs font-bold rounded-lg text-[#94A3B8] hover:bg-[#0F172A] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-all inline-flex items-center gap-1"
                >
                  Next
                  <span className="material-symbols-outlined text-sm">navigate_next</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-grow flex flex-col justify-center items-center text-[#94A3B8] italic p-8 text-center">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#334155]">question_mark</span>
            No screening questions loaded for this session.
          </div>
        )}

      </div>
    </div>
  );
}
