'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // null = checking, true = valid session, false = invalid/expired
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    let subscriptionObj: any = null;
    let timeoutId: any = null;

    const handleRecovery = async () => {
      // 1. Check if there is a 'code' query parameter (PKCE flow)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (data.session && active) {
            setTokenValid(true);
            return;
          }
        } catch (err) {
          console.error('Error exchanging code for session:', err);
        }
      }

      // 2. Check if we already have a session (hash flow or already exchanged)
      const { data: { session } } = await supabase.auth.getSession();
      if (session && active) {
        setTokenValid(true);
        return;
      }

      // 3. Listen to auth state changes in case the session is established asynchronously
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sessionState) => {
        if (!active) return;
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && sessionState)) {
          setTokenValid(true);
        }
      });
      subscriptionObj = subscription;

      // 4. Fallback: wait a bit, then check session status
      timeoutId = setTimeout(async () => {
        if (!active) return;
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (active) {
          if (currentSession) {
            setTokenValid(true);
          } else {
            setTokenValid(false);
          }
        }
      }, 2000);
    };

    handleRecovery();

    return () => {
      active = false;
      if (subscriptionObj) subscriptionObj.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('same password')) {
        setError('New password must be different from your current password.');
      } else if (msg.toLowerCase().includes('weak')) {
        setError('Password is too weak. Please use a stronger password.');
      } else if (msg) {
        setError(msg);
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 glow-effect">
      <div className="max-w-md w-full space-y-8 glassmorphism p-8 rounded-2xl shadow-xl">
        <div>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-primary/20">
            CW
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-main">
            {success ? 'Password Updated' : 'Choose new password'}
          </h2>
          <p className="mt-2 text-center text-sm text-muted-text">
            {success
              ? 'Redirecting you to sign in...'
              : tokenValid === false
              ? 'This reset link is invalid or has expired.'
              : 'Please enter your new password below.'}
          </p>
        </div>

        {/* ── Checking token state ── */}
        {tokenValid === null && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-text">Verifying reset link...</p>
          </div>
        )}

        {/* ── Invalid / expired token ── */}
        {tokenValid === false && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-4 text-center w-full">
                This reset link is invalid or has expired. Please request a new one.
              </div>
            </div>
            <Link
              href="/auth/forgot-password"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary hover:bg-primary-hover transition-all duration-200 shadow-md shadow-primary/20"
            >
              Request New Reset Link
            </Link>
            <div className="text-center">
              <Link href="/login" className="text-xs font-medium text-primary hover:text-primary-hover">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* ── Valid token: show form ── */}
        {tokenValid === true && !success && (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-3 text-center">
                {error}
              </div>
            )}

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none rounded-xl relative block w-full px-3 py-2.5 pr-10 border border-border-main placeholder-muted-text/50 bg-card-main text-text-main focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="••••••••"
                    disabled={loading}
                    suppressHydrationWarning={true}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text hover:text-text-main transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-border-main placeholder-muted-text/50 bg-card-main text-text-main focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="••••••••"
                  disabled={loading}
                  suppressHydrationWarning={true}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 shadow-md shadow-primary/20 disabled:opacity-70 mt-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}

        {/* ── Success state ── */}
        {success && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl p-4 text-center w-full">
              ✓ Password updated successfully! Redirecting to Sign In...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
