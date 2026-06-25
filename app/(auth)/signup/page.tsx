'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/verify-email');
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary-container relative overflow-hidden">
      
      {/* Top Header */}
      <header className="w-full flex justify-center py-8 z-10">
        <Link href="/" className="flex items-center gap-2 group transition-all duration-300">
          <span className="material-symbols-outlined text-primary-fixed text-4xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">terminal</span>
          <span className="font-headline-md text-headline-md font-bold text-primary-fixed tracking-tight group-hover:text-primary-fixed-dim transition-all duration-300">CodeWalk</span>
        </Link>
      </header>

      {/* Signup Form Panel */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-margin-mobile pb-12">
        <div className="w-full max-w-[420px] bg-surface-container border border-outline-variant p-8 relative overflow-hidden rounded-xl shadow-2xl">
          {/* Top Decorative Scanner line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-primary-fixed/30 animate-[scan_4s_linear_infinite]"></div>
          
          <div className="space-y-6">
            <div className="text-center space-y-1 select-none">
              <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold">Register entity</h1>
              <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                Initialize your workspace access keys
              </p>
            </div>

            {/* OAuth SSO options */}
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-3 bg-surface-container-high border border-outline-variant py-3 px-4 text-on-surface text-xs font-bold hover:bg-surface-variant transition-all active:scale-[0.98] rounded-lg"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path>
                </svg>
                <span>Register with GitHub</span>
              </button>

              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full flex items-center justify-center gap-3 bg-surface-container-high border border-outline-variant py-3 px-4 text-on-surface text-xs font-bold hover:bg-surface-variant transition-all active:scale-[0.98] rounded-lg"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                </svg>
                <span>Register with Google</span>
              </button>
            </div>

            {/* Separator */}
            <div className="flex items-center gap-4 py-1 select-none">
              <div className="flex-grow h-[1px] bg-outline-variant/50"></div>
              <span className="font-code-sm text-xs font-bold text-outline font-mono">OR</span>
              <div className="flex-grow h-[1px] bg-outline-variant/50"></div>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-2 font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                  EMAIL ADDRESS
                </label>
                <div className="relative glow-focus rounded">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed/50 font-code-md text-code-md select-none font-mono font-bold">&gt;</span>
                  <input 
                    required 
                    className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-4 py-2.5 text-on-surface font-code-md focus:outline-none transition-all font-mono text-sm rounded" 
                    placeholder="name@company.com" 
                    type="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-2 font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">key</span>
                  PASSWORD
                </label>
                <div className="relative glow-focus rounded">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed/50 font-code-md text-code-md select-none font-mono font-bold">&gt;</span>
                  <input 
                    required 
                    className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-4 py-2.5 text-on-surface font-code-md focus:outline-none transition-all font-mono text-sm rounded" 
                    placeholder="••••••••" 
                    type="password"
                  />
                </div>
              </div>

              <button 
                className="w-full bg-primary-fixed text-on-primary-fixed font-bold font-label-sm text-xs py-4 glow-cyan hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-6 uppercase tracking-widest rounded" 
                type="submit"
              >
                <span>Initialize Assessment</span>
                <span className="material-symbols-outlined text-lg font-bold">how_to_reg</span>
              </button>
            </form>

            <div className="pt-2 text-center select-none text-xs">
              <p className="text-on-surface-variant font-label-sm text-xs">
                Already registered?{' '}
                <Link className="text-primary-fixed hover:underline font-bold" href="/login">
                  Login Credentials
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="p-6 flex justify-between items-center relative z-10 select-none text-[10px] text-outline font-mono">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-fixed animate-pulse"></div>
            <span>NODE: US-EAST-1</span>
          </div>
        </div>
        <div>
          v2.4.0-STABLE
        </div>
      </footer>
    </div>
  );
}
