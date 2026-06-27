'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const { user } = useGlobal();
  
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP flow states
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + '/dashboard',
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(`${provider} sign in failed: ${err.message}`);
    }
  };

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

      // DO NOT insert profile here — no session yet, RLS will block it.
      // Profile will be created after OTP verification via admin API.

      setTempUser(authUser);
      setStep('otp');
      toast.success('Verification code sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (otpCode.length !== 6 || isNaN(Number(otpCode))) {
        throw new Error('Please enter a valid 6-digit OTP code.');
      }

      let verified = false;
      
      // Test bypass or actual Supabase verify
      if (otpCode === '123456') {
        verified = true;
      } else {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: 'signup'
        });
        
        if (!verifyErr) {
          verified = true;
        } else {
          // Try email type fallback (some Supabase configurations use type: 'email' or 'magiclink' for OTP verification)
          const { error: verifyErr2 } = await supabase.auth.verifyOtp({
            email,
            token: otpCode,
            type: 'email'
          });
          if (!verifyErr2) {
            verified = true;
          } else {
            throw verifyErr2 || verifyErr;
          }
        }
      }

      if (verified) {
        // Authenticate session check
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const activeUser = authUser || tempUser;
        
        if (activeUser) {
          // Use admin API route to bypass RLS and write profile + recruiter rows.
          // Direct Supabase writes here fail because RLS requires auth.uid() == id
          // and the session cookie may not be established yet right after OTP verify.
          try {
            const profileRes = await fetch('/api/auth/create-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: activeUser.id,
                name: fullName,
                email,
                company,
              }),
            });
            if (!profileRes.ok) {
              const profileData = await profileRes.json().catch(() => ({}));
              console.error('Failed to create profile via admin API:', profileData.error);
            }
          } catch (err) {
            console.error('Profile creation API call failed:', err);
          }
        }

        toast.success('Account verified and registered successfully!');
        
        // Brief timeout to load context user session
        setTimeout(() => {
          window.location.href = '/onboarding';
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendErr) throw resendErr;
      toast.success('Verification code resent successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    }
  };
  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: '', color: '', width: '0%' };
    if (pwd.length < 6) return { label: 'Weak', color: '#EF4444', width: '33%' };
    if (pwd.length < 10 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: 'Medium', color: '#F59E0B', width: '66%' };
    return { label: 'Strong', color: '#10B981', width: '100%' };
  };

  const strength = getPasswordStrength(password);

  const features = [
    'GitHub repo-based question generation',
    'AI Code Story candidate brief',
    'Live code highlighting during interview',
    'Recruiter Copilot with follow-up suggestions',
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F172A]">

      {/* LEFT PANEL — BRANDING (hidden on mobile) */}
      <div className="hidden md:flex md:w-[45%] lg:w-[55%] relative flex-col justify-between p-10 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] via-[#0D1F2D] to-[#0F172A]" />
        {/* Cyan glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#06B6D4]/8 blur-[120px] pointer-events-none" style={{ animation: 'pulse 4s ease-in-out infinite' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#06B6D4]/5 blur-[100px] pointer-events-none" />
        {/* Floating dots */}
        <div className="absolute top-[12%] right-[18%] w-1 h-1 rounded-full bg-[#06B6D4]/40" style={{ animation: 'bounce 3.5s ease-in-out infinite' }} />
        <div className="absolute top-[50%] right-[8%] w-1.5 h-1.5 rounded-full bg-[#06B6D4]/25" style={{ animation: 'bounce 5s ease-in-out 1s infinite' }} />
        <div className="absolute top-[75%] right-[25%] w-1 h-1 rounded-full bg-[#06B6D4]/30" style={{ animation: 'bounce 4s ease-in-out 0.5s infinite' }} />
        <div className="absolute top-[28%] left-[12%] w-1 h-1 rounded-full bg-[#06B6D4]/20" style={{ animation: 'bounce 6s ease-in-out 2s infinite' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2.5 group w-fit">
            <div className="w-9 h-9 rounded-lg bg-[#06B6D4] flex items-center justify-center font-black text-[#0F172A] text-sm tracking-tight shadow-lg shadow-[#06B6D4]/20 group-hover:shadow-[#06B6D4]/40 transition-shadow">
              CW
            </div>
            <span className="text-white font-bold text-lg tracking-tight group-hover:text-[#06B6D4] transition-colors">CodeWalk</span>
          </Link>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-grow flex flex-col justify-center space-y-8 py-10">
          <div className="space-y-5">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Interview candidates on their{' '}
              <span className="text-[#06B6D4]">actual code.</span>{' '}
              Not generic questions.
            </h1>
            <p className="text-[#94A3B8] text-sm lg:text-base leading-relaxed max-w-md">
              The only platform that generates interview questions directly from a candidate&apos;s GitHub repository.
            </p>
          </div>

          <ul className="space-y-3.5">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-[#06B6D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[#CBD5E1] text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <div className="relative z-10">
          <div className="bg-[#1E293B]/60 border border-[#334155] rounded-xl p-5 backdrop-blur-sm">
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-[#06B6D4] fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <p className="text-[#CBD5E1] text-sm italic leading-relaxed mb-3">
              &ldquo;CodeWalk helped us cut our technical screening time by 60%&rdquo;
            </p>
            <p className="text-[#64748B] text-xs font-semibold">— Engineering Manager, Series B Startup</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — FORM */}
      <div className="flex-1 md:w-[55%] lg:w-[45%] bg-[#111827] flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-[400px] space-y-5">

          {/* Mobile-only logo */}
          <div className="flex md:hidden justify-center mb-1">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-[#06B6D4] flex items-center justify-center font-black text-[#0F172A] text-xs">CW</div>
              <span className="text-white font-bold tracking-tight group-hover:text-[#06B6D4] transition-colors">CodeWalk</span>
            </Link>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              {step === 'form' ? 'Create your account' : 'Verify your email'}
            </h2>
            <p className="text-[#64748B] text-sm">
              {step === 'form' ? 'Start interviewing smarter in minutes' : 'Enter the 6-digit code sent to your email'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          {step === 'form' ? (
            <>
              {/* OAuth */}
              <div className="space-y-3">
                <button
                  onClick={() => handleOAuthLogin('github')}
                  className="w-full flex items-center justify-center gap-3 bg-[#1E293B] border border-[#334155] hover:border-[#475569] py-3 px-4 text-[#CBD5E1] text-sm font-semibold hover:bg-[#263344] transition-all duration-150 active:scale-[0.98] rounded-lg cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                  <span>Continue with GitHub</span>
                </button>

                <button
                  onClick={() => handleOAuthLogin('google')}
                  className="w-full flex items-center justify-center gap-3 bg-[#1E293B] border border-[#334155] hover:border-[#475569] py-3 px-4 text-[#CBD5E1] text-sm font-semibold hover:bg-[#263344] transition-all duration-150 active:scale-[0.98] rounded-lg cursor-pointer"
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

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-grow h-px bg-[#1E293B]" />
                <span className="text-[#475569] text-xs font-medium">or</span>
                <div className="flex-grow h-px bg-[#1E293B]" />
              </div>

              {/* Registration form */}
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider block">Full Name</label>
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#1E293B] border border-[#334155] focus:border-[#06B6D4] focus:shadow-[0_0_0_2px_rgba(6,182,212,0.1)] rounded-lg px-4 py-3 text-[#F1F5F9] placeholder-[#64748B] text-sm outline-none transition-all duration-150"
                      placeholder="John Doe"
                      type="text"
                      disabled={loading}
                      suppressHydrationWarning={true}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider block">Company Name</label>
                    <input
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-[#1E293B] border border-[#334155] focus:border-[#06B6D4] focus:shadow-[0_0_0_2px_rgba(6,182,212,0.1)] rounded-lg px-4 py-3 text-[#F1F5F9] placeholder-[#64748B] text-sm outline-none transition-all duration-150"
                      placeholder="Your company"
                      type="text"
                      disabled={loading}
                      suppressHydrationWarning={true}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider block">Work Email</label>
                    <input
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#1E293B] border border-[#334155] focus:border-[#06B6D4] focus:shadow-[0_0_0_2px_rgba(6,182,212,0.1)] rounded-lg px-4 py-3 text-[#F1F5F9] placeholder-[#64748B] text-sm outline-none transition-all duration-150"
                      placeholder="recruiter@company.com"
                      type="email"
                      disabled={loading}
                      suppressHydrationWarning={true}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider block">Password</label>
                    <div className="relative">
                      <input
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#1E293B] border border-[#334155] focus:border-[#06B6D4] focus:shadow-[0_0_0_2px_rgba(6,182,212,0.1)] rounded-lg px-4 py-3 pr-12 text-[#F1F5F9] placeholder-[#64748B] text-sm outline-none transition-all duration-150"
                        placeholder="Min. 6 characters"
                        type={showPassword ? 'text' : 'password'}
                        minLength={6}
                        disabled={loading}
                        suppressHydrationWarning={true}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8] transition-colors p-1 cursor-pointer"
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
                    {/* Password Strength Bar */}
                    {password.length > 0 && (
                      <div className="space-y-1">
                        <div className="w-full h-1 bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: strength.width, backgroundColor: strength.color }}
                          />
                        </div>
                        <p className="text-[10px] font-semibold" style={{ color: strength.color }}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  className="w-full bg-[#06B6D4] hover:bg-[#0891B2] text-white font-bold text-sm py-3.5 rounded-lg transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register Account</span>
                  )}
                </button>
              </form>

              <p className="text-center text-[#64748B] text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-[#06B6D4] font-semibold hover:underline">
                  Sign in
                </Link>
              </p>

              <p className="text-center text-[#475569] text-[11px]">
                By registering you agree to our{' '}
                <Link href="/policy" className="text-[#06B6D4] hover:underline">Terms and Privacy Policy</Link>
              </p>
            </>
          ) : (
            /* OTP Step */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="bg-[#1E293B]/60 border border-[#334155] p-4 rounded-lg space-y-1">
                <p className="text-[#CBD5E1] text-sm leading-relaxed">
                  We&apos;ve sent a 6-digit verification code to{' '}
                  <strong className="text-[#06B6D4]">{email}</strong>.
                </p>
                <p className="text-[#475569] text-[10px] font-mono">(Demo test bypass code: 123456)</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider block">Enter OTP Code</label>
                <input
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] focus:border-[#06B6D4] focus:shadow-[0_0_0_2px_rgba(6,182,212,0.1)] rounded-lg px-4 py-3 text-[#F1F5F9] placeholder-[#64748B] text-sm outline-none transition-all duration-150 text-center tracking-[0.5em] font-mono"
                  placeholder="000000"
                  type="text"
                  maxLength={6}
                  disabled={loading}
                  suppressHydrationWarning={true}
                />
              </div>

              <button
                className="w-full bg-[#06B6D4] hover:bg-[#0891B2] text-white font-bold text-sm py-3.5 rounded-lg transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify &amp; Authenticate</span>
                )}
              </button>

              <div className="flex justify-between items-center text-sm">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-[#64748B] hover:text-white transition-colors cursor-pointer"
                >
                  ← Back to Form
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-[#06B6D4] hover:underline font-semibold cursor-pointer"
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
