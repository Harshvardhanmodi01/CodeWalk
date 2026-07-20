'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useGlobal } from '@/app/context/GlobalContext';

export default function Navbar() {
  const { user, signOut, theme, toggleTheme, subscription } = useGlobal();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const getAvatarUrl = () => {
    if (user?.avatarUrl) return user.avatarUrl;
    if (user?.githubConnected && user?.githubAvatar) return user.githubAvatar;
    return null;
  };

  const avatarUrlToDisplay = getAvatarUrl();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-margin-desktop py-3 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
      {/* Brand Logo with CW Icon */}
      <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
        <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-400 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-cyan-500/20">
          CW
        </span>
        <span className="font-bold text-xl tracking-tight text-white select-none">
          CodeWalk
        </span>
      </Link>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-8">
        <Link className="font-body-md text-body-md text-on-surface-variant hover:text-primary-fixed transition-colors" href={user ? "/dashboard" : "/workspace"}>Workspace</Link>
        <Link className="font-body-md text-body-md text-on-surface-variant hover:text-primary-fixed transition-colors" href="/how-it-works">How It Works</Link>
        <Link className="font-body-md text-body-md text-on-surface-variant hover:text-primary-fixed transition-colors" href="/pricing">Pricing</Link>
        <Link className="font-body-md text-body-md text-on-surface-variant hover:text-primary-fixed transition-colors" href="/about">About Us</Link>
        <Link className="font-body-md text-body-md text-on-surface-variant hover:text-primary-fixed transition-colors" href="/blog">Blog</Link>
        <Link className="font-body-md text-body-md text-on-surface-variant hover:text-primary-fixed transition-colors" href="/support">Support</Link>
      </div>

      {/* Right Controls / Auth state */}
      <div className="flex items-center gap-4">
        {mounted && user ? (
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              {avatarUrlToDisplay ? (
                <Image 
                  src={avatarUrlToDisplay} 
                  alt="Profile Avatar" 
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 rounded-full object-cover hover:scale-105 transition-all border-2 border-[#06B6D4]"
                />
              ) : (
                <span className="h-10 w-10 rounded-full bg-[#06B6D4] flex items-center justify-center text-[#0d1515] font-bold text-sm hover:scale-105 transition-all">
                  {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                </span>
              )}
            </button>
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-outline-variant bg-[#151d1e] text-white shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-outline-variant/60">
                  <p className="text-[10px] text-[#94A3B8]">Signed in as</p>
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-[10px] font-mono text-[#06B6D4] mt-1 px-2 py-0.5 bg-[#06B6D4]/10 rounded-full inline-block">
                    {subscription} Plan
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-xs hover:bg-[#0d1515]/55 transition-colors"
                >
                  Recruiter Dashboard
                </Link>
                <Link
                  href="/history"
                  className="block px-4 py-2 text-xs hover:bg-[#0d1515]/55 transition-colors"
                >
                  Interview History
                </Link>
                <Link
                  href="/tokens"
                  className="block px-4 py-2 text-xs hover:bg-[#0d1515]/55 transition-colors"
                >
                  Token Logs & Quotas
                </Link>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-xs hover:bg-[#0d1515]/55 transition-colors"
                >
                  Profile Settings
                </Link>
                <Link
                  href="/pricing"
                  className="block px-4 py-2 text-xs hover:bg-[#0d1515]/55 transition-colors"
                >
                  Pricing Plans
                </Link>
                <hr className="border-outline-variant/60 my-1" />
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-[#0d1515]/55 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="px-4 py-2 font-label-sm text-label-sm text-on-surface hover:text-[#06B6D4] transition-colors"
            >
              Login
            </Link>
            <Link 
              href="/register" 
              className="px-6 py-2 bg-[#06B6D4] text-white font-label-sm text-label-sm font-bold glow-cyan hover:opacity-90 transition-all active:scale-95"
            >
              Try Free
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
