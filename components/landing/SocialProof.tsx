'use client';

import React from 'react';

export default function SocialProof() {
  return (
    <div className="w-full space-y-24 z-10 relative">
      {/* Features Bento */}
      <section className="py-12 bg-muted-background border-y border-border-main relative overflow-hidden rounded-xl transition-colors duration-300">
        <div className="container max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-card-main border border-border-main space-y-4 hover:border-primary/30 transition-all rounded-lg">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary rounded-lg transition-colors duration-300">
              <span className="material-symbols-outlined text-2xl">terminal</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-foreground font-semibold transition-colors duration-300">Deep Repo Crawl</h3>
            <p className="font-body-md text-sm text-muted-text leading-relaxed transition-colors duration-300">
              We don't just look at file names. We parse ASTs, inspect hooks lifecycle, parse schemas, and identify true architectural patterns.
            </p>
          </div>
          <div className="p-8 bg-card-main border border-border-main space-y-4 hover:border-primary/30 transition-all rounded-lg">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary rounded-lg transition-colors duration-300">
              <span className="material-symbols-outlined text-2xl">psychology</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-foreground font-semibold transition-colors duration-300">AI Interviewer</h3>
            <p className="font-body-md text-sm text-muted-text leading-relaxed transition-colors duration-300">
              Generate line-level and codebase questions mapping directly to: Code Logic, Project Architecture, and real-world domain.
            </p>
          </div>
          <div className="p-8 bg-card-main border border-border-main space-y-4 hover:border-primary/30 transition-all rounded-lg">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center text-primary rounded-lg transition-colors duration-300">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-foreground font-semibold transition-colors duration-300">Skill Verification</h3>
            <p className="font-body-md text-sm text-muted-text leading-relaxed transition-colors duration-300">
              Generate pdf scorecards, rate response categories, log interviewer remarks, and compile a clear technical capability index.
            </p>
          </div>
        </div>
      </section>

      {/* Feature matrix */}
      <section className="max-w-4xl mx-auto w-full px-margin-mobile">
        <h2 className="font-headline-md text-headline-md text-center text-foreground font-bold mb-12 transition-colors duration-300">Feature Matrix</h2>
        <div className="overflow-x-auto rounded-lg border border-border-main transition-colors duration-300">
          <table className="w-full border-collapse bg-card-main text-left transition-colors duration-300">
            <thead>
              <tr className="border-b border-border-main bg-muted-background transition-colors duration-300">
                <th className="py-4 px-6 font-label-sm text-label-sm text-muted-text uppercase tracking-wider">Capabilities</th>
                <th className="py-4 px-6 text-center font-label-sm text-label-sm text-muted-text uppercase tracking-wider">Free</th>
                <th className="py-4 px-6 text-center font-label-sm text-label-sm text-primary uppercase tracking-wider">Pro</th>
              </tr>
            </thead>
            <tbody className="font-code-sm text-xs font-mono text-muted-text divide-y divide-border-main/30 transition-colors duration-300">
              <tr className="hover:bg-muted-background transition-colors">
                <td className="py-4 px-6 flex items-center gap-2">
                  <span className="text-primary">&gt;</span> AI Code Breakdown
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-primary">check</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-primary">check</span>
                </td>
              </tr>
              <tr className="hover:bg-muted-background transition-colors">
                <td className="py-4 px-6">
                  <span className="text-primary">&gt;</span> Complexity Mapping
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-muted-text/40">remove</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-primary">check</span>
                </td>
              </tr>
              <tr className="hover:bg-muted-background transition-colors">
                <td className="py-4 px-6">
                  <span className="text-primary">&gt;</span> Custom Rubrics
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-muted-text/40">remove</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-primary">check</span>
                </td>
              </tr>
              <tr className="hover:bg-muted-background transition-colors">
                <td className="py-4 px-6">
                  <span className="text-primary">&gt;</span> API Integration
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-muted-text/40">remove</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
