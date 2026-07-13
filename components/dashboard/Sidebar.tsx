'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, subscription, theme, toggleTheme } = useGlobal();
  
  const getAvatarUrl = () => {
    if (user?.avatarUrl) return user.avatarUrl;
    if (user?.githubConnected && user?.githubAvatar) return user.githubAvatar;
    return null;
  };

  const avatarUrlToDisplay = getAvatarUrl();
  const [isManageOpen, setIsManageOpen] = useState(false);

  const primaryMenuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Positions', path: '/positions', icon: 'work' },
    { name: 'History', path: '/history', icon: 'history' },
    { name: 'Candidates', path: '/candidates', icon: 'groups' },
    { name: 'Projects', path: '/take-home', icon: 'assignment' },
    { name: 'Question Bank', path: '/question-bank', icon: 'library_books' },
    { name: 'Resume Parser', path: '/resume-extractor', icon: 'description' },
  ];

  const subMenuItems = [
    { name: 'Tokens', path: '/tokens', icon: 'analytics' },
    { name: 'Profile', path: '/profile', icon: 'person' },
    { name: 'Pricing', path: '/pricing', icon: 'payments' },
  ];

  useEffect(() => {
    const isSubActive = subMenuItems.some(item => pathname === item.path || pathname?.startsWith(item.path + '/'));
    if (isSubActive) {
      setIsManageOpen(true);
    }
  }, [pathname]);

  const handleNewAssessment = () => {
    if (onClose) onClose();
    router.push('/dashboard/new-session');
  };

  const handleLogout = async () => {
    if (signOut) {
      await signOut();
    }
    router.push('/login');
  };

  const planName = (subscription || 'Free').toUpperCase();

  return (
    <>
      {/* Backdrop overlay for mobile screens */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/75 z-40 lg:hidden animate-in fade-in duration-300"
        />
      )}

      <aside className={`fixed top-0 bottom-0 left-0 h-screen w-sidebar-width flex flex-col z-50 bg-[#0c1213] border-r border-[#3b494b]/60 pt-5 transition-all duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/15 via-[#0c1213] to-[#0c1213]`}>
        
        {/* Brand Logo with CW Icon */}
        <div className="px-6 pb-5 mb-3 flex items-center justify-between select-none border-b border-[#3b494b]/40">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group"
            onClick={onClose}
          >
            <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-cyan-400 to-indigo-500 flex items-center justify-center text-white font-black text-base shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform duration-300">
              CW
            </span>
            <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-[#7df4ff] transition-colors duration-200">
              CodeWalk
            </span>
          </Link>
          
          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[#b9cacb] hover:text-white hover:bg-[#192122] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* User Workspace Profile Card */}
        <div className="px-5 py-4 border-b border-[#3b494b]/40">
          <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-br from-[#151d1e] to-[#0d1515] border border-[#3b494b]/50 rounded-xl shadow-inner hover:border-[#06B6D4]/30 transition-all duration-300">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#3b494b] flex items-center justify-center bg-gradient-to-tr from-[#06B6D4] to-indigo-500 text-white font-bold text-lg select-none">
                {avatarUrlToDisplay ? (
                  <img 
                    className="w-full h-full object-cover" 
                    alt="Recruiter Workspace Avatar"
                    src={avatarUrlToDisplay}
                  />
                ) : (
                  <span>{user?.name ? user.name.slice(0, 1).toUpperCase() : 'U'}</span>
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#151d1e] animate-pulse"></span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs text-[#7df4ff] font-extrabold truncate">
                {user?.companyName ? `${user.companyName} Recopilot` : 'Add Company'}
              </p>
              <p className="text-[10px] text-[#b9cacb]/80 font-medium truncate mt-0.5">
                {user?.name || 'Recruiter'}
              </p>
              <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 select-none font-mono ${
                planName === 'ENTERPRISE' 
                  ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400' 
                  : planName === 'PRO'
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  : 'bg-cyan-500/10 border border-cyan-500/30 text-[#06B6D4]'
              }`}>
                {planName} PLAN
              </span>
            </div>
          </div>

          <button 
            onClick={handleNewAssessment}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-400 to-[#00f0ff] hover:brightness-110 text-[#002022] rounded-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 font-bold uppercase text-[11px] tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:shadow-[0_0_22px_rgba(0,240,255,0.45)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] font-bold">add</span>
            New Interview
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <div className="px-3 mb-2">
            <p className="font-label-sm text-[9px] text-[#b9cacb] px-3 mb-2.5 uppercase tracking-widest opacity-40 font-bold">Navigation</p>
            <div className="space-y-1">
              {primaryMenuItems.map((item) => {
                const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all duration-250 group ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#06B6D4]/15 via-[#06B6D4]/5 to-transparent text-[#7df4ff] border-l-4 border-[#06B6D4] shadow-[inset_1px_1px_0px_0px_rgba(6,182,212,0.15)] font-bold' 
                        : 'text-[#b9cacb] hover:bg-[#192122]/40 hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-lg transition-transform duration-300 ${
                      isActive ? 'text-[#7df4ff]' : 'text-[#b9cacb] group-hover:text-white group-hover:scale-110'
                    }`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* Collapsible Dropdown for Tokens & Profile */}
              <div className="space-y-1 pt-2">
                <button
                  onClick={() => setIsManageOpen(!isManageOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-xs tracking-wider uppercase text-[#b9cacb] hover:bg-[#192122]/40 hover:text-white transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="material-symbols-outlined text-lg text-[#b9cacb] group-hover:text-white transition-colors">settings</span>
                    <span>Account &amp; Settings</span>
                  </div>
                  <span 
                    className="material-symbols-outlined text-base transition-transform duration-300" 
                    style={{ transform: isManageOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    keyboard_arrow_down
                  </span>
                </button>

                {isManageOpen && (
                  <div className="pl-5 space-y-1 border-l border-[#3b494b]/50 ml-6 mt-1 transition-all duration-300">
                    {subMenuItems.map((item) => {
                      const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-[10px] tracking-wider uppercase transition-all duration-200 group ${
                            isActive 
                              ? 'bg-gradient-to-r from-[#06B6D4]/10 to-transparent text-[#7df4ff] font-bold border-l-2 border-[#06B6D4]' 
                              : 'text-[#b9cacb]/80 hover:bg-[#192122]/30 hover:text-white hover:translate-x-1'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-base ${
                            isActive ? 'text-[#7df4ff]' : 'text-[#b9cacb]/70 group-hover:text-white'
                          }`}>{item.icon}</span>
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer / Logout */}
        <div className="p-4 border-t border-[#3b494b]/40 bg-[#080c0d] space-y-1.5">
          {/* Dark / Light mode toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-[#b9cacb] hover:bg-[#192122]/40 hover:text-white transition-all duration-200 cursor-pointer group"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-lg transition-transform duration-300 group-hover:scale-110">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            {/* Pill toggle indicator */}
            <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 flex-shrink-0 ${
              theme === 'dark' ? 'bg-[#3b494b]' : 'bg-[#06B6D4]'
            }`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all duration-300 ${
                theme === 'dark'
                  ? 'left-0.5 bg-[#b9cacb]'
                  : 'left-[calc(100%-18px)] bg-white'
              }`} />
            </div>
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 text-[#b9cacb] px-4 py-3 hover:bg-red-500/10 hover:text-red-400 transition-all duration-250 ease-in-out text-xs font-bold rounded-xl text-left uppercase tracking-wider cursor-pointer group"
          >
            <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform duration-200">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
