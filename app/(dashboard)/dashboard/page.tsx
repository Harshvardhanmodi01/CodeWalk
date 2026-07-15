'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import ScheduleInterviewModal from '@/components/modals/ScheduleInterviewModal';
import RejectModal from '@/components/modals/RejectModal';

interface SessionData {
  id: string;
  repo_url: string;
  status: 'active' | 'completed' | 'cancelled' | 'scheduled';
  timer_duration_minutes: number;
  created_at: string;
  scheduled_at?: string;
  link_opened_at?: string;
  score_breakdown?: any;
  interview_mode?: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    github_url: string;
    fit_score?: string;
    position_id?: string;
  };
  report: {
    id: string;
    overall_score: number;
    hire_recommendation: 'hire' | 'maybe' | 'pass';
  } | null;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  github_url: string;
  linkedin_url?: string;
  role_applied?: string;
  status: 'pending' | 'screening' | 'scheduled' | 'interviewed' | 'hired' | 'rejected' | 'imported';
  tech_stack: string[];
  years_experience?: string;
  current_title?: string;
  overall_score?: number;
  fit_score?: 'best_fit' | 'good_fit' | 'possible_fit';
  position_id?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  position?: {
    id: string;
    title: string;
  };
}

interface Position {
  id: string;
  title: string;
  created_at: string;
  status: 'open' | 'closed' | 'draft';
}

