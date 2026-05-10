// // 'use client';

// // import { useState, useEffect, useRef, useCallback } from 'react';

// // // ---------------------------------------------------------------------------
// // // Types
// // // ---------------------------------------------------------------------------

// // interface QuestionItem {
// //   category: string;
// //   lineRef?: string;
// //   question: string;
// //   answer: string;
// // }

// // interface FileResult {
// //   fileName: string;
// //   questions: string;
// //   parsed: QuestionItem[];
// // }

// // interface AnalyzeResponse {
// //   success: boolean;
// //   repo: string;
// //   questions: Array<{ fileName: string; questions: string }>;
// //   warnings: string[];
// //   summary: {
// //     successfulFiles: number;
// //     totalFiles: number;
// //     totalQuestions: number;
// //   };
// //   timing: { totalMs: number };
// //   error?: string;
// // }

// // interface ScoreEntry {
// //   rating: string;
// //   note: string;
// // }

// // interface ScorecardData {
// //   candidateName: string;
// //   interviewerName: string;
// //   role: string;
// //   repo: string;
// //   scores: Record<string, ScoreEntry>;
// //   overallPercentage: number;
// //   date: string;
// // }

// // // ---------------------------------------------------------------------------
// // // Constants
// // // ---------------------------------------------------------------------------

// // const RATING_OPTIONS = [
// //   { label: 'Excellent', value: 'excellent', color: 'bg-emerald-600' },
// //   { label: 'Good', value: 'good', color: 'bg-blue-600' },
// //   { label: 'Average', value: 'average', color: 'bg-yellow-600' },
// //   { label: 'Poor', value: 'poor', color: 'bg-red-600' },
// //   { label: 'Skip', value: 'skip', color: 'bg-gray-600' },
// // ];

// // const RATING_SCORES: Record<string, number> = {
// //   excellent: 100,
// //   good: 75,
// //   average: 50,
// //   poor: 25,
// //   skip: -1,
// // };

// // const MAX_FREE_ANALYSES = 3;

// // // ---------------------------------------------------------------------------
// // // Utility Functions
// // // ---------------------------------------------------------------------------

// // function getFileIcon(fileName: string): string {
// //   const ext = fileName.split('.').pop()?.toLowerCase() || '';
// //   if (['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(ext)) return '📘';
// //   if (['py', 'pyw'].includes(ext)) return '🐍';
// //   if (['rb'].includes(ext)) return '💎';
// //   if (['go'].includes(ext)) return '🐹';
// //   if (['rs'].includes(ext)) return '🦀';
// //   if (['java', 'kt', 'kts'].includes(ext)) return '☕';
// //   if (['c', 'cpp', 'cc', 'h', 'hpp'].includes(ext)) return '⚙️';
// //   if (['php'].includes(ext)) return '🐘';
// //   if (['swift'].includes(ext)) return '🐦';
// //   if (['dart'].includes(ext)) return '🎯';
// //   if (['vue', 'svelte'].includes(ext)) return '🖼️';
// //   if (['css', 'scss', 'sass'].includes(ext)) return '🎨';
// //   if (['html', 'htm'].includes(ext)) return '🌐';
// //   if (['json', 'yaml', 'yml', 'toml'].includes(ext)) return '📄';
// //   return '📝';
// // }

// // function getTodayKey(): string {
// //   const today = new Date();
// //   const yyyy = today.getFullYear();
// //   const mm = String(today.getMonth() + 1).padStart(2, '0');
// //   const dd = String(today.getDate()).padStart(2, '0');
// //   return `codewalk_${yyyy}-${mm}-${dd}`;
// // }

// // function getUsageCount(): number {
// //   if (typeof window === 'undefined') return 0;
// //   const stored = localStorage.getItem(getTodayKey());
// //   return stored ? parseInt(stored, 10) : 0;
// // }

// // function incrementUsage(): void {
// //   const key = getTodayKey();
// //   const current = getUsageCount();
// //   localStorage.setItem(key, String(current + 1));
// // }

// // function parseQuestions(raw: string): QuestionItem[] {
// //   const items: QuestionItem[] = [];
// //   const blocks = raw.split(/\n(?=\[(?:C|P|D|Domain)\])/);

// //   for (const block of blocks) {
// //     const trimmed = block.trim();
// //     if (!trimmed) continue;

// //     const categoryMatch = trimmed.match(/^\[(C|P|D|Domain)\]/);
// //     if (!categoryMatch) continue;

// //     const category = categoryMatch[1];
// //     let rest = trimmed.slice(categoryMatch[0].length).trim();

// //     let lineRef: string | undefined;
// //     if (category === 'C') {
// //       const lineMatch = rest.match(/^\(Line[s]?\s+[\d\-–,\s]+\)/i);
// //       if (lineMatch) {
// //         lineRef = lineMatch[0];
// //         rest = rest.slice(lineMatch[0].length).trim();
// //       }
// //     }

// //     // Split into Q and A parts
// //     const qaParts = rest.split(/\n\s*A:\s*/);
// //     const questionPart = qaParts[0]
// //       ?.replace(/^Q:\s*/, '')
// //       .trim() || '';
// //     const answerPart = qaParts[1]?.trim() || '';

// //     if (questionPart) {
// //       items.push({
// //         category,
// //         lineRef,
// //         question: questionPart,
// //         answer: answerPart,
// //       });
// //     }
// //   }

// //   return items;
// // }

// // function getCategoryLabel(cat: string): string {
// //   switch (cat) {
// //     case 'C': return 'Comprehension';
// //     case 'P': return 'Pattern';
// //     case 'D': return 'Debug';
// //     case 'Domain': return 'Domain';
// //     default: return cat;
// //   }
// // }

// // // ---------------------------------------------------------------------------
// // // Main Page Component
// // // ---------------------------------------------------------------------------

// // export default function HomePage() {
// //   // Core state
// //   const [repoUrl, setRepoUrl] = useState('');
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState<string | null>(null);
// //   const [results, setResults] = useState<FileResult[] | null>(null);
// //   const [currentFileIdx, setCurrentFileIdx] = useState(0);

// //   // Scores (localStorage persisted)
// //   const [scores, setScores] = useState<Record<string, ScoreEntry>>({});

// //   // Toggle states
// //   const [openAnswers, setOpenAnswers] = useState<Record<string, boolean>>({});
// //   const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});

// //   // Usage tracking
// //   const [usageCount, setUsageCount] = useState(0);

// //   // Modal state
// //   const [showModal, setShowModal] = useState(false);
// //   const [candidateName, setCandidateName] = useState('');
// //   const [interviewerName, setInterviewerName] = useState('');
// //   const [role, setRole] = useState('');

// //   // Scorecard collapsible
// //   const [showScorecard, setShowScorecard] = useState(false);

// //   // Refs
// //   const scorecardRef = useRef<HTMLDivElement>(null);
// //   const resultsRef = useRef<HTMLDivElement>(null);

// //   // Load usage count and scores from localStorage on mount
// //   useEffect(() => {
// //     setUsageCount(getUsageCount());
// //     const savedScores = localStorage.getItem('codewalk_scores');
// //     if (savedScores) {
// //       try {
// //         setScores(JSON.parse(savedScores));
// //       } catch {
// //         // Ignore corrupted data
// //       }
// //     }
// //   }, []);

// //   // Persist scores to localStorage whenever they change
// //   useEffect(() => {
// //     if (Object.keys(scores).length > 0) {
// //       localStorage.setItem('codewalk_scores', JSON.stringify(scores));
// //     }
// //   }, [scores]);

// //   // Keyboard navigation
// //   useEffect(() => {
// //     function handleKeyDown(e: KeyboardEvent) {
// //       if (!results || results.length === 0) return;
// //       if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

// //       if (e.key === 'ArrowLeft') {
// //         e.preventDefault();
// //         setCurrentFileIdx((prev) => Math.max(0, prev - 1));
// //       } else if (e.key === 'ArrowRight') {
// //         e.preventDefault();
// //         setCurrentFileIdx((prev) => Math.min(results.length - 1, prev + 1));
// //       }
// //     }

// //     window.addEventListener('keydown', handleKeyDown);
// //     return () => window.removeEventListener('keydown', handleKeyDown);
// //   }, [results]);

// //   // -------------------------------------------------------------------------
// //   // Handlers
// //   // -------------------------------------------------------------------------

// //   const handleAnalyze = useCallback(async () => {
// //     if (!repoUrl.trim()) {
// //       setError('Please enter a GitHub repository URL.');
// //       return;
// //     }

