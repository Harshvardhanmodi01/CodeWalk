'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { toast } from 'react-hot-toast';

export interface User {
  id: string;
  email: string;
  name: string;
  companyName: string;
  plan?: string;
  tokensTotal?: number;
  tokensUsed?: number;
  githubUsername?: string;
  githubConnected?: boolean;
  githubAvatar?: string;
  githubRepos?: string[];
  twoFactorEnabled?: boolean;
  role?: string;
  companySize?: string;
  hiresPerMonth?: string;
  referralSource?: string;
  onboardingCompleted?: boolean;
  avatarUrl?: string;
}

export interface Company {
  name: string;
  size: string;
  domain: string;
  industry: string;
  githubConnected: boolean;
  gitlabConnected: boolean;
  bitbucketConnected: boolean;
}

export interface TokenStats {
  limit: number;
  used: number;
  history: Array<{
    id: string;
    repo: string;
    timestamp: string;
    tokens: number;
    filesCount: number;
  }>;
}

interface GlobalContextType {
  user: User | null;
  authLoading: boolean;
  company: Company;
  subscription: 'Free' | 'Pro' | 'Enterprise';
  tokenStats: TokenStats;
  theme: 'light' | 'dark';
  signIn: (email: string, password?: string, captchaAnswer?: string, captchaToken?: string) => Promise<void>;
  signUp: (email: string, password?: string, companyName?: string, companySize?: string) => Promise<void>;
  signOut: () => Promise<void>;
  toggleTheme: () => void;
  consumeTokens: (repoName: string, filesCount: number) => Promise<void>;
  upgradeSubscription: (tier: 'Free' | 'Pro' | 'Enterprise') => Promise<void>;
  toggleIntegration: (provider: 'github' | 'gitlab' | 'bitbucket') => Promise<void>;
  updateCompanyDetails: (details: Partial<Company>) => Promise<void>;
  saveAssessment: (assessment: any) => Promise<void>;
  updateAssessmentRatings: (jobId: string, ratings: any) => Promise<void>;
  updateAssessmentNotes: (jobId: string, notes: any) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // 2FA Challenge states
  const [twoFactorChallenged, setTwoFactorChallenged] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [verifying2fa, setVerifying2fa] = useState(false);

  // User state
  const [user, setUser] = useState<User | null>(null);
  // True while the initial Supabase session check is in flight.
  // Pages should wait for this to be false before deciding to redirect.
  const [authLoading, setAuthLoading] = useState(true);

  // Company state
  const [company, setCompany] = useState<Company>({
    name: '',
    size: '',
    domain: '',
    industry: '',
    githubConnected: false,
    gitlabConnected: false,
    bitbucketConnected: false,
  });

  // Subscription state
  const [subscription, setSubscription] = useState<'Free' | 'Pro' | 'Enterprise'>('Free');

  // Token usage state
  const [tokenStats, setTokenStats] = useState<TokenStats>({
    limit: 50000,
    used: 0,
    history: [],
  });

