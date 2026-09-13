'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useGlobal } from '@/app/context/GlobalContext';

export default function Navbar() {
  const { user, signOut, subscription } = useGlobal();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const getAvatarUrl = () => {
    if (user?.avatarUrl) return user.avatarUrl;
    if (user?.githubConnected && user?.githubAvatar) return user.githubAvatar;
    return null;
  };
  const avatarUrlToDisplay = getAvatarUrl();

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-12 py-3.5 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
        <span className="h-8 w-8 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-md"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
          CW
        </span>
        <span className="font-bold text-lg tracking-tight text-slate-800 select-none" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          CodeWalk
        </span>
      </Link>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-7 select-none">
        <Link className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors"
          href={user ? '/dashboard' : '/workspace'}>
          Workspace
        </Link>
        <FunctionsMenu />
        <Link className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors" href="/pricing">
          Pricing
        </Link>
        <ResourcesMenu />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {mounted && user ? (
          <div className="relative">
            <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 focus:outline-none">
              {avatarUrlToDisplay ? (
                <Image src={avatarUrlToDisplay} alt="Profile Avatar" width={36} height={36} unoptimized
                  className="h-9 w-9 rounded-full object-cover hover:scale-105 transition-all ring-2 ring-violet-200" />
              ) : (
                <span className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm hover:scale-105 transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                  {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                </span>
              )}
            </button>
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-100 bg-white text-slate-800 shadow-xl py-2 z-50"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-[10px] text-slate-400">Signed in as</p>
                  <p className="text-sm font-semibold truncate text-slate-800">{user.name}</p>
                  <p className="text-[10px] font-medium text-violet-600 mt-0.5 px-2 py-0.5 bg-violet-50 rounded-full inline-block">{subscription} Plan</p>
                </div>
                <Link href="/dashboard" className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors">Recruiter Dashboard</Link>
                <Link href="/history" className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors">Interview History</Link>
                <Link href="/tokens" className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors">Token Logs &amp; Quotas</Link>
                <Link href="/profile" className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors">Profile Settings</Link>
                <Link href="/pricing" className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors">Pricing Plans</Link>
                <hr className="border-gray-100 my-1" />
                <button onClick={() => signOut()}
                  className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">
              Login
            </Link>
            <Link href="/register"
              className="px-5 py-2 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-95 shadow-md"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
              Try Free
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

/* ─── useHoverMenu helper ─── */
function useHoverMenu() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEnter = () => { if (timer.current) clearTimeout(timer.current); setOpen(true); };
  const onLeave = () => { timer.current = setTimeout(() => setOpen(false), 120); };
  return { open, onEnter, onLeave };
}

/* ─── Functions Mega-Dropdown ─── */
function FunctionsMenu() {
  const { open, onEnter, onLeave } = useHoverMenu();

  const coreFeatures = [
    { label: 'Repo-Based Questioning', href: '/features/repo-based-questioning', color: 'text-violet-600' },
    { label: 'JD-Based Assessment',    href: '/features/jd-based-assessment',    color: 'text-coral-600' },
    { label: 'Live AI Interview',       href: '/features/live-ai-interview',       color: 'text-pink-600' },
    { label: 'Technical Assessment',    href: '/features/technical-assessment',    color: 'text-violet-600' },
    { label: 'Behavioral Assessment',  href: '/features/behavioral-assessment',  color: 'text-green-600' },
    { label: 'AI Proctoring',          href: '/features/ai-proctoring',          color: 'text-yellow-600' },
  ];
  const hiringSolutions = [
    { label: 'High-Volume Hiring', href: '/features/high-volume-hiring' },
    { label: 'Campus Recruiting',  href: '/features/campus-recruiting' },
  ];
  const builtFor = [
    { label: 'Software Engineering', href: '/features/software-engineering' },
    { label: 'Data Science',          href: '/features/data-science' },
    { label: 'Machine Learning',      href: '/features/machine-learning' },
  ];

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button id="nav-functions-btn" aria-haspopup="true" aria-expanded={open}
        className={`flex items-center gap-1 text-sm font-medium transition-colors focus:outline-none cursor-pointer ${open ? 'text-violet-600' : 'text-slate-600 hover:text-violet-600'}`}>
        Functions
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 w-[620px]"
          onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <div role="menu" aria-labelledby="nav-functions-btn"
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f0f0f5' }}>
            <div className="grid grid-cols-3">
              {/* Core Features */}
              <div className="p-5 border-r border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-violet-500">Core Features</p>
                <div className="flex flex-col gap-0.5">
                  {coreFeatures.map(({ label, href }) => (
                    <Link key={label} href={href} role="menuitem"
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:text-violet-600 hover:bg-violet-50 transition-all duration-150">
                      <span className="w-1 h-1 rounded-full bg-violet-400 flex-shrink-0" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
              {/* Hiring + Built For */}
              <div className="p-5 border-r border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-violet-500">Hiring Solutions</p>
                <div className="flex flex-col gap-0.5 mb-4">
                  {hiringSolutions.map(({ label, href }) => (
                    <Link key={label} href={href} role="menuitem"
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:text-violet-600 hover:bg-violet-50 transition-all duration-150">
                      <span className="w-1 h-1 rounded-full bg-pink-400 flex-shrink-0" />
                      {label}
                    </Link>
                  ))}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-violet-500">Built For</p>
                <div className="flex flex-col gap-0.5">
                  {builtFor.map(({ label, href }) => (
                    <Link key={label} href={href} role="menuitem"
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:text-violet-600 hover:bg-violet-50 transition-all duration-150">
                      <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
              {/* CTA */}
              <div className="p-5 flex flex-col justify-between bg-gradient-to-br from-violet-50 to-pink-50">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-violet-500">Get Started</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Walk through any codebase in under 60 seconds.</p>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <Link href="/workspace" role="menuitem"
                    className="px-4 py-2 text-xs font-bold text-white rounded-xl text-center transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                    Try Free
                  </Link>
                  <Link href="/how-it-works" role="menuitem"
                    className="px-4 py-2 text-xs font-bold rounded-xl text-center border border-gray-200 text-slate-600 hover:bg-white transition-all">
                    See How It Works
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Resources Dropdown ─── */
function ResourcesMenu() {
  const { open, onEnter, onLeave } = useHoverMenu();

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button id="nav-resources-btn" aria-haspopup="true" aria-expanded={open}
        className={`flex items-center gap-1 text-sm font-medium transition-colors focus:outline-none cursor-pointer ${open ? 'text-violet-600' : 'text-slate-600 hover:text-violet-600'}`}>
        Resources
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 pt-2 z-50 w-52"
          onMouseEnter={onEnter} onMouseLeave={onLeave}>
          <div role="menu" aria-labelledby="nav-resources-btn"
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f0f0f5' }}>
            <div className="p-2">
              {[
                { label: 'Blog',     href: '/blog',    desc: 'Articles & case studies' },
                { label: 'Support',  href: '/support', desc: 'Help center & FAQs' },
                { label: 'About Us', href: '/about',   desc: 'Our mission & team' },
              ].map((item) => (
                <Link key={item.label} href={item.href} role="menuitem"
                  className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl hover:bg-violet-50 transition-all duration-150">
                  <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                  <span className="text-[10px] text-slate-400">{item.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
