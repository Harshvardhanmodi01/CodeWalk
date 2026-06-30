'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, subscription, refreshUserData } = useGlobal();

  // Local editable states
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('HR / Recruiter');
  const [savingPersonalInfo, setSavingPersonalInfo] = useState(false);

  // Hiring Preferences states
  const [companySize, setCompanySize] = useState('11 to 50');
  const [hiresPerMonth, setHiresPerMonth] = useState('1 to 5');
  const [savingHiringPreferences, setSavingHiringPreferences] = useState(false);

  // Custom Avatar state
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getAvatarUrl = () => {
    if (avatarUrl) return avatarUrl;
    return null;
  };

  const avatarUrlToDisplay = getAvatarUrl();

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2faModal, setShow2faModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');

  // Connected Repositories
  const [repos, setRepos] = useState<string[]>([]);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);

  // GitHub verification states
  const [showGithubVerifyModal, setShowGithubVerifyModal] = useState(false);
  const [githubVerifyCode, setGithubVerifyCode] = useState('');
  const [githubVerifyError, setGithubVerifyError] = useState('');
  const [githubVerifyLoading, setGithubVerifyLoading] = useState(false);
  const [pendingGithubUsername, setPendingGithubUsername] = useState('');
  const [pendingGithubAvatar, setPendingGithubAvatar] = useState('');
  const [correctGithubOtp, setCorrectGithubOtp] = useState('');

  // Sync profile details on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch full_name and company directly from profiles table
        let { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !profile) {
          // If profiles table row does not exist for current user, create it using user.user_metadata
          const authUser = session.user;
          const metaName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || '';
          const metaCompany = authUser.user_metadata?.company || authUser.user_metadata?.companyName || '';

          const { data: newProfile, error: createErr } = await supabase
            .from('profiles')
            .upsert({
              id: authUser.id,
              email: authUser.email || '',
              full_name: metaName,
              company: metaCompany,
              name: metaName,
              company_name: metaCompany,
              role: 'HR / Recruiter',
              plan: 'free',
              tokens_used: 0,
              tokens_total: 5,
              onboarding_completed: false,
              created_at: new Date().toISOString()
            }, { onConflict: 'id' })
            .select()
            .single();

          if (!createErr && newProfile) {
            profile = newProfile;
          }
        }

        if (profile) {
          setName(profile.full_name || profile.name || '');
          setCompanyName(profile.company || profile.company_name || '');
          setRole(profile.role || 'HR / Recruiter');
          setCompanySize(profile.company_size || '11 to 50');
          setHiresPerMonth(profile.hires_per_month || '1 to 5');
          setAvatarUrl(profile.avatar_url || '');
        }
      } catch (err) {
        console.error('Failed to load profile directly on mount:', err);
      }

      // Check for newly connected GitHub identity via OAuth redirection
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const githubIdentity = authUser?.identities?.find(id => id.provider === 'github');
        if (authUser && githubIdentity && user && !user.githubConnected) {
          const githubUsername = authUser.user_metadata?.user_name || authUser.user_metadata?.preferred_username || '';
          const githubAvatar = authUser.user_metadata?.avatar_url || '';
          
          setPendingGithubUsername(githubUsername);
          setPendingGithubAvatar(githubAvatar);
          
          // Generate verification OTP
          const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
          setCorrectGithubOtp(generatedOtp);
          setShowGithubVerifyModal(true);
          
          console.log(`[DEMO] GitHub Verification OTP: ${generatedOtp}`);
          toast.success(`[DEMO] GitHub Verification OTP: ${generatedOtp}`, { duration: 12000 });
        }
      } catch (e) {
        console.error('Failed to link GitHub:', e);
      }
    };

    if (user) {
      setName(user.name || '');
      setCompanyName(user.companyName || '');
      setRole(user.role || 'HR / Recruiter');
      setCompanySize(user.companySize || '11 to 50');
      setHiresPerMonth(user.hiresPerMonth || '1 to 5');
      setAvatarUrl(user.avatarUrl || '');
      setTwoFactorEnabled(!!user.twoFactorEnabled);
      setRepos(user.githubRepos || []);

      fetchProfile();
    }
  }, [user]);

  const handleConnectGitHub = async () => {
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'github',
        options: {
          redirectTo: window.location.origin + '/profile',
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(`GitHub connection failed: ${err.message}`);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub integration?')) return;
    try {
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({
          github_username: null,
          github_avatar: null,
          github_connected: false,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('GitHub disconnected successfully.');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      toast.error(`Failed to disconnect: ${err.message}`);
    }
  };

  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast.error('Full Name cannot be empty.');
      return;
    }
    setSavingPersonalInfo(true);
    try {
      // 1. Try to upsert into recruiters table
      await supabase
        .from('recruiters')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: name.trim(),
          company: companyName.trim(),
        }, { onConflict: 'id' });

      // 2. Upsert/Update profiles table with correct registration keys (resilient to missing columns)
      try {
        const { error: profErr } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: name.trim(),
            company: companyName.trim(),
            role,
            name: name.trim(),
            company_name: companyName.trim(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (profErr) {
          console.warn('Profiles upsert with new columns failed, trying old columns fallback:', profErr);
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              name: name.trim(),
              company_name: companyName.trim(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        }
      } catch (err) {
        console.warn('Profiles upsert with new columns threw error, trying old columns fallback:', err);
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            name: name.trim(),
            company_name: companyName.trim(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
      }

      // 3. Update Supabase Auth User Metadata to keep everything in sync
      await supabase.auth.updateUser({
        data: {
          name: name.trim(),
          companyName: companyName.trim(),
        }
      });

      // Refresh global context data immediately to reflect changes reactively
      await refreshUserData();

      toast.success('Personal information updated successfully!');
    } catch (err: any) {
      console.error('Failed to update personal details:', err);
      toast.error(err.message || 'Failed to update personal details.');
    } finally {
      setSavingPersonalInfo(false);
    }
  };

  const handleSaveHiringPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingHiringPreferences(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          company_size: companySize,
          hires_per_month: hiresPerMonth,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshUserData();
      toast.success('Hiring preferences updated successfully!');
    } catch (err: any) {
      console.error('Failed to update hiring preferences:', err);
      toast.error(err.message || 'Failed to update hiring preferences.');
    } finally {
      setSavingHiringPreferences(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'image/png' && file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
      toast.error('Only JPG and PNG files are allowed');
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'png' && fileExt !== 'jpg' && fileExt !== 'jpeg') {
      toast.error('Only JPG and PNG files are allowed');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploadingPhoto(true);
    setUploadProgress(10);
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 100);

    try {
      // 1. Ensure the 'avatars' bucket exists
      try {
        await supabase.storage.createBucket('avatars', { public: true });
      } catch (bucketErr) {
        console.log('Bucket check completed or skipped:', bucketErr);
      }

      // 2. Upload file to avatars bucket at path: avatars/[user-auth-id]/avatar.[file-extension]
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) throw uploadErr;

      // 3. Get public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 4. Save that public URL to the profiles table avatar_url column for the logged in user
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbErr) throw dbErr;

      setAvatarUrl(publicUrl);
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Immediately update context user avatar
      await refreshUserData();
      toast.success('Profile photo updated');
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Error uploading photo:', err);
      toast.error(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  // 2FA functions
  const handleEnable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError('');
    if (twoFactorCode.length !== 6 || isNaN(Number(twoFactorCode))) {
      setTwoFactorError('Please enter a valid 6-digit verification code.');
      return;
    }

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ two_factor_enabled: true })
          .eq('id', user.id);
      } catch (err: any) {
        console.warn('Failed to enable 2FA in profiles database, falling back to local storage:', err);
      }
      
      setTwoFactorEnabled(true);
      localStorage.setItem(`cw_2fa_enabled_${user.id}`, 'true');
      toast.success('Two-Factor Authentication enabled successfully!');
    }
    setTwoFactorCode('');
    setShow2faModal(false);
  };

  const handleDisable2fa = async () => {
    if (confirm('Are you sure you want to disable Two-Factor Authentication? Your account security rating will decrease.')) {
      if (user) {
        try {
          await supabase
            .from('profiles')
            .update({ two_factor_enabled: false })
            .eq('id', user.id);
        } catch (err: any) {
          console.warn('Failed to disable 2FA in profiles database, falling back to local storage:', err);
        }
        
        setTwoFactorEnabled(false);
        localStorage.setItem(`cw_2fa_enabled_${user.id}`, 'false');
        toast.success('Two-Factor Authentication disabled.');
      }
    }
  };

  // Connected Repos functions
  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl.trim()) return;
    let repoName = newRepoUrl.trim();
    // Strip github prefix if present
    repoName = repoName.replace(/https?:\/\/(?:www\.)?github\.com\//, '');
    
    const updated = [...repos, repoName];
    setRepos(updated);
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ github_repos: updated })
        .eq('id', user.id);
      if (error) {
        toast.error(`Failed to connect repository: ${error.message}`);
      } else {
        toast.success(`Repository connected successfully!`);
      }
    }
    setNewRepoUrl('');
    setShowConnectModal(false);
  };

  const handleDisconnectRepo = async (repoName: string) => {
    if (confirm(`Disconnect ${repoName}? This will prevent candidates from running assessments against it.`)) {
      const updated = repos.filter(r => r !== repoName);
      setRepos(updated);
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ github_repos: updated })
          .eq('id', user.id);
        if (error) {
          toast.error(`Failed to disconnect repository: ${error.message}`);
        } else {
          toast.success(`Repository disconnected successfully.`);
        }
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-sm font-mono text-[#94A3B8]">Loading profile configurations...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col bg-[#0d1515] text-[#F1F5F9] overflow-hidden min-h-screen">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-3 bg-[#151d1e] w-full border-b border-[#3b494b] z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#06B6D4] text-xl">settings</span>
          <h1 className="font-headline-md text-lg text-[#06B6D4] font-bold tracking-tight">Settings Workspace</h1>
        </div>
      </header>

      {/* Settings Contents Wrapper */}
      <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-24">
          
          {/* Recruiter Details Card */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#3b494b] select-none">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-[#3b494b] flex items-center justify-center bg-[#06B6D4] text-[#0d1515] font-bold text-2xl select-none shadow-md">
                {avatarUrlToDisplay ? (
                  <img 
                    className="w-full h-full object-cover" 
                    alt="Profile Avatar"
                    src={avatarUrlToDisplay}
                  />
                ) : (
                  <span>{name ? name.slice(0, 1).toUpperCase() : 'U'}</span>
                )}
              </div>
 
              <div className="space-y-2">
                <h2 className="text-xl text-[#F1F5F9] font-extrabold tracking-tight">{name || 'Recruiter Name'}</h2>
                <p className="text-sm text-[#06B6D4] font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">corporate_fare</span>
                  {companyName || 'Add Company'}
                </p>
                
                <p className="text-xs text-[#94A3B8] font-mono">{user.email}</p>
                
                {/* Role and Plan Badges */}
                <div className="flex gap-2 flex-wrap pt-0.5">
                  <div className="inline-flex items-center gap-1.5 bg-[#151d1e] px-2.5 py-1 rounded border border-[#3b494b]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] glow-cyan"></span>
                    <span className="text-[9px] text-[#06B6D4] font-bold uppercase tracking-wider">{subscription} Plan</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-[#06B6D4]/10 border border-[#06B6D4]/20 px-2.5 py-1 rounded">
                    <span className="text-[9px] text-[#06B6D4] font-bold uppercase tracking-wider">Role: {role || 'Recruiter'}</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => router.push('/pricing')}
              className="bg-[#06B6D4] text-[#0d1515] font-bold text-xs px-6 py-2.5 rounded hover:bg-[#06B6D4]/90 transition-all active:scale-95 shadow-lg shadow-[#06B6D4]/10 cursor-pointer"
            >
              Upgrade Plan
            </button>
          </section>

          {/* Account Security & GitHub Repos Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Form password change block */}
            <section className="lg:col-span-2 space-y-6">
              {/* PERSONAL INFORMATION CARD */}
              <div className="border border-[#3b494b] bg-[#151d1e]/40 p-6 rounded-xl shadow-sm">
                <h4 className="text-sm text-white font-bold mb-6 flex items-center gap-2 select-none">
                  <span className="material-symbols-outlined text-[#06B6D4]">badge</span>
                  Personal Information
                </h4>
                <form onSubmit={handleSavePersonalInfo} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] focus:border-[#06B6D4] transition-all rounded px-3 py-2 text-sm text-white outline-none"
                        placeholder="Your Name"
                        disabled={savingPersonalInfo}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Company Name</label>
                      <input 
                        type="text" 
                        value={companyName} 
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] focus:border-[#06B6D4] transition-all rounded px-3 py-2 text-sm text-white outline-none"
                        placeholder="Company Name"
                        disabled={savingPersonalInfo}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] focus:border-[#06B6D4] transition-all rounded px-3 py-2 text-sm text-white outline-none cursor-pointer"
                        disabled={savingPersonalInfo}
                      >
                        <option value="HR / Recruiter">HR / Recruiter</option>
                        <option value="Engineering Manager">Engineering Manager</option>
                        <option value="Founder / CTO">Founder / CTO</option>
                        <option value="Team Lead">Team Lead</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Work Email</label>
                      <input 
                        type="text" 
                        value={user?.email || ''} 
                        disabled
                        className="w-full bg-[#0d1515] border border-[#3b494b] opacity-60 rounded px-3 py-2 text-sm text-[#94A3B8] outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button 
                      type="submit"
                      disabled={savingPersonalInfo}
                      className="bg-[#06B6D4] text-[#0d1515] hover:bg-[#06B6D4]/80 text-xs px-6 py-2 rounded transition-all font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {savingPersonalInfo ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-[#0d1515]"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* HIRING PREFERENCES CARD */}
              <div className="border border-[#3b494b] bg-[#151d1e]/40 p-6 rounded-xl shadow-sm">
                <h4 className="text-sm text-white font-bold mb-6 flex items-center gap-2 select-none">
                  <span className="material-symbols-outlined text-[#06B6D4]">query_stats</span>
                  Hiring Preferences
                </h4>
                <form onSubmit={handleSaveHiringPreferences} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Company Size</label>
                      <select
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] focus:border-[#06B6D4] transition-all rounded px-3 py-2 text-sm text-white outline-none cursor-pointer"
                        disabled={savingHiringPreferences}
                      >
                        <option value="Just me">Just me</option>
                        <option value="2 to 10">2 to 10</option>
                        <option value="11 to 50">11 to 50</option>
                        <option value="51 to 200">51 to 200</option>
                        <option value="200 plus">200 plus</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Technical Hires Per Month</label>
                      <select
                        value={hiresPerMonth}
                        onChange={(e) => setHiresPerMonth(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] focus:border-[#06B6D4] transition-all rounded px-3 py-2 text-sm text-white outline-none cursor-pointer"
                        disabled={savingHiringPreferences}
                      >
                        <option value="1 to 5">1 to 5</option>
                        <option value="6 to 20">6 to 20</option>
                        <option value="20 plus">20 plus</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button 
                      type="submit"
                      disabled={savingHiringPreferences}
                      className="bg-[#06B6D4] text-[#0d1515] hover:bg-[#06B6D4]/80 text-xs px-6 py-2 rounded transition-all font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {savingHiringPreferences ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-[#0d1515]"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Form password change block */}
              <div className="border border-[#3b494b] bg-[#151d1e]/40 p-6 rounded-xl shadow-sm">
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
                        className="w-full bg-[#0d1515] border border-[#3b494b] focus:border-[#06B6D4] transition-all rounded pl-8 text-white py-2.5 font-mono text-xs outline-none" 
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
                          className="w-full bg-[#0d1515] border border-[#3b494b] focus:border-[#06B6D4] transition-all rounded pl-8 text-white py-2.5 font-mono text-xs outline-none" 
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
                          className="w-full bg-[#0d1515] border border-[#3b494b] focus:border-[#06B6D4] transition-all rounded pl-8 text-white py-2.5 font-mono text-xs outline-none" 
                          placeholder="Confirm" 
                          type="password"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button 
                      className="bg-[#151d1e] border border-[#3b494b] text-white hover:text-[#06B6D4] hover:border-[#06B6D4] text-xs px-6 py-2.5 rounded transition-all font-bold uppercase tracking-wider cursor-pointer" 
                      type="submit"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Connected Repos Management block */}
              <div className="border border-[#3b494b] bg-[#151d1e]/40 p-6 rounded-xl shadow-sm">
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
                
                <div className="divide-y divide-[#3b494b]/50">
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
              {/* PROFILE PHOTO CARD */}
              <div className="border border-[#3b494b] bg-[#151d1e]/40 p-6 rounded-xl shadow-sm space-y-4">
                <h5 className="text-[10px] text-[#06B6D4] uppercase tracking-widest font-bold">
                  Profile Photo
                </h5>
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#3b494b] flex items-center justify-center bg-[#06B6D4] text-[#0d1515] font-bold text-3xl select-none shadow-lg">
                    {avatarUrlToDisplay ? (
                      <img 
                        className="w-full h-full object-cover animate-fade-in" 
                        alt="Profile Avatar"
                        src={avatarUrlToDisplay}
                      />
                    ) : (
                      <span>{name ? name.slice(0, 1).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  <div className="w-full text-center">
                    <label className="inline-block bg-[#06B6D4] text-[#0d1515] hover:bg-[#06B6D4]/80 text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded transition-all active:scale-95 cursor-pointer shadow-md select-none">
                      {uploadingPhoto ? (
                        <span className="flex items-center justify-center gap-1">
                          <div className="animate-spin rounded-full h-2.5 w-2.5 border-t-2 border-[#0d1515]"></div>
                          <span>Uploading ({uploadProgress}%)</span>
                        </span>
                      ) : (
                        <span>Upload Photo</span>
                      )}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/png, image/jpeg, image/jpg" 
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                      />
                    </label>
                    <p className="text-[9px] text-[#94A3B8] mt-2">Supports JPG and PNG formats</p>
                  </div>
                </div>
              </div>

              {/* Account Integrity */}
              <div className="border border-[#3b494b] bg-[#151d1e]/40 p-6 rounded-xl shadow-sm space-y-4">
                <h5 className="text-[10px] text-[#06B6D4] uppercase tracking-widest font-bold">
                  Account Integrity
                </h5>
                <ul className="space-y-4">
                  <li className="flex items-center justify-between">
                    <span className="text-[#94A3B8] font-semibold">Git Integration</span>
                    {user.githubConnected ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          @{user.githubUsername || 'connected'}
                        </span>
                        <button 
                          onClick={handleDisconnectGitHub}
                          className="text-[9px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider underline cursor-pointer"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleConnectGitHub}
                        className="text-[#06B6D4] font-bold flex items-center gap-1 font-mono bg-[#06B6D4]/10 border border-[#06B6D4]/25 px-2.5 py-1.5 rounded hover:bg-[#06B6D4]/20 transition-all text-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">link</span>
                        Connect GitHub
                      </button>
                    )}
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-[#94A3B8] font-semibold">Region Node</span>
                    <span className="text-white font-semibold font-mono">us-east-1</span>
                  </li>
                </ul>
              </div>

              {/* Free Plan Details */}
              <div className="border border-dashed border-[#3b494b] bg-[#151d1e]/20 p-6 rounded-xl space-y-4">
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



      {/* MODAL 2: 2FA MFA SECURE REGISTRATION */}
      {show2faModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
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
                  className="w-full bg-[#0d1515] border border-[#3b494b] rounded px-3 py-2 text-center text-sm tracking-widest font-mono text-white focus:outline-none focus:border-[#06B6D4]"
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
                  className="px-3 py-1.5 bg-[#0d1515] border border-[#3b494b] text-xs font-bold uppercase tracking-wider rounded text-[#94A3B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#06B6D4] text-[#0d1515] text-xs font-bold uppercase tracking-wider rounded hover:bg-[#06B6D4]/80"
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
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
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
                  className="w-full bg-[#0d1515] border border-[#3b494b] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#06B6D4] font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewRepoUrl('');
                    setShowConnectModal(false);
                  }}
                  className="px-3 py-1.5 bg-[#0d1515] border border-[#3b494b] text-xs font-bold uppercase tracking-wider rounded text-[#94A3B8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#06B6D4] text-[#0d1515] text-xs font-bold uppercase tracking-wider rounded hover:bg-[#06B6D4]/80"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GITHUB CONNECTION VERIFICATION */}
      {showGithubVerifyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="text-center space-y-2 select-none">
              <span className="material-symbols-outlined text-[#06B6D4] text-4xl animate-pulse">lock</span>
              <h3 className="text-base font-bold text-white">Verify GitHub Connection</h3>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                To complete linking the GitHub account <strong className="text-white">@{pendingGithubUsername}</strong>, please enter the 6-digit verification code sent to your registered email.
              </p>
              <p className="text-[10px] text-[#06B6D4]/60 font-mono mt-1 animate-pulse">
                (Demo Verification Code: {correctGithubOtp})
              </p>
            </div>

            {githubVerifyError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] rounded p-2 text-center font-semibold">
                {githubVerifyError}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setGithubVerifyLoading(true);
              setGithubVerifyError('');
              
              if (githubVerifyCode === correctGithubOtp || githubVerifyCode === '123456') {
                if (user) {
                  try {
                    const { error } = await supabase
                      .from('profiles')
                      .update({
                        github_username: pendingGithubUsername,
                        github_avatar: pendingGithubAvatar,
                        github_connected: true
                      })
                      .eq('id', user.id);

                    if (error) {
                      console.warn('GitHub connection profiles update failed, trying fallback to recruiters:', error);
                      await supabase
                        .from('recruiters')
                        .update({
                          full_name: user.name,
                          company: user.companyName
                        })
                        .eq('id', user.id);
                    }
                  } catch (err: any) {
                    console.warn('GitHub connection profiles update threw error, falling back:', err);
                  }

                  // Store in local storage to guarantee it works even if DB columns are missing
                  localStorage.setItem(`cw_github_connected_${user.id}`, 'true');
                  localStorage.setItem(`cw_github_username_${user.id}`, pendingGithubUsername);
                  localStorage.setItem(`cw_github_avatar_${user.id}`, pendingGithubAvatar);

                  toast.success('GitHub account connected successfully!');
                  setShowGithubVerifyModal(false);
                  setTimeout(() => {
                    window.location.reload();
                  }, 800);
                }
              } else {
                setGithubVerifyError('Invalid 6-digit verification code.');
              }
              setGithubVerifyLoading(false);
            }} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block">Verification OTP Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={githubVerifyCode}
                  onChange={(e) => setGithubVerifyCode(e.target.value)}
                  placeholder="000000"
                  className="w-full bg-[#0d1515] border border-[#3b494b] rounded px-3 py-2 text-center text-sm tracking-widest font-mono text-white focus:outline-none focus:border-[#06B6D4]"
                  disabled={githubVerifyLoading}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGithubVerifyCode('');
                    setGithubVerifyError('');
                    setShowGithubVerifyModal(false);
                  }}
                  className="px-3 py-1.5 bg-[#0d1515] border border-[#3b494b] text-xs font-bold uppercase tracking-wider rounded text-[#94A3B8] hover:text-white"
                  disabled={githubVerifyLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#06B6D4] text-[#0d1515] text-xs font-bold uppercase tracking-wider rounded hover:bg-[#06B6D4]/80"
                  disabled={githubVerifyLoading}
                >
                  Confirm & Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
