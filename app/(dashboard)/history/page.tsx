'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface HistoryItem {
  jobId: string;
  repo: string;
  candidateName: string;
  createdAt: string;
  questionsCount: number;
  score: number;
  status: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Read from localStorage cw_analyses
    const stored = localStorage.getItem('cw_analyses');
    if (stored) {
      setHistory(JSON.parse(stored));
    } else {
      // Seed default analyses history if not present
      const defaultHistory: HistoryItem[] = [
        { jobId: 'job_abc123', repo: 'github.com/johndoe/ecommerce-app', candidateName: 'Rahul Sharma', createdAt: 'Oct 24, 2026', questionsCount: 6, score: 85, status: 'READY' },
        { jobId: 'job_react', repo: 'github.com/facebook/react', candidateName: 'Sarah Chen', createdAt: 'Oct 23, 2026', questionsCount: 4, score: 92, status: 'READY' },
        { jobId: 'job_next', repo: 'github.com/vercel/next.js', candidateName: 'Marcus Brody', createdAt: 'Oct 21, 2026', questionsCount: 8, score: 45, status: 'READY' },
        { jobId: 'job_tailwind', repo: 'github.com/tailwindlabs/tailwindcss', candidateName: 'Elena Rostova', createdAt: 'Oct 19, 2026', questionsCount: 5, score: 78, status: 'ARCHIVED' }
      ];
      localStorage.setItem('cw_analyses', JSON.stringify(defaultHistory));
      setHistory(defaultHistory);
    }
  }, []);

  const handleDelete = (jobId: string) => {
    if (confirm('Are you sure you want to delete this assessment record?')) {
      const updated = history.filter((item) => item.jobId !== jobId);
      setHistory(updated);
      localStorage.setItem('cw_analyses', JSON.stringify(updated));
    }
  };

  const handleReRun = (repo: string, candidate: string) => {
    localStorage.setItem('cw_temp_repo', repo);
    localStorage.setItem('cw_temp_candidate', candidate);
    router.push('/dashboard/loading');
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch = 
      item.repo.toLowerCase().includes(search.toLowerCase()) ||
      item.candidateName.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'passed' && item.score >= 60) ||
      (filter === 'failed' && item.score < 60);

    return matchesSearch && matchesFilter;
  });

  const getScoreBadge = (score: number) => {
    if (score >= 85) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded bg-primary-fixed/10 border border-primary-fixed/30 text-primary-fixed text-[11px] font-bold font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed mr-2 active-glow"></span>
          {score}% Elite
        </span>
      );
    } else if (score >= 60) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded bg-secondary-container/20 border border-secondary/30 text-secondary text-[11px] font-bold font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary mr-2"></span>
          {score}% Competent
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded bg-error-container/20 border border-error/30 text-error text-[11px] font-bold font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-error mr-2"></span>
          {score}% Needs Review
        </span>
      );
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-surface overflow-hidden min-h-screen">
      
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-3 bg-surface-container-low w-full border-b border-outline-variant z-10 select-none">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary-fixed">terminal</span>
          <h1 className="font-headline-md text-lg text-primary-fixed font-bold tracking-tight uppercase">Analysis History</h1>
          <span className="px-2 py-0.5 rounded border border-outline-variant bg-surface-container-lowest font-code-sm text-[10px] text-on-surface-variant font-mono">
            SQL_QUERY_COMPLETE
          </span>
        </div>
      </header>

      {/* Filter Drawer */}
      <section className="p-6 bg-surface border-b border-outline-variant select-none">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between max-w-7xl mx-auto w-full">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-lg">search</span>
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded py-2 pl-10 pr-4 font-body-md text-sm text-on-surface focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all placeholder:text-on-surface-variant/40"
              placeholder="Search repository or candidate..."
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded p-1 text-xs">
              <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-sm font-bold transition-all ${filter === 'all' ? 'bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20' : 'text-on-surface-variant hover:bg-surface-variant'}`}
              >
                All Sessions
              </button>
              <button 
                onClick={() => setFilter('passed')}
                className={`px-3 py-1 rounded-sm font-bold transition-all ${filter === 'passed' ? 'bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20' : 'text-on-surface-variant hover:bg-surface-variant'}`}
              >
                Passed
              </button>
              <button 
                onClick={() => setFilter('failed')}
                className={`px-3 py-1 rounded-sm font-bold transition-all ${filter === 'failed' ? 'bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20' : 'text-on-surface-variant hover:bg-surface-variant'}`}
              >
                Failed
              </button>
            </div>
            
            <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded text-on-surface-variant hover:bg-surface-container-highest transition-colors font-label-sm text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-lg">filter_list</span>
              <span>Advanced Filters</span>
            </button>
          </div>
        </div>
      </section>

      {/* History Datagrid Area */}
      <section className="flex-grow overflow-auto custom-scrollbar">
        <div className="min-w-[900px] max-w-7xl mx-auto px-8 py-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-left select-none text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                <th className="py-4 px-3">Repository</th>
                <th className="py-4 px-3">Candidate</th>
                <th className="py-4 px-3">Date Completed</th>
                <th className="py-4 px-3 text-center">Questions</th>
                <th className="py-4 px-3">Overall Score</th>
                <th className="py-4 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-xs sm:text-sm">
              {filteredHistory.map((item) => (
                <tr key={item.jobId} className="hover:bg-surface-container-highest/20 transition-colors group">
                  {/* Repository name */}
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">source</span>
                      <div>
                        <div className="font-body-md text-on-surface font-semibold group-hover:text-primary-fixed transition-colors">
                          {item.repo}
                        </div>
                        <div className="font-code-sm text-[10px] text-on-surface-variant/60 font-mono mt-0.5">
                          branch: main
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Candidate */}
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-surface-container-highest border border-outline-variant flex items-center justify-center text-[10px] font-bold text-on-surface font-mono">
                        {item.candidateName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-body-md text-on-surface font-semibold">{item.candidateName}</span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-4 px-3">
                    <span className="text-on-surface-variant font-medium">{item.createdAt}</span>
                  </td>

                  {/* Questions count */}
                  <td className="py-4 px-3 text-center">
                    <span className="bg-surface-container px-2 py-0.5 border border-outline-variant font-code-md text-on-surface font-mono text-xs rounded">
                      {item.questionsCount} / {item.questionsCount}
                    </span>
                  </td>

                  {/* Rating Badge */}
                  <td className="py-4 px-3">
                    {getScoreBadge(item.score)}
                  </td>

                  {/* Row Actions */}
                  <td className="py-4 px-3 text-right select-none">
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        onClick={() => router.push(`/results/${item.jobId}`)}
                        className="p-1.5 text-on-surface-variant hover:text-primary-fixed hover:bg-surface-variant/40 rounded transition-all" 
                        title="View Scorecard"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                      <button 
                        onClick={() => handleReRun(item.repo, item.candidateName)}
                        className="p-1.5 text-on-surface-variant hover:text-tertiary-fixed hover:bg-surface-variant/40 rounded transition-all" 
                        title="Re-run Assessment"
                      >
                        <span className="material-symbols-outlined text-lg">play_circle</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(item.jobId)}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded transition-all" 
                        title="Delete Session"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-xs text-on-surface-variant">
                    No assessments logged matching your search parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom Status bar */}
      <footer className="h-8 bg-surface-container border-t border-outline-variant px-4 flex items-center justify-between font-code-sm text-[10px] text-on-surface-variant/60 font-mono select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed active-glow animate-pulse"></span>
            <span>SYSTEM READY</span>
          </div>
          <div className="border-l border-outline-variant/40 h-4"></div>
          <span>DB CONNECTED: history_logs_v2</span>
        </div>
        <div>
          AUTO-SAVE ENABLED
        </div>
      </footer>

    </div>
  );
}
