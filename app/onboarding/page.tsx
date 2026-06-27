'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUserData } = useGlobal();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Step 1 Form States
  const [role, setRole] = useState('HR / Recruiter');
  const [companySize, setCompanySize] = useState('11 to 50');

  // Step 2 Form States
  const [hiresPerMonth, setHiresPerMonth] = useState('1 to 5');
  const [referralSource, setReferralSource] = useState('LinkedIn');

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first.');
        router.replace('/login');
        return;
      }

      // Check if onboarding is already completed
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (!error && profile?.onboarding_completed) {
          router.replace('/dashboard');
        } else {
          setCheckingStatus(false);
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
        setCheckingStatus(false);
      }
    };

    checkUser();
  }, [router]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role,
          company_size: companySize,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile details saved!');
      setStep(2);
    } catch (err: any) {
      toast.error(`Error saving details: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          hires_per_month: hiresPerMonth,
          referral_source: referralSource,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUserData();
      toast.success('Onboarding completed successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(`Error saving details: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUserData();
      toast.success('Skipped onboarding for now.');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(`Error skipping onboarding: ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#06B6D4]"></div>
        <p className="text-sm text-[#94A3B8] mt-4 select-none">Initializing setup...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F172A] text-white min-h-screen flex flex-col font-body-md relative overflow-hidden select-none">
      {/* Top Header Logo */}
      <header className="w-full flex justify-center py-8 z-10">
        <Link href="/" className="flex items-center gap-2 group transition-all duration-300">
          <span className="material-symbols-outlined text-[#06B6D4] text-4xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">terminal</span>
          <span className="font-headline-md text-headline-md font-bold text-[#06B6D4] tracking-tight group-hover:text-[#06B6D4]/80 transition-all duration-300">CodeWalk</span>
        </Link>
      </header>

      {/* Onboarding Panel Card */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[440px] bg-[#1E293B] border border-slate-700/60 p-8 rounded-xl shadow-2xl relative overflow-hidden">
          {/* Top Decorative Scanner line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-[#06B6D4]/30 animate-[scan_4s_linear_infinite]"></div>

          {/* Progress Bar Header */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-xs text-[#94A3B8] font-bold uppercase tracking-wider">
              <span>Setup Progress</span>
              <span>Step {step} of 2</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#06B6D4] to-cyan-400 transition-all duration-500 ease-out" 
                style={{ width: `${step === 1 ? 50 : 100}%` }}
              ></div>
            </div>
          </div>

          {step === 1 ? (
            /* STEP 1 FORM */
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">Complete Your Profile</h2>
                <p className="text-xs text-[#94A3B8]">Tell us a bit about your role and company size.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Your Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#06B6D4] cursor-pointer"
                    disabled={loading}
                  >
                    <option value="HR / Recruiter">HR / Recruiter</option>
                    <option value="Engineering Manager">Engineering Manager</option>
                    <option value="Founder / CTO">Founder / CTO</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Company Size</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#06B6D4] cursor-pointer"
                    disabled={loading}
                  >
                    <option value="Just me">Just me</option>
                    <option value="2 to 10">2 to 10</option>
                    <option value="11 to 50">11 to 50</option>
                    <option value="51 to 200">51 to 200</option>
                    <option value="200 plus">200 plus</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0F172A] font-bold text-xs uppercase tracking-wider rounded transition-all active:scale-[0.98] shadow-lg shadow-[#06B6D4]/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-[#0F172A]"></div>
                  ) : (
                    <>
                      <span>Continue</span>
                      <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={loading}
                  className="w-full text-center text-xs text-[#94A3B8] hover:text-white transition-colors cursor-pointer block font-semibold"
                >
                  Skip for now
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2 FORM */
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-white">One Last Thing</h2>
                <p className="text-xs text-[#94A3B8]">Help us tailor the CodeWalk screening experience to your hiring needs.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Technical Hires Per Month</label>
                  <select
                    value={hiresPerMonth}
                    onChange={(e) => setHiresPerMonth(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#06B6D4] cursor-pointer"
                    disabled={loading}
                  >
                    <option value="1 to 5">1 to 5</option>
                    <option value="6 to 20">6 to 20</option>
                    <option value="20 plus">20 plus</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">How Did You Hear About CodeWalk? <span className="text-[#94A3B8]/60 font-normal italic">(Optional)</span></label>
                  <select
                    value={referralSource}
                    onChange={(e) => setReferralSource(e.target.value)}
                    className="w-full bg-[#0F172A] border border-slate-700 rounded px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#06B6D4] cursor-pointer"
                    disabled={loading}
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Google Search">Google Search</option>
                    <option value="Friend or Colleague">Friend or Colleague</option>
                    <option value="GitHub">GitHub</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0F172A] font-bold text-xs uppercase tracking-wider rounded transition-all active:scale-[0.98] shadow-lg shadow-[#06B6D4]/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-[#0F172A]"></div>
                  ) : (
                    <>
                      <span>Go to Dashboard</span>
                      <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={loading}
                  className="w-full text-center text-xs text-[#94A3B8] hover:text-white transition-colors cursor-pointer block font-semibold"
                >
                  Skip for now
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
