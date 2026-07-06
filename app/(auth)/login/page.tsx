'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user } = useGlobal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Show any OAuth provider errors surfaced via URL param from /auth/callback
    const oauthError = searchParams.get('oauth_error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
    }
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password, captchaAnswer, captchaToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
      if (err.requireCaptcha) {
        setShowCaptcha(true);
        setCaptchaQuestion(err.captchaQuestion);
        setCaptchaToken(err.captchaToken);
        setCaptchaAnswer('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // /auth/callback exchanges the OAuth code for a session (PKCE flow)
          redirectTo: window.location.origin + '/auth/callback',
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(`${provider} sign in failed: ${err.message}`);
    }
  };

  const features = [
    'GitHub repo-based question generation',
    'AI Code Story candidate brief',
    'Live code highlighting during interview',
    'Recruiter Copilot with follow-up suggestions',
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0d1515' }}>

      {/* LEFT PANEL — BRANDING */}
      <div className="hidden md:flex md:w-[45%] lg:w-[55%] relative flex-col justify-between p-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0d1515 0%, #0a1a1a 50%, #0d1515 100%)' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,219,233,0.07) 0%, transparent 70%)', animation: 'pulse 4s ease-in-out infinite' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,219,233,0.04) 0%, transparent 70%)' }} />
        <div className="absolute top-[15%] right-[20%] w-1 h-1 rounded-full" style={{ backgroundColor: 'rgba(0,219,233,0.4)', animation: 'bounce 3.5s ease-in-out infinite' }} />
        <div className="absolute top-[45%] right-[10%] w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(0,219,233,0.25)', animation: 'bounce 5s ease-in-out 1s infinite' }} />
        <div className="absolute top-[70%] right-[30%] w-1 h-1 rounded-full" style={{ backgroundColor: 'rgba(0,219,233,0.3)', animation: 'bounce 4s ease-in-out 0.5s infinite' }} />
        <div className="absolute top-[25%] left-[15%] w-1 h-1 rounded-full" style={{ backgroundColor: 'rgba(0,219,233,0.2)', animation: 'bounce 6s ease-in-out 2s infinite' }} />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5 group w-fit">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm tracking-tight" style={{ backgroundColor: '#00dbe9', color: '#002022', boxShadow: '0 4px 14px rgba(0,219,233,0.2)' }}>
              CW
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: '#dce4e5' }}>CodeWalk</span>
          </Link>
        </div>

        <div className="relative z-10 flex-grow flex flex-col justify-center space-y-8 py-10">
          <div className="space-y-5">
            <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight tracking-tight" style={{ color: '#dce4e5' }}>
              Interview candidates on their{' '}
              <span style={{ color: '#00dbe9' }}>actual code.</span>{' '}
              Not generic questions.
            </h1>
            <p className="text-sm lg:text-base leading-relaxed max-w-md" style={{ color: '#849495' }}>
              The only platform that generates interview questions directly from a candidate&apos;s GitHub repository.
            </p>
          </div>

          <ul className="space-y-3.5">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,219,233,0.12)', border: '1px solid rgba(0,219,233,0.3)' }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} style={{ color: '#00dbe9' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm" style={{ color: '#b9cacb' }}>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(21,29,30,0.8)', border: '1px solid #3b494b' }}>
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 24 24" style={{ color: '#00dbe9' }}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <p className="text-sm italic leading-relaxed mb-3" style={{ color: '#b9cacb' }}>
              &ldquo;CodeWalk helped us cut our technical screening time by 60%&rdquo;
            </p>
            <p className="text-xs font-semibold" style={{ color: '#849495' }}>— Engineering Manager, Series B Startup</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — FORM */}
      <div className="flex-1 md:w-[55%] lg:w-[45%] flex flex-col items-center justify-center px-6 py-10 overflow-y-auto" style={{ backgroundColor: '#151d1e' }}>
        <div className="w-full max-w-[400px] space-y-6">

          <div className="flex md:hidden justify-center mb-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs" style={{ backgroundColor: '#00dbe9', color: '#002022' }}>CW</div>
              <span className="font-bold tracking-tight" style={{ color: '#dce4e5' }}>CodeWalk</span>
            </Link>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#dce4e5' }}>Welcome back</h2>
            <p className="text-sm" style={{ color: '#849495' }}>Sign in to your recruiter workspace</p>
          </div>

          {error && (
            <div className="text-xs rounded-lg p-3 text-center" style={{ backgroundColor: 'rgba(255,75,75,0.08)', border: '1px solid rgba(255,75,75,0.25)', color: '#ff6b6b' }}>
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => handleOAuthLogin('github')}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 text-sm font-semibold transition-all duration-150 active:scale-[0.98] rounded-lg cursor-pointer"
              style={{ backgroundColor: '#192122', border: '1px solid #3b494b', color: '#b9cacb' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#00dbe9')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#3b494b')}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              <span>Continue with GitHub</span>
            </button>

            <button
              onClick={() => handleOAuthLogin('google')}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 text-sm font-semibold transition-all duration-150 active:scale-[0.98] rounded-lg cursor-pointer"
              style={{ backgroundColor: '#192122', border: '1px solid #3b494b', color: '#b9cacb' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#00dbe9')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#3b494b')}
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-grow h-px" style={{ backgroundColor: '#3b494b' }} />
            <span className="text-xs font-medium" style={{ color: '#849495' }}>or</span>
            <div className="flex-grow h-px" style={{ backgroundColor: '#3b494b' }} />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider block" style={{ color: '#849495' }}>
                Email Address
              </label>
              <input
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all duration-150"
                style={{ backgroundColor: '#192122', border: '1px solid #3b494b', color: '#dce4e5' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#00dbe9')}
                onBlur={e => (e.currentTarget.style.borderColor = '#3b494b')}
                placeholder="recruiter@company.com"
                type="email"
                disabled={loading}
                suppressHydrationWarning={true}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#849495' }}>
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-xs hover:underline" style={{ color: '#00dbe9' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 pr-12 text-sm outline-none transition-all duration-150"
                  style={{ backgroundColor: '#192122', border: '1px solid #3b494b', color: '#dce4e5' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#00dbe9')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#3b494b')}
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  disabled={loading}
                  suppressHydrationWarning={true}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                  style={{ color: '#849495' }}
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

            {showCaptcha && (
              <div className="space-y-1.5 p-4 border border-[#3b494b] bg-[#151d1e]/50 rounded-lg">
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Security Verification Required
                </label>
                <p className="text-xs text-[#b9cacb] mt-1">{captchaQuestion}</p>
                <input
                  type="text"
                  required
                  placeholder="Enter your answer"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="w-full mt-2 rounded-lg px-4 py-2.5 text-xs outline-none bg-[#0d1515] border border-[#3b494b] text-white"
                  style={{ border: '1px solid #3b494b' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#00dbe9')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#3b494b')}
                  disabled={loading}
                />
              </div>
            )}

            <button
              className="w-full font-bold text-sm py-3.5 rounded-lg transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 mt-2 cursor-pointer"
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#00dbe9', color: '#002022', opacity: loading ? 0.7 : 1 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#00b0bc'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#00dbe9'; }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,32,34,0.3)', borderTopColor: '#002022' }} />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <p className="text-center text-sm" style={{ color: '#849495' }}>
            New to CodeWalk?{' '}
            <Link href="/register" className="font-semibold hover:underline" style={{ color: '#00dbe9' }}>
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
