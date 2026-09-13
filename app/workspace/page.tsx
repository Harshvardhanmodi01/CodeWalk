'use client';

/**
 * CodeWalk Guest Workspace Page
 * Redelegates to server-side API for rate limits and question generation,
 * rendering a premium dark theme workspace matching the home page aesthetics.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';
import hljs from 'highlight.js';

interface Question {
  id: string;
  question: string;
  snippet: string;
  fileName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'frontend' | 'backend' | 'dsa' | 'system-design';
  answer: string;
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

// Heuristic to detect repository language from generated question file extensions
function detectRepoLanguage(questions: Question[]): string {
  if (!questions || questions.length === 0) return 'Source Repository';
  
  const exts: Record<string, number> = {};
  for (const q of questions) {
    if (!q.fileName) continue;
    const parts = q.fileName.split('.');
    if (parts.length > 1) {
      const ext = parts.pop()?.toLowerCase();
      if (ext) exts[ext] = (exts[ext] || 0) + 1;
    }
  }

  let maxExt = '';
  let maxCount = 0;
  for (const ext in exts) {
    if (exts[ext] > maxCount) {
      maxCount = exts[ext];
      maxExt = ext;
    }
  }

  const langNames: Record<string, string> = {
    py: 'Python Repository',
    js: 'JavaScript Repository',
    jsx: 'JavaScript Repository',
    ts: 'TypeScript Repository',
    tsx: 'TypeScript/React Repository',
    go: 'Go Repository',
    java: 'Java Repository',
    rs: 'Rust Repository',
    c: 'C Repository',
    cpp: 'C++ Repository',
    cs: 'C# Repository',
    rb: 'Ruby Repository',
    php: 'PHP Repository',
    swift: 'Swift Repository',
    kt: 'Kotlin Repository',
  };

  return langNames[maxExt] || 'Source Repository';
}

// Helper wrapper for scroll-fade-in animation
function ScrollFadeIn({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getWsFileEmoji(name: string): string {
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';
  const base = name.toLowerCase();
  const map: Record<string, string> = {
    js: '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️',
    py: '🐍', go: '🐹', rs: '🦀', java: '☕',
    kt: '🟣', cpp: '⚙️', c: '⚙️', h: '📋',
    cs: '🔵', rb: '💎', php: '🐘', swift: '🟠',
    html: '🌐', css: '🎨', scss: '🎨',
    json: '📋', yaml: '📋', yml: '📋', toml: '📋',
    sh: '🖥️', bash: '🖥️',
    md: '📝', txt: '📄', sql: '🗄️',
    dockerfile: '🐳', gitignore: '🔒',
  };
  return map[base] || map[ext] || '📄';
}

function getWsHljsLang(fileName: string): string {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    go: 'go', rs: 'rust', java: 'java',
    cpp: 'cpp', c: 'c', h: 'c', cs: 'csharp',
    html: 'xml', css: 'css', scss: 'scss',
    json: 'json', sh: 'bash', bash: 'bash',
    yml: 'yaml', yaml: 'yaml', md: 'markdown', sql: 'sql',
    rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  };
  return map[ext] || 'plaintext';
}

// ── VS Code-style CodeBlock ──────────────────────────────────────────────────
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
  const lang = getWsHljsLang(fileName || '');
  const emoji = getWsFileEmoji(fileName || '');

  const highlightedLines = useMemo(() => {
    return rawLines.map(line => {
      try {
        return hljs.highlight(line || ' ', { language: lang, ignoreIllegals: true }).value;
      } catch {
        return (line || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snippet, lang]);

  return (
    <div
      className="rounded-xl overflow-hidden shadow-xl w-full"
      style={{ background: '#1e1e1e', border: '1px solid #3b494b', fontFamily: "'Geist Mono','Cascadia Code','Fira Code',monospace" }}
    >
      {/* VS Code-style Tab Bar */}
      <div
        className="flex items-stretch select-none"
        style={{ background: '#252526', borderBottom: '1px solid #3b494b', minHeight: '34px' }}
      >
        <div
          className="flex items-center gap-1.5 px-3"
          style={{
            background: '#1e1e1e',
            borderRight: '1px solid #3b494b',
            borderTop: '2px solid #007acc',
            fontSize: '11px',
            color: '#cccccc',
          }}
        >
          <span style={{ fontSize: '12px' }}>{emoji}</span>
          <span className="truncate max-w-[180px]">{fileName || 'snippet'}</span>
        </div>
        <div className="flex-1" />
        <div
          className="flex items-center px-3"
          style={{ fontSize: '10px', color: '#6a6a6a' }}
        >
          {lang.toUpperCase()}
        </div>
      </div>

      {/* Code lines */}
      <div
        className="overflow-x-auto custom-scrollbar"
        style={{ maxHeight: '300px', background: '#1e1e1e' }}
      >
        {highlightedLines.map((html, idx) => {
          const lineNo = startLine + idx;
          const isHl = highlightLine === lineNo;
          return (
            <div
              key={idx}
              className="flex items-stretch"
              style={{
                background: isHl ? 'rgba(0,122,204,0.15)' : 'transparent',
                borderLeft: isHl ? '2px solid #007acc' : '2px solid transparent',
                lineHeight: '20px',
                fontSize: '12.5px',
              }}
            >
              <span
                className="select-none text-right flex-shrink-0"
                style={{
                  width: '44px',
                  paddingRight: '14px',
                  color: isHl ? '#c6c6c6' : '#3e4451',
                  background: '#1e1e1e',
                  fontSize: '11px',
                  lineHeight: '20px',
                }}
              >
                {lineNo}
              </span>
              <pre
                className="flex-1 whitespace-pre"
                style={{ color: '#d4d4d4', margin: 0, padding: '0 16px 0 0', lineHeight: '20px' }}
                dangerouslySetInnerHTML={{ __html: html || ' ' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  snippet,
  fileName,
  difficulty,
  category,
  answer,
  qIdx,
  showAnswer,
  toggleAnswer,
  note,
  setNote,
  rating,
  setRating,
  showNote,
  toggleNote,
  isSample = false,
}: {
  question: string;
  snippet?: string;
  fileName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'frontend' | 'backend' | 'dsa' | 'system-design';
  answer: string;
  qIdx?: number;
  showAnswer?: boolean;
  toggleAnswer?: () => void;
  note?: string;
  setNote?: (val: string) => void;
  rating?: string | null;
  setRating?: (val: any) => void;
  showNote?: boolean;
  toggleNote?: () => void;
  isSample?: boolean;
}) {
  const difficultyColors = {
    easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    hard: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const categoryColors = {
    frontend: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    backend: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dsa: 'bg-violet-50 text-violet-700 border-violet-200',
    'system-design': 'bg-pink-50 text-pink-700 border-pink-200',
  };

  const difficultyLabels = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
  };

  const categoryLabels = {
    frontend: 'Frontend',
    backend: 'Backend',
    dsa: 'DSA',
    'system-design': 'System Design',
  };

  const currentDiff = difficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
  const currentCat = category.toLowerCase() as 'frontend' | 'backend' | 'dsa' | 'system-design';

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 relative shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {qIdx !== undefined && (
            <span className="text-xs font-bold text-slate-400">Question {qIdx + 1}:</span>
          )}
          <span className="text-xs font-mono text-violet-600/80 truncate max-w-[200px] sm:max-w-xs" title={fileName}>
            {fileName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${difficultyColors[currentDiff] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {difficultyLabels[currentDiff] || difficulty}
          </span>
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${categoryColors[currentCat] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            {categoryLabels[currentCat] || category}
          </span>
        </div>
      </div>

      {/* Question Text */}
      <h3 className="text-slate-900 text-lg font-bold leading-relaxed mb-4">
        {question}
      </h3>

      {/* Code Snippet */}
      {snippet && (
        <div className="mb-4">
          <CodeBlock
            snippet={snippet}
            fileName={fileName}
            highlightLine={null}
          />
        </div>
      )}

      {/* Answer Key */}
      {showAnswer && (
        <div className="mt-4 p-4 bg-violet-50 border-l-2 border-violet-500 rounded-xl text-sm text-slate-700 leading-relaxed animate-in fade-in duration-200">
          <span className="font-bold text-violet-600 block mb-1">AI Answer Key:</span>
          {answer}
        </div>
      )}

      {/* User Notes */}
      {showNote && setNote && (
        <textarea
          value={note || ''}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Type notes or candidate feedback here..."
          rows={3}
          className="w-full mt-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
      )}

      {/* Action Footer */}
      {!isSample && (
        <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-gray-100">
          {toggleAnswer && (
            <button
              onClick={toggleAnswer}
              className="px-3.5 py-2 bg-gray-50 border border-gray-200 hover:border-violet-300 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {showAnswer ? 'Hide Answer' : 'Show Answer'}
            </button>
          )}
          {toggleNote && (
            <button
              onClick={toggleNote}
              className="px-3.5 py-2 bg-gray-50 border border-gray-200 hover:border-violet-300 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              ✎ Notes
            </button>
          )}

          <div className="flex-1" />

          {setRating && (
            <div className="flex items-center gap-1 flex-wrap">
              {RATINGS.map((r) => {
                const active = rating === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRating(r)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                      active
                        ? 'bg-violet-50 border-violet-400 text-violet-700'
                        : 'bg-gray-50 border-gray-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const { user } = useGlobal();
  const router = useRouter();

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestSessionId, setGuestSessionId] = useState<string>('');
  
  // Walkthrough analysis results
  const [data, setData] = useState<any | null>(null);
  const [guestQuestions, setGuestQuestions] = useState<Question[]>([]);
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  
  // Modals / Overlays
  const [showProModal, setShowProModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [remainingWalkthroughs, setRemainingWalkthroughs] = useState<number>(3);

  useEffect(() => {
    setMounted(true);
    let sid = localStorage.getItem('guest_session_id');
    if (!sid) {
      sid = 'guest_sid_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('guest_session_id', sid);
    }
    setGuestSessionId(sid);
  }, []);

  // Fetch remaining walkthroughs count
  useEffect(() => {
    if (guestSessionId) {
      fetch(`/api/analyze?guestSessionId=${guestSessionId}`)
        .then(res => res.json())
        .then(json => {
          if (json.success && typeof json.remaining === 'number') {
            setRemainingWalkthroughs(json.remaining);
          }
        })
        .catch(err => console.error("Failed to fetch limits:", err));
    }
  }, [guestSessionId]);

  // Smooth auto-scroll experience
  useEffect(() => {
    if (guestQuestions.length > 0) {
      setTimeout(() => {
        const el = document.getElementById('workspace-results');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }, [guestQuestions]);

  const handleAnalyze = useCallback(async () => {
    setError(null);
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    setLoading(true);
    setData(null);
    setGuestQuestions([]);
    setShowAnswers({});
    setShowNotes({});
    setScores({});
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          repoUrl: repoUrl.trim(),
          guestSessionId
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Analysis failed');
      
      setData(json);
      if (json.isGuest && json.questions) {
        setGuestQuestions(json.questions);
        setRemainingWalkthroughs(prev => Math.max(0, prev - 1));
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [repoUrl, guestSessionId]);

  const toggleAnswer = (id: string) => {
    setShowAnswers((s) => ({ ...s, [id]: !s[id] }));
  };

  const toggleNote = (id: string) => {
    setShowNotes((s) => ({ ...s, [id]: !s[id] }));
  };

  const setRating = (id: string, rating: ScoreEntry['rating']) => {
    setScores((s) => ({ ...s, [id]: { rating, note: s[id]?.note || '' } }));
  };

  const setNote = (id: string, note: string) => {
    setScores((s) => ({ ...s, [id]: { rating: s[id]?.rating || null, note } }));
  };

  const computeGuestOverallScore = () => {
    let sum = 0;
    let rated = 0;
    for (const q of guestQuestions) {
      const sc = scores[q.id];
      if (sc?.rating && sc.rating !== 'Skip') {
        sum += RATING_VALUES[sc.rating];
        rated++;
      }
    }
    const percent = rated === 0 ? 0 : Math.round(sum / rated);
    return { percent, rated };
  };

  // Share walkthrough results
  const handleShare = async () => {
    const text = guestQuestions.map((q, idx) => `Q${idx + 1}: ${q.question}\n`).join('\n') + `\nGenerated via CodeWalk.io`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Questions copied to clipboard! Share them with your team.");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy share text.");
    }
  };

  // Sample static question variables
  const [sampleShowAnswer, setSampleShowAnswer] = useState(false);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-violet-50/40 to-pink-50/30 text-slate-900 pb-16 font-sans">
      {/* Decorative blobs */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden opacity-40">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>
      <div className="relative z-10 max-w-4xl mx-auto px-4 flex flex-col gap-8 pt-8">
        
        {/* HEADER GUEST MODE WARNING */}
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>You are in <strong>Guest Mode</strong>. Connect repositories for instant interview walkthrough prep.</span>
          </div>
          <Link href="/register" className="px-3 py-1 bg-amber-100 border border-amber-200 text-amber-700 hover:bg-amber-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
            Sign Up Free
          </Link>
        </div>

        {/* PAGE TITLE */}
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>CodeWalk Guest Workspace</h1>
          <p className="text-sm text-slate-600 font-medium mt-2">Generate realistic technical interview questions from your codebase in seconds.</p>
        </div>

        {/* INPUT CONTROLLER CARD */}
        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-lg">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            GitHub Repository URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
              <svg className="w-4 h-4 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
              </svg>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 4px 14px rgba(124,58,237,0.30)' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Generate Walkthrough'
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between mt-4 gap-3 border-t border-gray-100 pt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500 font-medium">Example repositories:</span>
              {EXAMPLE_REPOS.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => setRepoUrl(ex.url)}
                  className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg text-xs text-violet-700 transition-colors font-mono"
                >
                  {ex.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500 font-semibold font-mono">
              Limits: <span className="text-violet-600">{remainingWalkthroughs} free walkthrough{remainingWalkthroughs !== 1 ? 's' : ''} remaining</span>
            </div>
          </div>

          {error && (
            <div className="mt-4 px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl flex items-center gap-2">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* LOADING ANNOUNCEMENT CONTAINER */}
        {loading && (
          <div className="bg-white border border-violet-100 rounded-2xl p-8 text-center shadow-lg space-y-4">
            <div className="inline-block relative w-12 h-12">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-20" />
              <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Analyzing Repository Structure...</h3>
            <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
              Our AI is parsing the file tree, reading key code blocks, and preparing targeted questions. This takes about 15-30 seconds.
            </p>
          </div>
        )}

        {/* REAL WALKTHROUGH RESULTS SECTION */}
        {data && data.isGuest && guestQuestions.length > 0 && (
          <section id="workspace-results" className="space-y-6 scroll-mt-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-lg">
              
              {/* STRENGTHENED OUTPUT HEADER */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-violet-600 font-semibold mb-1">
                    <span className="px-2.5 py-0.5 bg-violet-50 border border-violet-200 rounded-full">
                      5 Questions Generated
                    </span>
                    <span className="px-2.5 py-0.5 bg-violet-50 border border-violet-200 rounded-full font-mono">
                      {detectRepoLanguage(guestQuestions)}
                    </span>
                    <span className="px-2.5 py-0.5 bg-violet-50 border border-violet-200 rounded-full">
                      Generated in {((data?.timing?.totalMs || 3200) / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5 break-all" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    AI Interview Walkthrough: {data.repo}
                  </h2>
                </div>
                <a
                  href={`https://github.com/${data.repo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1 bg-violet-50 border border-violet-200 text-violet-600 text-xs rounded-full hover:bg-violet-100 transition-all font-semibold font-mono"
                >
                  {data.repo} ↗
                </a>
              </div>

              {/* Stacked list of questions */}
              <div className="flex flex-col gap-6 mb-6">
                {guestQuestions.map((q, qIdx) => (
                  <QuestionCard
                    key={q.id}
                    question={q.question}
                    snippet={q.snippet}
                    fileName={q.fileName}
                    difficulty={q.difficulty}
                    category={q.category}
                    answer={q.answer}
                    qIdx={qIdx}
                    showAnswer={!!showAnswers[q.id]}
                    toggleAnswer={() => toggleAnswer(q.id)}
                    note={scores[q.id]?.note || ''}
                    setNote={(val) => setNote(q.id, val)}
                    rating={scores[q.id]?.rating || null}
                    setRating={(val) => setRating(q.id, val)}
                    showNote={!!showNotes[q.id]}
                    toggleNote={() => toggleNote(q.id)}
                  />
                ))}
              </div>

              {/* AFTER QUESTIONS UPSELL BANNER */}
              <div className="rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md mb-6 animate-in fade-in duration-300"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(236,72,153,0.06) 100%)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔒</span>
                  <p className="text-xs sm:text-sm text-slate-700 font-medium">
                    Want to <strong>save this session</strong>? Get <strong>Code Story brief</strong>? Export <strong>PDF report</strong>?
                  </p>
                </div>
                <Link href="/register" className="px-4 py-2 font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap text-white hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                  Sign Up Free — It takes 30s
                </Link>
              </div>

              {/* WHAT YOU'RE MISSING LOCKED CARD */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  <span>🔒</span> What You're Missing (Pro Plan Features)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { label: 'Code Story Brief', tooltip: 'AI-generated one-page candidate resume mapping codebase commits to skills.' },
                    { label: 'Session History', tooltip: 'Keep all past candidate question walkthroughs, ratings, and notes.' },
                    { label: 'PDF Export', tooltip: 'Generate beautiful, recruiter-ready PDF reports with candidate scores.' },
                    { label: 'Recruiter Copilot', tooltip: 'Real-time follow-ups and AI evaluation scoring based on candidate answers.' }
                  ].map((feat) => (
                    <div key={feat.label} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                        <span>🔒</span> {feat.label}
                      </span>
                      <Link href="/register" className="text-[10px] text-violet-600 font-bold hover:underline whitespace-nowrap">
                        [SIGN UP TO UNLOCK]
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance / Aggregate Score Card Panel */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Aggregated Rating Score</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-violet-600">
                      {computeGuestOverallScore().percent}%
                    </span>
                    <span className="text-xs text-slate-400">
                      ({computeGuestOverallScore().rated} of 5 questions evaluated)
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleShare}
                    className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 10.742l-2.777 2.777m0 0l-2.777-2.777m2.777 2.777V3m9 10a9 9 0 11-18 0" />
                    </svg>
                    Share Questions
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to clear your current ratings?")) {
                        setScores({});
                      }
                    }}
                    className="px-4 py-2 border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Clear Ratings
                  </button>
                  <button
                    onClick={() => setShowProModal(true)}
                    className="px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 4px 14px rgba(124,58,237,0.30)' }}
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF Report
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 1 — HOW IT WORKS */}
        <ScrollFadeIn>
          <section className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>How It Works</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Generate dynamic coding interview walkthroughs in 3 simple steps.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-extrabold" style={{ color: 'rgba(124,58,237,0.15)' }}>01</span>
                  <div className="p-2.5 icon-bg-violet rounded-xl">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Paste Repository URL</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                    Paste any public GitHub repository link in the field above. Our scanner supports JavaScript, TypeScript, Python, Go, Java, and more.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-extrabold" style={{ color: 'rgba(236,72,153,0.15)' }}>02</span>
                  <div className="p-2.5 icon-bg-pink rounded-xl">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>AI Code Analysis</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                    Our server fetches the file tree recursively, filters out dependency files/noise, and reads the 3-5 most relevant source files.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-extrabold" style={{ color: 'rgba(249,112,102,0.15)' }}>03</span>
                  <div className="p-2.5 icon-bg-coral rounded-xl">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Get Interview Questions</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                    AI generates exactly 5 questions complete with difficulty levels, category classifications, and reference code snippets.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* SECTION 2 — WHY CODEWALK IS DIFFERENT */}
        <ScrollFadeIn>
          <section className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Why CodeWalk is Different</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Transform codebase exploration into deep engineering verification.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3 hover:border-violet-200 hover:shadow-md transition-all duration-300 shadow-sm">
                <div className="icon-bg-violet w-10 h-10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Your Code, Not Generic Questions</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  We generate questions directly from the candidate's actual repository submissions, not from a pre-built question bank. Spot unique design decisions instantly.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3 hover:border-violet-200 hover:shadow-md transition-all duration-300 shadow-sm">
                <div className="icon-bg-pink w-10 h-10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Code Story Brief</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  AI reads the entire repository structure and generates a comprehensive one-page summary highlighting language stats, complexity metrics, and capability briefs.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3 hover:border-violet-200 hover:shadow-md transition-all duration-300 shadow-sm">
                <div className="icon-bg-coral w-10 h-10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Recruiter Copilot</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Our interview copilot reads candidate answers in real-time, providing technical depth verification scorecards and suggesting contextual follow-ups.
                </p>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* SECTION 3 — GUEST VS PRO COMPARISON BANNER */}
        <ScrollFadeIn>
          <section className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Columns */}
              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Guest Column */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Guest Mode</h3>
                  <ul className="space-y-2">
                    {['3 free walkthroughs', '5 questions per repo', 'No session saved', 'No PDF report'].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <span className="text-rose-500 font-bold">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pro Column */}
                <div className="space-y-3 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-violet-600 flex items-center gap-1.5">
                    Pro Plan
                    <span className="px-2 py-0.5 text-[9px] bg-violet-50 text-violet-600 rounded border border-violet-200 font-bold uppercase">Popular</span>
                  </h3>
                  <ul className="space-y-2">
                    {['50 sessions per month', 'Unlimited questions', 'Session history saved', 'PDF report export', 'Code Story feature'].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <span className="text-violet-600 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Call to action button */}
              <div className="md:col-span-4 flex justify-center md:justify-end">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-6 py-3 text-white text-center font-bold text-sm rounded-xl shadow-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 4px 14px rgba(124,58,237,0.30)' }}
                >
                  Upgrade to Pro
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
              
            </div>
          </section>
        </ScrollFadeIn>

        {/* SECTION 4 — SAMPLE QUESTION PREVIEW */}
        <ScrollFadeIn>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Sample Output Preview</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Below is a sample question card showing the exact layout and options generated for repos.</p>
              </div>
              <span className="px-2.5 py-1 bg-violet-50 text-violet-600 border border-violet-200 text-xs font-semibold rounded-full uppercase tracking-wider">Example</span>
            </div>

            <QuestionCard
              question="Why did you use a recursive approach here instead of an iterative one?"
              snippet={`function findNode(node: TreeNode, id: string): TreeNode | null {
  if (!node) return null;
  if (node.id === id) return node;
  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}`}
              fileName="src/utils/treeNavigator.ts"
              difficulty="medium"
              category="backend"
              answer="Recursive traversal is more natural and cleaner for hierarchical data structures like trees. It avoids manual stack management which makes the logic less prone to errors."
              showAnswer={sampleShowAnswer}
              toggleAnswer={() => setSampleShowAnswer(!sampleShowAnswer)}
              isSample={true}
            />
          </section>
        </ScrollFadeIn>

      </div>

      {/* PRO UPGRADE MODAL */}
      {showProModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 w-full max-w-md rounded-2xl shadow-2xl p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Background glows */}
            <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(124,58,237,0.10)' }} />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(236,72,153,0.08)' }} />
            
            <div className="text-center relative">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.10), rgba(236,72,153,0.10))', border: '1px solid rgba(124,58,237,0.20)' }}>
                <svg className="w-6 h-6" fill="none" stroke="url(#grad1)" viewBox="0 0 24 24">
                  <defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Unlock PDF Exports &amp; Pro Features</h3>
              <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
                PDF report generation, unlimited questions, candidate Code Story summaries, and Recruiter Copilot are exclusive to our Pro Plan.
              </p>
              
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6 text-left space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <span className="text-violet-600 font-bold">✓</span>
                  <span>Professional PDF Report Exports</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <span className="text-violet-600 font-bold">✓</span>
                  <span>50 Full Sessions per Month (Unlimited Questions)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <span className="text-violet-600 font-bold">✓</span>
                  <span>Save Candidate Interview History</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowProModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Close
                </button>
                <Link
                  href="/register"
                  className="flex-1 px-4 py-2.5 font-bold text-xs rounded-xl text-center text-white shadow-lg transition-colors hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 4px 14px rgba(124,58,237,0.30)' }}
                >
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
