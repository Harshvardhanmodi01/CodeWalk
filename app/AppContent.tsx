'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';
import { supabase } from '@/app/lib/supabaseClient';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const { user, signOut, subscription } = useGlobal();
  const pathname = usePathname();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [functionsOpen, setFunctionsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileFunctionsOpen, setMobileFunctionsOpen] = useState(false);
  const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);
  const functionsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resourcesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnEnter = () => { if (functionsTimer.current) clearTimeout(functionsTimer.current); setFunctionsOpen(true); };
  const fnLeave = () => { functionsTimer.current = setTimeout(() => setFunctionsOpen(false), 120); };
  const resEnter = () => { if (resourcesTimer.current) clearTimeout(resourcesTimer.current); setResourcesOpen(true); };
  const resLeave = () => { resourcesTimer.current = setTimeout(() => setResourcesOpen(false), 120); };
  
  // Chatbot states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    { 
      sender: 'assistant', 
      text: "Hi! I'm CodeWalk, your AI agent. How can I help you understand CodeWalk features, workflows, or pricing today?" 
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const getAvatarUrl = () => {
    if (user?.avatarUrl) return user.avatarUrl;
    if (user?.githubConnected && user?.githubAvatar) return user.githubAvatar;
    return null;
  };

  const avatarUrlToDisplay = getAvatarUrl();

  useEffect(() => {
    setMounted(true);

    // Disabled global fetch interceptor that causes issues with third-party libraries and hangs
    /*
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      let response = await originalFetch(input, init);
      
      if (response.status === 401) {
        const urlString = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url || '');
        const isAppApiCall = urlString.includes('/api/') && !urlString.includes('/api/auth/');
        const isSupabaseCall = urlString.includes('supabase.co');

        if (isAppApiCall && !isSupabaseCall && !window.location.pathname.startsWith('/candidate')) {
          console.warn('API returned 401, attempting token refresh...');
          const { data, error } = await supabase.auth.refreshSession();
          if (data?.session) {
            // Retry original request once
            response = await originalFetch(input, init);
          } else {
            // Refresh failed, clear session and redirect to login
            console.error('Session refresh failed, redirecting to login...');
            window.location.replace('/login');
          }
        }
      }
      return response;
    };
    */

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const clipboardData = e.clipboardData || (window as any).clipboardData;
        if (!clipboardData) return;
        const pastedText = clipboardData.getData('text');
        if (!pastedText) return;

        // Zero-width spaces, RTL override, and other control/invisible character ranges
        const dangerousUnicodeRegex = /[\u200B-\u200D\uFEFF\u202E\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
        if (dangerousUnicodeRegex.test(pastedText)) {
          e.preventDefault();
          const sanitizedText = pastedText.replace(dangerousUnicodeRegex, '');
          
          const start = target.selectionStart || 0;
          const end = target.selectionEnd || 0;
          const val = target.value;
          
          target.value = val.substring(0, start) + sanitizedText + val.substring(end);
          target.selectionStart = target.selectionEnd = start + sanitizedText.length;
          
          // Trigger React onChange state synchronization
          const inputEvent = new Event('input', { bubbles: true });
          target.dispatchEvent(inputEvent);
          
          toast.error("Pasted content was sanitized for security");
        }
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
      // window.fetch = originalFetch;
    };
  }, []);

  // Close dropdowns on path change
  useEffect(() => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // Call the dynamic Groq-powered Chatbot endpoint
  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const updatedMessages: Array<{ sender: 'user' | 'assistant'; text: string }> = [
      ...chatMessages,
      { sender: 'user', text: userText }
    ];
    setChatMessages(updatedMessages);
    setChatInput('');

    // Add visual typing state placeholder
    setChatMessages((prev) => [...prev, { sender: 'assistant', text: 'Typing...' }]);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedMessages.filter(m => m.text !== 'Typing...') }),
      });

      const data = await response.json();
      if (response.ok && data.reply) {
        setChatMessages((prev) => {
          const filtered = prev.filter((m) => m.text !== 'Typing...');
          return [...filtered, { sender: 'assistant', text: data.reply }];
        });
      } else {
        throw new Error(data.error || 'Failed to fetch reply');
      }
    } catch (err: any) {
      setChatMessages((prev) => {
        const filtered = prev.filter((m) => m.text !== 'Typing...');
        return [...filtered, { sender: 'assistant', text: "Sorry, I'm having trouble connecting right now. Please check your connection or try again." }];
      });
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSubmitted(true);
    setNewsletterEmail('');
    setTimeout(() => setNewsletterSubmitted(false), 4000);
  };

  // Nav link helper
  const isLinkActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname?.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (path: string) =>
    `font-body-md text-body-md transition-colors ${
      isLinkActive(path)
        ? 'text-[#06B6D4] font-semibold'
        : 'text-on-surface-variant hover:text-[#06B6D4]'
    }`;

  // Shared chatbot renderer (unconditional on non-candidate and non-session pages)
  const renderChatbot = () => {
    if (pathname?.startsWith('/candidate') || pathname?.startsWith('/session/')) return null;
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {chatbotOpen ? (
          <div className="w-80 sm:w-96 h-[450px] border border-[#3b494b] bg-[#151d1e] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#06B6D4] to-indigo-600 flex items-center justify-between text-white select-none">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold font-mono">
                  CW
                </span>
                <div>
                  <p className="text-xs font-bold leading-none">CodeWalk</p>
                  <p className="text-[10px] text-white/80 mt-0.5">CodeWalk AI Agent</p>
                </div>
              </div>
              <button
                onClick={() => setChatbotOpen(false)}
                className="text-white hover:text-white/80 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Message History */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0d1515]/30">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-[#06B6D4] text-[#0d1515] font-semibold rounded-br-none'
                        : 'bg-[#151d1e] border border-[#3b494b] text-white rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSend} className="p-3 border-t border-[#3b494b] bg-[#151d1e] flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask me a question..."
                className="flex-1 px-3 py-1.5 border border-[#3b494b] rounded-xl bg-[#0d1515] text-xs text-white focus:outline-none focus:border-[#06B6D4]/50"
                suppressHydrationWarning={true}
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#06B6D4] text-[#0d1515] text-xs font-bold rounded-xl transition-all hover:opacity-90 active:scale-95"
              >
                Send
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setChatbotOpen(true)}
            className="h-14 w-14 rounded-full bg-gradient-to-tr from-[#06B6D4] to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-[#06B6D4]/30 hover:scale-110 active:scale-95 hover:rotate-6 transition-all border border-white/10"
            title="Chat with CodeWalk"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  const isDashboardOrAuth = 
    pathname === '/' ||
    pathname?.startsWith('/dashboard') || 
    pathname?.startsWith('/results') || 
    pathname?.startsWith('/history') || 
    pathname?.startsWith('/profile') || 
    pathname?.startsWith('/tokens') || 
    pathname?.startsWith('/login') || 
    pathname?.startsWith('/register') || 
    pathname?.startsWith('/signup') || 
    pathname?.startsWith('/verify-email') ||
    pathname?.startsWith('/auth/') ||
    pathname?.startsWith('/session') ||
    pathname?.startsWith('/candidate') ||
    pathname?.startsWith('/onboarding') ||
    pathname?.startsWith('/positions') ||
    pathname?.startsWith('/candidates') ||
    pathname?.startsWith('/take-home') ||
    pathname?.startsWith('/question-bank') ||
    pathname?.startsWith('/resume-extractor') ||
    pathname?.startsWith('/compare');

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white text-slate-900" style={{ backgroundColor: '#ffffff' }}>
        {children}
      </div>
    );
  }

  if (isDashboardOrAuth) {
    return (
      <>
        {children}
        {renderChatbot()}
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#fafbff' }}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300">
        <div className="w-full px-margin-desktop py-3 flex items-center justify-between">
          {/* Brand Logo with CW Icon */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
              CW
            </span>
            <span className="font-bold text-xl tracking-tight text-slate-800 select-none" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              CodeWalk
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 select-none">

            {/* ── Functions Mega-Dropdown ── */}
            <div className="relative" onMouseEnter={fnEnter} onMouseLeave={fnLeave}>
              <button
                id="nav-functions-btn"
                aria-haspopup="true"
                aria-expanded={functionsOpen}
                className={`flex items-center gap-1 text-sm font-medium transition-colors focus:outline-none cursor-pointer ${
                  functionsOpen ? 'text-violet-600' : 'text-slate-600 hover:text-violet-600'
                }`}
              >
                Functions
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-200 ${functionsOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {functionsOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 w-[640px]"
                  onMouseEnter={fnEnter} onMouseLeave={fnLeave}>
                  <div role="menu" aria-labelledby="nav-functions-btn"
                    className="rounded-2xl overflow-hidden"
                    style={{ background: '#ffffff', boxShadow: '0 16px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f0f0f5' }}>
                    <div className="grid grid-cols-3 gap-0">
                      {/* CORE FEATURES */}
                      <div className="p-5 border-r border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-violet-500">Core Features</p>
                        <div className="flex flex-col gap-1">
                          {[
                            { label: 'Repo-Based Questioning', href: '/features/repo-based-questioning' },
                            { label: 'JD-Based Assessment', href: '/features/jd-based-assessment' },
                            { label: 'Live AI Interview', href: '/features/live-ai-interview' },
                            { label: 'Technical Assessment', href: '/features/technical-assessment' },
                            { label: 'Behavioral Assessment', href: '/features/behavioral-assessment' },
                            { label: 'AI Proctoring', href: '/features/ai-proctoring' },
                          ].map((item) => (
                            <Link key={item.label} href={item.href} role="menuitem"
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:text-violet-600 hover:bg-violet-50 transition-all duration-150">
                              <span className="w-1 h-1 rounded-full flex-shrink-0 bg-violet-400" aria-hidden="true" />
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                      {/* HIRING SOLUTIONS */}
                      <div className="p-5 border-r border-gray-100">
                        <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-violet-500">Hiring Solutions</p>
                        <div className="flex flex-col gap-1">
                          {[
                            { label: 'High-Volume Hiring', href: '/features/high-volume-hiring' },
                            { label: 'Campus Recruiting', href: '/features/campus-recruiting' },
                          ].map((item) => (
                            <Link key={item.label} href={item.href} role="menuitem"
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:text-violet-600 hover:bg-violet-50 transition-all duration-150">
                              <span className="w-1 h-1 rounded-full flex-shrink-0 bg-pink-400" aria-hidden="true" />
                              {item.label}
                            </Link>
                          ))}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-3 mt-5 text-violet-500">Built For</p>
                        <div className="flex flex-col gap-1">
                          {[
                            { label: 'Software Engineering', href: '/features/software-engineering' },
                            { label: 'Data Science', href: '/features/data-science' },
                            { label: 'Machine Learning', href: '/features/machine-learning' },
                          ].map((item) => (
                            <Link key={item.label} href={item.href} role="menuitem"
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:text-violet-600 hover:bg-violet-50 transition-all duration-150">
                              <span className="w-1 h-1 rounded-full flex-shrink-0 bg-green-400" aria-hidden="true" />
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                      {/* CTA panel */}
                      <div className="p-5 flex flex-col justify-between" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.04), rgba(236,72,153,0.04))' }}>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-violet-500">Get Started</p>
                          <p className="text-xs text-slate-400 leading-relaxed">Walk through any codebase in under 60 seconds.</p>
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                          <Link href="/workspace" role="menuitem"
                            className="px-4 py-2 text-xs font-bold text-white rounded-xl text-center transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>Try Free</Link>
                          <Link href="/how-it-works" role="menuitem"
                            className="px-4 py-2 text-xs font-bold rounded-xl text-center border border-gray-200 text-slate-600 hover:bg-white transition-all">See How It Works</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Pricing ── */}
            <Link href="/pricing" className={navLinkClass('/pricing')}>
              Pricing
            </Link>

            {/* ── Resources Dropdown ── */}
            <div className="relative" onMouseEnter={resEnter} onMouseLeave={resLeave}>
              <button
                id="nav-resources-btn"
                aria-haspopup="true"
                aria-expanded={resourcesOpen}
                className={`flex items-center gap-1 text-sm font-medium transition-colors focus:outline-none cursor-pointer ${
                  resourcesOpen ? 'text-violet-600' : 'text-slate-600 hover:text-violet-600'
                }`}
              >
                Resources
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {resourcesOpen && (
                <div className="absolute top-full right-0 pt-2 z-50 w-52"
                  onMouseEnter={resEnter} onMouseLeave={resLeave}>
                  <div role="menu" aria-labelledby="nav-resources-btn"
                    className="rounded-2xl overflow-hidden"
                    style={{ background: '#ffffff', boxShadow: '0 16px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f0f0f5' }}>
                    <div className="p-2">
                      {[
                        { label: 'Blog', href: '/blog', desc: 'Articles & case studies' },
                        { label: 'Support', href: '/support', desc: 'Help center & FAQs' },
                        { label: 'About Us', href: '/about', desc: 'Our mission & team' },
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

          </nav>

          <div className="flex items-center gap-4">
            {/* User Profile / Auth buttons */}
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
                      className="h-10 w-10 rounded-full object-cover hover:scale-105 transition-all ring-2 ring-violet-200"
                    />
                  ) : (
                    <span className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm hover:scale-105 transition-all" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                      {user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
                    </span>
                  )}
                </button>
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-100 bg-white text-slate-800 py-2 z-50" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-[10px] text-slate-400">Signed in as</p>
                      <p className="text-sm font-semibold truncate text-slate-800">{user.name}</p>
                      <p className="text-[10px] font-medium text-violet-600 mt-0.5 px-2 py-0.5 bg-violet-50 rounded-full inline-block">
                        {subscription} Plan
                      </p>
                    </div>
                    <Link href="/dashboard" className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors">Recruiter Dashboard</Link>
                    <Link href="/history" className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors">Interview History</Link>
                    <Link href="/tokens" className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors">Token Logs &amp; Quotas</Link>
                    <Link href="/profile" className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors">Profile Settings</Link>
                    <Link href="/pricing" className="block px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors">Pricing Plans</Link>
                    <hr className="border-gray-100 my-1" />
                    <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">Login</Link>
                <Link href="/register" className="px-5 py-2 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-95" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 4px 14px rgba(124,58,237,0.25)' }}>Try Free</Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-text hover:text-primary hover:bg-muted-bg rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-4 border-b border-gray-100 bg-white text-slate-800 shadow-xl animate-in slide-in-from-top duration-300">
            <nav className="flex flex-col gap-1">

              {/* Functions accordion */}
              <button
                onClick={() => setMobileFunctionsOpen(!mobileFunctionsOpen)}
                className="flex items-center justify-between w-full py-2.5 text-sm font-semibold text-slate-700 hover:text-violet-600 transition-colors cursor-pointer"
              >
                Functions
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-200 ${mobileFunctionsOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {mobileFunctionsOpen && (
                <div className="pl-4 pb-2 flex flex-col gap-1 border-l-2 border-violet-200">
                  <p className="text-[9px] font-black uppercase tracking-widest pt-1 pb-0.5 text-violet-500">Core Features</p>
                  {['Repo-Based Questioning','JD-Based Assessment','Live AI Interview','Technical Assessment','Behavioral Assessment','AI Proctoring'].map(l => (
                    <Link key={l} href="/how-it-works" className="py-1 text-xs text-slate-500 hover:text-violet-600 transition-colors">{l}</Link>
                  ))}
                  <p className="text-[9px] font-black uppercase tracking-widest pt-2 pb-0.5 text-violet-500">Hiring Solutions</p>
                  {['High-Volume Hiring','Campus Recruiting'].map(l => (
                    <Link key={l} href="/pricing" className="py-1 text-xs text-slate-500 hover:text-violet-600 transition-colors">{l}</Link>
                  ))}
                  <p className="text-[9px] font-black uppercase tracking-widest pt-2 pb-0.5 text-violet-500">Built For</p>
                  {['Software Engineering','Data Science','Machine Learning'].map(l => (
                    <Link key={l} href="/how-it-works" className="py-1 text-xs text-slate-500 hover:text-violet-600 transition-colors">{l}</Link>
                  ))}
                </div>
              )}

              <Link href="/pricing" className="py-2.5 text-sm font-semibold text-slate-700 hover:text-violet-600 transition-colors border-t border-gray-100">
                Pricing
              </Link>

              {/* Resources accordion */}
              <button
                onClick={() => setMobileResourcesOpen(!mobileResourcesOpen)}
                className="flex items-center justify-between w-full py-2.5 text-sm font-semibold text-slate-700 hover:text-violet-600 transition-colors border-t border-gray-100 cursor-pointer"
              >
                Resources
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-200 ${mobileResourcesOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {mobileResourcesOpen && (
                <div className="pl-4 pb-2 flex flex-col gap-1 border-l-2 border-violet-200">
                  <Link href="/blog" className="py-1 text-xs text-slate-500 hover:text-violet-600 transition-colors">Blog</Link>
                  <Link href="/support" className="py-1 text-xs text-slate-500 hover:text-violet-600 transition-colors">Support</Link>
                  <Link href="/about" className="py-1 text-xs text-slate-500 hover:text-violet-600 transition-colors">About Us</Link>
                </div>
              )}
              {(!mounted || !user) ? (
                <div className="flex flex-col gap-2 border-t border-gray-100 pt-2">
                  <Link href="/login" className="w-full text-center py-2 text-slate-600 hover:text-violet-600 text-sm font-medium transition-colors">Login</Link>
                  <Link href="/register" className="w-full text-center py-2.5 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>Try Free</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2 border-t border-gray-100">
                  <p className="text-xs text-slate-400 px-2 pt-2">Dashboard</p>
                  <Link href="/dashboard" className="py-2 px-2 text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">Recruiter Dashboard</Link>
                  <Link href="/history" className="py-2 px-2 text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">Interview History</Link>
                  <Link href="/tokens" className="py-2 px-2 text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">Token Logs &amp; Quotas</Link>
                  <Link href="/profile" className="py-2 px-2 text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">Profile Settings</Link>
                  <Link href="/pricing" className="py-2 px-2 text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors">Pricing Plans</Link>
                  <button onClick={() => signOut()} className="w-full text-left py-2 px-2 text-sm font-medium text-red-500 hover:text-red-400 transition-colors">Sign Out</button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-gray-100 bg-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-md" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>CW</span>
                <span className="font-bold text-lg tracking-tight text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>CodeWalk</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">Enterprise-grade AI that indexes, understands, and leads candidates through your codebases dynamically.</p>
              <p className="text-xs text-slate-300">&copy; {new Date().getFullYear()} CodeWalk Inc. All rights reserved.</p>
            </div>
            {/* Product */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Product</h3>
              <Link href="/workspace" className="text-sm text-slate-500 hover:text-violet-600 transition-colors">Workspace</Link>
              <Link href="/pricing" className="text-sm text-slate-500 hover:text-violet-600 transition-colors">Pricing</Link>
              <Link href="/how-it-works" className="text-sm text-slate-500 hover:text-violet-600 transition-colors">How It Works</Link>
            </div>
            {/* Resources */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Resources</h3>
              <Link href="/blog" className="text-sm text-slate-500 hover:text-violet-600 transition-colors">Blog</Link>
              <Link href="/support" className="text-sm text-slate-500 hover:text-violet-600 transition-colors">Support</Link>
              <Link href="/about" className="text-sm text-slate-500 hover:text-violet-600 transition-colors">About Us</Link>
            </div>
            {/* Newsletter */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Stay Updated</h3>
              <p className="text-xs text-slate-400">Subscribe for AI hiring insights.</p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <input type="email" value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)} placeholder="name@company.com"
                  className="px-3 py-1.5 border border-gray-200 bg-white text-xs rounded-lg w-full focus:outline-none focus:border-violet-400 text-slate-700" required suppressHydrationWarning={true} />
                <button type="submit" className="px-3 py-1.5 text-white text-xs font-bold rounded-lg transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>Join</button>
              </form>
              {newsletterSubmitted && <span className="text-[10px] text-green-500 font-semibold">✓ Successfully subscribed!</span>}
            </div>
          </div>
        </div>
      </footer>

      {renderChatbot()}
    </div>
  );
}