// //     if (usageCount >= MAX_FREE_ANALYSES) {
// //       setError(
// //         `Daily limit reached (${MAX_FREE_ANALYSES} analyses per day). Come back tomorrow!`
// //       );
// //       return;
// //     }

// //     setLoading(true);
// //     setError(null);
// //     setResults(null);
// //     setCurrentFileIdx(0);
// //     setOpenAnswers({});
// //     setOpenNotes({});

// //     try {
// //       const response = await fetch('/api/analyze', {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify({ repoUrl: repoUrl.trim() }),
// //       });

// //       const data: AnalyzeResponse = await response.json();

// //       if (!response.ok || !data.success) {
// //         setError(data.error || `Request failed with status ${response.status}`);
// //         return;
// //       }

// //       const parsed: FileResult[] = data.questions.map((q) => ({
// //         fileName: q.fileName,
// //         questions: q.questions,
// //         parsed: parseQuestions(q.questions),
// //       }));

// //       setResults(parsed);
// //       incrementUsage();
// //       setUsageCount(getUsageCount());
// //     } catch (err: unknown) {
// //       const message = err instanceof Error ? err.message : 'Network error';
// //       setError(`Failed to analyze repository: ${message}`);
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [repoUrl, usageCount]);

// //   const handleRating = (questionKey: string, rating: string) => {
// //     setScores((prev) => ({
// //       ...prev,
// //       [questionKey]: { ...prev[questionKey], rating, note: prev[questionKey]?.note || '' },
// //     }));
// //   };

// //   const handleNote = (questionKey: string, note: string) => {
// //     setScores((prev) => ({
// //       ...prev,
// //       [questionKey]: { ...prev[questionKey], note, rating: prev[questionKey]?.rating || '' },
// //     }));
// //   };

// //   const toggleAnswer = (key: string) => {
// //     setOpenAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
// //   };

// //   const toggleNotes = (key: string) => {
// //     setOpenNotes((prev) => ({ ...prev, [key]: !prev[key] }));
// //   };

// //   const copyToClipboard = (text: string) => {
// //     navigator.clipboard.writeText(text);
// //   };

// //   const calculateOverallScore = (): number => {
// //     const rated = Object.values(scores).filter(
// //       (s) => s.rating && s.rating !== 'skip'
// //     );
// //     if (rated.length === 0) return 0;
// //     const total = rated.reduce(
// //       (sum, s) => sum + (RATING_SCORES[s.rating] || 0),
// //       0
// //     );
// //     return Math.round(total / rated.length);
// //   };

// //   const clearAllScores = () => {
// //     setScores({});
// //     localStorage.removeItem('codewalk_scores');
// //   };

// //   const generateScorecardJSON = (): ScorecardData => {
// //     return {
// //       candidateName,
// //       interviewerName,
// //       role,
// //       repo: repoUrl,
// //       scores,
// //       overallPercentage: calculateOverallScore(),
// //       date: new Date().toISOString(),
// //     };
// //   };

// //   const handleCopyJSON = () => {
// //     const data = generateScorecardJSON();
// //     copyToClipboard(JSON.stringify(data, null, 2));
// //   };

// //   const handleGeneratePDF = async () => {
// //     const { jsPDF } = await import('jspdf');
// //     const doc = new jsPDF();

// //     const margin = 20;
// //     let y = margin;

// //     // Title
// //     doc.setFontSize(20);
// //     doc.setFont('helvetica', 'bold');
// //     doc.text('CodeWalk Interview Scorecard', margin, y);
// //     y += 12;

// //     // Meta info
// //     doc.setFontSize(11);
// //     doc.setFont('helvetica', 'normal');
// //     doc.text(`Candidate: ${candidateName || 'N/A'}`, margin, y);
// //     y += 7;
// //     doc.text(`Interviewer: ${interviewerName || 'N/A'}`, margin, y);
// //     y += 7;
// //     doc.text(`Role: ${role || 'N/A'}`, margin, y);
// //     y += 7;
// //     doc.text(`Repository: ${repoUrl}`, margin, y);
// //     y += 7;
// //     doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, y);
// //     y += 7;
// //     doc.text(`Overall Score: ${calculateOverallScore()}%`, margin, y);
// //     y += 12;

// //     // Scores table
// //     doc.setFontSize(12);
// //     doc.setFont('helvetica', 'bold');
// //     doc.text('Question Scores:', margin, y);
// //     y += 8;

// //     doc.setFontSize(9);
// //     doc.setFont('helvetica', 'normal');

// //     if (results) {
// //       for (const file of results) {
// //         for (let qi = 0; qi < file.parsed.length; qi++) {
// //           const q = file.parsed[qi];
// //           const key = `${file.fileName}_${qi}`;
// //           const score = scores[key];

// //           if (y > 270) {
// //             doc.addPage();
// //             y = margin;
// //           }

// //           const questionText = `[${q.category}] ${q.question.substring(0, 80)}${q.question.length > 80 ? '...' : ''}`;
// //           const ratingText = score?.rating ? score.rating.toUpperCase() : 'Not Rated';
// //           doc.text(`${file.fileName} - Q${qi + 1}: ${ratingText}`, margin, y);
// //           y += 5;
// //           doc.text(`  ${questionText}`, margin, y);
// //           y += 5;

// //           if (score?.note) {
// //             doc.text(`  Note: ${score.note.substring(0, 100)}`, margin, y);
// //             y += 5;
// //           }

// //           y += 3;
// //         }
// //       }
// //     }

// //     doc.save(`codewalk-scorecard-${candidateName || 'candidate'}.pdf`);
// //     setShowModal(false);
// //   };

// //   const handleScreenshot = async () => {
// //     if (!resultsRef.current) return;
// //     const html2canvas = (await import('html2canvas')).default;
// //     const canvas = await html2canvas(resultsRef.current, {
// //       backgroundColor: '#0f172a',
// //       scale: 2,
// //     });
// //     const link = document.createElement('a');
// //     link.download = 'codewalk-screenshot.png';
// //     link.href = canvas.toDataURL();
// //     link.click();
// //   };

// //   // -------------------------------------------------------------------------
// //   // Render helpers
// //   // -------------------------------------------------------------------------

// //   const currentFile = results?.[currentFileIdx] || null;
// //   const remainingAnalyses = Math.max(0, MAX_FREE_ANALYSES - usageCount);

// //   // -------------------------------------------------------------------------
// //   // JSX
// //   // -------------------------------------------------------------------------

// //   return (
// //     <div className="min-h-screen bg-slate-900 text-white">
// //       {/* Header */}
// //       <header className="border-b border-slate-700 px-6 py-4">
// //         <div className="mx-auto max-w-6xl flex items-center justify-between">
// //           <h1 className="text-2xl font-bold tracking-tight">
// //             <span className="text-blue-400">Code</span>Walk
// //           </h1>
// //           <div className="flex items-center gap-4">
// //             <span className="text-sm text-gray-500">
// //               {remainingAnalyses}/{MAX_FREE_ANALYSES} analyses remaining today
// //             </span>
// //             {results && (
// //               <button
// //                 onClick={() => setShowModal(true)}
// //                 className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
// //               >
// //                 Generate Scorecard
// //               </button>
// //             )}
// //           </div>
// //         </div>
// //       </header>

// //       <main className="mx-auto max-w-6xl px-6 py-8">
// //         {/* Input Section */}
// //         <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 mb-8">
// //           <h2 className="text-lg font-semibold mb-2">Analyze a Repository</h2>
// //           <p className="text-gray-300 text-sm mb-4">
// //             Paste a GitHub repository URL to generate interview questions from its source code.
// //           </p>
// //           <div className="flex gap-3">
// //             <input
// //               type="url"
// //               value={repoUrl}
// //               onChange={(e) => setRepoUrl(e.target.value)}
// //               onKeyDown={(e) => {
// //                 if (e.key === 'Enter' && !loading) handleAnalyze();
// //               }}
// //               placeholder="https://github.com/owner/repo"
// //               className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
// //               disabled={loading}
// //             />
// //             <button
// //               onClick={handleAnalyze}
// //               disabled={loading || usageCount >= MAX_FREE_ANALYSES}
// //               className="rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
// //             >
// //               {loading ? (
// //                 <span className="flex items-center gap-2">
// //                   <svg
// //                     className="h-4 w-4 animate-spin"
// //                     viewBox="0 0 24 24"
// //                     fill="none"
// //                   >
// //                     <circle
// //                       className="opacity-25"
// //                       cx="12"
// //                       cy="12"
// //                       r="10"
// //                       stroke="currentColor"
// //                       strokeWidth="4"
// //                     />
// //                     <path
// //                       className="opacity-75"
// //                       fill="currentColor"
// //                       d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
// //                     />
// //                   </svg>
// //                   Analyzing...
// //                 </span>
// //               ) : (
// //                 'Analyze'
// //               )}
// //             </button>
// //           </div>

