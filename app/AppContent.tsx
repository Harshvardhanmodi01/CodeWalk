'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const { user, signOut, theme, toggleTheme, subscription } = useGlobal();
  const pathname = usePathname();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  
  // Chatbot states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    { 
      sender: 'assistant', 
      text: "Hi! I'm Taylor, your CodeWalk AI agent. How can I help you understand CodeWalk features, workflows, or pricing today?" 
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

  // Shared chatbot renderer (unconditional on non-candidate pages)
  const renderChatbot = () => {
    if (pathname?.startsWith('/candidate')) return null;
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {chatbotOpen ? (
          <div className="w-80 sm:w-96 h-[450px] border border-[#3b494b] bg-[#151d1e] text-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#06B6D4] to-indigo-600 flex items-center justify-between text-white select-none">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold font-mono">
                  TG
                </span>
                <div>
                  <p className="text-xs font-bold leading-none">Taylor Griggs</p>
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
            title="Chat with Taylor"
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
    pathname?.startsWith('/onboarding');

  if (isDashboardOrAuth) {
    return (
      <>
        {children}
        {renderChatbot()}
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen glean-grid">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-outline-variant bg-surface/80 backdrop-blur-md">
        <div className="w-full px-margin-desktop py-3 flex items-center justify-between">
          {/* Brand Logo with CW Icon */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-400 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-cyan-500/20">
              CW
            </span>
            <span className="font-bold text-xl tracking-tight text-white select-none">
              CodeWalk
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 select-none">
            <Link href="/workspace" className={navLinkClass('/workspace')}>
              Workspace
            </Link>
            <Link href="/how-it-works" className={navLinkClass('/how-it-works')}>
              How It Works
            </Link>
            <Link href="/pricing" className={navLinkClass('/pricing')}>
              Pricing
            </Link>
            <Link href="/about" className={navLinkClass('/about')}>
              About Us
            </Link>
            <Link href="/blog" className={navLinkClass('/blog')}>
              Blog
            </Link>
            <Link href="/support" className={navLinkClass('/support')}>
              Support
            </Link>
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
                    <img 
                      src={avatarUrlToDisplay} 
                      alt="Profile Avatar" 
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
          <div className="md:hidden px-4 pt-2 pb-4 border-b border-outline-variant bg-[#151d1e] text-white shadow-xl animate-in slide-in-from-top duration-300">
            <nav className="flex flex-col gap-3">
              <Link href="/workspace" className="py-2 text-sm font-medium hover:text-[#06B6D4]">
                Workspace
              </Link>
              <Link href="/how-it-works" className="py-2 text-sm font-medium hover:text-[#06B6D4]">
                How It Works
              </Link>
              <Link href="/pricing" className="py-2 text-sm font-medium hover:text-[#06B6D4]">
                Pricing
              </Link>
              <Link href="/about" className="py-2 text-sm font-medium hover:text-[#06B6D4]">
                About Us
              </Link>
              <Link href="/blog" className="py-2 text-sm font-medium hover:text-[#06B6D4]">
                Blog
              </Link>
              <Link href="/support" className="py-2 text-sm font-medium hover:text-[#06B6D4]">
                Support
              </Link>
              {(!mounted || !user) ? (
                <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/60">
                  <Link
                    href="/login"
                    className="w-full text-center py-2 text-on-surface hover:text-[#06B6D4] font-label-sm text-label-sm transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="w-full text-center py-2 bg-[#06B6D4] text-white rounded-xl font-label-sm text-label-sm font-bold glow-cyan hover:opacity-90 transition-all"
                  >
                    Try Free
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/60">
                  <p className="text-xs text-muted-text px-2">Dashboard Functions</p>
                  <Link href="/dashboard" className="py-2 px-2 text-sm font-medium hover:text-[#06B6D4]">
                    Recruiter Dashboard
                  </Link>
                  <Link href="/history" className="py-2 px-2 text-sm font-medium hover:text-[#06B6D4]">
                    Interview History
                  </Link>
                  <Link href="/tokens" className="py-2 px-2 text-sm font-medium hover:text-[#06B6D4]">
                    Token Logs & Quotas
                  </Link>
                  <Link href="/profile" className="py-2 px-2 text-sm font-medium hover:text-[#06B6D4]">
                    Profile Settings
                  </Link>
                  <Link href="/pricing" className="py-2 px-2 text-sm font-medium hover:text-[#06B6D4]">
                    Pricing Plans
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left py-2 px-2 text-sm font-medium text-red-400 hover:text-red-300"
                  >
                    Sign Out
                  </button>
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
      <footer className="w-full border-t border-border-main bg-muted-bg/50 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Brand */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center text-white font-extrabold text-md shadow-md shadow-primary/10">
                  CW
                </span>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-text-main to-primary bg-clip-text text-transparent">
                  CodeWalk
                </span>
              </div>
              <p className="text-xs text-muted-text leading-relaxed">
                Enterprise-grade AI that indexes, understands, and leads candidates or teams through your codebases dynamically.
              </p>
              <p className="text-xs text-muted-text">
                &copy; {new Date().getFullYear()} CodeWalk Inc. All rights reserved.
              </p>
            </div>

            {/* Column 2: Product */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-main">Product</h3>
              <Link href="/workspace" className="text-xs text-muted-text hover:text-primary transition-colors">
                Workspace
              </Link>
              <Link href="/pricing" className="text-xs text-muted-text hover:text-primary transition-colors">
                Pricing Plans
              </Link>
              <Link href="/tokens" className="text-xs text-muted-text hover:text-primary transition-colors">
                Tokens Dashboard
              </Link>
            </div>

            {/* Column 3: Resources & Support */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-main">Resources</h3>
              <Link href="/blog" className="text-xs text-muted-text hover:text-primary transition-colors">
                Blog & Reviews
              </Link>
              <Link href="/support" className="text-xs text-muted-text hover:text-primary transition-colors">
                Support Center
              </Link>
              <Link href="/policy" className="text-xs text-muted-text hover:text-primary transition-colors">
                Privacy & Terms
              </Link>
            </div>

            {/* Column 4: Newsletter */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-main">Stay Updated</h3>
              <p className="text-xs text-muted-text">Subscribe to our newsletter for AI updates.</p>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="px-3 py-1.5 border border-border-main bg-card-main text-xs rounded-lg w-full focus:outline-none focus:border-primary/50 text-text-main"
                  required
                  suppressHydrationWarning={true}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Join
                </button>
              </form>
              {newsletterSubmitted && (
                <span className="text-[10px] text-green-500 font-semibold animate-pulse">
                  ✓ Successfully subscribed! Check your inbox.
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>

      {renderChatbot()}
    </div>
  );
}
