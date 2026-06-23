'use client';

import React from 'react';

export default function BeforeAfterSection() {
  return (
    <section id="how-it-works" className="max-w-5xl mx-auto w-full bg-surface-container border border-outline-variant rounded-2xl overflow-hidden shadow-2xl p-6 relative z-10">
      <div className="flex items-center gap-2 pb-4 border-b border-outline-variant mb-6">
        <span className="w-3 h-3 rounded-full bg-error/60" />
        <span className="w-3 h-3 rounded-full bg-tertiary-container/60" />
        <span className="w-3 h-3 rounded-full bg-primary-fixed/60" />
        <span className="ml-4 text-xs font-mono text-on-surface-variant/50">https://codewalk.io/demo-walkthrough</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column - Chaos manual interview prep */}
        <div className="lg:col-span-5 border-r border-outline-variant/30 pr-0 lg:pr-8 flex flex-col gap-6">
          <div>
            <span className="px-2.5 py-0.5 rounded text-[10px] bg-error/10 border border-error/20 text-error font-bold uppercase tracking-wide">
              Old Manual Way
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mt-2">
              Hours of chaotic code reviews
            </h3>
            <p className="font-body-md text-sm text-on-surface-variant mt-1 leading-relaxed">
              Manually inspecting codebases, scouring stack commits, drafting questions, and guessing candidate depth.
            </p>
          </div>

          <div className="space-y-3 bg-surface-container-low p-4 border border-outline-variant/60 rounded-lg">
            <div className="flex items-center gap-2 text-error/80 text-xs">
              <span className="material-symbols-outlined text-sm">dangerous</span>
              <span className="font-bold">Manual Prep Checklist:</span>
            </div>
            <ul className="text-xs text-on-surface-variant/80 space-y-2 list-inside list-disc">
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
              <span className="px-2.5 py-0.5 rounded text-[10px] bg-primary-fixed/10 border border-primary-fixed/20 text-primary-fixed font-bold uppercase tracking-wide">
                CodeWalk Way
              </span>
              <h3 className="font-headline-md text-headline-md text-primary-fixed font-bold mt-2">
                Precision technical scorecard
              </h3>
            </div>
            <span className="text-xs font-bold text-on-surface-variant">Question 1 of 4</span>
          </div>

          <p className="text-sm font-semibold text-on-surface">
            What performance bottleneck does the <code className="bg-surface-container-highest px-1.5 py-0.5 rounded font-mono text-primary-fixed">useMemo</code> dependency check on Line 14 address?
          </p>

          {/* Interactive code walkthrough card */}
          <div className="rounded-xl overflow-hidden border border-outline-variant font-mono text-[12px] bg-surface-container-lowest text-on-surface-variant shadow-inner">
            <div className="flex bg-surface-container-high px-4 py-2 border-b border-outline-variant justify-between items-center">
              <span className="text-xs text-on-surface-variant/60">src/components/DataGrid.tsx</span>
              <span className="h-2 w-2 rounded-full bg-primary-fixed-dim" />
            </div>
            <div className="p-4 leading-6 font-mono text-xs">
              <div><span className="text-on-surface-variant/30 mr-4">12</span>export function DataGrid(&#123; items, query &#125;) &#123;</div>
              <div><span className="text-on-surface-variant/30 mr-4">13</span>  // Compute expensive search filtering</div>
              <div className="bg-primary-fixed/10 border-l-2 border-primary-fixed"><span className="text-primary-fixed mr-4 select-none">&rarr; 14</span>  const filtered = useMemo(() =&gt; filter(items, query), [items, query]);</div>
              <div><span className="text-on-surface-variant/30 mr-4">15</span>  return &lt;div&gt;&#123;filtered.map(i =&gt; &lt;span&gt;&#123;i&#125;&lt;/span&gt;)&#125;&lt;/div&gt;;</div>
              <div><span className="text-on-surface-variant/30 mr-4">16</span>&#125;</div>
            </div>
          </div>

          {/* Answer details card */}
          <div className="p-4 bg-surface-container-high border border-outline-variant rounded-xl text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface block mb-1">Expected Answer:</span>
            It prevents recalculating the filtered items array on every render cycle unless the <code className="font-mono bg-surface-container-lowest px-1 py-0.5 rounded text-secondary">items</code> or <code className="font-mono bg-surface-container-lowest px-1 py-0.5 rounded text-secondary">query</code> parameters explicitly change.
          </div>
        </div>
      </div>
    </section>
  );
}