// //           {error && (
// //             <div className="mt-4 rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-red-300 text-sm">
// //               {error}
// //             </div>
// //           )}

// //           {loading && (
// //             <div className="mt-4 text-sm text-gray-300">
// //               <div className="flex items-center gap-2">
// //                 <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
// //                 Fetching repository and generating questions... This may take 30-60 seconds.
// //               </div>
// //             </div>
// //           )}
// //         </div>

// //         {/* Results Section */}
// //         {results && results.length > 0 && (
// //           <div ref={resultsRef}>
// //             {/* File Navigation */}
// //             <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 mb-6">
// //               <div className="flex items-center justify-between">
// //                 <button
// //                   onClick={() =>
// //                     setCurrentFileIdx((prev) => Math.max(0, prev - 1))
// //                   }
// //                   disabled={currentFileIdx === 0}
// //                   className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
// //                 >
// //                   ← Previous
// //                 </button>

// //                 <div className="flex items-center gap-2 text-center">
// //                   <span className="text-lg">
// //                     {currentFile ? getFileIcon(currentFile.fileName) : '📝'}
// //                   </span>
// //                   <span className="font-mono text-sm font-semibold text-blue-400">
// //                     {currentFile?.fileName || ''}
// //                   </span>
// //                   <span className="text-xs text-gray-500 ml-2">
// //                     ({currentFileIdx + 1} of {results.length})
// //                   </span>
// //                 </div>

// //                 <button
// //                   onClick={() =>
// //                     setCurrentFileIdx((prev) =>
// //                       Math.min(results.length - 1, prev + 1)
// //                     )
// //                   }
// //                   disabled={currentFileIdx === results.length - 1}
// //                   className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
// //                 >
// //                   Next →
// //                 </button>
// //               </div>
// //               <p className="text-center text-xs text-gray-500 mt-2">
// //                 Use ← → arrow keys to navigate
// //               </p>
// //             </div>

// //             {/* Questions List */}
// //             {currentFile && currentFile.parsed.length > 0 && (
// //               <div className="space-y-4 mb-8">
// //                 {currentFile.parsed.map((q, qi) => {
// //                   const questionKey = `${currentFile.fileName}_${qi}`;
// //                   const isAnswerOpen = openAnswers[questionKey] || false;
// //                   const isNotesOpen = openNotes[questionKey] || false;
// //                   const currentScore = scores[questionKey];

// //                   return (
// //                     <div
// //                       key={questionKey}
// //                       className="rounded-xl border border-slate-700 bg-slate-800 p-5"
// //                     >
// //                       {/* Question Header */}
// //                       <div className="flex items-start justify-between mb-3">
// //                         <div className="flex items-center gap-2 flex-wrap">
// //                           <span className="inline-flex items-center rounded-md bg-slate-700 px-2.5 py-1 text-xs font-medium text-blue-400">
// //                             {getCategoryLabel(q.category)}
// //                           </span>
// //                           {q.lineRef && (
// //                             <span className="text-xs text-gray-500 font-mono">
// //                               {q.lineRef}
// //                             </span>
// //                           )}
// //                           <span className="text-xs text-gray-500">
// //                             Q{qi + 1}
// //                           </span>
// //                         </div>
// //                         <button
// //                           onClick={() => {
// //                             const text = `Q: ${q.question}\nA: ${q.answer}`;
// //                             copyToClipboard(text);
// //                           }}
// //                           className="rounded-md border border-slate-700 px-2 py-1 text-xs text-gray-400 hover:text-white hover:border-slate-500 transition-colors"
// //                           title="Copy Q&A"
// //                         >
// //                           Copy Q&A
// //                         </button>
// //                       </div>

// //                       {/* Question Text */}
// //                       <p className="text-gray-100 mb-3 leading-relaxed">
// //                         {q.question}
// //                       </p>

// //                       {/* Action buttons */}
// //                       <div className="flex items-center gap-2 mb-3">
// //                         <button
// //                           onClick={() => toggleAnswer(questionKey)}
// //                           className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-slate-700 transition-colors"
// //                         >
// //                           {isAnswerOpen ? 'Hide Answer' : 'Show Answer'}
// //                         </button>
// //                         <button
// //                           onClick={() => toggleNotes(questionKey)}
// //                           className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-slate-700 transition-colors"
// //                         >
// //                           {isNotesOpen ? 'Hide Notes' : 'Add Notes'}
// //                         </button>
// //                       </div>

// //                       {/* Answer */}
// //                       {isAnswerOpen && q.answer && (
// //                         <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 mb-3">
// //                           <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
// //                             {q.answer}
// //                           </p>
// //                         </div>
// //                       )}

// //                       {/* Notes */}
// //                       {isNotesOpen && (
// //                         <div className="mb-3">
// //                           <textarea
// //                             value={currentScore?.note || ''}
// //                             onChange={(e) =>
// //                               handleNote(questionKey, e.target.value)
// //                             }
// //                             placeholder="Add interview notes here..."
// //                             className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y min-h-[60px]"
// //                             rows={2}
// //                           />
// //                         </div>
// //                       )}

// //                       {/* Rating Buttons */}
// //                       <div className="flex items-center gap-2 flex-wrap">
// //                         <span className="text-xs text-gray-500 mr-1">
// //                           Rate:
// //                         </span>
// //                         {RATING_OPTIONS.map((opt) => (
// //                           <button
// //                             key={opt.value}
// //                             onClick={() => handleRating(questionKey, opt.value)}
// //                             className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
// //                               currentScore?.rating === opt.value
// //                                 ? `${opt.color} text-white ring-2 ring-offset-1 ring-offset-slate-800 ring-white/30`
// //                                 : `${opt.color}/20 text-gray-300 hover:${opt.color}/40`
// //                             }`}
// //                           >
// //                             {opt.label}
// //                           </button>
// //                         ))}
// //                       </div>
// //                     </div>
// //                   );
// //                 })}
// //               </div>
// //             )}

// //             {currentFile && currentFile.parsed.length === 0 && (
// //               <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center text-gray-400 mb-8">
// //                 <p>No parseable questions found for this file.</p>
// //                 <details className="mt-3 text-left">
// //                   <summary className="cursor-pointer text-sm text-gray-500">
// //                     View raw output
// //                   </summary>
// //                   <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-gray-400 whitespace-pre-wrap">
// //                     {currentFile.questions}
// //                   </pre>
// //                 </details>
// //               </div>
// //             )}

// //             {/* Scorecard Section */}
// //             <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 mb-8">
// //               <div className="flex items-center justify-between mb-3">
// //                 <button
// //                   onClick={() => setShowScorecard(!showScorecard)}
// //                   className="text-lg font-semibold hover:text-blue-400 transition-colors"
// //                 >
// //                   {showScorecard ? '▾' : '▸'} Scorecard Summary
// //                 </button>
// //                 <div className="flex items-center gap-3">
// //                   <span className="text-sm text-gray-300">
// //                     Overall:{' '}
// //                     <span className="font-bold text-blue-400">
// //                       {calculateOverallScore()}%
// //                     </span>
// //                   </span>
// //                   <button
// //                     onClick={handleScreenshot}
// //                     className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-gray-300 hover:bg-slate-700 transition-colors"
// //                   >
// //                     📷 Screenshot
// //                   </button>
// //                   <button
// //                     onClick={clearAllScores}
// //                     className="rounded-md border border-red-800 px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/30 transition-colors"
// //                   >
// //                     Clear All
// //                   </button>
// //                 </div>
// //               </div>

