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
  { id: 1, label: 'Fetching Repository',    iconName: 'account_tree' },
  { id: 2, label: 'Parsing Code Structure', iconName: 'code' },
  { id: 3, label: 'Generating Questions',   iconName: 'auto_awesome' },
  { id: 4, label: 'Quality Check',          iconName: 'verified_user' },
];

// Each step is "active" for 7 seconds before the next one activates
const STEP_DURATION_MS = 7_000;
// Poll interval for job-status endpoint
const POLL_INTERVAL_MS = 2_000;

// ---------------------------------------------------------------------------
// Step indicator sub-component
// ---------------------------------------------------------------------------

function StepRow({ step, state }: { step: Step; state: StepState }) {
  const iconEl =
    state === 'done' ? (
      <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
    ) : state === 'active' ? (
      <span className="material-symbols-outlined text-cyan-400 text-lg animate-spin">sync</span>
    ) : (
      <span className="material-symbols-outlined text-[#3b494b] text-lg">radio_button_unchecked</span>
    );

  const labelClass =
    state === 'active'
      ? 'text-[#7df4ff] font-semibold'
      : state === 'done'
      ? 'text-[#dce4e5]'
      : 'text-[#3b494b]';

  const dotClass =
    state === 'done'
      ? 'bg-emerald-400'
      : state === 'active'
      ? 'bg-[#7df4ff] animate-pulse'
      : 'bg-[#3b494b]';

  return (
    <div
      className={`flex items-center gap-4 py-3 px-4 rounded-lg transition-all duration-500 ${
        state === 'active' ? 'bg-[#192122]' : ''
      }`}
    >
      {/* Step icon */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-500 ${
          state === 'active'
            ? 'border-[#7df4ff]/40 bg-[#7df4ff]/5'
            : state === 'done'
            ? 'border-emerald-400/30 bg-emerald-400/5'
            : 'border-[#3b494b]/40'
        }`}
      >
        {iconEl}
      </div>

      {/* Step icon (decorative) and label */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span
          className={`material-symbols-outlined text-base shrink-0 transition-colors duration-500 ${
            state === 'active'
              ? 'text-[#7df4ff]/70'
              : state === 'done'
              ? 'text-emerald-400/70'
              : 'text-[#3b494b]'
          }`}
        >
          {step.iconName}
        </span>
        <span className={`text-sm font-mono transition-colors duration-500 ${labelClass}`}>
          {step.label}
        </span>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${dotClass}`}
        />
        <span
          className={`text-[10px] font-mono font-bold uppercase tracking-widest transition-colors duration-500 ${
            state === 'active'
              ? 'text-[#7df4ff]'
              : state === 'done'
              ? 'text-emerald-400'
              : 'text-[#3b494b]'
          }`}
        >
          {state === 'done' ? 'DONE' : state === 'active' ? 'ACTIVE' : 'PENDING'}
        </span>
      </div>
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
  const [elapsed,    setElapsed]        = useState(0);   // seconds since mount
  const [redirected, setRedirected]     = useState(false);

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Guard: no jobId → back to dashboard ─────────────────────────────────
  useEffect(() => {
    if (!jobId) {
      router.replace('/dashboard');
    }
  }, [jobId, router]);

  // ── Read repoUrl from localStorage ───────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('codewalk_current_repo') ?? '';
    setRepoUrl(stored);
  }, []);

  // ── Step animation (advances every STEP_DURATION_MS) ────────────────────
  useEffect(() => {
    stepRef.current = setInterval(() => {
      setActiveStep((prev) => Math.min(prev + 1, STEPS.length));
    }, STEP_DURATION_MS);

    return () => {
      if (stepRef.current) clearInterval(stepRef.current);
    };
  }, []);

  // ── Elapsed timer ────────────────────────────────────────────────────────
  useEffect(() => {
    elapsedRef.current = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1_000);
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  // ── Poll /api/job-status ─────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId || redirected) return;

    const poll = async () => {
      try {
        const res  = await fetch(`/api/job-status?jobId=${encodeURIComponent(jobId)}`);
        if (!res.ok) return;
        const data = await res.json() as { status: string };

        if (data.status === 'completed' && !redirected) {
          setRedirected(true);
          // Ensure all step indicators show DONE before navigating
          setActiveStep(STEPS.length + 1);
          if (pollRef.current) clearInterval(pollRef.current);
          if (stepRef.current) clearInterval(stepRef.current);
          // Small delay so user sees the "done" state
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
        // Network error – keep polling
      }
    };

    poll(); // immediate first check
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, router, redirected]);

  // ── Derive step states ───────────────────────────────────────────────────
  const getStepState = (stepId: number): StepState => {
    if (stepId < activeStep)  return 'done';
    if (stepId === activeStep) return 'active';
    return 'pending';
  };

  if (!jobId) return null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d1515] flex flex-col select-none">

      {/* ── Animated code background ─────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 overflow-hidden opacity-[0.035] pointer-events-none code-bg-container">
        <div className="code-scroll font-mono text-xs text-[#7df4ff] whitespace-pre leading-6 p-8">
          {`// CodeWalk – AST analysis engine v2
async function walkRepository(repoUrl: string) {
  const tree  = await parseGitTree(repoUrl);
  const nodes = await extractASTNodes(tree);
  return nodes.map(n => generateQuestion(n));
}

class QuestionEngine {
  constructor(private model: LLM) {}

  async evaluate(node: ASTNode): Promise<Question> {
    const ctx = await this.model.embed(node.code);
    return this.model.generateQuestion(ctx);
  }
}

while (queue.length > 0) {
  const node = queue.shift();
  const q    = await engine.evaluate(node);
  results.push(q);
}

export const qualityGate = (qs: Question[]) =>
  qs.filter(q => q.score > 0.85);
`.repeat(6)}
        </div>
      </div>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-[#3b494b]/50 bg-[#0d1515]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#7df4ff] text-xl">terminal</span>
          <span className="font-mono font-bold text-[#7df4ff] tracking-tight">CodeWalk</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7df4ff] animate-ping" />
          <span className="text-[10px] font-mono text-[#849495] uppercase tracking-widest">
            Live analysis session
          </span>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-[#3b494b] bg-[#151d1e] shadow-[0_0_30px_rgba(125,244,255,0.08)] mb-2">
              <span className="material-symbols-outlined text-[#7df4ff] text-3xl">terminal</span>
            </div>
            <h1 className="text-2xl font-extrabold font-mono text-[#dce4e5] tracking-tight">
              Preparing Assessment
            </h1>
            {repoUrl && (
              <p className="text-xs font-mono text-[#849495] break-all max-w-sm mx-auto leading-relaxed">
                <span className="text-[#3b494b]">repo:</span>{' '}
                <span className="text-[#7df4ff]/70">{repoUrl}</span>
              </p>
            )}
            <p className="text-sm text-[#849495]">
              AI is analyzing your repository — usually takes{' '}
              <span className="text-[#dce4e5] font-semibold">15–30 seconds</span>
            </p>
          </div>

          {/* Step card */}
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-2xl overflow-hidden shadow-2xl">
            {/* Card header */}
            <div className="px-4 py-2.5 bg-[#192122] border-b border-[#3b494b] flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#3b494b]/60" />
                <span className="w-3 h-3 rounded-full bg-[#3b494b]/60" />
                <span className="w-3 h-3 rounded-full bg-[#7df4ff]/40" />
              </div>
              <span className="ml-2 text-[10px] font-mono text-[#849495] uppercase tracking-widest">
                analysis.pipeline
              </span>
            </div>

            {/* Steps */}
            <div className="p-4 space-y-1">
              {STEPS.map((step) => (
                <StepRow
                  key={step.id}
                  step={step}
                  state={getStepState(step.id)}
                />
              ))}
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-4">
              <div className="w-full h-1 bg-[#3b494b]/40 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7df4ff] rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(125,244,255,0.5)]"
                  style={{
                    width: `${Math.min(
                      ((activeStep - 1) / STEPS.length) * 100 +
                        (activeStep <= STEPS.length ? 12 : 0),
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Console output */}
            <div className="border-t border-[#3b494b] bg-[#080f10] p-4 font-mono text-xs">
              <div className="flex items-center gap-2 mb-3 opacity-40">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3b494b]" />
                  <span className="w-2 h-2 rounded-full bg-[#3b494b]" />
                  <span className="w-2 h-2 rounded-full bg-[#3b494b]" />
                </div>
                <span className="text-[9px] uppercase tracking-widest font-bold text-[#849495]">
                  stdout
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-[#849495]/80">
                {activeStep >= 1 && (
                  <div>
                    <span className="text-[#7df4ff]/60 mr-2">$</span>
                    connection_established: github.com
                  </div>
                )}
                {activeStep >= 2 && (
                  <div>
                    <span className="text-[#7df4ff]/60 mr-2">$</span>
                    ast_walk: scanning source tree...
                  </div>
                )}
                {activeStep >= 3 && (
                  <div>
                    <span className="text-[#7df4ff]/60 mr-2">$</span>
                    llm_inference: generating question vectors
                  </div>
                )}
                {activeStep >= 4 && (
                  <div>
                    <span className="text-[#7df4ff]/60 mr-2">$</span>
                    quality_gate: validating output integrity
                  </div>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[#7df4ff]/60">$</span>
                  <span className="w-2 h-3 bg-[#7df4ff]/60 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Elapsed + hint */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#3b494b] px-1">
            <span>
              elapsed:{' '}
              <span className="text-[#849495]">{elapsed}s</span>
            </span>
            <span>Usually takes 15–30 seconds</span>
          </div>
        </div>
      </main>
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
        <div className="min-h-screen bg-[#0d1515] flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-[#7df4ff] animate-spin">sync</span>
        </div>
      }
    >
      <LoadingInner />
    </Suspense>
  );
}
