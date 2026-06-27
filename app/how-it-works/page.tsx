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

      {/* Video Walkthrough Placeholder */}
      <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-0 mt-8">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider block">Interactive Walkthrough</span>
          <h3 className="text-2xl font-extrabold text-on-surface tracking-tight">Product Walkthrough Video</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">
            Watch our 2-minute product video to see CodeWalk in action.
          </p>
        </div>

        <div className="relative rounded-3xl overflow-hidden border border-[#3b494b] bg-[#151d1e] p-4 shadow-2xl glow-cyan group">
          <div className="aspect-video w-full rounded-2xl bg-[#0d1515] border border-[#3b494b] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#06B6D4]/5 to-transparent opacity-60 pointer-events-none" />
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Play Button */}
            <div className="z-10 w-20 h-20 rounded-full bg-[#06B6D4]/10 border border-[#06B6D4]/40 flex items-center justify-center text-[#06B6D4] group-hover:scale-110 group-hover:bg-[#06B6D4]/20 group-hover:border-[#06B6D4] transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <span className="material-symbols-outlined text-4xl select-none pl-1">play_arrow</span>
            </div>

            <div className="z-10 mt-6 text-center space-y-1">
              <p className="text-sm font-bold text-white tracking-wide">Video Walkthrough Placeholder</p>
              <p className="text-xs text-on-surface-variant font-mono">Future video element slot (replace with MP4 / YouTube embed)</p>
            </div>
            
            {/* High-tech HUD grid representation */}
            <div className="absolute inset-0 border border-[#06B6D4]/5 m-4 rounded-xl pointer-events-none flex items-end justify-between p-3">
              <span className="text-[9px] font-mono text-[#06B6D4]/40">SYS.WALK_ACTIVE: TRUE</span>
              <span className="text-[9px] font-mono text-[#06B6D4]/40">00:00 / 02:30</span>
            </div>
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