// //               {showScorecard && (
// //                 <div ref={scorecardRef} className="overflow-x-auto">
// //                   <table className="w-full text-sm">
// //                     <thead>
// //                       <tr className="border-b border-slate-700 text-left text-gray-400">
// //                         <th className="pb-2 pr-4">File</th>
// //                         <th className="pb-2 pr-4">Q#</th>
// //                         <th className="pb-2 pr-4">Category</th>
// //                         <th className="pb-2 pr-4">Rating</th>
// //                         <th className="pb-2">Notes</th>
// //                       </tr>
// //                     </thead>
// //                     <tbody>
// //                       {results.map((file) =>
// //                         file.parsed.map((q, qi) => {
// //                           const key = `${file.fileName}_${qi}`;
// //                           const entry = scores[key];
// //                           if (!entry?.rating) return null;
// //                           return (
// //                             <tr
// //                               key={key}
// //                               className="border-b border-slate-700/50"
// //                             >
// //                               <td className="py-2 pr-4 font-mono text-xs text-gray-400">
// //                                 {file.fileName}
// //                               </td>
// //                               <td className="py-2 pr-4 text-gray-400">
// //                                 {qi + 1}
// //                               </td>
// //                               <td className="py-2 pr-4">
// //                                 <span className="inline-flex items-center rounded-md bg-slate-700 px-2 py-0.5 text-xs text-blue-400">
// //                                   {getCategoryLabel(q.category)}
// //                                 </span>
// //                               </td>
// //                               <td className="py-2 pr-4 capitalize text-gray-300">
// //                                 {entry.rating}
// //                               </td>
// //                               <td className="py-2 text-xs text-gray-500 max-w-[200px] truncate">
// //                                 {entry.note || '—'}
// //                               </td>
// //                             </tr>
// //                           );
// //                         })
// //                       )}
// //                     </tbody>
// //                   </table>

// //                   {Object.values(scores).filter((s) => s.rating).length === 0 && (
// //                     <p className="text-center text-gray-500 text-sm py-4">
// //                       No ratings recorded yet. Rate questions above to see the summary.
// //                     </p>
// //                   )}
// //                 </div>
// //               )}
// //             </div>
// //           </div>
// //         )}

// //         {/* Empty state */}
// //         {!results && !loading && !error && (
// //           <div className="rounded-xl border border-slate-700 bg-slate-800 p-12 text-center">
// //             <div className="text-5xl mb-4">🚀</div>
// //             <h2 className="text-xl font-semibold mb-2">
// //               Ready to Walk Through Code
// //             </h2>
// //             <p className="text-gray-300 max-w-md mx-auto">
// //               Paste a public GitHub repository URL above to generate structured
// //               interview questions covering comprehension, patterns, debugging,
// //               and domain knowledge.
// //             </p>
// //           </div>
// //         )}
// //       </main>

// //       {/* Footer */}
// //       <footer className="border-t border-slate-700 px-6 py-6 mt-12">
// //         <div className="mx-auto max-w-6xl">
// //           <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 mb-4">
// //             <h3 className="text-sm font-semibold text-gray-300 mb-2">
// //               💡 Interviewer Tips
// //             </h3>
// //             <ul className="text-xs text-gray-500 space-y-1">
// //               <li>
// //                 • Start with [C] comprehension questions to ease the candidate in.
// //               </li>
// //               <li>
// //                 • Use [P] pattern questions to assess architectural thinking.
// //               </li>
// //               <li>
// //                 • [D] debug questions reveal problem-solving under pressure.
// //               </li>
// //               <li>
// //                 • [Domain] questions test real-world context awareness.
// //               </li>
// //               <li>
// //                 • Let the candidate explain their thought process — silence is okay.
// //               </li>
// //             </ul>
// //           </div>
// //           <div className="flex items-center justify-between text-xs text-gray-500">
// //             <span>
// //               {remainingAnalyses} of {MAX_FREE_ANALYSES} free analyses remaining today
// //             </span>
// //             <span>Created by Harshvardhan Modi</span>
// //           </div>
// //         </div>
// //       </footer>

// //       {/* Generate Scorecard Modal */}
// //       {showModal && (
// //         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
// //           <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-2xl">
// //             <div className="flex items-center justify-between mb-5">
// //               <h2 className="text-lg font-semibold">Generate Scorecard</h2>
// //               <button
// //                 onClick={() => setShowModal(false)}
// //                 className="text-gray-400 hover:text-white transition-colors"
// //               >
// //                 ✕
// //               </button>
// //             </div>

// //             <div className="space-y-4 mb-6">
// //               <div>
// //                 <label className="block text-sm text-gray-300 mb-1">
// //                   Candidate Name
// //                 </label>
// //                 <input
// //                   type="text"
// //                   value={candidateName}
// //                   onChange={(e) => setCandidateName(e.target.value)}
// //                   placeholder="Jane Doe"
// //                   className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
// //                 />
// //               </div>
// //               <div>
// //                 <label className="block text-sm text-gray-300 mb-1">
// //                   Interviewer Name
// //                 </label>
// //                 <input
// //                   type="text"
// //                   value={interviewerName}
// //                   onChange={(e) => setInterviewerName(e.target.value)}
// //                   placeholder="John Smith"
// //                   className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
// //                 />
// //               </div>
// //               <div>
// //                 <label className="block text-sm text-gray-300 mb-1">
// //                   Role
// //                 </label>
// //                 <input
// //                   type="text"
// //                   value={role}
// //                   onChange={(e) => setRole(e.target.value)}
// //                   placeholder="Senior Frontend Engineer"
// //                   className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
// //                 />
// //               </div>
// //             </div>

// //             <div className="flex items-center justify-between border-t border-slate-700 pt-4">
// //               <div className="text-sm text-gray-400">
// //                 Overall: <span className="font-bold text-blue-400">{calculateOverallScore()}%</span>
// //               </div>
// //               <div className="flex gap-2">
// //                 <button
// //                   onClick={handleCopyJSON}
// //                   className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 transition-colors"
// //                 >
// //                   Copy JSON
// //                 </button>
// //                 <button
// //                   onClick={handleGeneratePDF}
// //                   className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
// //                 >
// //                   Generate PDF
// //                 </button>
// //               </div>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }
// 'use client';

// /**
//  * CodeWalk - AI-powered technical interview question generator
//  */
// import { useState, useEffect, useRef, useCallback } from 'react';
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';
// import html2canvas from 'html2canvas';

// interface ParsedQuestion {
//   category: 'C' | 'P' | 'D' | 'Domain';
//   categoryLabel: string;
//   question: string;
//   answer: string;
//   lineNumber: number | null;
// }

// interface FileResult {
//   fileName: string;
//   questions: string;
//   parsed: ParsedQuestion[];
//   fileContent?: string;
// }

// interface ApiResponse {
//   success: boolean;
//   repo?: string;
//   questions?: { fileName: string; questions: string }[];
//   warnings?: string[];
//   summary?: { successfulFiles: number; totalFiles: number; totalQuestions: number };
//   error?: string;
// }

// const RATING_VALUES: Record<string, number> = {
//   Excellent: 5,
//   Good: 4,
//   Average: 3,
//   Poor: 1,
//   Skip: 0,
// };

// const CATEGORY_LABELS: Record<string, string> = {
//   C: 'Code Logic',
//   P: 'Project Logic',
//   D: 'Documentation',
//   Domain: 'Domain Logic',
// };

// const FREE_TIER_LIMIT = 3;

// const EXAMPLE_REPOS = [
//   { name: 'Hello-World', url: 'https://github.com/octocat/Hello-World' },
//   { name: 'Tailwind CSS', url: 'https://github.com/tailwindlabs/tailwindcss' },
//   { name: 'FastAPI', url: 'https://github.com/tiangolo/fastapi' },
// ];

// /**
//  * Parse Groq output into structured questions
//  */
// function parseQuestions(raw: string): ParsedQuestion[] {
//   const result: ParsedQuestion[] = [];
//   const blockRegex = /\[(C|P|D|Domain)\]\s*([\s\S]*?)(?=\n\s*\[(?:C|P|D|Domain)\]|$)/g;
//   let m;
//   while ((m = blockRegex.exec(raw)) !== null) {
//     const category = m[1] as 'C' | 'P' | 'D' | 'Domain';
//     const body = m[2].trim();
//     const aIdx = body.search(/\n\s*A:\s*/);
//     let question = body;
//     let answer = '';
//     if (aIdx !== -1) {
//       question = body.slice(0, aIdx).trim();
//       answer = body.replace(/^[\s\S]*?\n\s*A:\s*/, '').trim();
//     }
//     const lineMatch = question.match(/Line\s*(\d+)/i);
//     result.push({
//       category,
//       categoryLabel: CATEGORY_LABELS[category],
//       question: question.replace(/^Line\s*\d+:\s*/i, '').trim(),
//       answer,
//       lineNumber: lineMatch ? parseInt(lineMatch[1], 10) : null,
//     });
//   }
//   return result;
// }

// /**
//  * File-extension based icon (text-only, no emojis)
//  */
// function getFileIcon(name: string): string {
//   const ext = name.split('.').pop()?.toLowerCase() || '';
//   const map: Record<string, string> = {
//     ts: 'TS', tsx: 'TSX', js: 'JS', jsx: 'JSX',
//     py: 'PY', java: 'JAVA', go: 'GO', rs: 'RS',
//     rb: 'RB', php: 'PHP', cs: 'C#', cpp: 'CPP',
//     c: 'C', vue: 'VUE', svelte: 'SVL',
//   };
//   return map[ext] || 'FILE';
// }

