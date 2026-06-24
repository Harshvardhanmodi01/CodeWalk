'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SummaryCards from '@/components/tokens/SummaryCards';
import UsageChart from '@/components/tokens/UsageChart';
import TokenTable from '@/components/tokens/TokenTable';
import { useGlobal } from '@/app/context/GlobalContext';

export default function TokenUsageDashboard() {
  const router = useRouter();
  const { user } = useGlobal();

  useEffect(() => {
    // Re-fetch or sync state when auth changes
    console.log('TokenUsageDashboard: auth session changed, user =', user?.email || 'guest');
  }, [user]);

  return (
    <div className="flex-grow flex flex-col bg-surface overflow-hidden min-h-screen">
      
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-3 bg-surface-container-low w-full border-b border-outline-variant z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed text-xl">analytics</span>
          <h1 className="font-headline-md text-lg text-primary-fixed font-bold tracking-tight">Token Usage</h1>
        </div>
        <button 
          onClick={() => router.push('/tokens/history')}
          className="flex items-center gap-2 px-4 py-1.5 border border-outline-variant hover:border-primary-fixed hover:text-primary-fixed text-xs font-bold rounded-lg transition-all active:scale-95"
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
