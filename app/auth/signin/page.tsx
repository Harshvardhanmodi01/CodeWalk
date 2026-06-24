'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';

export default function SignInPage() {
  const { signIn, user } = useGlobal();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      router.push('/workspace');
    }
  }, [user, router]);

  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      setSuccess(true);
      router.push('/workspace');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
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
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-muted-text">
            Or{' '}
            <Link href="/auth/signup" className="font-medium text-primary hover:text-primary-hover">
              create a new account
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-3 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-500 text-xs rounded-xl p-3 text-center animate-pulse">
            Sign in successful! Redirecting...
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
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
                className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-border-main placeholder-muted-text/50 bg-card-main text-text-main focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="name@company.com"
                suppressHydrationWarning={true}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-border-main placeholder-muted-text/50 bg-card-main text-text-main focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="••••••••"
                suppressHydrationWarning={true}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-border-main rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-muted-text">
                Remember me
              </label>
            </div>

            <div className="text-xs">
              <Link href="/auth/forgot-password" className="font-medium text-primary hover:text-primary-hover">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={success}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 shadow-md shadow-primary/20"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