// export default function CodeWalkPage() {
//   const [repoUrl, setRepoUrl] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [results, setResults] = useState<FileResult[]>([]);
//   const [repoName, setRepoName] = useState('');
//   const [warnings, setWarnings] = useState<string[]>([]);
//   const [currentFileIdx, setCurrentFileIdx] = useState(0);
//   const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
//   const [scores, setScores] = useState<Record<string, string>>({});
//   const [notes, setNotes] = useState<Record<string, string>>({});
//   const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
//   const [showSummary, setShowSummary] = useState(false);
//   const [showModal, setShowModal] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const [progressMsg, setProgressMsg] = useState('');
//   const [usageCount, setUsageCount] = useState(0);
//   const [candidateName, setCandidateName] = useState('');
//   const [interviewerName, setInterviewerName] = useState('');
//   const [roleApplied, setRoleApplied] = useState('');
//   const [copyToast, setCopyToast] = useState('');

//   const resultsRef = useRef<HTMLDivElement>(null);

//   // Free-tier daily counter
//   const todayKey = `codewalk_${new Date().toISOString().slice(0, 10)}`;

//   useEffect(() => {
//     const stored = parseInt(localStorage.getItem(todayKey) || '0', 10);
//     setUsageCount(stored);
//     const savedScores = localStorage.getItem('codewalk_scores');
//     const savedNotes = localStorage.getItem('codewalk_notes');
//     if (savedScores) setScores(JSON.parse(savedScores));
//     if (savedNotes) setNotes(JSON.parse(savedNotes));
//   }, [todayKey]);

//   useEffect(() => {
//     localStorage.setItem('codewalk_scores', JSON.stringify(scores));
//   }, [scores]);

//   useEffect(() => {
//     localStorage.setItem('codewalk_notes', JSON.stringify(notes));
//   }, [notes]);

//   // Keyboard navigation
//   const navigateFile = useCallback(
//     (dir: number) => {
//       setCurrentFileIdx((idx) => {
//         const next = idx + dir;
//         if (next < 0 || next >= results.length) return idx;
//         return next;
//       });
//     },
//     [results.length]
//   );

//   useEffect(() => {
//     const handler = (e: KeyboardEvent) => {
//       if (results.length === 0) return;
//       const target = e.target as HTMLElement;
//       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
//       if (e.key === 'ArrowLeft') navigateFile(-1);
//       if (e.key === 'ArrowRight') navigateFile(1);
//     };
//     window.addEventListener('keydown', handler);
//     return () => window.removeEventListener('keydown', handler);
//   }, [navigateFile, results.length]);

//   // Fake progress while loading
//   useEffect(() => {
//     if (!loading) {
//       setProgress(0);
//       return;
//     }
//     let p = 0;
//     const id = setInterval(() => {
//       p = Math.min(p + Math.random() * 8, 92);
//       setProgress(p);
//     }, 800);
//     return () => clearInterval(id);
//   }, [loading]);

//   const showToast = (msg: string) => {
//     setCopyToast(msg);
//     setTimeout(() => setCopyToast(''), 1800);
//   };

//   /**
//    * Submit repo URL and fetch generated questions
//    */
//   const handleAnalyze = async () => {
//     setError('');
//     if (!repoUrl.trim()) {
//       setError('Please enter a GitHub URL');
//       return;
//     }
//     if (usageCount >= FREE_TIER_LIMIT) {
//       setError(`Daily free limit (${FREE_TIER_LIMIT}) reached. Try again tomorrow.`);
//       return;
//     }

//     setLoading(true);
//     setResults([]);
//     setProgressMsg('Fetching repository...');

//     try {
//       const res = await fetch('/api/analyze', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ repoUrl: repoUrl.trim() }),
//       });
//       const data: ApiResponse = await res.json();

//       if (!data.success) {
//         setError(data.error || 'Analysis failed');
//         setLoading(false);
//         return;
//       }

//       const parsed: FileResult[] = (data.questions || []).map((q) => ({
//         fileName: q.fileName,
//         questions: q.questions,
//         parsed: parseQuestions(q.questions),
//       }));

//       setResults(parsed);
//       setRepoName(data.repo || '');
//       setWarnings(data.warnings || []);
//       setCurrentFileIdx(0);
//       setProgress(100);

//       // Update usage count
//       const newCount = usageCount + 1;
//       setUsageCount(newCount);
//       localStorage.setItem(todayKey, String(newCount));

//       // Scroll to results
//       setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
//     } catch (e: any) {
//       setError(e.message || 'Network error');
//     } finally {
//       setLoading(false);
//       setProgressMsg('');
//     }
//   };

//   const toggleAnswer = (key: string) => {
//     setRevealedAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
//   };

//   const setRating = (key: string, rating: string) => {
//     setScores((prev) => ({ ...prev, [key]: rating }));
//   };

//   const setNote = (key: string, value: string) => {
//     setNotes((prev) => ({ ...prev, [key]: value }));
//   };

//   const clearAllScores = () => {
//     if (!confirm('Clear all ratings and notes?')) return;
//     setScores({});
//     setNotes({});
//   };

//   /**
//    * Compute overall percentage score (0-100)
//    */
//   const computeOverallScore = (): number => {
//     const ratings = Object.values(scores).filter((r) => r && r !== 'Skip');
//     if (ratings.length === 0) return 0;
//     const total = ratings.reduce((sum, r) => sum + (RATING_VALUES[r] || 0), 0);
//     const max = ratings.length * 5;
//     return Math.round((total / max) * 100);
//   };

//   const overallScore = computeOverallScore();
//   const scoreColor =
//     overallScore >= 80 ? 'text-emerald-400' : overallScore >= 60 ? 'text-yellow-400' : 'text-red-400';

//   const copyQA = async (q: ParsedQuestion) => {
//     const text = `Q: ${q.question}\nA: ${q.answer}`;
//     await navigator.clipboard.writeText(text);
//     showToast('Copied to clipboard');
//   };

//   /**
//    * Render code snippet with line numbers and arrow on target line
//    */
//   const renderCodeSnippet = (lineNumber: number | null) => {
//     if (!lineNumber) return null;
//     // Synthetic placeholder — real content not stored client-side
//     const before = Math.max(1, lineNumber - 2);
//     const after = lineNumber + 2;
//     const lines: { num: number; text: string; target: boolean }[] = [];
//     for (let i = before; i <= after; i++) {
//       lines.push({
//         num: i,
//         text: i === lineNumber ? '// Target line referenced in question' : '// ...',
//         target: i === lineNumber,
//       });
//     }
//     return (
//       <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 my-3 font-mono text-xs overflow-x-auto">
//         {lines.map((l) => (
//           <div
//             key={l.num}
//             className={`flex gap-3 ${l.target ? 'bg-blue-900/30 text-blue-300' : 'text-gray-400'}`}
//           >
//             <span className="w-6 text-right shrink-0">{l.target ? '→' : ' '}</span>
//             <span className="w-8 text-right text-gray-500 shrink-0">{l.num}</span>
//             <span className="whitespace-pre">{l.text}</span>
//           </div>
//         ))}
//       </div>
//     );
//   };

//   /**
//    * Build PDF report via jsPDF + autoTable
//    */
//   const generatePDF = () => {
//     const doc = new jsPDF();
//     doc.setFontSize(18);
//     doc.text('CodeWalk Interview Scorecard', 14, 18);
//     doc.setFontSize(10);
//     doc.text(`Repository: ${repoName}`, 14, 28);
//     doc.text(`Candidate: ${candidateName || 'N/A'}`, 14, 34);
//     doc.text(`Interviewer: ${interviewerName || 'N/A'}`, 14, 40);
//     doc.text(`Role: ${roleApplied || 'N/A'}`, 14, 46);
//     doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 52);
//     doc.setFontSize(12);
//     doc.text(`Overall Score: ${overallScore}%`, 14, 62);

//     const rows: any[] = [];
//     results.forEach((file, fIdx) => {
//       file.parsed.forEach((q, qIdx) => {
//         const key = `${fIdx}-${qIdx}`;
//         rows.push([
//           file.fileName,
//           q.categoryLabel,
//           q.question.slice(0, 60),
//           scores[key] || '-',
//           (notes[key] || '').slice(0, 50),
//         ]);
//       });
//     });

//     autoTable(doc, {
//       startY: 70,
//       head: [['File', 'Category', 'Question', 'Rating', 'Notes']],
//       body: rows,
//       styles: { fontSize: 8, cellPadding: 2 },
//       headStyles: { fillColor: [30, 41, 59] },
//     });

