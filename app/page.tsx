
'use client';

/**
 * CodeWalk — redesigned UI matching the new dark theme mockup.
 * Preserves: per-file slides, scorecard, PDF export, future updates, ratings, notes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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

const FREE_TIER_LIMIT = 3;
const FREE_TIER_KEY = 'codewalk_usage';
const SCORES_KEY = 'codewalk_scores';

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

/** Render a code snippet with line numbers, highlighting the active line. */
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
  // Try to detect a starting line number from the snippet metadata; default to highlightLine-2
  const startLine = highlightLine ? Math.max(1, highlightLine - 2) : 1;

  return (
    <div className="rounded-lg overflow-hidden border border-[#1f2937] bg-[#0b1220]">
      {/* mac-style header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0d1424] border-b border-[#1f2937]">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        {fileName && (
          <span className="ml-3 text-xs text-gray-400 font-mono">{fileName}</span>
        )}
      </div>
      <pre className="text-[13px] font-mono leading-6 overflow-x-auto">
        {rawLines.map((ln, idx) => {
          const lineNo = startLine + idx;
          const isHl = highlightLine === lineNo;
          return (
            <div
              key={idx}
              className={`flex ${
                isHl ? 'bg-[#1a2540] border-l-2 border-purple-500' : 'border-l-2 border-transparent'
              }`}
            >
              <span className="w-10 text-right pr-3 text-gray-600 select-none">{lineNo}</span>
              <span className={`flex-1 pr-4 ${isHl ? 'text-white' : 'text-gray-300'}`}>
                {ln || ' '}
              </span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [usage, setUsage] = useState({ count: 0, date: '' });
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [roleApplied, setRoleApplied] = useState('');

  const resultsRef = useRef<HTMLDivElement>(null);

  // Load free tier usage
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const raw = localStorage.getItem(FREE_TIER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === today) {
          setUsage(parsed);
          return;
        }
      }
    } catch {}
    setUsage({ count: 0, date: today });
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      if (raw) setScores(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    } catch {}
  }, [scores]);

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
    setQuestionIndex(0);
  }, [data]);

  // Keyboard navigation — now navigates question-by-question
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (slides.length === 0) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, slideIndex, questionIndex]);

  const goNext = () => {
    const slide = slides[slideIndex];
    if (!slide) return;
    if (questionIndex < slide.questions.length - 1) {
      setQuestionIndex((q) => q + 1);
    } else if (slideIndex < slides.length - 1) {
      setSlideIndex((i) => i + 1);
      setQuestionIndex(0);
    }
  };

  const goPrev = () => {
    if (questionIndex > 0) {
      setQuestionIndex((q) => q - 1);
    } else if (slideIndex > 0) {
      const prevSlide = slides[slideIndex - 1];
      setSlideIndex((i) => i - 1);
      setQuestionIndex(prevSlide.questions.length - 1);
    }
  };

  const handleAnalyze = useCallback(async () => {
    setError(null);
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }
    if (usage.count >= FREE_TIER_LIMIT) {
      setError(`Daily limit reached (${FREE_TIER_LIMIT}/day). Try again tomorrow.`);
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
      const today = new Date().toISOString().slice(0, 10);
      const next = { count: usage.count + 1, date: today };
      setUsage(next);
      try {
        localStorage.setItem(FREE_TIER_KEY, JSON.stringify(next));
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [repoUrl, usage]);

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
        backgroundColor: '#0b1020',
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
  const currentQuestion = currentSlide?.questions[questionIndex];
  const totalSlideDots = slides.length;

  const categoryColor: Record<string, string> = {
    'Code Logic': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    'Project Logic': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    Documentation: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Generic: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          'radial-gradient(ellipse at top, #1a1340 0%, #0b0b1f 40%, #050510 100%)',
      }}
    >
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* HEADER */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/40 bg-purple-500/10 text-xs text-purple-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            AI-POWERED · INTERVIEW TOOL
          </div>
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            CodeWalk
          </h1>
          <p className="text-gray-400 mt-3 text-sm">
            Walk through real code with your candidates — no prep needed
          </p>
        </header>

        {/* INPUT CARD */}
        <section className="bg-[#0f1424]/80 backdrop-blur border border-[#1f2937] rounded-2xl p-5 mb-5 shadow-xl">
          <label className="block text-[11px] font-semibold tracking-wider text-gray-500 mb-2 uppercase">
            GitHub Repository URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 bg-[#0a0f1e] border border-[#1f2937] rounded-lg px-3 py-2.5 focus-within:border-purple-500/50">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
              </svg>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || usage.count >= FREE_TIER_LIMIT}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition shadow-lg shadow-purple-900/40"
            >
              {loading ? 'Analyzing…' : 'Generate Questions'}
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500">Examples:</span>
              {EXAMPLE_REPOS.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => setRepoUrl(ex.url)}
                  className="px-2.5 py-1 bg-[#0a0f1e] border border-[#1f2937] hover:border-purple-500/40 rounded-md text-xs text-gray-300 transition font-mono"
                >
                  {ex.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              Free tier: <span className="text-purple-400">●●</span>{' '}
              {usage.count}/{FREE_TIER_LIMIT} today
            </span>
          </div>

          {error && (
            <div className="mt-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-md text-red-300 text-xs">
              {error}
            </div>
          )}
        </section>

        {/* SLIDE CARD */}
        {data && currentSlide && currentQuestion && (
          <section ref={resultsRef} className="space-y-5">
            <div className="bg-[#0f1424]/80 backdrop-blur border border-[#1f2937] rounded-2xl p-5 shadow-xl">
              {/* Slide header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] tracking-widest text-gray-500 uppercase">
                    Slide · File {slideIndex + 1} of {slides.length}
                  </p>
                  <h2 className="text-lg font-mono text-white mt-0.5 break-all">
                    {currentSlide.title}
                  </h2>
                </div>
                <a
                  href={`https://github.com/${data.repo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 bg-purple-500/10 border border-purple-500/40 text-purple-300 text-xs rounded-full hover:bg-purple-500/20 transition"
                >
                  {data.repo} ↗
                </a>
              </div>

              {/* Inner question panel */}
              <div className="bg-[#0a0f1e] border border-[#1f2937] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-full border ${
                      categoryColor[currentQuestion.category]
                    }`}
                  >
                    ● {currentQuestion.category}
                  </span>
                  <button
                    onClick={() =>
                      currentQuestion.snippet && copyQA(currentQuestion)
                    }
                    title="Copy"
                    className="text-gray-500 hover:text-gray-300 transition"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>

                <p className="text-white text-[15px] leading-relaxed mb-4">
                  {currentQuestion.question}
                </p>

                {currentQuestion.snippet && (
                  <CodeBlock
                    snippet={currentQuestion.snippet}
                    fileName={currentSlide.fileName}
                    highlightLine={currentQuestion.lineNumber}
                  />
                )}

                {showAnswers[currentQuestion.id] && (
                  <div className="mt-4 p-3 bg-[#0f1424] border-l-2 border-purple-500 rounded text-sm text-gray-300 leading-relaxed">
                    {currentQuestion.answer || '(No answer provided)'}
                  </div>
                )}

                {showNotes[currentQuestion.id] && (
                  <textarea
                    value={scores[currentQuestion.id]?.note || ''}
                    onChange={(e) => setNote(currentQuestion.id, e.target.value)}
                    placeholder="Interviewer notes…"
                    rows={3}
                    className="w-full mt-3 px-3 py-2 bg-[#0f1424] border border-[#1f2937] rounded text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                  />
                )}

                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#1f2937]">
                  <button
                    onClick={() => toggleAnswer(currentQuestion.id)}
                    className="px-3 py-1.5 bg-[#0f1424] border border-[#1f2937] hover:border-purple-500/40 text-gray-200 text-xs rounded-md transition flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {showAnswers[currentQuestion.id] ? 'Hide Answer' : 'Show Answer'}
                  </button>
                  <button
                    onClick={() => copyQA(currentQuestion)}
                    className="px-3 py-1.5 bg-[#0f1424] border border-[#1f2937] hover:border-purple-500/40 text-gray-200 text-xs rounded-md transition"
                  >
                    ⧉ Copy Q&A
                  </button>
                  <button
                    onClick={() => toggleNote(currentQuestion.id)}
                    className="px-3 py-1.5 bg-[#0f1424] border border-[#1f2937] hover:border-purple-500/40 text-gray-200 text-xs rounded-md transition"
                  >
                    ✎ Edit Note
                  </button>

                  <div className="flex-1" />

                  {RATINGS.map((r) => {
                    const active = scores[currentQuestion.id]?.rating === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setRating(currentQuestion.id, r)}
                        className={`px-2.5 py-1.5 text-xs rounded-md transition border ${
                          active
                            ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                            : 'bg-[#0f1424] border-[#1f2937] text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slide footer nav */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={goPrev}
                  disabled={slideIndex === 0 && questionIndex === 0}
                  className="px-4 py-2 bg-[#0a0f1e] border border-[#1f2937] hover:border-purple-500/40 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-xs text-gray-200 transition"
                >
                  ‹ Previous
                </button>

                {/* dots */}
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalSlideDots }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSlideIndex(i);
                        setQuestionIndex(0);
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        i === slideIndex
                          ? 'w-6 bg-purple-500'
                          : 'w-1.5 bg-gray-600 hover:bg-gray-500'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={goNext}
                  disabled={
                    slideIndex === slides.length - 1 &&
                    questionIndex === currentSlide.questions.length - 1
                  }
                  className="px-4 py-2 bg-[#0a0f1e] border border-[#1f2937] hover:border-purple-500/40 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-xs text-gray-200 transition"
                >
                  Next ›
                </button>
              </div>
            </div>

            {/* Score summary card (collapsible) */}
            {showSummary && (
              <div className="bg-[#0f1424]/80 border border-[#1f2937] rounded-2xl p-5">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Overall Score</p>
                    <p className="text-3xl font-bold text-white">
                      {overall.percent}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {overall.rated} of {overall.total} rated
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={clearAllScores}
                      className="px-3 py-1.5 bg-[#0a0f1e] border border-[#1f2937] hover:border-red-500/40 text-gray-200 text-xs rounded transition"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => setShowScorecardModal(true)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition"
                    >
                      Generate Scorecard
                    </button>
                    <button
                      onClick={downloadScreenshot}
                      className="px-3 py-1.5 bg-[#0a0f1e] border border-[#1f2937] hover:border-purple-500/40 text-gray-200 text-xs rounded transition"
                    >
                      Screenshot
                    </button>
                    <button
                      onClick={copyScorecard}
                      className="px-3 py-1.5 bg-[#0a0f1e] border border-[#1f2937] hover:border-purple-500/40 text-gray-200 text-xs rounded transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-[#1f2937]">
                        <th className="text-left p-2">Slide</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-left p-2">Question</th>
                        <th className="text-left p-2">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slides.flatMap((s) =>
                        s.questions.map((q) => {
                          const sc = scores[q.id];
                          return (
                            <tr
                              key={q.id}
                              className="border-b border-[#1f2937]/50"
                            >
                              <td className="p-2 text-gray-500">{s.title}</td>
                              <td className="p-2 text-purple-300">
                                {q.category}
                              </td>
                              <td className="p-2 text-gray-300">
                                {q.question.length > 70
                                  ? q.question.slice(0, 67) + '…'
                                  : q.question}
                              </td>
                              <td className="p-2 text-gray-300">
                                {sc?.rating || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                   </table>
                </div>
              </div>
            )}

            {data.warnings.length > 0 && (
              <div className="bg-[#0f1424]/80 border border-[#1f2937] rounded-xl p-4 text-xs text-gray-500">
                <p className="font-semibold text-gray-300 mb-1">Warnings</p>
                <ul className="space-y-1">
                  {data.warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* BATCH BANNER */}
        <section className="mt-5 bg-[#0f1424]/80 border border-[#1f2937] rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              ⚡
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Batch Question Generator
              </p>
              <p className="text-xs text-gray-500">
                Generate full interview sets across multiple repos at once
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-semibold text-amber-300 border border-amber-500/40 rounded-full">
            COMING SOON
          </span>
        </section>

        {/* TIPS */}
        <section className="mt-4 bg-[#0f1424]/80 border border-[#1f2937] rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400">💡</span>
            <p className="text-sm font-semibold text-white">Interviewer Tips</p>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Use ← → arrow keys to navigate between the slides. Toggle answers
            only after the candidate responds. Notes are saved locally in your
            browser.
          </p>
          <div className="flex justify-between mt-3 text-[11px] text-gray-500 flex-wrap gap-2">
            <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              ● {Math.max(0, FREE_TIER_LIMIT - usage.count)} free analysis remaining
            </span>
            <span>Created by Harshvardhan Modi</span>
          </div>
        </section>

        {/* --- ADDED LINE: warning for cheaters --- */}
        <div className="mt-5 text-center text-[11px] text-gray-400 border-t border-[#1f2937] pt-4">
          <span className="inline-flex items-center gap-1.5 bg-rose-500/10 px-2.5 py-1 rounded-full text-rose-300">
            ⚠️
          </span>{' '}
          The tool seems simple but it do such things which are problamatic for cheaters.
        </div>
      </div>

      {/* SCORECARD MODAL */}
      {showScorecardModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1424] border border-[#1f2937] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">
              Generate Scorecard
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Candidate Name"
                className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1f2937] rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
              />
              <input
                type="text"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                placeholder="Interviewer Name"
                className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1f2937] rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
              />
              <input
                type="text"
                value={roleApplied}
                onChange={(e) => setRoleApplied(e.target.value)}
                placeholder="Role Applied For"
                className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1f2937] rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-5 justify-end">
              <button
                onClick={() => setShowScorecardModal(false)}
                className="px-3 py-2 bg-[#0a0f1e] border border-[#1f2937] hover:border-purple-500/40 text-gray-200 text-sm rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={copyJSON}
                className="px-3 py-2 bg-[#0a0f1e] border border-[#1f2937] hover:border-purple-500/40 text-gray-200 text-sm rounded transition"
              >
                Copy JSON
              </button>
              <button
                onClick={generatePDF}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating button to toggle summary when results exist */}
      {data && (
        <button
          onClick={() => setShowSummary((v) => !v)}
          className="fixed bottom-6 right-6 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-full shadow-lg shadow-purple-900/50 transition"
        >
          {showSummary ? 'Hide Summary' : `Score: ${overall.percent}%`}
        </button>
      )}
    </div>
  );
}