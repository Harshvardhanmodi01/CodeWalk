'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';
import RadarChart from '@/components/dashboard/RadarChart';
import { toast } from 'react-hot-toast';

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
  technical_summary?: string;
  behavioral_summary?: string;
  logical_summary?: string;
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
  interview_mode?: 'technical' | 'behavioral' | 'logical' | 'fullstack' | 'custom';
  behavioral_scores?: any[];
  logical_scores?: any[];
  mode_config?: any;
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
  const [questions, setQuestions] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [candidateAnswers, setCandidateAnswers] = useState<any[]>([]);

  // Proctoring States
  const [proctoringSummary, setProctoringSummary] = useState<any | null>(null);
  const [proctoringEvents, setProctoringEvents] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [proctoringDecision, setProctoringDecision] = useState<'clean' | 'flagged' | 'pending'>('pending');
  const [savingDecision, setSavingDecision] = useState(false);

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

        // 3. Fetch Questions & Answers to map local scores
        const { data: qsData } = await supabase
          .from('questions')
          .select('*')
          .eq('session_id', sessionId);
        setQuestions(qsData || []);

        const { data: ansData } = await supabase
          .from('answers')
          .select('*')
          .eq('session_id', sessionId);
        
        if (ansData) {
          const scoresMap: Record<string, number> = {};
          ansData.forEach((a: any) => {
            scoresMap[a.question_id] = a.ai_score;
          });
          setScores(scoresMap);
          setCandidateAnswers(ansData);
        }

        // 4. Fetch Session Report from DB
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
          await compileReportFromAnswers(sessionId, sessData);
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

  useEffect(() => {
    if (!sessionId) return;

    const fetchProctoringDetails = async () => {
      try {
        // Fetch Proctoring Summary
        const { data: summary } = await supabase
          .from('proctoring_summary')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (summary) {
          setProctoringSummary(summary);
          setRecruiterNotes(summary.recruiter_notes || '');
          setProctoringDecision(summary.proctoring_decision || 'pending');
        }

        // Fetch Proctoring Events
        const { data: events } = await supabase
          .from('proctoring_events')
          .select('*')
          .eq('session_id', sessionId)
          .order('timestamp', { ascending: true });

        if (events) {
          setProctoringEvents(events);
        }

        // Fetch Snapshots from storage
        const { data: snapshotFiles } = await supabase.storage
          .from('proctoring-snapshots')
          .list(sessionId);

        if (snapshotFiles && snapshotFiles.length > 0) {
          const paths = snapshotFiles
            .filter((f: any) => f.name !== '.emptyFolderPlaceholder')
            .map((f: any) => `${sessionId}/${f.name}`);
          
          if (paths.length > 0) {
            const { data: signedUrls } = await supabase.storage
              .from('proctoring-snapshots')
              .createSignedUrls(paths, 3600);
            
            if (signedUrls) {
              setSnapshots(signedUrls.map((item: any) => item.signedUrl));
            }
          }
        }

        // Fetch Recordings from storage
        const { data: recordingFiles } = await supabase.storage
          .from('screen-recordings')
          .list(sessionId);

        if (recordingFiles && recordingFiles.length > 0) {
          const paths = recordingFiles
            .filter((f: any) => f.name !== '.emptyFolderPlaceholder')
            .map((f: any) => `${sessionId}/${f.name}`);
          
          if (paths.length > 0) {
            const { data: signedUrls } = await supabase.storage
              .from('screen-recordings')
              .createSignedUrls(paths, 3600);
            
            if (signedUrls) {
              setRecordings(signedUrls.map((item: any) => item.signedUrl));
            }
          }
        }

      } catch (err) {
        console.error('Error fetching proctoring details:', err);
      }
    };

    fetchProctoringDetails();
  }, [sessionId]);

  const handleSaveDecision = async (decision: 'clean' | 'flagged') => {
    setSavingDecision(true);
    try {
      const { error } = await supabase
        .from('proctoring_summary')
        .update({
          proctoring_decision: decision,
          recruiter_notes: recruiterNotes,
          generated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (error) throw error;
      setProctoringDecision(decision);
      toast.success(`Candidate review marked as ${decision.toUpperCase()}`);
    } catch (e) {
      toast.error('Failed to save proctoring decision review.');
    } finally {
      setSavingDecision(false);
    }
  };

  const compileReportFromAnswers = async (sessId: string, sessObj?: Session | null) => {
    setCompiling(true);
    try {
      const activeSession = sessObj || session;
      if (!activeSession) throw new Error('Session metadata not loaded.');

      // 1. Fetch questions
      const { data: qs, error: qErr } = await supabase
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
      setCandidateAnswers(answers || []);

      const consolidatedAnswers = (qs || []).map((q: any) => {
        const matchingAns = (answers || []).find((a: any) => a.question_id === q.id);
        const hasAnswer = matchingAns && matchingAns.answer_text && matchingAns.answer_text.trim() !== '' && matchingAns.answer_text !== 'No response recorded.' && matchingAns.answer_text !== 'time_expired';
        return {
          id: q.id,
          question_text: q.question_text,
          file_path: q.file_path,
          category: q.category,
          difficulty: q.difficulty,
          answer_text: matchingAns?.answer_text || 'No response recorded.',
          score: hasAnswer ? (matchingAns.ai_score !== undefined && matchingAns.ai_score !== null ? matchingAns.ai_score : 5) : 0
        };
      });

      // 3. Compile report via API
      const res = await fetch('/api/session/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: consolidatedAnswers,
          sessionId: sessId,
          interviewMode: activeSession.interview_mode,
          behavioralScores: activeSession.behavioral_scores,
          logicalScores: activeSession.logical_scores
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to compile report.');

      setReport(data);

      // Save the updated AI scores back to the answers table
      if (data.question_analysis && Array.isArray(data.question_analysis)) {
        const updatePromises = data.question_analysis.map(async (qa: any) => {
          const matchedQ = qs?.find((q: any) => q.question_text === qa.question);
          if (matchedQ) {
            await supabase
              .from('answers')
              .update({ ai_score: qa.score })
              .eq('session_id', sessId)
              .eq('question_id', matchedQ.id);
          }
        });
        await Promise.all(updatePromises);

        // Also update local scores state so charts render updated scores instantly!
        const newScoresMap = { ...scores };
        data.question_analysis.forEach((qa: any) => {
          const matchedQ = qs?.find((q: any) => q.question_text === qa.question);
          if (matchedQ) {
            newScoresMap[matchedQ.id] = qa.score;
          }
        });
        setScores(newScoresMap);
      }

      // 4. Save JSON stringified report back to code_story_summary column
      const completedCount = consolidatedAnswers.filter((a: any) => a.answer_text.trim().length > 0).length;
      await supabase
        .from('session_reports')
        .upsert({
          session_id: sessId,
          overall_score: data.overall_score || 50,
          custom_score: data.overall_score || 50,
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

  // Map 5 Radar chart dimensions
  const getRadarData = () => {
    const techQs = questions.filter(q => ['frontend', 'backend', 'dsa'].includes(q.category));
    const techAvg = techQs.length > 0
      ? techQs.reduce((sum, q) => sum + (scores[q.id] || 5), 0) / techQs.length * 10
      : (report?.overall_score || 70);

    const sysQs = questions.filter(q => q.category === 'system-design');
    const sysAvg = sysQs.length > 0
      ? sysQs.reduce((sum, q) => sum + (scores[q.id] || 5), 0) / sysQs.length * 10
      : (report?.overall_score || 70);

    const behQs = questions.filter(q => q.category === 'behavioral');
    const behAvg = behQs.length > 0
      ? behQs.reduce((sum, q) => sum + (scores[q.id] || 5), 0) / behQs.length * 10
      : 75;

    const commAvg = session?.behavioral_scores && session.behavioral_scores.length > 0
      ? session.behavioral_scores.reduce((sum, item) => sum + (item.communication || 5), 0) / session.behavioral_scores.length * 10
      : 75;

    const logicalQsCount = questions.filter(q => q.category.includes('logical') || q.category.includes('series') || q.category.includes('deduction')).length;
    const correctCount = session?.logical_scores
      ? session.logical_scores.filter(item => item.result === 'correct').length
      : 0;
    const logicalPct = logicalQsCount > 0
      ? (correctCount / logicalQsCount) * 100
      : 75;

    return {
      codeQuality: Math.round(techAvg),
      problemSolving: Math.round(logicalPct),
      technicalKnowledge: Math.round(behAvg),
      systemDesign: Math.round(sysAvg),
      communication: Math.round(commAvg)
    };
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

  const renderProctoringReportSection = () => {
    if (!proctoringSummary && proctoringEvents.length === 0) {
      return null;
    }

    const summary = proctoringSummary;
    const score = summary?.overall_integrity_score ?? 100;
    const riskLevel = summary?.risk_level ?? 'low';

    let scoreColor = 'stroke-emerald-500 text-emerald-400';
    let riskBadge = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    if (score < 50 || riskLevel === 'critical') {
      scoreColor = 'stroke-rose-500 text-rose-500';
      riskBadge = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
    } else if (score < 80) {
      scoreColor = 'stroke-amber-500 text-amber-500';
      riskBadge = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    }

    return (
      <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-8 shadow-xl print-card space-y-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#3b494b] pb-2 print-text-dark print:border-slate-300 flex items-center justify-between">
          <span>Interview Integrity &amp; Proctoring Report</span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 border rounded-full uppercase ${riskBadge}`}>
            {riskLevel === 'critical' ? 'Critical Risk' : `${riskLevel} Risk`}
          </span>
        </h3>

        <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="relative h-28 w-28 flex items-center justify-center flex-shrink-0">
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle cx="56" cy="56" r="48" strokeWidth="8" stroke="#0d1515" fill="transparent" className="print:stroke-slate-100" />
              <circle 
                cx="56" 
                cy="56" 
                r="48" 
                strokeWidth="8" 
                className={`${scoreColor.split(' ')[0]}`}
                fill="transparent" 
                strokeDasharray={`${2 * Math.PI * 48}`}
                strokeDashoffset={`${2 * Math.PI * 48 * (1 - score / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="text-center">
              <span className={`text-2xl font-black ${scoreColor.split(' ')[1]}`}>{score}</span>
              <span className="text-xs text-[#94A3B8] block -mt-1">/100</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs w-full">
            <div className="bg-[#0d1515]/40 border border-[#3b494b]/60 rounded-lg p-3">
              <span className="text-[10px] text-[#94A3B8] block mb-1 font-mono">Tab switches</span>
              <span className="font-bold text-white text-base">{summary?.total_tab_switches ?? 0}</span>
            </div>
            <div className="bg-[#0d1515]/40 border border-[#3b494b]/60 rounded-lg p-3">
              <span className="text-[10px] text-[#94A3B8] block mb-1 font-mono">Webcam look-away / missing</span>
              <span className="font-bold text-white text-base">{summary?.total_face_not_visible_seconds ?? 0}s</span>
            </div>
            <div className="bg-[#0d1515]/40 border border-[#3b494b]/60 rounded-lg p-3">
              <span className="text-[10px] text-[#94A3B8] block mb-1 font-mono">Multiple faces</span>
              <span className="font-bold text-white text-base">{summary?.multiple_faces_count ?? 0}</span>
            </div>
            <div className="bg-[#0d1515]/40 border border-[#3b494b]/60 rounded-lg p-3">
              <span className="text-[10px] text-[#94A3B8] block mb-1 font-mono">Clipboard Copy Attempts</span>
              <span className="font-bold text-white text-base">{summary?.copy_attempts ?? 0}</span>
            </div>
            <div className="bg-[#0d1515]/40 border border-[#3b494b]/60 rounded-lg p-3">
              <span className="text-[10px] text-[#94A3B8] block mb-1 font-mono">Screen Share Stopped</span>
              <span className="font-bold text-white text-base">{summary?.screen_sharing_interruptions ?? 0}</span>
            </div>
            <div className="bg-[#0d1515]/40 border border-[#3b494b]/60 rounded-lg p-3 flex flex-col justify-center">
              <span className="text-[10px] text-[#94A3B8] block mb-1 font-mono">Overall Assessment</span>
              <span className={`font-bold capitalize text-sm ${
                proctoringDecision === 'clean' ? 'text-emerald-400' : proctoringDecision === 'flagged' ? 'text-rose-400' : 'text-amber-400'
              }`}>{proctoringDecision}</span>
            </div>
          </div>
        </div>

        {/* Snapshots Gallery */}
        {snapshots.length > 0 && (
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider block">Candidate Snapshots Gallery</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {snapshots.map((url, idx) => (
                <div key={idx} className="relative aspect-video bg-[#0d1515] border border-[#3b494b] rounded-lg overflow-hidden group cursor-zoom-in">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Webcam Snapshot ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                    View Full Size
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Screen Recording Video Gallery */}
        {recordings.length > 0 && (
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider block">Screen Recording Clips</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recordings.map((url, idx) => (
                <div key={idx} className="bg-[#0d1515] border border-[#3b494b] rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-[#94A3B8]">
                    <span className="font-bold uppercase">Recording Segment {idx + 1}</span>
                    <span className="font-mono">WebM Stream</span>
                  </div>
                  <video src={url} controls className="w-full rounded bg-black aspect-video border border-[#3b494b]/60" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chronological Event Timeline */}
        {proctoringEvents.length > 0 && (
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider block">Detailed Events Timeline</span>
            <div className="border border-[#3b494b]/60 bg-[#0d1515]/30 rounded-xl p-4 space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {proctoringEvents.map((evt, idx) => {
                let icon = 'info';
                let color = 'text-[#06B6D4] bg-[#06B6D4]/10';
                if (evt.severity === 'critical') {
                  icon = 'dangerous';
                  color = 'text-rose-400 bg-rose-500/10';
                } else if (evt.severity === 'high') {
                  icon = 'warning';
                  color = 'text-orange-400 bg-orange-500/10';
                } else if (evt.severity === 'medium') {
                  icon = 'notification_important';
                  color = 'text-amber-400 bg-amber-500/10';
                }

                const timeStr = new Date(evt.timestamp).toLocaleString();

                return (
                  <div key={evt.id || idx} className="flex gap-3 items-start text-xs border-b border-[#3b494b]/30 pb-2 last:border-0 last:pb-0">
                    <span className={`material-symbols-outlined text-sm p-1 rounded font-bold ${color}`}>{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white uppercase text-[10px] tracking-wide">
                        {evt.event_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-[#94A3B8] leading-normal font-sans">
                        {evt.details?.reason || evt.details?.message || `Incident logged (${evt.severity} severity)`}
                        {evt.duration_seconds > 0 ? ` for ${evt.duration_seconds} seconds` : ''}
                      </p>
                    </div>
                    <span className="text-[9px] text-[#94A3B8] font-mono whitespace-nowrap mt-0.5">{timeStr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recruiter Decisions Section */}
        <div className="space-y-4 pt-4 border-t border-[#3b494b]/60 no-print">
          <span className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider block">Recruiter Review Decisions</span>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block font-mono">Reviewer Notes &amp; Observations</label>
            <textarea
              value={recruiterNotes}
              onChange={(e) => setRecruiterNotes(e.target.value)}
              className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg p-3 text-xs text-white h-24 focus:outline-none focus:border-[#06B6D4] resize-none"
              placeholder="Record final observations or remarks regarding this candidate's integrity assessment..."
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleSaveDecision('clean')}
              disabled={savingDecision}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer ${
                proctoringDecision === 'clean' 
                  ? 'bg-emerald-500 text-[#0d1515] hover:bg-emerald-400' 
                  : 'border border-[#3b494b] text-emerald-400 hover:bg-emerald-500/5'
              }`}
            >
              <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
              Mark as Clean
            </button>
            <button
              onClick={() => handleSaveDecision('flagged')}
              disabled={savingDecision}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer ${
                proctoringDecision === 'flagged' 
                  ? 'bg-rose-600 text-white hover:bg-rose-500' 
                  : 'border border-[#3b494b] text-rose-500 hover:bg-rose-600/5'
              }`}
            >
              <span className="material-symbols-outlined text-sm font-bold">flag</span>
              Flag for Review
            </button>
          </div>
        </div>
      </div>
    );
  };

  const isRadarActive = session.interview_mode === 'fullstack' || session.interview_mode === 'custom';

  return (
    <div className="min-h-screen bg-[#0d1515] text-[#F1F5F9] pb-24 print:bg-white print:text-black">
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
      <header className="flex justify-between items-center px-8 py-4 bg-[#151d1e] border-b border-[#3b494b] no-print select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/dashboard')}
            className="text-[#94A3B8] hover:text-[#06B6D4] p-1.5 rounded hover:bg-[#0d1515] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg font-bold">arrow_back</span>
          </button>
          <div>
            <h1 className="font-extrabold text-base text-[#06B6D4] tracking-tight">CodeWalk Interview Report</h1>
            <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono uppercase tracking-wider">
              {session.interview_mode || 'Technical'} Mode
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => compileReportFromAnswers(sessionId)}
            className="text-xs px-3.5 py-1.5 font-bold rounded-lg bg-[#151d1e] border border-[#3b494b] text-[#94A3B8] hover:bg-[#0d1515] hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Recompile Report
          </button>
          
          <button
            onClick={handlePrint}
            className="text-xs px-4 py-1.5 font-bold bg-[#06B6D4] text-[#0d1515] hover:bg-[#06B6D4]/90 rounded-lg shadow-lg shadow-[#06B6D4]/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm font-bold">picture_as_pdf</span>
            Export / Print Report
          </button>
        </div>
      </header>

      {/* Report Main Container */}
      <main className="max-w-4xl mx-auto p-8 mt-6 space-y-8 print:p-0 print:mt-0">
        
        {/* Print only Header */}
        <div className="hidden print:block border-b border-slate-300 pb-4 mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800">CodeWalk Recopilot</h1>
          <p className="text-sm text-slate-500 font-mono">AI Screening Evaluation Report ({session.interview_mode})</p>
        </div>

        {/* Candidate Profile Summary card */}
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-8 shadow-xl print-card flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider block print-text-light">Candidate Details</span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight print-text-dark">{candidate?.name}</h2>
            <p className="text-xs text-[#94A3B8] print-text-light font-mono">{candidate?.email}</p>
            {session.repo_url && (
              <p className="text-xs text-[#94A3B8] print-text-light font-mono truncate max-w-md">
                GitHub repository: {session.repo_url.replace('https://github.com/', '')}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-[#3b494b]">
            <div className="text-right">
              <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1 print-text-light">Recommendation</span>
              {getRecommendationBadge(report.hire_recommendation)}
            </div>
            
            {/* Circular score chart */}
            <div className="relative h-20 w-20 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="34" strokeWidth="6" stroke="#0d1515" fill="transparent" className="print:stroke-slate-100" />
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
            &quot;{report.recommendation_reasoning}&quot;
          </p>
          <div className="text-xs text-[#94A3B8] print-text-light leading-relaxed pt-4 border-t border-[#3b494b] print:border-slate-300 space-y-3">
            <span className="font-bold text-white block print-text-dark">Interview Analysis Summary</span>
            <p>{report.final_summary}</p>
          </div>
        </div>

        {/* Multi-Section radar chart analysis */}
        {isRadarActive && (
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-6 shadow-xl print-card flex flex-col md:flex-row items-center gap-6 justify-center">
            <div className="w-64 h-64 flex justify-center items-center">
              <RadarChart scores={getRadarData()} size={240} />
            </div>
            <div className="flex-1 space-y-3">
              <h4 className="text-xs font-bold uppercase text-[#06B6D4]">AI Multidimensional Competence Profile</h4>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                The diagram outlines candidate competence dimensions mapped across code quality, hr traits, communication style, cognitive problem solving, and design patterns compiled during this session.
              </p>
            </div>
          </div>
        )}

        {/* Mode specific summaries (Technical, Behavioral, Logical) */}
        {(report.technical_summary || report.behavioral_summary || report.logical_summary) && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-[#3b494b] print:border-slate-300 print-text-dark">
              Section Summaries
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
              {report.technical_summary && (
                <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-xl print-card space-y-2">
                  <h4 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">Technical Capability</h4>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed print-text-light">{report.technical_summary}</p>
                </div>
              )}

              {report.behavioral_summary && (
                <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-xl print-card space-y-2">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Behavioral &amp; Culture Fit</h4>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed print-text-light">{report.behavioral_summary}</p>
                </div>
              )}

              {report.logical_summary && (
                <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-xl print-card space-y-2">
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">Logical Aptitude &amp; Reasoning</h4>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed print-text-light">{report.logical_summary}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Strengths and improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {report.strengths.length === 0 && <p className="text-xs text-[#94A3B8] italic">No specific strengths logged.</p>}
            </ul>
          </div>

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
              {report.areas_of_improvement.length === 0 && <p className="text-xs text-[#94A3B8] italic">No improvements flagged.</p>}
            </ul>
          </div>
        </div>

        {/* Proctoring integrity section */}
        {renderProctoringReportSection()}

        {/* Detailed Question Analysis list */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider pb-2 border-b border-[#3b494b] print-text-dark print:border-slate-300">
            Detailed Question Breakdown
          </h3>

          <div className="space-y-4">
            {report.question_analysis.map((qa, idx) => {
              const matchedQ = questions.find(q => q.question_text === qa.question);
              const matchedAns = matchedQ ? candidateAnswers.find(a => a.question_id === matchedQ.id) : null;
              
              return (
                <div key={idx} className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-6 shadow-xl print-card space-y-3 page-break-inside-avoid">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] font-mono text-[#06B6D4] uppercase tracking-wider font-bold print-text-light">
                      Question {idx + 1}
                    </span>
                    <span className="px-2.5 py-0.5 bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-full text-xs font-bold text-[#06B6D4] print-badge-cyan">
                      Score: {(qa.score !== undefined && qa.score !== null) ? qa.score : 5}/10
                    </span>
                  </div>
                  <h4 className="text-sm font-bold leading-relaxed text-white print-text-dark">{qa.question}</h4>
                  
                  <div className="bg-[#151d1e]/80 border border-[#3b494b]/60 rounded-lg p-4 text-xs print-card print-text-light space-y-1.5 mt-2">
                    <span className="font-extrabold text-[10px] uppercase text-[#06B6D4] block print-text-dark">Candidate Response</span>
                    <p className="leading-relaxed whitespace-pre-wrap font-mono text-[#F1F5F9] bg-[#0d1515]/30 p-2.5 rounded border border-[#3b494b]/30">
                      {matchedAns?.answer_text || 'No response recorded.'}
                    </p>
                  </div>

                  <div className="bg-[#0d1515]/50 border border-[#3b494b] rounded-lg p-4 text-xs text-[#94A3B8] print-card print-text-light space-y-1.5">
                    <span className="font-extrabold text-[10px] uppercase text-white block print-text-dark">AI Evaluation</span>
                    <p className="leading-relaxed">{qa.feedback}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
