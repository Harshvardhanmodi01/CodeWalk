'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import CodeBlock from '@/components/dashboard/CodeBlock';
import AssignProjectModal from '@/components/modals/AssignProjectModal';

interface QuestionItem {
  question_text: string;
  code_snippet: string;
  file_path: string;
  line_start: number;
  line_end: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  question_type?: 'code-based' | 'jd-connected' | 'skill-gap' | 'system-design' | 'behavioral' | 'logical' | 'custom';
  why_asked?: string;
  expected_answer?: string;
  follow_up_questions?: string[];
  options?: string[];
}

function NewSessionFlowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramCandidateId = searchParams.get('candidateId');
  const paramRepoUrl = searchParams.get('repoUrl');
  const paramJd = searchParams.get('jd');
  const { user, refreshUserData } = useGlobal();
  
  // Step tracker
  // Step 1: Selection & Details setup
  // Step 2: Code analysis (Technical/Fullstack/Custom-with-tech only)
  // Step 3: Questions list audit & adjustments
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Interview Mode Selection State
  // Mode selection is open by default (Step 0 view, rendered when interviewMode is null)
  const [interviewMode, setInterviewMode] = useState<'technical' | 'behavioral' | 'logical' | 'fullstack' | 'custom' | null>(null);

  // Form State
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [duration, setDuration] = useState('45');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('medium');
  const [focus, setFocus] = useState<string[]>(['All']);
  const [jobDescription, setJobDescription] = useState('');

  // Behavioral Specific Setup
  const [roleTitle, setRoleTitle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'junior' | 'mid-level' | 'senior' | 'lead'>('mid-level');

  // Logical Specific Setup
  const [logicalTimerMinutes, setLogicalTimerMinutes] = useState('2');

  // Custom Mode Builder Setup
  const [customSections, setCustomSections] = useState({
    technical: true,
    behavioral: false,
    logical: false,
    custom: false
  });
  const [customCounts, setCustomCounts] = useState({
    technical: 5,
    behavioral: 5,
    logical: 5,
    custom: 5
  });
  const [customQuestionsInput, setCustomQuestionsInput] = useState('');

  // Git repositories list state
  const [gitRepos, setGitRepos] = useState<any[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [repoSource, setRepoSource] = useState<'dropdown' | 'custom'>('custom');

  // Take-home project flow states
  const [flowMode, setFlowMode] = useState<'public' | 'private'>('public');
  const [candidateExperience, setCandidateExperience] = useState('3');
  const [candidateTechStack, setCandidateTechStack] = useState('');
  const [candidateTechTags, setCandidateTechTags] = useState<string[]>([]);
  const [takeHomeProjectsList, setTakeHomeProjectsList] = useState<any[]>([]);
  const [selectedTakeHomeProject, setSelectedTakeHomeProject] = useState('');
  const [assignProjectModalOpen, setAssignProjectModalOpen] = useState(false);

  // Fetch candidate's take home projects
  useEffect(() => {
    if (!user?.id) return;
    const fetchTakeHomeProjects = async () => {
      let query = supabase
        .from('take_home_projects')
        .select(`
          id,
          project_title,
          submission_repo_url,
          status,
          candidate_id,
          candidates:candidate_id(name)
        `)
        .eq('recruiter_id', user.id);
        
      if (paramCandidateId) {
        query = query.eq('candidate_id', paramCandidateId);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        setTakeHomeProjectsList(data);
        // Pre-select if there is a submitted repository
        const submitted = data.find(p => p.submission_repo_url && (p.status === 'submitted' || p.status === 'evaluated'));
        if (submitted) {
          setSelectedTakeHomeProject(submitted.id);
          setRepoUrl(submitted.submission_repo_url);
        }
      }
    };
    fetchTakeHomeProjects();
  }, [user, paramCandidateId, flowMode]);

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
    const dangerousUnicodeRegex = /[\u200B-\u200D\uFEFF\u202E\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
    const cleanUrl = url.replace(dangerousUnicodeRegex, '').trim();
    const pattern = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/?#]+)/i;
    return pattern.test(cleanUrl);
  };

  const handleRepoUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    const dangerousUnicodeRegex = /[\u200B-\u200D\uFEFF\u202E\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
    const hasDangerous = dangerousUnicodeRegex.test(pastedText);
    const cleanUrl = pastedText.replace(dangerousUnicodeRegex, '').trim();
    
    if (hasDangerous) {
      toast.error("Pasted content was sanitized for security");
    }
    
    const pattern = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/?#]+)/i;
    if (!pattern.test(cleanUrl)) {
      toast.error("Invalid GitHub URL format");
    }
    
    setRepoUrl(cleanUrl);
    e.preventDefault();
  };

  // Check if current setup mode requires GitHub code repository
  const requiresRepo = () => {
    if (interviewMode === 'technical' || interviewMode === 'fullstack') return true;
    if (interviewMode === 'custom' && customSections.technical) return true;
    return false;
  };

  // Step 1: Submit Setup Form
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!candidateName.trim() || !candidateEmail.trim()) {
      setError('Please fill in candidate name and email.');
      return;
    }

    if (requiresRepo()) {
      if (!repoUrl.trim()) {
        setError('GitHub Repository URL is required for this mode.');
        return;
      }
      if (!validateGithubUrl(repoUrl)) {
        setError('Invalid GitHub URL. Must match https://github.com/owner/repo');
        return;
      }
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

    if (requiresRepo()) {
      // If code is needed, trigger repository analysis first (Step 2)
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
    } else {
      // If no code repository required, skip Step 2 and generate questions directly
      await generateAllQuestions();
    }
  };

  // Generate Questions for the current mode
  const generateAllQuestions = async () => {
    setError('');
    setLoading(true);
    try {
      let allQs: QuestionItem[] = [];

      if (interviewMode === 'technical') {
        const res = await fetch('/api/questions/technical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repoUrl,
            difficulty,
            focus,
            jobDescription,
            count: 12
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate technical questions.');
        allQs = data.questions || [];

      } else if (interviewMode === 'behavioral') {
        const res = await fetch('/api/questions/behavioral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role_title: roleTitle || 'Software Engineer',
            experience_level: experienceLevel,
            count: 10
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate behavioral questions.');
        allQs = data.questions || [];

      } else if (interviewMode === 'logical') {
        const res = await fetch('/api/questions/logical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: 15
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate logical questions.');
        allQs = data.questions || [];

      } else if (interviewMode === 'fullstack') {
        // Tech (8)
        const techRes = await fetch('/api/questions/technical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl, difficulty, focus, jobDescription, count: 8 })
        });
        const techData = await techRes.json();
        if (techRes.ok && techData.questions) allQs.push(...techData.questions);

        // Behavioral (5)
        const behRes = await fetch('/api/questions/behavioral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_title: roleTitle || 'Software Engineer', experience_level: experienceLevel, count: 5 })
        });
        const behData = await behRes.json();
        if (behRes.ok && behData.questions) allQs.push(...behData.questions);

        // Logical (5)
        const logRes = await fetch('/api/questions/logical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 5 })
        });
        const logData = await logRes.json();
        if (logRes.ok && logData.questions) allQs.push(...logData.questions);

      } else if (interviewMode === 'custom') {
        if (customSections.technical) {
          const techRes = await fetch('/api/questions/technical', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl, difficulty, focus, jobDescription, count: customCounts.technical })
          });
          const techData = await techRes.json();
          if (techRes.ok && techData.questions) allQs.push(...techData.questions);
        }

        if (customSections.behavioral) {
          const behRes = await fetch('/api/questions/behavioral', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role_title: roleTitle || 'Software Engineer', experience_level: experienceLevel, count: customCounts.behavioral })
          });
          const behData = await behRes.json();
          if (behRes.ok && behData.questions) allQs.push(...behData.questions);
        }

        if (customSections.logical) {
          const logRes = await fetch('/api/questions/logical', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: customCounts.logical })
          });
          const logData = await logRes.json();
          if (logRes.ok && logData.questions) allQs.push(...logData.questions);
        }

        if (customSections.custom) {
          const custRes = await fetch('/api/questions/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions_text: customQuestionsInput })
          });
          const custData = await custRes.json();
          if (custRes.ok && custData.questions) allQs.push(...custData.questions);
        }
      }

      if (allQs.length === 0) {
        throw new Error('Could not generate any questions. Please try again.');
      }

      setQuestions(allQs);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'An error occurred during question generation.');
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
      category: 'custom'
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
          github_url: requiresRepo() ? repoUrl.trim() : ''
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
          repo_url: requiresRepo() ? repoUrl.trim() : '',
          status: 'active',
          timer_duration_minutes: parseInt(duration),
          remaining_seconds: parseInt(duration) * 60,
          interview_mode: interviewMode,
          mode_config: {
            customSections,
            customCounts,
            roleTitle,
            experienceLevel,
            logicalTimerMinutes: parseInt(logicalTimerMinutes)
          },
          custom_questions: customSections.custom ? customQuestionsInput.split('\n').filter(Boolean) : []
        })
        .select()
        .single();

      if (sessErr) throw sessErr;

      // 3. Create Session Report record
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

      // 4. Create Questions records (with options array check)
      const formattedQs = questions.map((q, idx) => ({
        session_id: sessData.id,
        question_text: q.question_text,
        code_snippet: q.code_snippet || '',
        file_path: q.file_path || 'Custom Question',
        line_start: q.line_start || 0,
        line_end: q.line_end || 0,
        difficulty: q.difficulty || 'medium',
        category: q.category || 'custom',
        order_index: idx,
        expected_answer: q.expected_answer ? q.expected_answer : null,
        options: q.options || []
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

      toast.success('Interview successfully initiated!');
      router.push(`/session/${sessData.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize session in database.');
      setLoading(false);
    }
  };

  // RENDER INTERVIEW MODE SELECTION SCREEN (STEP 0)
  if (interviewMode === null) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-8 bg-[#0d1515] text-[#F1F5F9] min-h-[calc(100vh-4rem)]">
        <div className="max-w-4xl w-full space-y-8 pb-12">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-[#b9cacb] bg-clip-text text-transparent">
              Choose Interview Mode
            </h1>
            <p className="text-sm text-[#94A3B8] max-w-xl mx-auto">
              Select the type of interview you want to conduct — the interface will adapt automatically to support coding, behavioral ratings, or timers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Mode 1: Technical */}
            <div className="bg-[#151d1e] border border-[#3b494b] hover:border-[#06B6D4] p-6 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-4xl text-[#06B6D4] bg-[#06B6D4]/10 p-2 rounded-lg">code</span>
                  <span className="bg-[#06B6D4]/20 text-[#06B6D4] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Most Popular</span>
                </div>
                <h3 className="text-md font-bold text-white group-hover:text-[#06B6D4] transition-colors">Technical Code Interview</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  AI generates questions directly from candidate&apos;s GitHub repository. Deep dive into their actual code, architecture decisions, and patterns.
                </p>
              </div>
              <button 
                onClick={() => setInterviewMode('technical')}
                className="mt-6 w-full py-2 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer text-center"
              >
                Select
              </button>
            </div>

            {/* Mode 2: HR Behavioral */}
            <div className="bg-[#151d1e] border border-[#3b494b] hover:border-purple-500 p-6 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-4xl text-purple-400 bg-purple-500/10 p-2 rounded-lg">chat</span>
                </div>
                <h3 className="text-md font-bold text-white group-hover:text-purple-400 transition-colors">HR &amp; Behavioral Round</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Structured behavioral interview with STAR-format questions. Assess communication, teamwork, leadership potential, and culture fit.
                </p>
              </div>
              <button 
                onClick={() => setInterviewMode('behavioral')}
                className="mt-6 w-full py-2 bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer text-center"
              >
                Select
              </button>
            </div>

            {/* Mode 3: Logical Round */}
            <div className="bg-[#151d1e] border border-[#3b494b] hover:border-orange-500 p-6 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-4xl text-orange-400 bg-orange-500/10 p-2 rounded-lg">psychology</span>
                </div>
                <h3 className="text-md font-bold text-white group-hover:text-orange-400 transition-colors">Logical Thinking &amp; Aptitude</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Test analytical thinking, pattern recognition, logical deduction, and cognitive ability through scenario and multiple-choice questions.
                </p>
              </div>
              <button 
                onClick={() => setInterviewMode('logical')}
                className="mt-6 w-full py-2 bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer text-center"
              >
                Select
              </button>
            </div>

            {/* Mode 4: Full Stack */}
            <div className="bg-[#151d1e] border border-[#3b494b] hover:border-emerald-500 p-6 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-4xl text-emerald-400 bg-emerald-500/10 p-2 rounded-lg">layers</span>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider text-center">Final Round</span>
                </div>
                <h3 className="text-md font-bold text-white group-hover:text-emerald-400 transition-colors">Full Stack Interview</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Complete evaluation combining technical repository questions, behavioral assessment, and logical thinking rounds. Tabbed interface.
                </p>
              </div>
              <button 
                onClick={() => setInterviewMode('fullstack')}
                className="mt-6 w-full py-2 bg-emerald-500 text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer text-center"
              >
                Select
              </button>
            </div>

            {/* Mode 5: Custom */}
            <div className="bg-[#151d1e] border border-[#3b494b] hover:border-gray-400 p-6 rounded-xl transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-4xl text-gray-400 bg-gray-500/10 p-2 rounded-lg">settings</span>
                </div>
                <h3 className="text-md font-bold text-white group-hover:text-gray-400 transition-colors">Custom Interview</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Build your own interview template. Select exactly which sections to include, custom question counts, and recruiter-provided questions.
                </p>
              </div>
              <button 
                onClick={() => setInterviewMode('custom')}
                className="mt-6 w-full py-2 bg-gray-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer text-center"
              >
                Select
              </button>
            </div>

          </div>

          <div className="text-center pt-4">
            <button 
              onClick={() => router.push('/dashboard')}
              className="text-xs text-[#94A3B8] hover:text-white transition-colors underline cursor-pointer"
            >
              Cancel and return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER INTERVIEW BUILDER / SETUP PAGE
  return (
    <div className="flex-1 flex flex-col bg-[#0d1515] text-[#F1F5F9] min-h-screen">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-4 bg-[#151d1e] w-full border-b border-[#3b494b] z-10 select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (step > 1) {
                setStep((step - 1) as any);
              } else {
                setInterviewMode(null);
              }
            }}
            className="text-[#94A3B8] hover:text-[#06B6D4] p-1 rounded hover:bg-[#0d1515] transition-colors"
          >
            <span className="material-symbols-outlined text-lg font-bold">arrow_back</span>
          </button>
          <span className="font-extrabold text-lg text-[#06B6D4] tracking-tight">CodeWalk Recopilot</span>
          <span className="text-xs px-2 py-0.5 rounded uppercase font-bold bg-[#3b494b]/50 text-white">
            {interviewMode}
          </span>
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

          {/* STEP 1: INTERVIEW PARAMETERS DETAILS FORM */}
          {step === 1 && (
            <div className="bg-[#151d1e] border border-[#3b494b] p-8 rounded-xl shadow-xl space-y-6">
              <div className="border-b border-[#3b494b] pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Step 1 — Interview Parameters</h2>
                  <p className="text-xs text-[#94A3B8] mt-1">Configure candidate parameters for the {interviewMode} session.</p>
                </div>
                <button
                  onClick={() => setInterviewMode(null)}
                  className="text-xs text-[#06B6D4] hover:underline"
                >
                  Change Mode
                </button>
              </div>

              <form onSubmit={handleSetupSubmit} className="space-y-6">
                
                {/* Standard Candidate Details */}
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

                {/* Behavioral Details (Modes: Behavioral, Full Stack, Custom-with-Behavioral) */}
                {(interviewMode === 'behavioral' || interviewMode === 'fullstack' || (interviewMode === 'custom' && customSections.behavioral)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0d1515]/30 p-4 border border-[#3b494b]/50 rounded-lg">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Target Position/Role Title</label>
                      <input 
                        required
                        value={roleTitle}
                        onChange={(e) => setRoleTitle(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                        placeholder="Frontend Engineer / Product Manager"
                        type="text"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Experience Level</label>
                      <select 
                        value={experienceLevel}
                        onChange={(e: any) => setExperienceLevel(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                      >
                        <option value="junior">Junior (1-2 years)</option>
                        <option value="mid-level">Mid-Level (3-5 years)</option>
                        <option value="senior">Senior (5-8 years)</option>
                        <option value="lead">Lead/Principal (8+ years)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Logical Details (Modes: Logical) */}
                {interviewMode === 'logical' && (
                  <div className="space-y-1.5 bg-[#0d1515]/30 p-4 border border-[#3b494b]/50 rounded-lg">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Question Timer (minutes per question)</label>
                    <select 
                      value={logicalTimerMinutes}
                      onChange={(e) => setLogicalTimerMinutes(e.target.value)}
                      className="w-full max-w-xs bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                    >
                      <option value="1">1 Minute</option>
                      <option value="2">2 Minutes (Default)</option>
                      <option value="3">3 Minutes</option>
                    </select>
                  </div>
                )}

                {/* Custom Builder UI (Mode: Custom) */}
                {interviewMode === 'custom' && (
                  <div className="bg-[#0d1515]/30 p-6 border border-[#3b494b]/50 rounded-lg space-y-6">
                    <h4 className="text-sm font-bold uppercase text-[#06B6D4] border-b border-[#3b494b]/40 pb-2">Custom Interview Sections</h4>
                    
                    <div className="space-y-4">
                      {/* Technical Checkbox + Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3 text-sm font-semibold select-none cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={customSections.technical}
                              onChange={(e) => setCustomSections(prev => ({ ...prev, technical: e.target.checked }))}
                              className="h-4 w-4 rounded border-[#3b494b] text-[#06B6D4] focus:ring-[#06B6D4] bg-[#0d1515]"
                            />
                            <span>Include Technical Code Questions (Requires GitHub)</span>
                          </label>
                          {customSections.technical && (
                            <span className="text-xs text-[#06B6D4] font-bold">{customCounts.technical} questions</span>
                          )}
                        </div>
                        {customSections.technical && (
                          <input 
                            type="range"
                            min="2"
                            max="20"
                            value={customCounts.technical}
                            onChange={(e) => setCustomCounts(prev => ({ ...prev, technical: parseInt(e.target.value) }))}
                            className="w-full accent-[#06B6D4]"
                          />
                        )}
                      </div>

                      {/* Behavioral Checkbox + Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3 text-sm font-semibold select-none cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={customSections.behavioral}
                              onChange={(e) => setCustomSections(prev => ({ ...prev, behavioral: e.target.checked }))}
                              className="h-4 w-4 rounded border-[#3b494b] text-[#06B6D4] focus:ring-[#06B6D4] bg-[#0d1515]"
                            />
                            <span>Include HR Behavioral Questions</span>
                          </label>
                          {customSections.behavioral && (
                            <span className="text-xs text-purple-400 font-bold">{customCounts.behavioral} questions</span>
                          )}
                        </div>
                        {customSections.behavioral && (
                          <input 
                            type="range"
                            min="2"
                            max="20"
                            value={customCounts.behavioral}
                            onChange={(e) => setCustomCounts(prev => ({ ...prev, behavioral: parseInt(e.target.value) }))}
                            className="w-full accent-purple-500"
                          />
                        )}
                      </div>

                      {/* Logical Checkbox + Slider */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3 text-sm font-semibold select-none cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={customSections.logical}
                              onChange={(e) => setCustomSections(prev => ({ ...prev, logical: e.target.checked }))}
                              className="h-4 w-4 rounded border-[#3b494b] text-[#06B6D4] focus:ring-[#06B6D4] bg-[#0d1515]"
                            />
                            <span>Include Logical Thinking &amp; Aptitude</span>
                          </label>
                          {customSections.logical && (
                            <span className="text-xs text-orange-400 font-bold">{customCounts.logical} questions</span>
                          )}
                        </div>
                        {customSections.logical && (
                          <input 
                            type="range"
                            min="2"
                            max="20"
                            value={customCounts.logical}
                            onChange={(e) => setCustomCounts(prev => ({ ...prev, logical: parseInt(e.target.value) }))}
                            className="w-full accent-orange-500"
                          />
                        )}
                      </div>

                      {/* Custom Questions Checkbox + Input */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-3 text-sm font-semibold select-none cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={customSections.custom}
                              onChange={(e) => setCustomSections(prev => ({ ...prev, custom: e.target.checked }))}
                              className="h-4 w-4 rounded border-[#3b494b] text-[#06B6D4] focus:ring-[#06B6D4] bg-[#0d1515]"
                            />
                            <span>Recruiter-Provided Custom Questions</span>
                          </label>
                        </div>
                        {customSections.custom && (
                          <div className="space-y-2">
                            <label className="text-xs text-[#94A3B8]">Type or paste your custom questions (one question per line):</label>
                            <textarea 
                              value={customQuestionsInput}
                              onChange={(e) => setCustomQuestionsInput(e.target.value)}
                              rows={4}
                              className="w-full bg-[#0d1515] border border-[#3b494b] p-3 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-[#F1F5F9]"
                              placeholder="Question 1&#10;Question 2&#10;Question 3"
                            />
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* GitHub Repo Setup (Modes: Technical, Full Stack, Custom-with-Technical) */}
                {requiresRepo() && (
                  <div className="space-y-4 bg-[#0d1515]/30 p-4 border border-[#3b494b]/50 rounded-lg">
                    {/* Toggle at the top */}
                    <div className="flex bg-[#0d1515] p-1 rounded-lg border border-[#3b494b]/60 w-full font-bold text-xs select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setFlowMode('public');
                          setRepoUrl('');
                        }}
                        className={`flex-1 py-2 text-center rounded-md transition-all cursor-pointer ${
                          flowMode === 'public'
                            ? 'bg-[#06B6D4] text-[#0d1515]'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Candidate has public repo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFlowMode('private');
                          setRepoUrl('');
                        }}
                        className={`flex-1 py-2 text-center rounded-md transition-all cursor-pointer ${
                          flowMode === 'private'
                            ? 'bg-[#06B6D4] text-[#0d1515]'
                            : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        Experienced candidate (private repos)
                      </button>
                    </div>

                    {flowMode === 'public' ? (
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
                            onPaste={handleRepoUrlPaste}
                            className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-[#06B6D4] transition-colors"
                            placeholder="https://github.com/owner/repo"
                            type="text"
                          />
                        )}
                      </div>
                    ) : (
                      /* PRIVATE REPO FLOW */
                      <div className="space-y-4 pt-2">
                        <div className="bg-[#151d1e] p-4 border border-[#3b494b]/60 rounded-xl space-y-4">
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Assign Take-Home Assignment</h4>
                            <p className="text-[11px] text-[#94A3B8] leading-relaxed mb-3">
                              If the candidate does not have a public portfolio, assign them a custom take-home project. Once they submit, their project codebase will be evaluated here.
                            </p>
                            <button
                              type="button"
                              onClick={() => setAssignProjectModalOpen(true)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold uppercase rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">assignment</span>
                              <span>Assign Take-Home Project</span>
                            </button>
                          </div>

                          {takeHomeProjectsList.length > 0 && (
                            <div className="border-t border-[#3b494b]/40 pt-4 space-y-2">
                              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Candidate already submitted project</h4>
                              <p className="text-[11px] text-[#94A3B8] mb-2">Select a submitted take-home project repository to load for this interview:</p>
                              <select
                                value={selectedTakeHomeProject}
                                onChange={(e) => {
                                  setSelectedTakeHomeProject(e.target.value);
                                  const match = takeHomeProjectsList.find(p => p.id === e.target.value);
                                  if (match && match.submission_repo_url) {
                                    setRepoUrl(match.submission_repo_url);
                                    toast.success(`Loaded submission repo: ${match.submission_repo_url}`);
                                  } else {
                                    setRepoUrl('');
                                  }
                                }}
                                className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white cursor-pointer"
                              >
                                <option value="">-- Select Submitted Project --</option>
                                {takeHomeProjectsList
                                  .filter(p => p.status === 'submitted' || p.status === 'evaluated')
                                  .map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.project_title} (Repo: {p.submission_repo_url})
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}

                          {/* Candidate Experience and Tech Stack inputs for project creation */}
                          <div className="border-t border-[#3b494b]/40 pt-4 space-y-4">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Candidate Details (For AI Generation)</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Years of Experience</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={candidateExperience}
                                  onChange={(e) => setCandidateExperience(e.target.value)}
                                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs text-white"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Tech Stack (Comma Separated)</label>
                                <input
                                  type="text"
                                  value={candidateTechStack}
                                  placeholder="React, Node.js, postgres"
                                  onChange={(e) => {
                                    setCandidateTechStack(e.target.value);
                                    setCandidateTechTags(e.target.value.split(',').map(s => s.trim()).filter(Boolean));
                                  }}
                                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs text-white"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Repository URL Input</label>
                            <input
                              type="text"
                              value={repoUrl}
                              onChange={(e) => setRepoUrl(e.target.value)}
                              placeholder="https://github.com/owner/repo (Pre-filled or manual)"
                              className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#06B6D4]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Job Description (Optional)</label>
                        <span className="text-[10px] text-[#94A3B8]">{jobDescription.length} / 5000</span>
                      </div>
                      <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value.slice(0, 5000))}
                        className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-3 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] transition-colors resize-y min-h-[100px] text-[#F1F5F9] placeholder-muted-text/50"
                        placeholder="Paste the job description here — AI will generate questions matching both the candidate's code and the role requirements"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Interview Focus Areas</label>
                      <div className="flex flex-wrap gap-2">
                        {['All', 'Frontend', 'Backend', 'DSA', 'System Design'].map((area) => {
                          const active = focus.includes(area);
                          return (
                            <button
                              key={area}
                              type="button"
                              onClick={() => handleFocusClick(area)}
                              className={`px-4 py-1.5 border rounded-full text-xs font-bold transition-all ${
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

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Target Code Difficulty</label>
                      <div className="grid grid-cols-4 gap-2 bg-[#0d1515] p-1 border border-[#3b494b] rounded-lg text-xs font-bold text-center">
                        {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDifficulty(d)}
                            className={`py-1.5 rounded capitalize transition-all ${difficulty === d ? 'bg-[#06B6D4] text-[#0d1515]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Overall Settings (Duration) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Session Duration</label>
                  <select 
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full max-w-xs bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-[#06B6D4] transition-colors"
                  >
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                    <option value="90">90 Minutes</option>
                  </select>
                </div>

                {/* Custom Builder Preview Block */}
                {interviewMode === 'custom' && (
                  <div className="bg-[#06B6D4]/10 border border-[#06B6D4]/20 p-4 rounded-xl text-xs text-[#06B6D4] font-semibold">
                    <span>
                      Preview: Your custom interview will include:{' '}
                      {customSections.technical ? `${customCounts.technical} Technical, ` : ''}
                      {customSections.behavioral ? `${customCounts.behavioral} Behavioral, ` : ''}
                      {customSections.logical ? `${customCounts.logical} Logical, ` : ''}
                      {customSections.custom ? `${customQuestionsInput.split('\n').filter(Boolean).length} Custom` : ''} questions.
                    </span>
                  </div>
                )}

                <div className="pt-4 border-t border-[#3b494b]/60 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        Preparing your {interviewMode} interview...
                      </>
                    ) : (
                      <>
                        <span>{requiresRepo() ? 'Analyze Repository' : 'Prepare Interview Questions'}</span>
                        <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: CODE STORY PREVIEW (Tech/Fullstack only) */}
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
                      &quot;{analysisData.candidate_brief}&quot;
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
                    onClick={generateAllQuestions}
                    disabled={loading}
                    className="px-6 py-3 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
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

          {/* STEP 3: QUESTIONS PREVIEW & AUDIT */}
          {step === 3 && (
            <div className="bg-[#151d1e] border border-[#3b494b] p-8 rounded-xl shadow-xl space-y-6">
              <div className="border-b border-[#3b494b] pb-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">Step 3 — Questions Preview</h2>
                  <p className="text-xs text-[#94A3B8] mt-1">Audit, edit, and order the generated questions before launching the live workspace.</p>
                </div>
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="px-3 py-1.5 border border-[#06B6D4] text-[#06B6D4] hover:bg-[#06B6D4]/10 text-xs font-bold rounded-lg transition-colors cursor-pointer"
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
                        {q.file_path && q.file_path !== 'Custom Question' && q.file_path !== 'Behavioral' && q.file_path !== 'Logical' && (
                          <p className="text-[10px] text-[#94A3B8] font-mono select-none">
                            File: {q.file_path} {q.line_start > 0 ? `(Lines ${q.line_start}-${q.line_end})` : ''}
                          </p>
                        )}
                        
                        {/* Render Aptitude MCQ options */}
                        {q.options && q.options.length > 0 && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="bg-[#151d1e] border border-[#3b494b] px-3 py-1.5 rounded text-xs text-[#b9cacb] font-mono select-none">
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Action buttons (Move Up, Move Down, Delete) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => moveQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-[#94A3B8] hover:text-[#06B6D4] disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">arrow_upward</span>
                        </button>
                        <button
                          onClick={() => moveQuestion(idx, 'down')}
                          disabled={idx === questions.length - 1}
                          className="p-1 text-[#94A3B8] hover:text-[#06B6D4] disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">arrow_downward</span>
                        </button>
                        <button
                          onClick={() => deleteQuestion(idx)}
                          className="p-1 text-red-400 hover:text-red-500 cursor-pointer"
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
                  onClick={() => {
                    if (requiresRepo()) {
                      setStep(2);
                    } else {
                      setStep(1);
                    }
                  }}
                  className="px-4 py-2.5 border border-[#3b494b] hover:border-[#94A3B8] text-[#94A3B8] hover:text-[#F1F5F9] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleStartInterview}
                  disabled={loading}
                  className="px-6 py-3 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
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

      {assignProjectModalOpen && (
        <AssignProjectModal
          isOpen={assignProjectModalOpen}
          onClose={() => setAssignProjectModalOpen(false)}
          candidate={
            paramCandidateId
              ? {
                  id: paramCandidateId,
                  name: candidateName,
                  email: candidateEmail,
                  role_applied: interviewMode || '',
                  tech_stack: candidateTechTags,
                  years_experience: candidateExperience
                }
              : undefined
          }
          onSuccess={() => {
            const triggerRefresh = async () => {
              if (!user?.id) return;
              const { data } = await supabase
                .from('take_home_projects')
                .select('*')
                .eq('recruiter_id', user.id);
              if (data) {
                setTakeHomeProjectsList(data);
                if (data.length > 0) {
                  const sorted = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  setSelectedTakeHomeProject(sorted[0].id);
                  if (sorted[0].submission_repo_url) {
                    setRepoUrl(sorted[0].submission_repo_url);
                  }
                }
              }
            };
            triggerRefresh();
          }}
        />
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
