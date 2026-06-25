'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';

interface HistoryItem {
  id: string;
  repo_url: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  candidate: {
    name: string;
    email: string;
  } | null;
  report: {
    overall_score: number;
    hire_recommendation: 'hire' | 'maybe' | 'pass';
    total_questions: number;
    completed_questions: number;
  } | null;
}

export default function HistoryPage() {
  const router = useRouter();
  const { user } = useGlobal();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'hire' | 'maybe' | 'pass'>('all');
  const [sessions, setSessions] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessionHistory = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          repo_url,
          status,
          created_at,
          candidate:candidates (
            name,
            email
          ),
          report:session_reports (
            overall_score,
            hire_recommendation,
            total_questions,
            completed_questions
          )
        `)
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Flatten nested joins if necessary
      const formatted = (data || []).map((s: any) => ({
        id: s.id,
        repo_url: s.repo_url,
        status: s.status,
        created_at: s.created_at,
        candidate: Array.isArray(s.candidate) ? s.candidate[0] : s.candidate,
        report: Array.isArray(s.report) ? s.report[0] : s.report
      })) as HistoryItem[];

      setSessions(formatted);
    } catch (err) {
      console.error('Failed to load session history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionHistory();
  }, [user]);

  const handleDeleteSession = async (id: string) => {
    if (confirm('Are you sure you want to delete this screening session? All questions, answers, and compiled reports will be permanently lost.')) {
      try {
        const { error } = await supabase
          .from('sessions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setSessions(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        alert('Failed to delete session record.');
      }
    }
  };

  const filteredHistory = sessions.filter((item) => {
    const candidateName = item.candidate?.name || '';
    const repoPath = item.repo_url || '';
    
    const matchesSearch = 
      repoPath.toLowerCase().includes(search.toLowerCase()) ||
      candidateName.toLowerCase().includes(search.toLowerCase());
    
    const rec = item.report?.hire_recommendation || 'maybe';
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'hire' && rec === 'hire') ||
      (filter === 'maybe' && rec === 'maybe') ||
      (filter === 'pass' && rec === 'pass');

    return matchesSearch && matchesFilter;
  });

  const getRecommendationBadge = (rec: string | undefined, score: number | undefined) => {
    if (!rec) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-500/10 border border-slate-500/30 text-slate-400 text-[10px] font-bold uppercase">
          In progress
        </span>
      );
    }

    if (rec === 'hire') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 active-glow"></span>
          {score || 50}% Hire
        </span>
      );
    } else if (rec === 'maybe') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>
          {score || 50}% Maybe
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span>
          {score || 50}% Pass
        </span>
      );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-sm font-mono text-[#94A3B8]">Loading screening history...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-[#0F172A] text-[#F1F5F9] overflow-hidden min-h-screen">
      
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-3 bg-[#1E293B] w-full border-b border-[#334155] z-10 select-none">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-[#06B6D4]">history</span>
          <h1 className="font-headline-md text-lg text-[#06B6D4] font-bold tracking-tight uppercase">Screening Session History</h1>
          <span className="px-2 py-0.5 rounded border border-[#334155] bg-[#0F172A] font-code-sm text-[10px] text-[#94A3B8] font-mono">
            SYNCED_DB
          </span>
        </div>
      </header>

      {/* Filter Drawer */}
      <section className="p-6 bg-[#1E293B]/20 border-b border-[#334155] select-none">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between max-w-7xl mx-auto w-full">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#94A3B8] text-lg">search</span>
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] rounded py-2 pl-10 pr-4 font-body-md text-sm text-white focus:outline-none focus:border-[#06B6D4] transition-all placeholder:text-[#475569]"
              placeholder="Search candidate or repository..."
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-[#0F172A] border border-[#334155] rounded p-1 text-xs">
              <button 
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-sm font-bold transition-all ${filter === 'all' ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20' : 'text-[#94A3B8] hover:bg-[#1E293B]'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('hire')}
                className={`px-3 py-1 rounded-sm font-bold transition-all ${filter === 'hire' ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20' : 'text-[#94A3B8] hover:bg-[#1E293B]'}`}
              >
                Hire
              </button>
              <button 
                onClick={() => setFilter('maybe')}
                className={`px-3 py-1 rounded-sm font-bold transition-all ${filter === 'maybe' ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20' : 'text-[#94A3B8] hover:bg-[#1E293B]'}`}
              >
                Maybe
              </button>
              <button 
                onClick={() => setFilter('pass')}
                className={`px-3 py-1 rounded-sm font-bold transition-all ${filter === 'pass' ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20' : 'text-[#94A3B8] hover:bg-[#1E293B]'}`}
              >
                Pass
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* History Datagrid Area */}
      <section className="flex-grow overflow-auto custom-scrollbar">
        <div className="min-w-[900px] max-w-7xl mx-auto px-8 py-4 pb-24">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#334155] text-left select-none text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">
                <th className="py-4 px-3">Repository Context</th>
                <th className="py-4 px-3">Candidate</th>
                <th className="py-4 px-3">Date Screened</th>
                <th className="py-4 px-3 text-center">Completed Qs</th>
                <th className="py-4 px-3">Status / Recommendation</th>
                <th className="py-4 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/30 text-xs sm:text-sm">
              {filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-[#1E293B]/20 transition-colors group">
                  {/* Repository name */}
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#06B6D4] text-lg font-bold">source</span>
                      <div>
                        <div className="font-body-md text-white font-semibold group-hover:text-[#06B6D4] transition-colors truncate max-w-xs">
                          {item.repo_url.replace('https://github.com/', '')}
                        </div>
                        <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
                          branch: main
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Candidate */}
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[#1E293B] border border-[#334155] flex items-center justify-center text-[10px] font-bold text-white font-mono uppercase">
                        {(item.candidate?.name || 'C').split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <span className="font-body-md text-white font-semibold block">{item.candidate?.name || 'Unnamed Candidate'}</span>
                        <span className="text-[9px] text-[#94A3B8] font-mono block -mt-0.5">{item.candidate?.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-4 px-3">
                    <span className="text-[#94A3B8] font-medium">{formatDate(item.created_at)}</span>
                  </td>

                  {/* Questions count */}
                  <td className="py-4 px-3 text-center">
                    <span className="bg-[#1E293B] px-2 py-0.5 border border-[#334155] font-mono text-xs rounded text-white">
                      {item.report?.completed_questions ?? 0} / {item.report?.total_questions ?? 0}
                    </span>
                  </td>

                  {/* Rating Badge */}
                  <td className="py-4 px-3">
                    {getRecommendationBadge(item.report?.hire_recommendation, item.report?.overall_score)}
                  </td>

                  {/* Row Actions */}
                  <td className="py-4 px-3 text-right select-none">
                    <div className="flex items-center justify-end gap-1.5">
                      
                      {item.status === 'active' ? (
                        <button 
                          onClick={() => router.push(`/session/${item.id}`)}
                          className="px-2.5 py-1 bg-[#06B6D4] text-[#0F172A] hover:bg-[#06B6D4]/80 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1 transition-all"
                          title="Resume Live Interview"
                        >
                          <span className="material-symbols-outlined text-xs">play_arrow</span>
                          Resume
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => router.push(`/session/${item.id}/report`)}
                            className="p-1.5 text-[#94A3B8] hover:text-[#06B6D4] hover:bg-[#1E293B] rounded transition-all" 
                            title="View Scorecard Report"
                          >
                            <span className="material-symbols-outlined text-lg">assignment</span>
                          </button>
                          <button 
                            onClick={() => router.push(`/session/${item.id}/code-story`)}
                            className="p-1.5 text-[#94A3B8] hover:text-[#06B6D4] hover:bg-[#1E293B] rounded transition-all" 
                            title="View Code Story"
                          >
                            <span className="material-symbols-outlined text-lg">analytics</span>
                          </button>
                        </>
                      )}

                      <button 
                        onClick={() => handleDeleteSession(item.id)}
                        className="p-1.5 text-[#94A3B8] hover:text-red-400 hover:bg-[#1E293B] rounded transition-all" 
                        title="Delete Session Record"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-xs text-[#94A3B8] italic">
                    No completed sessions logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
