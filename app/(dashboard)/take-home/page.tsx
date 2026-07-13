'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';
import AssignProjectModal from '@/components/modals/AssignProjectModal';

export default function TakeHomeDashboard() {
  const router = useRouter();
  const { user } = useGlobal();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  // Filter States
  const [statusFilter, setStatusFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected project for viewing brief details modal
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isViewingBrief, setIsViewingBrief] = useState(false);
  
  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Assign Project Modal state
  const [assignProjectModalOpen, setAssignProjectModalOpen] = useState(false);

  // Fetch Projects & Positions on load
  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Take-Home Projects with joined candidate and position
      const { data: projs, error: projsErr } = await supabase
        .from('take_home_projects')
        .select(`
          *,
          candidates:candidate_id (
            name,
            email,
            status
          ),
          positions:position_id (
            title
          )
        `)
        .eq('recruiter_id', user?.id)
        .order('created_at', { ascending: false });

      if (projsErr) throw projsErr;
      setProjects(projs || []);

      // 2. Fetch positions for the filter dropdown
      const { data: pos, error: posErr } = await supabase
        .from('positions')
        .select('id, title')
        .eq('recruiter_id', user?.id);

      if (posErr) throw posErr;
      setPositions(pos || []);

    } catch (err: any) {
      console.error('Failed to load take-home dashboard data:', err);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  // Immediate manual reminder trigger
  const handleSendReminder = async (projectId: string) => {
    setActionLoadingId(projectId);
    try {
      const res = await fetch('/api/take-home/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reminder.');
      }
      toast.success('Reminder email sent to candidate successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send reminder.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Start interview from completed take-home project
  const handleStartInterview = async (projectId: string) => {
    setActionLoadingId(projectId);
    try {
      const res = await fetch('/api/take-home/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate interview questions.');
      }
      
      toast.success('Interview Session initialized with take-home questions!');
      // Redirect to the newly created interview session page or standard workspace
      router.push(`/dashboard/new-session?sessionId=${data.sessionId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to initialize interview.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Stats Card Calculations
  const totalAssigned = projects.length;
  const awaitingSubmission = projects.filter(p => p.status === 'sent' || p.status === 'in_progress').length;
  const pendingReview = projects.filter(p => p.status === 'submitted').length;
  
  const evaluatedProjects = projects.filter(p => p.status === 'evaluated' && p.overall_project_score !== null);
  const averageScore = evaluatedProjects.length > 0
    ? Math.round(evaluatedProjects.reduce((acc, curr) => acc + (curr.overall_project_score || 0), 0) / evaluatedProjects.length)
    : 0;

  // Filter & Search Logic
  const filteredProjects = projects.filter(p => {
    const candidateName = p.candidates?.name?.toLowerCase() || '';
    const projectTitle = p.project_title?.toLowerCase() || '';
    const matchesSearch = candidateName.includes(searchQuery.toLowerCase()) || projectTitle.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    const matchesPosition = positionFilter ? p.position_id === positionFilter : true;
    return matchesSearch && matchesStatus && matchesPosition;
  });

  return (
    <div className="flex-1 bg-[#0d1515] text-[#F1F5F9] min-h-screen p-6 space-y-6">
      
      {/* Page Title Header */}
      <div className="flex justify-between items-center select-none">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-white">Take-Home Projects</h1>
          <p className="text-xs text-[#94A3B8] mt-1">Manage custom take-home programming assignments and candidate analysis reports.</p>
        </div>
        <button
          onClick={() => setAssignProjectModalOpen(true)}
          className="px-4 py-2 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] text-xs font-bold uppercase rounded-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer font-bold uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Assign Project</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#06B6D4]"></div>
          <p className="text-xs text-[#94A3B8]">Loading take-home assignments dashboard...</p>
        </div>
      ) : (
        <>
          {/* STATS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 select-none">
            <div className="bg-[#151d1e] border border-[#3b494b]/60 p-5 rounded-2xl shadow-md space-y-2">
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block">Total Assigned</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-[#06B6D4] font-mono">{totalAssigned}</span>
                <span className="material-symbols-outlined text-[#3b494b] text-2xl">assignment</span>
              </div>
            </div>

            <div className="bg-[#151d1e] border border-[#3b494b]/60 p-5 rounded-2xl shadow-md space-y-2">
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block">Awaiting Submission</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-amber-400 font-mono">{awaitingSubmission}</span>
                <span className="material-symbols-outlined text-[#3b494b] text-2xl">pending_actions</span>
              </div>
            </div>

            <div className="bg-[#151d1e] border border-[#3b494b]/60 p-5 rounded-2xl shadow-md space-y-2">
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block">Pending Review</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-indigo-400 font-mono">{pendingReview}</span>
                <span className="material-symbols-outlined text-[#3b494b] text-2xl">rate_review</span>
              </div>
            </div>

            <div className="bg-[#151d1e] border border-[#3b494b]/60 p-5 rounded-2xl shadow-md space-y-2">
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block">Average Score</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-emerald-400 font-mono">{averageScore > 0 ? `${averageScore}%` : '—'}</span>
                <span className="material-symbols-outlined text-[#3b494b] text-2xl">insights</span>
              </div>
            </div>
          </div>

          {/* FILTERS & SEARCH ROW */}
          <div className="bg-[#151d1e] border border-[#3b494b]/60 p-4.5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined text-[#94A3B8] text-lg absolute left-3.5 top-1/2 -translate-y-1/2 select-none">search</span>
              <input
                type="text"
                placeholder="Search candidate or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d1515] border border-[#3b494b] pl-10 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-4 items-center w-full md:w-auto justify-end">
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider select-none">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="sent">Sent</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="evaluated">Evaluated</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider select-none">Position</label>
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white cursor-pointer"
                >
                  <option value="">All Positions</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DASHBOARD PROJECTS TABLE */}
          <div className="bg-[#151d1e] border border-[#3b494b]/60 rounded-2xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#3b494b] bg-[#1a2425]/40 select-none">
                    <th className="px-6 py-4.5 font-bold uppercase text-[10px] text-[#94A3B8] tracking-wider">Candidate</th>
                    <th className="px-6 py-4.5 font-bold uppercase text-[10px] text-[#94A3B8] tracking-wider">Project Title</th>
                    <th className="px-6 py-4.5 font-bold uppercase text-[10px] text-[#94A3B8] tracking-wider">Assigned Date</th>
                    <th className="px-6 py-4.5 font-bold uppercase text-[10px] text-[#94A3B8] tracking-wider">Deadline</th>
                    <th className="px-6 py-4.5 font-bold uppercase text-[10px] text-[#94A3B8] tracking-wider text-center">Status</th>
                    <th className="px-6 py-4.5 font-bold uppercase text-[10px] text-[#94A3B8] tracking-wider text-center">Score</th>
                    <th className="px-6 py-4.5 font-bold uppercase text-[10px] text-[#94A3B8] tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3b494b]/40">
                  {filteredProjects.map((p) => {
                    const isPlagiarism = p.plagiarism_flagged;
                    const assignedDate = new Date(p.created_at).toLocaleDateString();
                    const deadlineDate = new Date(p.deadline).toLocaleDateString();
                    
                    return (
                      <tr key={p.id} className="hover:bg-[#1a2425]/20 transition-colors">
                        <td className="px-6 py-4.5">
                          <div className="font-bold text-white text-xs">{p.candidates?.name || 'Applicant'}</div>
                          <div className="text-[10px] text-[#94A3B8] mt-0.5">{p.candidates?.email || 'No email linked'}</div>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="text-white text-xs font-semibold">{p.project_title}</div>
                          {p.positions?.title && <div className="text-[9px] text-[#06B6D4] uppercase tracking-wider font-bold mt-0.5">{p.positions.title}</div>}
                        </td>
                        <td className="px-6 py-4.5 text-[#b9cacb] text-xs font-mono">{assignedDate}</td>
                        <td className="px-6 py-4.5 text-[#b9cacb] text-xs font-mono">{deadlineDate}</td>
                        <td className="px-6 py-4.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                            p.status === 'evaluated' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            p.status === 'submitted' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                            p.status === 'in_progress' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 text-center font-bold text-xs font-mono">
                          {p.overall_project_score !== null ? (
                            <span className="text-emerald-400">{p.overall_project_score}%</span>
                          ) : (
                            <span className="text-[#475569] italic">Pending</span>
                          )}
                          {isPlagiarism && (
                            <span className="ml-1 text-red-400 text-[10px] font-bold uppercase block tracking-tighter" title="Plagiarism detected!">
                              ⚠️ Copy Alert
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4.5 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setSelectedProject(p);
                                setIsViewingBrief(true);
                              }}
                              className="px-2.5 py-1.5 border border-[#3b494b] hover:border-[#94A3B8] text-[#94A3B8] hover:text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                            >
                              View Project
                            </button>
                            
                            {(p.status === 'sent' || p.status === 'in_progress') && (
                              <button
                                disabled={actionLoadingId === p.id}
                                onClick={() => handleSendReminder(p.id)}
                                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-[#0d1515] border border-amber-500 rounded-lg text-[10px] font-bold uppercase transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
                              >
                                {actionLoadingId === p.id ? (
                                  <span className="material-symbols-outlined text-[10px] animate-spin">sync</span>
                                ) : (
                                  <span className="material-symbols-outlined text-[10px]">alarm</span>
                                )}
                                <span>Remind</span>
                              </button>
                            )}

                            {(p.status === 'submitted' || p.status === 'evaluated') && (
                              <button
                                disabled={actionLoadingId === p.id}
                                onClick={() => handleStartInterview(p.id)}
                                className="px-2.5 py-1.5 bg-[#06B6D4]/10 hover:bg-[#06B6D4] text-[#06B6D4] hover:text-[#0d1515] border border-[#06B6D4] rounded-lg text-[10px] font-bold uppercase transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1"
                              >
                                {actionLoadingId === p.id ? (
                                  <span className="material-symbols-outlined text-[10px] animate-spin">sync</span>
                                ) : (
                                  <span className="material-symbols-outlined text-[10px]">forum</span>
                                )}
                                <span>Start Interview</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProjects.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-xs text-[#94A3B8]">
                        No take-home assignments found. Link a project to a candidate from their profile to populate this list.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* DETAIL MODAL: VIEW BRIEF & SCORES */}
      {isViewingBrief && selectedProject && (() => {
        let brief: any = {};
        try {
          brief = typeof selectedProject.project_brief === 'string' ? JSON.parse(selectedProject.project_brief) : selectedProject.project_brief || {};
        } catch {
          brief = {};
        }

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[#151d1e] border border-[#3b494b] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#3b494b] flex justify-between items-center select-none">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">{selectedProject.project_title}</h3>
                  <p className="text-[10px] text-[#94A3B8] uppercase mt-0.5">Candidate: {selectedProject.candidates?.name}</p>
                </div>
                <button onClick={() => setIsViewingBrief(false)} className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs text-[#b9cacb]">
                
                {/* Score breakdown if evaluated */}
                {selectedProject.status === 'evaluated' && (
                  <div className="bg-[#1a2425] border border-[#3b494b] p-5 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider border-b border-[#3b494b]/40 pb-2">Analysis Score Breakdown</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="bg-[#0d1515] p-3 rounded-lg border border-[#3b494b]/60">
                        <span className="text-[9px] text-[#94A3B8] uppercase block">Code Quality</span>
                        <span className="text-lg font-bold text-white font-mono mt-1 block">{selectedProject.code_quality_score ?? '—'}/100</span>
                      </div>
                      <div className="bg-[#0d1515] p-3 rounded-lg border border-[#3b494b]/60">
                        <span className="text-[9px] text-[#94A3B8] uppercase block">Features Met</span>
                        <span className="text-lg font-bold text-white font-mono mt-1 block">{selectedProject.feature_completion_score ?? '—'}/100</span>
                      </div>
                      <div className="bg-[#0d1515] p-3 rounded-lg border border-[#3b494b]/60">
                        <span className="text-[9px] text-[#94A3B8] uppercase block">Commit Spread</span>
                        <span className="text-lg font-bold text-white font-mono mt-1 block">{selectedProject.commit_history_score ?? '—'}/100</span>
                      </div>
                      <div className="bg-[#0d1515] p-3 rounded-lg border border-[#3b494b]/60">
                        <span className="text-[9px] text-[#94A3B8] uppercase block">AI Assisted Likelihood</span>
                        <span className="text-lg font-bold text-white font-mono mt-1 block">{selectedProject.ai_detection_score ?? '—'}%</span>
                      </div>
                    </div>

                    {selectedProject.plagiarism_flagged && (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-red-400 text-base mt-0.5">warning</span>
                        <div>
                          <h5 className="font-bold text-white text-xs">High Similarity Detected (Plagiarism Alert)</h5>
                          <p className="text-[10px] text-[#94A3B8] mt-1">
                            Matches submission from candidate <strong>{selectedProject.plagiarism_details?.match_candidate_name}</strong> by <strong>{selectedProject.plagiarism_details?.similarity_score}%</strong>.
                          </p>
                          <ul className="list-disc pl-4 text-[10px] text-red-300 mt-2 space-y-1">
                            {selectedProject.plagiarism_details?.evidence?.map((ev: string, idx: number) => (
                              <li key={idx}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submission Details */}
                {(selectedProject.status === 'submitted' || selectedProject.status === 'evaluated') && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">Submission Info</h4>
                    <div className="bg-[#0d1515] p-4 rounded-xl border border-[#3b494b]/60 space-y-2">
                      <p><strong>GitHub URL:</strong> <a href={selectedProject.submission_repo_url} target="_blank" rel="noopener noreferrer" className="text-[#06B6D4] hover:underline font-mono ml-1">{selectedProject.submission_repo_url}</a></p>
                      {selectedProject.submission_notes && <p className="mt-2 text-xs italic"><strong>Candidate Notes:</strong> "{selectedProject.submission_notes}"</p>}
                    </div>
                  </div>
                )}

                {/* Brief Summary */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">Brief Requirements</h4>
                  
                  <div className="space-y-3 bg-[#0d1515]/30 p-4.5 rounded-xl border border-[#3b494b]/40">
                    <div>
                      <p className="font-bold text-white text-xs">Problem Statement:</p>
                      <p className="mt-1 leading-relaxed">{brief.problem_statement || selectedProject.project_description}</p>
                    </div>

                    {brief.unique_twist && (
                      <div className="text-indigo-200 bg-[#818CF8]/5 p-3 rounded border border-[#818CF8]/10 mt-2">
                        <p className="font-bold uppercase text-[9px] tracking-wider">Unique Twist (Candidate-Specific):</p>
                        <p className="mt-1 leading-relaxed">{brief.unique_twist}</p>
                      </div>
                    )}

                    {brief.core_requirements && Array.isArray(brief.core_requirements) && (
                      <div>
                        <p className="font-bold text-white text-xs mb-1">Core Checklist:</p>
                        <ul className="space-y-1">
                          {brief.core_requirements.map((req: string, idx: number) => (
                            <li key={idx}>⬜ {req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {brief.bonus_requirements && Array.isArray(brief.bonus_requirements) && brief.bonus_requirements.length > 0 && (
                      <div>
                        <p className="font-bold text-white text-xs mb-1">Bonus Objectives:</p>
                        <ul className="space-y-1 text-[#94A3B8]">
                          {brief.bonus_requirements.map((req: string, idx: number) => (
                            <li key={idx}>⬜ {req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[#3b494b] flex justify-end">
                <button onClick={() => setIsViewingBrief(false)} className="px-4 py-2 bg-[#3b494b] hover:bg-[#4a5a5c] text-white font-bold rounded-lg uppercase cursor-pointer">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {assignProjectModalOpen && (
        <AssignProjectModal
          isOpen={assignProjectModalOpen}
          onClose={() => setAssignProjectModalOpen(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
