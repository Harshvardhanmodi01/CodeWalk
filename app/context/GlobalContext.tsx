'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  companyName: string;
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
  company: Company;
  subscription: 'Free' | 'Pro' | 'Enterprise';
  tokenStats: TokenStats;
  theme: 'light' | 'dark';
  signIn: (email: string, password?: string) => Promise<void>;
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
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // User state
  const [user, setUser] = useState<User | null>(null);

  // Company state
  const [company, setCompany] = useState<Company>({
    name: 'Acme Corp',
    size: '10-50 employees',
    domain: 'acme.com',
    industry: 'Technology',
    githubConnected: true,
    gitlabConnected: false,
    bitbucketConnected: false,
  });

  // Subscription state
  const [subscription, setSubscription] = useState<'Free' | 'Pro' | 'Enterprise'>('Free');

  // Token usage state
  const [tokenStats, setTokenStats] = useState<TokenStats>({
    limit: 50000,
    used: 12500,
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
        const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const preferredTheme = darkMediaQuery.matches ? 'dark' : 'light';
        setTheme(preferredTheme);
        document.documentElement.classList.toggle('dark', preferredTheme === 'dark');
      }
    } catch {}

    // Initialize Supabase Auth Session
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await loadUserData(session.user.id, session.user.email || '');
      }
    };

    initAuth();

    // Listen for Auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          await loadUserData(session.user.id, session.user.email || '');
        } else {
          // Reset states on logout
          setUser(null);
          setCompany({
            name: 'Acme Corp',
            size: '10-50 employees',
            domain: 'acme.com',
            industry: 'Technology',
            githubConnected: true,
            gitlabConnected: false,
            bitbucketConnected: false,
          });
          setSubscription('Free');
          setTokenStats({ limit: 50000, used: 12500, history: [] });
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
      // 1. Fetch profile from public.profiles
      let { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr && profileErr.code === 'PGRST116') {
        console.warn('Profile not found, attempting to create one...');
        
        // Auto-create profile if missing (e.g. if signup was done before database triggers were set up)
        const defaultProfile = {
          id: userId,
          name: email.split('@')[0],
          email: email,
          company_name: 'Acme Corp',
          company_size: '1-10 employees',
          domain: email.split('@')[1] || 'acme.com',
          industry: 'Technology',
          subscription: 'Free',
          token_limit: 50000,
          token_used: 12500,
          github_connected: true,
          gitlab_connected: false,
          bitbucket_connected: false,
        };

        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert(defaultProfile)
          .select()
          .single();

        if (!insertErr && newProfile) {
          profile = newProfile;
        } else {
          console.error('Failed to auto-create missing profile:', insertErr);
        }
      }

      if (profile) {
        setUser({
          id: userId,
          email,
          name: profile.name || email.split('@')[0],
          companyName: profile.company_name || 'Acme Corp',
        });

        setCompany({
          name: profile.company_name || 'Acme Corp',
          size: profile.company_size || '10-50 employees',
          domain: profile.domain || email.split('@')[1] || 'acme.com',
          industry: profile.industry || 'Technology',
          githubConnected: profile.github_connected ?? true,
          gitlabConnected: profile.gitlab_connected ?? false,
          bitbucketConnected: profile.bitbucket_connected ?? false,
        });

        setSubscription((profile.subscription as any) || 'Free');

        // Load token stats
        setTokenStats((prev) => ({
          ...prev,
          limit: profile.token_limit ?? 50000,
          used: profile.token_used ?? 0,
        }));
      } else {
        // Fallback profile representation
        setUser({
          id: userId,
          email,
          name: email.split('@')[0],
          companyName: 'Acme Corp',
        });
      }

      // 2. Fetch token history
      const { data: history } = await supabase
        .from('token_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (history) {
        setTokenStats((prev) => ({
          ...prev,
          history: history.map((h) => ({
            id: h.id,
            repo: h.repo,
            timestamp: h.created_at,
            tokens: h.tokens,
            filesCount: h.files_count,
          })),
        }));
      }

      // 3. Fetch assessments from Supabase
      try {
        const { data: dbAssessments, error: assessErr } = await supabase
          .from('assessments')
          .select('*')
          .eq('user_id', userId);

        if (!assessErr && dbAssessments && dbAssessments.length > 0) {
          const localStored = localStorage.getItem('cw_analyses');
          const localList = localStored ? JSON.parse(localStored) : [];
          
          const mergedList = [...localList];
          dbAssessments.forEach((dbItem: any) => {
            const matchedIdx = mergedList.findIndex((item: any) => item.jobId === dbItem.id);
            const mapped = {
              jobId: dbItem.id,
              repo: dbItem.repo,
              candidateName: dbItem.candidate_name,
              status: dbItem.status,
              createdAt: new Date(dbItem.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              }),
              questionsCount: dbItem.questions_count,
              score: dbItem.score,
              model: dbItem.model,
              apiResult: dbItem.api_result
            };

            if (matchedIdx !== -1) {
              mergedList[matchedIdx] = {
                ...mergedList[matchedIdx],
                ...mapped
              };
            } else {
              mergedList.unshift(mapped);
            }

            // Sync ratings & notes from Supabase item into localStorage keys
            if (dbItem.ratings) {
              localStorage.setItem(`ratings_${dbItem.id}`, JSON.stringify(dbItem.ratings));
            }
            if (dbItem.notes) {
              Object.entries(dbItem.notes).forEach(([qId, noteText]) => {
                localStorage.setItem(`notes_${dbItem.id}_${qId}`, noteText as string);
              });
            }
          });

          localStorage.setItem('cw_analyses', JSON.stringify(mergedList));
        }
      } catch (err) {
        console.warn('Assessments table sync skipped or failed:', err);
      }
    } catch (e) {
      console.error('Failed to load Supabase user data:', e);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const signIn = async (email: string, password?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: password || '',
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password?: string, companyName?: string, companySize?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: password || '',
      options: {
        data: {
          name: email.split('@')[0],
          companyName: companyName || 'Acme Corp',
          companySize: companySize || '1-10 employees',
        },
      },
    });
    if (error) throw error;
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
        // 1. Insert into token_history
        await supabase.from('token_history').insert({
          user_id: user.id,
          repo: repoName,
          files_count: filesCount,
          tokens: amount,
        });

        // 2. Update profiles table
        const nextUsed = Math.min(tokenStats.limit, tokenStats.used + amount);
        await supabase
          .from('profiles')
          .update({ token_used: nextUsed })
          .eq('id', user.id);
      } catch (e) {
        console.error('Failed to log token usage to Supabase:', e);
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
            subscription: tier,
            token_limit: limit,
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
    if (user) {
      try {
        const { error } = await supabase.from('assessments').upsert({
          id: assessment.jobId,
          user_id: user.id,
          repo: assessment.repo,
          candidate_name: assessment.candidateName,
          status: assessment.status,
          questions_count: assessment.questionsCount,
          score: assessment.score,
          model: assessment.model,
          api_result: assessment.apiResult,
          created_at: new Date().toISOString()
        });
        if (error) throw error;
        console.log('✅ Assessment successfully saved to Supabase');
      } catch (err) {
        console.error('⚠️ Failed to save assessment to Supabase:', err);
      }
    }
  };

  const updateAssessmentRatings = async (jobId: string, ratings: any) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('assessments')
          .update({ ratings })
          .eq('id', jobId);
        if (error) throw error;
        console.log('✅ Assessment ratings synced to Supabase');
      } catch (err) {
        console.error('⚠️ Failed to sync ratings to Supabase:', err);
      }
    }
  };

  const updateAssessmentNotes = async (jobId: string, notes: any) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('assessments')
          .update({ notes })
          .eq('id', jobId);
        if (error) throw error;
        console.log('✅ Assessment notes synced to Supabase');
      } catch (err) {
        console.error('⚠️ Failed to sync notes to Supabase:', err);
      }
    }
  };

  return (
    <GlobalContext.Provider
      value={{
        user,
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
      }}
    >
      {children}
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
