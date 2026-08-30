'use client';

import React from 'react';
import BeforeAfterSection from '@/components/landing/BeforeAfterSection';

export default function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-16 py-12 glow-effect transition-colors duration-300">
      {/* Page Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto px-4 sm:px-0">
        <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-widest rounded-full transition-colors duration-300">
          Product Walkthrough
        </span>
        <h1 className="font-headline-lg text-4xl text-foreground font-extrabold tracking-tight transition-colors duration-300">
          How CodeWalk Works
        </h1>
        <p className="font-body-md text-sm text-muted-text leading-relaxed transition-colors duration-300">
          From repository code indexing to precision interview questions and automated candidate scorecard evaluations.
        </p>
      </div>

      {/* Step by Step Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative px-4 sm:px-0">
        {/* Step 1 */}
        <div className="bg-card-main border border-border-main p-8 rounded-2xl flex flex-col gap-5 hover:border-primary/30 transition-all relative">
          <span className="text-5xl font-mono font-extrabold text-primary/10 select-none absolute right-6 top-6 transition-colors duration-300">01</span>
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary rounded-xl transition-colors duration-300">
            <span className="material-symbols-outlined text-2xl">link</span>
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground transition-colors duration-300">Paste Repository URL</h4>
            <p className="text-xs text-muted-text leading-relaxed mt-2 transition-colors duration-300">
              Drop any public or private GitHub, GitLab, or Bitbucket repository link into our interactive command terminal interface.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-card-main border border-border-main p-8 rounded-2xl flex flex-col gap-5 hover:border-primary/30 transition-all relative">
          <span className="text-5xl font-mono font-extrabold text-primary/10 select-none absolute right-6 top-6 transition-colors duration-300">02</span>
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary rounded-xl transition-colors duration-300">
            <span className="material-symbols-outlined text-2xl">database</span>
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground transition-colors duration-300">AST Graph Indexing</h4>
            <p className="text-xs text-muted-text leading-relaxed mt-2 transition-colors duration-300">
              Our backend parsing system analyzes codebase ASTs, checks files imports, and maps structural data junctions under a minute.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-card-main border border-border-main p-8 rounded-2xl flex flex-col gap-5 hover:border-primary/30 transition-all relative">
          <span className="text-5xl font-mono font-extrabold text-primary/10 select-none absolute right-6 top-6 transition-colors duration-300">03</span>
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary rounded-xl transition-colors duration-300">
            <span className="material-symbols-outlined text-2xl">slideshow</span>
          </div>
          <div>
            <h4 className="text-lg font-bold text-foreground transition-colors duration-300">Interactive Slides</h4>
            <p className="text-xs text-muted-text leading-relaxed mt-2 transition-colors duration-300">
              Walk through files slide-by-slide, rate candidate responses, read evaluator rubrics, and download technical scorecards.
            </p>
          </div>
        </div>
      </div>

      {/* Video Walkthrough Placeholder */}
      <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-0 mt-8">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block transition-colors duration-300">Interactive Walkthrough</span>
          <h3 className="text-2xl font-extrabold text-foreground tracking-tight transition-colors duration-300">Product Walkthrough Video</h3>
          <p className="text-xs text-muted-text max-w-md mx-auto transition-colors duration-300">
            Watch our 2-minute product video to see CodeWalk in action.
          </p>
        </div>

        <div className="relative rounded-3xl overflow-hidden border border-border-main bg-card-main p-4 shadow-2xl glow-cyan group transition-colors duration-300">
          <div className="aspect-video w-full rounded-2xl bg-muted-background border border-border-main flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300">
            {/* Ambient background glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-60 pointer-events-none transition-colors duration-300" />
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none transition-colors duration-300" />
            
            {/* Play Button */}
            <div className="z-10 w-20 h-20 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/20 group-hover:border-primary transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <span className="material-symbols-outlined text-4xl select-none pl-1">play_arrow</span>
            </div>

            <div className="z-10 mt-6 text-center space-y-1">
              <p className="text-sm font-bold text-foreground tracking-wide transition-colors duration-300">Video Walkthrough Placeholder</p>
              <p className="text-xs text-muted-text font-mono transition-colors duration-300">Future video element slot (replace with MP4 / YouTube embed)</p>
            </div>
            
            {/* High-tech HUD grid representation */}
            <div className="absolute inset-0 border border-primary/5 m-4 rounded-xl pointer-events-none flex items-end justify-between p-3 transition-colors duration-300">
              <span className="text-[9px] font-mono text-primary/40 transition-colors duration-300">SYS.WALK_ACTIVE: TRUE</span>
              <span className="text-[9px] font-mono text-primary/40 transition-colors duration-300">00:00 / 02:30</span>
            </div>
          </div>
        </div>
      </div>

      {/* Before / After Interactive Mockup */}
      <div className="mt-8 px-4 sm:px-0">
        <div className="text-center space-y-2 mb-10">
          <h3 className="text-xl font-bold text-foreground transition-colors duration-300">Visual Code Assessment</h3>
          <p className="text-xs text-muted-text max-w-md mx-auto transition-colors duration-300">Compare the manual reviewer chaos to the precision of CodeWalk scorecard walks.</p>
        </div>
        <BeforeAfterSection />
      </div>
    </div>
  );
}
