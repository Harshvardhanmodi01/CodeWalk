'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash');
      const code = searchParams.get('code');
      const type = searchParams.get('type') || 'signup';
      const next = searchParams.get('next') || '/onboarding';

      if (!token_hash && !code) {
        setStatus('error');
        setErrorMsg('Invalid or missing verification link parameters.');
        return;
      }

      try {
        let authUser = null;
        if (code) {
          // Exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          authUser = data?.user;
        } else if (token_hash) {
          // Verify OTP token_hash
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });
          if (error) throw error;
          authUser = data?.user;
        }
        if (authUser) {
          // Sync profiles if metadata is available
          const full_name = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '';
          const company = authUser.user_metadata?.company || authUser.user_metadata?.companyName || '';

          // Upsert profiles table
          try {
            const isQuotaExhausted = typeof window !== 'undefined' && (
              localStorage.getItem('cw_quota_exhausted') === 'true' ||
              document.cookie.includes('cw_quota_exhausted=true')
            );

            await supabase.from('profiles').upsert({
              id: authUser.id,
              email: authUser.email || '',
              full_name: full_name,
              company: company,
              name: full_name,
              company_name: company,
              role: 'HR / Recruiter',
              plan: 'free',
              tokens_used: 0,
              tokens_total: isQuotaExhausted ? 0 : 5,
              onboarding_completed: false,
              created_at: new Date().toISOString()
            }, { onConflict: 'id' });
          } catch (dbErr) {
            console.warn('Profiles upsert during confirm failed:', dbErr);
          }
        }

        setStatus('success');
        toast.success('Email confirmed successfully!');
        
        // Wait 1.5 seconds and redirect
        setTimeout(() => {
          router.replace(next);
        }, 1500);

      } catch (err: any) {
        setStatus('error');
        setErrorMsg(err.message || 'Failed to verify email link.');
      }
    };

    verifyToken();
  }, [searchParams, router]);

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-10 h-10 border-2 border-[#06B6D4]/30 border-t-[#06B6D4] rounded-full animate-spin" />
        <p className="text-sm text-[#849495]">Confirming your email address...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-4">
          {errorMsg || 'The verification link is invalid or has expired.'}
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/register"
            className="w-full flex justify-center py-2.5 px-4 text-white bg-[#06B6D4] hover:bg-[#00b0bc] text-sm font-semibold rounded-xl transition-all shadow-md shadow-[#06B6D4]/20 cursor-pointer"
          >
            Register Account Again
          </Link>
          <Link
            href="/login"
            className="text-xs text-[#849495] hover:text-white transition-colors"
          >
            ← Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-extrabold text-white">Email Verified!</h2>
      <p className="text-sm text-[#849495]">Exchanging credentials and preparing your technical workspace...</p>
    </div>
  );
}

export default function ConfirmPage() {
  // Required Supabase Settings:
  // - Authentication -> Settings -> Enable email confirmations: ON
  // - Authentication -> URL Configuration -> Site URL: http://localhost:3000
  // - Authentication -> Redirect URLs: add http://localhost:3000/auth/confirm and https://yourdomain.vercel.app/auth/confirm
  return (
    <div className="bg-[#0F172A] text-white min-h-screen flex flex-col selection:bg-[#06B6D4]/30 relative overflow-hidden">
      <header className="w-full flex justify-center py-8 z-10">
        <Link href="/" className="flex items-center gap-2 group transition-all duration-300">
          <div className="w-8 h-8 rounded-lg bg-[#06B6D4] flex items-center justify-center font-black text-xs text-[#0F172A]">CW</div>
          <span className="font-bold tracking-tight text-white transition-colors group-hover:text-[#06B6D4]">CodeWalk</span>
        </Link>
      </header>

      <main className="relative z-10 flex-grow flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-[420px] bg-[#1E293B] border border-[#3b494b] p-8 rounded-xl shadow-2xl space-y-6">
          <Suspense fallback={
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-10 h-10 border-2 border-[#06B6D4]/30 border-t-[#06B6D4] rounded-full animate-spin" />
              <p className="text-sm text-[#849495]">Loading verification handler...</p>
            </div>
          }>
            <ConfirmContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