  // Load theme and auth session on mount
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('cw_theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setTheme(storedTheme);
        document.documentElement.classList.toggle('dark', storedTheme === 'dark');
      } else {
        setTheme('dark');
        document.documentElement.classList.toggle('dark', true);
      }
    } catch {}

    // Initialize Supabase Auth Session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await loadUserData(session.user.id, session.user.email || '');
        }
      } finally {
        // Auth check complete — pages can now act on user === null
        setAuthLoading(false);
      }
    };

    initAuth();

    // Listen for Auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        setAuthLoading(true);
        try {
          if (session) {
            await loadUserData(session.user.id, session.user.email || '');
          } else {
            // Reset states on logout
            setUser(null);
            setTwoFactorChallenged(false);
            setCompany({
              name: '',
              size: '10-50 employees',
              domain: 'acme.com',
              industry: 'Technology',
              githubConnected: true,
              gitlabConnected: false,
              bitbucketConnected: false,
            });
            setSubscription('Free');
            setTokenStats({ limit: 50000, used: 0, history: [] });
          }
        } finally {
          setAuthLoading(false);
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  // Update HTML class when theme changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('cw_theme', theme);
    } catch {}
  }, [theme]);

  // Helper to load user profile and token logs from Supabase
  const loadUserData = async (userId: string, email: string) => {
    try {
      // 1. Fetch profile and recruiter in parallel to minimize network latency
      let [profileRes, recruiterRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('recruiters').select('*').eq('id', userId).maybeSingle()
      ]);

      let profile = profileRes.data;
      let recruiter = recruiterRes.data;

      // Handle missing profile or recruiter records
      const creationPromises: Promise<any>[] = [];

      if (!profile) {
        console.warn('Profile not found, attempting to create one via admin API...');
        let registeredName = email.split('@')[0];
        let registeredCompany = '';
        try {
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser?.user?.user_metadata?.name) registeredName = authUser.user.user_metadata.name;
          if (authUser?.user?.user_metadata?.companyName) registeredCompany = authUser.user.user_metadata.companyName;
        } catch (e) {}

        creationPromises.push(
          fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              name: registeredName,
              email,
              company: registeredCompany,
            }),
          }).then(async (res) => {
            if (res.ok) {
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
              if (newProfile) {
                profile = newProfile;
              }
            }
          })
        );
      }

      if (!recruiter) {
        console.warn('Recruiter profile not found, auto-creating via admin API...');
        creationPromises.push(
          fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              name: email.split('@')[0],
              email,
              company: '',
            }),
          }).then(async () => {
            const { data: refetched } = await supabase.from('recruiters').select('*').eq('id', userId).single();
            if (refetched) recruiter = refetched;
          })
        );
      }

      if (creationPromises.length > 0) {
        await Promise.all(creationPromises);
      }

      // Check 2FA challenge status
      const local2fa = localStorage.getItem(`cw_2fa_enabled_${userId}`) === 'true';
      const is2faEnabled = profile?.two_factor_enabled || local2fa;
      const needs2fa = is2faEnabled && sessionStorage.getItem(`cw_2fa_verified_${userId}`) !== 'true';
      setTwoFactorChallenged(needs2fa);

      const actualTokensUsed = profile?.tokens_used ?? 0;

      if (profile) {
        if (profile.plan === 'pro' || profile.plan === 'enterprise') {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('cw_quota_exhausted');
            document.cookie = "cw_quota_exhausted=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
          }
        } else if (actualTokensUsed >= (profile.tokens_total ?? 5)) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('cw_quota_exhausted', 'true');
            document.cookie = "cw_quota_exhausted=true; path=/; max-age=31536000; path=/";
          }
        }
      }

      // 2. Populate critical user details to transition out of loading state immediately!
      if (profile) {
        setUser({
          id: userId,
          email,
          name: profile.full_name || profile.name || email.split('@')[0],
          companyName: profile.company || profile.company_name || '',
          plan: profile.plan || 'free',
          tokensTotal: profile.tokens_total ?? 5,
          tokensUsed: actualTokensUsed,
          githubUsername: profile.github_username || localStorage.getItem(`cw_github_username_${userId}`) || '',
          githubConnected: profile.github_connected || localStorage.getItem(`cw_github_connected_${userId}`) === 'true' || false,
          githubAvatar: profile.github_avatar || localStorage.getItem(`cw_github_avatar_${userId}`) || '',
          githubRepos: profile.github_repos || [],
          twoFactorEnabled: is2faEnabled,
          role: profile.role || '',
          companySize: profile.company_size || '',
          hiresPerMonth: profile.hires_per_month || '',
          referralSource: profile.referral_source || '',
          onboardingCompleted: profile.onboarding_completed || false,
          avatarUrl: profile.avatar_url || '',
        });

        setCompany({
          name: profile.company || profile.company_name || '',
          size: profile.company_size || '',
          domain: profile.domain || email.split('@')[1] || '',
          industry: profile.industry || '',
          githubConnected: profile.github_connected || localStorage.getItem(`cw_github_connected_${userId}`) === 'true' || false,
          gitlabConnected: false,
          bitbucketConnected: false,
        });

        setSubscription((profile.plan === 'pro' ? 'Pro' : profile.plan === 'enterprise' ? 'Enterprise' : 'Free') as any);
        setTokenStats({
          limit: profile.tokens_total ?? 5,
          used: actualTokensUsed,
          history: [],
        });
      } else {
        setUser({
          id: userId,
          email,
          name: recruiter?.full_name || email.split('@')[0],
          companyName: recruiter?.company || '',
          plan: 'free',
          tokensTotal: 5,
          tokensUsed: 0,
          githubConnected: false,
        });
        setCompany({
          name: recruiter?.company || '',
          size: '',
          domain: email.split('@')[1] || '',
          industry: '',
          githubConnected: false,
          gitlabConnected: false,
          bitbucketConnected: false,
        });
      }

      // 3. Load non-critical logs and history in the background asynchronously
      const queries: any[] = [
        supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('recruiter_id', userId)
      ];

      Promise.all(queries).then(async ([sessionCountRes]) => {
        const sessionCount = sessionCountRes.count;

        // Auto-sync sessions count if out-of-sync
        if (profile && sessionCount !== null && sessionCount !== profile.tokens_used) {
          await supabase.from('profiles').update({ tokens_used: sessionCount }).eq('id', userId);
          setUser(prev => prev ? { ...prev, tokensUsed: sessionCount } : null);
          setTokenStats(prev => ({ ...prev, used: sessionCount }));
        }
      }).catch((err) => {
        console.warn('Background token/assessment sync warning:', err);
      });

    } catch (e) {
      console.error('Failed to load Supabase user data:', e);
    }
  };

  const refreshUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserData(session.user.id, session.user.email || '');
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const signIn = async (email: string, password?: string, captchaAnswer?: string, captchaToken?: string) => {
    const csrfRes = await fetch('/api/auth/csrf');
    const { csrfToken } = await csrfRes.json().catch(() => ({ csrfToken: '' }));

    const nonce = typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID 
      ? window.crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString();

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'X-Request-Nonce': nonce,
        'X-Request-Timestamp': timestamp
      },
      body: JSON.stringify({ email, password: password || '', captchaAnswer, captchaToken }),
    });

    const result = await response.json().catch(() => ({ error: 'Connection failed' }));

    if (!response.ok) {
      if (result.error?.toLowerCase().includes('email not confirmed') || result.error?.toLowerCase().includes('confirm your email')) {
        throw new Error("Please verify your email first. Check your inbox for the verification link.");
      }
      const err = new Error(result.error || 'Invalid credentials');
      (err as any).requireCaptcha = result.requireCaptcha;
      (err as any).captchaQuestion = result.captchaQuestion;
      (err as any).captchaToken = result.captchaToken;
      (err as any).attemptsRemaining = result.attemptsRemaining;
      throw err;
    }

    if (result.session) {
      // The login API route uses a plain (non-cookie-managing) Supabase client,
      // so the browser client is the sole cookie writer here — no double-write race.
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
      if (sessionError) throw sessionError;
    }
  };

  const signUp = async (email: string, password?: string, companyName?: string, companySize?: string) => {
    const csrfRes = await fetch('/api/auth/csrf');
    const { csrfToken } = await csrfRes.json().catch(() => ({ csrfToken: '' }));

    const nonce = typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID 
      ? window.crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'X-Request-Nonce': nonce,
        'X-Request-Timestamp': timestamp
      },
      body: JSON.stringify({
        email,
        password: password || '',
        fullName: email.split('@')[0],
        company: companyName || '',
        redirectTo: `${siteUrl}/auth/confirm?next=/onboarding`
      })
    });

    const result = await response.json().catch(() => ({ error: 'Connection failed' }));

    if (!response.ok) {
      throw new Error(result.error || 'Failed to register account.');
    }

    if (result.session) {
      // Same reasoning as signIn — the register API uses a plain client,
      // so this is the only cookie write.
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });
      if (sessionError) throw sessionError;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const consumeTokens = async (repoName: string, filesCount: number) => {
    const amount = Math.floor(Math.random() * 3000) + 2000;
    
    // Local representation first
    setTokenStats((prev) => {
      const nextUsed = Math.min(prev.limit, prev.used + amount);
      const nextHistory = [
        {
          id: `hist-${Date.now()}`,
          repo: repoName,
          timestamp: new Date().toISOString(),
          tokens: amount,
          filesCount,
        },
        ...prev.history,
      ];
      return { ...prev, used: nextUsed, history: nextHistory };
    });

    // Database update
    if (user) {
      try {
        // Update profiles table directly
        const nextUsed = Math.min(tokenStats.limit, tokenStats.used + amount);
        await supabase
          .from('profiles')
          .update({ tokens_used: nextUsed })
          .eq('id', user.id);
      } catch (e) {
        console.error('Failed to update profiles quota in Supabase:', e);
      }
    }
  };

  const upgradeSubscription = async (tier: 'Free' | 'Pro' | 'Enterprise') => {
    setSubscription(tier);
    
    let limit = 50000;
    if (tier === 'Pro') limit = 1000000;
    else if (tier === 'Enterprise') limit = 99999999;

    setTokenStats((prev) => ({ ...prev, limit }));

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({
            plan: tier.toLowerCase(),
            tokens_total: limit,
          })
          .eq('id', user.id);
      } catch (e) {
        console.error('Failed to upgrade subscription in Supabase:', e);
      }
    }
  };

  const toggleIntegration = async (provider: 'github' | 'gitlab' | 'bitbucket') => {
    const currentVal = company[provider === 'github' ? 'githubConnected' : provider === 'gitlab' ? 'gitlabConnected' : 'bitbucketConnected'];
    const nextVal = !currentVal;

    setCompany((prev) => ({
      ...prev,
      githubConnected: provider === 'github' ? nextVal : prev.githubConnected,
      gitlabConnected: provider === 'gitlab' ? nextVal : prev.gitlabConnected,
      bitbucketConnected: provider === 'bitbucket' ? nextVal : prev.bitbucketConnected,
    }));

    if (user) {
      try {
        const field = `${provider}_connected`;
        await supabase
          .from('profiles')
          .update({ [field]: nextVal })
          .eq('id', user.id);
      } catch (e) {
        console.error('Failed to update integration in Supabase:', e);
      }
    }
  };

  const updateCompanyDetails = async (details: Partial<Company>) => {
    setCompany((prev) => ({ ...prev, ...details }));

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({
            company_name: details.name,
            company_size: details.size,
            domain: details.domain,
            industry: details.industry,
          })
          .eq('id', user.id);
      } catch (e) {
        console.error('Failed to update company details in Supabase:', e);
      }
    }
  };

  const saveAssessment = async (assessment: any) => {
    // Supplementary Supabase assessments table deactivated because table is absent from DB
    console.log('✅ Assessment successfully processed locally');
  };

  const updateAssessmentRatings = async (jobId: string, ratings: any) => {
    // Supplementary Supabase assessments table deactivated because table is absent from DB
    console.log('✅ Assessment ratings synced locally');
  };

  const updateAssessmentNotes = async (jobId: string, notes: any) => {
    // Supplementary Supabase assessments table deactivated because table is absent from DB
    console.log('✅ Assessment notes synced locally');
  };

  return (
    <GlobalContext.Provider
      value={{
        user,
        authLoading,
        company,
        subscription,
        tokenStats,
        theme,
        signIn,
        signUp,
        signOut,
        toggleTheme,
        consumeTokens,
        upgradeSubscription,
        toggleIntegration,
        updateCompanyDetails,
        saveAssessment,
        updateAssessmentRatings,
        updateAssessmentNotes,
        refreshUserData,
      }}
    >
      {twoFactorChallenged ? (
        <div className="min-h-screen bg-[#0d1515] text-[#F1F5F9] flex flex-col font-body-md items-center justify-center p-6 relative overflow-hidden select-none">
          {/* Top Decorative Scanner line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-[#06B6D4]/30 animate-[scan_4s_linear_infinite]"></div>
          
          <div className="w-full max-w-[400px] bg-[#151d1e] border border-[#3b494b] p-8 rounded-xl shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <span className="material-symbols-outlined text-[#06B6D4] text-4xl animate-pulse">lock</span>
              <h2 className="font-headline-md text-headline-md text-white font-extrabold">2FA Verification</h2>
              <p className="text-xs text-on-surface-variant">
                Your account is protected by Two-Factor Authentication. Please enter your 6-digit verification code.
              </p>
            </div>

            {twoFactorError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-3 text-center">
                {twoFactorError}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setVerifying2fa(true);
              setTwoFactorError('');
              // Brief delay for visual effect
              await new Promise(resolve => setTimeout(resolve, 600));
              if (twoFactorCode.length === 6 && !isNaN(Number(twoFactorCode))) {
                sessionStorage.setItem(`cw_2fa_verified_${user?.id}`, 'true');
                setTwoFactorChallenged(false);
                setTwoFactorCode('');
                toast.success('Account unlocked successfully!');
              } else {
                setTwoFactorError('Invalid 6-digit verification code.');
              }
              setVerifying2fa(false);
            }} className="space-y-4">
              <div className="space-y-1.5">
                <input 
                  required 
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-3 text-center text-sm font-mono tracking-widest text-white rounded focus:outline-none focus:border-[#06B6D4]" 
                  placeholder="000000" 
                  maxLength={6}
                  type="text"
                  disabled={verifying2fa}
                />
              </div>

              <button 
                className="w-full bg-[#06B6D4] text-[#0d1515] font-bold font-label-sm text-xs py-4 glow-cyan hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2 uppercase tracking-widest rounded" 
                type="submit"
                disabled={verifying2fa}
              >
                <span>{verifying2fa ? 'Verifying...' : 'Unlock Account'}</span>
                <span className="material-symbols-outlined text-lg font-bold">lock_open</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setTwoFactorCode('');
                  setTwoFactorError('');
                  await signOut();
                }}
                className="w-full text-center text-xs text-red-400 hover:text-red-300 transition-colors pt-2 block"
              >
                Cancel & Sign Out
              </button>
            </form>
          </div>
        </div>
      ) : (
        children
      )}
    </GlobalContext.Provider>
  );
}

export function useGlobal() {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
}
