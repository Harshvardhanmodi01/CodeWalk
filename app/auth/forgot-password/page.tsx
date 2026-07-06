'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const sendResetEmail = async (emailAddress: string) => {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(emailAddress.trim(), {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });

    if (resetErr) throw resetErr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await sendResetEmail(email);
      setEmailSent(true);
      setResendCooldown(60);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        // Fallback to success page to prevent account enumeration
        setEmailSent(true);
        setResendCooldown(60);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await sendResetEmail(email);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 glow-effect">
      <div className="max-w-md w-full space-y-8 glassmorphism p-8 rounded-2xl shadow-xl">
        {/* Header */}
        <div>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-primary/20">
            CW
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-main">
            {emailSent ? 'Check your email' : 'Reset Password'}
          </h2>
          <p className="mt-2 text-center text-sm text-muted-text">
            {emailSent
              ? null
              : 'Enter your email to receive a password reset link.'}
          </p>
        </div>

        {/* ── STATE 2: Email sent confirmation ── */}
        {emailSent ? (
          <div className="space-y-6">
            {/* Green checkmark */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-center text-sm text-muted-text leading-relaxed">
                If this email exists, you will receive a reset link.
                Please check the inbox for <strong className="text-text-main font-semibold">{email}</strong>.
              </p>
              <p className="text-center text-xs text-muted-text/70">
                Didn&apos;t receive it? Check your spam folder or resend below.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-3 text-center">
                {error}
              </div>
            )}

            {/* Resend button with cooldown */}
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="w-full flex justify-center py-2.5 px-4 border border-primary text-sm font-semibold rounded-xl text-primary hover:bg-primary/10 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Sending...'
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend Email'}
            </button>

            <div className="text-center">
              <Link href="/auth/signin" className="text-xs font-medium text-primary hover:text-primary-hover">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* ── STATE 1: Email input form ── */
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-3 text-center">
                {error}
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email-address" className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-border-main placeholder-muted-text/50 bg-card-main text-text-main focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="name@company.com"
                  disabled={loading}
                  suppressHydrationWarning={true}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <Link href="/auth/signin" className="font-medium text-primary hover:text-primary-hover">
                  ← Back to Sign In
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 shadow-md shadow-primary/20 disabled:opacity-70"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
