'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';
import ScheduleInterviewModal from '@/components/modals/ScheduleInterviewModal';
import AssignProjectModal from '@/components/modals/AssignProjectModal';
import RadarChart from '@/components/dashboard/RadarChart';

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
  resume_url?: string;
  resume_extracted_data?: any;
  notes?: string;
  overall_score?: number;
  hire_recommendation?: string;
  created_at: string;
}

interface SessionItem {
  id: string;
  created_at: string;
  timer_duration_minutes: number;
  status: string;
  interview_mode?: string;
  session_reports?: {
    overall_score: number;
    hire_recommendation: string;
  }[];
}

export default function CandidateProfilePage() {
  const router = useRouter();
  const { candidateId } = useParams() as { candidateId: string };
  const { user } = useGlobal();

  // State Management
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingRepo, setAnalyzingRepo] = useState(false);
  
  // Input fields
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Candidate['status']>('pending');
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [updatingRepo, setUpdatingRepo] = useState(false);
  const [repoLoadError, setRepoLoadError] = useState<string | null>(null);
  const [linkerError, setLinkerError] = useState<string | null>(null);
  const [userRepos, setUserRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [assignProjectModalOpen, setAssignProjectModalOpen] = useState(false);

  const fetchCandidateDetails = async () => {
    try {
      setLoading(true);
      // Fetch Candidate details
      const { data: candData, error: candErr } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (candErr) throw candErr;
      setCandidate(candData);
      setNewRepoUrl(candData.github_url || '');
      setNotes(candData.notes || '');
      setSelectedStatus(candData.status || 'pending');

      // Fetch Interview sessions for candidate
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select(`
          id,
          created_at,
          timer_duration_minutes,
          status,
          score_breakdown,
          interview_mode,
          session_reports (
            overall_score,
            hire_recommendation
          )
        `)
        .eq('candidate_id', candidateId);

      if (sessErr) {
        console.warn('Failed to load candidate sessions:', sessErr);
      } else {
        setSessions(sessData as any[] || []);
      }

      // Fetch Candidate Events
      const { data: eventData, error: eventErr } = await supabase
        .from('candidate_events')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });

      if (eventErr) {
        console.warn('Failed to load candidate events:', eventErr);
      } else {
        setEvents(eventData || []);
      }

    } catch (err: any) {
      toast.error(err.message || 'Failed to load candidate profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) {
      fetchCandidateDetails();
    }
  }, [candidateId]);

  // Update Status handler
  const handleStatusChange = async (newStatus: Candidate['status']) => {
    setSelectedStatus(newStatus);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: newStatus })
        .eq('id', candidateId);
      
      if (error) throw error;
      toast.success(`Status updated to ${newStatus}`);
      setCandidate(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update candidate status.');
    }
  };

  // Auto-save Notes handler (on blur)
  const handleNotesBlur = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ notes })
        .eq('id', candidateId);
      
      if (error) throw error;
      toast.success('Notes saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to auto-save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const getGitHubUsername = (url: string) => {
    if (!url) return null;
    const cleanUrl = url.trim().replace(/\/$/, "");
    if (!cleanUrl.toLowerCase().includes('github.com/')) return null;
    
    const parts = cleanUrl.split('github.com/');
    if (parts.length < 2) return null;
    
    const pathParts = parts[1].split('/').filter(Boolean);
    if (pathParts.length === 1) {
      return pathParts[0]; // Exactly 1 path element => username!
    }
    return null;
  };

  useEffect(() => {
    const username = getGitHubUsername(candidate?.github_url || '');
    if (username) {
      setLoadingRepos(true);
      fetch(`/api/github/user-repos?username=${username}`)
        .then(res => res.json())
        .then(data => {
          if (data.repos) {
            setUserRepos(data.repos);
          } else {
            console.warn('No repos found or error:', data.error);
          }
        })
        .catch(err => console.error('Failed to load user repos:', err))
        .finally(() => setLoadingRepos(false));
    } else {
      setUserRepos([]);
    }
  }, [candidate?.github_url]);

  const handleLinkSelectedRepo = async (repoUrl: string) => {
    if (!repoUrl) return;
    setUpdatingRepo(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ github_url: repoUrl })
        .eq('id', candidateId);

      if (error) throw error;

      toast.success('Successfully linked candidate repository!');
      setCandidate(prev => prev ? { ...prev, github_url: repoUrl } : null);
      setNewRepoUrl(repoUrl);
      setRepoLoadError(null);
      setLinkerError(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to link selected repository.');
    } finally {
      setUpdatingRepo(false);
    }
  };

  const isValidGitHubUrl = (url: string) => {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    return trimmed.includes('github.com/') && trimmed.split('github.com/')[1]?.split('/').filter(Boolean).length >= 2;
  };

  const handleUpdateRepoUrl = async () => {
    const trimmed = newRepoUrl.trim();
    setLinkerError(null);
    
    if (!trimmed) {
      setLinkerError('Repository URL cannot be empty.');
      return;
    }

    if (!isValidGitHubUrl(trimmed)) {
      setLinkerError('Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo).');
      return;
    }

    setUpdatingRepo(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ github_url: trimmed })
        .eq('id', candidateId);

      if (error) throw error;

      toast.success('Candidate repository link updated!');
      setCandidate(prev => prev ? { ...prev, github_url: trimmed } : null);
      setRepoLoadError(null);
      setLinkerError(null);
    } catch (err: any) {
      setLinkerError(err.message || 'Failed to update repository URL.');
    } finally {
      setUpdatingRepo(false);
    }
  };

  // Trigger Repo analysis and save Code Story to resume_extracted_data
  const handleAnalyzeRepo = () => {
    if (!candidate?.github_url) return;
    setAnalyzingRepo(true);
    setRepoLoadError(null);

    setTimeout(async () => {
      try {
        const res = await fetch('/api/session/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: candidate.github_url })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to analyze repository.');

        const codeStoryData = {
          languages: data.analysis?.languages || [],
          complexity: data.analysis?.complexity || 'Medium',
          style: data.analysis?.commit_style || 'Clean',
          overall_summary: data.analysis?.overall_summary || 'No summary available.'
        };

        // Merge into resume_extracted_data JSONB
        const updatedExtData = {
          ...(candidate.resume_extracted_data || {}),
          repoAnalysis: codeStoryData
        };

        const { error: dbErr } = await supabase
          .from('candidates')
          .update({ resume_extracted_data: updatedExtData })
          .eq('id', candidateId);

        if (dbErr) throw dbErr;

        toast.success('GitHub repository analyzed successfully!');
        setCandidate(prev => prev ? { ...prev, resume_extracted_data: updatedExtData } : null);
      } catch (err: any) {
        setRepoLoadError(err.message || 'Analysis failed.');
        toast.error(err.message || 'Analysis failed.');
      } finally {
        setAnalyzingRepo(false);
      }
    }, 0);
  };

  // Generate Questions handler: redirect to setup with JD & Candidate details pre-filled
  const handleGenerateQuestions = () => {
    if (!candidate) return;
    router.push(`/dashboard/new-session?candidateId=${candidate.id}&repoUrl=${encodeURIComponent(candidate.github_url)}&jd=${encodeURIComponent(jobDescription)}`);
  };

  // Schedule/Start Interview
  const handleScheduleInterview = () => {
    setScheduleModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1515] text-[#F1F5F9] min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#06B6D4] mb-3"></div>
        <p className="text-xs text-[#94A3B8]">Loading candidate profile...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1515] text-[#F1F5F9] min-h-screen">
        <span className="material-symbols-outlined text-4xl text-red-400 mb-2">person_off</span>
        <h4 className="text-base font-bold">Candidate not found</h4>
        <button onClick={() => router.push('/candidates')} className="mt-4 px-4 py-2 bg-[#06B6D4] text-[#0d1515] text-xs font-bold uppercase rounded-lg">
          Back to Candidates
        </button>
      </div>
    );
  }

  const initials = candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const repoAnalysis = candidate.resume_extracted_data?.repoAnalysis;

  const completedSession = sessions.find(s => s.status === 'completed');
  const hasReport = !!completedSession || typeof candidate.overall_score === 'number';
  const scoreBreakdownToUse = (completedSession as any)?.score_breakdown || (candidate.overall_score ? {
    codeQuality: candidate.overall_score || 70,
    problemSolving: (candidate.overall_score || 70) - 5,
    technicalKnowledge: (candidate.overall_score || 70) + 10,
    systemDesign: candidate.overall_score || 70,
    communication: (candidate.overall_score || 70) + 5
  } : null);

  return (
    <div className="flex-1 flex flex-col bg-[#0d1515] text-[#F1F5F9] min-h-screen p-8 overflow-y-auto">
      {/* Breadcrumbs / Back button */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/candidates')}
          className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Candidate Pipeline</span>
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-[#06B6D4]/10 border-2 border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4] font-bold text-xl select-none">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
              <span>{candidate.name}</span>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border cursor-pointer ${
                  selectedStatus === 'hired' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  selectedStatus === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  selectedStatus === 'interviewed' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                  selectedStatus === 'scheduled' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}
              >
                <option value="pending" className="bg-[#151d1e] text-[#b9cacb] font-sans text-xs">Pending</option>
                <option value="scheduled" className="bg-[#151d1e] text-[#b9cacb] font-sans text-xs">Scheduled</option>
                <option value="interviewed" className="bg-[#151d1e] text-[#b9cacb] font-sans text-xs">Interviewed</option>
                <option value="hired" className="bg-[#151d1e] text-[#b9cacb] font-sans text-xs">Hired</option>
                <option value="rejected" className="bg-[#151d1e] text-[#b9cacb] font-sans text-xs">Rejected</option>
              </select>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">{candidate.email}</p>
            <p className="text-[10px] text-[#475569] mt-1">Imported on {new Date(candidate.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setAssignProjectModalOpen(true)}
            className="px-4 py-2 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
          >
            Assign Project
          </button>
          <button
            onClick={handleScheduleInterview}
            className="px-4 py-2 border border-[#3b494b] hover:border-[#94A3B8] text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
          >
            Schedule Interview
          </button>
        </div>
      </div>

      {/* Main Split Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: 60% (Grid Col span 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* GitHub Repo section */}
          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md space-y-4">
            <div className="flex justify-between items-center border-b border-[#3b494b]/60 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">terminal</span>
                <span>GitHub Repository Context</span>
              </h3>
              {isValidGitHubUrl(candidate.github_url) && (
                <a
                  href={candidate.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#06B6D4] hover:underline flex items-center gap-1 font-mono"
                >
                  <span>View Repo</span>
                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                </a>
              )}
            </div>

            {!isValidGitHubUrl(candidate.github_url) || repoLoadError ? (
              <div className="space-y-4 py-2">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-400 text-base mt-0.5">warning</span>
                  <div className="text-xs">
                    <h5 className="font-bold text-white">
                      {repoLoadError ? 'Could Not Fetch Repository' : 'Invalid or Missing GitHub URL'}
                    </h5>
                    <p className="text-[10px] text-[#94A3B8] mt-1 leading-relaxed">
                      {repoLoadError 
                        ? `Error: ${repoLoadError}. Verify that the repository is public and the URL is correct.`
                        : `Current URL: "${candidate.github_url || 'None Linked'}". CodeWalk requires a valid public repository URL to extract code insights and generate smart interview questions.`}
                    </p>
                  </div>
                </div>

                {/* Dropdown Repository Picker for Profile URL */}
                {getGitHubUsername(candidate.github_url) && (
                  <div className="space-y-2 bg-[#06B6D4]/5 border border-[#06B6D4]/20 p-4 rounded-xl">
                    <label className="text-[10px] text-[#06B6D4] font-bold uppercase tracking-wider block">
                      Select Public Repo for {getGitHubUsername(candidate.github_url)}
                    </label>
                    <p className="text-[9px] text-[#94A3B8] mb-1">
                      CodeWalk detected a profile URL. Please select one of their repositories to link:
                    </p>
                    {loadingRepos ? (
                      <div className="flex items-center gap-2 text-xs text-[#06B6D4] py-1.5 animate-pulse">
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        <span>Loading repositories...</span>
                      </div>
                    ) : userRepos.length > 0 ? (
                      <select
                        onChange={(e) => handleLinkSelectedRepo(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2.5 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-[#F1F5F9] cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled className="bg-[#151d1e] text-[#94A3B8]">-- Select a Repository --</option>
                        {userRepos.map((repo) => (
                          <option key={repo.html_url} value={repo.html_url} className="bg-[#151d1e] text-white">
                            {repo.name} {repo.description ? `— ${repo.description.slice(0, 40)}...` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[10px] text-amber-400 italic">No public repositories found for this GitHub user profile.</p>
                    )}
                  </div>
                )}

                <div className="space-y-2 bg-[#0d1515]/40 border border-[#3b494b] p-4 rounded-xl">
                  <label className="text-[10px] text-[#06B6D4] font-bold uppercase tracking-wider block">
                    Link Candidate's GitHub Repository
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]">link</span>
                      <input
                        type="text"
                        placeholder="e.g. https://github.com/owner/repository"
                        value={newRepoUrl}
                        onChange={(e) => setNewRepoUrl(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] pl-9 pr-3 py-2.5 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleUpdateRepoUrl}
                      disabled={updatingRepo}
                      className="px-4 py-2.5 bg-[#06B6D4] hover:brightness-110 text-[#0d1515] text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer flex-shrink-0 disabled:opacity-50"
                    >
                      {updatingRepo ? 'Linking...' : 'Link Repo'}
                    </button>
                  </div>
                  {linkerError && (
                    <p className="text-[10px] text-red-400 font-medium mt-1 flex items-center gap-1 select-none">
                      <span className="material-symbols-outlined text-xs">error</span>
                      {linkerError}
                    </p>
                  )}
                </div>
              </div>
            ) : !repoAnalysis ? (
              <div className="text-center py-6">
                <p className="text-xs text-[#94A3B8] mb-4">No Code Story analysis available for this repository yet.</p>
                <button
                  onClick={handleAnalyzeRepo}
                  disabled={analyzingRepo}
                  className="px-4 py-2 bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 border border-[#06B6D4] text-[#06B6D4] font-bold text-xs uppercase rounded-lg transition-colors flex items-center gap-2 mx-auto cursor-pointer"
                >
                  {analyzingRepo ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      <span>Analyzing Repository...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm font-bold">query_stats</span>
                      <span>Analyze Repository</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0d1515] p-3 rounded-lg border border-[#3b494b]/60">
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase">Complexity</p>
                    <p className="text-xs font-bold text-white mt-1 capitalize">{repoAnalysis.complexity}</p>
                  </div>
                  <div className="bg-[#0d1515] p-3 rounded-lg border border-[#3b494b]/60">
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase">Languages</p>
                    <p className="text-xs font-bold text-white mt-1 truncate">
                      {Array.isArray(repoAnalysis.languages) ? repoAnalysis.languages.join(', ') : 'Mixed'}
                    </p>
                  </div>
                  <div className="bg-[#0d1515] p-3 rounded-lg border border-[#3b494b]/60">
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase">Commit Style</p>
                    <p className="text-xs font-bold text-white mt-1 capitalize">{repoAnalysis.style}</p>
                  </div>
                </div>

                <div className="bg-[#0d1515]/60 p-4 rounded-lg border border-[#3b494b]/60 text-xs">
                  <h5 className="font-bold text-white mb-2">Code Story Summary:</h5>
                  <p className="text-[#b9cacb] leading-relaxed whitespace-pre-line">{repoAnalysis.overall_summary}</p>
                </div>

                <button
                  onClick={handleAnalyzeRepo}
                  disabled={analyzingRepo}
                  className="text-[10px] text-[#06B6D4] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">refresh</span>
                  <span>Re-analyze repository</span>
                </button>
              </div>
            )}
          </div>

          {/* Resume Extraction Information Card */}
          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] border-b border-[#3b494b]/60 pb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">badge</span>
              <span>Extracted Resume Details</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-white text-[10px] uppercase text-[#94A3B8]">Tech Stack / Skills</h4>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {candidate.tech_stack && candidate.tech_stack.length > 0 ? (
                      candidate.tech_stack.map((tech, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-[#0d1515] border border-[#3b494b] rounded text-[10px] text-[#b9cacb] font-medium">
                          {tech}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-[#475569] italic">None extracted</span>
                    )}
                  </div>
                </div>

                {candidate.linkedin_url && (
                  <div>
                    <h4 className="font-bold text-white text-[10px] uppercase text-[#94A3B8]">LinkedIn Profile</h4>
                    <a
                      href={candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#06B6D4] hover:underline flex items-center gap-1 mt-1.5 font-mono"
                    >
                      <span className="material-symbols-outlined text-xs">link</span>
                      <span>LinkedIn Profile</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-white text-[10px] uppercase text-[#94A3B8]">Experience / Title</h4>
                  <p className="text-white font-semibold mt-1">{candidate.current_title || 'N/A'}</p>
                  {candidate.years_experience && (
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">Duration: {candidate.years_experience}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Radar Chart section */}
          {hasReport && scoreBreakdownToUse && (
            <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] border-b border-[#3b494b]/60 pb-3 flex items-center gap-1.5 font-mono">
                <span className="material-symbols-outlined text-sm font-bold">radar</span>
                <span>AI Score Dimensions Breakdown</span>
              </h3>
              <div className="flex justify-center max-w-sm mx-auto">
                <RadarChart scores={scoreBreakdownToUse} />
              </div>
            </div>
          )}

          {/* Notes auto-saving section */}
          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md space-y-3">
            <div className="flex justify-between items-center border-b border-[#3b494b]/60 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">description</span>
                <span>Private Recruiter Notes</span>
              </h3>
              {savingNotes && (
                <span className="text-[10px] text-cyan-400 font-semibold animate-pulse">Auto-saving...</span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Write assessment notes, candidate weaknesses, or background details here... (saves automatically on blur)"
              rows={4}
              className="w-full bg-[#0d1515] border border-[#3b494b] p-3 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-[#F1F5F9] placeholder-muted-text/50"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: 40% (Grid Col span 1) */}
        <div className="space-y-6">
          {/* Action: Generate Interview Questions */}
          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] border-b border-[#3b494b]/60 pb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">bolt</span>
              <span>Generate Questions</span>
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Add a target Job Description to customize interview questions specifically for this candidate&apos;s code and matching the role requirements.
            </p>
            <div className="space-y-1.5">
              <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Job Description (Optional)</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste open position JD here..."
                rows={5}
                className="w-full bg-[#0d1515] border border-[#3b494b] p-3 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-[#F1F5F9] placeholder-muted-text/50"
              />
            </div>
            <button
              onClick={handleGenerateQuestions}
              className="w-full py-3 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
            >
              <span>Setup Interview Questions</span>
              <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            </button>
          </div>

          {/* Past Sessions & Reports */}
          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] border-b border-[#3b494b]/60 pb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">history</span>
              <span>Interview Session History</span>
            </h3>

            {sessions.length === 0 ? (
              <p className="text-xs text-[#475569] italic text-center py-4">No past sessions recorded.</p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                {Object.entries(
                  sessions.reduce((groups: Record<string, SessionItem[]>, sess) => {
                    const mode = sess.interview_mode || 'technical';
                    if (!groups[mode]) groups[mode] = [];
                    groups[mode].push(sess);
                    return groups;
                  }, {})
                ).map(([mode, modeSess]) => {
                  const modeColors: Record<string, string> = {
                    technical: 'text-[#06B6D4] border-[#06B6D4]/30',
                    behavioral: 'text-purple-400 border-purple-500/30',
                    logical: 'text-orange-400 border-orange-500/30',
                    fullstack: 'text-emerald-400 border-emerald-500/30',
                    custom: 'text-gray-400 border-gray-500/30'
                  };
                  return (
                    <div key={mode} className="space-y-2">
                      <h4 className={`text-[10px] font-bold uppercase tracking-wider pl-1.5 border-l-2 capitalize ${modeColors[mode] || 'text-[#06B6D4] border-[#06B6D4]'}`}>
                        {mode === 'technical' ? 'Technical Code' :
                         mode === 'behavioral' ? 'HR Behavioral' :
                         mode === 'logical' ? 'Logical Thinking' :
                         mode === 'fullstack' ? 'Full Stack' : mode} Mode
                      </h4>
                      <div className="space-y-2">
                        {modeSess.map((sess) => {
                          const report = sess.session_reports?.[0];
                          return (
                            <div key={sess.id} className="bg-[#0d1515] border border-[#3b494b]/60 p-3 rounded-lg text-xs flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-white">{sess.timer_duration_minutes} Min Interview</p>
                                <p className="text-[10px] text-[#94A3B8] mt-0.5">{new Date(sess.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                {report ? (
                                  <>
                                    <p className="font-bold text-emerald-400 font-mono">{report.overall_score}%</p>
                                    <button
                                      onClick={() => router.push(`/session/${sess.id}/report`)}
                                      className="text-[9px] text-[#06B6D4] hover:underline uppercase font-bold mt-1 block cursor-pointer"
                                    >
                                      View Report
                                    </button>
                                  </>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                    sess.status === 'active' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                  }`}>
                                    {sess.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Communication Timeline Section */}
      <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md mt-8 space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] border-b border-[#3b494b]/60 pb-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">schedule</span>
          <span>Communication Timeline</span>
        </h3>

        {events.length === 0 ? (
          <p className="text-xs text-[#94A3B8] italic">No communication logs recorded for this candidate.</p>
        ) : (
          <div className="relative pl-6 border-l border-[#3b494b] space-y-6 ml-3">
            {events.map((e) => {
              let dotColor = 'bg-gray-400';
              let icon = 'info';
              if (e.event_type === 'imported') { dotColor = 'bg-gray-400'; icon = 'download'; }
              else if (e.event_type === 'link_sent') { dotColor = 'bg-blue-400'; icon = 'mail'; }
              else if (e.event_type === 'link_opened') { dotColor = 'bg-yellow-500'; icon = 'visibility'; }
              else if (e.event_type === 'interview_started') { dotColor = 'bg-purple-500'; icon = 'play_arrow'; }
              else if (e.event_type === 'interview_completed') { dotColor = 'bg-emerald-500'; icon = 'check_circle'; }
              else if (e.event_type === 'report_generated') { dotColor = 'bg-emerald-500'; icon = 'assessment'; }
              else if (e.event_type === 'candidate_rejected') { dotColor = 'bg-red-500'; icon = 'cancel'; }
              else if (e.event_type === 'candidate_hired') { dotColor = 'bg-cyan-400'; icon = 'verified'; }

              return (
                <div key={e.id} className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className={`absolute -left-[31px] top-0.5 md:top-1/2 md:-translate-y-1/2 w-4 h-4 rounded-full ${dotColor} flex items-center justify-center border-2 border-[#151d1e] z-10`}>
                    <span className="material-symbols-outlined text-[8px] text-[#0d1515] font-bold">{icon}</span>
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-white">{e.event_description}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">
                      {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider md:text-right">
                    By {user?.name || 'Recruiter'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {scheduleModalOpen && (
        <ScheduleInterviewModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          candidateId={candidate.id}
          candidateName={candidate.name}
          candidateEmail={candidate.email}
          onScheduleSuccess={fetchCandidateDetails}
        />
      )}

      {assignProjectModalOpen && (
        <AssignProjectModal
          isOpen={assignProjectModalOpen}
          onClose={() => setAssignProjectModalOpen(false)}
          candidate={candidate}
          onSuccess={fetchCandidateDetails}
        />
      )}

    </div>
  );
}
