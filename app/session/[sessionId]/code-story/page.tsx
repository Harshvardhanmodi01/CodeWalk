'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';

interface AnalysisData {
  languages_used: string[];
  primary_language: string;
  code_complexity: 'low' | 'medium' | 'high';
  commit_style: 'consistent' | 'irregular' | 'last-minute';
  project_type: string;
  notable_patterns: string[];
  potential_weaknesses: string[];
  overall_summary: string;
  candidate_brief: string;
}

interface Session {
  id: string;
  repo_url: string;
  candidate_id: string;
}

interface Candidate {
  name: string;
  email: string;
}

export default function CodeStoryPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  const { user } = useGlobal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [githubAvatar, setGithubAvatar] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (!sessionId) return;

    const loadData = async () => {
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
          .select('name, email')
          .eq('id', sessData.candidate_id)
          .single();

        if (candErr) throw candErr;
        setCandidate(candData);

        // 3. Fetch Analyze API
        const res = await fetch('/api/session/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: sessData.repo_url })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to analyze repository.');

        setAnalysis(data.analysis);
        setGithubAvatar(data.githubAvatarUrl || `https://github.com/${data.owner}.png`);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to fetch code story details.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-sm font-mono text-[#94A3B8]">Compiling codebase archaeology...</p>
      </div>
    );
  }

  if (error || !analysis || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-white p-8">
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-4 max-w-md text-center">
          <span className="material-symbols-outlined text-3xl font-bold mb-2">warning</span>
          <p className="font-semibold">{error || 'Data missing'}</p>
          <button
            onClick={() => router.push(`/session/${sessionId}`)}
            className="mt-4 px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-xs hover:bg-[#0F172A] transition-colors inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xs">arrow_back</span>
            Back to Screening
          </button>
        </div>
      </div>
    );
  }

  // Visual helper for complexity color
  const getComplexityColor = (comp: string) => {
    switch (comp) {
      case 'low': return 'text-emerald-400';
      case 'medium': return 'text-[#06B6D4]';
      case 'high': return 'text-amber-500';
      default: return 'text-white';
    }
  };

  // Visual helper for commit style color
  const getCommitStyleColor = (style: string) => {
    switch (style) {
      case 'consistent': return 'text-emerald-400';
      case 'irregular': return 'text-amber-500';
      case 'last-minute': return 'text-rose-500';
      default: return 'text-white';
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] flex flex-col">
      {/* Top Header */}
      <header className="flex justify-between items-center px-8 py-4 bg-[#1E293B] border-b border-[#334155] select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push(`/session/${sessionId}`)}
            className="text-[#94A3B8] hover:text-[#06B6D4] p-1.5 rounded hover:bg-[#0F172A] transition-colors"
          >
            <span className="material-symbols-outlined text-lg font-bold">arrow_back</span>
          </button>
          <div>
            <h1 className="font-extrabold text-base text-[#06B6D4] tracking-tight">Code Story Workspace</h1>
            <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">Archival insights for {candidate?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs bg-[#0F172A] border border-[#334155] px-3 py-1.5 rounded-lg">
          <img 
            src={githubAvatar} 
            alt="GitHub Avatar" 
            className="h-5 w-5 rounded-full border border-[#06B6D4]/30" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://github.com/github.png';
            }}
          />
          <span className="font-mono text-[#94A3B8] truncate max-w-xs">{session.repo_url.replace('https://github.com/', '')}</span>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-grow p-8 max-w-6xl mx-auto w-full space-y-6 pb-24">
        
        {/* Core Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Donut / Language Usage Card */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 shadow-xl flex flex-col justify-between h-56">
            <div>
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">Languages Used</span>
              <h3 className="text-2xl font-bold text-white tracking-tight">{analysis.primary_language}</h3>
              <p className="text-xs text-[#94A3B8] mt-1">Primary language identified in repository</p>
            </div>
            
            <div className="space-y-2 pt-4 border-t border-[#334155]">
              <div className="flex flex-wrap gap-1.5">
                {analysis.languages_used.map((lang, idx) => (
                  <span 
                    key={idx} 
                    className="px-2 py-0.5 bg-[#0F172A] border border-[#334155] rounded text-[10px] text-[#F1F5F9] font-semibold"
                  >
                    {lang}
                  </span>
                ))}
              </div>
              <div className="w-full bg-[#0F172A] h-1.5 rounded-full overflow-hidden flex">
                {analysis.languages_used.map((_, idx) => (
                  <div 
                    key={idx} 
                    className="h-full" 
                    style={{ 
                      width: `${100 / analysis.languages_used.length}%`,
                      backgroundColor: idx === 0 ? '#06B6D4' : idx === 1 ? '#10B981' : idx === 2 ? '#F59E0B' : '#64748B'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Complexity Gauge Card */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 shadow-xl flex flex-col justify-between h-56">
            <div>
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">Code Complexity</span>
              <h3 className={`text-2xl font-bold tracking-tight uppercase ${getComplexityColor(analysis.code_complexity)}`}>
                {analysis.code_complexity}
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1">Based on nesting depth and file length parameters</p>
            </div>

            {/* Visual Gauge Bar */}
            <div className="space-y-2 pt-4 border-t border-[#334155]">
              <div className="flex justify-between text-[10px] font-bold text-[#94A3B8]">
                <span>LOW</span>
                <span>MEDIUM</span>
                <span>HIGH</span>
              </div>
              <div className="w-full bg-[#0F172A] h-2 rounded-full relative overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    analysis.code_complexity === 'low' 
                      ? 'w-1/3 bg-emerald-400' 
                      : analysis.code_complexity === 'medium' 
                      ? 'w-2/3 bg-[#06B6D4]' 
                      : 'w-full bg-amber-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Commit Style Card */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 shadow-xl flex flex-col justify-between h-56">
            <div>
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-2">Commit Regularity</span>
              <h3 className={`text-2xl font-bold tracking-tight uppercase ${getCommitStyleColor(analysis.commit_style)}`}>
                {analysis.commit_style}
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1">Archeology rating of version control patterns</p>
            </div>

            {/* Visual bar graph */}
            <div className="space-y-2 pt-4 border-t border-[#334155] flex flex-col justify-end">
              <div className="flex items-end justify-between h-8 px-4">
                <div 
                  className={`w-3.5 rounded-t ${analysis.commit_style === 'consistent' ? 'bg-emerald-400 h-8' : 'bg-emerald-400/25 h-3'}`} 
                  title="Consistent style indicator"
                />
                <div 
                  className={`w-3.5 rounded-t ${analysis.commit_style === 'irregular' ? 'bg-[#06B6D4] h-8' : 'bg-[#06B6D4]/25 h-4'}`} 
                  title="Irregular style indicator"
                />
                <div 
                  className={`w-3.5 rounded-t ${analysis.commit_style === 'last-minute' ? 'bg-rose-500 h-8' : 'bg-rose-500/25 h-2'}`} 
                  title="Last-minute style indicator"
                />
              </div>
              <div className="flex justify-between text-[8px] text-[#475569] font-bold">
                <span>CONSISTENT</span>
                <span>IRREGULAR</span>
                <span>LAST-MINUTE</span>
              </div>
            </div>
          </div>

        </div>

        {/* Large Summary Cards */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-8 shadow-xl space-y-6">
          <div className="border-b border-[#334155] pb-4">
            <h2 className="text-lg font-bold text-white">AI Capability Brief</h2>
            <p className="text-xs text-[#06B6D4] font-semibold mt-1">Project Type: {analysis.project_type}</p>
          </div>
          <p className="text-sm leading-relaxed text-[#D1D5DB] italic font-serif">
            "{analysis.candidate_brief}"
          </p>
          <div className="pt-4 border-t border-[#334155] text-xs text-[#94A3B8] leading-relaxed">
            <span className="font-bold text-white block mb-1">Architecture Summary</span>
            {analysis.overall_summary}
          </div>
        </div>

        {/* Architectural Analysis: Strengths vs Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Notable Patterns */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#06B6D4] tracking-wide flex items-center gap-1.5 uppercase">
              <span className="material-symbols-outlined text-sm">verified</span>
              Notable Design Patterns
            </h3>
            <ul className="space-y-3">
              {analysis.notable_patterns.map((pat, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-xs text-[#D1D5DB]">
                  <span className="material-symbols-outlined text-[#06B6D4] text-base mt-0.5">check_circle</span>
                  <span>{pat}</span>
                </li>
              ))}
              {analysis.notable_patterns.length === 0 && (
                <p className="text-xs text-[#94A3B8] italic">No notable patterns identified.</p>
              )}
            </ul>
          </div>

          {/* Potential Weaknesses */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-amber-500 tracking-wide flex items-center gap-1.5 uppercase">
              <span className="material-symbols-outlined text-sm">warning</span>
              Areas to Explore / Potential Risks
            </h3>
            <ul className="space-y-3">
              {analysis.potential_weaknesses.map((weak, idx) => (
                <li key={idx} className="flex gap-2.5 items-start text-xs text-[#D1D5DB]">
                  <span className="material-symbols-outlined text-amber-500 text-base mt-0.5">error</span>
                  <span>{weak}</span>
                </li>
              ))}
              {analysis.potential_weaknesses.length === 0 && (
                <p className="text-xs text-[#94A3B8] italic">No significant risks identified.</p>
              )}
            </ul>
          </div>

        </div>

      </main>
    </div>
  );
}
