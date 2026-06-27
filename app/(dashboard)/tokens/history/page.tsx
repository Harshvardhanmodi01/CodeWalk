'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';

interface HistoryLog {
  timestamp: string;
  repo: string;
  candidateName: string;
  status: 'Success' | 'Failed' | 'Active';
  model: string;
}

export default function TokenHistoryLogPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Failed' | 'Active'>('All');
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useGlobal();

  useEffect(() => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const { data: dbSessions, error } = await supabase
          .from('sessions')
          .select(`
            id,
            repo_url,
            created_at,
            status,
            candidates (
              name
            )
          `)
          .eq('recruiter_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped: HistoryLog[] = (dbSessions || []).map((s: any) => {
          let repoName = s.repo_url || '';
          if (repoName.startsWith('http')) {
            repoName = repoName.replace(/https?:\/\/(?:www\.)?github\.com\//, '');
          }
          return {
            timestamp: new Date(s.created_at).toLocaleString(),
            repo: repoName,
            candidateName: s.candidates?.name || 'Unknown Candidate',
            status: s.status === 'completed' ? 'Success' : s.status === 'cancelled' ? 'Failed' : 'Active',
            model: 'llama-3.3-70b'
          };
        });

        setLogs(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.repo.toLowerCase().includes(search.toLowerCase()) || 
                          log.candidateName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    // Generate simple CSV content
    const headers = ['Timestamp', 'Repository', 'Candidate', 'Status', 'Model'];
    const rows = filteredLogs.map(l => [l.timestamp, l.repo, l.candidateName, l.status, l.model]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `codewalk_sessions_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-grow flex flex-col bg-[#0d1515] overflow-hidden min-h-screen text-[#F1F5F9]">
      
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 h-16 w-full border-b border-[#3b494b] bg-[#151d1e] sticky top-0 z-40 select-none">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/tokens')}
            className="text-[#94A3B8] hover:text-[#06B6D4] p-1 rounded hover:bg-[#0d1515] transition-colors"
          >
            <span className="material-symbols-outlined text-lg font-bold">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold text-[#06B6D4]">Session History Logs</h2>
          <span className="px-2 py-0.5 rounded-full bg-[#0d1515] text-[#94A3B8] text-[10px] uppercase tracking-widest border border-[#3b494b] font-mono">
            Live Logs
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#0d1515] border border-[#3b494b] text-[#06B6D4] hover:border-[#06B6D4]/40 hover:bg-[#0d1515]/80 text-xs rounded transition-colors font-bold uppercase tracking-wider"
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
            <div className="bg-[#151d1e] p-6 border border-[#3b494b] rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-5xl text-[#06B6D4]">token</span>
              </div>
              <p className="text-xs text-[#94A3B8] mb-1 font-bold">Total Screenings Limit</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-extrabold text-[#06B6D4]">{user?.tokensTotal || 5}</h3>
                <span className="text-[10px] text-[#94A3B8] font-mono font-bold">Quota Max</span>
              </div>
              <div className="mt-4 h-1 w-full bg-[#0d1515] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#06B6D4]" 
                  style={{ 
                    width: `${user?.tokensTotal ? Math.min(100, Math.round(((user?.tokensUsed || 0) / user.tokensTotal) * 100)) : 0}%`,
                    boxShadow: '0 0 8px rgba(6, 182, 212, 0.4)' 
                  }}
                ></div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#151d1e] p-6 border border-[#3b494b] rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-5xl text-emerald-400">query_stats</span>
              </div>
              <p className="text-xs text-[#94A3B8] mb-1 font-bold">Completed Screenings</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-extrabold text-emerald-400">
                  {logs.filter(l => l.status === 'Success').length}
                </h3>
                <span className="text-[10px] text-[#94A3B8] font-mono font-bold">Finished</span>
              </div>
              <div className="mt-4 h-1 w-full bg-[#0d1515] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ 
                    width: `${logs.length ? Math.round((logs.filter(l => l.status === 'Success').length / logs.length) * 100) : 0}%`,
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)' 
                  }}
                ></div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#151d1e] p-6 border border-[#3b494b] rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-5xl text-yellow-500">speed</span>
              </div>
              <p className="text-xs text-[#94A3B8] mb-1 font-bold">Active Screenings</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-extrabold text-yellow-500">
                  {logs.filter(l => l.status === 'Active').length}
                </h3>
                <span className="text-[10px] text-[#94A3B8] font-mono font-bold">In-Progress</span>
              </div>
              <div className="mt-4 h-1 w-full bg-[#0d1515] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500" 
                  style={{ 
                    width: `${logs.length ? Math.round((logs.filter(l => l.status === 'Active').length / logs.length) * 100) : 0}%`,
                    boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)' 
                  }}
                ></div>
              </div>
            </div>
          </section>

          {/* Filter Controller */}
          <section className="bg-[#151d1e] border border-[#3b494b] rounded-lg overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-[#3b494b] flex flex-col md:flex-row gap-4 justify-between items-center bg-[#151d1e]/80 select-none">
              
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <span className="material-symbols-outlined absolute left-3 top-2 text-[#94A3B8] text-base">search</span>
                <input 
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#0d1515] border border-[#3b494b] rounded px-10 py-1.5 font-mono text-xs focus:outline-none focus:border-[#06B6D4] text-white"
                  placeholder="Search repository or candidate..."
                />
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative shrink-0">
                  <select 
                    className="bg-[#0d1515] border border-[#3b494b] rounded pl-3 pr-10 py-1.5 text-xs focus:outline-none text-white cursor-pointer select-none font-bold appearance-none"
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">Status: All</option>
                    <option value="Success">Status: Completed</option>
                    <option value="Failed">Status: Cancelled</option>
                    <option value="Active">Status: Active</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 top-2 text-[#94A3B8] pointer-events-none text-sm select-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Logs Datagrid Table */}
            <div className="overflow-x-auto custom-scrollbar">
              {loading ? (
                <div className="text-center py-12 text-xs text-[#94A3B8]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#06B6D4] mx-auto mb-3"></div>
                  Loading logs...
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#0d1515]/40 select-none border-b border-[#3b494b]/50 text-[10px] text-[#94A3B8] uppercase font-bold">
                      <th className="py-4 px-6">Timestamp</th>
                      <th className="py-4 px-6">Repository Name</th>
                      <th className="py-4 px-6">Candidate</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6">Model</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs divide-y divide-[#3b494b]/20 text-[#94A3B8]">
                    {filteredLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-[#0d1515]/20 transition-colors">
                        <td className="py-4 px-6 text-[#94A3B8]/70">{log.timestamp}</td>
                        <td className="py-4 px-6 text-[#06B6D4] font-bold">{log.repo}</td>
                        <td className="py-4 px-6 text-white font-semibold font-sans">{log.candidateName}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            log.status === 'Success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            log.status === 'Failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/20'
                          }`}>
                            {log.status === 'Success' ? 'Completed' : log.status === 'Failed' ? 'Cancelled' : 'Active'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-[#94A3B8]/70">{log.model}</td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-xs text-[#94A3B8]">
                          No logging entries match your filtering parameters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-[#3b494b] flex items-center justify-between bg-[#151d1e] select-none text-[10px] sm:text-xs">
              <p className="text-[#94A3B8]">
                Showing 1 to {filteredLogs.length} of {filteredLogs.length} entries
              </p>
              <div className="flex items-center gap-2">
                <button className="p-1 rounded hover:bg-[#0d1515] transition-colors border border-[#3b494b] text-[#94A3B8]">
                  <span className="material-symbols-outlined text-sm font-bold">chevron_left</span>
                </button>
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  <button className="w-8 h-8 rounded bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30 font-bold">1</button>
                </div>
                <button className="p-1 rounded hover:bg-[#0d1515] transition-colors border border-[#3b494b] text-[#94A3B8]">
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
