'use client';

import React, { useState } from 'react';
import { useGlobal } from '@/app/context/GlobalContext';

export default function UsageChart() {
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const { user, tokenStats } = useGlobal();

  const todayPercentage = user && tokenStats.limit > 0 ? Math.round((tokenStats.used / tokenStats.limit) * 100) : 0;

  const days = [
    { label: 'Mon', height: user ? '45%' : '0%', tokens: user ? '45,000' : '0', active: false },
    { label: 'Tue', height: user ? '60%' : '0%', tokens: user ? '60,000' : '0', active: false },
    { label: 'Wed', height: user ? '85%' : '0%', tokens: user ? '85,000' : '0', active: false },
    { label: 'Thu', height: user ? '40%' : '0%', tokens: user ? '40,000' : '0', active: false },
    { label: 'Fri', height: user ? '95%' : '0%', tokens: user ? '95,000' : '0', active: false },
    { label: 'Sat', height: user ? '55%' : '0%', tokens: user ? '55,000' : '0', active: false },
    { label: 'Today', height: `${todayPercentage}%`, tokens: user ? tokenStats.used.toLocaleString() : '0', active: true }
  ];

  return (
    <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden shadow-sm select-none">
      <div className="p-4 sm:p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-high/40">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">bar_chart</span>
          <h5 className="font-label-sm text-xs font-bold uppercase tracking-wider">Historical Consumption</h5>
        </div>
        <div className="flex bg-surface-container-highest p-0.5 rounded border border-outline-variant/30 text-xs">
          <button 
            type="button"
            onClick={() => setRange('7d')}
            className={`px-3 py-1 font-bold rounded ${range === '7d' ? 'bg-surface-container-low text-primary-fixed border border-outline-variant/40' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            7d
          </button>
          <button 
            type="button"
            onClick={() => setRange('30d')}
            className={`px-3 py-1 font-bold rounded ${range === '30d' ? 'bg-surface-container-low text-primary-fixed border border-outline-variant/40' : 'text-on-surface-variant hover:text-on-surface'}`}
          >
            30d
          </button>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="p-6 sm:p-8 h-64 flex items-end justify-between gap-2 sm:gap-4 bg-surface-container-lowest/30">
        {days.map((day, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
            
            {/* Bar shape */}
            <div className="w-full bg-surface-container-highest/60 hover:bg-surface-container-highest h-[80%] relative rounded-t-sm transition-all duration-300">
              
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface-container-low border border-outline-variant/60 text-on-surface px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-bold">
                {day.tokens}
              </div>

              {/* Progress color fill */}
              <div 
                style={{ height: day.height }}
                className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-300 ${
                  day.active 
                    ? 'bg-tertiary-fixed glow-cyan' 
                    : 'bg-primary/40 group-hover:bg-primary/60'
                }`}
              ></div>
            </div>

            <span className={`font-code-sm text-[10px] font-mono ${day.active ? 'text-tertiary-fixed font-bold' : 'text-on-surface-variant/75'}`}>
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
