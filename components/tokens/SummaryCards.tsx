'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';

export default function SummaryCards() {
  const router = useRouter();
  const { user, tokenStats } = useGlobal();
  const tokensUsed = user ? tokenStats.used : 0;
  const limit = user ? tokenStats.limit : 50000;

  const percentage = limit > 0 ? Math.round((tokensUsed / limit) * 100) : 0;
  
  // SVG circular properties
  const radius = 80;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, percentage) / 100) * circumference;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      
      {/* Consumed Progress ring widget */}
      <div className="lg:col-span-2 bg-surface-container border border-outline-variant p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 rounded-lg shadow-sm">
        <div className="space-y-4 flex flex-col items-center md:items-start text-center md:text-left">
          <div>
            <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest font-bold block mb-1">
              Tokens Consumed Today
            </span>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <h3 className="font-headline-lg text-4xl sm:text-5xl font-extrabold text-tertiary-fixed token-glow font-mono">
                {tokensUsed.toLocaleString()}
              </h3>
              <span className="font-code-md text-xs text-on-surface-variant font-mono">/ {limit.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 pt-2 text-xs">
            <div className="flex flex-col">
              <span className="font-code-sm text-[10px] text-on-surface-variant font-mono">Reset In</span>
              <span className="font-label-sm text-primary-fixed font-bold uppercase mt-0.5">14h 22m 04s</span>
            </div>
            <div className="w-px h-8 bg-outline-variant/40"></div>
            <div className="flex flex-col">
              <span className="font-code-sm text-[10px] text-on-surface-variant font-mono">Avg. Daily</span>
              <span className="font-label-sm text-primary-fixed font-bold uppercase mt-0.5">54,200</span>
            </div>
          </div>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle 
              className="text-surface-container-highest" 
              cx="80" 
              cy="80" 
              fill="transparent" 
              r={radius} 
              stroke="currentColor" 
              strokeWidth="10"
            />
            <circle 
              className="text-tertiary-fixed-dim progress-ring__circle" 
              cx="80" 
              cy="80" 
              fill="transparent" 
              r={radius} 
              stroke="currentColor" 
              strokeWidth="10"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: strokeDashoffset }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-headline-md text-2xl font-bold text-tertiary-fixed">{percentage}%</span>
            <span className="text-[10px] font-label-sm text-on-surface-variant uppercase font-bold tracking-tighter">Cap used</span>
          </div>
        </div>
      </div>

      {/* Warning CTA Box */}
      <div className="bg-surface-container border border-outline-variant p-6 sm:p-8 flex flex-col justify-between rounded-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div>
            <h4 className="font-headline-md text-lg text-on-surface font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary-fixed animate-pulse">warning</span>
              Approaching Limit
            </h4>
            <p className="text-xs text-on-surface-variant/80 mt-2 leading-relaxed">
              You have consumed {percentage}% of your daily token limit. Upgrade to the Pro plan for prioritized assessment logic.
            </p>
          </div>
          <button 
            onClick={() => router.push('/pricing')}
            className="w-full py-2.5 bg-tertiary-fixed text-on-tertiary-fixed font-bold font-label-sm text-xs rounded hover:opacity-90 transition-all uppercase tracking-wider shadow-[0_0_12px_rgba(234,195,36,0.3)] active:scale-95"
          >
            View Pro Benefits
          </button>
        </div>
      </div>

    </div>
  );
}
