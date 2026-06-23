'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface QuotaExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuotaExceededModal({ isOpen, onClose }: QuotaExceededModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    router.push('/pricing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-md bg-surface border-2 border-primary-fixed/30 rounded-xl shadow-2xl p-8 flex flex-col text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Warning Icon Badge */}
        <div className="mx-auto inline-flex items-center justify-center w-16 h-16 rounded-full bg-error-container/10 border border-error/20 text-error glow-cyan">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            error
          </span>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h2 className="font-headline-lg text-xl text-on-surface font-extrabold">
            Assessment Quota Reached
          </h2>
          <p className="text-sm text-secondary font-bold font-mono">
            5 / 5 analyses used this month
          </p>
          <p className="text-xs text-on-surface-variant/80 max-w-xs mx-auto leading-relaxed">
            You've exhausted your free assessment cap. Upgrade to CodeWalk Pro to run unlimited repos, gain private branch support, and export full candidate scorecards.
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleUpgrade}
            className="w-full py-3 bg-primary-fixed text-on-primary-fixed font-bold font-label-sm text-sm uppercase rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,219,233,0.3)]"
          >
            Upgrade to Pro
          </button>
          
          <button 
            onClick={onClose}
            className="w-full py-2 bg-transparent text-on-surface-variant/60 font-semibold font-label-sm text-xs hover:text-on-surface transition-colors"
          >
            Maybe Later
          </button>
        </div>

      </div>
    </div>
  );
}
