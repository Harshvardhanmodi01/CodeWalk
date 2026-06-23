'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HistoryLog {
  timestamp: string;
  repo: string;
  prompt: number;
  completion: number;
  total: number;
  status: 'Success' | 'Failed';
  model: string;
}

export default function TokenHistoryLogPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Failed'>('All');
  const [logs, setLogs] = useState<HistoryLog[]>([]);

  useEffect(() => {
    // Load dynamic logs from localStorage
    const stored = localStorage.getItem('cw_analyses');
    const dynamicAnalyses = stored ? JSON.parse(stored) : [];

    const dynamicLogs: HistoryLog[] = dynamicAnalyses.map((item: any) => {
      let repoName = item.repo || '';
      if (repoName.startsWith('http')) {
        repoName = repoName.replace(/https?:\/\/(?:www\.)?github\.com\//, '');
      }

      const totalTokens = item.apiResult?.timing?.totalMs
        ? Math.floor(12000 + (item.apiResult.timing.totalMs / 10))
        : 15600;
      const promptTokens = Math.floor(totalTokens * 0.78);
      const completionTokens = totalTokens - promptTokens;

      const dateStr = item.createdAt || new Date().toLocaleDateString('en-US');

      let modelDisplay = item.model || 'llama-3.3-70b-versatile';
      if (modelDisplay === 'llama-3.3-70b-versatile') modelDisplay = 'llama-3.3-70b';
      else if (modelDisplay === 'llama-3.1-8b-instant') modelDisplay = 'llama-3.1-8b';
      else if (modelDisplay === 'mixtral-8x7b-32768') modelDisplay = 'mixtral-8x7b';
      else if (modelDisplay === 'gpt-4o') modelDisplay = 'GPT-4o';
      else if (modelDisplay === 'claude-3.5-sonnet') modelDisplay = 'Claude 3.5';

      return {
        timestamp: `${dateStr} 12:00:00`,
        repo: repoName,
        prompt: promptTokens,
        completion: completionTokens,
        total: totalTokens,
        status: 'Success',
        model: modelDisplay,
      };
    });

    const staticLogs: HistoryLog[] = [
      { timestamp: '2026-06-15 14:22:08', repo: 'codewalk-ui-engine', prompt: 12402, completion: 4102, total: 16504, status: 'Success', model: 'GPT-4o' },
      { timestamp: '2026-06-15 13:05:41', repo: 'infra-monitoring-api', prompt: 45110, completion: 8200, total: 53310, status: 'Success', model: 'Claude 3.5' },
      { timestamp: '2026-06-15 12:45:12', repo: 'legacy-data-transformer', prompt: 112045, completion: 0, total: 112045, status: 'Failed', model: 'GPT-4' },
      { timestamp: '2026-06-15 11:10:04', repo: 'auth-gateway-service', prompt: 2400, completion: 512, total: 2912, status: 'Success', model: 'GPT-4o' },
      { timestamp: '2026-06-15 09:44:23', repo: 'ml-training-pipeline', prompt: 88100, completion: 12400, total: 100500, status: 'Success', model: 'Claude 3.5' },
      { timestamp: '2026-06-14 23:59:11', repo: 'internal-docs-crawler', prompt: 5200, completion: 1200, total: 6400, status: 'Success', model: 'GPT-3.5' },
      { timestamp: '2026-06-14 22:15:33', repo: 'user-dashboard-next', prompt: 32450, completion: 4110, total: 36560, status: 'Success', model: 'GPT-4o' }
    ];

    setLogs([...dynamicLogs, ...staticLogs]);
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.repo.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    alert('Exporting token history log as CSV file...');
  };

  return (
    <div className="flex-grow flex flex-col bg-surface overflow-hidden min-h-screen">
      
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 h-16 w-full border-b border-outline-variant bg-surface sticky top-0 z-40 select-none">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/tokens')}
            className="text-on-surface-variant hover:text-primary-fixed p-1 rounded hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-lg font-bold">arrow_back</span>
          </button>
          <h2 className="font-headline-md text-lg font-bold text-primary">Token History</h2>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-code-sm text-[10px] uppercase tracking-widest border border-outline-variant font-mono">
            Live Logs
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant text-primary font-label-sm text-xs rounded hover:bg-surface-container-highest transition-colors font-bold uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>Export as CSV</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Scroll area */}
      <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
          
          {/* Summary Row Bento Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
            {/* Card 1 */}
            <div className="bg-surface-container p-6 border border-outline-variant rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-5xl">token</span>
              </div>
              <p className="font-label-sm text-xs text-on-surface-variant mb-1 font-bold">Total Tokens (June)</p>
              <div className="flex items-baseline gap-2">
                <h3 className="font-headline-lg text-2xl font-extrabold text-primary">1.24M</h3>
                <span className="text-[10px] text-primary-fixed/70 font-code-sm font-mono font-bold">+12% vs May</span>
              </div>
              <div className="mt-4 h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary-fixed-dim w-[65%]" style={{ boxShadow: '0 0 8px rgba(0, 219, 233, 0.4)' }}></div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-container p-6 border border-outline-variant rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-5xl">query_stats</span>
              </div>
              <p className="font-label-sm text-xs text-on-surface-variant mb-1 font-bold">Avg. Tokens / Analysis</p>
              <div className="flex items-baseline gap-2">
                <h3 className="font-headline-lg text-2xl font-extrabold text-secondary">42.8k</h3>
                <span className="text-[10px] text-secondary/60 font-code-sm font-mono font-bold">Stable</span>
              </div>
              <div className="mt-4 h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[45%]" style={{ boxShadow: '0 0 8px rgba(224, 182, 255, 0.4)' }}></div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container p-6 border border-outline-variant rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-5xl">speed</span>
              </div>
              <p className="font-label-sm text-xs text-on-surface-variant mb-1 font-bold">Max Single Analysis</p>
              <div className="flex items-baseline gap-2">
                <h3 className="font-headline-lg text-2xl font-extrabold text-tertiary-fixed-dim">128.4k</h3>
                <span className="text-[10px] text-tertiary-fixed-dim/70 font-code-sm font-mono font-bold">"codegen-infra"</span>
              </div>
              <div className="mt-4 h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-tertiary-fixed-dim w-[85%]" style={{ boxShadow: '0 0 8px rgba(234, 195, 36, 0.4)' }}></div>
              </div>
            </div>
          </section>

          {/* Filter Controller */}
          <section className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-outline-variant flex flex-col md:flex-row gap-4 justify-between items-center bg-surface-container-high/40 select-none">
              
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant/60 text-base">search</span>
                <input 
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-10 py-2 font-code-sm text-xs font-mono focus:outline-none focus:border-primary-fixed text-on-surface"
                  placeholder="Search repository..."
                />
              </div>

              {/* Status and Dates */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative shrink-0">
                  <select 
                    className="bg-surface-container-lowest border border-outline-variant rounded pl-3 pr-10 py-2 font-label-sm text-xs focus:outline-none hover:bg-surface-container-high transition-colors text-on-surface cursor-pointer select-none font-bold appearance-none"
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">Status: All</option>
                    <option value="Success">Status: Success</option>
                    <option value="Failed">Status: Failed</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-on-surface-variant pointer-events-none text-sm select-none">
                    expand_more
                  </span>
                </div>

                <div className="relative shrink-0">
                  <select className="bg-surface-container-lowest border border-outline-variant rounded pl-3 pr-10 py-2 font-label-sm text-xs focus:outline-none hover:bg-surface-container-high transition-colors text-on-surface cursor-pointer select-none font-bold appearance-none">
                    <option>Last 30 Days</option>
                    <option>Last 7 Days</option>
                    <option>Last 24 Hours</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-on-surface-variant pointer-events-none text-sm select-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Logs Datagrid Table */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-surface-container-high/40 select-none border-b border-outline-variant/30 text-[10px] text-on-surface-variant uppercase font-bold">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Repository Name</th>
                    <th className="py-4 px-6 text-right">Prompt</th>
                    <th className="py-4 px-6 text-right">Completion</th>
                    <th className="py-4 px-6 text-right">Total Tokens</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6">Model</th>
                  </tr>
                </thead>
                <tbody className="font-code-sm text-xs font-mono divide-y divide-outline-variant/20 text-on-surface-variant/90">
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="py-4 px-6 text-on-surface-variant/70">{log.timestamp}</td>
                      <td className="py-4 px-6 text-primary-fixed font-bold">{log.repo}</td>
                      <td className="py-4 px-6 text-right">{log.prompt.toLocaleString()}</td>
                      <td className="py-4 px-6 text-right">{log.completion.toLocaleString()}</td>
                      <td className={`py-4 px-6 text-right font-bold ${log.status === 'Failed' ? 'text-error' : 'text-primary-fixed-dim'}`}>
                        {log.total.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          log.status === 'Success' 
                            ? 'bg-primary-container/10 text-primary-container border-primary-container/20' 
                            : 'bg-error/10 text-error border-error/20'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant/70">{log.model}</td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-xs text-on-surface-variant">
                        No logging entries match your filtering parameters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-outline-variant/30 flex items-center justify-between bg-surface-container-high/10 select-none text-[10px] sm:text-xs">
              <p className="font-label-sm text-on-surface-variant">
                Showing 1 to {filteredLogs.length} of {filteredLogs.length} entries
              </p>
              <div className="flex items-center gap-2">
                <button className="p-1 rounded hover:bg-surface-container-highest transition-colors border border-outline-variant">
                  <span className="material-symbols-outlined text-sm font-bold">chevron_left</span>
                </button>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <button className="w-8 h-8 rounded bg-primary-container text-on-primary-container font-bold">1</button>
                  <button className="w-8 h-8 rounded hover:bg-surface-container-highest">2</button>
                  <button className="w-8 h-8 rounded hover:bg-surface-container-highest">3</button>
                  <span className="px-1 text-on-surface-variant">...</span>
                  <button className="w-8 h-8 rounded hover:bg-surface-container-highest">69</button>
                </div>
                <button className="p-1 rounded hover:bg-surface-container-highest transition-colors border border-outline-variant">
                  <span className="material-symbols-outlined text-sm font-bold">chevron_right</span>
                </button>
              </div>
            </div>

          </section>

        </div>
      </div>
    </div>
  );
}
