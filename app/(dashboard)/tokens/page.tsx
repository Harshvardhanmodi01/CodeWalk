'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SummaryCards from '@/components/tokens/SummaryCards';
import UsageChart from '@/components/tokens/UsageChart';
import TokenTable from '@/components/tokens/TokenTable';
import { useGlobal } from '@/app/context/GlobalContext';

export default function TokenUsageDashboard() {
  const router = useRouter();
  const { user, refreshUserData } = useGlobal();

  useEffect(() => {
    if (refreshUserData) {
      refreshUserData();
    }
  }, []);

  return (
    <div className="flex-grow flex flex-col bg-[#0d1515] overflow-hidden min-h-screen text-[#F1F5F9]">
      
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-3 bg-[#151d1e] w-full border-b border-[#3b494b] z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#06B6D4] text-xl">analytics</span>
          <h1 className="text-lg text-[#06B6D4] font-bold tracking-tight">Token Usage</h1>
        </div>
        <button 
          onClick={() => router.push('/tokens/history')}
          className="flex items-center gap-2 px-4 py-1.5 border border-[#3b494b] hover:border-[#06B6D4] hover:text-[#06B6D4] text-xs font-bold rounded-lg transition-all active:scale-95 text-[#94A3B8]"
        >
          <span className="material-symbols-outlined text-sm font-bold">history</span>
          <span>View Full Logs</span>
        </button>
      </header>

      {/* Usage Analytics Grid Workspace */}
      <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          
          {/* Section summary cards */}
          <SummaryCards />

          {/* Historical consumption chart */}
          <UsageChart />

          {/* Table list breakdown */}
          <TokenTable />

        </div>
      </div>
    </div>
  );
}
