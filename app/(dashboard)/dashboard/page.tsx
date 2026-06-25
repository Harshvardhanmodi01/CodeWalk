'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import Link from 'next/link';

interface SessionData {
  id: string;
  repo_url: string;
  status: 'active' | 'completed' | 'cancelled';
  timer_duration_minutes: number;
  created_at: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    github_url: string;
  };
  report: {
    id: string;
    overall_score: number;
    hire_recommendation: 'hire' | 'maybe' | 'pass';
  } | null;
}

export default function RecruiterDashboard() {
  const router = useRouter();
  const { user, signOut } = useGlobal();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (!user) return;
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          repo_url,
          status,
          timer_duration_minutes,
          created_at,
          candidate:candidate_id (
            id,
            name,
            email,
            github_url
          ),
          report:session_reports (
            id,
            overall_score,
            hire_recommendation
          )
        `)
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Flatten the report array if it comes as an array
      const formatted = (data || []).map((s: any) => ({
        ...s,
        report: Array.isArray(s.report) ? s.report[0] : s.report,
      })) as SessionData[];

      setSessions(formatted);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Stats calculations
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'active').length;
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((acc, curr) => acc + (curr.report?.overall_score || 0), 0) / completedSessions.length)
    : 0;
  const candidatesInterviewed = new Set(sessions.map(s => s.candidate?.id)).size;

  const filteredSessions = sessions.filter(s => {
    if (filter === 'active') return s.status === 'active';
    if (filter === 'completed') return s.status === 'completed';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col bg-[#0F172A] text-[#F1F5F9] overflow-hidden min-h-screen">
      {/* Dashboard Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-4 bg-[#1E293B] w-full border-b border-[#334155] z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#06B6D4] text-2xl font-bold">terminal</span>
          <span className="font-extrabold text-lg text-[#06B6D4] tracking-tight">CodeWalk Recruiter</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium text-[#94A3B8]">
            Recruiter: <strong className="text-[#F1F5F9]">{user?.name || 'Recruiter'}</strong>
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#334155] hover:border-red-500 hover:text-red-400 text-xs font-bold rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Scroll Area */}
      <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          
          {/* Top Banner Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Recruiter Dashboard</h1>
              <p className="text-sm text-[#94A3B8] mt-1">Manage, trigger, and review AI-powered candidate code story interviews.</p>
            </div>
            <Link 
              href="/dashboard/new-session"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#06B6D4] text-[#0F172A] font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              New Interview
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#1E293B] border border-[#334155] p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[#94A3B8]/20"><span className="material-symbols-outlined text-3xl">people</span></div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Total Interviews</p>
              <h3 className="text-3xl font-extrabold mt-2">{totalSessions}</h3>
            </div>
            <div className="bg-[#1E293B] border border-[#334155] p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[#94A3B8]/20"><span className="material-symbols-outlined text-3xl">timer</span></div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Active Sessions</p>
              <h3 className="text-3xl font-extrabold mt-2 text-[#06B6D4]">{activeSessions}</h3>
            </div>
            <div className="bg-[#1E293B] border border-[#334155] p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[#94A3B8]/20"><span className="material-symbols-outlined text-3xl">insights</span></div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Average AI Score</p>
              <h3 className="text-3xl font-extrabold mt-2 text-emerald-400">{avgScore}%</h3>
            </div>
            <div className="bg-[#1E293B] border border-[#334155] p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[#94A3B8]/20"><span className="material-symbols-outlined text-3xl">assignment_turned_in</span></div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Candidates Interviewed</p>
              <h3 className="text-3xl font-extrabold mt-2">{candidatesInterviewed}</h3>
            </div>
          </div>

          {/* Sessions List Area */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl overflow-hidden shadow-xl">
            {/* Filter Tabs Header */}
            <div className="px-6 py-4 border-b border-[#334155] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#1E293B]/40">
              <div className="flex gap-2 p-1 bg-[#0F172A] rounded-lg border border-[#334155]/60 text-xs font-bold">
                <button 
                  onClick={() => setFilter('all')}
                  className={`px-4 py-1.5 rounded-md transition-colors ${filter === 'all' ? 'bg-[#06B6D4] text-[#0F172A]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilter('active')}
                  className={`px-4 py-1.5 rounded-md transition-colors ${filter === 'active' ? 'bg-[#06B6D4] text-[#0F172A]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'}`}
                >
                  Active
                </button>
                <button 
                  onClick={() => setFilter('completed')}
                  className={`px-4 py-1.5 rounded-md transition-colors ${filter === 'completed' ? 'bg-[#06B6D4] text-[#0F172A]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'}`}
                >
                  Completed
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#06B6D4]"></div>
                <p className="text-xs text-[#94A3B8]">Retrieving session records...</p>
              </div>
            ) : filteredSessions.length === 0 ? (
              /* Empty State Illustration */
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto px-4 select-none">
                <div className="w-16 h-16 rounded-full bg-[#0F172A] flex items-center justify-center border border-[#334155]/60">
                  <span className="material-symbols-outlined text-[#06B6D4] text-3xl">question_answer</span>
                </div>
                <h4 className="text-lg font-bold">No Sessions Available</h4>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Start mapping your candidates' logic. Create your first interview session using a GitHub repository URL.
                </p>
                <Link 
                  href="/dashboard/new-session"
                  className="px-4 py-2 border border-[#06B6D4] text-[#06B6D4] font-bold text-xs uppercase tracking-wider rounded hover:bg-[#06B6D4]/10 transition-all"
                >
                  Create New Session
                </Link>
              </div>
            ) : (
              /* Sessions Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-[#1E293B]/60 border-b border-[#334155]/30">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Candidate Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider">GitHub Repo</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-right">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-right">Score</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/20 text-[#F1F5F9]">
                    {filteredSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-[#0F172A]/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-sm">
                          <div className="flex flex-col">
                            <span>{session.candidate?.name || 'Unknown Candidate'}</span>
                            <span className="text-[10px] text-[#94A3B8] font-normal">{session.candidate?.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-[#06B6D4]">
                          {session.repo_url.replace('https://github.com/', '')}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs">
                          {new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-sm">
                          {session.report ? `${session.report.overall_score}%` : '—'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            session.status === 'active' ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20' :
                            session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {session.status === 'completed' && session.report && (
                              <button 
                                onClick={() => router.push(`/session/${session.id}/report`)}
                                className="px-3 py-1.5 bg-[#0F172A] border border-[#334155] hover:border-[#06B6D4] hover:text-[#06B6D4] text-xs font-bold rounded transition-all"
                              >
                                View Report
                              </button>
                            )}
                            {session.status === 'active' && (
                              <>
                                <button 
                                  onClick={() => router.push(`/session/${session.id}/code-story`)}
                                  className="px-3 py-1.5 bg-[#0F172A] border border-[#334155] hover:border-emerald-500 hover:text-emerald-400 text-xs font-bold rounded transition-all"
                                >
                                  Code Story
                                </button>
                                <button 
                                  onClick={() => router.push(`/session/${session.id}`)}
                                  className="px-3 py-1.5 bg-[#06B6D4] text-[#0F172A] font-bold hover:brightness-110 text-xs rounded transition-all"
                                >
                                  Start
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
