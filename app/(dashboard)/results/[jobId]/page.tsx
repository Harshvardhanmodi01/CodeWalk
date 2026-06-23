'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getJobById, Question, JobAssessment, FileAssessment } from '@/app/lib/mockData';
import CodePanel from '@/components/results/CodePanel';
import QuestionPanel from '@/components/results/QuestionPanel';
import SlideNav from '@/components/results/SlideNav';
import ExportPreviewModal from '@/components/modals/ExportPreviewModal';
import SessionCompleteModal from '@/components/modals/SessionCompleteModal';
import { useGlobal } from '@/app/context/GlobalContext';

export default function ResultsPage() {
  const { jobId } = useParams();
  const router = useRouter();
  const { updateAssessmentRatings, updateAssessmentNotes } = useGlobal();
  
  const [job, setJob] = useState<JobAssessment | null>(null);
  const [originalFiles, setOriginalFiles] = useState<FileAssessment[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'mid' | 'hard'>('mid');
  
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSessionCompleteOpen, setIsSessionCompleteOpen] = useState(false);

  // Timer states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});

  // README file tab content, loading, and error states
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [isReadmeLoading, setIsReadmeLoading] = useState(false);
  const [readmeError, setReadmeError] = useState<string | null>(null);

  // Load assessment data on mount/jobId change
  useEffect(() => {
    if (jobId) {
      const loadedJob = getJobById(jobId as string);
      setJob(loadedJob);
      setOriginalFiles(loadedJob ? loadedJob.files : []);
    }
  }, [jobId]);

  // Reset active question when switching files
  useEffect(() => {
    setActiveQuestionIndex(0);
  }, [activeFileIndex]);

  // Sync ratings state with localStorage on mount or change
  useEffect(() => {
    const key = `ratings_${jobId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setRatings(JSON.parse(stored));
    } else {
      setRatings({});
    }
  }, [jobId]);

  // Listen for custom notesUpdated event to sync notes to Supabase
  useEffect(() => {
    const handleNotesSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { questionId, value } = customEvent.detail;
      
      // Collect all notes to sync to Supabase
      const dbNotes: Record<string, string> = {};
      if (job) {
        filteredFiles.flatMap((f) => f.questions).forEach((q) => {
          const notesKey = `notes_${jobId}_${q.id}`;
          const stored = localStorage.getItem(notesKey);
          if (stored) {
            dbNotes[q.id] = stored;
          }
        });
        dbNotes[questionId] = value;
      }
      
      updateAssessmentNotes(jobId as string, dbNotes);
    };

    window.addEventListener('notesUpdated', handleNotesSync);
    return () => {
      window.removeEventListener('notesUpdated', handleNotesSync);
    };
  }, [jobId, job, originalFiles, selectedDifficulty, updateAssessmentNotes]);

  // Regenerate questions on-the-fly based on difficulty selector
  const filteredFiles = React.useMemo(() => {
    if (originalFiles.length === 0) return [];
    
    return originalFiles.map((file) => {
      return {
        ...file,
        questions: file.questions.map((q) => {
          if (selectedDifficulty === 'easy') {
            return {
              ...q,
              difficulty: 'junior' as const,
              category: 'Code Logic' as const,
              question: `Identify the main purpose of the code block around line ${q.lineNumber} and describe its inputs.`,
              expectedAnswer: `The code block around line ${q.lineNumber} initializes local variables and executes synchronous operations. Its input parameters must be validated to prevent runtime type issues.`
            };
          } else if (selectedDifficulty === 'hard') {
            return {
              ...q,
              difficulty: 'senior' as const,
              category: 'Architecture' as const,
              question: `Critically analyze the code logic around line ${q.lineNumber} for race conditions, edge cases, and optimization. How would you refactor this for scale?`,
              expectedAnswer: `The context around line ${q.lineNumber} lacks error boundaries and could trigger thread blocks. Refactoring should introduce reference caching, asynchronous decoupling, or debounce protection.`
            };
          } else {
            // Default 'mid' - return original Gemini questions
            return {
              ...q,
              difficulty: 'mid' as const
            };
          }
        })
      };
    });
  }, [originalFiles, selectedDifficulty]);

  // Client-side fetch/load of README when selecting the tab
  useEffect(() => {
    if (!job) return;
    const activeFile = filteredFiles[activeFileIndex];
    if (activeFile && activeFile.fileName === 'Project Readme & Domain') {
      if (readmeContent) return; // already loaded
      
      setIsReadmeLoading(true);
      setReadmeError(null);

      // If it exists in apiResult, load it with a brief simulated delay
      if (job.apiResult && job.apiResult.readme) {
        const timer = setTimeout(() => {
          setReadmeContent(job.apiResult.readme);
          setIsReadmeLoading(false);
        }, 500);
        return () => clearTimeout(timer);
      }

      // Otherwise, fetch from GitHub API
      const fetchReadme = async () => {
        try {
          const repoUrl = job.repo;
          const cleanUrl = repoUrl.replace(/^(https?:\/\/)?(www\.)?github\.com\//, '');
          const parts = cleanUrl.split('/');
          if (parts.length < 2) {
            throw new Error('Invalid repository URL');
          }
          const owner = parts[0];
          const repoName = parts[1];
          
          const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/readme`);
          if (!res.ok) {
            throw new Error('Failed to fetch README');
          }
          const data = await res.json();
          if (data.content && data.encoding === 'base64') {
            const decoded = atob(data.content.replace(/\n/g, ''));
            if (!decoded || decoded.trim().length === 0) {
              throw new Error('README is empty');
            }
            setReadmeContent(decoded);
          } else {
            throw new Error('Invalid README format');
          }
        } catch (err) {
          setReadmeError('Failed to load file content. Please try again.');
        } finally {
          setIsReadmeLoading(false);
        }
      };
      
      const timer = setTimeout(() => {
        fetchReadme();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeFileIndex, filteredFiles, job, readmeContent]);

  // Flatten questions from files for exporter
  const flatQuestions = job
    ? filteredFiles.flatMap((f) => 
        f.questions.map((q) => ({
          ...q,
          fileName: f.fileName
        }))
      )
    : [];

  const activeFile = job && filteredFiles[activeFileIndex] ? filteredFiles[activeFileIndex] : null;
  const currentQuestion = activeFile && activeFile.questions[activeQuestionIndex] ? activeFile.questions[activeQuestionIndex] : null;

  // Active question timer tick effect
  useEffect(() => {
    let intervalId: any = null;
    if (isTimerActive) {
      intervalId = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTimerActive]);

  // Accumulate seconds for questions on transition
  const elapsedSecondsRef = useRef(0);
  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  const currentQuestionIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prevQId = currentQuestionIdRef.current;
    const newQId = currentQuestion ? currentQuestion.id : null;

    if (prevQId && prevQId !== newQId) {
      const timeSpent = elapsedSecondsRef.current;
      setQuestionTimes((prev) => ({
        ...prev,
        [prevQId]: (prev[prevQId] || 0) + timeSpent
      }));
      setElapsedSeconds(0);
      setIsTimerActive(true);
    }

    currentQuestionIdRef.current = newQId;
  }, [currentQuestion?.id]);

  // Pause timer if rating is marked SKIP
  useEffect(() => {
    if (currentQuestion && ratings[currentQuestion.id] === 'skip') {
      setIsTimerActive(false);
    } else {
      setIsTimerActive(true);
    }
  }, [currentQuestion?.id, ratings]);

  const handleRatingChange = (questionId: string, val: string) => {
    const updated = { ...ratings, [questionId]: val };
    setRatings(updated);
    localStorage.setItem(`ratings_${jobId}`, JSON.stringify(updated));

    // Supabase sync
    updateAssessmentRatings(jobId as string, updated);

    // Update overall candidate score in the list
    const storedList = localStorage.getItem('cw_analyses');
    if (storedList) {
      const list = JSON.parse(storedList);
      const idx = list.findIndex((a: any) => a.jobId === jobId);
      if (idx !== -1) {
        // Calculate new score average
        let total = 0;
        let count = 0;
        flatQuestions.forEach((q) => {
          const r = q.id === questionId ? val : ratings[q.id] || 'skip';
          if (r !== 'skip' && r !== '') {
            count++;
            if (r === 'poor') total += 30;
            else if (r === 'avg') total += 60;
            else if (r === 'good') total += 85;
            else if (r === 'great') total += 100;
          }
        });
        const average = count === 0 ? 0 : Math.round(total / count);
        list[idx].score = average;
        localStorage.setItem('cw_analyses', JSON.stringify(list));
      }
    }

    // Check if this was the last question rated/skipped (using the synchronous 'updated' state)
    const activeAnsweredCount = flatQuestions.length > 0
      ? flatQuestions.filter((q) => updated[q.id] && updated[q.id] !== '').length
      : 0;

    if (flatQuestions.length > 0 && activeAnsweredCount === flatQuestions.length) {
      // Save final question elapsed time
      if (currentQuestion && elapsedSecondsRef.current > 0) {
        const timeSpent = elapsedSecondsRef.current;
        setQuestionTimes((prev) => ({
          ...prev,
          [currentQuestion.id]: (prev[currentQuestion.id] || 0) + timeSpent
        }));
        setElapsedSeconds(0);
      }
      setIsTimerActive(false);
      setIsSessionCompleteOpen(true);
    }
  };

  const handleResetAssessment = () => {
    // Clear ratings and notes inside local storage for this job
    localStorage.removeItem(`ratings_${jobId}`);
    flatQuestions.forEach((q) => {
      localStorage.removeItem(`notes_${jobId}_${q.id}`);
    });
    
    // Clear page coordinator states
    setRatings({});
    setQuestionTimes({});
    setElapsedSeconds(0);
    setSelectedDifficulty('mid');
    setIsSessionCompleteOpen(false);
    
    // Push back to dashboard to start a fresh repository run
    router.push('/dashboard');
  };

  const handlePrevFile = () => {
    if (activeFileIndex > 0) setActiveFileIndex((p) => p - 1);
  };

  const handleNextFile = () => {
    if (job && activeFileIndex < job.files.length - 1) setActiveFileIndex((p) => p + 1);
  };

  if (!job) {
    return (
      <div className="flex-1 bg-[#0d1515] flex items-center justify-center min-h-screen">
        <span className="material-symbols-outlined text-4xl text-[#7df4ff] animate-spin">sync</span>
      </div>
    );
  }

  if (job.files.length === 0) {
    return (
      <div className="flex-1 bg-surface flex flex-col items-center justify-center p-12 select-none">
        <span className="material-symbols-outlined text-5xl text-error mb-4">folder_off</span>
        <h2 className="text-xl font-bold">Assessment Empty</h2>
        <p className="text-sm text-on-surface-variant max-w-sm text-center mt-1">
          No questions were generated for this repository. Connect a different repo structure.
        </p>
        <button 
          onClick={() => router.push('/dashboard')}
          className="mt-6 px-6 py-2.5 bg-primary-fixed text-on-primary-fixed rounded font-bold hover:opacity-90 active:scale-95"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const progressPercent = job.files.length > 0 ? Math.round(((activeFileIndex + 1) / job.files.length) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden h-screen overscroll-none">
      
      {/* Top Application Bar Breadcrumbs */}
      <header className="flex justify-between items-center px-6 py-2 bg-surface-container-low w-full border-b border-outline-variant z-30 select-none">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <div className="flex items-center space-x-2 text-on-surface-variant font-code-sm text-code-sm font-mono text-xs">
            <span className="material-symbols-outlined text-primary-fixed text-sm font-bold">terminal</span>
            <span className="opacity-60">{job.repo.replace('github.com/', '')}</span>
            <span className="opacity-40">/</span>
            <span className="text-on-surface font-bold truncate max-w-[120px] sm:max-w-[200px]" title={activeFile?.fileName}>
              {activeFile?.fileName.split('/').pop()}
            </span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-outline-variant"></div>
          
          {/* File traverser navigation */}
          <SlideNav 
            currentIndex={activeFileIndex} 
            totalCount={job.files.length} 
            onPrev={handlePrevFile} 
            onNext={handleNextFile} 
          />
        </div>

        {/* Action pills */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 bg-surface-container border border-outline-variant px-4 py-1.5 rounded-lg text-label-sm font-bold text-on-surface hover:bg-surface-variant transition-all hover:scale-[1.02] active:scale-95 text-xs select-none"
          >
            <span className="material-symbols-outlined text-sm font-bold">download</span>
            <span>Export PDF</span>
          </button>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-8 h-8 flex items-center justify-center border border-outline-variant text-on-surface-variant hover:text-primary-fixed rounded-lg transition-colors select-none"
            title="Dashboard"
          >
            <span className="material-symbols-outlined text-lg">dashboard</span>
          </button>
        </div>
      </header>

      {/* Main Double Panel Workspace Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Side: Code block */}
        <CodePanel 
          files={filteredFiles}
          activeFileIndex={activeFileIndex}
          onFileSelect={setActiveFileIndex}
          codeSnippet={
            activeFile?.fileName === 'Project Readme & Domain'
              ? readmeContent
              : currentQuestion 
                ? currentQuestion.codeSnippet 
                : `// Select a question to view code`
          } 
          highlightedLine={activeFile?.fileName === 'Project Readme & Domain' ? 0 : (currentQuestion ? currentQuestion.lineNumber : 0)} 
          isLoading={activeFile?.fileName === 'Project Readme & Domain' ? isReadmeLoading : false}
          error={activeFile?.fileName === 'Project Readme & Domain' ? readmeError : null}
        />

        {/* Right Side: Assessment Details */}
        <QuestionPanel 
          jobId={jobId as string}
          questions={activeFile ? activeFile.questions : []}
          activeQuestionIndex={activeQuestionIndex}
          onQuestionSelect={setActiveQuestionIndex}
          ratings={ratings}
          onRatingChange={handleRatingChange}
          fileName={activeFile ? activeFile.fileName : ''}
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={setSelectedDifficulty}
          elapsedSeconds={elapsedSeconds}
          isTimerActive={isTimerActive}
          onToggleTimer={() => setIsTimerActive((prev) => !prev)}
        />

      </div>

      {/* Slide Progress Bar Indicator */}
      <div className="h-1 bg-surface-container-highest w-full relative z-30 select-none">
        <div 
          className="absolute top-0 left-0 h-full bg-primary-fixed transition-all duration-300 shadow-[0_0_8px_rgba(125,244,255,0.5)]" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Scorecard Exporter Preview overlay modal */}
      <ExportPreviewModal 
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        candidateName={job.candidateName}
        repo={job.repo}
        questions={flatQuestions}
        ratings={ratings}
      />

      {/* Session Complete Final Summary Modal */}
      <SessionCompleteModal 
        isOpen={isSessionCompleteOpen}
        onClose={() => setIsSessionCompleteOpen(false)}
        candidateName={job.candidateName}
        repo={job.repo}
        fileName={activeFile ? activeFile.fileName : ''}
        questions={flatQuestions}
        ratings={ratings}
        questionTimes={questionTimes}
        jobId={jobId as string}
        onReset={handleResetAssessment}
      />

    </div>
  );
}
