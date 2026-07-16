'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import CodeBlock from '@/components/dashboard/CodeBlock';

interface Question {
  id: string;
  question_text: string;
  code_snippet: string;
  file_path: string;
  line_start: number;
  line_end: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  order_index: number;
  shared_answer?: string;
  show_expected_answer?: boolean;
  options?: string[];
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
  const [validationError, setValidationError] = useState<'NOT_FOUND' | 'COMPLETED' | 'CANCELLED' | null>(null);

  // Session & Questions
  const [session, setSession] = useState<any | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQIndex, setActiveQIndex] = useState(0);

  // Candidate answers (typed thoughts, mapped by question_id)
  const [candidateNotes, setCandidateNotes] = useState<Record<string, string>>({});
  const [savingAnswer, setSavingAnswer] = useState<Record<string, boolean>>({});

  // Timer states
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const [qTimeLeft, setQTimeLeft] = useState(120);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const loadCandidateWorkspace = async () => {
      try {
        setLoading(true);
        // Call public candidate session verification API
        const res = await fetch(`/api/candidate/session?sessionId=${sessionId}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          if (res.status === 404) {
            setValidationError('NOT_FOUND');
          } else {
            setError(data.error || 'Failed to load candidate workspace.');
          }
          setLoading(false);
          return;
        }

        const sessData = data.session;
        setSession(sessData);

        if (sessData.status === 'completed') {
          setValidationError('COMPLETED');
          setLoading(false);
          return;
        }

        if (sessData.status === 'cancelled') {
          setValidationError('CANCELLED');
          setLoading(false);
          return;
        }

        // Calculate timer
        if (sessData.is_paused) {
          setTimeLeftSeconds(sessData.remaining_seconds ?? (sessData.timer_duration_minutes * 60));
          setTimerExpired((sessData.remaining_seconds ?? 1) <= 0);
        } else {
          const durationSeconds = sessData.timer_duration_minutes * 60;
          const elapsedSeconds = Math.floor((Date.now() - new Date(sessData.started_at).getTime()) / 1000);
          const remaining = Math.max(0, durationSeconds - elapsedSeconds);
          setTimeLeftSeconds(remaining);
          if (remaining <= 0) {
            setTimerExpired(true);
          }
        }

        setQuestions(data.questions || []);

        const restoredNotes: Record<string, string> = {};
        (data.answers || []).forEach((a: any) => {
          restoredNotes[a.question_id] = a.answer_text || '';
        });
        setCandidateNotes(restoredNotes);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load candidate workspace.');
      } finally {
        setLoading(false);
      }
    };

    loadCandidateWorkspace();
  }, [sessionId]);

  // Background check every 5 seconds to auto-transition and sync shared answer guides
  useEffect(() => {
    if (!sessionId || validationError || loading || timerExpired) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/candidate/session?sessionId=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        const sessData = data.session;
        if (sessData) {
          setSession((prev: any) => prev ? { ...prev, ...sessData } : sessData);
          if (sessData.status === 'completed') {
            setValidationError('COMPLETED');
          } else if (sessData.status === 'cancelled') {
            setValidationError('CANCELLED');
          }

          // Sync timer
          if (sessData.is_paused) {
            setTimeLeftSeconds(sessData.remaining_seconds ?? (sessData.timer_duration_minutes * 60));
          } else {
            const durationSeconds = sessData.timer_duration_minutes * 60;
            const elapsedSeconds = Math.floor((Date.now() - new Date(sessData.started_at).getTime()) / 1000);
            const remaining = Math.max(0, durationSeconds - elapsedSeconds);
            setTimeLeftSeconds(remaining);
            if (remaining <= 0) {
              setTimerExpired(true);
            }
          }
        }

        if (data.questions) {
          setQuestions(prevQuestions => {
            return prevQuestions.map(prevQ => {
              const updatedQ = data.questions.find((q: any) => q.id === prevQ.id);
              if (updatedQ) {
                return {
                  ...prevQ,
                  shared_answer: updatedQ.shared_answer,
                  show_expected_answer: updatedQ.show_expected_answer
                };
              }
              return prevQ;
            });
          });
        }
      } catch (e) {
        console.error('Failed to run background status check:', e);
      }
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [sessionId, validationError, loading, timerExpired]);

  // Timer countdown hook
  useEffect(() => {
    if (timeLeftSeconds <= 0 || timerExpired || session?.is_paused) return;
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
  }, [timeLeftSeconds, timerExpired, session?.is_paused]);

  const getLogicalDuration = () => {
    return (session?.mode_config?.logicalTimerMinutes || 2) * 60;
  };

  // Reset logical question timer when question index changes
  useEffect(() => {
    const currentQ = questions[activeQIndex];
    const isLogicalActive = session?.interview_mode === 'logical' || 
      (currentQ?.options && currentQ.options.length > 0 && session?.mode_config?.logicalTimerMinutes);
    if (isLogicalActive) {
      setQTimeLeft(getLogicalDuration());
    }
  }, [activeQIndex, session, questions]);

  const handleLogicalTimeExpired = async () => {
    const curQ = questions[activeQIndex];
    if (!curQ) return;

    // Save "time_expired" answer
    await saveCandidateAnswer(curQ.id, 'time_expired');

    if (activeQIndex < questions.length - 1) {
      setActiveQIndex(prev => prev + 1);
    } else {
      // Automatically submit if it's the last question
      handleSubmit();
    }
  };

  // Question timer countdown hook
  useEffect(() => {
    const currentQ = questions[activeQIndex];
    const isLogicalActive = session?.interview_mode === 'logical' || 
      (currentQ?.options && currentQ.options.length > 0 && session?.mode_config?.logicalTimerMinutes);
    if (!isLogicalActive || session?.is_paused || qTimeLeft <= 0 || loading || timerExpired) return;

    const qInterval = setInterval(() => {
      setQTimeLeft(prev => {
        const nextVal = prev - 1;
        if (nextVal <= 0) {
          clearInterval(qInterval);
          handleLogicalTimeExpired();
          return 0;
        }
        return nextVal;
      });
    }, 1000);

    return () => clearInterval(qInterval);
  }, [qTimeLeft, session, loading, timerExpired, activeQIndex, questions]);

  const handleSubmit = async () => {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/candidate/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, status: 'completed' })
      });
      if (res.ok) {
        setValidationError('COMPLETED');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit interview.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit interview.');
    } finally {
      setSubmitting(false);
    }
  };

  // Save notes to Supabase via candidate/answer API
  const saveCandidateAnswer = async (qId: string, text: string) => {
    if (timerExpired || !sessionId) return;
    setSavingAnswer(prev => ({ ...prev, [qId]: true }));
    try {
      const res = await fetch('/api/candidate/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: qId,
          answerText: text
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save');
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-sm font-mono text-[#94A3B8]">Entering screening room...</p>
      </div>
    );
  }

  if (validationError === 'NOT_FOUND') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white p-8">
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-8 max-w-md text-center shadow-xl space-y-4">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#06B6D4] text-4xl">terminal</span>
            <span className="font-headline-md text-2xl font-bold text-[#06B6D4] tracking-tight">CodeWalk</span>
          </div>
          <span className="material-symbols-outlined text-5xl text-red-500">error</span>
          <h2 className="text-xl font-bold">Session Not Found</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            The interview session you are trying to access does not exist or has been removed. Please contact your recruiter to request a valid link.
          </p>
        </div>
      </div>
    );
  }

  if (validationError === 'COMPLETED' || timerExpired || session?.status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white p-8">
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-8 max-w-md text-center shadow-xl space-y-4">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#06B6D4] text-4xl">terminal</span>
            <span className="font-headline-md text-2xl font-bold text-[#06B6D4] tracking-tight">CodeWalk</span>
          </div>
          <span className="material-symbols-outlined text-5xl text-[#06B6D4] animate-bounce">check_circle</span>
          <h2 className="text-xl font-bold">Interview Completed</h2>
          <p className="text-sm font-semibold text-cyan-400">Thank You!</p>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            This interview session has already ended. Your responses have been frozen and submitted to the recruiter.
          </p>
        </div>
      </div>
    );
  }

  if (validationError === 'CANCELLED' || session?.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white p-8">
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-8 max-w-md text-center shadow-xl space-y-4">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#06B6D4] text-4xl">terminal</span>
            <span className="font-headline-md text-2xl font-bold text-[#06B6D4] tracking-tight">CodeWalk</span>
          </div>
          <span className="material-symbols-outlined text-5xl text-yellow-500">cancel</span>
          <h2 className="text-xl font-bold">Session Cancelled</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            This screening session has been cancelled by the recruiter. Please contact them for further details.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white p-8">
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-4 max-w-md text-center">
          <span className="material-symbols-outlined text-3xl font-bold mb-2">warning</span>
          <p className="font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[activeQIndex];

  return (
    <div className="flex flex-col h-screen bg-[#0d1515] text-[#F1F5F9] overflow-hidden select-none">
      
      {/* Candidate Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-[#151d1e] border-b border-[#3b494b] z-10">
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
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1515] border border-[#3b494b] rounded-lg font-mono">
          <span className="material-symbols-outlined text-sm text-[#06B6D4]">timer</span>
          <span className="text-sm font-bold text-white">{formatTime(timeLeftSeconds)}</span>
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT NAV PANEL (Questions List) */}
        <div className="w-[20%] border-r border-[#3b494b] bg-[#151d1e]/40 flex flex-col p-4 overflow-y-auto custom-scrollbar">
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
                      : 'bg-[#151d1e]/40 border-[#3b494b] text-[#94A3B8] hover:bg-[#151d1e]'
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
            <div className="w-1/2 border-r border-[#3b494b] flex flex-col p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 shadow-xl space-y-4">
                <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider block">Question details</span>
                <h2 className="text-base font-bold leading-relaxed text-white">{currentQ.question_text}</h2>
                
                {currentQ.file_path && currentQ.file_path !== 'Custom Question' && (
                  <div className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-1 bg-[#0d1515]/50 px-2.5 py-1.5 rounded border border-[#3b494b]">
                    <span className="material-symbols-outlined text-xs">folder_open</span>
                    <span className="truncate">{currentQ.file_path} (Lines {currentQ.line_start}-{currentQ.line_end})</span>
                  </div>
                )}
              </div>

              {/* Ideal Answer Shared by Interviewer */}
              {currentQ.show_expected_answer && currentQ.shared_answer && (
                <div className="bg-[#06B6D4]/10 border border-[#06B6D4]/40 rounded-xl p-5 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-2 text-cyan-400 font-extrabold uppercase tracking-widest text-xs select-none">
                    <span className="material-symbols-outlined text-sm text-[13px]">info</span>
                    <span>Interviewer Shared: Ideal Solution Guide</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" title="Active Solution Guide Shared"></span>
                  </div>
                  <div className="whitespace-pre-line text-xs leading-relaxed text-[#F1F5F9] bg-[#0d1515]/60 p-4 rounded-lg border border-[#3b494b]/60 font-medium">
                    {currentQ.shared_answer}
                  </div>
                </div>
              )}

              {/* Code Snippet Box */}
              {currentQ.code_snippet ? (
                <div className="flex flex-col flex-grow">
                  <CodeBlock
                    code={currentQ.code_snippet}
                    filePath={currentQ.file_path}
                    lineStart={currentQ.line_start}
                    lineEnd={currentQ.line_end}
                  />
                </div>
              ) : (
                <div className="bg-[#0d1515] border border-[#3b494b] rounded-xl p-8 text-center text-[#94A3B8] italic flex items-center justify-center flex-grow">
                  No code snippet associated with this question.
                </div>
              )}
            </div>

            {/* Right 50% - Explanation Text Area / Options */}
            <div className="w-1/2 flex flex-col p-6 space-y-4 bg-[#151d1e]/10">
              
              {/* Question timer bar (only if MCQ or logical round) */}
              {(session?.interview_mode === 'logical' || (currentQ?.options && currentQ.options.length > 0 && session?.mode_config?.logicalTimerMinutes)) && (
                <div className="space-y-1 mb-2 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                    <span>Question Timer Limit</span>
                    <span className="font-mono">{formatTime(qTimeLeft)}</span>
                  </div>
                  <div className="w-full bg-[#0d1515] h-2 rounded-full overflow-hidden border border-[#3b494b]/60">
                    <div 
                      className="h-full bg-orange-500 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${Math.max(0, Math.min(100, (qTimeLeft / getLogicalDuration()) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">
                  {currentQ.options && currentQ.options.length > 0 ? 'Multiple Choice Evaluation' : 'Your Solution Draft & Explanation'}
                </label>
                {savingAnswer[currentQ.id] && (
                  <span className="text-[10px] text-cyan-400 font-semibold animate-pulse inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                    Autosaving thoughts...
                  </span>
                )}
              </div>

              <div className="flex-grow flex flex-col bg-[#0d1515] border border-[#3b494b] rounded-xl overflow-hidden p-4 shadow-xl justify-center">
                {currentQ.options && currentQ.options.length > 0 ? (
                  <div className="space-y-6 w-full py-4 overflow-y-auto custom-scrollbar">
                    <label className="text-xs font-bold text-orange-400 uppercase tracking-wider block text-center">
                      Select Your Answer Option
                    </label>
                    <div className="grid grid-cols-1 gap-4 max-w-md mx-auto w-full px-2">
                      {currentQ.options.map((opt, oIdx) => {
                        const isSelected = candidateNotes[currentQ.id] === opt;
                        return (
                          <button
                            key={oIdx}
                            onClick={async () => {
                              if (timerExpired) return;
                              // 1. Instantly highlight selection in local state
                              setCandidateNotes(prev => ({ ...prev, [currentQ.id]: opt }));
                              // 2. Save choice to database
                              await saveCandidateAnswer(currentQ.id, opt);
                              // 3. Briefly pause for visual feedback, then auto-advance
                              setTimeout(() => {
                                if (activeQIndex < questions.length - 1) {
                                  setActiveQIndex(prev => prev + 1);
                                }
                              }, 500);
                            }}
                            className={`p-4 rounded-xl text-left font-mono text-xs border transition-all cursor-pointer w-full ${
                              isSelected
                                ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-bold shadow-lg shadow-orange-500/5'
                                : 'bg-[#151d1e]/40 border-[#3b494b] text-[#b9cacb] hover:border-orange-500/40 hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={candidateNotes[currentQ.id] || ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    className="w-full h-full bg-transparent text-sm text-white focus:outline-none resize-none custom-scrollbar leading-relaxed"
                    placeholder="Draft your solution ideas, complexity analysis, or walkthrough notes here. The interviewer sees these updates in real-time."
                  />
                )}
              </div>

              {/* Navigator footer */}
              <div className="flex justify-between items-center border-t border-[#3b494b] pt-4">
                <button
                  onClick={() => setActiveQIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeQIndex === 0}
                  className="px-3.5 py-1.5 border border-[#3b494b] text-xs font-bold rounded-lg text-[#94A3B8] hover:bg-[#0d1515] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-all inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">navigate_before</span>
                  Previous
                </button>
                <span className="text-xs text-[#94A3B8] font-mono">
                  {activeQIndex + 1} / {questions.length}
                </span>
                {activeQIndex === questions.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-1.5 bg-[#06B6D4] text-xs font-bold rounded-lg text-[#0d1515] hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-[#06B6D4] transition-all inline-flex items-center gap-1"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-3.5 py-1.5 border border-[#3b494b] text-xs font-bold rounded-lg text-[#94A3B8] hover:bg-[#0d1515] hover:text-white transition-all inline-flex items-center gap-1"
                  >
                    Next
                    <span className="material-symbols-outlined text-sm">navigate_next</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-grow flex flex-col justify-center items-center text-[#94A3B8] italic p-8 text-center">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#3b494b]">question_mark</span>
            No screening questions loaded for this session.
          </div>
        )}

      </div>
    </div>
  );
}
