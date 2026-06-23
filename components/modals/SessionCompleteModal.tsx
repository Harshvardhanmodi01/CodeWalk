'use client';

import React from 'react';

interface Question {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  lineNumber: number;
}

interface SessionCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  repo: string;
  fileName: string;
  questions: Question[];
  ratings: Record<string, string>;
  questionTimes: Record<string, number>;
  jobId: string;
  onReset: () => void;
}

export default function SessionCompleteModal({
  isOpen,
  onClose,
  candidateName,
  repo,
  fileName,
  questions,
  ratings,
  questionTimes,
  jobId,
  onReset
}: SessionCompleteModalProps) {
  if (!isOpen) return null;

  // Calculate session score based on ratings
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
          <span className="inline-flex items-center gap-1 bg-primary-container/10 border border-primary-fixed/20 text-primary-fixed px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-tight">
            GREAT
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center gap-1 bg-primary-fixed/10 border border-primary-fixed/20 text-primary-fixed-dim px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-tight">
            GOOD
          </span>
        );
      case 'avg':
        return (
          <span className="inline-flex items-center gap-1 bg-secondary-container/10 border border-secondary/20 text-secondary px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-tight">
            AVG
          </span>
        );
      case 'poor':
        return (
          <span className="inline-flex items-center gap-1 bg-error-container/10 border border-error/20 text-error px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-tight">
            POOR
          </span>
        );
      case 'skip':
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-outline-variant/30 border border-outline-variant/30 text-on-surface-variant px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono tracking-tight">
            SKIPPED
          </span>
        );
    }
  };

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Failed to open print window. Please allow popups for this site.");
      return;
    }

    const formattedDate = new Date().toLocaleString();

    const reportHtml = `
      <html>
        <head>
          <title>CodeWalk Candidate Report - ${candidateName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0d1515; line-height: 1.6; background: #ffffff; }
            .header { border-bottom: 2px solid #00dbe9; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: start; }
            .title { font-size: 26px; font-weight: 800; margin: 0 0 10px 0; color: #080f10; letter-spacing: -0.5px; }
            .meta { font-size: 13px; color: #3b494b; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
            .score-card { background: #dbfcff; border: 1px solid #7df4ff; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 140px; text-align: center; }
            .score-val { font-size: 36px; font-weight: 800; color: #004f54; line-height: 1; }
            .score-lbl { font-size: 9px; text-transform: uppercase; color: #006970; font-weight: bold; margin-top: 4px; letter-spacing: 1px; }
            .section-title { font-size: 14px; font-weight: bold; border-bottom: 2px solid #3b494b; padding-bottom: 6px; margin-top: 30px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px; color: #080f10; }
            .question-item { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #b9cacb; page-break-inside: avoid; }
            .question-header { display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 8px; font-size: 13px; color: #080f10; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge-great { background-color: #dcfce7; color: #15803d; }
            .badge-good { background-color: #e0f2fe; color: #0369a1; }
            .badge-avg { background-color: #fef9c3; color: #a16207; }
            .badge-poor { background-color: #fee2e2; color: #b91c1c; }
            .badge-skip { background-color: #f1f5f9; color: #475569; }
            .question-text { font-style: italic; color: #3b494b; margin-bottom: 8px; font-size: 13px; }
            .notes { background: #f5f8f8; border-left: 3px solid #849495; padding: 12px; margin-top: 8px; font-size: 12px; color: #0d1515; border-radius: 0 6px 6px 0; }
            .time { font-family: monospace; color: #849495; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">CodeWalk Interview Assessment Scorecard</div>
              <div class="meta">
                <div><strong>Candidate Name:</strong> ${candidateName}</div>
                <div><strong>Source Repository:</strong> ${repo}</div>
                <div><strong>Assessed File Path:</strong> ${fileName}</div>
                <div><strong>Session Date/Time:</strong> ${formattedDate}</div>
              </div>
            </div>
            <div class="score-card">
              <div class="score-val">${overallScore}%</div>
              <div class="score-lbl">Overall Score</div>
            </div>
          </div>
          
          <div class="section-title">Evaluation Breakdown</div>
          ${questions.map((q, idx) => {
            const rating = ratings[q.id] || 'skip';
            const timeStr = formatSeconds(questionTimes[q.id] || 0);
            const notes = localStorage.getItem(`notes_${jobId}_${q.id}`) || 'No interviewer notes recorded.';
            return `
              <div class="question-item">
                <div class="question-header">
                  <span>Question Q-0${idx + 1} (${q.category} • Line ${q.lineNumber})</span>
                  <div>
                    <span class="badge badge-${rating}">${rating}</span>
                    <span class="time" style="margin-left: 12px;">🕒 ${timeStr}</span>
                  </div>
                </div>
                <div class="question-text">"${q.question}"</div>
                <div class="notes"><strong>Interviewer Notes:</strong> ${notes}</div>
              </div>
            `;
          }).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-surface border border-outline-variant rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-fixed to-primary-fixed-dim"></div>
        
        {/* Top Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-surface-container-low border-b border-outline-variant select-none">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary-fixed animate-bounce">celebration</span>
            <h1 className="font-headline-md text-lg text-on-surface font-extrabold uppercase tracking-wide">
              Assessment Completed!
            </h1>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-surface-container-high rounded-full transition-colors group"
          >
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface text-lg">close</span>
          </button>
        </div>

        {/* Scrollable Summary details */}
        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Top overview metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
            <div className="bg-surface-container-high border border-outline-variant p-4 rounded-xl flex items-center gap-4">
              <span className="h-12 min-w-[48px] shrink-0 px-3 bg-primary-fixed/10 border border-primary-fixed/20 text-primary-fixed rounded-xl flex items-center justify-center text-xl font-bold font-mono">
                {questions.length}
              </span>
              <div>
                <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Total Questions</div>
                <div className="text-sm text-on-surface font-semibold mt-0.5">Assessed & Rated</div>
              </div>
            </div>

            <div className="bg-surface-container-high border border-outline-variant p-4 rounded-xl flex items-center gap-4">
              <span className="h-12 min-w-[80px] shrink-0 px-3 bg-secondary-fixed/10 border border-secondary-fixed/20 text-secondary-fixed-dim rounded-xl flex items-center justify-center text-xl font-bold font-mono">
                {formatSeconds(Object.values(questionTimes).reduce((a, b) => a + b, 0))}
              </span>
              <div>
                <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Total Duration</div>
                <div className="text-sm text-on-surface font-semibold mt-0.5">Assessment Time</div>
              </div>
            </div>

            <div className="bg-surface-container-high border border-outline-variant p-4 rounded-xl flex items-center gap-4">
              <span className="h-12 min-w-[64px] shrink-0 px-3 bg-primary-container/10 border border-primary-fixed/20 text-primary-fixed rounded-xl flex items-center justify-center text-xl font-bold font-mono">
                {overallScore}%
              </span>
              <div>
                <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Overall Score</div>
                <div className="text-sm text-on-surface font-semibold mt-0.5">Average Performance</div>
              </div>
            </div>
          </div>

          {/* Assessment Meta Metadata */}
          <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl text-xs space-y-2 select-none">
            <h4 className="font-label-sm text-[10px] text-primary-fixed font-bold uppercase tracking-wider mb-2">Assessment Metadata</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-on-surface-variant font-mono">
              <div><strong className="text-on-surface font-semibold font-sans">Repository:</strong> {repo.replace('github.com/', '')}</div>
              <div><strong className="text-on-surface font-semibold font-sans">Assessed File:</strong> {fileName.split('/').pop()}</div>
              <div><strong className="text-on-surface font-semibold font-sans">Candidate:</strong> {candidateName}</div>
              <div><strong className="text-on-surface font-semibold font-sans">Date:</strong> {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* List of rated questions */}
          <div className="space-y-4">
            <h3 className="font-label-sm text-xs text-on-surface uppercase tracking-wider font-extrabold select-none">Question Breakdown</h3>
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const rating = ratings[q.id] || 'skip';
                const timeStr = formatSeconds(questionTimes[q.id] || 0);
                const notes = localStorage.getItem(`notes_${jobId}_${q.id}`) || 'No interviewer notes recorded.';

                return (
                  <div key={q.id} className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-5 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="bg-outline-variant/40 text-on-surface-variant px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-tight select-none">
                          Q-0{idx + 1} • {q.category}
                        </span>
                        <h4 className="text-sm text-on-surface font-semibold leading-snug">
                          {q.question}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 select-none shrink-0">
                        <span className="text-[10px] text-on-surface-variant font-mono">🕒 {timeStr}</span>
                        {getRatingBadge(rating)}
                      </div>
                    </div>

                    <div className="bg-surface-container-lowest/80 border border-outline-variant/20 rounded-lg p-3 text-xs leading-relaxed">
                      <strong className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wide block mb-1 select-none">Interviewer Notes</strong>
                      <p className="text-on-surface-variant font-medium italic">"{notes}"</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer actions */}
        <div className="p-6 bg-surface-container border-t border-outline-variant flex justify-between items-center gap-4 select-none">
          <button 
            onClick={onReset}
            className="px-6 py-2.5 bg-error-container/20 border border-error/30 text-error rounded-xl font-label-sm text-sm font-bold flex items-center gap-2 hover:bg-error-container/30 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Start New Assessment
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-surface-container-high border border-outline-variant rounded-xl font-label-sm text-sm text-on-surface hover:bg-surface-container-highest transition-colors active:scale-95"
            >
              Close
            </button>
            <button 
              onClick={handleExportPDF}
              className="px-8 py-2.5 bg-primary-fixed text-on-primary-fixed rounded-xl font-label-sm text-sm font-bold flex items-center gap-2 glow-cyan hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
