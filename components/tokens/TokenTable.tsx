'use client';

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/app/context/GlobalContext';

interface TokenLog {
  repo: string;
  date: string;
  tokens: number;
  questions: number;
  model: string;
}

export default function TokenTable() {
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<TokenLog[]>([]);
  const { user } = useGlobal();

  useEffect(() => {
    if (!user) {
      setLogs([]);
      return;
    }

    // Load dynamic logs from localStorage
    const stored = localStorage.getItem('cw_analyses');
    const dynamicAnalyses = stored ? JSON.parse(stored) : [];

    const dynamicLogs: TokenLog[] = dynamicAnalyses.map((item: any) => {
      let repoName = item.repo || '';
      if (repoName.startsWith('http')) {
        repoName = repoName.replace(/https?:\/\/(?:www\.)?github\.com\//, '');
      }

      const tokenCount = item.apiResult?.timing?.totalMs
        ? Math.floor(12000 + (item.apiResult.timing.totalMs / 10))
        : 15600;

      let modelDisplay = item.model || 'llama-3.3-70b-versatile';
      if (modelDisplay === 'llama-3.3-70b-versatile') modelDisplay = 'llama-3.3-70b';
      else if (modelDisplay === 'llama-3.1-8b-instant') modelDisplay = 'llama-3.1-8b';
      else if (modelDisplay === 'mixtral-8x7b-32768') modelDisplay = 'mixtral-8x7b';
      else if (modelDisplay === 'gpt-4o') modelDisplay = 'GPT-4o';
      else if (modelDisplay === 'claude-3.5-sonnet') modelDisplay = 'Claude 3.5';

      return {
        repo: repoName,
        date: item.createdAt || 'Just now',
        tokens: tokenCount,
        questions: item.questionsCount || 6,
        model: modelDisplay,
      };
    });

    const staticLogs: TokenLog[] = [
      { repo: 'facebook/react', date: 'Oct 24, 2026', tokens: 12450, questions: 4, model: 'llama-3.3-70b' },
      { repo: 'vercel/next.js', date: 'Oct 24, 2026', tokens: 8210, questions: 2, model: 'llama-3.1-8b' },
      { repo: 'openai/whisper', date: 'Oct 24, 2026', tokens: 32100, questions: 12, model: 'GPT-4o' },
      { repo: 'tailwindlabs/tailwindcss', date: 'Oct 24, 2026', tokens: 15672, questions: 7, model: 'Claude 3.5' }
    ];

    setLogs([...dynamicLogs, ...staticLogs]);
  }, [user]);

  const filteredLogs = logs.filter((log) => 
    log.repo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden shadow-sm">
      
      {/* Header controls */}
      <div className="p-4 sm:p-6 border-b border-outline-variant flex flex-col sm:flex-row gap-4 justify-between items-center bg-surface-container-high/40 select-none">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">history</span>
          <h5 className="font-label-sm text-xs font-bold uppercase tracking-wider">Per-Analysis Breakdown</h5>
        </div>
        
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input 
            type="text"
            className="w-full bg-surface-container-lowest border border-outline-variant text-code-sm font-mono text-xs rounded pl-3 pr-8 py-2 focus:ring-1 focus:ring-primary outline-none text-on-surface"
            placeholder="Filter repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-on-surface-variant text-sm select-none">
            search
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead className="bg-surface-container-high/60 select-none border-b border-outline-variant/30">
            <tr>
              <th className="px-6 py-4 font-label-sm text-[10px] uppercase font-bold text-on-surface-variant">Repo Name</th>
              <th className="px-6 py-4 font-label-sm text-[10px] uppercase font-bold text-on-surface-variant text-right">Date</th>
              <th className="px-6 py-4 font-label-sm text-[10px] uppercase font-bold text-on-surface-variant text-right">Tokens Used</th>
              <th className="px-6 py-4 font-label-sm text-[10px] uppercase font-bold text-on-surface-variant text-right">Questions</th>
              <th className="px-6 py-4 font-label-sm text-[10px] uppercase font-bold text-on-surface-variant">Model Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 text-on-surface-variant/90">
            {filteredLogs.map((log, idx) => (
              <tr key={idx} className="hover:bg-surface-container-low/60 transition-colors">
                <td className="px-6 py-4 font-code-md text-xs text-primary-fixed font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-on-surface-variant/40">terminal</span>
                  {log.repo}
                </td>
                <td className="px-6 py-4 text-right font-mono text-xs">{log.date}</td>
                <td className="px-6 py-4 text-right font-mono font-semibold text-on-surface text-xs">{log.tokens.toLocaleString()}</td>
                <td className="px-6 py-4 text-right font-mono text-xs">{log.questions}</td>
                <td className="px-6 py-4">
                  <span className="bg-surface-container-highest px-2 py-0.5 border border-outline-variant rounded-sm text-[10px] font-label-sm uppercase font-bold tracking-tight">
                    {log.model}
                  </span>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-xs text-on-surface-variant">
                  No matching repositories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-outline-variant/30 flex justify-between items-center bg-surface-container-high/20 select-none text-[10px] sm:text-xs">
        <span className="font-label-sm text-on-surface-variant">Showing {filteredLogs.length} of {logs.length} records</span>
        <div className="flex gap-1.5">
          <button className="w-7 h-7 flex items-center justify-center border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest rounded transition-colors">
            <span className="material-symbols-outlined text-sm font-bold">chevron_left</span>
          </button>
          <button className="w-7 h-7 flex items-center justify-center border border-primary text-primary-fixed bg-primary-fixed/10 font-bold rounded text-[10px]">1</button>
          <button className="w-7 h-7 flex items-center justify-center border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest rounded text-[10px] transition-colors">2</button>
          <button className="w-7 h-7 flex items-center justify-center border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest rounded transition-colors">
            <span className="material-symbols-outlined text-sm font-bold">chevron_right</span>
          </button>
        </div>
      </div>

    </div>
  );
}
