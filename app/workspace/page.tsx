'use client';

/**
 * CodeWalk Analyzer Workspace — redesigned UI matching the new dark/light theme mockup.
 * Preserves: per-file slides, scorecard, PDF export, ratings, notes, and keyboard nav.
 * Integrates: Global State, Token consumption, and subscription restrictions.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { useGlobal } from '@/app/context/GlobalContext';

interface CodeSnapshot {
  lineNumber: number;
  snippet: string;
}
interface FileBlock {
  fileName: string;
  questions: string;
  codeSnapshots: CodeSnapshot[];
}
interface AnalyzeResponse {
  success: boolean;
  repo: string;
  files: FileBlock[];
  readmeQuestions: string;
  genericQuestions: string;
  warnings: string[];
  summary: { successfulFiles: number; totalFiles: number; totalQuestions: number };
  timing: { totalMs: number };
}

interface ParsedQuestion {
  id: string;
  tag: string;
  category: 'Code Logic' | 'Project Logic' | 'Documentation' | 'Generic';
  lineNumber: number | null;
  question: string;
  answer: string;
  snippet?: string;
}

interface SlideData {
  title: string;
  fileName?: string;
  questions: ParsedQuestion[];
}

interface ScoreEntry {
  rating: 'Poor' | 'Average' | 'Good' | 'Excellent' | 'Skip' | null;
  note: string;
}

const RATING_VALUES: Record<string, number> = {
  Poor: 25,
  Average: 50,
  Good: 75,
  Excellent: 100,
  Skip: 0,
};

const RATINGS: Array<NonNullable<ScoreEntry['rating']>> = [
  'Poor',
  'Average',
  'Good',
  'Excellent',
  'Skip',
];

const EXAMPLE_REPOS = [
  { label: 'Hello-World', url: 'https://github.com/octocat/Hello-World' },
  { label: 'Tailwind CSS', url: 'https://github.com/tailwindlabs/tailwindcss' },
  { label: 'FastAPI', url: 'https://github.com/tiangolo/fastapi' },
];

function parseQuestions(raw: string, snapshots: CodeSnapshot[] = []): ParsedQuestion[] {
  if (!raw) return [];
  const out: ParsedQuestion[] = [];
  const lines = raw.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    const tagMatch = line.match(/^\[(C\d?|P\d?|D|G\d?)\]\s*(.*)/);
    if (tagMatch) {
      const tag = tagMatch[1];
      let questionText = tagMatch[2];
      let j = i + 1;
      const ansLines: string[] = [];
      let foundAnswer = false;
      while (j < lines.length) {
        const lj = lines[j].trim();
        if (/^\[(C\d?|P\d?|D|G\d?)\]/.test(lj)) break;
        if (/^A:\s*/i.test(lj)) {
          foundAnswer = true;
          ansLines.push(lj.replace(/^A:\s*/i, ''));
          j++;
          while (j < lines.length) {
            const lk = lines[j].trim();
            if (/^\[(C\d?|P\d?|D|G\d?)\]/.test(lk)) break;
            if (lk.length > 0) ansLines.push(lk);
            j++;
          }
          break;
        } else if (!foundAnswer && lj.length > 0) {
          questionText += ' ' + lj;
        }
        j++;
      }
      const answer = ansLines.join(' ').trim();

      let category: ParsedQuestion['category'] = 'Generic';
      if (tag.startsWith('C')) category = 'Code Logic';
      else if (tag.startsWith('P')) category = 'Project Logic';
      else if (tag === 'D') category = 'Documentation';
      else if (tag.startsWith('G')) category = 'Generic';

      const lineMatch = questionText.match(/Line\s*(\d+)\s*[:.]?/i);
      const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) : null;

      let snippet: string | undefined;
      if (lineNumber !== null) {
        const found = snapshots.find((s) => s.lineNumber === lineNumber);
        if (found) snippet = found.snippet;
      }

      out.push({
        id: `${tag}-${out.length}`,
        tag,
        category,
        lineNumber,
        question: questionText.trim(),
        answer,
        snippet,
      });
      i = j;
    } else {
      i++;
    }
  }
  return out;
}

