'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepState = 'done' | 'active' | 'pending';

interface Step {
  id: number;
  label: string;
  iconName: string;
}

const STEPS: Step[] = [
  { id: 1, label: 'Fetching Git Tree',       iconName: 'account_tree' },
  { id: 2, label: 'Walking AST Structure',   iconName: 'code' },
  { id: 3, label: 'LLM Question Generation',  iconName: 'auto_awesome' },
  { id: 4, label: 'Integrity Quality Check', iconName: 'verified_user' },
];

const STEP_DURATION_MS = 6_500;
const POLL_INTERVAL_MS = 2_000;

// ---------------------------------------------------------------------------
// Pipeline step sub-component (rendered in the status card)
// ---------------------------------------------------------------------------
function StatusStepRow({ step, state }: { step: Step; state: StepState }) {
  const iconColor = 
    state === 'done' ? 'text-emerald-400' :
    state === 'active' ? 'text-[#00f0ff]' :
    'text-[#3b494b]';

  return (
    <div className={`flex items-center gap-3 py-1.5 px-2 rounded-lg transition-all duration-300 ${
      state === 'active' ? 'bg-[#151d1e]/50' : ''
    }`}>
      <span className={`material-symbols-outlined text-base shrink-0 ${iconColor} ${
        state === 'active' ? 'animate-spin' : ''
      }`}>
        {state === 'done' ? 'check_circle' : state === 'active' ? 'sync' : 'radio_button_unchecked'}
      </span>
      <span className={`text-[11px] font-mono transition-colors duration-300 ${
        state === 'active' ? 'text-[#7df4ff] font-bold' :
        state === 'done' ? 'text-[#dce4e5]' : 'text-[#3b494b]'
      }`}>
        {step.label}
      </span>
      <span className={`ml-auto text-[8px] font-mono uppercase px-1.5 py-0.5 rounded ${
        state === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
        state === 'active' ? 'bg-[#00f0ff]/10 text-[#00f0ff] animate-pulse' :
        'bg-[#3b494b]/10 text-[#3b494b]'
      }`}>
        {state}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner component (uses useSearchParams — must be inside Suspense)
// ---------------------------------------------------------------------------
function LoadingInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const jobId        = searchParams.get('jobId');

  const [activeStep, setActiveStep]     = useState(1); // 1–4
  const [repoUrl,    setRepoUrl]        = useState<string>('');
  const [elapsed,    setElapsed]        = useState(0);
  const [redirected, setRedirected]     = useState(false);

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guard: no jobId -> redirect
  useEffect(() => {
    if (!jobId) {
      router.replace('/dashboard');
    }
  }, [jobId, router]);

  // Read repoUrl from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('codewalk_current_repo') ?? '';
    setRepoUrl(stored);
  }, []);

  // Step advancement timer
  useEffect(() => {
    stepRef.current = setInterval(() => {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length));
    }, STEP_DURATION_MS);

    return () => {
      if (stepRef.current) clearInterval(stepRef.current);
    };
  }, []);

  // Elapsed seconds timer
  useEffect(() => {
    elapsedRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1_000);
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  // Poll API job status
  useEffect(() => {
    if (!jobId || redirected) return;

    const poll = async () => {
      try {
        const res  = await fetch(`/api/job-status?jobId=${encodeURIComponent(jobId)}`);
        if (!res.ok) return;
        const data = await res.json() as { status: string };

        if (data.status === 'completed' && !redirected) {
          setRedirected(true);
          setActiveStep(STEPS.length + 1);
          if (pollRef.current) clearInterval(pollRef.current);
          if (stepRef.current) clearInterval(stepRef.current);
          setTimeout(() => {
            router.push(`/results/${jobId}`);
          }, 800);
        } else if (data.status === 'failed' && !redirected) {
          setRedirected(true);
          if (pollRef.current) clearInterval(pollRef.current);
          if (stepRef.current) clearInterval(stepRef.current);
          router.push('/dashboard?error=failed');
        }
      } catch {
        // Keep polling
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, router, redirected]);

  const getStepState = (stepId: number): StepState => {
    if (stepId < activeStep)  return 'done';
    if (stepId === activeStep) return 'active';
    return 'pending';
  };

  if (!jobId) return null;

  return (
    <div className="flex h-screen bg-[#070d0e] text-[#dce4e5] overflow-hidden font-sans relative select-none">
      
      {/* ── BACKGROUND PULSING CODE BLOCKS (Instagram/YouTube theme decoration) ── */}
      <div className="absolute inset-0 z-0 opacity-[0.015] pointer-events-none overflow-hidden">
        <div className="font-mono text-xs text-[#06B6D4] whitespace-pre leading-6 p-8">
          {`// CodeWalk AST compilation pipeline
async function indexTree(jobId: string) {
  const repo = await Git.clone(jobId);
  const ast = parseAST(repo.files);
  return ast.compileQuestions();
}`.repeat(10)}
        </div>
      </div>

      {/* ── LEFT PANE: QUESTIONS SIDEBAR SKELETON ── */}
      <div className="w-80 border-r border-[#3b494b]/40 flex flex-col bg-[#0c1213]/90 z-10 shrink-0">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3b494b]/40 flex justify-between items-center bg-[#0e1617]/50">
          <div className="h-4 bg-[#233133] rounded w-28 animate-pulse"></div>
          <div className="h-4 bg-[#233133] rounded-full w-8 animate-pulse"></div>
        </div>

        {/* Pulsing Question Cards List */}
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className={`p-3.5 border border-[#3b494b]/30 rounded-xl space-y-3 bg-[#111819]/50 animate-pulse ${
                i === 1 ? 'border-[#06B6D4]/30 bg-[#06B6D4]/5' : ''
              }`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="flex justify-between items-center">
                <div className="h-3 bg-[#233133] rounded w-16"></div>
                <div className="h-3 bg-[#233133] rounded-full w-3"></div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3.5 bg-[#1a2527] rounded w-full"></div>
                <div className="h-3.5 bg-[#1a2527] rounded w-4/5"></div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div className="h-3.5 bg-[#233133] rounded w-10"></div>
                <div className="h-3.5 bg-[#233133] rounded w-12"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANE: MAIN WORKSPACE SKELETON ── */}
      <div className="flex-1 flex flex-col bg-[#070d0e] z-10 overflow-y-auto">
        
        {/* Navigation / Repo Header */}
        <div className="px-8 py-5 border-b border-[#3b494b]/40 bg-[#0c1213]/40 flex items-center justify-between">
          <div className="space-y-1.5">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider text-[#b9cacb]/50">
              <span className="h-3 bg-[#233133] rounded w-16 animate-pulse"></span>
              <span>/</span>
              <span className="h-3 bg-[#233133] rounded w-28 animate-pulse"></span>
              <span>/</span>
              <span className="h-3 bg-[#06B6D4]/20 rounded w-20 animate-pulse"></span>
            </div>
            
            {/* Repo Info Header */}
            <div className="flex items-center gap-3">
              <div className="h-7 bg-[#1c292b] rounded-lg w-72 animate-pulse"></div>
              <div className="h-5 bg-[#233133] rounded w-16 animate-pulse"></div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="h-9 bg-[#233133] rounded-xl w-24 animate-pulse"></div>
            <div className="h-9 bg-[#233133] rounded-xl w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Workspace Skeleton Card */}
        <div className="p-8 max-w-4xl w-full mx-auto space-y-6">
          
          <div className="bg-[#111819] border border-[#3b494b]/50 rounded-2xl p-6 space-y-6 shadow-2xl animate-pulse">
            
            {/* Question Details Top Bar */}
            <div className="flex justify-between items-center border-b border-[#3b494b]/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-5 bg-[#233133] rounded-full w-20"></div>
                <div className="h-5 bg-[#233133] rounded-full w-14"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-6 bg-[#233133] rounded w-8"></div>
                <div className="h-6 bg-[#233133] rounded w-8"></div>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <div className="h-5 bg-[#1c292b] rounded w-11/12"></div>
              <div className="h-5 bg-[#1c292b] rounded w-5/6"></div>
              <div className="h-5 bg-[#1c292b] rounded w-3/4"></div>
            </div>

            {/* Code Block Mockup */}
            <div className="rounded-xl overflow-hidden border border-[#3b494b]/40 bg-[#080c0d] shadow-inner">
              {/* Window Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d1415] border-b border-[#3b494b]/30">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f57]/50" />
                  <span className="w-3 h-3 rounded-full bg-[#febc2e]/50" />
                  <span className="w-3 h-3 rounded-full bg-[#28c840]/50" />
                </div>
                <div className="h-3.5 bg-[#1c292b] rounded w-40"></div>
                <div className="w-6"></div>
              </div>
              
              {/* Pre lines */}
              <div className="p-4 space-y-3.5 font-mono text-xs">
                <div className="h-4 bg-[#141b1c] rounded w-3/5"></div>
                <div className="h-4 bg-[#141b1c] rounded w-4/5"></div>
                <div className="h-4 bg-[#1a2527] rounded w-11/12"></div>
                <div className="h-4 bg-[#1a2527] rounded w-5/6"></div>
                <div className="h-4 bg-[#141b1c] rounded w-2/3"></div>
                <div className="h-4 bg-[#141b1c] rounded w-3/4"></div>
              </div>
            </div>

            {/* Answer Guide Accordion Box */}
            <div className="bg-[#0e1516] border border-[#3b494b]/30 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-[#233133] rounded w-36"></div>
                <div className="h-4 bg-[#233133] rounded w-4"></div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-3 bg-[#1c292b] rounded w-full"></div>
                <div className="h-3 bg-[#1c292b] rounded w-11/12"></div>
                <div className="h-3 bg-[#1c292b] rounded w-4/5"></div>
              </div>
            </div>

            {/* Scoring/Rating Block */}
            <div className="border-t border-[#3b494b]/30 pt-5 space-y-3">
              <div className="h-4 bg-[#233133] rounded w-44"></div>
              <div className="flex flex-wrap gap-2.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="h-9 bg-[#1a2527] rounded-lg w-20"></div>
                ))}
              </div>
            </div>

            {/* Private Notes */}
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-[#233133] rounded w-24"></div>
              <div className="h-20 bg-[#0d1415] border border-[#3b494b]/30 rounded-xl w-full"></div>
            </div>

          </div>
        </div>
      </div>

      {/* ── FLOATING ENGINE PIPELINE CARD (Linear-style pipeline panel) ── */}
      <div className="fixed bottom-6 right-6 w-96 bg-[#0c1213]/90 border border-[#06B6D4]/30 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-md animate-in slide-in-from-bottom duration-300">
        
        {/* Panel Header */}
        <div className="px-4 py-3 bg-[#141b1c] border-b border-[#3b494b]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f0ff]"></span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest font-black text-white">CodeWalk AI Pipeline</span>
          </div>
          <span className="text-[10px] font-mono text-[#b9cacb]/60">
            elapsed: <strong className="text-white font-bold">{elapsed}s</strong>
          </span>
        </div>

        {/* Steps */}
        <div className="p-4 space-y-1.5 border-b border-[#3b494b]/40">
          {STEPS.map((step) => (
            <StatusStepRow
              key={step.id}
              step={step}
              state={getStepState(step.id)}
            />
          ))}
        </div>

        {/* Blinking Live Console stdout */}
        <div className="bg-[#080d0e] p-3 font-mono text-[10px] leading-5 text-[#849495]/95">
          <div className="flex items-center gap-1.5 opacity-40 mb-1 border-b border-[#3b494b]/20 pb-1">
            <span className="material-symbols-outlined text-[10px]">terminal</span>
            <span className="text-[8px] uppercase tracking-wider font-bold">stdout logger</span>
          </div>
          <div className="space-y-0.5">
            {activeStep >= 1 && (
              <div>
                <span className="text-[#00f0ff]/50 mr-1.5">$</span>
                git_fetch: cloning remote repository structure...
              </div>
            )}
            {activeStep >= 2 && (
              <div>
                <span className="text-[#00f0ff]/50 mr-1.5">$</span>
                ast_tree: index matches: 124 syntax nodes
              </div>
            )}
            {activeStep >= 3 && (
              <div>
                <span className="text-[#00f0ff]/50 mr-1.5">$</span>
                ai_inference: generating semantic technical prompts...
              </div>
            )}
            {activeStep >= 4 && (
              <div>
                <span className="text-[#00f0ff]/50 mr-1.5">$</span>
                quality_gate: verified 10/10 questions successfully
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