//     doc.save(`codewalk-${candidateName || 'candidate'}-${Date.now()}.pdf`);
//     showToast('PDF downloaded');
//   };

//   const copyJSON = async () => {
//     const payload = {
//       repo: repoName,
//       candidate: candidateName,
//       interviewer: interviewerName,
//       role: roleApplied,
//       overallScore,
//       date: new Date().toISOString(),
//       details: results.map((file, fIdx) => ({
//         file: file.fileName,
//         questions: file.parsed.map((q, qIdx) => ({
//           category: q.categoryLabel,
//           question: q.question,
//           answer: q.answer,
//           rating: scores[`${fIdx}-${qIdx}`] || null,
//           note: notes[`${fIdx}-${qIdx}`] || '',
//         })),
//       })),
//     };
//     await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
//     showToast('Scorecard JSON copied');
//   };

//   const downloadScreenshot = async () => {
//     if (!resultsRef.current) return;
//     try {
//       const canvas = await html2canvas(resultsRef.current, {
//         backgroundColor: '#0f172a',
//         scale: 2,
//       });
//       const link = document.createElement('a');
//       link.download = `codewalk-${Date.now()}.png`;
//       link.href = canvas.toDataURL();
//       link.click();
//       showToast('Screenshot downloaded');
//     } catch {
//       showToast('Screenshot failed');
//     }
//   };

//   const currentFile = results[currentFileIdx];
//   const remaining = Math.max(0, FREE_TIER_LIMIT - usageCount);

//   return (
//     <div className="min-h-screen bg-slate-900 text-white">
//       {/* Toast */}
//       {copyToast && (
//         <div className="fixed top-4 right-4 z-50 bg-slate-800 border border-slate-700 px-4 py-2 rounded-lg text-sm shadow-lg">
//           {copyToast}
//         </div>
//       )}

//       <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
//         {/* HEADER */}
//         <header className="text-center mb-10">
//           <h1 className="text-4xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
//             CodeWalk
//           </h1>
//           <p className="text-gray-300 max-w-2xl mx-auto mb-5 text-sm md:text-base">
//             An AI-powered technical interview tool that generates line-specific questions from GitHub repositories
//           </p>
//           <div className="flex flex-wrap justify-center gap-2">
//             <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-gray-300">
//               Saves 15 min/candidate
//             </span>
//             <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-gray-300">
//               75-85 percent cheat-proof
//             </span>
//             <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-gray-300">
//               Line-specific
//             </span>
//           </div>
//         </header>

//         {/* BATCH BANNER */}
//         <div className="mb-8 p-[1px] rounded-full bg-gradient-to-r from-blue-400 to-purple-500">
//           <div className="bg-slate-900 rounded-full px-5 py-2 text-center text-sm text-gray-300">
//             <span className="font-semibold text-white">Batch Question Generator – Coming Soon:</span>{' '}
//             Upload CSV, get PDFs for 200+ candidates in minutes
//           </div>
//         </div>

//         {/* INPUT */}
//         <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
//           <label className="block text-sm font-medium text-gray-300 mb-2">GitHub Repository URL</label>
//           <div className="flex flex-col md:flex-row gap-3">
//             <input
//               type="url"
//               value={repoUrl}
//               onChange={(e) => setRepoUrl(e.target.value)}
//               placeholder="https://github.com/owner/repo"
//               className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
//               disabled={loading}
//             />
//             <button
//               onClick={handleAnalyze}
//               disabled={loading || usageCount >= FREE_TIER_LIMIT}
//               className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium transition"
//             >
//               {loading ? 'Analyzing...' : 'Generate Questions'}
//             </button>
//           </div>

//           <div className="flex flex-wrap gap-2 mt-3">
//             <span className="text-xs text-gray-500 self-center">Try:</span>
//             {EXAMPLE_REPOS.map((ex) => (
//               <button
//                 key={ex.name}
//                 onClick={() => setRepoUrl(ex.url)}
//                 className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-gray-300"
//                 disabled={loading}
//               >
//                 {ex.name}
//               </button>
//             ))}
//           </div>

//           <div className="mt-3 text-xs text-gray-500">
//             Free tier: {usageCount}/{FREE_TIER_LIMIT} used today ({remaining} remaining)
//           </div>

//           {error && (
//             <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
//               {error}
//             </div>
//           )}
//         </div>

//         {/* LOADING */}
//         {loading && (
//           <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 mb-6 text-center">
//             <div className="inline-block w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-3" />
//             <div className="text-gray-300 mb-2">{progressMsg || 'Analyzing repository...'}</div>
//             <div className="w-full max-w-md mx-auto bg-slate-900 rounded-full h-2 overflow-hidden">
//               <div
//                 className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
//                 style={{ width: `${progress}%` }}
//               />
//             </div>
//             <div className="text-xs text-gray-500 mt-2">{Math.round(progress)}%</div>
//           </div>
//         )}

//         {/* WARNINGS */}
//         {warnings.length > 0 && results.length > 0 && (
//           <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-300 text-xs">
//             <div className="font-medium mb-1">Notices:</div>
//             <ul className="list-disc list-inside space-y-0.5">
//               {warnings.map((w, i) => (
//                 <li key={i}>{w}</li>
//               ))}
//             </ul>
//           </div>
//         )}

//         {/* RESULTS */}
//         {results.length > 0 && currentFile && (
//           <div ref={resultsRef}>
//             {/* Repo header + Score */}
//             <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
//               <div>
//                 <div className="text-xs text-gray-500">Repository</div>
//                 <div className="font-mono text-white">{repoName}</div>
//               </div>
//               <div className="flex items-center gap-4">
//                 <div className="text-right">
//                   <div className="text-xs text-gray-500">Overall Score</div>
//                   <div className={`text-2xl font-bold ${scoreColor}`}>{overallScore}%</div>
//                 </div>
//                 <button
//                   onClick={() => setShowSummary(!showSummary)}
//                   className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg"
//                 >
//                   {showSummary ? 'Hide' : 'Show'} Summary
//                 </button>
//                 <button
//                   onClick={() => setShowModal(true)}
//                   className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
//                 >
//                   Generate Scorecard
//                 </button>
//               </div>
//             </div>

//             {/* SCORE SUMMARY TABLE */}
//             {showSummary && (
//               <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 overflow-x-auto">
//                 <table className="w-full text-sm">
//                   <thead>
//                     <tr className="text-left text-gray-500 border-b border-slate-700">
//                       <th className="py-2">File</th>
//                       <th>Category</th>
//                       <th>Rating</th>
//                       <th>Notes</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {results.flatMap((file, fIdx) =>
//                       file.parsed.map((q, qIdx) => {
//                         const key = `${fIdx}-${qIdx}`;
//                         return (
//                           <tr key={key} className="border-b border-slate-700/50">
//                             <td className="py-2 text-gray-400 text-xs">{file.fileName}</td>
//                             <td className="text-blue-400 text-xs">{q.categoryLabel}</td>
//                             <td className="text-gray-300">{scores[key] || '-'}</td>
//                             <td className="text-gray-400 text-xs truncate max-w-xs">
//                               {notes[key] ? notes[key].slice(0, 40) : '-'}
//                             </td>
//                           </tr>
//                         );
//                       })
//                     )}
//                   </tbody>
//                 </table>
//                 <button
//                   onClick={clearAllScores}
//                   className="mt-3 text-xs px-3 py-1 bg-red-900/40 hover:bg-red-900/60 border border-red-700 rounded-lg text-red-300"
//                 >
//                   Clear All Scores
//                 </button>
//               </div>
//             )}

//             {/* FILE NAVIGATION */}
//             <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 flex items-center justify-between">
//               <button
//                 onClick={() => navigateFile(-1)}
//                 disabled={currentFileIdx === 0}
//                 className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm"
//               >
//                 ← Previous
//               </button>
//               <div className="text-center">
//                 <div className="flex items-center justify-center gap-2">
//                   <span className="text-xs px-2 py-0.5 bg-slate-700 text-blue-400 rounded font-mono">
//                     {getFileIcon(currentFile.fileName)}
//                   </span>
//                   <span className="font-mono text-sm text-white">{currentFile.fileName}</span>
//                 </div>
//                 <div className="text-xs text-gray-500 mt-1">
//                   File {currentFileIdx + 1} of {results.length} (use ← → arrow keys)
//                 </div>
//               </div>
//               <button
//                 onClick={() => navigateFile(1)}
//                 disabled={currentFileIdx === results.length - 1}
//                 className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm"
//               >
//                 Next →
//               </button>
//             </div>

