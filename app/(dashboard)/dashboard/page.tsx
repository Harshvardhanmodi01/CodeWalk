'use client';

import React from 'react';
import GithubInput from '@/components/dashboard/GithubInput';
import RecentAnalyses from '@/components/dashboard/RecentAnalyses';
import QuotaBadge from '@/components/dashboard/QuotaBadge';

export default function DashboardPage() {
  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden min-h-screen">
      {/* Dashboard Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-3 bg-surface-container-low w-full border-b border-outline-variant z-10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed text-xl">terminal</span>
          <h1 className="font-headline-md text-lg text-primary-fixed font-bold tracking-tight select-none">
            CodeWalk
          </h1>
        </div>
        <QuotaBadge />
      </header>

      {/* Main Workspace Scroll Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]" 
          style={{ 
            backgroundImage: 'linear-gradient(#dce4e5 1px, transparent 1px), linear-gradient(90deg, #dce4e5 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }}
        ></div>

        <div className="relative z-10 max-w-4xl mx-auto px-8 py-12 space-y-12">
          {/* Welcome Header */}
          <div className="text-center space-y-3">
            <h2 className="font-headline-lg text-2xl text-on-surface font-extrabold">
              Initialize New Analysis
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant max-w-xl mx-auto leading-relaxed">
              Connect your repository to generate high-fidelity technical assessment questions tailored to the codebase's specific architecture and patterns.
            </p>
          </div>

          {/* GitHub Repository Input Form */}
          <GithubInput />

          {/* Core capability features list */}
          <div className="flex flex-wrap justify-center gap-8 opacity-60 py-2 select-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-fixed text-lg">check_circle</span>
              <span className="font-label-sm text-xs text-on-surface-variant">Deep AST Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-fixed text-lg">auto_awesome</span>
              <span className="font-label-sm text-xs text-on-surface-variant">AI Logic Check</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-fixed text-lg">shield</span>
              <span className="font-label-sm text-xs text-on-surface-variant">Anti-Cheat Safeguard</span>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-outline-variant/30" />

          {/* Recent Assessment Analyses History */}
          <RecentAnalyses />
        </div>
      </div>
    </div>
  );
}
