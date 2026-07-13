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
  const { user, signOut, theme, toggleTheme } = useGlobal();
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
    // Keep manage dropdown open if one of the sub-items is currently active
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

  return (
    <>
      {/* Backdrop overlay for mobile screens */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-fade-in"
        />
      )}

      <aside className={`fixed top-0 bottom-0 left-0 h-screen w-sidebar-width flex flex-col z-50 bg-[#192122] border-r border-[#3b494b] pt-4 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand Logo with CW Icon */}
        <div className="px-6 pb-4 mb-2 flex items-center justify-between select-none border-b border-[#3b494b]/60">
          <Link 
            href="/" 
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            onClick={onClose}
          >
            <span className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-cyan-500/20">
              CW
            </span>
            <span className="font-bold text-base tracking-tight text-white">
              CodeWalk
            </span>
          </Link>
          
          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="lg:hidden p-1 text-[#b9cacb] hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

      {/* Workspace Header */}
      <div className="px-6 py-4 border-b border-[#3b494b]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#3b494b] flex items-center justify-center bg-[#06B6D4] text-[#0d1515] font-bold text-lg select-none">
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
          <div className="overflow-hidden">
            <p className="font-label-sm text-xs text-[#7df4ff] leading-tight font-bold truncate">
              {user?.companyName ? `${user.companyName} Recopilot` : 'Add Company'}
            </p>
            <p className="text-[9px] text-[#b9cacb] uppercase tracking-tighter truncate">
              {user?.name || 'Recruiter'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleNewAssessment}
          className="w-full py-2 px-4 bg-[#00f0ff] hover:bg-[#00f0ff]/90 text-[#002022] font-label-sm text-xs rounded-lg active:scale-95 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Interview
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        <div className="px-4 mb-2">
          <p className="font-label-sm text-[10px] text-[#b9cacb] px-2 mb-2 uppercase tracking-widest opacity-50 font-bold">Navigation</p>
          <div className="space-y-1">
            {primaryMenuItems.map((item) => {
              const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-label-sm text-xs transition-all duration-150 uppercase tracking-wider ${
                    isActive 
                      ? 'bg-[#2e3637] text-[#7df4ff] border-l-2 border-[#7df4ff] font-bold' 
                      : 'text-[#b9cacb] hover:bg-[#2e3637]/50 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Collapsible Dropdown for Tokens & Profile */}
            <div className="space-y-1 pt-2">
              <button
                onClick={() => setIsManageOpen(!isManageOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg font-label-sm text-xs transition-all duration-150 uppercase tracking-wider text-[#b9cacb] hover:bg-[#2e3637]/50 hover:text-white cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">settings</span>
                  <span>Account &amp; Settings</span>
                </div>
                <span 
                  className="material-symbols-outlined text-base transition-transform duration-200" 
                  style={{ transform: isManageOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  keyboard_arrow_down
                </span>
              </button>

              {isManageOpen && (
                <div className="pl-6 space-y-1 border-l border-[#3b494b]/60 ml-6 mt-1 transition-all duration-200">
                  {subMenuItems.map((item) => {
                    const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-label-sm text-[11px] transition-all duration-150 uppercase tracking-wider ${
                          isActive 
                            ? 'bg-[#2e3637] text-[#7df4ff] font-bold' 
                            : 'text-[#b9cacb]/80 hover:bg-[#2e3637]/30 hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">{item.icon}</span>
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
      <div className="p-4 border-t border-[#3b494b] bg-[#080f10] space-y-1">
        {/* Dark / Light mode toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider text-[#b9cacb] hover:bg-[#2e3637]/50 hover:text-white transition-all duration-200 cursor-pointer group"
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
          className="w-full flex items-center gap-3 text-[#b9cacb] px-4 py-3 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ease-in-out text-xs font-bold rounded-lg text-left uppercase tracking-wider"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  </>
);
}
