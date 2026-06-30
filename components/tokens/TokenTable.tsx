'use client';

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';

interface TokenLog {
  repo: string;
  candidateName: string;
  date: string;
  status: string;
  tokens: number;
}

export default function TokenTable() {
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<TokenLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useGlobal();

  useEffect(() => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const fetchSessionHistory = async () => {
      try {
        setLoading(true);
        // Query sessions with candidate names
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

        const mappedLogs: TokenLog[] = (dbSessions || []).map((session: any) => {
          let repoName = session.repo_url || '';
          if (repoName.startsWith('http')) {
            repoName = repoName.replace(/https?:\/\/(?:www\.)?github\.com\//, '');
          }
          return {
            repo: repoName,
            candidateName: session.candidates?.name || 'Unknown Candidate',
            date: new Date(session.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }),
            status: session.status || 'active',
            tokens: 1 // 1 session token per interview
          };
        });

        setLogs(mappedLogs);
      } catch (err) {
        console.error('Failed to load session history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionHistory();
  }, [user]);

  const filteredLogs = logs.filter((log) => 
    log.repo.toLowerCase().includes(search.toLowerCase()) ||
    log.candidateName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[#151d1e] border border-[#3b494b] rounded-lg overflow-hidden shadow-sm">
      
      {/* Header controls */}
      <div className="p-4 sm:p-6 border-b border-[#3b494b] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#151d1e] select-none">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#06B6D4]">history</span>
          <h5 className="text-xs font-bold uppercase tracking-wider text-white">Session Consumption History</h5>
        </div>
        
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input 
            type="text"
            className="w-full bg-[#0d1515] border border-[#3b494b] text-xs rounded pl-3 pr-8 py-2 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
            placeholder="Filter sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="material-symbols-outlined absolute right-2.5 top-2 text-[#94A3B8] text-sm select-none">
            search
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto custom-scrollbar">
        {loading ? (
          <div className="text-center py-12 text-xs text-[#94A3B8]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#06B6D4] mx-auto mb-3"></div>
            Loading history logs...
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead className="bg-[#0d1515]/40 select-none border-b border-[#3b494b]">
              <tr>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-[#94A3B8]">Repo Name</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-[#94A3B8]">Candidate</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-[#94A3B8] text-right">Date</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-[#94A3B8] text-right">Tokens Used</th>
                <th className="px-6 py-4 text-[10px] uppercase font-bold text-[#94A3B8] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3b494b]/30 text-[#94A3B8]">
              {filteredLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-[#0d1515]/20 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-[#06B6D4] flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#94A3B8]/40">terminal</span>
                    {log.repo}
                  </td>
                  <td className="px-6 py-4 font-semibold text-white text-xs">{log.candidateName}</td>
                  <td className="px-6 py-4 text-right font-mono text-xs">{log.date}</td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-white text-xs">{log.tokens}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                      log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      log.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-xs text-[#94A3B8]">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-[#3b494b] flex justify-between items-center bg-[#151d1e] select-none text-[10px] sm:text-xs">
        <span className="text-[#94A3B8]">Showing {filteredLogs.length} of {logs.length} records</span>
        <div className="flex gap-1.5">
          <button className="w-7 h-7 flex items-center justify-center border border-[#3b494b] text-[#94A3B8] hover:bg-[#0d1515] rounded transition-colors">
            <span className="material-symbols-outlined text-sm font-bold">chevron_left</span>
          </button>
          <button className="w-7 h-7 flex items-center justify-center border border-[#06B6D4] text-[#06B6D4] bg-[#06B6D4]/10 font-bold rounded text-[10px]">1</button>
          <button className="w-7 h-7 flex items-center justify-center border border-[#3b494b] text-[#94A3B8] hover:bg-[#0d1515] rounded transition-colors">
            <span className="material-symbols-outlined text-sm font-bold">chevron_right</span>
          </button>
        </div>
      </div>

    </div>
  );
}
