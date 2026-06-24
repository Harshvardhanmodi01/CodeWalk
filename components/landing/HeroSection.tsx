'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HeroSection() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [typedPlaceholder, setTypedPlaceholder] = useState('https://github.com/');
  const [isFocused, setIsFocused] = useState(false);

  // Typewriter animation simulation
  useEffect(() => {
    if (isFocused || inputValue) return; // Stop if user starts interacting

    const commands = [
      "facebook/react",
      "vercel/next.js",
      "openai/whisper",
      "tailwindlabs/tailwindcss"
    ];
    let cmdIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let timeoutId: NodeJS.Timeout;

    function type() {
      const currentCmd = commands[cmdIdx];
      if (isDeleting) {
        setTypedPlaceholder("https://github.com/" + currentCmd.substring(0, charIdx - 1));
        charIdx--;
      } else {
        setTypedPlaceholder("https://github.com/" + currentCmd.substring(0, charIdx + 1));
        charIdx++;
      }

      let speed = isDeleting ? 40 : 80;

      if (!isDeleting && charIdx === currentCmd.length) {
        isDeleting = true;
        speed = 2000; // Pause at end of word
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        cmdIdx = (cmdIdx + 1) % commands.length;
        speed = 500; // Pause before starting next word
      }

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
    <main className="relative min-h-[85vh] pt-24 pb-12 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#dce4e5 1px, transparent 1px), linear-gradient(90deg, #dce4e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="container max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Panel: Recruiter manual review chaos */}
        <div className="hidden lg:flex lg:col-span-3 relative h-[500px] items-center justify-center">
          <div className="w-48 h-64 bg-white/5 border border-outline-variant p-4 shadow-xl text-[10px] text-on-surface-variant/50 font-code-sm rotate-[-12deg] absolute left-0 top-[40px]">
            <div className="w-full h-2 bg-error/20 mb-2"></div>
            <div className="w-full h-2 bg-error/20 mb-2"></div>
            <div className="w-3/4 h-2 bg-error/20 mb-4"></div>
            <div className="rounded-full border-4 border-error w-16 h-16 absolute top-12 left-12 opacity-40"></div>
            <p className="font-mono mt-2">function eval(code) &#123; <br/> &nbsp;&nbsp;// manual review... <br/> &nbsp;&nbsp;return ??? <br/>&#125;</p>
          </div>
          <div className="w-40 h-40 bg-tertiary-container/10 border border-tertiary-fixed/30 p-3 shadow-lg rotate-[8deg] absolute right-[20px] top-[100px]">
            <span className="text-[8px] text-tertiary-fixed font-bold block uppercase tracking-wider">RECRUITER NOTE:</span>
            <p className="text-[10px] text-tertiary-fixed/80 italic mt-2">"Does this candidate even know React? Code looks messy."</p>
          </div>
          <div className="w-56 h-72 bg-white/5 border border-outline-variant p-4 shadow-xl text-[10px] text-on-surface-variant/30 font-code-sm rotate-[-3deg] absolute left-[40px] bottom-[20px]">
            <div className="w-full h-2 bg-on-surface/10 mb-2"></div>
            <div className="w-1/2 h-2 bg-on-surface/10 mb-2"></div>
            <div className="border-2 border-dashed border-error/50 p-2 mt-4 text-center text-error font-bold font-mono">LEAKY ABSTRACTION?</div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent z-10 pointer-events-none"></div>
        </div>

        {/* Center: Main CTA & Terminal */}
        <div className="lg:col-span-6 flex flex-col items-center text-center space-y-12">
          <div className="space-y-4">
            <h1 className="font-headline-lg text-headline-lg lg:text-[64px] lg:leading-tight text-on-surface tracking-tight font-extrabold">
              Deep Technical <span className="text-primary-fixed">Intelligence</span>.
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mx-auto leading-relaxed">
              Stop guessing skills. CodeWalk analyzes repositories to generate precision interview questions and behavioral insights.
            </p>
          </div>

          {/* Terminal styled CTA Box */}
          <form onSubmit={handleSubmit} className="w-full max-w-xl group relative">
            <div className="bg-surface-container-lowest border border-outline-variant p-1 glow-cyan transition-all duration-500 group-hover:border-primary-fixed/50 rounded-lg">
              <div className="bg-surface-container-low border border-outline-variant flex items-center px-4 py-3 sm:py-4 space-x-3 terminal-shadow rounded">
                <span className="text-primary-fixed font-code-md text-code-md select-none font-mono">$</span>
                <div className="flex-1 text-left font-code-md text-code-md text-on-surface overflow-hidden whitespace-nowrap flex items-center font-mono">
                  <span>codewalk analyze&nbsp;</span>
                  {isFocused ? (
                    <input
                      type="text"
                      className="bg-transparent border-none focus:ring-0 p-0 text-primary-fixed w-full outline-none font-mono"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="https://github.com/username/repo"
                      onBlur={() => setIsFocused(false)}
                      autoFocus
                    />
                  ) : (
                    <span 
                      onClick={() => setIsFocused(true)}
                      className="text-primary-fixed-dim cursor-text select-none flex items-center w-full"
                    >
                      {inputValue || typedPlaceholder}
                      <span className="border-l-2 border-primary-fixed ml-0.5 cursor-blink h-5 align-middle"></span>
                    </span>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="bg-primary-fixed text-on-primary-fixed px-4 py-2 font-label-sm text-label-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shrink-0"
                >
                  ANALYZE
                  <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                </button>
              </div>
            </div>
          </form>

          {/* Social strip */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-on-surface-variant/60 font-label-sm text-label-sm uppercase tracking-widest pt-4">
            <span>Trusted by recruiters at</span>
            <div className="flex gap-6 items-center opacity-40 hover:opacity-75 transition-all">
              <span className="font-bold tracking-tight text-sm font-sans">META</span>
              <span className="font-bold tracking-tight text-sm font-sans">VERCEL</span>
              <span className="font-bold tracking-tight text-sm font-sans">STRIPE</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Clean Structured CodeWalk Output */}
        <div className="hidden lg:flex lg:col-span-3 flex-col space-y-4 h-[500px] overflow-hidden relative">
          <div className="bg-surface-container-high border border-outline-variant p-4 space-y-4 transform translate-y-8 w-full rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-primary-fixed font-bold tracking-widest">ANALYSIS COMPLETE</span>
              <span className="text-[10px] px-2 py-0.5 bg-secondary-container/20 border border-secondary-container/30 text-secondary rounded-full font-bold">Score: 94/100</span>
            </div>

            {/* Simulated Question Card */}
            <div className="bg-surface-container p-3 border border-outline-variant space-y-2 rounded">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed text-sm">chat_bubble</span>
                <p className="font-label-sm text-label-sm text-on-surface font-bold">Architectural Query</p>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed font-body-md">
                "In <code className="text-primary-fixed-dim font-mono">src/auth/handler.ts</code>, why did you opt for an asymmetric JWT strategy instead of session-based storage?"
              </p>
              <div className="flex gap-2">
                <span className="text-[9px] px-1.5 py-0.5 bg-surface-container-highest border border-outline-variant text-on-surface-variant font-mono">Security</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-surface-container-highest border border-outline-variant text-on-surface-variant font-mono">Architecture</span>
              </div>
            </div>

            {/* Question 2 */}
            <div className="bg-surface-container p-3 border border-outline-variant space-y-2 opacity-60 rounded">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed text-sm">code</span>
                <p className="font-label-sm text-label-sm text-on-surface font-bold">Code Refinement</p>
              </div>
              <div className="bg-surface-container-lowest p-2 border border-outline-variant rounded font-code-sm text-[10px] font-mono">
                <span className="text-secondary">const</span> result = <span className="text-primary-fixed">await</span> db.query(...)
              </div>
            </div>

            {/* Question 3 */}
            <div className="bg-surface-container p-3 border border-outline-variant space-y-2 opacity-30 rounded">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed text-sm">history</span>
                <p className="font-label-sm text-label-sm text-on-surface font-bold">Git Workflow</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none"></div>
        </div>

      </div>
    </main>
  );
}
