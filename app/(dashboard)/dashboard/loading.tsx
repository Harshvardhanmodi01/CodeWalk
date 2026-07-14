'use client';

import React from 'react';

export default function DashboardLoadingBoundary() {
  return (
    <div className="flex-grow bg-[#0d1515] min-h-screen flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="material-symbols-outlined text-4xl text-[#06B6D4] animate-spin">
          sync
        </span>
        <p className="text-xs text-[#b9cacb] font-mono animate-pulse">
          Loading workspace...
        </p>
      </div>
    </div>
  );
}