export default function RecruiterDashboard() {
  const router = useRouter();
  const { user, authLoading, signOut } = useGlobal();

  // Data States
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filters
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pipeline'>('all');
  const [selectedPositionId, setSelectedPositionId] = useState('All');
  const [selectedFitScore, setSelectedFitScore] = useState('All');
  const [activeAlertFilter, setActiveAlertFilter] = useState<string | null>(null);

  // Checkbox Selection
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  // Modals Toggle
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [activeCandidateForModal, setActiveCandidateForModal] = useState<any>(null);

  // Stats Card state
  const [stats, setStats] = useState({
    totalInterviews: 0,
    activeSessions: 0,
    avgAiScore: 'N/A',
    candidatesInterviewed: 0
  });

  // Action Menu Dropdowns (card ID -> boolean)
  const [activeCardMenu, setActiveCardMenu] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      if (errorParam) {
        toast.error(errorParam);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  // Auth guard: once the Supabase session check resolves, redirect to login if no user.
  // This prevents the infinite black-screen spinner seen in production.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchAllData();

    // 30 seconds auto refresh
    const interval = setInterval(() => {
      fetchAllData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const fetchAllData = async (showLoadingState = true) => {
    if (!user) return;
    if (showLoadingState) setLoading(true);
    try {
      await Promise.all([
        fetchSessions(),
        fetchCandidatesData(),
        fetchPositionsData(),
        fetchDashboardStats()
      ]);
    } catch (err) {
      console.error('Error fetching dashboard records:', err);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id,
        repo_url,
        status,
        timer_duration_minutes,
        created_at,
        scheduled_at,
        link_opened_at,
        score_breakdown,
        interview_mode,
        candidate:candidate_id (
          id,
          name,
          email,
          github_url,
          fit_score,
          position_id
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

    // Flatten report arrays
    const formatted = (data || []).map((s: any) => ({
      ...s,
      report: Array.isArray(s.report) ? s.report[0] : s.report,
    })) as SessionData[];

    setSessions(formatted);
  };

  const fetchCandidatesData = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        *,
        position:position_id (
          id,
          title
        )
      `)
      .eq('recruiter_id', user.id);

    if (error) throw error;
    setCandidates(data || []);
  };

  const fetchPositionsData = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('positions')
      .select('id, title, created_at, status')
      .eq('recruiter_id', user.id);

    if (error) throw error;
    setPositions(data || []);
  };

  const fetchDashboardStats = async () => {
    if (!user) return;
    // 1. Total Interviews (All sessions count)
    const { count: totalCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('recruiter_id', user.id);

    // 2. Active Sessions
    const { count: activeCount } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .eq('recruiter_id', user.id)
      .eq('status', 'active');

    // 3. Average AI Score: joins answers with sessions
    const { data: answersData } = await supabase
      .from('answers')
      .select('ai_score, sessions!inner(recruiter_id)')
      .eq('sessions.recruiter_id', user.id);

    const validScores = (answersData || [])
      .map((a: any) => a.ai_score)
      .filter((s: any) => typeof s === 'number' && s !== null);

    const avgScoreVal = validScores.length > 0
      ? `${Math.round(validScores.reduce((sum: number, val: number) => sum + val, 0) / validScores.length)}%`
      : 'N/A';

    // 4. Candidates Interviewed: distinct candidate_id in completed sessions
    const { data: completedSessions } = await supabase
      .from('sessions')
      .select('candidate_id')
      .eq('recruiter_id', user.id)
      .eq('status', 'completed');

    const distinctCandidates = new Set((completedSessions || []).map((s: any) => s.candidate_id)).size;

    setStats({
      totalInterviews: totalCount || 0,
      activeSessions: activeCount || 0,
      avgAiScore: avgScoreVal,
      candidatesInterviewed: distinctCandidates
    });
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Drag and Drop handlers for Kanban
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('candidateId', id);
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData('candidateId');
    if (!candidateId) return;

    let dbStatus: any = 'pending';
    if (targetColumn === 'Imported') dbStatus = 'pending';
    else if (targetColumn === 'Screening') dbStatus = 'screening';
    else if (targetColumn === 'Interview Scheduled') dbStatus = 'scheduled';
    else if (targetColumn === 'Interviewed') dbStatus = 'interviewed';
    else if (targetColumn === 'Decision') dbStatus = 'hired'; // Drag defaults to hired

    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: dbStatus })
        .eq('id', candidateId);

      if (error) throw error;

      // Log event
      if (user) {
        await supabase.from('candidate_events').insert({
          candidate_id: candidateId,
          recruiter_id: user.id,
          event_type: dbStatus === 'hired' ? 'candidate_hired' : 'imported', // map logically
          event_description: `Candidate dragged and dropped to stage: ${targetColumn}`
        });
      }

      toast.success(`Successfully moved candidate to ${targetColumn}`);
      fetchAllData(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update candidate status.');
    }
  };

  // Reusable Status transitions
  const handleMoveToNextStage = async (cand: Candidate) => {
    let nextStatus: any = cand.status;
    if (cand.status === 'pending' || cand.status === 'imported') nextStatus = 'screening';
    else if (cand.status === 'screening') nextStatus = 'scheduled';
    else if (cand.status === 'scheduled') nextStatus = 'interviewed';
    else if (cand.status === 'interviewed') nextStatus = 'hired';

    if (nextStatus === cand.status) {
      toast('Candidate is already at the final decision stage.');
      return;
    }

    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: nextStatus })
        .eq('id', cand.id);

      if (error) throw error;

      if (user) {
        await supabase.from('candidate_events').insert({
          candidate_id: cand.id,
          recruiter_id: user.id,
          event_type: nextStatus === 'hired' ? 'candidate_hired' : 'imported',
          event_description: `Moved candidate to next stage: ${nextStatus}`
        });
      }

      toast.success(`Moved candidate to ${nextStatus}`);
      fetchAllData(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to advance candidate stage.');
    }
  };

  // Bulk Actions
  const handleBulkMoveStage = async () => {
    if (selectedCandidateIds.length === 0) return;
    setLoading(true);
    try {
      let count = 0;
      for (const id of selectedCandidateIds) {
        const cand = candidates.find(c => c.id === id);
        if (!cand) continue;

        let nextStatus: any = cand.status;
        if (cand.status === 'pending' || cand.status === 'imported') nextStatus = 'screening';
        else if (cand.status === 'screening') nextStatus = 'scheduled';
        else if (cand.status === 'scheduled') nextStatus = 'interviewed';
        else if (cand.status === 'interviewed') nextStatus = 'hired';

        if (nextStatus !== cand.status) {
          await supabase.from('candidates').update({ status: nextStatus }).eq('id', id);
          
          if (user) {
            await supabase.from('candidate_events').insert({
              candidate_id: id,
              recruiter_id: user.id,
              event_type: nextStatus === 'hired' ? 'candidate_hired' : 'imported',
              event_description: `Bulk advanced to stage: ${nextStatus}`
            });
          }
          count++;
        }
      }
      toast.success(`Advanced ${count} candidates to their next stage.`);
      setSelectedCandidateIds([]);
      fetchAllData(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to move stages.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRow = (candidateId: string) => {
    setSelectedCandidateIds(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId) 
        : [...prev, candidateId]
    );
  };

  const handleBulkSendLinks = async () => {
    if (selectedCandidateIds.length === 0) return;
    setLoading(true);
    let successCount = 0;
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0); // Default 10 AM tomorrow

      for (const id of selectedCandidateIds) {
        const cand = candidates.find(c => c.id === id);
        if (!cand) continue;

        const res = await fetch('/api/send-interview-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: id,
            dateTime: tomorrow.toISOString(),
            duration: '60',
            notes: 'Bulk scheduled invite',
            justGenerate: false
          })
        });
        if (res.ok) successCount++;
      }
      toast.success(`Successfully sent invite links to ${successCount} candidates!`);
      setSelectedCandidateIds([]);
      fetchAllData(false);
    } catch (err: any) {
      toast.error('Failed to execute bulk link schedule.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExportCSV = () => {
    const selected = candidates.filter(c => selectedCandidateIds.includes(c.id));
    if (selected.length === 0) return;

    const headers = ['Name', 'Email', 'GitHub Repo', 'Status', 'Fit Score', 'Notes'];
    const rows = selected.map(c => [
      c.name,
      c.email,
      c.github_url.replace('https://github.com/', ''),
      c.status,
      c.fit_score || 'N/A',
      c.notes || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "codewalk_candidates_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${selected.length} candidates.`);
  };

  // Open scheduling modal for individual candidate
  const openScheduleModal = (cand: any) => {
    setActiveCandidateForModal({
      id: cand.id,
      name: cand.name,
      email: cand.email
    });
    setScheduleModalOpen(true);
  };

  // Filtering calculations
  const matchesAlertFilter = (cand: Candidate) => {
    if (!activeAlertFilter) return true;
    if (activeAlertFilter === 'scheduled_today') {
      const todayString = new Date().toDateString();
      const hasTodaySession = sessions.some(s => 
        s.candidate.id === cand.id && 
        s.status === 'scheduled' && 
        s.scheduled_at && 
        new Date(s.scheduled_at).toDateString() === todayString
      );
      return hasTodaySession;
    }
    if (activeAlertFilter === 'waiting_review') {
      return cand.status === 'interviewed';
    }
    if (activeAlertFilter === 'shortlisted_week') {
      if (cand.status !== 'hired') return false;
      const age = (Date.now() - new Date(cand.updated_at || cand.created_at).getTime()) / (1000 * 3600 * 24);
      return age <= 7;
    }
    if (activeAlertFilter === 'unopened_links') {
      const hasUnopened = sessions.some(s => 
        s.candidate.id === cand.id && 
        s.status === 'scheduled' && 
        !s.link_opened_at
      );
      return hasUnopened;
    }
    return true;
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesPosition = selectedPositionId === 'All' || c.position_id === selectedPositionId;
    
    let matchesFit = true;
    if (selectedFitScore !== 'All') {
      const formattedFit = selectedFitScore.toLowerCase().replace(' ', '_');
      matchesFit = c.fit_score === formattedFit;
    }

    return matchesPosition && matchesFit && matchesAlertFilter(c);
  });

  const getCandidatesByColumn = (colId: string) => {
    return filteredCandidates.filter(c => {
      if (colId === 'Imported') return c.status === 'pending' || c.status === 'imported';
      if (colId === 'Screening') return c.status === 'screening';
      if (colId === 'Interview Scheduled') return (c.status as string) === 'scheduled' || (c.status as string) === 'interview scheduled';
      if (colId === 'Interviewed') return (c.status as string) === 'interviewed';
      if (colId === 'Decision') return (c.status as string) === 'hired' || (c.status as string) === 'rejected';
      return false;
    });
  };

  const filteredSessions = sessions.filter(s => {
    // Alert filters map to session lists in table view as well
    if (activeAlertFilter === 'scheduled_today') {
      const todayString = new Date().toDateString();
      return s.status === 'scheduled' && s.scheduled_at && new Date(s.scheduled_at).toDateString() === todayString;
    }
    if (activeAlertFilter === 'waiting_review') {
      return s.status === 'completed' && s.candidate.fit_score !== 'rejected'; // roughly wait state
    }
    if (filter === 'active') return s.status === 'active';
    if (filter === 'completed') return s.status === 'completed';
    return true;
  });

  // Today's schedule list calculations
  const todayInterviews = sessions.filter(s => {
    if (s.status !== 'scheduled' || !s.scheduled_at) return false;
    return new Date(s.scheduled_at).toDateString() === new Date().toDateString();
  }).sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  // Alerts computations
  const interviewsTodayCount = sessions.filter(s => 
    s.status === 'scheduled' && 
    s.scheduled_at && 
    new Date(s.scheduled_at).toDateString() === new Date().toDateString()
  ).length;

  const waitingReviewCount = candidates.filter(c => c.status === 'interviewed').length;

  const closingSoonCount = positions.filter(p => {
    const ageInDays = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 3600 * 24);
    return p.status === 'open' && ageInDays > 30;
  }).length;

  const shortlistedCount = candidates.filter(c => {
    if (c.status !== 'hired') return false;
    const ageInDays = (Date.now() - new Date(c.updated_at || c.created_at).getTime()) / (1000 * 3600 * 24);
    return ageInDays <= 7;
  }).length;

  const unopenedLinksCount = sessions.filter(s => 
    s.status === 'scheduled' && 
    !s.link_opened_at && 
    (Date.now() - new Date(s.created_at).getTime()) / (1000 * 3600) > 24
  ).length;

  // Tiny horizontal colored bars renderer for score column
  const renderScoreBars = (breakdown: any) => {
    const dims = [
      { key: 'codeQuality', color: 'bg-emerald-500', label: 'Code Quality' },
      { key: 'problemSolving', color: 'bg-blue-500', label: 'Problem Solving' },
      { key: 'technicalKnowledge', color: 'bg-cyan-500', label: 'Tech Knowledge' },
      { key: 'systemDesign', color: 'bg-purple-500', label: 'System Design' },
      { key: 'communication', color: 'bg-orange-500', label: 'Communication' }
    ];

    const data = breakdown || { codeQuality: 60, problemSolving: 60, technicalKnowledge: 60, systemDesign: 60, communication: 60 };
    return (
      <div className="flex gap-1 items-end h-6 justify-end group relative cursor-help">
        {dims.map(d => {
          const val = typeof data[d.key] === 'number' ? data[d.key] : 0;
          return (
            <div key={d.key} className="w-1.5 bg-[#3b494b]/30 h-full rounded-full overflow-hidden flex flex-col justify-end">
              <div className={`w-full ${d.color}`} style={{ height: `${val}%` }} />
            </div>
          );
        })}
        
        {/* Tooltip on hover */}
        <div className="absolute right-0 bottom-8 hidden group-hover:block bg-[#151d1e] border border-[#3b494b] p-2.5 rounded-lg shadow-xl text-[10px] space-y-1 text-left min-w-[140px] z-50 font-mono">
          {dims.map(d => {
            const val = typeof data[d.key] === 'number' ? data[d.key] : 0;
            return (
              <div key={d.key} className="flex justify-between items-center">
                <span className="text-[#94A3B8]">{d.label}:</span>
                <span className="text-[#06B6D4] font-bold">{val}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d1515] text-[#F1F5F9] overflow-hidden min-h-screen">
      
      {/* Dashboard Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-4 bg-[#151d1e] w-full border-b border-[#3b494b] z-10 select-none">
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
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#3b494b] hover:border-red-500 hover:text-red-400 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Scroll Area */}
      <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
          
          {/* Top Banner Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {user?.name || 'Recruiter'}</h1>
              <p className="text-sm text-[#94A3B8] mt-1">Manage, trigger, and review AI-powered candidate code story interviews.</p>
            </div>
            <Link 
              href="/dashboard/new-session"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              New Interview
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[#94A3B8]/20"><span className="material-symbols-outlined text-3xl">people</span></div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Total Interviews</p>
              <h3 className="text-3xl font-extrabold mt-2">{stats.totalInterviews}</h3>
            </div>
            <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[#94A3B8]/20"><span className="material-symbols-outlined text-3xl">timer</span></div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Active Sessions</p>
              <h3 className="text-3xl font-extrabold mt-2 text-[#06B6D4]">{stats.activeSessions}</h3>
            </div>
            <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[#94A3B8]/20"><span className="material-symbols-outlined text-3xl">insights</span></div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Average AI Score</p>
              <h3 className="text-3xl font-extrabold mt-2 text-emerald-400">{stats.avgAiScore}</h3>
            </div>
            <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[#94A3B8]/20"><span className="material-symbols-outlined text-3xl">assignment_turned_in</span></div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Candidates Interviewed</p>
              <h3 className="text-3xl font-extrabold mt-2">{stats.candidatesInterviewed}</h3>
            </div>
          </div>

          {/* Today's Schedule (Upcoming interviews for today) */}
          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] flex items-center gap-1.5 border-b border-[#3b494b]/60 pb-3">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              <span>Today's Schedule</span>
            </h4>
            {todayInterviews.length === 0 ? (
              <p className="text-xs text-[#94A3B8] italic">No interviews scheduled for today</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayInterviews.map(i => (
                  <div key={i.id} className="bg-[#0d1515] border border-[#3b494b] p-4 rounded-lg flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-white">{i.candidate?.name}</span>
                        <span className="text-[10px] font-mono bg-[#06B6D4]/10 text-[#06B6D4] px-2 py-0.5 rounded border border-[#06B6D4]/20">
                          {new Date(i.scheduled_at!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] truncate">{i.candidate?.email}</p>
                      <p className="text-[10px] text-[#94A3B8] font-mono truncate">{i.repo_url.replace('https://github.com/', '')}</p>
                      <p className="text-[10px] text-[#94A3B8]">Duration: {i.timer_duration_minutes} min</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/session/${i.id}`)}
                        className="flex-1 py-2 bg-[#06B6D4] hover:brightness-110 text-[#0d1515] text-[10px] font-bold uppercase rounded transition-all cursor-pointer text-center"
                      >
                        Start Now
                      </button>
                      <button
                        onClick={() => openScheduleModal(i.candidate)}
                        className="px-3 py-2 border border-[#3b494b] hover:bg-[#3b494b]/30 text-white text-[10px] font-bold uppercase rounded transition-all cursor-pointer"
                      >
                        Reschedule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Double Column Layout: Left (Main List / Pipeline) & Right (Smart Alerts Panel) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            
            {/* Left 3 Columns: Sessions List or Kanban View */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Toolbar header */}
              <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl overflow-hidden shadow-xl">
                {/* Filter Tabs Header */}
                <div className="px-6 py-4 border-b border-[#3b494b] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#151d1e]/40">
                  <div className="flex gap-2 p-1 bg-[#0d1515] rounded-lg border border-[#3b494b]/60 text-xs font-bold">
                    {['all', 'active', 'completed', 'pipeline'].map((tab: any) => (
                      <button 
                        key={tab}
                        onClick={() => {
                          setFilter(tab);
                          setActiveAlertFilter(null); // Clear alert filters
                        }}
                        className={`px-4 py-1.5 rounded-md transition-colors uppercase tracking-wider text-[10px] ${filter === tab ? 'bg-[#06B6D4] text-[#0d1515]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Kanban Dropdown filters */}
                  {filter === 'pipeline' && (
                    <div className="flex gap-3 text-xs">
                      <select
                        value={selectedPositionId}
                        onChange={(e) => setSelectedPositionId(e.target.value)}
                        className="bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded text-[#b9cacb] focus:outline-none focus:border-[#06B6D4]"
                      >
                        <option value="All">All Positions</option>
                        {positions.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>

                      <select
                        value={selectedFitScore}
                        onChange={(e) => setSelectedFitScore(e.target.value)}
                        className="bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded text-[#b9cacb] focus:outline-none focus:border-[#06B6D4]"
                      >
                        <option value="All">All Scores</option>
                        <option value="Best Fit">Best Fit</option>
                        <option value="Good Fit">Good Fit</option>
                        <option value="Possible Fit">Possible Fit</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Floating Bulk Action Bar */}
                {selectedCandidateIds.length > 0 && (
                  <div className="bg-[#06B6D4]/10 border-b border-[#06B6D4]/30 px-6 py-3 flex items-center justify-between gap-4 text-xs select-none">
                    <span className="font-bold text-white font-mono">{selectedCandidateIds.length} candidates selected</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleBulkSendLinks}
                        className="px-3 py-1.5 bg-[#06B6D4] text-[#0d1515] hover:brightness-110 font-bold uppercase rounded text-[10px] transition-all cursor-pointer"
                      >
                        Send Links
                      </button>
                      <button
                        onClick={handleBulkMoveStage}
                        className="px-3 py-1.5 bg-[#151d1e] border border-[#3b494b] hover:border-white text-white font-bold uppercase rounded text-[10px] transition-all cursor-pointer"
                      >
                        Move Next Stage
                      </button>
                      <button
                        onClick={() => setRejectModalOpen(true)}
                        className="px-3 py-1.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 font-bold uppercase rounded text-[10px] transition-all cursor-pointer"
                      >
                        Reject Selected
                      </button>
                      <button
                        onClick={handleBulkExportCSV}
                        className="px-3 py-1.5 bg-[#151d1e] border border-[#3b494b] hover:border-white text-[#94A3B8] hover:text-white font-bold uppercase rounded text-[10px] transition-all cursor-pointer"
                      >
                        Export CSV
                      </button>
                      {selectedCandidateIds.length >= 2 && selectedCandidateIds.length <= 3 && (
                        <button
                          onClick={() => router.push(`/compare?ids=${selectedCandidateIds.join(',')}`)}
                          className="px-3 py-1.5 bg-emerald-500 text-[#0d1515] hover:brightness-110 font-bold uppercase rounded text-[10px] transition-all cursor-pointer"
                        >
                          Compare
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#06B6D4]"></div>
                    <p className="text-xs text-[#94A3B8]">Retrieving dashboard data...</p>
                  </div>
                ) : filter === 'pipeline' ? (
                  
                  /* ================= KANBAN PIPELINE VIEW ================= */
                  <div className="p-6 overflow-x-auto">
                    <div className="flex gap-4 min-w-[1000px] h-[550px]">
                      {columns.map(col => {
                        const candidatesInCol = getCandidatesByColumn(col.id);
                        return (
                          <div 
                            key={col.id} 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, col.id)}
                            className="flex-1 bg-[#0d1515]/60 border border-[#3b494b]/40 rounded-xl p-4 flex flex-col h-full space-y-4"
                          >
                            {/* Column Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-[#3b494b]/40">
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${col.color}`}>
                                {col.label}
                              </span>
                              <span className="text-xs text-[#94A3B8] font-mono font-bold">{candidatesInCol.length}</span>
                            </div>

                            {/* Cards list */}
                            <div className="flex-grow overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                              {candidatesInCol.map(c => {
                                const isSelected = selectedCandidateIds.includes(c.id);
                                return (
                                  <div
                                    key={c.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, c.id)}
                                    className={`bg-[#151d1e] border hover:border-[#06B6D4]/60 p-4 rounded-xl shadow-md cursor-grab active:cursor-grabbing transition-all space-y-3 relative group ${
                                      isSelected ? 'border-[#06B6D4] bg-[#06B6D4]/5' : 'border-[#3b494b]/80'
                                    }`}
                                  >
                                    {/* Checkbox and Card Header */}
                                    <div className="flex items-start justify-between">
                                      <input 
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleRow(c.id)}
                                        className="h-3.5 w-3.5 rounded border-[#3b494b] text-[#06B6D4] focus:ring-0 cursor-pointer mt-0.5"
                                      />
                                      
                                      {/* Action Trigger dot */}
                                      <div className="relative">
                                        <button 
                                          onClick={() => setActiveCardMenu(activeCardMenu === c.id ? null : c.id)}
                                          className="p-0.5 text-[#94A3B8] hover:text-white rounded transition-colors"
                                        >
                                          <span className="material-symbols-outlined text-sm font-bold">more_vert</span>
                                        </button>

                                        {/* Dropdown Options */}
                                        {activeCardMenu === c.id && (
                                          <div className="absolute right-0 mt-1 bg-[#151d1e] border border-[#3b494b] rounded-lg shadow-xl text-[10px] w-32 py-1 z-30 font-bold uppercase tracking-wider">
                                            <button 
                                              onClick={() => { router.push(`/candidates/${c.id}`); setActiveCardMenu(null); }}
                                              className="w-full text-left px-3 py-2 text-white hover:bg-[#3b494b]/50 flex items-center gap-1.5"
                                            >
                                              <span className="material-symbols-outlined text-xs">person</span>
                                              <span>Profile</span>
                                            </button>
                                            <button 
                                              onClick={() => { router.push(`/dashboard/new-session?candidateId=${c.id}`); setActiveCardMenu(null); }}
                                              className="w-full text-left px-3 py-2 text-white hover:bg-[#3b494b]/50 flex items-center gap-1.5"
                                            >
                                              <span className="material-symbols-outlined text-xs">terminal</span>
                                              <span>Interview</span>
                                            </button>
                                            <button 
                                              onClick={() => { openScheduleModal(c); setActiveCardMenu(null); }}
                                              className="w-full text-left px-3 py-2 text-[#06B6D4] hover:bg-[#3b494b]/50 flex items-center gap-1.5"
                                            >
                                              <span className="material-symbols-outlined text-xs">link</span>
                                              <span>Send Link</span>
                                            </button>
                                            <button 
                                              onClick={() => { handleMoveToNextStage(c); setActiveCardMenu(null); }}
                                              className="w-full text-left px-3 py-2 text-white hover:bg-[#3b494b]/50 flex items-center gap-1.5"
                                            >
                                              <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                              <span>Move Next</span>
                                            </button>
                                            <button 
                                              onClick={() => {
                                                setActiveCandidateForModal({ id: c.id, name: c.name, email: c.email });
                                                setRejectModalOpen(true);
                                                setActiveCardMenu(null);
                                              }}
                                              className="w-full text-left px-3 py-2 text-red-400 hover:bg-[#3b494b]/50 flex items-center gap-1.5"
                                            >
                                              <span className="material-symbols-outlined text-xs">delete</span>
                                              <span>Reject</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Card Info */}
                                    <div className="space-y-1">
                                      <h5 className="font-bold text-xs text-white">{c.name}</h5>
                                      <p className="text-[10px] text-[#94A3B8] truncate">{c.email}</p>
                                    </div>

                                    <div className="space-y-1.5">
                                      {c.position && (
                                        <p className="text-[10px] text-[#06B6D4] font-semibold truncate flex items-center gap-1">
                                          <span className="material-symbols-outlined text-xs">work</span>
                                          <span>{c.position.title}</span>
                                        </p>
                                      )}
                                      <p className="text-[9px] font-mono text-[#94A3B8] truncate">
                                        GitHub: {c.github_url.split('/').pop()}
                                      </p>
                                    </div>

                                    {/* Badges footer */}
                                    <div className="flex justify-between items-center pt-2 border-t border-[#3b494b]/30">
                                      {c.fit_score ? (
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                          c.fit_score === 'best_fit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                          c.fit_score === 'good_fit' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                          'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                        }`}>
                                          {c.fit_score.replace('_', ' ')}
                                        </span>
                                      ) : (
                                        <span className="text-[8px] text-[#94A3B8] italic">No fit score</span>
                                      )}

                                      <span className="text-[8px] text-[#94A3B8] font-mono">
                                        {new Date(c.updated_at || c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : filteredSessions.length === 0 ? (
                  /* Empty State */
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto px-4 select-none">
                    <div className="w-16 h-16 rounded-full bg-[#0d1515] flex items-center justify-center border border-[#3b494b]/60">
                      <span className="material-symbols-outlined text-[#06B6D4] text-3xl">question_answer</span>
                    </div>
                    <h4 className="text-lg font-bold">No Sessions Available</h4>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      Create your first interview session using a GitHub repository URL.
                    </p>
                  </div>
                ) : (
                  
                  /* ================= TABLE LIST VIEW ================= */
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm select-none">
                      <thead className="bg-[#151d1e]/60 border-b border-[#3b494b]/30">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider w-8">
                            <input
                              type="checkbox"
                              checked={selectedCandidateIds.length > 0 && selectedCandidateIds.length === filteredSessions.map(s => s.candidate?.id).filter(Boolean).length}
                              onChange={() => {
                                const visibleIds = filteredSessions.map(s => s.candidate?.id).filter(Boolean);
                                if (selectedCandidateIds.length === visibleIds.length) {
                                  setSelectedCandidateIds([]);
                                } else {
                                  setSelectedCandidateIds(visibleIds);
                                }
                              }}
                              className="h-3.5 w-3.5 rounded border-[#3b494b] text-[#06B6D4] focus:ring-0 cursor-pointer"
                            />
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Candidate Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider">GitHub Repo</th>
                          <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-center">Mode</th>
                          <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-right">Date</th>
                          <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-right">Score</th>
                          <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-center">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-[#94A3B8] uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#3b494b]/20 text-[#F1F5F9]">
                        {filteredSessions.map((session) => {
                          const isSelected = selectedCandidateIds.includes(session.candidate?.id);
                          return (
                            <tr key={session.id} className={`hover:bg-[#0d1515]/30 transition-colors ${isSelected ? 'bg-[#06B6D4]/5' : ''}`}>
                              <td className="px-6 py-4 w-8">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleRow(session.candidate?.id)}
                                  className="h-3.5 w-3.5 rounded border-[#3b494b] text-[#06B6D4] focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="px-6 py-4 font-semibold text-sm">
                                <div className="flex flex-col">
                                  <span>{session.candidate?.name || 'Unknown Candidate'}</span>
                                  <span className="text-[10px] text-[#94A3B8] font-normal">{session.candidate?.email}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs font-mono text-[#06B6D4] truncate max-w-[150px]">
                                {session.repo_url ? session.repo_url.replace('https://github.com/', '') : 'N/A (No Code)'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  session.interview_mode === 'behavioral' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                                  session.interview_mode === 'logical' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                                  session.interview_mode === 'fullstack' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                  session.interview_mode === 'custom' ? 'bg-gray-500/10 border-gray-500/30 text-gray-400' :
                                  'bg-cyan-500/10 border-cyan-500/30 text-[#06B6D4]'
                                }`}>
                                  {session.interview_mode === 'technical' ? 'Technical' :
                                   session.interview_mode === 'behavioral' ? 'Behavioral' :
                                   session.interview_mode === 'logical' ? 'Logical' :
                                   session.interview_mode === 'fullstack' ? 'Full Stack' :
                                   session.interview_mode === 'custom' ? 'Custom' : 'Technical'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-xs">
                                <div className="flex items-center justify-end gap-1.5">
                                  {session.status === 'scheduled' && (
                                    <span className="material-symbols-outlined text-xs text-[#06B6D4] animate-pulse">calendar_today</span>
                                  )}
                                  <span>
                                    {session.status === 'scheduled' && session.scheduled_at
                                      ? new Date(session.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                      : new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                    }
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-sm">
                                {session.status === 'completed' && session.report
                                  ? renderScoreBars(session.score_breakdown)
                                  : '—'
                                }
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  session.status === 'active' ? 'bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20' :
                                  session.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  session.status === 'scheduled' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
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
                                      className="px-3 py-1.5 bg-[#0d1515] border border-[#3b494b] hover:border-[#06B6D4] hover:text-[#06B6D4] text-xs font-bold rounded transition-all cursor-pointer"
                                    >
                                      View Report
                                    </button>
                                  )}
                                  {session.status === 'active' && (
                                    <>
                                      <button 
                                        onClick={() => router.push(`/session/${session.id}/code-story`)}
                                        className="px-3 py-1.5 bg-[#0d1515] border border-[#3b494b] hover:border-emerald-500 hover:text-emerald-400 text-xs font-bold rounded transition-all cursor-pointer"
                                      >
                                        Code Story
                                      </button>
                                      <button 
                                        onClick={() => router.push(`/session/${session.id}`)}
                                        className="px-3 py-1.5 bg-[#06B6D4] text-[#0d1515] font-bold hover:brightness-110 text-xs rounded transition-all cursor-pointer"
                                      >
                                        Start
                                      </button>
                                    </>
                                  )}
                                  {session.status === 'scheduled' && (
                                    <button
                                      onClick={() => openScheduleModal(session.candidate)}
                                      className="px-3 py-1.5 border border-[#3b494b] hover:border-[#06B6D4] hover:text-[#06B6D4] text-xs font-bold rounded transition-all cursor-pointer"
                                    >
                                      Reschedule
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: "Today's Actions" Smart Alerts Card */}
            <div className="space-y-6">
              <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-xl space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">notifications_active</span>
                    <span>Today's Actions</span>
                  </h4>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">Automated screening alerts for your pipeline.</p>
                </div>

                <div className="divide-y divide-[#3b494b]/30">
                  {/* Alert 1: Interviews Scheduled Today */}
                  <button 
                    onClick={() => {
                      setFilter('all');
                      setActiveAlertFilter(activeAlertFilter === 'scheduled_today' ? null : 'scheduled_today');
                    }}
                    className={`w-full py-3 flex items-start gap-3 hover:bg-[#0d1515]/30 px-2 rounded-lg text-left transition-colors cursor-pointer border ${
                      activeAlertFilter === 'scheduled_today' ? 'border-[#06B6D4] bg-[#06B6D4]/5' : 'border-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-yellow-400 text-lg mt-0.5">warning</span>
                    <div className="text-xs flex-1">
                      <h5 className="font-bold text-white">{interviewsTodayCount} interviews scheduled today</h5>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">Click to view today's schedule</p>
                    </div>
                  </button>

                  {/* Alert 2: Candidates Waiting for Review */}
                  <button 
                    onClick={() => {
                      setFilter('pipeline');
                      setActiveAlertFilter(activeAlertFilter === 'waiting_review' ? null : 'waiting_review');
                    }}
                    className={`w-full py-3 flex items-start gap-3 hover:bg-[#0d1515]/30 px-2 rounded-lg text-left transition-colors cursor-pointer border ${
                      activeAlertFilter === 'waiting_review' ? 'border-[#06B6D4] bg-[#06B6D4]/5' : 'border-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-orange-400 text-lg mt-0.5">rate_review</span>
                    <div className="text-xs flex-1">
                      <h5 className="font-bold text-white">{waitingReviewCount} candidates waiting review</h5>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">Completed sessions without decision</p>
                    </div>
                  </button>

                  {/* Alert 3: Positions Closing Soon */}
                  <div className="w-full py-3 flex items-start gap-3 px-2 text-left">
                    <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">timer_off</span>
                    <div className="text-xs flex-1">
                      <h5 className="font-bold text-white">{closingSoonCount} positions closing soon</h5>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">Open jobs older than 30 days</p>
                    </div>
                  </div>

                  {/* Alert 4: Shortlisted This Week */}
                  <button 
                    onClick={() => {
                      setFilter('pipeline');
                      setActiveAlertFilter(activeAlertFilter === 'shortlisted_week' ? null : 'shortlisted_week');
                    }}
                    className={`w-full py-3 flex items-start gap-3 hover:bg-[#0d1515]/30 px-2 rounded-lg text-left transition-colors cursor-pointer border ${
                      activeAlertFilter === 'shortlisted_week' ? 'border-[#06B6D4] bg-[#06B6D4]/5' : 'border-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-emerald-400 text-lg mt-0.5">check_circle</span>
                    <div className="text-xs flex-1">
                      <h5 className="font-bold text-white">{shortlistedCount} candidates hired</h5>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">Shortlisted in the last 7 days</p>
                    </div>
                  </button>

                  {/* Alert 5: Link Unopened > 24 Hours */}
                  <button 
                    onClick={() => {
                      setFilter('all');
                      setActiveAlertFilter(activeAlertFilter === 'unopened_links' ? null : 'unopened_links');
                    }}
                    className={`w-full py-3 flex items-start gap-3 hover:bg-[#0d1515]/30 px-2 rounded-lg text-left transition-colors cursor-pointer border ${
                      activeAlertFilter === 'unopened_links' ? 'border-[#06B6D4] bg-[#06B6D4]/5' : 'border-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-gray-400 text-lg mt-0.5">mail_lock</span>
                    <div className="text-xs flex-1">
                      <h5 className="font-bold text-white">{unopenedLinksCount} unopened links</h5>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">Sent but unopened after 24h</p>
                    </div>
                  </button>
                </div>

                {interviewsTodayCount === 0 && waitingReviewCount === 0 && closingSoonCount === 0 && shortlistedCount === 0 && unopenedLinksCount === 0 && (
                  <div className="flex flex-col items-center justify-center text-center py-6 text-[#94A3B8] space-y-2">
                    <span className="material-symbols-outlined text-emerald-400 text-3xl">done_all</span>
                    <h5 className="text-xs font-bold text-white">All caught up!</h5>
                    <p className="text-[9px] text-[#94A3B8]">No pending actions required.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Schedule Interview Modal */}
      {scheduleModalOpen && activeCandidateForModal && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={() => {
            setScheduleModalOpen(false);
            setActiveCandidateForModal(null);
          }}
          candidateId={activeCandidateForModal.id}
          candidateName={activeCandidateForModal.name}
          candidateEmail={activeCandidateForModal.email}
          onScheduleSuccess={() => fetchAllData(false)}
        />
      )}

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <RejectModal
          isOpen={rejectModalOpen}
          onClose={() => {
            setRejectModalOpen(false);
            setActiveCandidateForModal(null);
          }}
          candidateIds={activeCandidateForModal ? [activeCandidateForModal.id] : selectedCandidateIds}
          onRejectSuccess={() => {
            setSelectedCandidateIds([]);
            fetchAllData(false);
          }}
        />
      )}

    </div>
  );
}

const columns = [
  { id: 'Imported', label: 'Imported', color: 'border-gray-500/30 text-gray-400 bg-gray-500/10' },
  { id: 'Screening', label: 'Screening', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
  { id: 'Interview Scheduled', label: 'Interview Scheduled', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' },
  { id: 'Interviewed', label: 'Interviewed', color: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
  { id: 'Decision', label: 'Decision', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' }
];
