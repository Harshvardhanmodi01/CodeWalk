'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalysisItem {
  jobId: string;
  repo: string;
  candidateName: string;
  status: 'READY' | 'SCANNING' | 'ARCHIVED' | 'completed';
  createdAt: string;
  questionsCount: number;
  score: number;
}

export default function RecentAnalyses() {
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);

  useEffect(() => {
    // Check if analyses are stored in localStorage, otherwise seed them
    const stored = localStorage.getItem('cw_analyses');
    if (stored) {
      setAnalyses(JSON.parse(stored));
    } else {
      const defaultAnalyses: AnalysisItem[] = [
        {
          jobId: 'job_abc123',
          repo: 'github.com/johndoe/ecommerce-app',
          candidateName: 'Rahul Sharma',
          status: 'READY',
          createdAt: '2 hours ago',
          questionsCount: 6,
          score: 84
        },
        {
          jobId: 'job_react',
          repo: 'github.com/facebook/react',
          candidateName: 'Sarah Chen',
          status: 'READY',
          createdAt: 'Yesterday',
          questionsCount: 4,
          score: 92
        },
        {
          jobId: 'job_next',
          repo: 'github.com/vercel/next.js',
          candidateName: 'Marcus Brody',
          status: 'SCANNING',
          createdAt: 'Just now',
          questionsCount: 8,
          score: 0
        },
        {
          jobId: 'job_tailwind',
          repo: 'github.com/tailwindlabs/tailwindcss',
          candidateName: 'Elena Rostova',
          status: 'ARCHIVED',
          createdAt: '3 days ago',
          questionsCount: 5,
          score: 78
        }
      ];
      localStorage.setItem('cw_analyses', JSON.stringify(defaultAnalyses));
      setAnalyses(defaultAnalyses);
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
      case 'completed':
        return (
          <span className="bg-primary-fixed/10 text-primary-fixed text-[10px] font-bold px-2 py-0.5 rounded border border-primary-fixed/20">
            READY
          </span>
        );
      case 'SCANNING':
        return (
          <span className="bg-secondary/10 text-secondary text-[10px] font-bold px-2 py-0.5 rounded border border-secondary/20 animate-pulse">
            SCANNING
          </span>
        );
      case 'ARCHIVED':
      default:
        return (
          <span className="bg-outline-variant/30 text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded border border-outline-variant/50">
            ARCHIVED
          </span>
        );
    }
  };

  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-dashed border-outline-variant rounded-xl bg-surface-container/20 text-center space-y-4">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant/40">folder_open</span>
        <div>
          <h4 className="text-on-surface font-semibold text-body-md">No analyses found</h4>
          <p className="text-xs text-on-surface-variant max-w-sm mt-1">
            Paste your first GitHub repo URL above to analyze code structures and generate assessments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest opacity-50 text-[10px] font-bold">
          Recent Analyses
        </p>
        <span className="text-[10px] text-on-surface-variant font-bold">{analyses.length} Total</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analyses.map((item) => (
          <Link
            key={item.jobId}
            href={item.status === 'SCANNING' ? '/dashboard/loading' : `/results/${item.jobId}`}
            className="group block p-4 bg-surface-container border border-outline-variant hover:border-primary-fixed/40 transition-colors rounded-xl shadow-sm"
          >
            <div className="flex justify-between items-start gap-4 mb-2">
              <div className="truncate">
                <h4 className="font-code-md text-code-md text-on-surface truncate group-hover:text-primary-fixed transition-colors font-mono">
                  {item.repo}
                </h4>
                <p className="text-xs text-on-surface-variant/80 mt-1">
                  Candidate: <span className="text-on-surface font-semibold">{item.candidateName}</span>
                </p>
              </div>
              {getStatusBadge(item.status)}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-outline-variant/10 text-[10px] text-on-surface-variant">
              <span>{item.createdAt}</span>
              {item.status === 'READY' && (
                <span className="font-semibold text-primary-fixed">
                  {item.questionsCount} Questions • Score: {item.score}%
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
