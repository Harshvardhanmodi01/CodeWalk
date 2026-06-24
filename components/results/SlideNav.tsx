'use client';

import React from 'react';

interface SlideNavProps {
  currentIndex: number; // 0-indexed
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function SlideNav({ currentIndex, totalCount, onPrev, onNext }: SlideNavProps) {
  const currentNum = currentIndex + 1;
  
  return (
    <div className="flex items-center gap-4 select-none">
      {/* Prev Arrow */}
      <button 
        onClick={onPrev}
        disabled={currentIndex === 0}
        className={`text-on-surface-variant hover:text-primary-fixed active:scale-95 transition-all p-1 rounded-md hover:bg-surface-variant/40 ${
          currentIndex === 0 ? 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-on-surface-variant' : ''
        }`}
      >
        <span className="material-symbols-outlined font-bold text-xl">chevron_left</span>
      </button>

      {/* Counter */}
      <span className="font-label-sm text-xs text-primary-fixed font-bold tracking-widest uppercase">
        Question {currentNum} of {totalCount}
      </span>

      {/* Next Arrow */}
      <button 
        onClick={onNext}
        disabled={currentNum === totalCount}
        className={`text-on-surface-variant hover:text-primary-fixed active:scale-95 transition-all p-1 rounded-md hover:bg-surface-variant/40 ${
          currentNum === totalCount ? 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-on-surface-variant' : ''
        }`}
      >
        <span className="material-symbols-outlined font-bold text-xl">chevron_right</span>
      </button>
    </div>
  );
}
