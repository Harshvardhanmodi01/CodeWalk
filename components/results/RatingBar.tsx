'use client';

import React from 'react';

interface RatingBarProps {
  value: string; // 'poor' | 'avg' | 'good' | 'great' | 'skip' | ''
  onChange: (val: string) => void;
}

export default function RatingBar({ value, onChange }: RatingBarProps) {
  const ratings = [
    { id: 'poor', label: 'Poor', activeClass: 'bg-error text-surface font-bold glow-cyan', hoverClass: 'hover:text-error' },
    { id: 'avg', label: 'Avg', activeClass: 'bg-tertiary-fixed-dim text-surface font-bold glow-cyan', hoverClass: 'hover:text-tertiary-fixed' },
    { id: 'good', label: 'Good', activeClass: 'bg-primary-fixed text-surface-container-lowest font-bold glow-cyan', hoverClass: 'hover:text-primary-fixed' },
    { id: 'great', label: 'Great', activeClass: 'bg-secondary text-surface-container-lowest font-bold glow-cyan', hoverClass: 'hover:text-secondary' },
    { id: 'skip', label: 'Skip', activeClass: 'bg-surface-container-highest text-on-surface border border-outline-variant font-semibold', hoverClass: 'hover:text-on-surface' }
  ];

  return (
    <div className="grid grid-cols-5 bg-surface-container-highest p-1 rounded-xl border border-outline-variant select-none">
      {ratings.map((rate) => {
        const isSelected = value === rate.id;
        return (
          <button
            key={rate.id}
            type="button"
            onClick={() => onChange(rate.id)}
            className={`py-3 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-tighter transition-all active:scale-95 duration-100 ${
              isSelected 
                ? rate.activeClass 
                : `text-on-surface-variant hover:bg-surface-variant/40 ${rate.hoverClass}`
            }`}
          >
            {rate.label}
          </button>
        );
      })}
    </div>
  );
}
