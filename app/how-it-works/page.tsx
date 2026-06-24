'use client';

import React from 'react';
import BeforeAfterSection from '@/components/landing/BeforeAfterSection';

export default function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-16 py-12 glow-effect">
      {/* Page Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto px-4 sm:px-0">
        <span className="px-3 py-1 bg-primary-fixed/10 border border-primary-fixed/20 text-primary-fixed font-bold text-xs uppercase tracking-widest rounded-full">
          Product Walkthrough
        </span>
        <h1 className="font-headline-lg text-4xl text-on-surface font-extrabold tracking-tight">
          How CodeWalk Works
        </h1>
        <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
          From repository code indexing to precision interview questions and automated candidate scorecard evaluations.
        </p>
      </div>

      {/* Step by Step Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative px-4 sm:px-0">
        {/* Step 1 */}
        <div className="bg-surface-container border border-outline-variant p-8 rounded-2xl flex flex-col gap-5 hover:border-primary-fixed/30 transition-all relative">
          <span className="text-5xl font-mono font-extrabold text-primary-fixed/10 select-none absolute right-6 top-6">01</span>
          <div className="w-12 h-12 bg-primary-container/10 border border-primary-fixed/20 flex items-center justify-center text-primary-fixed rounded-xl">
            <span className="material-symbols-outlined text-2xl">link</span>
          </div>
          <div>
            <h4 className="text-lg font-bold text-on-surface">Paste Repository URL</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
              Drop any public or private GitHub, GitLab, or Bitbucket repository link into our interactive command terminal interface.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-surface-container border border-outline-variant p-8 rounded-2xl flex flex-col gap-5 hover:border-primary-fixed/30 transition-all relative">
          <span className="text-5xl font-mono font-extrabold text-primary-fixed/10 select-none absolute right-6 top-6">02</span>
          <div className="w-12 h-12 bg-primary-container/10 border border-primary-fixed/20 flex items-center justify-center text-primary-fixed rounded-xl">
            <span className="material-symbols-outlined text-2xl">database</span>
          </div>
          <div>
            <h4 className="text-lg font-bold text-on-surface">AST Graph Indexing</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
              Our backend parsing system analyzes codebase ASTs, checks files imports, and maps structural data junctions under a minute.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-surface-container border border-outline-variant p-8 rounded-2xl flex flex-col gap-5 hover:border-primary-fixed/30 transition-all relative">
          <span className="text-5xl font-mono font-extrabold text-primary-fixed/10 select-none absolute right-6 top-6">03</span>
          <div className="w-12 h-12 bg-primary-container/10 border border-primary-fixed/20 flex items-center justify-center text-primary-fixed rounded-xl">
            <span className="material-symbols-outlined text-2xl">slideshow</span>
          </div>
          <div>
            <h4 className="text-lg font-bold text-on-surface">Interactive Slides</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
              Walk through files slide-by-slide, rate candidate responses, read evaluator rubrics, and download technical scorecards.
            </p>
          </div>
        </div>
      </div>

      {/* Before / After Interactive Mockup */}
      <div className="mt-8 px-4 sm:px-0">
        <div className="text-center space-y-2 mb-10">
          <h3 className="text-xl font-bold text-on-surface">Visual Code Assessment</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">Compare the manual reviewer chaos to the precision of CodeWalk scorecard walks.</p>
        </div>
        <BeforeAfterSection />
      </div>
    </div>
  );
}
