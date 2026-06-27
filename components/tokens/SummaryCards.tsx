'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';

export default function SummaryCards() {
  const router = useRouter();
  const { user } = useGlobal();

  const tokensUsed = user?.tokensUsed ?? 0;
  const limit = user?.tokensTotal ?? 5;
  const plan = user?.plan || 'free';

  const percentage = limit > 0 ? Math.round((tokensUsed / limit) * 100) : 0;
  
  // SVG circular properties
  const radius = 60;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, percentage) / 100) * circumference;

  // Countdown timer to end of month
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const diffMs = nextMonth.getTime() - now.getTime();
      
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
      
      {/* Consumed Progress ring widget */}
      <div className="lg:col-span-2 bg-[#1E293B] border border-[#334155] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8 rounded-lg shadow-sm">
        <div className="space-y-4 flex flex-col items-center md:items-start text-center md:text-left">
          <div>
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block mb-1">
              Active Plan: <span className="text-[#06B6D4] capitalize">{plan}</span>
            </span>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <h3 className="text-4xl sm:text-5xl font-extrabold text-[#06B6D4] font-mono">
                {tokensUsed}
              </h3>
              <span className="text-xs text-[#94A3B8] font-mono">/ {limit} sessions used</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6 pt-2 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-[#94A3B8] font-mono">Reset Countdown</span>
              <span className="text-white font-bold uppercase mt-0.5">{timeLeft}</span>
            </div>
            <div className="w-px h-8 bg-[#334155]"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[#94A3B8] font-mono">Plan Tier</span>
              <span className="text-[#06B6D4] font-bold uppercase mt-0.5">{plan === 'pro' ? 'Professional' : plan === 'enterprise' ? 'Enterprise' : 'Basic Free'}</span>
            </div>
          </div>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle 
              className="text-[#0F172A]" 
              cx="72" 
              cy="72" 
              fill="transparent" 
              r={radius} 
              stroke="currentColor" 
              strokeWidth="8"
            />
            <circle 
              className="text-[#06B6D4]" 
              cx="72" 
              cy="72" 
              fill="transparent" 
              r={radius} 
              stroke="currentColor" 
              strokeWidth="8"
              strokeDasharray={circumference}
              style={{ strokeDashoffset: strokeDashoffset }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-bold text-white">{percentage}%</span>
            <span className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-tight">Cap used</span>
          </div>
        </div>
      </div>

      {/* Warning CTA Box */}
      <div className="bg-[#1E293B] border border-[#334155] p-6 sm:p-8 flex flex-col justify-between rounded-lg relative overflow-hidden text-[#F1F5F9]">
        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div>
            <h4 className="text-base text-white font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[#06B6D4] animate-pulse">warning</span>
              Quota Information
            </h4>
            <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">
              {percentage >= 100 
                ? "You have fully exhausted your screening sessions quota for this month. Upgrade to Pro for unlimited sessions."
                : `You have used ${percentage}% of your screening sessions. Upgrade to Pro for up to 50 sessions and advanced AI capabilities.`
              }
            </p>
          </div>
          <button 
            onClick={() => router.push('/pricing')}
            className="w-full py-2.5 bg-[#06B6D4] text-[#0F172A] font-bold text-xs rounded hover:brightness-110 transition-all uppercase tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95"
          >
            Upgrade Plan
          </button>
        </div>
      </div>

    </div>
  );
}
