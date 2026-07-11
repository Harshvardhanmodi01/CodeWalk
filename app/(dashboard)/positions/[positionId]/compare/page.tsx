'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface CandidateComparisonData {
  id: string;
  name: string;
  email: string;
  github_url: string;
  fit_score: string | null;
  matched_skills: string[];
  missing_skills: string[];
  years_experience: string;
  current_title: string;
  overall_score: number | null;
  hire_recommendation: string | null;
  strengths: string[];
  weaknesses: string[];
}

export default function CandidateComparisonPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const positionId = params.positionId as string;
  const candidateIdsStr = searchParams.get('ids') || '';

  const [positionTitle, setPositionTitle] = useState('');
  const [comparisonList, setComparisonList] = useState<CandidateComparisonData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (positionId && candidateIdsStr) {
      fetchComparisonData();
    }
  }, [positionId, candidateIdsStr]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      // Fetch Position Title
      const { data: pos } = await supabase
        .from('positions')
        .select('title')
        .eq('id', positionId)
        .single();
      
      if (pos) setPositionTitle(pos.title);

      const ids = candidateIdsStr.split(',').filter(Boolean);
      if (ids.length < 2 || ids.length > 3) {
        toast.error('You can compare exactly 2 or 3 candidates.');
        router.push(`/positions/${positionId}`);
        return;
      }

      const list: CandidateComparisonData[] = [];

      for (const id of ids) {
        // Fetch candidate details
        const { data: cand } = await supabase
          .from('candidates')
          .select('*')
          .eq('id', id)
          .single();

        if (!cand) continue;

        // Fetch candidate's latest session and report
        const { data: session } = await supabase
          .from('sessions')
          .select(`
            id,
            session_reports (
              overall_score,
              hire_recommendation,
              code_story_summary
            )
          `)
          .eq('candidate_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let strengths: string[] = [];
        let weaknesses: string[] = [];
        let overallScore: number | null = null;
        let hireRecommendation: string | null = null;

        const report = session?.session_reports?.[0] || session?.session_reports; // handle single or list fallback
        const singleReport = Array.isArray(report) ? report[0] : report;

        if (singleReport) {
          overallScore = singleReport.overall_score;
          hireRecommendation = singleReport.hire_recommendation;

          if (singleReport.code_story_summary) {
            try {
              const summaryData = JSON.parse(singleReport.code_story_summary);
              strengths = summaryData.strengths || [];
              weaknesses = summaryData.improvements || summaryData.weaknesses || [];
            } catch (e) {
              console.warn('Failed to parse report summaries:', e);
            }
          }
        }

        list.push({
          id: cand.id,
          name: cand.name,
          email: cand.email,
          github_url: cand.github_url,
          fit_score: cand.fit_score || null,
          matched_skills: cand.matched_skills?.matched || [],
          missing_skills: cand.missing_skills?.missing || [],
          years_experience: cand.years_experience || '—',
          current_title: cand.current_title || '—',
          overall_score: overallScore,
          hire_recommendation: hireRecommendation,
          strengths: strengths.slice(0, 4),
          weaknesses: weaknesses.slice(0, 4)
        });
      }

      setComparisonList(list);
    } catch (err: any) {
      toast.error('Failed to load comparison profiles.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Find the highest score to highlight
  const highestScore = Math.max(...comparisonList.map(c => c.overall_score || 0));

  return (
    <div className="flex-1 flex flex-col bg-[#0d1515] text-[#F1F5F9] min-h-screen p-8 overflow-y-auto print:bg-white print:text-black print:p-0">
      
      {/* Navigation & Header */}
      <div className="flex justify-between items-center mb-8 print:hidden select-none">
        <div>
          <button
            onClick={() => router.push(`/positions/${positionId}`)}
            className="text-xs text-[#94A3B8] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer mb-2"
          >
            <span className="material-symbols-outlined text-sm font-bold">arrow_back</span>
            Back to Position Detail
          </button>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Candidate Comparison Matrix</h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">Role: <strong className="text-white">{positionTitle}</strong></p>
        </div>

        <button
          onClick={handlePrintPDF}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm font-bold">print</span>
          Export as PDF
        </button>
      </div>

      {loading ? (
        <div className="flex-grow flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#06B6D4] mb-3"></div>
          <p className="text-xs text-[#94A3B8]">Loading comparison profiles...</p>
        </div>
      ) : (
        <div className="space-y-6 print:space-y-0">
          
          {/* Side-by-Side Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch print:grid-cols-3 print:gap-4">
            {comparisonList.map((cand) => {
              const initials = cand.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              const isBestScore = cand.overall_score !== null && cand.overall_score === highestScore;

              return (
                <div
                  key={cand.id}
                  className={`bg-[#151d1e] border rounded-2xl p-6 flex flex-col justify-between transition-all print:border-black print:bg-white print:text-black ${
                    isBestScore ? 'border-[#06B6D4] shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'border-[#3b494b]/60'
                  }`}
                >
                  <div className="space-y-6">
                    {/* Header Card */}
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-full bg-[#0d1515] border border-[#3b494b] flex items-center justify-center font-bold text-[#06B6D4] text-lg mx-auto mb-3 print:bg-gray-100 print:text-black print:border-black">
                        {initials}
                      </div>
                      <h3 className="text-base font-extrabold text-white print:text-black">{cand.name}</h3>
                      <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5 print:text-gray-600">{cand.email}</p>
                    </div>

                    <hr className="border-[#3b494b]/30 print:border-gray-300" />

                    {/* Fit Score */}
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#06B6D4] font-bold block mb-1">Role Match Fit</span>
                      {cand.fit_score ? (
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${
                          cand.fit_score === 'best_fit' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          cand.fit_score === 'good_fit' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        }`}>
                          {cand.fit_score.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-xs text-[#94A3B8] italic">Not Scored</span>
                      )}
                    </div>

                    {/* Matched Skills */}
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mb-1">Matched Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {cand.matched_skills.map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-[#0d1515] text-[9px] font-mono rounded text-[#94A3B8] border border-[#3b494b]/60 print:bg-gray-100 print:text-black">
                            {s}
                          </span>
                        ))}
                        {cand.matched_skills.length === 0 && (
                          <span className="text-xs text-[#94A3B8] italic">None matching</span>
                        )}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-orange-400 font-bold block mb-1">Missing Skills</span>
                      <div className="flex flex-wrap gap-1">
                        {cand.missing_skills.map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-[#0d1515] text-[9px] font-mono rounded text-[#94A3B8] border border-[#3b494b]/60 print:bg-gray-100 print:text-black">
                            {s}
                          </span>
                        ))}
                        {cand.missing_skills.length === 0 && (
                          <span className="text-xs text-[#94A3B8] italic">No missing skills</span>
                        )}
                      </div>
                    </div>

                    <hr className="border-[#3b494b]/30 print:border-gray-300" />

                    {/* Interview Results */}
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#06B6D4] font-bold block mb-1">Evaluation Score</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-white font-mono print:text-black">
                          {cand.overall_score !== null ? `${cand.overall_score}%` : '—'}
                        </span>
                        {isBestScore && (
                          <span className="text-[9px] bg-[#06B6D4]/10 border border-[#06B6D4]/20 text-[#06B6D4] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Best Score
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold block mb-1">Hire Recommendation</span>
                      <span className={`text-xs font-bold uppercase ${
                        cand.hire_recommendation === 'hire' ? 'text-emerald-400' :
                        cand.hire_recommendation === 'pass' ? 'text-red-400' :
                        'text-amber-400'
                      }`}>
                        {cand.hire_recommendation || 'Pending Evaluation'}
                      </span>
                    </div>

                    {/* Experience Level */}
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#94A3B8] font-bold block mb-0.5">Experience & Title</span>
                      <p className="text-xs text-white print:text-black font-semibold">
                        {cand.current_title} · {cand.years_experience}
                      </p>
                    </div>

                    <hr className="border-[#3b494b]/30 print:border-gray-300" />

                    {/* Strengths */}
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mb-2">Key Strengths</span>
                      <ul className="space-y-1.5 text-xs text-[#94A3B8] list-disc pl-4 print:text-gray-800">
                        {cand.strengths.map((str, sIdx) => (
                          <li key={sIdx}>{str}</li>
                        ))}
                        {cand.strengths.length === 0 && (
                          <li className="italic list-none pl-0">Pending interview assessment</li>
                        )}
                      </ul>
                    </div>

                    {/* Weaknesses */}
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-orange-400 font-bold block mb-2">Areas of Improvement</span>
                      <ul className="space-y-1.5 text-xs text-[#94A3B8] list-disc pl-4 print:text-gray-800">
                        {cand.weaknesses.map((weak, wIdx) => (
                          <li key={wIdx}>{weak}</li>
                        ))}
                        {cand.weaknesses.length === 0 && (
                          <li className="italic list-none pl-0">Pending interview assessment</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
