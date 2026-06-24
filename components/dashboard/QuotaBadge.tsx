'use client';

import React, { useState, useEffect } from 'react';

export default function QuotaBadge() {
  const [analysesCount, setAnalysesCount] = useState(3);
  const [tokensUsed, setTokensUsed] = useState(45230);

  useEffect(() => {
    // Read state from localStorage if available, else initialize
    const storedQuota = localStorage.getItem('cw_quota_analyses');
    const storedTokens = localStorage.getItem('cw_quota_tokens');

    if (storedQuota) {
      setAnalysesCount(parseInt(storedQuota));
    } else {
      localStorage.setItem('cw_quota_analyses', '3');
    }

    if (storedTokens) {
      setTokensUsed(parseInt(storedTokens));
    } else {
      localStorage.setItem('cw_quota_tokens', '45230');
    }

    // Trigger update on state writes
    const handleStorageChange = () => {
      const q = localStorage.getItem('cw_quota_analyses');
      const t = localStorage.getItem('cw_quota_tokens');
      if (q) setAnalysesCount(parseInt(q));
      if (t) setTokensUsed(parseInt(t));
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event to update quota in single tab environments
    window.addEventListener('quotaUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('quotaUpdated', handleStorageChange);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Token Usage badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg">
        <span className="material-symbols-outlined text-sm text-tertiary-fixed">token</span>
        <span className="font-code-sm text-[11px] text-on-surface-variant">Tokens:</span>
        <span className="font-code-sm text-[11px] text-tertiary-fixed font-bold">
          {tokensUsed.toLocaleString()} / 100,000
        </span>
      </div>

      {/* Analyses cap badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg">
        <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Quota</span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed animate-pulse"></span>
        <span className="font-label-sm text-[11px] text-primary-fixed font-bold">
          {analysesCount}/5 analyses used
        </span>
      </div>
    </div>
  );
}
