'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import CodeBlock from '@/components/dashboard/CodeBlock';

interface QuestionItem {
  question_text: string;
  code_snippet: string;
  file_path: string;
  line_start: number;
  line_end: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'frontend' | 'backend' | 'dsa' | 'system-design' | 'behavioral';
  question_type?: 'code-based' | 'jd-connected' | 'skill-gap' | 'system-design';
  why_asked?: string;
  follow_up_questions?: string[];
  expected_answer?: string;
}

function NewSessionFlowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramCandidateId = searchParams.get('candidateId');
  const paramRepoUrl = searchParams.get('repoUrl');
  const paramJd = searchParams.get('jd');
  const { user, refreshUserData } = useGlobal();
  
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
  const [jobDescription, setJobDescription] = useState('');

  // Git repositories list state
  const [gitRepos, setGitRepos] = useState<any[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [repoSource, setRepoSource] = useState<'dropdown' | 'custom'>('custom');

  useEffect(() => {
    if (paramRepoUrl) {
      setRepoUrl(paramRepoUrl);
      setRepoSource('custom');
    }
    if (paramJd) {
      setJobDescription(paramJd);
    }
    if (paramCandidateId) {
      const fetchCandidate = async () => {
        const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .eq('id', paramCandidateId)
          .single();
        if (data && !error) {
          setCandidateName(data.name);
          setCandidateEmail(data.email);
        }
      };
      fetchCandidate();
    }
  }, [paramRepoUrl, paramJd, paramCandidateId]);

  useEffect(() => {
    if (user?.githubConnected && user?.githubUsername) {
      setRepoSource('dropdown');
      const fetchRepos = async () => {
        setFetchingRepos(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.provider_token;
          let headers: HeadersInit = {};
          let url = `https://api.github.com/users/${user.githubUsername}/repos?sort=updated&per_page=100`;
          if (token) {
            headers['Authorization'] = `token ${token}`;
            url = `https://api.github.com/user/repos?sort=updated&per_page=100`;
          }
          const res = await fetch(url, { headers });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setGitRepos(data);
              if (data.length > 0) {
                setRepoUrl(data[0].html_url);
              }
            }
          } else {
            console.error('Failed to fetch from primary repo url, trying public user repos');
            const fbRes = await fetch(`https://api.github.com/users/${user.githubUsername}/repos?sort=updated&per_page=100`);
            if (fbRes.ok) {
              const data = await fbRes.json();
              if (Array.isArray(data)) {
                setGitRepos(data);
                if (data.length > 0) {
                  setRepoUrl(data[0].html_url);
                }
              }
            }
          }
        } catch (e) {
          console.error('Error fetching repos:', e);
        } finally {
          setFetchingRepos(false);
        }
      };
      fetchRepos();
    }
  }, [user]);
  
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

    // Token limit validation
    if (user && user.tokensUsed !== undefined && user.tokensTotal !== undefined) {
      if (user.tokensUsed >= user.tokensTotal) {
        toast.error('Session limit exceeded for your plan. Please upgrade to create more sessions.');
        router.push('/pricing');
        return;
      }
      if (user.tokensTotal - user.tokensUsed === 1) {
        toast.success('Warning: This is your last remaining session on your current plan!');
      }
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
          focus,
          jobDescription
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

    // Token limit validation
    if (user && user.tokensUsed !== undefined && user.tokensTotal !== undefined && user.tokensUsed >= user.tokensTotal) {
      toast.error('Session limit exceeded for your plan. Please upgrade to create more sessions.');
      router.push('/pricing');
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
          timer_duration_minutes: parseInt(duration),
          remaining_seconds: parseInt(duration) * 60 // initialize remaining_seconds
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
        order_index: idx,
        expected_answer: q.expected_answer
      }));

      const { error: qsErr } = await supabase
        .from('questions')
        .insert(formattedQs);

      if (qsErr) throw qsErr;

      // 5. Increment tokens_used in profiles
      const { error: tokenErr } = await supabase
        .from('profiles')
        .update({ tokens_used: (user?.tokensUsed || 0) + 1 })
        .eq('id', user?.id);

      if (tokenErr) console.warn('Failed to increment tokens_used:', tokenErr);

      // Force refresh client user data
      if (refreshUserData) {
        await refreshUserData();
      }

      // Redirect to live recruiter interview workspace
      router.push(`/session/${sessData.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize session in database.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d1515] text-[#F1F5F9] min-h-screen">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-4 bg-[#151d1e] w-full border-b border-[#3b494b] z-10 select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-[#94A3B8] hover:text-[#06B6D4] p-1 rounded hover:bg-[#0d1515] transition-colors"
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
            <div className="bg-[#151d1e] border border-[#3b494b] p-8 rounded-xl shadow-xl space-y-6">
              <div className="border-b border-[#3b494b] pb-4">
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
                      className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
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
                      className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                      placeholder="jane.doe@email.com"
                      type="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">GitHub Repository URL</label>
                    {user?.githubConnected && (
                      <div className="flex bg-[#0d1515] p-0.5 rounded border border-[#3b494b] text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setRepoSource('dropdown');
                            if (gitRepos.length > 0) setRepoUrl(gitRepos[0].html_url);
                          }}
                          className={`px-2.5 py-1 rounded transition-all ${
                            repoSource === 'dropdown'
                              ? 'bg-[#06B6D4] text-[#0d1515]'
                              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                          }`}
                        >
                          Select Repo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRepoSource('custom');
                            setRepoUrl('');
                          }}
                          className={`px-2.5 py-1 rounded transition-all ${
                            repoSource === 'custom'
                              ? 'bg-[#06B6D4] text-[#0d1515]'
                              : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                          }`}
                        >
                          Custom URL
                        </button>
                      </div>
                    )}
                  </div>

                  {user?.githubConnected && repoSource === 'dropdown' ? (
                    fetchingRepos ? (
                      <div className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-xs text-[#94A3B8]">
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        Fetching repositories from GitHub...
                      </div>
                    ) : gitRepos.length === 0 ? (
                      <div className="w-full bg-[#0d1515] border border-dashed border-[#3b494b] px-4 py-3 rounded-lg text-center text-xs text-[#94A3B8]">
                        No repositories found. Ensure your GitHub account has repositories or use a Custom URL.
                      </div>
                    ) : (
                      <select
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                      >
                        {gitRepos.map((repo: any) => (
                          <option key={repo.id} value={repo.html_url}>
                            {repo.full_name} {repo.language ? `(${repo.language})` : ''}
                          </option>
                        ))}
                      </select>
                    )
                  ) : (
                    <input 
                      required
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-[#06B6D4] transition-colors"
                      placeholder="https://github.com/owner/repo"
                      type="text"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Job Description (Optional)</label>
                    <span className="text-[10px] text-[#94A3B8]">{jobDescription.length} / 5000</span>
                  </div>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value.slice(0, 5000))}
                    className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-3 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] transition-colors resize-y min-h-[120px] text-[#F1F5F9] placeholder-muted-text/50"
                    placeholder="Paste the job description here — AI will generate questions matching both the candidate's code and the role requirements"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Duration</label>
                    <select 
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                    >
                      <option value="30">30 Minutes</option>
                      <option value="45">45 Minutes</option>
                      <option value="60">60 Minutes</option>
                      <option value="90">90 Minutes</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Difficulty</label>
                    <div className="grid grid-cols-4 gap-2 bg-[#0d1515] p-1 border border-[#3b494b] rounded-lg text-xs font-bold text-center">
                      {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDifficulty(d)}
                          className={`py-2 rounded capitalize transition-all ${difficulty === d ? 'bg-[#06B6D4] text-[#0d1515]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'}`}
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
                              : 'bg-[#0d1515]/40 border-[#3b494b] text-[#94A3B8] hover:border-[#94A3B8]/50'
                          }`}
                        >
                          {area}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#3b494b]/60 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
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
              <div className="bg-[#151d1e] border border-[#3b494b] p-8 rounded-xl shadow-xl space-y-6">
                <div className="border-b border-[#3b494b] pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold">Step 2 — Code Story Card</h2>
                    <p className="text-xs text-[#94A3B8] mt-1">Review the AI repository overview and architecture analysis.</p>
                  </div>
                  <img src={githubAvatar} className="w-12 h-12 rounded-full border border-[#3b494b]" alt="Avatar" />
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
                          <span key={l} className="px-2 py-0.5 bg-[#3b494b] text-xs rounded font-medium">{l}</span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Code Complexity</h4>
                      <div className="flex items-center gap-3">
                        <div className="flex-grow bg-[#0d1515] h-2 rounded-full overflow-hidden border border-[#3b494b]">
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

                  <div className="pt-4 border-t border-[#3b494b]/60 space-y-3">
                    <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Candidate Brief</h4>
                    <blockquote className="border-l-4 border-[#06B6D4] bg-[#0d1515] p-4 text-xs italic text-[#94A3B8] leading-relaxed rounded-r-lg">
                      "{analysisData.candidate_brief}"
                    </blockquote>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="bg-[#0d1515]/40 border border-[#3b494b] p-4 rounded-lg space-y-2">
                      <h5 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">Notable Patterns</h5>
                      <ul className="text-xs space-y-1.5 list-disc pl-4 text-[#94A3B8]">
                        {(analysisData.notable_patterns || []).map((p: string, idx: number) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-[#0d1515]/40 border border-[#3b494b] p-4 rounded-lg space-y-2">
                      <h5 className="text-xs font-bold text-red-400 uppercase tracking-wider">Areas to Probe</h5>
                      <ul className="text-xs space-y-1.5 list-disc pl-4 text-[#94A3B8]">
                        {(analysisData.potential_weaknesses || []).map((w: string, idx: number) => (
                          <li key={idx} className="hover:text-[#F1F5F9] transition-colors">{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#3b494b]/60 flex justify-between items-center">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 border border-[#3b494b] hover:border-[#94A3B8] text-[#94A3B8] hover:text-[#F1F5F9] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleGenerateQuestions}
                    disabled={loading}
                    className="px-6 py-3 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
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
            <div className="bg-[#151d1e] border border-[#3b494b] p-8 rounded-xl shadow-xl space-y-6">
              {questions.some(q => q.question_type && q.question_type !== 'code-based') && (
                <div className="bg-[#06B6D4]/10 border border-[#06B6D4]/20 p-4 rounded-xl text-xs text-[#06B6D4] font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">info</span>
                  <span>AI analyzed your candidate&apos;s code + job requirements. 4 code questions, 4 role-match questions, 2 skill gap questions, 2 system design questions generated.</span>
                </div>
              )}
              <div className="border-b border-[#3b494b] pb-4 flex justify-between items-center">
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
                <form onSubmit={handleAddCustomQuestion} className="bg-[#0d1515] border border-[#3b494b] p-4 rounded-lg space-y-3 animate-in slide-in-from-top duration-300">
                  <h4 className="text-xs font-bold uppercase text-[#06B6D4]">Custom Question details</h4>
                  <textarea
                    required
                    value={customQuestionText}
                    onChange={(e) => setCustomQuestionText(e.target.value)}
                    className="w-full bg-[#151d1e] border border-[#3b494b] p-3 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-[#F1F5F9]"
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
                      className="px-4 py-1.5 bg-[#06B6D4] text-[#0d1515] font-bold rounded"
                    >
                      Add Question
                    </button>
                  </div>
                </form>
              )}

              {/* Questions List */}
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={idx} className="bg-[#0d1515]/40 border border-[#3b494b] p-4 rounded-lg space-y-3 relative group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 pr-12">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider flex-wrap">
                          <span className="text-[#06B6D4]">Q{idx + 1}</span>
                          <span className="text-[#3b494b]">•</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] ${
                            q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            q.difficulty === 'medium' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20' :
                            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>{q.difficulty}</span>
                          <span className="text-[#3b494b]">•</span>
                          <span className="text-[#94A3B8]">{q.category}</span>
                          {q.question_type && (
                            <>
                              <span className="text-[#3b494b]">•</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] ${
                                q.question_type === 'jd-connected' ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400' :
                                q.question_type === 'skill-gap' ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400' :
                                q.question_type === 'system-design' ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400' :
                                'bg-cyan-500/10 border border-cyan-500/20 text-[#06B6D4]'
                              }`}>
                                {q.question_type === 'code-based' ? 'Code-Based' :
                                 q.question_type === 'jd-connected' ? 'JD-Connected' :
                                 q.question_type === 'skill-gap' ? 'Skill Gap' :
                                 q.question_type === 'system-design' ? 'System Design' : q.question_type}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm font-semibold pt-1">{q.question_text}</p>
                        {q.why_asked && (
                          <p className="text-[10px] text-[#849495] italic mt-1">
                            <strong>Why asked:</strong> {q.why_asked}
                          </p>
                        )}
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
                      <CodeBlock
                        code={q.code_snippet}
                        filePath={q.file_path}
                        lineStart={q.line_start}
                        lineEnd={q.line_end}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-[#3b494b]/60 flex justify-between items-center">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 border border-[#3b494b] hover:border-[#94A3B8] text-[#94A3B8] hover:text-[#F1F5F9] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStartInterview}
                  disabled={loading}
                  className="px-6 py-3 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
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

export default function NewSessionFlow() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1515] text-[#F1F5F9] min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#06B6D4] mb-3"></div>
        <p className="text-xs text-[#94A3B8]">Loading session builder...</p>
      </div>
    }>
      <NewSessionFlowContent />
    </Suspense>
  );
}