function CodeBlock({
  snippet,
  fileName,
  highlightLine,
}: {
  snippet: string;
  fileName?: string;
  highlightLine: number | null;
}) {
  const rawLines = snippet.split('\n');
  const startLine = highlightLine ? Math.max(1, highlightLine - 5) : 1;

  return (
    <div className="rounded-xl overflow-hidden border border-border-main bg-[#060913] text-gray-300">
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0f1e] border-b border-border-main">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        {fileName && (
          <span className="ml-3 text-xs text-muted-text font-mono">{fileName}</span>
        )}
      </div>
      <pre className="text-[13px] font-mono leading-6 overflow-x-auto p-4">
        {rawLines.map((ln, idx) => {
          const lineNo = startLine + idx;
          const isHl = highlightLine === lineNo;
          return (
            <div
              key={idx}
              className={`flex ${
                isHl ? 'bg-primary/20 border-l-2 border-primary' : 'border-l-2 border-transparent'
              }`}
            >
              <span className="w-10 text-right pr-3 text-gray-600 select-none">{lineNo}</span>
              <span className={`flex-1 pr-4 ${isHl ? 'text-white font-semibold' : 'text-gray-300'}`}>
                {ln || ' '}
              </span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

export default function WorkspacePage() {
  const { user, tokenStats, consumeTokens, subscription } = useGlobal();

  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  
  const [showSummary, setShowSummary] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Custom Scorecard variables
  const [candidateName, setCandidateName] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [roleApplied, setRoleApplied] = useState('');

  const resultsRef = useRef<HTMLDivElement>(null);

  // Load scores
  useEffect(() => {
    try {
      const raw = localStorage.getItem('codewalk_scores');
      if (raw) setScores(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('codewalk_scores', JSON.stringify(scores));
    } catch {}
  }, [scores]);

  // Load slides when data changes
  useEffect(() => {
    if (!data) {
      setSlides([]);
      return;
    }
    const fileSlides: SlideData[] = data.files.map((f) => ({
      title: f.fileName,
      fileName: f.fileName,
      questions: parseQuestions(f.questions, f.codeSnapshots),
    }));
    const finalQs: ParsedQuestion[] = [
      ...parseQuestions(data.readmeQuestions),
      ...parseQuestions(data.genericQuestions),
    ];
    if (finalQs.length > 0) {
      fileSlides.push({ title: 'Documentation & Domain', questions: finalQs });
    }
    setSlides(fileSlides);
    setSlideIndex(0);
  }, [data]);

  const goNext = () => {
    if (slideIndex < slides.length - 1) {
      setSlideIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (slideIndex > 0) {
      setSlideIndex((i) => i - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (slides.length === 0) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slides, slideIndex]);


  const handleAnalyze = useCallback(async () => {
    setError(null);
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    // Check token limits
    if (tokenStats.used >= tokenStats.limit) {
      setError('Your token credits have been fully consumed. Please upgrade your subscription plan.');
      return;
    }

    setLoading(true);
    setData(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Analysis failed');
      
      setData(json);
      
      // Update global context token stats
      consumeTokens(repoUrl.trim(), json.files ? json.files.length : 1);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [repoUrl, tokenStats, consumeTokens]);

  const toggleAnswer = (id: string) =>
    setShowAnswers((s) => ({ ...s, [id]: !s[id] }));
  const toggleNote = (id: string) =>
    setShowNotes((s) => ({ ...s, [id]: !s[id] }));

  const setRating = (id: string, rating: ScoreEntry['rating']) => {
    setScores((s) => ({ ...s, [id]: { rating, note: s[id]?.note || '' } }));
  };
  const setNote = (id: string, note: string) => {
    setScores((s) => ({ ...s, [id]: { rating: s[id]?.rating || null, note } }));
  };

  const copyQA = async (q: ParsedQuestion) => {
    const text = `Q: ${q.question}\nA: ${q.answer}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const clearAllScores = () => {
    if (confirm('Clear all ratings and notes?')) setScores({});
  };

  const computeOverallScore = () => {
    const allQs = slides.flatMap((s) => s.questions);
    let sum = 0;
    let rated = 0;
    for (const q of allQs) {
      const sc = scores[q.id];
      if (sc?.rating && sc.rating !== 'Skip') {
        sum += RATING_VALUES[sc.rating];
        rated++;
      }
    }
    const percent = rated === 0 ? 0 : Math.round(sum / rated);
    return { percent, rated, total: allQs.length };
  };

  const downloadScreenshot = async () => {
    if (!resultsRef.current) return;
    try {
      const canvas = await html2canvas(resultsRef.current, {
        backgroundColor: '#0c1122',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `codewalk-${data?.repo.replace('/', '-') || 'report'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  };

  const copyScorecard = async () => {
    const allQs = slides.flatMap((s) => s.questions);
    const lines = allQs.map((q) => {
      const sc = scores[q.id];
      return `[${q.tag}] ${q.question}\nRating: ${sc?.rating || 'Not rated'}\nNote: ${sc?.note || '-'}\n`;
    });
    const text = `CodeWalk Scorecard — ${data?.repo || ''}\n\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const copyJSON = async () => {
    const payload = {
      candidate: candidateName,
      interviewer: interviewerName,
      role: roleApplied,
      repo: data?.repo,
      overall: computeOverallScore(),
      questions: slides.flatMap((s) =>
        s.questions.map((q) => ({
          slide: s.title,
          tag: q.tag,
          category: q.category,
          question: q.question,
          rating: scores[q.id]?.rating || null,
          note: scores[q.id]?.note || '',
        }))
      ),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {}
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const overall = computeOverallScore();
    doc.setFontSize(20);
    doc.text('CodeWalk Interview Scorecard', 14, 20);
    doc.setFontSize(11);
    doc.text(`Repository: ${data?.repo || '-'}`, 14, 30);
    doc.text(`Candidate: ${candidateName || '-'}`, 14, 37);
    doc.text(`Interviewer: ${interviewerName || '-'}`, 14, 44);
    doc.text(`Role: ${roleApplied || '-'}`, 14, 51);
    doc.text(
      `Overall Score: ${overall.percent}%  (${overall.rated}/${overall.total} rated)`,
      14,
      58
    );
    const rows: string[][] = [];
    slides.forEach((slide) => {
      slide.questions.forEach((q) => {
        const sc = scores[q.id];
        rows.push([
          slide.title.length > 25 ? slide.title.slice(0, 22) + '…' : slide.title,
          q.category,
          q.question.length > 60 ? q.question.slice(0, 57) + '…' : q.question,
          sc?.rating || '-',
          sc?.note || '-',
        ]);
      });
    });
    autoTable(doc, {
      startY: 65,
      head: [['Slide', 'Category', 'Question', 'Rating', 'Note']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 80 },
        3: { cellWidth: 20 },
        4: { cellWidth: 35 },
      },
    });
    doc.save(`codewalk-scorecard-${candidateName || 'candidate'}.pdf`);
  };

  const overall = computeOverallScore();
  const currentSlide = slides[slideIndex];
  const totalSlideDots = slides.length;

  const categoryColor: Record<string, string> = {
    'Code Logic': 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/20',
    'Project Logic': 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
    'Documentation': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
    'Generic': 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 glow-effect">
      {/* HEADER SUMMARY */}
      <div className="text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border-main pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-text-main">CodeWalk Workspace</h1>
          <p className="text-xs text-muted-text mt-1">Walk through real repository code in real time.</p>
        </div>

        {mounted && !user && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️ You are in Guest Mode.</span>
            <Link href="/auth/signup" className="underline font-bold hover:text-amber-500">Sign Up</Link>
            <span>to increase credit limits!</span>
          </div>
        )}
      </div>

      {/* INPUT CONTROLLER CARD */}
      <section className="bg-card-main border border-border-main rounded-2xl p-6 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-text mb-2">
          GitHub Repository URL
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-muted-bg border border-border-main rounded-xl px-4 py-2.5 focus-within:border-primary/50 transition-colors">
            <svg className="w-4 h-4 text-muted-text" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="flex-1 bg-transparent text-sm text-text-main placeholder-muted-text/50 focus:outline-none"
              suppressHydrationWarning={true}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-all shadow-md shadow-primary/20"
          >
            {loading ? 'Analyzing...' : 'Generate Walkthrough'}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between mt-4 gap-2">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-muted-text">Example repos:</span>
            {EXAMPLE_REPOS.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setRepoUrl(ex.url)}
                className="px-2.5 py-1 bg-muted-bg hover:border-primary/40 border border-border-main rounded-lg text-xs text-muted-text transition-colors font-mono"
              >
                {ex.label}
              </button>
            ))}
          </div>
          {mounted && (
            <span className="text-xs text-muted-text font-semibold">
              Token Credits Used: <span className="text-primary">{tokenStats.used.toLocaleString()}</span> / {tokenStats.limit.toLocaleString()}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl">
            {error}
          </div>
        )}
      </section>

      {/* CORE WORKSPACE SLIDES */}
      {data && currentSlide && (
        <section ref={resultsRef} className="space-y-6">
          <div className="bg-card-main border border-border-main rounded-2xl p-6 shadow-sm">
            {/* Slide Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2 pb-4 border-b border-border-main">
              <div>
                <p className="text-[10px] tracking-widest text-muted-text uppercase font-bold">
                  File {slideIndex + 1} of {slides.length}
                </p>
                <h2 className="text-base font-mono text-text-main mt-0.5 break-all">
                  {currentSlide.title}
                </h2>
              </div>
              <a
                href={`https://github.com/${data.repo}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs rounded-full hover:bg-primary/20 transition-all font-semibold"
              >
                {data.repo} ↗
              </a>
            </div>

            {/* Inner questions list */}
            <div className="flex flex-col gap-8">
              {currentSlide.questions.map((q, qIdx) => (
                <div key={q.id} className="bg-muted-bg/30 border border-border-main rounded-2xl p-5 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-text">Question {qIdx + 1}:</span>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                          categoryColor[q.category]
                        }`}
                      >
                        ● {q.category} [{q.tag}]
                      </span>
                    </div>
                    <button
                      onClick={() => copyQA(q)}
                      title="Copy Q&A"
                      className="text-muted-text hover:text-primary transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-text-main text-base font-bold leading-relaxed mb-4">
                    {q.question}
                  </p>

                  {q.snippet && (
                    <div className="mb-4">
                      <CodeBlock
                        snippet={q.snippet}
                        fileName={currentSlide.fileName}
                        highlightLine={q.lineNumber}
                      />
                    </div>
                  )}

                  {showAnswers[q.id] && (
                    <div className="mt-4 p-4 bg-primary/5 border-l-2 border-primary rounded-xl text-sm text-text-main leading-relaxed">
                      <span className="font-bold text-primary block mb-1">AI Answer Key:</span>
                      {q.answer || '(No answer provided)'}
                    </div>
                  )}

                  {showNotes[q.id] && (
                    <textarea
                      value={scores[q.id]?.note || ''}
                      onChange={(e) => setNote(q.id, e.target.value)}
                      placeholder="Type notes or candidate feedback here..."
                      rows={3}
                      className="w-full mt-3 px-3 py-2 bg-card-main border border-border-main rounded-xl text-sm text-text-main placeholder-muted-text/40 focus:outline-none focus:border-primary/50"
                    />
                  )}

                  {/* Action bar */}
                  <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-border-main">
                    <button
                      onClick={() => toggleAnswer(q.id)}
                      className="px-3.5 py-2 bg-card-main border border-border-main hover:border-primary/40 text-text-main text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {showAnswers[q.id] ? 'Hide Answer' : 'Show Answer'}
                    </button>
                    <button
                      onClick={() => toggleNote(q.id)}
                      className="px-3.5 py-2 bg-card-main border border-border-main hover:border-primary/40 text-text-main text-xs font-semibold rounded-xl transition-all"
                    >
                      ✎ Notes
                    </button>

                    <div className="flex-1" />

                    <div className="flex items-center gap-1">
                      {RATINGS.map((r) => {
                        const active = scores[q.id]?.rating === r;
                        return (
                          <button
                            key={r}
                            onClick={() => setRating(q.id, r)}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                              active
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-card-main border-border-main text-muted-text hover:text-text-main'
                            }`}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Slide Navigation footer */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-border-main">
              <button
                onClick={goPrev}
                disabled={slideIndex === 0}
                className="px-4 py-2 bg-muted-bg border border-border-main hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-text-main transition-colors"
              >
                ← Prev File
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalSlideDots }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSlideIndex(i);
                    }}
                    className={`h-2 rounded-full transition-all ${
                      i === slideIndex ? 'w-6 bg-primary' : 'w-2 bg-border-main hover:bg-muted-text'
                    }`}
                    title={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={goNext}
                disabled={slideIndex === slides.length - 1}
                className="px-4 py-2 bg-muted-bg border border-border-main hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold text-text-main transition-colors"
              >
                Next File →
              </button>
            </div>
          </div>


          {/* Quick Scorecard Control */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="px-5 py-2.5 bg-muted-bg border border-border-main rounded-xl text-xs font-bold text-text-main hover:border-primary/50 transition-all"
            >
              {showSummary ? 'Hide Score Summary' : 'Show Score Summary'}
            </button>
          </div>

          {/* Score summary panel (collapsible) */}
          {showSummary && (
            <div className="bg-card-main border border-border-main rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4 border-b border-border-main pb-4">
                <div>
                  <p className="text-xs text-muted-text">Aggregate Walkthrough Score</p>
                  <p className="text-4xl font-extrabold text-primary mt-1">
                    {overall.percent}%
                  </p>
                  <p className="text-xs text-muted-text mt-1">
                    {overall.rated} of {overall.total} items rated
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={clearAllScores}
                    className="px-3 py-2 border border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-xl text-xs font-semibold transition-all"
                  >
                    Clear Ratings
                  </button>
                  <button
                    onClick={() => setShowScorecardModal(true)}
                    className="px-3 py-2 bg-primary text-white hover:bg-primary-hover rounded-xl text-xs font-semibold transition-all shadow-md shadow-primary/10"
                  >
                    Generate Report
                  </button>
                  <button
                    onClick={downloadScreenshot}
                    className="px-3 py-2 border border-border-main bg-muted-bg hover:border-primary/40 rounded-xl text-xs font-semibold transition-all text-text-main"
                  >
                    Screenshot
                  </button>
                  <button
                    onClick={copyScorecard}
                    className="px-3 py-2 border border-border-main bg-muted-bg hover:border-primary/40 rounded-xl text-xs font-semibold transition-all text-text-main"
                  >
                    Copy Text
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-muted-text border-b border-border-main">
                      <th className="p-3">Slide / File</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Question Prompt</th>
                      <th className="p-3 text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slides.flatMap((s) =>
                      s.questions.map((q) => {
                        const sc = scores[q.id];
                        return (
                          <tr key={q.id} className="border-b border-border-main/50 hover:bg-muted-bg/25">
                            <td className="p-3 font-mono text-muted-text truncate max-w-[150px]">{s.title}</td>
                            <td className="p-3 font-semibold text-primary">{q.category}</td>
                            <td className="p-3 text-text-main max-w-sm truncate">{q.question}</td>
                            <td className="p-3 text-right font-bold text-text-main">{sc?.rating || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* SCORECARD REPORT MODAL */}
      {showScorecardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card-main border border-border-main w-full max-w-lg rounded-2xl shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-text-main mb-2">Export Candidate Scorecard</h3>
            <p className="text-xs text-muted-text mb-4">Complete the fields below to customize the exported PDF or JSON scorecard.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1 uppercase tracking-wide">Candidate Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3 py-2 bg-muted-bg border border-border-main rounded-xl text-sm text-text-main focus:outline-none focus:border-primary"
                  suppressHydrationWarning={true}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1 uppercase tracking-wide">Interviewer Name</label>
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-muted-bg border border-border-main rounded-xl text-sm text-text-main focus:outline-none focus:border-primary"
                  suppressHydrationWarning={true}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-text mb-1 uppercase tracking-wide">Role Applied For</label>
                <input
                  type="text"
                  value={roleApplied}
                  onChange={(e) => setRoleApplied(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-3 py-2 bg-muted-bg border border-border-main rounded-xl text-sm text-text-main focus:outline-none focus:border-primary"
                  suppressHydrationWarning={true}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-main">
              <button
                onClick={() => setShowScorecardModal(false)}
                className="px-4 py-2 border border-border-main rounded-xl text-xs font-semibold text-muted-text hover:text-text-main"
              >
                Cancel
              </button>
              <button
                onClick={copyJSON}
                className="px-4 py-2 border border-border-main bg-muted-bg hover:border-primary/40 rounded-xl text-xs font-semibold text-text-main"
              >
                Copy JSON
              </button>
              <button
                onClick={generatePDF}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-md shadow-primary/10"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
