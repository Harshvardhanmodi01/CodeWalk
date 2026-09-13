'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGlobal } from '@/app/context/GlobalContext';

export default function HeroSection() {
  const router = useRouter();
  const { user } = useGlobal();
  const [mounted, setMounted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [typedPlaceholder, setTypedPlaceholder] = useState('https://github.com/');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Typewriter animation
  useEffect(() => {
    if (isFocused || inputValue) return;
    const commands = ['facebook/react', 'vercel/next.js', 'openai/whisper', 'tailwindlabs/tailwindcss'];
    let cmdIdx = 0, charIdx = 0, isDeleting = false;
    let timeoutId: NodeJS.Timeout;
    function type() {
      const cur = commands[cmdIdx];
      if (isDeleting) {
        setTypedPlaceholder('https://github.com/' + cur.substring(0, charIdx - 1));
        charIdx--;
      } else {
        setTypedPlaceholder('https://github.com/' + cur.substring(0, charIdx + 1));
        charIdx++;
      }
      let speed = isDeleting ? 40 : 80;
      if (!isDeleting && charIdx === cur.length) { isDeleting = true; speed = 2000; }
      else if (isDeleting && charIdx === 0) { isDeleting = false; cmdIdx = (cmdIdx + 1) % commands.length; speed = 500; }
      timeoutId = setTimeout(type, speed);
    }
    timeoutId = setTimeout(type, 1000);
    return () => clearTimeout(timeoutId);
  }, [isFocused, inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = inputValue.trim() || typedPlaceholder;
    router.push(`/dashboard?repo=${encodeURIComponent(finalUrl)}`);
  };

  return (
    <main className="relative min-h-[90vh] pt-24 pb-16 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-white via-violet-50/40 to-pink-50/30">

      {/* Decorative blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)', filter: 'blur(48px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] opacity-10"
          style={{ background: 'radial-gradient(ellipse, rgba(249,112,102,0.25) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        {/* Dot pattern top-right */}
        <div className="absolute top-12 right-8 w-40 h-40 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle, #c4b5fd 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        {/* Dot pattern bottom-left */}
        <div className="absolute bottom-16 left-8 w-32 h-32 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, #f9a8d4 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
      </div>

      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-16 items-center">

        {/* LEFT — Text + CTA */}
        <div className="flex flex-col items-start text-left space-y-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border"
            style={{ background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.20)', color: '#7c3aed' }}>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <circle cx="5" cy="5" r="4" fill="#7c3aed" opacity="0.5" />
              <circle cx="5" cy="5" r="2" fill="#7c3aed" />
            </svg>
            AI-Powered Interview Intelligence
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="text-5xl sm:text-6xl lg:text-[68px] font-extrabold tracking-tight leading-[1.08] text-slate-900"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Deep Technical{' '}
              <span style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f97066 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Intelligence.
              </span>
            </h1>
          </div>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed max-w-lg">
            Stop guessing skills. CodeWalk analyzes repositories to generate precision interview questions and behavioral insights.
          </p>

          {/* Repo Input */}
          <form onSubmit={handleSubmit} className="w-full max-w-xl">
            <div className="flex items-center bg-white rounded-2xl border border-gray-200 p-1.5 shadow-md hover:shadow-lg hover:border-violet-200 transition-all duration-300"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div className="flex-1 flex items-center px-3 gap-2 overflow-hidden">
                {/* GitHub icon */}
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-slate-400 flex-shrink-0">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                {isFocused ? (
                  <input
                    type="text"
                    className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 w-full outline-none text-sm font-medium"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    onBlur={() => setIsFocused(false)}
                    autoFocus
                  />
                ) : (
                  <span onClick={() => setIsFocused(true)}
                    className="text-slate-500 cursor-text flex items-center w-full text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                    {inputValue || typedPlaceholder}
                    <span className="border-l-2 border-violet-500 ml-0.5 cursor-blink h-4 align-middle inline-block" />
                  </span>
                )}
              </div>
              <button type="submit"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all active:scale-95 hover:opacity-90 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #f97066, #ec4899)', boxShadow: '0 4px 14px rgba(249,112,102,0.30)' }}>
                Analyze Repository
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </form>

          {/* Logged-in shortcut */}
          {mounted && user && (
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all hover:shadow-md"
              style={{ borderColor: 'rgba(124,58,237,0.25)', color: '#7c3aed', background: 'rgba(124,58,237,0.05)' }}>
              <span className="material-symbols-outlined text-sm">dashboard</span>
              Go to Recruiter Dashboard
            </Link>
          )}

          {/* Trusted by */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-xs text-slate-500 font-semibold">Trusted by recruiters at</span>
            {['Google', 'Microsoft', 'Meta', 'Stripe'].map((brand) => (
              <span key={brand} className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors tracking-tight">{brand}</span>
            ))}
          </div>
        </div>

        {/* RIGHT — Product preview card */}
        <div className="hidden xl:flex flex-col relative">
          {/* Main card */}
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-gray-100 relative z-10"
            style={{ boxShadow: '0 24px 80px rgba(124,58,237,0.10), 0 4px 16px rgba(0,0,0,0.06)' }}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#d1fae5' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-slate-700">Analysis Complete</span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{ background: 'rgba(16,185,129,0.10)', color: '#10b981' }}>
                94/100
              </span>
            </div>

            {/* Question Card 1 — main */}
            <div className="bg-violet-50/60 rounded-2xl p-4 border border-violet-100 mb-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(124,58,237,0.10)' }}>
                  <span className="material-symbols-outlined text-violet-600 text-base">chat_bubble</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 mb-1.5">Architectural Query</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    &ldquo;In <code className="text-violet-600 font-mono">src/auth/handler.ts</code>, why did you opt for an asymmetric JWT strategy instead of session-based storage?&rdquo;
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">Security</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">Architecture</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Card 2 */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-100 mb-2 hover:border-violet-100 hover:bg-violet-50/30 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,112,102,0.10)' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f97066" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-600">Code Refinement</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            {/* Question Card 3 */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-100 hover:border-violet-100 hover:bg-violet-50/30 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.10)' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 12 9 18 21 6" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-600">Git Workflow</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

          {/* Floating mini-card — score badge */}
          <div className="absolute -top-4 -right-6 bg-white rounded-2xl px-4 py-3 shadow-lg border border-gray-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Accuracy</p>
              <p className="text-sm font-extrabold text-slate-800">98.4%</p>
            </div>
          </div>

          {/* Floating mini-card — questions */}
          <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl px-4 py-3 shadow-lg border border-gray-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,112,102,0.10)' }}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f97066" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">Questions</p>
              <p className="text-sm font-extrabold text-slate-800">24 generated</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