//             {/* QUESTIONS */}
//             <div className="space-y-4">
//               {currentFile.parsed.map((q, qIdx) => {
//                 const key = `${currentFileIdx}-${qIdx}`;
//                 const revealed = revealedAnswers[key];
//                 const currentRating = scores[key];
//                 const noteOpen = expandedNotes[key];
//                 const hasNote = !!notes[key];

//                 return (
//                   <div key={key} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
//                     {/* Category badge */}
//                     <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
//                       <span className="px-3 py-1 bg-slate-700 text-blue-400 rounded-full text-xs font-medium">
//                         {q.categoryLabel}
//                       </span>
//                       <button
//                         onClick={() => copyQA(q)}
//                         className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-gray-300"
//                       >
//                         Copy Q and A
//                       </button>
//                     </div>

//                     {/* Question */}
//                     <div className="text-white font-medium mb-2">
//                       {q.lineNumber && (
//                         <span className="text-blue-400 mr-2">Line {q.lineNumber}:</span>
//                       )}
//                       {q.question}
//                     </div>

//                     {/* Code snippet */}
//                     {renderCodeSnippet(q.lineNumber)}

//                     {/* Show answer */}
//                     <button
//                       onClick={() => toggleAnswer(key)}
//                       className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg mb-3"
//                     >
//                       {revealed ? 'Hide Answer' : 'Show Answer'}
//                     </button>

//                     {revealed && (
//                       <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 mb-3 text-sm text-gray-300">
//                         {q.answer || 'No answer provided.'}
//                       </div>
//                     )}

//                     {/* Rating buttons */}
//                     <div className="flex flex-wrap gap-2 mb-3">
//                       {[
//                         { label: 'Excellent', cls: 'bg-emerald-600 hover:bg-emerald-700' },
//                         { label: 'Good', cls: 'bg-blue-600 hover:bg-blue-700' },
//                         { label: 'Average', cls: 'bg-yellow-600 hover:bg-yellow-700' },
//                         { label: 'Poor', cls: 'bg-red-600 hover:bg-red-700' },
//                         { label: 'Skip', cls: 'bg-gray-600 hover:bg-gray-700' },
//                       ].map((r) => (
//                         <button
//                           key={r.label}
//                           onClick={() => setRating(key, r.label)}
//                           className={`text-xs px-3 py-1 rounded-lg ${r.cls} ${
//                             currentRating === r.label ? 'ring-2 ring-white' : 'opacity-70'
//                           }`}
//                         >
//                           {r.label}
//                         </button>
//                       ))}
//                     </div>

//                     {/* Note toggle */}
//                     <button
//                       onClick={() => setExpandedNotes((p) => ({ ...p, [key]: !noteOpen }))}
//                       className={`text-xs px-3 py-1 rounded-lg ${
//                         hasNote ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-gray-300'
//                       } hover:opacity-90`}
//                     >
//                       {noteOpen ? 'Hide Note' : hasNote ? 'Edit Note (saved)' : 'Add Note'}
//                     </button>

//                     {noteOpen && (
//                       <textarea
//                         value={notes[key] || ''}
//                         onChange={(e) => setNote(key, e.target.value)}
//                         placeholder="Interviewer notes..."
//                         className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
//                         rows={3}
//                       />
//                     )}
//                   </div>
//                 );
//               })}
//             </div>

//             {/* EXPORT BUTTONS */}
//             <div className="mt-6 flex flex-wrap gap-3">
//               <button
//                 onClick={downloadScreenshot}
//                 className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
//               >
//                 Download Screenshot
//               </button>
//               <button
//                 onClick={copyJSON}
//                 className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
//               >
//                 Copy Scorecard (JSON)
//               </button>
//             </div>
//           </div>
//         )}

//         {/* MODAL */}
//         {showModal && (
//           <div
//             className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowModal(false)}
//           >
//             <div
//               className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <h3 className="text-lg font-bold mb-4">Generate Scorecard</h3>
//               <div className="space-y-3">
//                 <div>
//                   <label className="text-xs text-gray-400">Candidate Name</label>
//                   <input
//                     value={candidateName}
//                     onChange={(e) => setCandidateName(e.target.value)}
//                     className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-sm"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs text-gray-400">Interviewer Name</label>
//                   <input
//                     value={interviewerName}
//                     onChange={(e) => setInterviewerName(e.target.value)}
//                     className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-sm"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs text-gray-400">Role Applied For</label>
//                   <input
//                     value={roleApplied}
//                     onChange={(e) => setRoleApplied(e.target.value)}
//                     className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 mt-1 text-sm"
//                   />
//                 </div>
//               </div>
//               <div className="flex gap-2 mt-5">
//                 <button
//                   onClick={generatePDF}
//                   className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg py-2 text-sm font-medium"
//                 >
//                   Generate PDF Report
//                 </button>
//                 <button
//                   onClick={copyJSON}
//                   className="flex-1 bg-slate-700 hover:bg-slate-600 rounded-lg py-2 text-sm"
//                 >
//                   Copy JSON
//                 </button>
//               </div>
//               <button
//                 onClick={() => setShowModal(false)}
//                 className="w-full mt-2 text-xs text-gray-500 hover:text-gray-300"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         )}

//         {/* FOOTER */}
//         <footer className="mt-12 pt-8 border-t border-slate-700 text-sm text-gray-400">
//           <h3 className="text-white font-semibold mb-2">Interviewer Tips</h3>
//           <ul className="list-disc list-inside space-y-1 text-xs">
//             <li>Start with [C] Code Logic to verify line-level understanding.</li>
//             <li>Use [P] Project Logic to test architectural awareness.</li>
//             <li>Use [D] Documentation to confirm the candidate read the README.</li>
//             <li>Use [Domain] to assess real-world reasoning beyond syntax.</li>
//             <li>Take notes immediately while answers are fresh.</li>
//           </ul>
//           <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
//             <div className="text-gray-500">
//               Remaining free analyses today: <span className="text-white">{remaining}</span>
//             </div>
//             <div className="text-gray-500">Created by Harshvardhan Modi</div>
//           </div>
//         </footer>
//       </div>
//     </div>
//   );
// }
'use client';

/**
 * CodeWalk — main UI page.
 * Per-file slides, dark-only theme, scorecard, PDF export, future updates dropdown.
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
  tag: string;        // C1, C2, P1, D, G1...
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

const RATINGS: Array<ScoreEntry['rating']> = ['Poor', 'Average', 'Good', 'Excellent', 'Skip'];

const EXAMPLE_REPOS = [
  { label: 'Hello-World', url: 'https://github.com/octocat/Hello-World' },
  { label: 'Tailwind CSS', url: 'https://github.com/tailwindlabs/tailwindcss' },
  { label: 'FastAPI', url: 'https://github.com/tiangolo/fastapi' },
];

const FREE_TIER_LIMIT = 3;
const FREE_TIER_KEY = 'codewalk_usage';
const SCORES_KEY = 'codewalk_scores';

/**
 * Parse the raw Q/A text returned by the AI into structured ParsedQuestion[].
 */
