'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (!email) {
      toast.error('Email address is missing.');
      return;
    }
    setResending(true);
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/confirm`
        }
      });
      if (error) throw error;
      toast.success('Verification email sent!');
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] bg-[#1E293B] border border-[#3b494b] p-8 relative overflow-hidden rounded-xl shadow-2xl space-y-6 text-center text-white">
      {/* Top Decorative Scanner line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-[#06B6D4]/30"></div>
      
      {/* Email Icon Animation */}
      <div className="mx-auto inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[#06B6D4] animate-pulse">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-white">Verify your email address</h1>
        <p className="text-sm text-[#849495] leading-relaxed max-w-xs mx-auto">
          We sent a verification link to <span className="text-white font-semibold">{email || 'your email'}</span>. Click the link in the email to activate your account.
        </p>
      </div>

      <div className="pt-4 border-t border-[#3b494b]/50 flex flex-col items-center gap-4">
        <button 
          disabled={resending || countdown > 0}
          onClick={handleResend}
          className="text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{ color: '#06B6D4' }}
        >
          {resending 
            ? 'Sending...' 
            : countdown > 0 
              ? `Resend in ${countdown}s` 
              : 'Resend Verification Email'}
        </button>
        
        <div className="flex flex-col gap-2 mt-2">
          <Link 
            href="/login" 
            className="text-xs text-[#849495] hover:text-white transition-colors font-semibold"
          >
            ← Back to Sign In
          </Link>
          
          <div className="text-xs text-[#849495]">
            Wrong email?{' '}
            <Link 
              href="/register" 
              className="font-semibold transition-colors hover:underline"
              style={{ color: '#06B6D4' }}
            >
              Register again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="bg-[#0F172A] text-white min-h-screen flex flex-col selection:bg-[#06B6D4]/30 relative overflow-hidden">
      {/* Top Header */}
      <header className="w-full flex justify-center py-8 z-10">
        <Link href="/" className="flex items-center gap-2 group transition-all duration-300">
          <div className="w-8 h-8 rounded-lg bg-[#06B6D4] flex items-center justify-center font-black text-xs text-[#0F172A]">CW</div>
          <span className="font-bold tracking-tight text-white transition-colors group-hover:text-[#06B6D4]">CodeWalk</span>
        </Link>
      </header>

      {/* Main Panel */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 pb-12">
        <Suspense fallback={
          <div className="w-full max-w-[420px] bg-[#1E293B] border border-[#3b494b] p-8 rounded-xl text-center text-[#849495]">
            Loading...
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </main>
    </div>
  );
}
