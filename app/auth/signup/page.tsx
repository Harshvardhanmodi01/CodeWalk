'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';

export default function SignUpPage() {
  const { signUp, user } = useGlobal();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('1-10 employees');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [loading, setLoading] = useState(false);

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

    if (!email.trim() || !name.trim() || !companyName.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, companyName, companySize);
      setSuccess(true);
      // Wait for session and route to workspace
      setTimeout(() => {
        router.push('/workspace');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 glow-effect">
      <div className="max-w-md w-full space-y-8 glassmorphism p-8 rounded-2xl shadow-xl">
        <div>
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-primary/20">
            CW
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-main">
            Get started for free
          </h2>
          <p className="mt-2 text-center text-sm text-muted-text">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium text-primary hover:text-primary-hover">
              Sign in
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
            Account created! Redirecting to Workspace...
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="full-name" className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                id="full-name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="appearance-none rounded-xl relative block w-full px-3 py-2 border border-border-main placeholder-muted-text/50 bg-card-main text-text-main focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="John Doe"
                suppressHydrationWarning={true}
              />
            </div>
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1">
                Work Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-xl relative block w-full px-3 py-2 border border-border-main placeholder-muted-text/50 bg-card-main text-text-main focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="john@company.com"
                suppressHydrationWarning={true}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="company-name" className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1">
                  Company Name
                </label>
                <input
                  id="company-name"
                  name="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full px-3 py-2 border border-border-main placeholder-muted-text/50 bg-card-main text-text-main focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Acme Corp"
                  suppressHydrationWarning={true}
                />
              </div>
              <div>
                <label htmlFor="company-size" className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1">
                  Company Size
                </label>
                <select
                  id="company-size"
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full px-3 py-2 border border-border-main bg-card-main text-text-main focus:outline-none focus:ring-primary focus:border-primary sm:text-sm h-[38px]"
                >
                  <option>1-10 employees</option>
                  <option>10-50 employees</option>
                  <option>50-250 employees</option>
                  <option>250+ employees</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-muted-text uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-xl relative block w-full px-3 py-2 border border-border-main placeholder-muted-text/50 bg-card-main text-text-main focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="••••••••"
                suppressHydrationWarning={true}
              />
            </div>
          </div>

          <div className="text-xs text-muted-text">
            By signing up, you agree to our{' '}
            <Link href="/policy" className="font-semibold text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/policy" className="font-semibold text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </div>

          <button
            type="submit"
            disabled={success}
            className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 shadow-md shadow-primary/20"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
