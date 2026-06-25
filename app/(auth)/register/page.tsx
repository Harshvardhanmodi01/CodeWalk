'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';

export default function RegisterPage() {
  const router = useRouter();
  const { user } = useGlobal();
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Sign up the user in Supabase auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: fullName,
            companyName: company,
          }
        }
      });

      if (authErr) throw authErr;

      const authUser = authData?.user;
      if (!authUser) {
        throw new Error('Verification required or registration error.');
      }

      // 2. Insert into the public.recruiters table
      const { error: dbErr } = await supabase.from('recruiters').insert({
        id: authUser.id,
        email,
        full_name: fullName,
        company,
      });

      if (dbErr) {
        console.error('Failed to create recruiter profile:', dbErr);
        // Do not throw if auth succeeded, profile can be auto-created fallback
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
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

      {/* Register Form Panel */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-margin-mobile pt-24 pb-12">
        <div className="w-full max-w-[420px] bg-surface-container border border-outline-variant p-8 relative overflow-hidden rounded-xl shadow-2xl">
          {/* Top Decorative Scanner line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-primary-fixed/30 animate-[scan_4s_linear_infinite]"></div>
          
          <div className="space-y-6">
            <div className="text-center space-y-1 select-none">
              <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold">Register Recruiter</h1>
              <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                Create recruiter credentials
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-3 text-center">
                {error}
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-2 font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  FULL NAME
                </label>
                <div className="relative glow-focus rounded">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed/50 font-code-md text-code-md select-none font-mono font-bold">&gt;</span>
                  <input 
                    required 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-4 py-2.5 text-on-surface font-code-md focus:outline-none transition-all font-mono text-sm rounded" 
                    placeholder="John Doe" 
                    type="text"
                    disabled={loading}
                    suppressHydrationWarning={true}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-2 font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
                  COMPANY NAME
                </label>
                <div className="relative glow-focus rounded">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed/50 font-code-md text-code-md select-none font-mono font-bold">&gt;</span>
                  <input 
                    required 
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-4 py-2.5 text-on-surface font-code-md focus:outline-none transition-all font-mono text-sm rounded" 
                    placeholder="Acme Corp" 
                    type="text"
                    disabled={loading}
                    suppressHydrationWarning={true}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-2 font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">alternate_email</span>
                  EMAIL ADDRESS
                </label>
                <div className="relative glow-focus rounded">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed/50 font-code-md text-code-md select-none font-mono font-bold">&gt;</span>
                  <input 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-4 py-2.5 text-on-surface font-code-md focus:outline-none transition-all font-mono text-sm rounded" 
                    placeholder="recruiter@company.com" 
                    type="email"
                    disabled={loading}
                    suppressHydrationWarning={true}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-label-sm text-[10px] text-on-surface-variant flex items-center gap-2 font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">key</span>
                  PASSWORD (MIN. 6 CHARACTERS)
                </label>
                <div className="relative glow-focus rounded">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed/50 font-code-md text-code-md select-none font-mono font-bold">&gt;</span>
                  <input 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-4 py-2.5 text-on-surface font-code-md focus:outline-none transition-all font-mono text-sm rounded" 
                    placeholder="••••••••" 
                    type="password"
                    minLength={6}
                    disabled={loading}
                    suppressHydrationWarning={true}
                  />
                </div>
              </div>

              <button 
                className="w-full bg-primary text-white font-bold font-label-sm text-xs py-4 glow-cyan hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-6 uppercase tracking-widest rounded" 
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Registering...' : 'Register Account'}</span>
                <span className="material-symbols-outlined text-lg font-bold">person_add</span>
              </button>
            </form>

            <div className="pt-2 text-center select-none text-xs">
              <p className="text-on-surface-variant font-label-sm text-xs">
                Already registered?{' '}
                <Link className="text-primary hover:underline font-bold" href="/login">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer statistics bar */}
      <footer className="p-6 flex justify-between items-center relative z-10 select-none text-[10px] text-outline font-mono">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span>NODE: US-EAST-1</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span>ENCRYPTION: AES-256</span>
          </div>
        </div>
        <div>
          v2.4.0-STABLE
        </div>
      </footer>
    </div>
  );
}
