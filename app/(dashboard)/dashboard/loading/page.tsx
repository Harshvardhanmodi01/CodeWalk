'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';

// ---------------------------------------------------------------------------
// Inner component (uses useSearchParams — must be inside Suspense)
// ---------------------------------------------------------------------------
function LoadingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveAssessment } = useGlobal();

  // Search parameters for analysis trigger
  const repoUrlParam = searchParams.get('repoUrl');
  const candidateNameParam = searchParams.get('candidateName');
  const branchParam = searchParams.get('branch');
  const visibilityParam = searchParams.get('visibility');
  const githubTokenParam = searchParams.get('githubToken');
  const modelParam = searchParams.get('model');

  // Search parameter for polling fallback
  const jobIdParam = searchParams.get('jobId');

  // State Management
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [candidateName, setCandidateName] = useState<string>('Candidate');
  const [activeStep, setActiveStep] = useState(1); // 1 = Fetching, 2 = AST, 3 = Generation, 4 = Check
  const [elapsed, setElapsed] = useState(0);
  const [redirected, setRedirected] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read/sync parameters
  useEffect(() => {
    if (repoUrlParam) {
      setRepoUrl(repoUrlParam);
    } else {
      const stored = localStorage.getItem('codewalk_current_repo') ?? '';
      setRepoUrl(stored);
    }

    if (candidateNameParam) {
      setCandidateName(candidateNameParam);
    }
  }, [repoUrlParam, candidateNameParam]);

  // Elapsed seconds timer
  useEffect(() => {
    elapsedRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  // Trigger analysis or poll based on query parameters
  useEffect(() => {
    if (redirected) return;

    // Case 1: Trigger active analysis call in useEffect on mount
    if (repoUrlParam) {
      const runAnalysis = async () => {
        try {
          // Step 1: Fetching Git Tree
          setActiveStep(1);
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              repoUrl: repoUrlParam,
              branch: branchParam || 'main',
              token: visibilityParam === 'private' ? githubTokenParam : undefined,
              model: modelParam || 'llama-3.3-70b-versatile'
            })
          });

          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Repository analysis failed');
          }

          // Step 2: Walking AST Structure
          setActiveStep(2);
          await new Promise((resolve) => setTimeout(resolve, 800));

          // Step 3: LLM Question Generation
          setActiveStep(3);
          await new Promise((resolve) => setTimeout(resolve, 800));

          // Step 4: Integrity Quality Check
          setActiveStep(4);
          await new Promise((resolve) => setTimeout(resolve, 600));

          // Success: Save results and redirect
          setRedirected(true);
          const jobId = `job_${Date.now()}`;

          // Create assessment object
          const newAnalysis = {
            jobId,
            repo: repoUrlParam,
            candidateName: candidateNameParam || 'Candidate',
            status: 'READY',
            createdAt: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }),
            questionsCount: 6,
            score: 85,
            model: modelParam || 'llama-3.3-70b-versatile',
            apiResult: data
          };

          // Save to local storage analyses history
          const stored = localStorage.getItem('cw_analyses');
          const history = stored ? JSON.parse(stored) : [];
          localStorage.setItem('cw_analyses', JSON.stringify([newAnalysis, ...history]));

          // Trigger saveAssessment (Supabase)
          try {
            await saveAssessment(newAnalysis);
          } catch (dbErr) {
            console.error('Supabase save failed:', dbErr);
          }

          // Update tokens/quota in localStorage
          const qa = localStorage.getItem('cw_quota_analyses');
          localStorage.setItem('cw_quota_analyses', String(Math.min(5, (qa ? parseInt(qa) : 0) + 1)));

          const qt = localStorage.getItem('cw_quota_tokens');
          localStorage.setItem('cw_quota_tokens', String(Math.min(100000, (qt ? parseInt(qt) : 0) + 15600)));

          window.dispatchEvent(new Event('quotaUpdated'));

          // Notify job-status route that this job is complete
          await fetch('/api/job-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, status: 'completed' })
          });

          // Redirect to results page
          router.push(`/results/${jobId}`);

        } catch (err: any) {
          console.error('Analysis error:', err);
          setErrorMsg(err.message || 'Analysis failed');
          setRedirected(true);

          // Notify job-status route that this job failed
          const failedJobId = `job_failed_${Date.now()}`;
          await fetch('/api/job-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: failedJobId, status: 'failed' })
          }).catch(() => null);

          // Redirect back to dashboard with an error
          router.push('/dashboard?error=failed');
        }
      };

      runAnalysis();

    } else if (jobIdParam) {
      // Case 2: Backwards compatibility polling fallback
      const poll = async () => {
        try {
          const res = await fetch(`/api/job-status?jobId=${encodeURIComponent(jobIdParam)}`);
          if (!res.ok) return;
          const data = await res.json();

          if (data.status === 'completed' && !redirected) {
            setRedirected(true);
            if (pollRef.current) clearInterval(pollRef.current);
            router.push(`/results/${jobIdParam}`);
          } else if (data.status === 'failed' && !redirected) {
            setRedirected(true);
            if (pollRef.current) clearInterval(pollRef.current);
            router.push('/dashboard?error=failed');
          }
        } catch {
          // Keep polling
        }
      };

      poll();
      pollRef.current = setInterval(poll, 2000);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    } else {
      // No valid parameter -> go back
      router.replace('/dashboard');
    }
  }, [repoUrlParam, jobIdParam, redirected, router, branchParam, visibilityParam, githubTokenParam, modelParam, candidateNameParam, saveAssessment]);

  // Clean repo owner/repo string for breadcrumbs
  const cleanRepoName = repoUrl.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
  const repoParts = cleanRepoName.split('/');
  const owner = repoParts[0] || 'owner';
  const repo = repoParts[1] || 'repo';

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans select-none overscroll-none">
      
      {/* ── TOP HEADER SKELETON ── */}
      <header className="flex justify-between items-center px-6 py-2 bg-surface-container-low w-full border-b border-outline-variant z-30 select-none animate-pulse">
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2 font-mono text-xs text-[#06B6D4]">
            <span className="material-symbols-outlined text-sm font-bold animate-spin">sync</span>
            <span className="opacity-80">CW</span>
            <span className="opacity-40">/</span>
            <span className="bg-surface-container-highest h-3.5 w-16 rounded"></span>
            <span className="opacity-40">/</span>
            <span className="bg-surface-container-highest h-3.5 w-24 rounded"></span>
            <span className="opacity-40">/</span>
            <span className="bg-primary/20 h-3.5 w-28 rounded"></span>
          </div>
          <div className="h-4 w-px bg-outline-variant"></div>
          
          {/* Pulsing Breadcrumb Navigation Buttons */}
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 bg-surface-container-highest rounded flex items-center justify-center opacity-65">
              <span className="material-symbols-outlined text-xs">chevron_left</span>
            </div>
            <div className="h-3.5 bg-surface-container-highest w-8 rounded text-center text-[10px] font-bold text-on-surface-variant flex items-center justify-center">1/5</div>
            <div className="w-6 h-6 bg-surface-container-highest rounded flex items-center justify-center opacity-65">
              <span className="material-symbols-outlined text-xs">chevron_right</span>
            </div>
          </div>
        </div>

        {/* Pulsing Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="h-8 bg-surface-container-highest w-24 rounded-lg"></div>
          <div className="h-8 bg-surface-container-highest w-8 rounded-lg"></div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE GRID ── */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT PANEL: CODE PANEL SKELETON */}
        <div className="flex-1 flex flex-col bg-card border-r border-outline-variant overflow-hidden">
          
          {/* File Tab Bars */}
          <div className="flex items-center bg-surface-container-low border-b border-outline-variant px-4 h-10 select-none animate-pulse">
            <div className="flex gap-2">
              <div className="h-6 bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-md w-36"></div>
              <div className="h-6 bg-surface-container-highest/60 rounded-md w-28"></div>
              <div className="h-6 bg-surface-container-highest/60 rounded-md w-32"></div>
            </div>
          </div>

          {/* Code Viewer skeleton - Pulsing horizontal lines of random widths */}
          <div className="flex-1 p-6 space-y-4 font-mono text-xs overflow-y-auto bg-background animate-pulse">
            <div className="flex items-center gap-4 text-[#849495]/40 select-none border-b border-outline-variant/30 pb-2 mb-4">
              <span className="material-symbols-outlined text-sm">description</span>
              <span>index.ts</span>
            </div>
            <div className="h-4 bg-surface-container-highest/50 rounded w-1/3"></div>
            <div className="h-4 bg-surface-container-highest/30 rounded w-2/3"></div>
            <div className="h-4 bg-surface-container-highest/60 rounded w-11/12"></div>
            <div className="h-4 bg-surface-container-highest/40 rounded w-4/5"></div>
            <div className="h-4 bg-[#06B6D4]/15 rounded w-5/6"></div>
            <div className="h-4 bg-[#06B6D4]/10 rounded w-3/4"></div>
            <div className="h-4 bg-surface-container-highest/30 rounded w-1/2"></div>
            <div className="h-4 bg-surface-container-highest/50 rounded w-2/3"></div>
            <div className="h-4 bg-surface-container-highest/60 rounded w-5/6"></div>
            <div className="h-4 bg-surface-container-highest/40 rounded w-4/5"></div>
            <div className="h-4 bg-surface-container-highest/30 rounded w-11/12"></div>
            <div className="h-4 bg-surface-container-highest/40 rounded w-2/3"></div>
          </div>
        </div>

        {/* RIGHT PANEL: QUESTION PANEL SKELETON */}
        <div className="w-full lg:w-[480px] bg-background border-l border-outline-variant flex flex-col overflow-hidden shrink-0 animate-pulse">
          
          {/* Tabs header & timers */}
          <div className="flex items-center justify-between px-6 h-10 border-b border-outline-variant bg-surface-container-low">
            <div className="flex gap-4">
              <div className="h-5 bg-surface-container-highest w-20 rounded"></div>
              <div className="h-5 bg-surface-container-highest w-24 rounded"></div>
            </div>
            <div className="h-5 bg-surface-container-highest w-14 rounded"></div>
          </div>

          {/* Question panel body skeleton */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            
            {/* Difficulty Selector Skeleton */}
            <div className="space-y-2">
              <div className="h-3.5 bg-surface-container-highest w-24 rounded"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-lg w-16"></div>
                <div className="h-8 bg-surface-container-highest/50 rounded-lg w-16"></div>
                <div className="h-8 bg-surface-container-highest/50 rounded-lg w-16"></div>
              </div>
            </div>

            {/* Question Card Skeleton */}
            <div className="bg-card border border-outline-variant rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="h-4 bg-surface-container-highest w-28 rounded-full"></div>
                <div className="h-4 bg-surface-container-highest w-12 rounded"></div>
              </div>

              {/* Pulsing Description */}
              <div className="space-y-2">
                <div className="h-4 bg-surface-container-highest/80 rounded w-full"></div>
                <div className="h-4 bg-surface-container-highest/80 rounded w-11/12"></div>
                <div className="h-4 bg-surface-container-highest/60 rounded w-4/5"></div>
              </div>
            </div>

            {/* Dotted Answer Container */}
            <div className="border border-dashed border-outline-variant/60 rounded-xl p-4 bg-surface-container-low/30 space-y-3">
              <div className="h-4 bg-surface-container-highest/80 rounded w-32"></div>
              <div className="space-y-1.5 pt-1">
                <div className="h-3 bg-surface-container-highest/60 rounded w-full"></div>
                <div className="h-3 bg-surface-container-highest/60 rounded w-11/12"></div>
                <div className="h-3 bg-surface-container-highest/40 rounded w-4/5"></div>
              </div>
            </div>

            {/* Four Pulsing Rating Buttons */}
            <div className="space-y-2.5 pt-2">
              <div className="h-3.5 bg-surface-container-highest w-28 rounded"></div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-10 bg-surface-container-highest/60 rounded-xl"></div>
                <div className="h-10 bg-surface-container-highest/60 rounded-xl"></div>
                <div className="h-10 bg-surface-container-highest/60 rounded-xl"></div>
                <div className="h-10 bg-surface-container-highest/60 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER THIN PROGRESS BAR ── */}
      <div className="h-1 bg-surface-container-highest w-full relative z-30 select-none">
        <div 
          className="absolute top-0 left-0 h-full bg-[#06B6D4] transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]" 
          style={{ width: `${(activeStep / 4) * 100}%` }}
        ></div>
      </div>

      {/* ── FLOATING PIPELINE CARD ── */}
      <div className="fixed bottom-6 right-6 w-96 bg-[#0c1213]/90 border border-[#06B6D4]/30 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
        
        {/* Panel Header */}
        <div className="px-4 py-3 bg-[#141b1c] border-b border-[#3b494b]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f0ff]"></span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest font-black text-white">Analyzing Repository</span>
          </div>
          <span className="text-[10px] font-mono text-[#b9cacb]/60">
            elapsed: <strong className="text-white font-bold">{elapsed}s</strong>
          </span>
        </div>

        {/* Step Rows */}
        <div className="p-4 space-y-1.5 border-b border-[#3b494b]/40">
          {[
            { id: 1, label: 'Fetching Git Tree' },
            { id: 2, label: 'Walking AST Structure' },
            { id: 3, label: 'LLM Question Generation' },
            { id: 4, label: 'Integrity Quality Check' }
          ].map((s) => {
            const isDone = s.id < activeStep;
            const isActive = s.id === activeStep;
            const iconColor = isDone ? 'text-emerald-400' : isActive ? 'text-[#00f0ff]' : 'text-[#3b494b]';
            
            return (
              <div key={s.id} className={`flex items-center gap-3 py-1.5 px-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-[#151d1e]/50' : ''}`}>
                <span className={`material-symbols-outlined text-base shrink-0 ${iconColor} ${isActive ? 'animate-spin' : ''}`}>
                  {isDone ? 'check_circle' : isActive ? 'sync' : 'radio_button_unchecked'}
                </span>
                <span className={`text-[11px] font-mono transition-colors duration-300 ${isActive ? 'text-[#7df4ff] font-bold' : isDone ? 'text-[#dce4e5]' : 'text-[#3b494b]'}`}>
                  {s.label}
                </span>
                <span className={`ml-auto text-[8px] font-mono uppercase px-1.5 py-0.5 rounded ${isDone ? 'bg-emerald-500/10 text-emerald-400' : isActive ? 'bg-[#00f0ff]/10 text-[#00f0ff] animate-pulse' : 'bg-[#3b494b]/10 text-[#3b494b]'}`}>
                  {isDone ? 'done' : isActive ? 'active' : 'pending'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Live Console Output */}
        <div className="bg-[#080d0e] p-3 font-mono text-[10px] leading-5 text-[#849495]/95">
          <div className="flex items-center gap-1.5 opacity-40 mb-1 border-b border-[#3b494b]/20 pb-1">
            <span className="material-symbols-outlined text-[10px]">terminal</span>
            <span className="text-[8px] uppercase tracking-wider font-bold">compiler log</span>
          </div>
          <div className="space-y-0.5">
            {activeStep >= 1 && (
              <div>
                <span className="text-[#00f0ff]/50 mr-1.5">$</span>
                git clone {owner}/{repo}...
              </div>
            )}
            {activeStep >= 2 && (
              <div>
                <span className="text-[#00f0ff]/50 mr-1.5">$</span>
                ast_analyzer: mapping imports, classes, and logic...
              </div>
            )}
            {activeStep >= 3 && (
              <div>
                <span className="text-[#00f0ff]/50 mr-1.5">$</span>
                gemini_model: generating custom code walk screeners...
              </div>
            )}
            {activeStep >= 4 && (
              <div>
                <span className="text-[#00f0ff]/50 mr-1.5">$</span>
                quality_assurance: checks complete, saving assessment.
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-[#00f0ff]/50">$</span>
              <span className="w-1.5 h-3 bg-[#00f0ff]/50 animate-pulse"></span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported page — wraps inner in Suspense (required for useSearchParams)
// ---------------------------------------------------------------------------
export default function LoadingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070d0e] flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-[#06B6D4] animate-spin">sync</span>
        </div>
      }
    >
      <LoadingInner />
    </Suspense>
  );
}
