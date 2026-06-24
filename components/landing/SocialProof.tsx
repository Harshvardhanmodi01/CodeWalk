'use client';

import React from 'react';

export default function SocialProof() {
  return (
    <div className="w-full space-y-24 z-10 relative">
      {/* Features Bento */}
      <section className="py-12 bg-surface-container-low border-y border-outline-variant relative overflow-hidden rounded-xl">
        <div className="container max-w-container-max mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-surface-container border border-outline-variant space-y-4 hover:border-primary-fixed/30 transition-all rounded-lg">
            <div className="w-12 h-12 bg-primary-container/10 border border-primary-fixed/20 flex items-center justify-center text-primary-fixed rounded-lg">
              <span className="material-symbols-outlined text-2xl">terminal</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Deep Repo Crawl</h3>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              We don't just look at file names. We parse ASTs, inspect hooks lifecycle, parse schemas, and identify true architectural patterns.
            </p>
          </div>
          <div className="p-8 bg-surface-container border border-outline-variant space-y-4 hover:border-primary-fixed/30 transition-all rounded-lg">
            <div className="w-12 h-12 bg-primary-container/10 border border-primary-fixed/20 flex items-center justify-center text-primary-fixed rounded-lg">
              <span className="material-symbols-outlined text-2xl">psychology</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">AI Interviewer</h3>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              Generate line-level and codebase questions mapping directly to: Code Logic, Project Architecture, and real-world domain.
            </p>
          </div>
          <div className="p-8 bg-surface-container border border-outline-variant space-y-4 hover:border-primary-fixed/30 transition-all rounded-lg">
            <div className="w-12 h-12 bg-primary-container/10 border border-primary-fixed/20 flex items-center justify-center text-primary-fixed rounded-lg">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">Skill Verification</h3>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              Generate pdf scorecards, rate response categories, log interviewer remarks, and compile a clear technical capability index.
            </p>
          </div>
        </div>
      </section>

      {/* Feature matrix */}
      <section className="max-w-4xl mx-auto w-full px-margin-mobile">
        <h2 className="font-headline-md text-headline-md text-center text-on-surface font-bold mb-12">Feature Matrix</h2>
        <div className="overflow-x-auto rounded-lg border border-outline-variant">
          <table className="w-full border-collapse bg-surface-container text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-high">
                <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Capabilities</th>
                <th className="py-4 px-6 text-center font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Free</th>
                <th className="py-4 px-6 text-center font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider">Pro</th>
              </tr>
            </thead>
            <tbody className="font-code-sm text-xs font-mono text-on-surface-variant divide-y divide-outline-variant/30">
              <tr className="hover:bg-surface-container-low transition-colors">
                <td className="py-4 px-6 flex items-center gap-2">
                  <span className="text-primary-fixed">&gt;</span> AI Code Breakdown
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-primary-fixed">check</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-primary-fixed">check</span>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-low transition-colors">
                <td className="py-4 px-6">
                  <span className="text-primary-fixed">&gt;</span> Complexity Mapping
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant/40">remove</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-primary-fixed">check</span>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-low transition-colors">
                <td className="py-4 px-6">
                  <span className="text-primary-fixed">&gt;</span> Custom Rubrics
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant/40">remove</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-primary-fixed">check</span>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-low transition-colors">
                <td className="py-4 px-6">
                  <span className="text-primary-fixed">&gt;</span> API Integration
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-on-surface-variant/40">remove</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
