'use client';

import React from 'react';

interface AnswerRevealedProps {
  expectedAnswer: string;
  isRevealed: boolean;
}

export default function AnswerRevealed({ expectedAnswer, isRevealed }: AnswerRevealedProps) {
  if (!isRevealed) return null;

  return (
    <div className="answer-reveal-animation bg-surface-container-lowest border-l-4 border-primary-fixed p-6 rounded-r-lg space-y-4 shadow-md">
      <div className="flex items-center gap-2 text-primary-fixed">
        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
        <span className="font-label-sm text-[10px] font-bold tracking-widest uppercase">Expected Answer</span>
      </div>
      <div className="space-y-4 font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
        <p>{expectedAnswer}</p>
      </div>
    </div>
  );
}
