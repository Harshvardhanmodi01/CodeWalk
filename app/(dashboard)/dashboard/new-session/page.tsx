'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';

interface QuestionItem {
  question_text: string;
  code_snippet: string;
  file_path: string;
  line_start: number;
  line_end: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'frontend' | 'backend' | 'dsa' | 'system-design';
  follow_up_questions?: string[];
}

export default function NewSessionFlow() {
  const router = useRouter();
  const { user } = useGlobal();
  
  // Step tracker
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [duration, setDuration] = useState('45');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [focus, setFocus] = useState<string[]>(['All']);
  
  // Step 2 Code Story State
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [githubAvatar, setGithubAvatar] = useState('');
  
  // Step 3 Questions State
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Focus selection helper
  const handleFocusClick = (area: string) => {
    if (area === 'All') {
      setFocus(['All']);
    } else {
      const filtered = focus.filter(f => f !== 'All');
      if (filtered.includes(area)) {
        const next = filtered.filter(f => f !== area);
        setFocus(next.length === 0 ? ['All'] : next);
      } else {
        setFocus([...filtered, area]);
      }
    }
  };

  // GitHub URL simple validation
  const validateGithubUrl = (url: string) => {
    const pattern = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/?#]+)/i;
    return pattern.test(url.trim());
  };

  // Step 1: Analyze Repository
  const handleAnalyzeRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!candidateName.trim() || !candidateEmail.trim() || !repoUrl.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (!validateGithubUrl(repoUrl)) {
      setError('Invalid GitHub URL. Must match https://github.com/owner/repo');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/session/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Repository analysis failed.');
      
      setAnalysisData(data.analysis);
      setGithubAvatar(data.githubAvatarUrl || `https://github.com/${data.owner}.png`);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'An error occurred during repo analysis.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate Questions
  const handleGenerateQuestions = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/session/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          difficulty,
          focus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate questions.');

      setQuestions(data.questions || []);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating questions.');
    } finally {
      setLoading(false);
    }
  };

  // Reordering questions (Up/Down)
  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newQuestions.length) return;
    
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIdx];
    newQuestions[targetIdx] = temp;
    setQuestions(newQuestions);
  };

  // Deleting question
  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  // Adding custom question
  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestionText.trim()) return;

    const newQ: QuestionItem = {
      question_text: customQuestionText.trim(),
      code_snippet: '',
      file_path: 'Custom Question',
      line_start: 0,
      line_end: 0,
      difficulty: 'medium',
      category: 'system-design'
    };

    setQuestions([...questions, newQ]);
    setCustomQuestionText('');
    setShowAddCustom(false);
  };

  // Step 3: Start Interview & Save to Database
  const handleStartInterview = async () => {
    if (questions.length === 0) {
      setError('You must have at least one question to start the interview.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create Candidate record
      const { data: candData, error: candErr } = await supabase
        .from('candidates')
        .insert({
          name: candidateName.trim(),
          email: candidateEmail.trim(),
          github_url: repoUrl.trim()
        })
        .select()
        .single();

      if (candErr) throw candErr;

      // 2. Create Session record
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .insert({
          recruiter_id: user?.id,
          candidate_id: candData.id,
          repo_url: repoUrl.trim(),
          status: 'active',
          timer_duration_minutes: parseInt(duration)
        })
        .select()
        .single();

      if (sessErr) throw sessErr;

      // 3. Create Session Report record (pre-created or overall story summary saved)
      const { error: repErr } = await supabase
        .from('session_reports')
        .insert({
          session_id: sessData.id,
          overall_score: 0,
          hire_recommendation: 'maybe',
          code_story_summary: analysisData?.overall_summary || '',
          total_questions: questions.length,
          completed_questions: 0
        });

      if (repErr) console.warn('Failed to pre-create session report:', repErr);

      // 4. Create Questions records
      const formattedQs = questions.map((q, idx) => ({
        session_id: sessData.id,
        question_text: q.question_text,
        code_snippet: q.code_snippet,
        file_path: q.file_path,
        line_start: q.line_start,
        line_end: q.line_end,
        difficulty: q.difficulty,
        category: q.category,
        order_index: idx
      }));

      const { error: qsErr } = await supabase
        .from('questions')
        .insert(formattedQs);

      if (qsErr) throw qsErr;

      // Redirect to live recruiter interview workspace
      router.push(`/session/${sessData.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize session in database.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0F172A] text-[#F1F5F9] min-h-screen">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-4 bg-[#1E293B] w-full border-b border-[#334155] z-10 select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-[#94A3B8] hover:text-[#06B6D4] p-1 rounded hover:bg-[#0F172A] transition-colors"
          >
            <span className="material-symbols-outlined text-lg font-bold">arrow_back</span>
          </button>
          <span className="font-extrabold text-lg text-[#06B6D4] tracking-tight">CodeWalk Recopilot</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-[#94A3B8]">
          <span className={step === 1 ? 'text-[#06B6D4] font-bold' : ''}>1. Candidate</span>
          <span>&gt;</span>
          <span className={step === 2 ? 'text-[#06B6D4] font-bold' : ''}>2. Code Story</span>
          <span>&gt;</span>
          <span className={step === 3 ? 'text-[#06B6D4] font-bold' : ''}>3. Questions</span>
        </div>
      </header>

      {/* Main Flow Form wrapper */}
      <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-3xl mx-auto pb-24">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-3 text-center mb-6">
              {error}
            </div>
          )}

          {/* STEP 1: CANDIDATE DETAILS FORM */}
          {step === 1 && (
            <div className="bg-[#1E293B] border border-[#334155] p-8 rounded-xl shadow-xl space-y-6">
              <div className="border-b border-[#334155] pb-4">
                <h2 className="text-xl font-bold">Step 1 — Candidate & Repo Details</h2>
                <p className="text-xs text-[#94A3B8] mt-1">Configure candidate parameters and target repository URL to parse.</p>
              </div>

              <form onSubmit={handleAnalyzeRepo} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Candidate Name</label>
                    <input 
                      required
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full bg-[#0F172A] border border-[#334155] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                      placeholder="Jane Doe"
                      type="text"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Candidate Email</label>
                    <input 
                      required
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      className="w-full bg-[#0F172A] border border-[#334155] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                      placeholder="jane.doe@email.com"
                      type="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">GitHub Repository URL</label>
                  <input 
                    required
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full bg-[#0F172A] border border-[#334155] px-4 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-[#06B6D4] transition-colors"
                    placeholder="https://github.com/owner/repo"
                    type="text"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Duration</label>
                    <select 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#0F172A] border border-[#334155] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                    >
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                      <option value="90">90 Minutes</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Difficulty</label>
                    <div className="grid grid-cols-4 gap-2 bg-[#0F172A] p-1 border border-[#334155] rounded-lg text-xs font-bold text-center">
                      {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDifficulty(d)}
                          className={`py-2 rounded capitalize transition-all ${difficulty === d ? 'bg-[#06B6D4] text-[#0F172A]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Interview Focus Areas</label>
                  <div className="flex flex-wrap gap-2">
                    {['All', 'Frontend', 'Backend', 'DSA', 'System Design'].map((area) => {
                      const active = focus.includes(area);
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => handleFocusClick(area)}
                          className={`px-4 py-2 border rounded-full text-xs font-bold transition-all ${
                            active 
                              ? 'bg-[#06B6D4]/10 border-[#06B6D4] text-[#06B6D4]' 
                              : 'bg-[#0F172A]/40 border-[#334155] text-[#94A3B8] hover:border-[#94A3B8]/50'
                          }`}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#334155]/60 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-[#06B6D4] text-[#0F172A] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        Analyzing Repository...
                      </>
                    ) : (
                      <>
                        <span>Analyze Repository</span>
                        <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: CODE STORY PREVIEW */}
          {step === 2 && analysisData && (
            <div className="space-y-6">
              <div className="bg-[#1E293B] border border-[#334155] p-8 rounded-xl shadow-xl space-y-6">
                <div className="border-b border-[#334155] pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">Step 2 — Code Story Card</h2>
                    <p className="text-xs text-[#94A3B8] mt-1">Review the AI repository overview and architecture analysis.</p>
                  </div>
                  <img src={githubAvatar} className="w-12 h-12 rounded-full border border-[#334155]" alt="Avatar" />
                </div>

                {/* Candidate Overview */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Project Type</h4>
                      <p className="text-sm font-semibold">{analysisData.project_type || 'Full Stack Application'}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Primary Language</h4>
                      <span className="inline-block px-2.5 py-1 bg-[#06B6D4]/10 text-[#06B6D4] text-xs font-bold border border-[#06B6D4]/20 rounded">
                        {analysisData.primary_language || 'TypeScript'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Languages Used</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(analysisData.languages_used || []).map((l: string) => (
                          <span key={l} className="px-2 py-0.5 bg-[#334155] text-xs rounded font-medium">{l}</span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Code Complexity</h4>
                      <div className="flex items-center gap-3">
                        <div className="flex-grow bg-[#0F172A] h-2 rounded-full overflow-hidden border border-[#334155]">
                          <div className={`h-full rounded-full ${
                            analysisData.code_complexity === 'high' ? 'w-[90%] bg-red-500' :
                            analysisData.code_complexity === 'medium' ? 'w-[60%] bg-[#F59E0B]' :
                            'w-[30%] bg-emerald-500'
                          }`}></div>
                        </div>
                        <span className="text-xs font-bold font-mono capitalize">{analysisData.code_complexity}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#334155]/60 space-y-3">
                    <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Candidate Brief</h4>
                    <blockquote className="border-l-4 border-[#06B6D4] bg-[#0F172A] p-4 text-xs italic text-[#94A3B8] leading-relaxed rounded-r-lg">
                      "{analysisData.candidate_brief}"
                    </blockquote>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="bg-[#0F172A]/40 border border-[#334155] p-4 rounded-lg space-y-2">
                      <h5 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">Notable Patterns</h5>
                      <ul className="text-xs space-y-1.5 list-disc pl-4 text-[#94A3B8]">
                        {(analysisData.notable_patterns || []).map((p: string, idx: number) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-[#0F172A]/40 border border-[#334155] p-4 rounded-lg space-y-2">
                      <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider">Areas to Probe</h5>
                      <ul className="text-xs space-y-1.5 list-disc pl-4 text-[#94A3B8]">
                        {(analysisData.potential_weaknesses || []).map((w: string, idx: number) => (
                          <li key={idx} className="hover:text-[#F1F5F9] transition-colors">{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#334155]/60 flex justify-between items-center">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 border border-[#334155] hover:border-[#94A3B8] text-[#94A3B8] hover:text-[#F1F5F9] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={loading}
                    className="px-6 py-3 bg-[#06B6D4] text-[#0F172A] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <span>Generate Questions</span>
                        <span className="material-symbols-outlined text-sm font-bold">bolt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: QUESTIONS PREVIEW */}
          {step === 3 && (
            <div className="bg-[#1E293B] border border-[#334155] p-8 rounded-xl shadow-xl space-y-6">
              <div className="border-b border-[#334155] pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Step 3 — Questions Preview</h2>
                  <p className="text-xs text-[#94A3B8] mt-1">Audit, edit, and order questions generated from candidate code.</p>
                </div>
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="px-3 py-1.5 border border-[#06B6D4] text-[#06B6D4] hover:bg-[#06B6D4]/10 text-xs font-bold rounded-lg transition-colors"
                >
                  + Add Custom Question
                </button>
              </div>

              {/* Add Custom Question Form */}
              {showAddCustom && (
                <form onSubmit={handleAddCustomQuestion} className="bg-[#0F172A] border border-[#334155] p-4 rounded-lg space-y-3 animate-in slide-in-from-top duration-300">
                  <h4 className="text-xs font-bold uppercase text-[#06B6D4]">Custom Question details</h4>
                  <textarea
                    required
                    value={customQuestionText}
                    onChange={(e) => setCustomQuestionText(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] p-3 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-[#F1F5F9]"
                    placeholder="Type your custom question here..."
                    rows={3}
                  />
                  <div className="flex justify-end gap-2 text-xs">
                    <button 
                      type="button" 
                      onClick={() => setShowAddCustom(false)} 
                      className="px-3 py-1.5 text-[#94A3B8] hover:text-[#F1F5F9] font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-1.5 bg-[#06B6D4] text-[#0F172A] font-bold rounded"
                    >
                      Add Question
                    </button>
                  </div>
                </form>
              )}

              {/* Questions List */}
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={idx} className="bg-[#0F172A]/40 border border-[#334155] p-4 rounded-lg space-y-3 relative group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 pr-12">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-[#06B6D4]">Q{idx + 1}</span>
                          <span className="text-[#334155]">•</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] ${
                            q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            q.difficulty === 'medium' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>{q.difficulty}</span>
                          <span className="text-[#334155]">•</span>
                          <span className="text-[#94A3B8]">{q.category}</span>
                        </div>
                        <p className="text-sm font-semibold pt-1">{q.question_text}</p>
                        {q.file_path && (
                          <p className="text-[10px] text-[#94A3B8] font-mono select-none">
                            File: {q.file_path} {q.line_start > 0 ? `(Lines ${q.line_start}-${q.line_end})` : ''}
                          </p>
                        )}
                      </div>
                      
                      {/* Action buttons (Move Up, Move Down, Delete) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => moveQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-[#94A3B8] hover:text-[#06B6D4] disabled:opacity-30"
                          title="Move Up"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">arrow_upward</span>
                        </button>
                        <button
                          onClick={() => moveQuestion(idx, 'down')}
                          disabled={idx === questions.length - 1}
                          className="p-1 text-[#94A3B8] hover:text-[#06B6D4] disabled:opacity-30"
                          title="Move Down"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">arrow_downward</span>
                        </button>
                        <button
                          onClick={() => deleteQuestion(idx)}
                          className="p-1 text-red-400 hover:text-red-500"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">delete</span>
                        </button>
                      </div>
                    </div>

                    {q.code_snippet && (
                      <div className="bg-[#0F172A] p-3 rounded border border-[#334155] overflow-x-auto text-[11px] font-mono text-[#F1F5F9]">
                        <pre><code>{q.code_snippet}</code></pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-[#334155]/60 flex justify-between items-center">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 border border-[#334155] hover:border-[#94A3B8] text-[#94A3B8] hover:text-[#F1F5F9] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStartInterview}
                  disabled={loading}
                  className="px-6 py-3 bg-[#06B6D4] text-[#0F172A] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      Initializing Interview...
                    </>
                  ) : (
                    <>
                      <span>Start Interview</span>
                      <span className="material-symbols-outlined text-sm font-bold">play_arrow</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