function parseQuestions(
  raw: string,
  snapshots: CodeSnapshot[] = []
): ParsedQuestion[] {
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
      // Collect continuation until "A:" or next tag
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

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [usage, setUsage] = useState({ count: 0, date: '' });
  const [showFutureUpdates, setShowFutureUpdates] = useState(false);
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

  // Load saved scores
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      if (raw) setScores(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist scores
  useEffect(() => {
    try {
      localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
    } catch {}
  }, [scores]);

  // Build slides whenever data changes
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

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (slides.length === 0) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowRight') {
        setSlideIndex((i) => Math.min(i + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setSlideIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slides.length]);

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
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Analysis failed');
      }
      setData(json);
      const today = new Date().toISOString().slice(0, 10);
      const next = { count: usage.count + 1, date: today };
      setUsage(next);
      try { localStorage.setItem(FREE_TIER_KEY, JSON.stringify(next)); } catch {}
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
    setScores((s) => ({
      ...s,
      [id]: { rating, note: s[id]?.note || '' },
    }));
  };

  const setNote = (id: string, note: string) => {
    setScores((s) => ({
      ...s,
      [id]: { rating: s[id]?.rating || null, note },
    }));
  };

  const copyQA = async (q: ParsedQuestion) => {
    const text = `Q: ${q.question}\nA: ${q.answer}`;
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const clearAllScores = () => {
    if (confirm('Clear all ratings and notes?')) {
      setScores({});
    }
  };

  /** Compute overall score percentage across rated questions (excluding Skip). */
  const computeOverallScore = (): { percent: number; rated: number; total: number } => {
    const allQs: ParsedQuestion[] = slides.flatMap((s) => s.questions);
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
        backgroundColor: '#0f172a',
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
    try { await navigator.clipboard.writeText(text); } catch {}
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
    try { await navigator.clipboard.writeText(JSON.stringify(payload, null, 2)); } catch {}
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
    doc.text(`Overall Score: ${overall.percent}%  (${overall.rated}/${overall.total} rated)`, 14, 58);

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

  // ── UI ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* HEADER */}
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            CodeWalk
          </h1>
          <p className="text-gray-300 mt-2">AI-powered technical interview tool</p>
        </header>

        {/* INPUT */}
        <section className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <label htmlFor="repoUrl" className="block text-sm text-gray-300 mb-2">
            GitHub Repository URL
          </label>
          <input
            id="repoUrl"
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
          />

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-sm text-gray-400 self-center">Examples:</span>
            {EXAMPLE_REPOS.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setRepoUrl(ex.url)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-gray-200 transition"
              >
                {ex.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleAnalyze}
              disabled={loading || usage.count >= FREE_TIER_LIMIT}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-semibold transition"
            >
              {loading ? 'Analyzing…' : 'Generate Questions'}
            </button>
            <span className="text-sm text-gray-400">
              Free tier: {usage.count}/{FREE_TIER_LIMIT} today
            </span>
          </div>

          {error && (
            <div className="mt-4 px-4 py-2 bg-slate-900 border border-slate-600 rounded text-gray-200 text-sm">
              {error}
            </div>
          )}
        </section>

        {/* BATCH BANNER + FUTURE UPDATES */}
        <section className="mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg px-5 py-3 text-center text-gray-300">
            <span className="font-semibold text-white">Batch Question Generator</span> — Coming Soon
          </div>

          <button
            onClick={() => setShowFutureUpdates((v) => !v)}
            className="mt-3 w-full bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg px-5 py-3 flex items-center justify-between transition"
          >
            <span className="font-medium text-white">Future Updates</span>
            <span className="text-blue-400">{showFutureUpdates ? '▲' : '▼'}</span>
          </button>
          {showFutureUpdates && (
            <div className="mt-2 bg-slate-800 border border-slate-700 rounded-lg p-4">
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong className="text-white">Live Coding + Repo Validation Combo</strong> — small coding tasks based on their code</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong className="text-white">Voice-based Live Interview Mode</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong className="text-white">Commit History Analysis</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span><strong className="text-white">Team Collaboration Dashboard</strong></span>
                </li>
              </ul>
            </div>
          )}
        </section>

        {/* RESULTS */}
        {data && slides.length > 0 && currentSlide && (
          <section ref={resultsRef} className="space-y-4">
            {/* Slide header */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Slide [File {slideIndex + 1} of {slides.length}]
                  </p>
                  <h2 className="text-xl font-semibold text-white mt-1 break-all">
                    {currentSlide.title}
                  </h2>
                </div>
                <div className="text-sm text-gray-400">
                  Repo: <span className="text-blue-400">{data.repo}</span>
                </div>
              </div>
            </div>

            {/* Questions */}
            {currentSlide.questions.map((q) => {
              const ans = showAnswers[q.id];
              const noteOpen = showNotes[q.id];
              const sc = scores[q.id] || { rating: null, note: '' };
              const hasNote = !!sc.note;

              return (
                <article
                  key={q.id}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-5"
                >
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <span className="px-3 py-1 bg-slate-700 text-blue-400 text-xs font-medium rounded">
                      {q.category}
                    </span>
                    <span className="text-xs text-gray-500">[{q.tag}]</span>
                  </div>

                  <p className="text-white leading-relaxed mb-3">{q.question}</p>

                  {q.snippet && (
                    <pre className="bg-slate-900 border border-slate-700 rounded-md p-3 text-xs text-gray-200 overflow-x-auto whitespace-pre font-mono mb-3">
                      {q.snippet}
                    </pre>
                  )}

                  <button
                    onClick={() => toggleAnswer(q.id)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-blue-400 text-sm rounded transition"
                  >
                    {ans ? 'Hide Answer' : 'Show Answer'}
                  </button>

                  {ans && (
                    <p className="mt-3 text-gray-300 text-sm leading-relaxed border-l-2 border-slate-600 pl-3">
                      {q.answer || '(No answer provided)'}
                    </p>
                  )}

                  {/* Action row */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => copyQA(q)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-gray-200 text-xs rounded transition"
                    >
                      Copy Q&A
                    </button>
                    <button
                      onClick={() => toggleNote(q.id)}
                      className={`px-3 py-1 text-xs rounded transition ${
                        hasNote
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-gray-200'
                      }`}
                    >
                      {noteOpen ? 'Hide Note' : hasNote ? 'Edit Note' : 'Add Note'}
                    </button>
                  </div>

                  {/* Ratings */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {RATINGS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRating(q.id, r)}
                        className={`px-3 py-1 text-xs rounded transition ${
                          sc.rating === r
                            ? 'bg-slate-600 text-blue-400 border border-blue-400'
                            : 'bg-slate-700 hover:bg-slate-600 text-gray-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {noteOpen && (
                    <textarea
                      value={sc.note}
                      onChange={(e) => setNote(q.id, e.target.value)}
                      placeholder="Interviewer notes…"
                      rows={3}
                      className="w-full mt-3 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-400"
                    />
                  )}
                </article>
              );
            })}

            {/* Slide nav */}
            <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg p-3">
              <button
                onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                disabled={slideIndex === 0}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm transition"
              >
                ← Previous File
              </button>
              <span className="text-sm text-gray-400">
                {slideIndex + 1} / {slides.length}
              </span>
              <button
                onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
                disabled={slideIndex === slides.length - 1}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm transition"
              >
                Next File →
              </button>
            </div>

            {/* Score summary */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm text-gray-400">Overall Score</p>
                  <p className="text-3xl font-bold text-white">
                    {overall.percent}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {overall.rated} of {overall.total} rated
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setShowSummary((v) => !v)}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm rounded transition"
                  >
                    {showSummary ? 'Hide Summary' : 'Show Summary'}
                  </button>
                  <button
                    onClick={clearAllScores}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm rounded transition"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowScorecardModal(true)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                  >
                    Generate Scorecard
                  </button>
                  <button
                    onClick={downloadScreenshot}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm rounded transition"
                  >
                    Download Screenshot
                  </button>
                  <button
                    onClick={copyScorecard}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm rounded transition"
                  >
                    Copy Scorecard
                  </button>
                </div>
              </div>

              {showSummary && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-slate-700">
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
                            <tr key={q.id} className="border-b border-slate-700/50">
                              <td className="p-2 text-gray-400">{s.title}</td>
                              <td className="p-2 text-blue-400">{q.category}</td>
                              <td className="p-2 text-gray-200">
                                {q.question.length > 70 ? q.question.slice(0, 67) + '…' : q.question}
                              </td>
                              <td className="p-2 text-gray-300">{sc?.rating || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {data.warnings.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-xs text-gray-400">
                <p className="font-semibold text-gray-300 mb-1">Warnings</p>
                <ul className="space-y-1">
                  {data.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* FOOTER */}
        <footer className="mt-12 bg-slate-800 border border-slate-700 rounded-lg p-5 text-sm text-gray-400">
          <p className="text-gray-300 font-semibold mb-2">Interviewer Tips</p>
          <p>Use ← / → arrow keys to switch between file slides. Toggle answers only after the candidate responds. Notes are saved locally.</p>
          <div className="flex justify-between mt-3 text-xs flex-wrap gap-2">
            <span>Free analyses remaining today: {Math.max(0, FREE_TIER_LIMIT - usage.count)}</span>
            <span>Created by Harshvardhan Modi</span>
          </div>
        </footer>
      </div>

      {/* SCORECARD MODAL */}
      {showScorecardModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Generate Scorecard</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Candidate Name"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
              />
              <input
                type="text"
                value={interviewerName}
                onChange={(e) => setInterviewerName(e.target.value)}
                placeholder="Interviewer Name"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
              />
              <input
                type="text"
                value={roleApplied}
                onChange={(e) => setRoleApplied(e.target.value)}
                placeholder="Role Applied For"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-5 justify-end">
              <button
                onClick={() => setShowScorecardModal(false)}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={copyJSON}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 text-sm rounded transition"
              >
                Copy JSON
              </button>
              <button
                onClick={generatePDF}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
              >
                Generate PDF Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
