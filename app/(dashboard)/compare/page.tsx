'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import RadarChart from '@/components/dashboard/RadarChart';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CandidateComparison {
  id: string;
  name: string;
  email: string;
  github_url: string;
  linkedin_url?: string;
  role_applied?: string;
  status: 'pending' | 'screening' | 'scheduled' | 'interviewed' | 'hired' | 'rejected';
  tech_stack: string[];
  years_experience?: string;
  current_title?: string;
  overall_score?: number;
  fit_score?: 'best_fit' | 'good_fit' | 'possible_fit';
  notes?: string;
  matched_skills?: string[];
  missing_skills?: string[];
  created_at: string;
  updated_at: string;
  session?: {
    id: string;
    scheduled_at?: string;
    score_breakdown?: any;
  } | null;
  report?: {
    id: string;
    overall_score: number;
    hire_recommendation: 'hire' | 'maybe' | 'pass';
    strengths?: string[];
    weaknesses?: string[];
  } | null;
}

function ComparisonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useGlobal();

  const [candidates, setCandidates] = useState<CandidateComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const candidateIds = searchParams.get('ids')?.split(',') || [];

  useEffect(() => {
    if (!user || candidateIds.length === 0) {
      setLoading(false);
      return;
    }
    fetchComparisonData();
  }, [user, searchParams]);

  const fetchComparisonData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Candidates
      const { data: candData, error: candErr } = await supabase
        .from('candidates')
        .select('*')
        .in('id', candidateIds)
        .eq('recruiter_id', user.id);

      if (candErr) throw candErr;
      if (!candData || candData.length === 0) {
        setCandidates([]);
        return;
      }

      // 2. Fetch linked sessions and reports
      const formattedCandidates: CandidateComparison[] = [];
      for (const cand of candData) {
        // Fetch session
        const { data: sessData } = await supabase
          .from('sessions')
          .select(`
            id,
            scheduled_at,
            score_breakdown,
            report:session_reports (
              id,
              overall_score,
              hire_recommendation,
              strengths,
              weaknesses
            )
          `)
          .eq('candidate_id', cand.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const session = sessData;
        const report = sessData?.report ? (Array.isArray(sessData.report) ? sessData.report[0] : sessData.report) : null;

        // Parse skills arrays if they are strings
        const matched = Array.isArray(cand.matched_skills) 
          ? cand.matched_skills 
          : (cand.matched_skills ? cand.matched_skills.replace(/[{}]/g, '').split(',') : []);
        
        const missing = Array.isArray(cand.missing_skills) 
          ? cand.missing_skills 
          : (cand.missing_skills ? cand.missing_skills.replace(/[{}]/g, '').split(',') : []);

        formattedCandidates.push({
          ...cand,
          matched_skills: matched.filter(Boolean),
          missing_skills: missing.filter(Boolean),
          session,
          report
        });
      }

      setCandidates(formattedCandidates);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load comparison data.');
    } finally {
      setLoading(false);
    }
  };

  // Status decision helper
  const handleDecision = async (candidateId: string, decision: 'hired' | 'rejected') => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ status: decision })
        .eq('id', candidateId);

      if (error) throw error;

      await supabase.from('candidate_events').insert({
        candidate_id: candidateId,
        recruiter_id: user.id,
        event_type: decision === 'hired' ? 'candidate_hired' : 'candidate_rejected',
        event_description: `Candidate status updated to ${decision} from Comparison View`
      });

      toast.success(`Candidate marked as ${decision === 'hired' ? 'Hired' : 'Rejected'}!`);
      fetchComparisonData(); // refresh
    } catch (err: any) {
      toast.error(err.message || 'Failed to record decision.');
    }
  };

  // PDF Exporter
  const handleExportPDF = async () => {
    const element = document.getElementById('comparison-report-area');
    if (!element) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0d1515'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width
      const pageHeight = 295; // A4 height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('codewalk_candidate_comparison.pdf');
      toast.success('Comparison report PDF downloaded!');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1515] text-[#F1F5F9] min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#06B6D4] mb-3"></div>
        <p className="text-xs text-[#94A3B8]">Loading candidate profiles for comparison...</p>
      </div>
    );
  }

  if (candidates.length < 2) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1515] text-[#F1F5F9] min-h-screen space-y-4">
        <span className="material-symbols-outlined text-4xl text-[#06B6D4]">compare_arrows</span>
        <h4 className="text-base font-bold">Please select 2 or 3 candidates to compare</h4>
        <Link href="/dashboard" className="px-4 py-2 bg-[#06B6D4] text-[#0d1515] text-xs font-bold uppercase rounded-lg">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Row Highlights Calculations
  const highestScore = Math.max(...candidates.map(c => c.report?.overall_score || c.overall_score || 0));
  
  const parseExperience = (expStr?: string) => {
    if (!expStr) return 0;
    const match = expStr.match(/(\d+)/);
    return match ? parseInt(match[0]) : 0;
  };
  const highestExperience = Math.max(...candidates.map(c => parseExperience(c.years_experience)));

  const getFitPriority = (fit?: string) => {
    if (fit === 'best_fit') return 3;
    if (fit === 'good_fit') return 2;
    if (fit === 'possible_fit') return 1;
    return 0;
  };
  const bestFitVal = Math.max(...candidates.map(c => getFitPriority(c.fit_score)));

  return (
    <div className="flex-1 flex flex-col bg-[#0d1515] text-[#F1F5F9] overflow-hidden min-h-screen">
      
      {/* Header Bar */}
      <header className="flex justify-between items-center px-8 py-4 bg-[#151d1e] w-full border-b border-[#3b494b] z-10 select-none">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-[#94A3B8] hover:text-white flex items-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="text-xs uppercase font-bold tracking-wider">Dashboard</span>
          </Link>
          <span className="text-[#3b494b]">|</span>
          <span className="font-extrabold text-sm text-[#06B6D4] tracking-tight uppercase">Candidate Comparison</span>
        </div>

        <button 
          onClick={handleExportPDF}
          disabled={exporting}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#06B6D4] text-[#0d1515] text-xs font-bold uppercase tracking-wider rounded-lg hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
        >
          {exporting ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm font-bold">picture_as_pdf</span>
              <span>Export Comparison PDF</span>
            </>
          )}
        </button>
      </header>

      {/* Main workspace area */}
      <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
        <div id="comparison-report-area" className="max-w-7xl mx-auto space-y-8 bg-[#0d1515] p-6 border border-[#3b494b]/40 rounded-2xl shadow-2xl">
          
          <div className="border-b border-[#3b494b]/40 pb-4">
            <h1 className="text-2xl font-extrabold tracking-tight">Side-by-Side Evaluation</h1>
            <p className="text-xs text-[#94A3B8] mt-1">Comparing strengths, core skills, experience, and AI coding session assessments.</p>
          </div>

          {/* Grid columns */}
          <div className={`grid grid-cols-1 md:grid-cols-${candidates.length + 1} gap-6 divide-y md:divide-y-0 md:divide-x divide-[#3b494b]/30 items-start`}>
            
            {/* Column 0: Row Labels (Desktop only) */}
            <div className="hidden md:flex flex-col space-y-16 pt-32 text-xs font-bold uppercase text-[#94A3B8] tracking-widest font-mono">
              <div className="h-28 flex items-center">Overall Score</div>
              <div className="h-[300px] flex items-center">Radar Chart</div>
              <div className="h-10 flex items-center">Job Fit Score</div>
              <div className="h-20 flex items-center">Matched Skills</div>
              <div className="h-20 flex items-center">Missing Skills</div>
              <div className="h-10 flex items-center">Experience</div>
              <div className="h-10 flex items-center">Interview Date</div>
              <div className="h-16 flex items-center">Recommendation</div>
              <div className="h-32 flex items-center">Key Strengths</div>
              <div className="h-32 flex items-center">Areas of Concern</div>
              <div className="h-10 flex items-center">GitHub Context</div>
            </div>

            {/* Candidates Columns */}
            {candidates.map((c) => {
              const score = c.report?.overall_score || c.overall_score || 0;
              const isBestScore = score === highestScore && score > 0;
              const expYears = parseExperience(c.years_experience);
              const isBestExp = expYears === highestExperience && expYears > 0;
              const isBestFit = getFitPriority(c.fit_score) === bestFitVal && bestFitVal > 0;

              // Mock score breakdown if not present
              const breakdown = c.session?.score_breakdown || {
                codeQuality: score,
                problemSolving: score - 5 > 0 ? score - 5 : 0,
                technicalKnowledge: score + 10 <= 100 ? score + 10 : 100,
                systemDesign: score,
                communication: score + 5 <= 100 ? score + 5 : 100
              };

              return (
                <div key={c.id} className="flex-1 space-y-10 pt-6 md:pt-0 md:px-6">
                  {/* Photo & Name Info */}
                  <div className="flex flex-col items-center justify-center text-center space-y-3 pb-6 border-b border-[#3b494b]/30">
                    <div className="h-16 w-16 rounded-full bg-[#06B6D4]/10 border-2 border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4] font-extrabold text-xl">
                      {c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{c.name}</h3>
                      <p className="text-[10px] text-[#94A3B8]">{c.email}</p>
                      <p className="text-[10px] text-[#06B6D4] font-mono mt-1 font-semibold">{c.role_applied || 'Software Engineer'}</p>
                    </div>
                  </div>

                  {/* 1. Overall Score (Circular Progress) */}
                  <div className={`h-28 flex flex-col items-center justify-center rounded-xl p-3 border transition-colors ${
                    isBestScore ? 'bg-[#06B6D4]/10 border-[#06B6D4]/40' : 'bg-transparent border-transparent'
                  }`}>
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] mb-2 tracking-wider">Overall Score</span>
                    <div className="relative h-20 w-20 flex items-center justify-center">
                      <svg className="h-full w-full transform -rotate-90">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#3b494b" strokeWidth="4" opacity={0.3} />
                        <circle cx="40" cy="40" r="34" fill="none" stroke={score > 79 ? '#10B981' : score > 59 ? '#F59E0B' : '#EF4444'} strokeWidth="4" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - score / 100)} className="transition-all duration-1000" />
                      </svg>
                      <span className="absolute font-mono font-bold text-lg text-white">{score ? `${score}%` : 'N/A'}</span>
                    </div>
                  </div>

                  {/* 2. Radar Chart */}
                  <div className="h-[300px] flex flex-col items-center justify-center">
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] mb-2 tracking-wider">Radar Chart</span>
                    <RadarChart scores={breakdown} />
                  </div>

                  {/* 3. Job Fit Score Badge */}
                  <div className={`h-10 flex flex-col items-center justify-center rounded-lg border transition-colors ${
                    isBestFit ? 'bg-[#06B6D4]/10 border-[#06B6D4]/40' : 'bg-transparent border-transparent'
                  }`}>
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider mb-1">Job Fit Score</span>
                    {c.fit_score ? (
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        c.fit_score === 'best_fit' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        c.fit_score === 'good_fit' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {c.fit_score.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-[#94A3B8] italic">—</span>
                    )}
                  </div>

                  {/* 4. Matched Skills */}
                  <div className="h-20 flex flex-col items-center justify-center text-center">
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider mb-1">Matched Skills</span>
                    <div className="flex flex-wrap gap-1 justify-center max-h-[72px] overflow-y-auto pr-1">
                      {c.matched_skills && c.matched_skills.length > 0 ? (
                        c.matched_skills.slice(0, 5).map((s, idx) => (
                          <span key={idx} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0.5 rounded font-mono">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-[#94A3B8] italic">None identified</span>
                      )}
                    </div>
                  </div>

                  {/* 5. Missing Skills */}
                  <div className="h-20 flex flex-col items-center justify-center text-center">
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider mb-1">Missing Skills</span>
                    <div className="flex flex-wrap gap-1 justify-center max-h-[72px] overflow-y-auto pr-1">
                      {c.missing_skills && c.missing_skills.length > 0 ? (
                        c.missing_skills.slice(0, 5).map((s, idx) => (
                          <span key={idx} className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] px-1.5 py-0.5 rounded font-mono">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-[#94A3B8] italic">None identified</span>
                      )}
                    </div>
                  </div>

                  {/* 6. Years of Experience */}
                  <div className={`h-10 flex flex-col items-center justify-center text-xs font-bold text-white rounded-lg border transition-colors ${
                    isBestExp ? 'bg-[#06B6D4]/10 border-[#06B6D4]/40' : 'bg-transparent border-transparent'
                  }`}>
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider mb-1">Experience</span>
                    <span>{c.years_experience || 'N/A'}</span>
                  </div>

                  {/* 7. Interview Date */}
                  <div className="h-10 flex flex-col items-center justify-center text-xs text-white">
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider mb-1">Interview Date</span>
                    <span className="font-mono">
                      {c.session?.scheduled_at 
                        ? new Date(c.session.scheduled_at).toLocaleDateString()
                        : '—'
                      }
                    </span>
                  </div>

                  {/* 8. Recommendation */}
                  <div className="h-16 flex flex-col items-center justify-center">
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider mb-2">Recommendation</span>
                    {c.report?.hire_recommendation ? (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        c.report.hire_recommendation === 'hire' ? 'bg-emerald-500 text-[#0d1515]' :
                        c.report.hire_recommendation === 'maybe' ? 'bg-amber-500 text-[#0d1515]' :
                        'bg-red-500 text-[#0d1515]'
                      }`}>
                        {c.report.hire_recommendation}
                      </span>
                    ) : (
                      <span className="text-xs text-[#94A3B8] italic">Pending Assessment</span>
                    )}
                  </div>

                  {/* 9. Key Strengths */}
                  <div className="h-32 flex flex-col items-center text-center">
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider mb-2">Key Strengths</span>
                    <ul className="text-[10px] text-[#94A3B8] list-disc list-inside space-y-1 max-h-[110px] overflow-y-auto text-left">
                      {c.report?.strengths && c.report.strengths.length > 0 ? (
                        c.report.strengths.slice(0, 3).map((st, idx) => <li key={idx}>{st}</li>)
                      ) : (
                        <li className="list-none italic text-center">No reports generated yet</li>
                      )}
                    </ul>
                  </div>

                  {/* 10. Key Concerns */}
                  <div className="h-32 flex flex-col items-center text-center">
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider mb-2">Areas of Concern</span>
                    <ul className="text-[10px] text-[#94A3B8] list-disc list-inside space-y-1 max-h-[110px] overflow-y-auto text-left">
                      {c.report?.weaknesses && c.report.weaknesses.length > 0 ? (
                        c.report.weaknesses.slice(0, 3).map((wk, idx) => <li key={idx}>{wk}</li>)
                      ) : (
                        <li className="list-none italic text-center">No reports generated yet</li>
                      )}
                    </ul>
                  </div>

                  {/* 11. GitHub Context */}
                  <div className="h-10 flex flex-col items-center justify-center">
                    <span className="md:hidden text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider mb-1">GitHub Context</span>
                    <a 
                      href={c.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#06B6D4] hover:underline font-mono truncate max-w-[180px]"
                    >
                      {c.github_url.replace('https://github.com/', '')}
                    </a>
                  </div>

                  {/* Make Decision Action Row */}
                  <div className="pt-6 border-t border-[#3b494b]/30 flex gap-2 w-full justify-center">
                    <button
                      onClick={() => handleDecision(c.id, 'hired')}
                      disabled={c.status === 'hired'}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase rounded transition-all cursor-pointer text-center"
                    >
                      {c.status === 'hired' ? 'Shortlisted' : 'Hire'}
                    </button>
                    <button
                      onClick={() => handleDecision(c.id, 'rejected')}
                      disabled={c.status === 'rejected'}
                      className="flex-1 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50 font-bold text-xs uppercase rounded transition-all cursor-pointer text-center"
                    >
                      {c.status === 'rejected' ? 'Rejected' : 'Reject'}
                    </button>
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
}

export default function CandidateComparisonPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1515] text-[#F1F5F9] min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#06B6D4] mb-3"></div>
        <p className="text-xs text-[#94A3B8]">Loading candidate profiles...</p>
      </div>
    }>
      <ComparisonContent />
    </Suspense>
  );
}
