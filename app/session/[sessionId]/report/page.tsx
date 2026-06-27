'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';

interface QuestionAnalysis {
  question: string;
  score: number;
  feedback: string;
}

interface ReportData {
  overall_score: number;
  hire_recommendation: 'hire' | 'maybe' | 'pass';
  recommendation_reasoning: string;
  strengths: string[];
  areas_of_improvement: string[];
  question_analysis: QuestionAnalysis[];
  final_summary: string;
}

interface Candidate {
  name: string;
  email: string;
  github_url: string;
}

interface Session {
  id: string;
  repo_url: string;
  ended_at: string;
  timer_duration_minutes: number;
}

export default function ReportPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  const { user } = useGlobal();

  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (!sessionId) return;

    const loadReportDetails = async () => {
      try {
        setLoading(true);
        // 1. Fetch Session
        const { data: sessData, error: sessErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessErr || !sessData) throw new Error(sessErr?.message || 'Session not found');
        setSession(sessData);

        // 2. Fetch Candidate
        const { data: candData, error: candErr } = await supabase
          .from('candidates')
          .select('*')
          .eq('id', sessData.candidate_id)
          .single();

        if (candErr) throw candErr;
        setCandidate(candData);

        // 3. Fetch Session Report from DB
        const { data: repData, error: repErr } = await supabase
          .from('session_reports')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle();

        let parsedReport: ReportData | null = null;
        if (repData && repData.code_story_summary) {
          try {
            parsedReport = JSON.parse(repData.code_story_summary);
          } catch (e) {
            console.warn('code_story_summary was not JSON. Re-compiling report...');
          }
        }

        if (parsedReport && parsedReport.strengths) {
          setReport(parsedReport);
        } else {
          // Self-healing: if report details aren't saved yet, compile it now
          await compileReportFromAnswers(sessionId);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load summary report.');
      } finally {
        setLoading(false);
      }
    };

    loadReportDetails();
  }, [sessionId]);

  const compileReportFromAnswers = async (sessId: string) => {
    setCompiling(true);
    try {
      // 1. Fetch questions
      const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('session_id', sessId)
        .order('order_index', { ascending: true });

      if (qErr) throw qErr;

      // 2. Fetch answers
      const { data: answers, error: ansErr } = await supabase
        .from('answers')
        .select('*')
        .eq('session_id', sessId);

      if (ansErr) throw ansErr;

      const consolidatedAnswers = (questions || []).map(q => {
        const matchingAns = (answers || []).find(a => a.question_id === q.id);
        return {
          id: q.id,
          question_text: q.question_text,
          file_path: q.file_path,
          category: q.category,
          difficulty: q.difficulty,
          answer_text: matchingAns?.answer_text || 'No response recorded.',
          score: matchingAns?.ai_score || 5
        };
      });

      // 3. Compile report via API
      const res = await fetch('/api/session/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: consolidatedAnswers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to compile report.');

      setReport(data);

      // 4. Save JSON stringified report back to code_story_summary column
      const completedCount = consolidatedAnswers.filter(a => a.answer_text.trim().length > 0).length;
      await supabase
        .from('session_reports')
        .upsert({
          session_id: sessId,
          overall_score: data.overall_score || 50,
          hire_recommendation: data.hire_recommendation || 'maybe',
          code_story_summary: JSON.stringify(data),
          total_questions: consolidatedAnswers.length,
          completed_questions: completedCount,
          generated_at: new Date().toISOString()
        }, { onConflict: 'session_id' });

    } catch (err: any) {
      console.error(err);
      setError('Could not compile report: ' + err.message);
    } finally {
      setCompiling(false);
    }
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'hire':
        return (
          <span className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-sm font-bold text-emerald-400 uppercase tracking-wider print:border-emerald-600 print:text-emerald-700">
            Strong Hire
          </span>
        );
      case 'maybe':
        return (
          <span className="px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-sm font-bold text-amber-400 uppercase tracking-wider print:border-amber-600 print:text-amber-700">
            Maybe / Interview Further
          </span>
        );
      case 'pass':
        return (
          <span className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-full text-sm font-bold text-rose-400 uppercase tracking-wider print:border-rose-600 print:text-rose-700">
            Pass
          </span>
        );
      default:
        return null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || compiling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-sm font-mono text-[#94A3B8]">
          {compiling ? 'Compiling AI screening metrics...' : 'Loading summary report...'}
        </p>
      </div>
    );
  }

  if (error || !report || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white p-8">
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-4 max-w-md text-center">
          <span className="material-symbols-outlined text-3xl font-bold mb-2">warning</span>
          <p className="font-semibold">{error || 'Data missing'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-[#151d1e] border border-[#3b494b] rounded-lg text-xs hover:bg-[#0d1515] transition-colors inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xs">arrow_back</span>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1515] text-[#F1F5F9] pb-24 print:bg-white print:text-black">
      {/* Custom print CSS styles injected */}
      <style jsx global>{`
        @media print {
          body, .min-h-screen, main, header, div {
            background-color: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            background-color: white !important;
            border: 1px solid #cbd5e1 !important;
            color: black !important;
            box-shadow: none !important;
          }
          .print-text-dark {
            color: #151d1e !important;
          }
          .print-text-light {
            color: #475569 !important;
          }
          .print-border-cyan {
            border-color: #0891b2 !important;
          }
          .print-badge-cyan {
            background-color: #ecfeff !important;
            border-color: #0891b2 !important;
            color: #0891b2 !important;
          }
        }
      `}</style>

      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-4 bg-[#151d1e] border-b border-[#3b494b] no-print">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-[#94A3B8] hover:text-[#06B6D4] p-1.5 rounded hover:bg-[#0d1515] transition-colors"
          >
            <span className="material-symbols-outlined text-lg font-bold">arrow_back</span>
          </button>
          <div>
            <h1 className="font-extrabold text-base text-[#06B6D4] tracking-tight">Technical Screening Report</h1>
            <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">CodeWalk Recopilot output</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => compileReportFromAnswers(sessionId)}
            className="text-xs px-3.5 py-1.5 font-bold rounded-lg bg-[#151d1e] border border-[#3b494b] text-[#94A3B8] hover:bg-[#0d1515] hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Recompile Report
          </button>
          
          <button
            onClick={handlePrint}
            className="text-xs px-4 py-1.5 font-bold bg-[#06B6D4] text-[#0d1515] hover:bg-[#06B6D4]/90 rounded-lg shadow-lg shadow-[#06B6D4]/10 transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm font-bold">picture_as_pdf</span>
            Export to PDF / Print
          </button>
        </div>
      </header>

      {/* Report Main Container */}
      <main className="max-w-4xl mx-auto p-8 mt-6 space-y-8 print:p-0 print:mt-0">
        
        {/* Print only Header */}
        <div className="hidden print:block border-b border-slate-300 pb-4 mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800">CodeWalk Recopilot</h1>
          <p className="text-sm text-slate-500 font-mono">AI Screening Evaluation Report</p>
        </div>

        {/* Candidate Profile Summary card */}
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-8 shadow-xl print-card flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider block print-text-light">Candidate Details</span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight print-text-dark">{candidate?.name}</h2>
            <p className="text-xs text-[#94A3B8] print-text-light font-mono">{candidate?.email}</p>
            <p className="text-xs text-[#94A3B8] print-text-light font-mono truncate max-w-md">
              GitHub repository: {session.repo_url.replace('https://github.com/', '')}
            </p>
          </div>
          
          <div className="flex items-center gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-[#3b494b]">
            <div className="text-right">
              <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1 print-text-light">Recommendation</span>
              {getRecommendationBadge(report.hire_recommendation)}
            </div>
            
            {/* Circular score chart */}
            <div className="relative h-20 w-20 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle 
                  cx="40" 
                  cy="40" 
                  r="34" 
                  strokeWidth="6" 
                  stroke="#0d1515" 
                  fill="transparent" 
                  className="print:stroke-slate-100"
                />
                <circle 
                  cx="40" 
                  cy="40" 
                  r="34" 
                  strokeWidth="6" 
                  stroke="#06B6D4" 
                  fill="transparent" 
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - (report.overall_score || 50) / 100)}`}
                  strokeLinecap="round"
                  className="print:stroke-cyan-600"
                />
              </svg>
              <div className="text-center">
                <span className="text-lg font-black text-white print:text-slate-800">{report.overall_score}</span>
                <span className="text-[10px] text-[#94A3B8] block -mt-1 print:text-slate-500">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Final Summary Brief */}
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-8 shadow-xl print-card space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#3b494b] pb-2 print-text-dark print:border-slate-300">
            Hiring Executive Reasoning
          </h3>
          <p className="text-sm leading-relaxed text-[#D1D5DB] italic font-serif print-text-light">
            "{report.recommendation_reasoning}"
          </p>
          <div className="text-xs text-[#94A3B8] print-text-light leading-relaxed pt-4 border-t border-[#3b494b] print:border-slate-300">
            <span className="font-bold text-white block mb-1 print-text-dark">Technical Analysis Summary</span>
            {report.final_summary}
          </div>
        </div>

        {/* Strengths and improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Strengths Card */}
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-6 shadow-xl print-card space-y-4">
            <h4 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider block pb-2 border-b border-[#3b494b] print-text-dark print:border-slate-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">verified</span>
              Candidate Strengths
            </h4>
            <ul className="space-y-3">
              {report.strengths.map((str, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-[#D1D5DB] print-text-light">
                  <span className="material-symbols-outlined text-[#06B6D4] text-base mt-0.5 print:text-cyan-600">check_circle</span>
                  <span>{str}</span>
                </li>
              ))}
              {report.strengths.length === 0 && (
                <p className="text-xs text-[#94A3B8] italic">No specific strengths logged.</p>
              )}
            </ul>
          </div>

          {/* Areas of Improvement Card */}
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-6 shadow-xl print-card space-y-4">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider block pb-2 border-b border-[#3b494b] print-text-dark print:border-slate-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">explore</span>
              Areas of Improvement
            </h4>
            <ul className="space-y-3">
              {report.areas_of_improvement.map((imp, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-[#D1D5DB] print-text-light">
                  <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 print:text-amber-600">arrow_right_alt</span>
                  <span>{imp}</span>
                </li>
              ))}
              {report.areas_of_improvement.length === 0 && (
                <p className="text-xs text-[#94A3B8] italic">No critical improvements flagged.</p>
              )}
            </ul>
          </div>

        </div>

        {/* Detailed Question Analysis list */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-[#3b494b] print-text-dark print:border-slate-300">
            Detailed Question Breakdown
          </h3>

          <div className="space-y-4">
            {report.question_analysis.map((qa, idx) => (
              <div 
                key={idx} 
                className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-6 shadow-xl print-card space-y-3 page-break-inside-avoid"
              >
                <div className="flex justify-between items-start gap-4">
                  <span className="text-[10px] font-mono text-[#06B6D4] uppercase tracking-wider font-bold print-text-light">
                    Question {idx + 1}
                  </span>
                  
                  <span className="px-2.5 py-0.5 bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-full text-xs font-bold text-[#06B6D4] print-badge-cyan">
                    AI Score: {qa.score || 5}/10
                  </span>
                </div>

                <h4 className="text-sm font-bold leading-relaxed text-white print-text-dark">
                  {qa.question}
                </h4>

                <div className="bg-[#0d1515]/50 border border-[#3b494b] rounded-lg p-4 text-xs text-[#94A3B8] print-card print-text-light space-y-1.5 mt-2">
                  <span className="font-extrabold text-[10px] uppercase text-white block print-text-dark">AI Evaluation</span>
                  <p className="leading-relaxed">{qa.feedback}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
