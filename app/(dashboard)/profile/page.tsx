'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('Alex Chen');
  const [isEditing, setIsEditing] = useState(false);
  const [analysesCount, setAnalysesCount] = useState(3);

  useEffect(() => {
    const q = localStorage.getItem('cw_quota_analyses');
    if (q) setAnalysesCount(parseInt(q));
  }, []);

  const handleNameSave = () => {
    setIsEditing(false);
    // Persist name if needed, else local state update is fine
  };

  const handleDeleteAccount = () => {
    if (confirm('CAUTION: Deleting your account is permanent. All history and generated scorecards will be wiped. Proceed?')) {
      localStorage.clear();
      router.push('/');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Password updated successfully!');
  };

  return (
    <div className="flex-grow flex flex-col bg-surface overflow-hidden min-h-screen">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-3 bg-surface-container-low w-full border-b border-outline-variant z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed text-xl">settings</span>
          <h1 className="font-headline-md text-lg text-primary-fixed font-bold tracking-tight">Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:text-primary-fixed transition-colors active:scale-95">
            <span className="material-symbols-outlined text-lg">share</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary-fixed transition-colors active:scale-95">
            <span className="material-symbols-outlined text-lg">download</span>
          </button>
        </div>
      </header>

      {/* Profile Settings Contents */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          
          {/* Header Details Card */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-outline-variant/30 select-none">
            <div className="flex items-center gap-6">
              <div className="relative">
                <img 
                  className="w-24 h-24 rounded border border-outline-variant p-1 object-cover" 
                  alt="Alex Profile"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXxCTO6xP8J12evgfDxdwQ5c5oj3zVRDNYdWJ5OBW5lyI0M3_z_bqW8vxUKtKSgv2dcgE6l2uWJIy9T-iHHnR_ugjxojc-8crvVHDDI-H6Ot7VqdbZOwYsTYu6jOnjm4WiDwMYli3Buel5mPwGPQt9yIwARCfitwjYRgu22ONf1r3InOI7XpZcvlEbozj6ochoL8zi5T7_67rrK0hJsk8o0s2fq3YYYmMCuW8HBW-HT1sMZ9gm7E3Htnx6XUKKvyNnRHXp6yWL9pQ"
                />
                <button className="absolute -bottom-1 -right-1 bg-surface-container-highest border border-outline-variant p-1 rounded text-primary-fixed hover:bg-primary-fixed hover:text-on-primary transition-all active:scale-95">
                  <span className="material-symbols-outlined text-xs font-bold">edit</span>
                </button>
              </div>

              <div className="space-y-1">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      className="bg-surface-container-lowest border border-primary-fixed p-1 rounded font-headline-lg text-lg text-on-surface outline-none"
                    />
                    <button 
                      onClick={handleNameSave}
                      className="bg-primary-fixed text-on-primary px-3 py-1 text-xs font-bold font-label-sm uppercase rounded"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h2 className="font-headline-lg text-2xl text-on-surface font-extrabold tracking-tight">{name}</h2>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-primary-fixed transition-opacity p-0.5"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                  </div>
                )}
                
                <p className="font-body-md text-sm text-on-surface-variant">alex.chen@devmail.io</p>
                
                <div className="inline-flex items-center gap-2 bg-surface-container-highest px-3 py-1 rounded border border-outline-variant">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed glow-cyan"></span>
                  <span className="font-label-sm text-[10px] text-primary-fixed font-bold uppercase tracking-wider">Free Plan</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => router.push('/pricing')}
              className="bg-primary-fixed text-on-primary-fixed font-bold font-label-sm text-xs px-6 py-2.5 rounded glow-cyan hover:opacity-90 transition-all active:scale-95"
            >
              Upgrade to Pro
            </button>
          </section>

          {/* Quota & Lifetime statistics panel */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
            
            {/* Monthly Cap usage */}
            <div className="border border-outline-variant bg-surface-container-low p-6 rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary-fixed"></div>
              <div className="flex flex-col h-full justify-between">
                <div>
                  <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">Quota Usage</p>
                  <h3 className="font-headline-md text-base text-on-surface font-bold">Analyses this month</h3>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-headline-lg text-3xl font-extrabold text-primary-fixed">
                      {analysesCount}<span className="text-on-surface-variant font-light text-xl">/5</span>
                    </span>
                    <span className="font-code-sm text-xs text-on-surface-variant font-mono">
                      {Math.max(0, 100 - (analysesCount * 20))}% Remaining
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-fixed transition-all duration-500" 
                      style={{ width: `${(analysesCount / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total usage */}
            <div className="border border-outline-variant bg-surface-container-low p-6 rounded-lg relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
              <div className="flex flex-col h-full justify-between">
                <div>
                  <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">Lifetime Impact</p>
                  <h3 className="font-headline-md text-base text-on-surface font-bold">Total analyses</h3>
                </div>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-headline-lg text-3xl font-extrabold text-secondary">12</span>
                  <span className="font-code-sm text-xs text-on-surface-variant font-mono">sessions completed</span>
                </div>
                <div className="flex gap-1 mt-3">
                  <div className="h-1 flex-grow bg-secondary/20"></div>
                  <div className="h-1 flex-grow bg-secondary/40"></div>
                  <div className="h-1 flex-grow bg-secondary/60"></div>
                  <div className="h-1 flex-grow bg-secondary/80"></div>
                  <div className="h-1 flex-grow bg-secondary"></div>
                </div>
              </div>
            </div>

          </section>

          {/* Form blocks configurations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Password input block */}
            <section className="lg:col-span-2 space-y-6">
              <div className="border border-outline-variant bg-surface-container-low p-6 rounded-lg shadow-sm">
                <h4 className="font-headline-md text-base text-on-surface font-bold mb-6 flex items-center gap-2 select-none">
                  <span className="material-symbols-outlined text-primary-fixed">key</span>
                  Change Password
                </h4>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="font-label-sm text-[10px] text-on-surface-variant px-1 font-bold uppercase tracking-wider">Current Password</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed/50 font-code-md text-code-md font-mono select-none">$</span>
                      <input 
                        required
                        className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all rounded pl-8 text-on-surface font-code-md text-code-md placeholder:text-on-surface-variant/30 py-2.5 font-mono text-sm" 
                        placeholder="••••••••" 
                        type="password"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-label-sm text-[10px] text-on-surface-variant px-1 font-bold uppercase tracking-wider">New Password</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed/50 font-code-md text-code-md font-mono select-none">&gt;</span>
                        <input 
                          required
                          className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all rounded pl-8 text-on-surface font-code-md text-code-md placeholder:text-on-surface-variant/30 py-2.5 font-mono text-sm" 
                          placeholder="New Secret" 
                          type="password"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-label-sm text-[10px] text-on-surface-variant px-1 font-bold uppercase tracking-wider">Confirm New Password</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-fixed/50 font-code-md text-code-md font-mono select-none">&gt;</span>
                        <input 
                          required
                          className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all rounded pl-8 text-on-surface font-code-md text-code-md placeholder:text-on-surface-variant/30 py-2.5 font-mono text-sm" 
                          placeholder="Confirm" 
                          type="password"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button 
                      className="bg-surface-container-highest border border-outline-variant text-on-surface font-label-sm text-xs px-6 py-2.5 rounded hover:border-primary-fixed hover:text-primary-fixed transition-all select-none font-bold uppercase tracking-wider" 
                      type="submit"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Danger Zone */}
              <div className="border border-error/30 bg-error/5 p-6 rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                  <div className="space-y-2 select-none">
                    <h4 className="font-headline-md text-base text-error font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined">warning</span>
                      Danger Zone
                    </h4>
                    <p className="text-on-surface-variant/80 text-xs leading-relaxed max-w-md">
                      Deleting your account is permanent. All assessment history, rating index scorecards, and token analytics logs will be wiped from our secure servers.
                    </p>
                  </div>
                  <button 
                    onClick={handleDeleteAccount}
                    className="bg-transparent border border-error text-error font-label-sm text-xs font-bold uppercase tracking-widest px-6 py-3 rounded hover:bg-error hover:text-surface-container-lowest transition-all active:scale-95 whitespace-nowrap shrink-0"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </section>

            {/* Right details sidebar section */}
            <section className="space-y-6 select-none text-xs">
              <div className="border border-outline-variant bg-surface-container-low p-6 rounded-lg shadow-sm">
                <h5 className="font-label-sm text-[10px] text-primary-fixed uppercase tracking-widest font-bold mb-4">
                  Account Integrity
                </h5>
                <ul className="space-y-4">
                  <li className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-bold">2FA MFA Security</span>
                    <span className="text-error font-bold flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-sm font-bold">lock_open</span>
                      DISABLED
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-bold">Git Integration</span>
                    <span className="text-primary-fixed font-bold flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                      GITHUB
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-bold">Region Node</span>
                    <span className="text-on-surface font-semibold font-mono">us-east-1</span>
                  </li>
                </ul>
                <button className="w-full mt-6 py-2.5 border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-outline transition-all rounded text-xs font-bold uppercase tracking-wider">
                  Security Audit Log
                </button>
              </div>

              <div className="border border-dashed border-primary-fixed/20 bg-surface-container-lowest p-6 rounded-lg">
                <h5 className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-4">
                  Pro Benefits
                </h5>
                <ul className="space-y-3 text-on-surface-variant">
                  <li className="flex gap-3 items-center">
                    <span className="material-symbols-outlined text-primary-fixed text-sm font-bold">verified</span>
                    <span>50 analyses / month</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <span className="material-symbols-outlined text-primary-fixed text-sm font-bold">verified</span>
                    <span>Priority Queue Processing</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <span className="material-symbols-outlined text-primary-fixed text-sm font-bold">verified</span>
                    <span>Full scorecard shares</span>
                  </li>
                </ul>
              </div>
            </section>
            
          </div>
        </div>
      </div>
    </div>
  );
}
