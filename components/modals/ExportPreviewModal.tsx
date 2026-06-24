'use client';

import React, { useState } from 'react';

interface Question {
  id: string;
  question: string;
  category: string;
  difficulty: string;
}

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  repo: string;
  questions: Question[];
  ratings: Record<string, string>; // Maps questionId -> rating ('poor' | 'avg' | 'good' | 'great' | 'skip')
}

export default function ExportPreviewModal({
  isOpen,
  onClose,
  candidateName,
  repo,
  questions,
  ratings
}: ExportPreviewModalProps) {
  const [interviewerName, setInterviewerName] = useState('Marcus Holloway');
  const [role, setRole] = useState('Lead Frontend Engineer');
  const [date, setDate] = useState('October 24, 2026');
  const [summaryText, setSummaryText] = useState(
    'Candidate demonstrated strong problem-solving capabilities. Code structures are clean and logical, though there is room for improvement in edge case validation.'
  );

  if (!isOpen) return null;

  // Calculate score based on ratings
  const calculateScore = () => {
    let totalScore = 0;
    let countedQuestions = 0;

    questions.forEach((q) => {
      const rating = ratings[q.id] || 'skip';
      if (rating === 'skip') return;

      countedQuestions++;
      if (rating === 'poor') totalScore += 30;
      else if (rating === 'avg') totalScore += 60;
      else if (rating === 'good') totalScore += 85;
      else if (rating === 'great') totalScore += 100;
    });

    if (countedQuestions === 0) return 0;
    return Math.round(totalScore / countedQuestions);
  };

  const overallScore = calculateScore();

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'great':
        return (
          <span className="inline-flex items-center gap-1.5 bg-primary-container/10 border border-primary-fixed/20 text-primary-fixed px-2 py-0.5 rounded-sm font-label-sm text-[10px] font-mono">
            GREAT
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center gap-1.5 bg-primary-fixed/10 border border-primary-fixed/20 text-primary-fixed-dim px-2 py-0.5 rounded-sm font-label-sm text-[10px] font-mono">
            GOOD
          </span>
        );
      case 'avg':
        return (
          <span className="inline-flex items-center gap-1.5 bg-secondary-container/10 border border-secondary/20 text-secondary px-2 py-0.5 rounded-sm font-label-sm text-[10px] font-mono">
            AVG
          </span>
        );
      case 'poor':
        return (
          <span className="inline-flex items-center gap-1.5 bg-error-container/10 border border-error/20 text-error px-2 py-0.5 rounded-sm font-label-sm text-[10px] font-mono">
            POOR
          </span>
        );
      case 'skip':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-outline-variant/30 border border-outline-variant/30 text-on-surface-variant px-2 py-0.5 rounded-sm font-label-sm text-[10px] font-mono">
            SKIPPED
          </span>
        );
    }
  };

  const handleDownload = () => {
    alert(`Downloading PDF assessment report for ${candidateName}...\nOverall Score: ${overallScore}%`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 md:p-8">
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl h-full max-h-[85vh] bg-surface border border-outline-variant rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-surface-container-low border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary-fixed">description</span>
            <h1 className="font-headline-md text-lg text-on-surface font-bold">CodeWalk Report Preview</h1>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-surface-variant rounded-full transition-colors group"
          >
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface">close</span>
          </button>
        </div>

        {/* Scrollable Layout split into Input configurations + Paper scorecard page */}
        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Settings / Exporter Fields configuration */}
          <div className="lg:col-span-4 space-y-4 bg-surface-container-high/40 border border-outline-variant p-5 rounded-lg h-fit select-none">
            <h4 className="font-label-sm text-xs text-primary-fixed uppercase tracking-wider font-bold mb-4">
              Report Settings
            </h4>
            
            <div className="space-y-3 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-on-surface-variant font-bold">Interviewer Name</label>
                <input 
                  type="text" 
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant p-2 rounded text-on-surface outline-none focus:border-primary-fixed"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-on-surface-variant font-bold">Candidate Position / Role</label>
                <input 
                  type="text" 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant p-2 rounded text-on-surface outline-none focus:border-primary-fixed"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-on-surface-variant font-bold">Date</label>
                <input 
                  type="text" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant p-2 rounded text-on-surface outline-none focus:border-primary-fixed"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-on-surface-variant font-bold">Executive Remarks Summary</label>
                <textarea 
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  rows={4}
                  className="bg-surface-container-lowest border border-outline-variant p-2 rounded text-on-surface outline-none focus:border-primary-fixed resize-none"
                />
              </div>
            </div>
          </div>

          {/* PDF Printable Document Paper Sheet */}
          <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant p-8 md:p-10 shadow-lg relative min-h-[500px]">
            {/* Design header border decorator */}
            <div className="absolute top-0 left-0 w-full h-1 bg-primary-fixed"></div>

            {/* Paper Header */}
            <div className="flex justify-between items-start gap-6 mb-8 border-b border-outline-variant/30 pb-6">
              <div className="space-y-4">
                <div>
                  <div className="text-primary-fixed font-label-sm text-[10px] uppercase tracking-wider font-bold">Technical Assessment Scorecard</div>
                  <h2 className="font-headline-lg text-xl text-on-surface font-extrabold mt-1">CodeWalk Report for {candidateName}</h2>
                </div>
                
                {/* Meta details list */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-[10px] text-on-surface-variant uppercase font-bold">Interviewer</span>
                    <span className="text-on-surface font-semibold">{interviewerName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-on-surface-variant uppercase font-bold">Target Position</span>
                    <span className="text-on-surface font-semibold">{role}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-on-surface-variant uppercase font-bold">Date</span>
                    <span className="text-on-surface font-semibold">{date}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-on-surface-variant uppercase font-bold">Source Repository</span>
                    <span className="text-on-surface font-mono truncate block max-w-[150px]">{repo}</span>
                  </div>
                </div>
              </div>

              {/* Overall Score Dial Indicator */}
              <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" fill="none" r="16" stroke="#2e3637" strokeWidth="2.5"></circle>
                  <circle 
                    className="text-primary-fixed-dim" 
                    cx="18" 
                    cy="18" 
                    fill="none" 
                    r="16" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeDasharray={`${overallScore}, 100`}
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-bold text-primary-fixed">{overallScore}</span>
                  <span className="text-[8px] font-label-sm text-on-surface-variant uppercase tracking-tighter">Score %</span>
                </div>
              </div>
            </div>

            {/* Questions Breakdown List */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                <span className="material-symbols-outlined text-primary-fixed text-sm">terminal</span>
                <h3 className="font-label-sm text-[10px] text-on-surface uppercase tracking-widest font-bold">Question breakdown</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant text-[10px] text-on-surface-variant uppercase">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 px-2">Competency / Category</th>
                      <th className="py-2 px-2">Assessment</th>
                      <th className="py-2 pl-4 text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 text-on-surface-variant">
                    {questions.map((q, idx) => {
                      const rating = ratings[q.id] || 'skip';
                      return (
                        <tr key={q.id} className="hover:bg-surface-variant/10">
                          <td className="py-3 pr-4 font-mono font-semibold">Q-0{idx + 1}</td>
                          <td className="py-3 px-2 text-on-surface font-semibold">{q.category}</td>
                          <td className="py-3 px-2">{getRatingBadge(rating)}</td>
                          <td className="py-3 pl-4 text-right font-bold font-mono text-primary-fixed">
                            {rating === 'great' ? '10/10' : rating === 'good' ? '8/10' : rating === 'avg' ? '6/10' : rating === 'poor' ? '3/10' : '0/10'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Remarks Box */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
                  <span className="material-symbols-outlined text-primary-fixed text-sm font-bold">edit_note</span>
                  <h3 className="font-label-sm text-[10px] text-on-surface uppercase tracking-widest font-bold">Executive summary remarks</h3>
                </div>
                <div className="bg-surface border border-outline-variant p-4 text-xs leading-relaxed text-on-surface-variant/90 rounded">
                  {summaryText}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer actions */}
        <div className="p-6 bg-surface-container border-t border-outline-variant flex justify-end items-center gap-4 select-none">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded font-label-sm text-sm text-on-surface hover:bg-surface-container-highest transition-all duration-200 active:scale-95"
          >
            Cancel
          </button>
          <button 
            onClick={handleDownload}
            className="px-8 py-2 bg-primary-fixed text-on-primary-fixed font-label-sm text-sm font-bold flex items-center gap-2 glow-cyan hover:brightness-110 transition-all duration-200 active:scale-95 rounded"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Download PDF
          </button>
        </div>

      </div>
    </div>
  );
}
