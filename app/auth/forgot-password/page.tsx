'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      // Direct user to confirm/reset mock password
      router.push('/auth/reset-password');
    }, 2000);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 glow-effect">
      <div className="max-w-md w-full space-y-8 glassmorphism p-8 rounded-2xl shadow-xl">
        <div>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-primary/20">
            CW
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-main">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-muted-text">
            Enter your email to receive a password reset link.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-3 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-500 text-xs rounded-xl p-3 text-center animate-pulse">
            ✓ Reset link sent! Redirecting to password setup...
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
            disabled={success}
            className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 shadow-md shadow-primary/20"
          >
            Send Reset Link
          </button>
        </form>
      </div>
    </div>
  );
}
