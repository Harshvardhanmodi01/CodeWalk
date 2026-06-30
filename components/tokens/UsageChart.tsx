'use client';

import React, { useState } from 'react';
import { useGlobal } from '@/app/context/GlobalContext';

export default function UsageChart() {
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const { user } = useGlobal();

  const tokensUsed = user?.tokensUsed ?? 0;
  const limit = user?.tokensTotal ?? 5;
  const todayPercentage = limit > 0 ? Math.round((tokensUsed / limit) * 100) : 0;

  const days = [
    { label: 'Mon', height: user ? '45%' : '0%', tokens: user ? '2 sessions' : '0', active: false },
    { label: 'Tue', height: user ? '60%' : '0%', tokens: user ? '3 sessions' : '0', active: false },
    { label: 'Wed', height: user ? '20%' : '0%', tokens: user ? '1 session' : '0', active: false },
    { label: 'Thu', height: user ? '40%' : '0%', tokens: user ? '2 sessions' : '0', active: false },
    { label: 'Fri', height: user ? '80%' : '0%', tokens: user ? '4 sessions' : '0', active: false },
    { label: 'Sat', height: user ? '0%' : '0%', tokens: user ? '0 sessions' : '0', active: false },
    { label: 'Today', height: `${todayPercentage}%`, tokens: user ? `${tokensUsed} sessions` : '0', active: true }
  ];

  return (
    <div className="bg-[#151d1e] border border-[#3b494b] rounded-lg overflow-hidden shadow-sm select-none">
      <div className="p-4 sm:p-6 border-b border-[#3b494b] flex justify-between items-center bg-[#151d1e]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#06B6D4] text-xl">bar_chart</span>
          <h5 className="text-xs font-bold uppercase tracking-wider text-white">Historical Consumption</h5>
        </div>
        <div className="flex bg-[#0d1515] p-0.5 rounded border border-[#3b494b] text-xs">
          <button 
            type="button"
            onClick={() => setRange('7d')}
            className={`px-3 py-1 font-bold rounded ${range === '7d' ? 'bg-[#151d1e] text-[#06B6D4] border border-[#3b494b]' : 'text-[#94A3B8] hover:text-white'}`}
          >
            7d
          </button>
          <button 
            type="button"
            onClick={() => setRange('30d')}
            className={`px-3 py-1 font-bold rounded ${range === '30d' ? 'bg-[#151d1e] text-[#06B6D4] border border-[#3b494b]' : 'text-[#94A3B8] hover:text-white'}`}
          >
            30d
          </button>
        </div>
      </div>

      {/* Chart Grid */}
      <div className="p-6 sm:p-8 h-64 flex items-end justify-between gap-2 sm:gap-4 bg-[#0d1515]/20">
        {days.map((day, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
            
            {/* Bar shape */}
            <div className="w-full bg-[#0d1515] hover:bg-[#0d1515]/80 h-[80%] relative rounded-t-sm transition-all duration-300 border border-[#3b494b]/30">
              
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#151d1e] border border-[#3b494b] text-white px-2 py-1 rounded text-[9px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-bold">
                {day.tokens}
              </div>

              {/* Progress color fill */}
              <div 
                style={{ height: day.height }}
                className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-300 ${
                  day.active 
                    ? 'bg-[#06B6D4] shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                    : 'bg-[#06B6D4]/30 group-hover:bg-[#06B6D4]/50'
                }`}
              ></div>
            </div>

            <span className={`text-[10px] font-mono ${day.active ? 'text-[#06B6D4] font-bold' : 'text-[#94A3B8]'}`}>
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
