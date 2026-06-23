'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useGlobal } from '@/app/context/GlobalContext';

// ---------------------------------------------------------------------------
// Inner component that uses useSearchParams (must be in Suspense boundary)
// ---------------------------------------------------------------------------

function GithubInputInner() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const { saveAssessment } = useGlobal();

  const [repoUrl,       setRepoUrl]       = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [failBanner,    setFailBanner]    = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  
  // Custom interactive parameters
  const [branch,          setBranch]          = useState('main');
  const [visibility,      setVisibility]      = useState<'public' | 'private'>('public');
  const [githubToken,     setGithubToken]     = useState('');
  const [model,           setModel]           = useState('llama-3.3-70b-versatile');

  const inputRef = useRef<HTMLInputElement>(null);

  // Show failure banner if ?error=failed is in the URL
  useEffect(() => {
    if (searchParams.get('error') === 'failed') {
      setFailBanner(true);
      const t = setTimeout(() => setFailBanner(false), 6000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  // Blinking cursor animation
  useEffect(() => {
    const id = setInterval(() => setCursorVisible((v) => !v), 500);
    return () => clearInterval(id);
  }, []);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return false;
    }
    if (!repoUrl.trim().startsWith('https://github.com/')) {
      setError('Please enter a valid GitHub URL (must start with https://github.com/)');
      return false;
    }
    return true;
  };

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    const finalRepo      = repoUrl.trim();
    const finalCandidate = candidateName.trim() || 'Candidate';

    // Persist to localStorage so the loading page & results can read it
    localStorage.setItem('codewalk_current_repo',    finalRepo);
    localStorage.setItem('cw_temp_repo',             finalRepo);
    localStorage.setItem('cw_temp_candidate',        finalCandidate);

    setIsLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          repoUrl: finalRepo,
          branch:  branch.trim() || 'main',
          token:   visibility === 'private' ? githubToken.trim() : undefined,
          model:   model
        }),
      });

      const data = await res.json() as {
        success: boolean;
        jobId?: string;
        error?: string;
        files?: unknown[];
        readmeQuestions?: string;
        genericQuestions?: string;
        repo?: string;
      };

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Analysis request failed');
      }

      // The analyze API is synchronous — it returns the full result, not a jobId.
      // We generate a client-side jobId, store the result, then register it
      // with /api/job-status so the polling endpoint returns "completed".
      const jobId = `job_${Date.now()}`;

      // Persist the full result so the results page can load it from localStorage
      const newAnalysis = {
        jobId,
        repo:           finalRepo,
        candidateName:  finalCandidate,
        status:         'READY',
        createdAt:      new Date().toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
        questionsCount: 6,
        score:          85,
        model:          model, // Store selected model
        // Store the raw API response for the results page
        apiResult:      data,
      };

      const stored  = localStorage.getItem('cw_analyses');
      const history = stored ? (JSON.parse(stored) as object[]) : [];
      localStorage.setItem('cw_analyses', JSON.stringify([newAnalysis, ...history]));

      // Save to Supabase
      try {
        await saveAssessment(newAnalysis);
      } catch (dbErr) {
        console.error('Supabase assessments table insert failed:', dbErr);
      }

      // Update quota counters
      const qa = localStorage.getItem('cw_quota_analyses');
      localStorage.setItem(
        'cw_quota_analyses',
        String(Math.min(5, (qa ? parseInt(qa) : 0) + 1))
      );
      const qt = localStorage.getItem('cw_quota_tokens');
      localStorage.setItem(
        'cw_quota_tokens',
        String(Math.min(100_000, (qt ? parseInt(qt) : 0) + 15_600))
      );
      window.dispatchEvent(new Event('quotaUpdated'));

      // Register this job as "completed" with the polling endpoint
      await fetch('/api/job-status', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobId, status: 'completed' }),
      });

      // Navigate to loading screen — it will poll and immediately see "completed"
      router.push(`/dashboard/loading?jobId=${jobId}`);
    } catch (err) {
      setIsLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Analysis-failed banner */}
      {failBanner && (
        <div className="flex items-center gap-3 px-4 py-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error animate-in slide-in-from-top-2 duration-300">
          <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
          <span>Analysis failed. Please check the URL and try again.</span>
          <button
            className="ml-auto text-error/60 hover:text-error transition-colors"
            onClick={() => setFailBanner(false)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Terminal input card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-2xl">
        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-high border-b border-outline-variant select-none">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-error/40" />
            <div className="w-3 h-3 rounded-full bg-tertiary-container/40" />
            <div className="w-3 h-3 rounded-full bg-primary-fixed/40" />
          </div>
          <div className="font-mono text-[11px] text-on-surface-variant opacity-50 flex items-center gap-2">
            <span className="material-symbols-outlined text-[13px]">lock</span>
            ssh-session: git@codewalk.io
          </div>
        </div>

        {/* Terminal form body */}
        <form onSubmit={handleGenerate} className="p-8 space-y-6">
          <div className="space-y-4">
            {/* Candidate name */}
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm text-primary-fixed w-36 shrink-0">
                candidate_name:
              </span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                disabled={isLoading}
                className="flex-1 bg-transparent border-b border-outline-variant/30 focus:border-primary-fixed font-mono text-sm text-on-surface p-1 outline-none placeholder:text-on-surface-variant/20 disabled:opacity-50"
                placeholder="Rahul Sharma"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
              />
            </div>

            {/* GitHub repo URL */}
            <div className="flex items-start gap-4">
              <span className="font-mono text-sm text-primary-fixed w-36 shrink-0 mt-1">
                github_repo_url:
              </span>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isLoading}
                  className={`w-full bg-transparent border-b font-mono text-sm text-primary-fixed p-1 outline-none selection:bg-primary-fixed/20 placeholder:text-primary-fixed/20 disabled:opacity-50 transition-colors ${
                    error
                      ? 'border-error/60 focus:border-error'
                      : 'border-outline-variant/30 focus:border-primary-fixed'
                  }`}
                  placeholder="https://github.com/username/repo"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    if (error) setError(null);
                  }}
                />
                {/* Blinking cursor when empty */}
                {!repoUrl && cursorVisible && !isLoading && (
                  <span className="absolute left-0 top-1.5 w-2 h-4 bg-primary-fixed/70 pointer-events-none select-none" />
                )}
              </div>
            </div>

            {/* GitHub PAT (only shown if private) */}
            {visibility === 'private' && (
              <div className="flex items-center gap-4 animate-in slide-in-from-top-1 duration-200">
                <span className="font-mono text-sm text-primary-fixed w-36 shrink-0">
                  github_pat_token:
                </span>
                <input
                  type="password"
                  autoComplete="off"
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-b border-outline-variant/30 focus:border-primary-fixed font-mono text-sm text-on-surface p-1 outline-none placeholder:text-on-surface-variant/20 disabled:opacity-50"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Inline error */}
          {error && (
            <div className="flex items-center gap-2 text-error text-xs font-mono pl-40 animate-in slide-in-from-top-1 duration-200">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Action bar */}
          <div className="flex justify-end items-center pt-6 border-t border-outline-variant/10">
            <button
              type="submit"
              disabled={isLoading || !repoUrl.trim()}
              className={`glow-cyan bg-transparent border border-primary-fixed text-primary-fixed px-6 py-3 font-mono text-xs uppercase tracking-widest rounded-lg flex items-center gap-3 hover:bg-primary-fixed hover:text-on-primary transition-all active:scale-95 group font-bold ${
                isLoading || !repoUrl.trim()
                  ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-primary-fixed'
                  : ''
              }`}
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                  Analyzing...
                </>
              ) : (
                <>
                  Generate Questions
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-0.5 transition-transform">bolt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported component — wraps inner in Suspense (required for useSearchParams)
// ---------------------------------------------------------------------------

export default function GithubInput() {
  return (
    <Suspense
      fallback={
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex items-center justify-center h-48">
          <span className="material-symbols-outlined text-2xl text-primary-fixed animate-spin">sync</span>
        </div>
      }
    >
      <GithubInputInner />
    </Suspense>
  );
}
