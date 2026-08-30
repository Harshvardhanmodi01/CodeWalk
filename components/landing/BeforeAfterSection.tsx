'use client';

import React from 'react';

export default function BeforeAfterSection() {
  return (
    <section id="how-it-works" className="max-w-5xl mx-auto w-full bg-card-main border border-border-main rounded-2xl overflow-hidden shadow-2xl p-6 relative z-10 transition-colors duration-300">
      <div className="flex items-center gap-2 pb-4 border-b border-border-main mb-6 transition-colors duration-300">
        <span className="w-3 h-3 rounded-full bg-red-500/60 transition-colors duration-300" />
        <span className="w-3 h-3 rounded-full bg-primary/40 transition-colors duration-300" />
        <span className="w-3 h-3 rounded-full bg-primary/60 transition-colors duration-300" />
        <span className="ml-4 text-xs font-mono text-muted-text/50 transition-colors duration-300">https://codewalk.io/demo-walkthrough</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column - Chaos manual interview prep */}
        <div className="lg:col-span-5 border-r border-border-main/30 pr-0 lg:pr-8 flex flex-col gap-6 transition-colors duration-300">
          <div>
            <span className="px-2.5 py-0.5 rounded text-[10px] bg-red-500/10 border border-red-500/20 text-red-500 font-bold uppercase tracking-wide transition-colors duration-300">
              Old Manual Way
            </span>
            <h3 className="font-headline-md text-headline-md text-foreground font-semibold mt-2 transition-colors duration-300">
              Hours of chaotic code reviews
            </h3>
            <p className="font-body-md text-sm text-muted-text mt-1 leading-relaxed transition-colors duration-300">
              Manually inspecting codebases, scouring stack commits, drafting questions, and guessing candidate depth.
            </p>
          </div>

          <div className="space-y-3 bg-muted-background p-4 border border-border-main/60 rounded-lg transition-colors duration-300">
            <div className="flex items-center gap-2 text-red-500/80 text-xs transition-colors duration-300">
              <span className="material-symbols-outlined text-sm">dangerous</span>
              <span className="font-bold">Manual Prep Checklist:</span>
            </div>
            <ul className="text-xs text-muted-text/80 space-y-2 list-inside list-disc transition-colors duration-300">
              <li>Review candidate's 4,000 line assignment repo</li>
              <li>Research obscure libraries they imported</li>
              <li>Draft questions to test if they actually wrote it</li>
              <li>Spend 45 minutes on Google finding React hook edge cases</li>
            </ul>
          </div>
        </div>

        {/* Right column - CodeWalk dynamic code workspace */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="px-2.5 py-0.5 rounded text-[10px] bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wide transition-colors duration-300">
                CodeWalk Way
              </span>
              <h3 className="font-headline-md text-headline-md text-primary font-bold mt-2 transition-colors duration-300">
                Precision technical scorecard
              </h3>
            </div>
            <span className="text-xs font-bold text-muted-text transition-colors duration-300">Question 1 of 4</span>
          </div>

          <p className="text-sm font-semibold text-foreground transition-colors duration-300">
            What performance bottleneck does the <code className="bg-muted-background px-1.5 py-0.5 rounded font-mono text-primary transition-colors duration-300">useMemo</code> dependency check on Line 14 address?
          </p>

          {/* Interactive code walkthrough card */}
          <div className="rounded-xl overflow-hidden border border-border-main font-mono text-[12px] bg-card-main text-muted-text shadow-inner transition-colors duration-300">
            <div className="flex bg-muted-background px-4 py-2 border-b border-border-main justify-between items-center transition-colors duration-300">
              <span className="text-xs text-muted-text/60 transition-colors duration-300">src/components/DataGrid.tsx</span>
              <span className="h-2 w-2 rounded-full bg-primary transition-colors duration-300" />
            </div>
            <div className="p-4 leading-6 font-mono text-xs">
              <div><span className="text-muted-text/30 mr-4 transition-colors duration-300">12</span>export function DataGrid(&#123; items, query &#125;) &#123;</div>
              <div><span className="text-muted-text/30 mr-4 transition-colors duration-300">13</span>  // Compute expensive search filtering</div>
              <div className="bg-primary/10 border-l-2 border-primary transition-colors duration-300"><span className="text-primary mr-4 select-none transition-colors duration-300">&rarr; 14</span>  const filtered = useMemo(() =&gt; filter(items, query), [items, query]);</div>
              <div><span className="text-muted-text/30 mr-4 transition-colors duration-300">15</span>  return &lt;div&gt;&#123;filtered.map(i =&gt; &lt;span&gt;&#123;i&#125;&lt;/span&gt;)&#125;&lt;/div&gt;;</div>
              <div><span className="text-muted-text/30 mr-4 transition-colors duration-300">16</span>&#125;</div>
            </div>
          </div>

          {/* Answer details card */}
          <div className="p-4 bg-muted-background border border-border-main rounded-xl text-xs text-muted-text transition-colors duration-300">
            <span className="font-bold text-foreground block mb-1 transition-colors duration-300">Expected Answer:</span>
            It prevents recalculating the filtered items array on every render cycle unless the <code className="font-mono bg-card-main px-1 py-0.5 rounded text-primary transition-colors duration-300">items</code> or <code className="font-mono bg-card-main px-1 py-0.5 rounded text-primary transition-colors duration-300">query</code> parameters explicitly change.
          </div>
        </div>
      </div>
    </section>
  );
}
