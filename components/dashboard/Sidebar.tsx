'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useGlobal();
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80');

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`cw_avatar_url_${user.id}`);
      if (saved) setAvatar(saved);
    }
  }, [user]);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'History', path: '/history', icon: 'history' },
    { name: 'Tokens', path: '/tokens', icon: 'analytics' },
    { name: 'Profile', path: '/profile', icon: 'person' },
    { name: 'Pricing', path: '/pricing', icon: 'payments' },
  ];

  const handleNewAssessment = () => {
    router.push('/dashboard');
  };

  const handleLogout = async () => {
    if (signOut) {
      await signOut();
    }
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar-width flex flex-col z-40 bg-[#192122] border-r border-[#3b494b] pt-4">
      {/* Workspace Header */}
      <div className="px-6 py-4 border-b border-[#3b494b]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#3b494b]">
            <img 
              className="w-full h-full object-cover" 
              alt="Recruiter Workspace Avatar"
              src={avatar}
            />
          </div>
          <div className="overflow-hidden">
            <p className="font-label-sm text-xs text-[#7df4ff] leading-tight font-bold truncate">
              {user?.companyName ? `${user.companyName} Recopilot` : 'Recruiter Workspace'}
            </p>
            <p className="text-[9px] text-[#b9cacb] uppercase tracking-tighter truncate">
              {user?.name || 'AI Interview Screening'}
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
            {menuItems.map((item) => {
              const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  href={item.path}
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
          </div>
        </div>
      </nav>

      {/* Sidebar Footer / Logout */}
      <div className="p-4 border-t border-[#3b494b] bg-[#080f10]">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 text-[#b9cacb] px-4 py-3 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ease-in-out text-xs font-bold rounded-lg text-left uppercase tracking-wider"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
