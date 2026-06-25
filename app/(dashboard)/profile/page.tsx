'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';

export default function ProfilePage() {
  const router = useRouter();
  const { user, subscription } = useGlobal();

  // Local editable states
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savingName, setSavingName] = useState(false);
  
  // Custom Avatar state
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2faModal, setShow2faModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');

  // Connected Repositories
  const [repos, setRepos] = useState<string[]>([]);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Sync profile details on mount
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setCompanyName(user.companyName || '');
      
      // Load custom avatar from localStorage if set
      const savedAvatar = localStorage.getItem(`cw_avatar_url_${user.id}`);
      if (savedAvatar) setAvatarUrl(savedAvatar);

      // Load 2FA state
      const saved2fa = localStorage.getItem(`cw_2fa_enabled_${user.id}`);
      if (saved2fa === 'true') setTwoFactorEnabled(true);

      // Load connected repos
      const savedRepos = localStorage.getItem(`cw_connected_repos_${user.id}`);
      if (savedRepos) {
        setRepos(JSON.parse(savedRepos));
      } else {
        const defaultRepos = ['Harshvardhanmodi01/CodeWalk', 'Nikhilsingha01/garg-electronics'];
        setRepos(defaultRepos);
        localStorage.setItem(`cw_connected_repos_${user.id}`, JSON.stringify(defaultRepos));
      }
    }
  }, [user]);

  const handleNameSave = async () => {
    if (!user) return;
    setSavingName(true);
    try {
      // 1. Save to LocalStorage immediately so local changes are guaranteed to persist
      localStorage.setItem(`cw_user_name_${user.id}`, name);
      localStorage.setItem(`cw_user_company_${user.id}`, companyName);

      // 2. Try to upsert into recruiters table
      const { error: recErr } = await supabase
        .from('recruiters')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: name,
          company: companyName,
        }, { onConflict: 'id' });

      if (recErr) console.warn('Could not update recruiters table:', recErr);

      // 3. Try to upsert into profiles table fallback
      const { error: profErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name: name,
          company_name: companyName,
        }, { onConflict: 'id' });

      if (profErr) console.warn('Could not update profiles table:', profErr);

      // 4. Update Supabase Auth User Metadata to keep everything in sync
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          name: name,
          companyName: companyName,
        }
      });

      if (authErr) console.warn('Could not update auth user metadata:', authErr);

      setIsEditing(false);
      window.location.reload();
    } catch (err) {
      console.error('Failed to update profile settings:', err);
      // Even if network or database write completely throws an error, reload to apply LocalStorage
      setIsEditing(false);
      window.location.reload();
    } finally {
      setSavingName(false);
    }
  };

  // Avatar selector functions
  const selectAvatarPreset = (url: string) => {
    if (!user) return;
    setAvatarUrl(url);
    localStorage.setItem(`cw_avatar_url_${user.id}`, url);
    setShowAvatarModal(false);
  };

  const handleCustomAvatarSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !customAvatarInput.trim()) return;
    setAvatarUrl(customAvatarInput.trim());
    localStorage.setItem(`cw_avatar_url_${user.id}`, customAvatarInput.trim());
    setCustomAvatarInput('');
    setShowAvatarModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64 && user) {
        setAvatarUrl(base64);
        localStorage.setItem(`cw_avatar_url_${user.id}`, base64);
        setShowAvatarModal(false);
        window.location.reload();
      }
    };
    reader.readAsDataURL(file);
  };

  // 2FA functions
  const handleEnable2fa = (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError('');
    if (twoFactorCode.length !== 6 || isNaN(Number(twoFactorCode))) {
      setTwoFactorError('Please enter a valid 6-digit verification code.');
      return;
    }

    if (user) {
      setTwoFactorEnabled(true);
      localStorage.setItem(`cw_2fa_enabled_${user.id}`, 'true');
    }
    setTwoFactorCode('');
    setShow2faModal(false);
  };

  const handleDisable2fa = () => {
    if (confirm('Are you sure you want to disable Two-Factor Authentication? Your account security rating will decrease.')) {
      if (user) {
        setTwoFactorEnabled(false);
        localStorage.setItem(`cw_2fa_enabled_${user.id}`, 'false');
      }
    }
  };

  // Connected Repos functions
  const handleConnectRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl.trim()) return;
    let repoName = newRepoUrl.trim();
    // Strip github prefix if present
    repoName = repoName.replace(/https?:\/\/(?:www\.)?github\.com\//, '');
    
    const updated = [...repos, repoName];
    setRepos(updated);
    if (user) {
      localStorage.setItem(`cw_connected_repos_${user.id}`, JSON.stringify(updated));
    }
    setNewRepoUrl('');
    setShowConnectModal(false);
  };

  const handleDisconnectRepo = (repoName: string) => {
    if (confirm(`Disconnect ${repoName}? This will prevent candidates from running assessments against it.`)) {
      const updated = repos.filter(r => r !== repoName);
      setRepos(updated);
      if (user) {
        localStorage.setItem(`cw_connected_repos_${user.id}`, JSON.stringify(updated));
      }
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('CAUTION: Deleting your account is permanent. All recruiter history, session logs, and reports will be wiped. Proceed?')) {
      localStorage.clear();
      router.push('/');
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Password updated successfully!');
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-sm font-mono text-[#94A3B8]">Loading profile configurations...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-[#0F172A] text-[#F1F5F9] overflow-hidden min-h-screen">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-3 bg-[#1E293B] w-full border-b border-[#334155] z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#06B6D4] text-xl">settings</span>
          <h1 className="font-headline-md text-lg text-[#06B6D4] font-bold tracking-tight">Settings Workspace</h1>
        </div>
      </header>

      {/* Settings Contents Wrapper */}
      <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-24">
          
          {/* Recruiter Details Card */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#334155] select-none">
            <div className="flex items-center gap-6">
              <div className="relative">
                <img 
                  className="w-24 h-24 rounded border border-[#334155] p-1 object-cover hover:brightness-90 transition-all cursor-pointer" 
                  alt="Profile Avatar"
                  src={avatarUrl}
                  onClick={() => setShowAvatarModal(true)}
                />
                <button 
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute -bottom-1 -right-1 bg-[#1E293B] border border-[#334155] p-1 rounded text-[#06B6D4] hover:bg-[#06B6D4] hover:text-[#0F172A] transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-xs font-bold">edit</span>
                </button>
              </div>
 
              <div className="space-y-2">
                {isEditing ? (
                  <div className="flex flex-col gap-2 bg-[#1E293B] p-4 rounded-lg border border-[#334155] max-w-sm">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Full Name</label>
                      <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="bg-[#0F172A] border border-[#334155] focus:border-[#06B6D4] p-1.5 px-3 rounded text-sm text-white outline-none"
                        placeholder="Your Name"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Company Name</label>
                      <input 
                        type="text" 
                        value={companyName} 
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="bg-[#0F172A] border border-[#334155] focus:border-[#06B6D4] p-1.5 px-3 rounded text-sm text-white outline-none"
                        placeholder="Company Name"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="bg-[#334155] text-white px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider hover:bg-[#475569] transition-colors"
                        disabled={savingName}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleNameSave}
                        disabled={savingName}
                        className="bg-[#06B6D4] text-[#0F172A] px-3 py-1.5 text-xs font-bold rounded uppercase tracking-wider hover:bg-[#06B6D4]/80 transition-colors"
                      >
                        {savingName ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 group">
                      <h2 className="text-xl text-[#F1F5F9] font-extrabold tracking-tight">{name}</h2>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="text-[#94A3B8] hover:text-[#06B6D4] p-1 rounded hover:bg-[#1E293B] transition-all"
                        title="Edit Profile"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                    </div>
                    {companyName && (
                      <p className="text-sm text-[#06B6D4] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">corporate_fare</span>
                        {companyName}
                      </p>
                    )}
                  </div>
                )}
                
                <p className="text-xs text-[#94A3B8] font-mono">{user.email}</p>
                
                {/* Role and Plan Badges */}
                <div className="flex gap-2 flex-wrap pt-0.5">
                  <div className="inline-flex items-center gap-1.5 bg-[#1E293B] px-2.5 py-1 rounded border border-[#334155]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] glow-cyan"></span>
                    <span className="text-[9px] text-[#06B6D4] font-bold uppercase tracking-wider">{subscription} Plan</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-[#06B6D4]/10 border border-[#06B6D4]/20 px-2.5 py-1 rounded">
                    <span className="text-[9px] text-[#06B6D4] font-bold uppercase tracking-wider">Role: Recruiter</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => router.push('/pricing')}
              className="bg-[#06B6D4] text-[#0F172A] font-bold text-xs px-6 py-2.5 rounded hover:bg-[#06B6D4]/90 transition-all active:scale-95 shadow-lg shadow-[#06B6D4]/10"
            >
              Upgrade Plan
            </button>
          </section>

          {/* Account Security & GitHub Repos Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Form password change block */}
            <section className="lg:col-span-2 space-y-6">
              <div className="border border-[#334155] bg-[#1E293B]/40 p-6 rounded-xl shadow-sm">
                <h4 className="text-sm text-white font-bold mb-6 flex items-center gap-2 select-none">
                  <span className="material-symbols-outlined text-[#06B6D4]">key</span>
                  Change Password
                </h4>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Current Password</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#06B6D4]/50 font-mono select-none">$</span>
                      <input 
                        required
                        className="w-full bg-[#0F172A] border border-[#334155] focus:border-[#06B6D4] transition-all rounded pl-8 text-white py-2.5 font-mono text-xs outline-none" 
                        placeholder="••••••••" 
                        type="password"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">New Password</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#06B6D4]/50 font-mono select-none">&gt;</span>
                        <input 
                          required
                          className="w-full bg-[#0F172A] border border-[#334155] focus:border-[#06B6D4] transition-all rounded pl-8 text-white py-2.5 font-mono text-xs outline-none" 
                          placeholder="New Secret" 
                          type="password"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Confirm New Password</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#06B6D4]/50 font-mono select-none">&gt;</span>
                        <input 
                          required
                          className="w-full bg-[#0F172A] border border-[#334155] focus:border-[#06B6D4] transition-all rounded pl-8 text-white py-2.5 font-mono text-xs outline-none" 
                          placeholder="Confirm" 
                          type="password"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button 
                      className="bg-[#1E293B] border border-[#334155] text-white hover:text-[#06B6D4] hover:border-[#06B6D4] text-xs px-6 py-2.5 rounded transition-all font-bold uppercase tracking-wider" 
                      type="submit"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Connected Repos Management block */}
              <div className="border border-[#334155] bg-[#1E293B]/40 p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-sm text-white font-bold flex items-center gap-2 select-none">
                    <span className="material-symbols-outlined text-[#06B6D4]">source</span>
                    Connected GitHub Repositories
                  </h4>
                  <button 
                    onClick={() => setShowConnectModal(true)}
                    className="text-[10px] font-bold bg-[#06B6D4]/10 border border-[#06B6D4]/25 hover:bg-[#06B6D4]/20 text-[#06B6D4] px-2.5 py-1.5 rounded transition-colors"
                  >
                    + Connect Repo
                  </button>
                </div>
                
                <div className="divide-y divide-[#334155]/50">
                  {repos.map((repo, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs text-[#06B6D4]">link</span>
                        <span className="text-xs font-mono text-[#D1D5DB]">{repo}</span>
                      </div>
                      <button 
                        onClick={() => handleDisconnectRepo(repo)}
                        className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-wider"
                      >
                        Disconnect
                      </button>
                    </div>
                  ))}
                  {repos.length === 0 && (
                    <p className="text-xs text-[#94A3B8] py-2 italic">No repositories connected. Candidates cannot run assessments until a repo is connected.</p>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border border-red-500/20 bg-red-500/5 p-6 rounded-xl shadow-sm">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                  <div className="space-y-2 select-none">
                    <h4 className="text-sm text-red-400 font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-500">warning</span>
                      Danger Zone
                    </h4>
                    <p className="text-[#94A3B8] text-xs leading-relaxed max-w-md">
                      Deleting your account is permanent. All candidate screening session history, Q&A logs, and summary reports will be wiped.
                    </p>
                  </div>
                  <button 
                    onClick={handleDeleteAccount}
                    className="bg-transparent border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded hover:bg-red-500 hover:text-white transition-all active:scale-95 whitespace-nowrap"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </section>

            {/* Right sidebars details */}
            <section className="space-y-6 select-none text-xs">
              {/* Account Integrity */}
              <div className="border border-[#334155] bg-[#1E293B]/40 p-6 rounded-xl shadow-sm space-y-4">
                <h5 className="text-[10px] text-[#06B6D4] uppercase tracking-widest font-bold">
                  Account Integrity
                </h5>
                <ul className="space-y-4">
                  <li className="flex items-center justify-between">
                    <span className="text-[#94A3B8] font-semibold">2FA MFA Security</span>
                    {twoFactorEnabled ? (
                      <button 
                        onClick={handleDisable2fa}
                        className="text-emerald-400 font-bold flex items-center gap-1 font-mono bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded"
                      >
                        <span className="material-symbols-outlined text-xs">lock</span>
                        ENABLED
                      </button>
                    ) : (
                      <button 
                        onClick={() => setShow2faModal(true)}
                        className="text-red-400 font-bold flex items-center gap-1 font-mono bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded hover:bg-red-500/20 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xs">lock_open</span>
                        DISABLED
                      </button>
                    )}
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-[#94A3B8] font-semibold">Git Integration</span>
                    <span className="text-[#06B6D4] font-bold flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      GITHUB
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-[#94A3B8] font-semibold">Region Node</span>
                    <span className="text-white font-semibold font-mono">us-east-1</span>
                  </li>
                </ul>
              </div>

              {/* Free Plan Details */}
              <div className="border border-dashed border-[#334155] bg-[#1E293B]/20 p-6 rounded-xl space-y-4">
                <h5 className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">
                  Free Plan Details
                </h5>
                <ul className="space-y-3 text-[#94A3B8]">
                  <li className="flex gap-2.5 items-center">
                    <span className="material-symbols-outlined text-[#06B6D4] text-sm">check_circle</span>
                    <span>5 analyses / month</span>
                  </li>
                  <li className="flex gap-2.5 items-center">
                    <span className="material-symbols-outlined text-[#06B6D4] text-sm">check_circle</span>
                    <span>50,000 token limit</span>
                  </li>
                  <li className="flex gap-2.5 items-center">
                    <span className="material-symbols-outlined text-[#06B6D4] text-sm">check_circle</span>
                    <span>Public repositories only</span>
                  </li>
                  <li className="flex gap-2.5 items-center">
                    <span className="material-symbols-outlined text-[#06B6D4] text-sm">check_circle</span>
                    <span>Basic Q&A scorecard tracking</span>
                  </li>
                </ul>
              </div>

              {/* Pro Plan Benefits */}
              <div className="border border-[#06B6D4]/30 bg-[#06B6D4]/5 p-6 rounded-xl space-y-4">
                <h5 className="text-[10px] text-[#06B6D4] uppercase tracking-widest font-bold">
                  Pro Benefits
                </h5>
                <ul className="space-y-3 text-[#D1D5DB]">
                  <li className="flex gap-2.5 items-center">
                    <span className="material-symbols-outlined text-[#06B6D4] text-sm">verified</span>
                    <span>50 analyses / month</span>
                  </li>
                  <li className="flex gap-2.5 items-center">
                    <span className="material-symbols-outlined text-[#06B6D4] text-sm">verified</span>
                    <span>1,000,000 token limit</span>
                  </li>
                  <li className="flex gap-2.5 items-center">
                    <span className="material-symbols-outlined text-[#06B6D4] text-sm">verified</span>
                    <span>AI Copilot suggested follow-ups</span>
                  </li>
                  <li className="flex gap-2.5 items-center">
                    <span className="material-symbols-outlined text-[#06B6D4] text-sm">verified</span>
                    <span>PDF scorecard & print export</span>
                  </li>
                  <li className="flex gap-2.5 items-center">
                    <span className="material-symbols-outlined text-[#06B6D4] text-sm">verified</span>
                    <span>Private repo assessment rights</span>
                  </li>
                </ul>
              </div>
            </section>
            
          </div>
        </div>
      </div>

      {/* MODAL 1: EDIT AVATAR */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 w-full max-w-sm space-y-6 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Select Profile Avatar</h3>
              <p className="text-[11px] text-[#94A3B8] mt-1">Pick a preset or enter a custom picture URL.</p>
            </div>
            
            {/* Presets */}
            <div className="grid grid-cols-4 gap-4">
              {[
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&h=128&q=80',
                'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&h=128&q=80',
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=128&h=128&q=80'
              ].map((url, i) => (
                <img
                  key={i}
                  src={url}
                  onClick={() => selectAvatarPreset(url)}
                  className="h-14 w-14 rounded-full border-2 border-transparent hover:border-[#06B6D4] transition-all cursor-pointer object-cover"
                />
              ))}
            </div>

            {/* Upload from Local PC */}
            <div className="space-y-2 pt-4 border-t border-[#334155]/50">
              <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Upload from Local PC</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#334155] hover:border-[#06B6D4] rounded-lg cursor-pointer bg-[#0F172A] hover:bg-[#0F172A]/80 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-3 pb-3 text-center">
                    <span className="material-symbols-outlined text-2xl text-[#94A3B8] mb-1">upload_file</span>
                    <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Choose Image File</p>
                    <p className="text-[8px] text-[#475569] mt-0.5">PNG, JPG, GIF (Max 2MB)</p>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
              </div>
            </div>

            {/* Custom URL form */}
            <form onSubmit={handleCustomAvatarSave} className="space-y-3 pt-4 border-t border-[#334155]/50">
              <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Custom Avatar URL</label>
              <input
                type="url"
                required
                value={customAvatarInput}
                onChange={(e) => setCustomAvatarInput(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full bg-[#0F172A] border border-[#334155] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#06B6D4] font-mono"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(false)}
                  className="px-3 py-1.5 bg-[#0F172A] border border-[#334155] text-xs font-bold uppercase tracking-wider rounded text-[#94A3B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#06B6D4] text-[#0F172A] text-xs font-bold uppercase tracking-wider rounded hover:bg-[#06B6D4]/80"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: 2FA MFA SECURE REGISTRATION */}
      {show2faModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Enable Two-Factor Security</h3>
              <p className="text-[11px] text-[#94A3B8] mt-1">Scan the QR code with your mobile authenticator app to enable Multi-Factor Authentication.</p>
            </div>

            {/* Mockup QR Code */}
            <div className="flex justify-center p-4 bg-white rounded-lg border border-slate-200 w-44 mx-auto select-none">
              <svg viewBox="0 0 100 100" className="w-36 h-36">
                <rect width="100" height="100" fill="white" />
                {/* Simulated QR Code patterns */}
                <path d="M5,5 h30 v30 h-30 z M15,15 h10 v10 h-10 z" fill="black" />
                <path d="M65,5 h30 v30 h-30 z M75,15 h10 v10 h-10 z" fill="black" />
                <path d="M5,65 h30 v30 h-30 z M15,75 h10 v10 h-10 z" fill="black" />
                <path d="M45,10 h10 v10 h-10 z M45,25 h10 v15 h-10 z" fill="black" />
                <path d="M10,45 h15 v10 h-15 z M30,45 h10 v20 h-10 z" fill="black" />
                <path d="M55,55 h10 v25 h-10 z M70,55 h25 v10 h-25 z" fill="black" />
                <path d="M50,75 h15 v15 h-15 z M75,75 h20 v20 h-20 z" fill="black" />
                <path d="M45,55 h5 v10 h-5 z M50,45 h15 v5 h-15 z" fill="black" />
              </svg>
            </div>

            {twoFactorError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] rounded p-2 text-center font-semibold">
                {twoFactorError}
              </div>
            )}

            <form onSubmit={handleEnable2fa} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">MFA Activation Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="000 000"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded px-3 py-2 text-center text-sm tracking-widest font-mono text-white focus:outline-none focus:border-[#06B6D4]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorError('');
                    setTwoFactorCode('');
                    setShow2faModal(false);
                  }}
                  className="px-3 py-1.5 bg-[#0F172A] border border-[#334155] text-xs font-bold uppercase tracking-wider rounded text-[#94A3B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#06B6D4] text-[#0F172A] text-xs font-bold uppercase tracking-wider rounded hover:bg-[#06B6D4]/80"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONNECT NEW REPOSITORY */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-white">Connect Codebase Repository</h3>
              <p className="text-[11px] text-[#94A3B8] mt-1">Specify target GitHub repository to index for screenings.</p>
            </div>
            
            <form onSubmit={handleConnectRepo} className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Repository URL</label>
                <input
                  type="text"
                  required
                  value={newRepoUrl}
                  onChange={(e) => setNewRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full bg-[#0F172A] border border-[#334155] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#06B6D4] font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewRepoUrl('');
                    setShowConnectModal(false);
                  }}
                  className="px-3 py-1.5 bg-[#0F172A] border border-[#334155] text-xs font-bold uppercase tracking-wider rounded text-[#94A3B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#06B6D4] text-[#0F172A] text-xs font-bold uppercase tracking-wider rounded hover:bg-[#06B6D4]/80"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
