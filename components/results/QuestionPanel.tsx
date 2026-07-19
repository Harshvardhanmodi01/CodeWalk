'use client';

import React, { useState, useEffect, useRef, memo } from 'react';
import RatingBar from './RatingBar';
import { Question } from '@/app/lib/mockData';

interface QuestionCardProps {
  jobId: string;
  question: Question;
  isActive: boolean;
  onSelect: () => void;
  ratingValue: string;
  onRatingChange: (val: string) => void;
}

const QuestionCard = memo(function QuestionCard({
  jobId,
  question,
  isActive,
  onSelect,
  ratingValue,
  onRatingChange
}: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [notes, setNotes] = useState('');

  // Load notes on mount/change
  useEffect(() => {
    const key = `notes_${jobId}_${question.id}`;
    const storedNotes = localStorage.getItem(key) || '';
    setNotes(storedNotes);
  }, [jobId, question.id]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    localStorage.setItem(`notes_${jobId}_${question.id}`, val);
    
    // Dispatch a custom event to notify page coordinator of notes sync update
    window.dispatchEvent(new CustomEvent('notesUpdated', {
      detail: { questionId: question.id, value: val }
    }));
  };

  const getDifficultyText = (diff: string) => {
    switch (diff) {
      case 'junior':
        return '★ Junior';
      case 'mid':
        return '★★ Mid-Level';
      case 'senior':
      default:
        return '★★★ Senior';
    }
  };

  return (
    <div 
      onClick={onSelect}
      className={`p-6 border rounded-xl shadow-sm transition-all cursor-pointer space-y-4 ${
        isActive 
          ? 'bg-surface border-primary-fixed shadow-md active-glow' 
          : 'bg-surface-container border-outline-variant/60 hover:border-outline-variant'
      }`}
    >
      {/* Top Meta & Badges */}
      <div className="flex justify-between items-center gap-4 select-none">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-secondary-container/20 text-secondary border border-secondary/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 font-mono">
            <span className="material-symbols-outlined text-[10px] font-bold">account_tree</span>
            {getDifficultyText(question.difficulty)}
          </span>
          <span className="bg-primary-container/10 text-primary-fixed border border-primary-fixed/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight font-mono">
            {question.category}
          </span>
        </div>

        {/* Show Answer Toggle */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">Show Answer</span>
          <div className="relative inline-block w-10 h-5 select-none transition duration-200 ease-in">
            <input 
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer z-10 transition-transform duration-200 checked:translate-x-5" 
              id={`toggle-answer-${question.id}`} 
              type="checkbox"
              checked={showAnswer}
              onChange={(e) => setShowAnswer(e.target.checked)}
            />
            <label 
              className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer border border-outline-variant transition-colors ${showAnswer ? 'bg-primary-fixed-dim' : 'bg-surface-container-highest'}`}
              htmlFor={`toggle-answer-${question.id}`}
            >
              <span className="block w-5 h-5 rounded-full bg-on-surface-variant/80"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Question Text */}
      <p className="text-body-md text-sm leading-relaxed text-on-surface font-semibold">
        {question.question}
      </p>

      {/* Expected Answer Revealed Block */}
      {showAnswer && (
        <div className="answer-reveal-animation bg-surface-container-lowest border-l-4 border-primary-fixed p-4 rounded-r-lg space-y-2 shadow-inner">
          <div className="flex items-center gap-2 text-primary-fixed">
            <span className="material-symbols-outlined text-sm font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <span className="font-label-sm text-[9px] font-bold tracking-widest uppercase">Expected Answer</span>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {question.expectedAnswer}
          </p>
        </div>
      )}

      {/* Interviewer Remarks Notes */}
      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between select-none">
          <h4 className="font-label-sm text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">
            Interviewer Notes
          </h4>
          <span className="material-symbols-outlined text-on-surface-variant text-sm">edit_note</span>
        </div>
        <textarea 
          className="w-full h-20 bg-surface-container-lowest border border-outline-variant/60 rounded-lg p-3 font-body-md text-xs text-on-surface placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-primary-fixed focus:border-primary-fixed outline-none transition-all resize-none"
          placeholder="Type notes on candidate response here..."
          value={notes}
          onChange={handleNotesChange}
        />
      </div>

      {/* Rating Buttons */}
      <div className="pt-4 border-t border-outline-variant/20" onClick={(e) => e.stopPropagation()}>
        <RatingBar 
          value={ratingValue} 
          onChange={onRatingChange} 
        />
      </div>
    </div>
  );
});

interface QuestionPanelProps {
  jobId: string;
  questions: Question[];
  activeQuestionIndex: number;
  onQuestionSelect: (idx: number) => void;
  ratings: Record<string, string>;
  onRatingChange: (qId: string, val: string) => void;
  fileName: string;
  selectedDifficulty: 'easy' | 'mid' | 'hard';
  onDifficultyChange: (diff: 'easy' | 'mid' | 'hard') => void;
  elapsedSeconds: number;
  isTimerActive: boolean;
  onToggleTimer: () => void;
}

function QuestionPanel({
  jobId,
  questions,
  activeQuestionIndex,
  onQuestionSelect,
  ratings,
  onRatingChange,
  fileName,
  selectedDifficulty,
  onDifficultyChange,
  elapsedSeconds,
  isTimerActive,
  onToggleTimer
}: QuestionPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Sync scroll position when activeQuestionIndex changes externally
  useEffect(() => {
    if (listRef.current && !isScrollingRef.current) {
      const container = listRef.current;
      const targetScrollTop = activeQuestionIndex * container.clientHeight;
      if (Math.abs(container.scrollTop - targetScrollTop) > 10) {
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [activeQuestionIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.clientHeight === 0) return;
    
    isScrollingRef.current = true;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index >= 0 && index < questions.length && index !== activeQuestionIndex) {
      onQuestionSelect(index);
    }
    
    // Clear scrolling flag after a delay
    const timeoutId = setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);
    return () => clearTimeout(timeoutId);
  };

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="w-full lg:w-5/12 flex flex-col bg-surface-container-low h-full overflow-hidden relative">
      {/* Fixed Title Header */}
      <div className="p-8 pb-4 select-none space-y-4 h-[148px] border-b border-outline-variant/30 flex flex-col justify-between">
        <div className="flex justify-between items-start w-full">
          <div className="space-y-1 overflow-hidden flex-1 pr-4">
            <h2 className="text-headline-md text-base text-on-surface font-extrabold uppercase tracking-wider">
              File Questions
            </h2>
            <p className="text-[11px] text-on-surface-variant font-mono truncate" title={fileName}>
              {fileName}
            </p>
          </div>
          
          {/* Candidate Timer (Clickable) */}
          <button 
            onClick={onToggleTimer}
            className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant px-3 py-1.5 rounded-lg select-none shrink-0 font-mono cursor-pointer transition-colors outline-none"
            title={isTimerActive ? "Pause Timer" : "Resume Timer"}
          >
            <span className={`material-symbols-outlined text-sm ${isTimerActive ? 'text-primary-fixed animate-pulse' : 'text-on-surface-variant'}`}>
              {isTimerActive ? 'pause' : 'play_arrow'}
            </span>
            <span className="text-xs font-bold text-on-surface">{formatSeconds(elapsedSeconds)}</span>
          </button>
        </div>

        {/* Difficulty Filter Bar */}
        <div className="flex items-center gap-2 bg-surface-container-lowest/80 p-1 border border-outline-variant/50 rounded-lg w-full">
          {(['easy', 'mid', 'hard'] as const).map((diff) => {
            const isActive = selectedDifficulty === diff;
            return (
              <button
                key={diff}
                onClick={() => onDifficultyChange(diff)}
                className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all outline-none ${
                  isActive 
                    ? 'bg-primary-fixed text-on-primary-fixed shadow-md shadow-primary-fixed/10' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {diff}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Questions list container using absolute positioning offset by header height */}
      <div 
        ref={listRef}
        onScroll={handleScroll}
        className="absolute top-[148px] bottom-0 left-0 right-0 overflow-y-auto flex flex-col scroll-smooth snap-y snap-mandatory custom-scrollbar overscroll-y-none"
      >
        {questions.map((q, idx) => (
          <div key={q.id} className="snap-start snap-always w-full h-full shrink-0 px-8 pb-8 pt-2 flex flex-col justify-center">
            <QuestionCard 
              jobId={jobId}
              question={q}
              isActive={idx === activeQuestionIndex}
              onSelect={() => onQuestionSelect(idx)}
              ratingValue={ratings[q.id] || ''}
              onRatingChange={(val) => onRatingChange(q.id, val)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(QuestionPanel);
