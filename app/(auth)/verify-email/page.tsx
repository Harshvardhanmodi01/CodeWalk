'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [sentMessage, setSentMessage] = useState(false);

  const handleResend = () => {
    setResending(true);
    setTimeout(() => {
      setResending(false);
      setSentMessage(true);
      setTimeout(() => setSentMessage(false), 3000);
    }, 1500);
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary-container relative overflow-hidden">
      
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 flex justify-center py-8">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90">
          <span className="material-symbols-outlined text-primary-fixed text-4xl">terminal</span>
          <span className="font-headline-md text-headline-md font-bold text-primary-fixed tracking-tight">CodeWalk</span>
        </Link>
      </header>

      {/* Main Panel */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-margin-mobile select-none text-center">
        <div className="w-full max-w-[420px] bg-surface-container border border-outline-variant p-8 relative overflow-hidden rounded-xl shadow-2xl space-y-6">
          {/* Top Decorative Scanner line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-primary-fixed/30"></div>
          
          {/* Email Icon Animation */}
          <div className="mx-auto inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-container/10 border border-primary-fixed/30 text-primary-fixed animate-pulse">
            <span className="material-symbols-outlined text-4xl">mail</span>
          </div>

          <div className="space-y-2">
            <h1 className="font-headline-lg text-xl text-on-surface font-extrabold">Check your inbox</h1>
            <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
              Verification Link Dispatched
            </p>
            <p className="text-xs text-on-surface-variant/80 leading-relaxed max-w-xs mx-auto">
              We've sent a secure connection key to your email address. Verify the credential link to unlock your technical workspace sessions.
            </p>
          </div>

          <div className="pt-4 border-t border-outline-variant/30 flex flex-col items-center gap-4">
            <button 
              disabled={resending}
              onClick={handleResend}
              className="text-xs text-primary-fixed hover:underline font-bold uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {resending ? 'Re-issuing Link...' : 'Resend Verification Email'}
            </button>
            {sentMessage && (
              <span className="text-[10px] text-primary-fixed font-bold animate-pulse font-mono uppercase">
                &gt; Link re-dispatched successfully.
              </span>
            )}
            
            <Link 
              href="/login" 
              className="text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors font-semibold"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
