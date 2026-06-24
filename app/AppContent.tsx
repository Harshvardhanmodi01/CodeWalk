'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const { user, signOut, theme, toggleTheme, subscription } = useGlobal();
  const pathname = usePathname();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    { sender: 'assistant', text: "Hi! I'm Taylor, your CodeWalk AI agent. How can I help you understand your codebase today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdowns on path change
  useEffect(() => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');

    // Simulate AI response
    setTimeout(() => {
      let reply = "I'm here to help! You can connect your GitHub repositories in the Workspace tab and start walking through your code files line by line.";
      if (userText.toLowerCase().includes('price') || userText.toLowerCase().includes('cost')) {
        reply = "CodeWalk offers a Free tier with 50,000 tokens and a Pro tier ($19/mo) with 1,000,000 tokens. Check out our Pricing page!";
      } else if (userText.toLowerCase().includes('token')) {
        reply = "Tokens are used to analyze your code repositories. Analyzing a typical repository root consumes around 2,000 to 5,000 tokens. You can track your usage on the Tokens page.";
      } else if (userText.toLowerCase().includes('auth') || userText.toLowerCase().includes('login')) {
        reply = "You can sign up or log in using the links in the header. Once authenticated, your token usage and company details will be saved to your profile.";
      }
      setChatMessages((prev) => [...prev, { sender: 'assistant', text: reply }]);
    }, 1000);
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
    `text-sm font-medium transition-colors hover:text-primary ${
      isLinkActive(path) ? 'text-primary' : 'text-muted-text'
    }`;

  const isDashboardOrAuth = 
    pathname === '/' ||
    pathname?.startsWith('/dashboard') || 
    pathname?.startsWith('/results') || 
    pathname?.startsWith('/history') || 
    pathname?.startsWith('/profile') || 
    pathname?.startsWith('/tokens') || 
    pathname?.startsWith('/login') || 
    pathname?.startsWith('/signup') || 
    pathname?.startsWith('/verify-email');

  if (isDashboardOrAuth) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen glean-grid">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-border-main glassmorphism">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-primary/20">
                CW
              </span>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-text-main to-primary bg-clip-text text-transparent">
                CodeWalk
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/workspace" className={navLinkClass('/workspace')}>
                Workspace
              </Link>
              <Link href="/tokens" className={navLinkClass('/tokens')}>
                Tokens
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
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input (Design Only) */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 border border-border-main bg-muted-bg rounded-lg w-48 text-muted-text focus-within:w-64 focus-within:border-primary/50 transition-all duration-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-xs w-full focus:outline-none text-text-main placeholder-muted-text/60"
                suppressHydrationWarning={true}
              />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-muted-text hover:text-primary hover:bg-muted-bg rounded-lg transition-all"
              title="Toggle Theme"
            >
              {mounted && theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m2.828 0l.707-.707M17.657 6.343l.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* User Profile / Auth buttons */}
            {mounted && user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  <span className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-sm hover:scale-105 transition-all">
                    {user.name.slice(0, 2).toUpperCase()}
                  </span>
                </button>
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border-main bg-card-main text-card-text shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-border-main">
                      <p className="text-xs text-muted-text">Signed in as</p>
                      <p className="text-sm font-semibold truncate">{user.name}</p>
                      <p className="text-xs font-mono text-primary mt-1 px-2 py-0.5 bg-primary/10 rounded-full inline-block">
                        {subscription} Plan
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm hover:bg-muted-bg transition-colors"
                    >
                      Profile Settings
                    </Link>
                    <Link
                      href="/tokens"
                      className="block px-4 py-2 text-sm hover:bg-muted-bg transition-colors"
                    >
                      Usage Dashboard
                    </Link>
                    <hr className="border-border-main my-1" />
                    <button
                      onClick={signOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-muted-bg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 border border-border-main text-sm font-medium rounded-xl hover:bg-muted-bg transition-all"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-xl transition-all shadow-md shadow-primary/10 hover:shadow-primary/20 hover:scale-[1.02]"
                >
                  Get started
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
          <div className="md:hidden px-4 pt-2 pb-4 border-b border-border-main bg-card-main animate-in slide-in-from-top duration-300">
            <nav className="flex flex-col gap-3">
              <Link href="/workspace" className="py-2 text-sm font-medium hover:text-primary">
                Workspace
              </Link>
              <Link href="/tokens" className="py-2 text-sm font-medium hover:text-primary">
                Tokens
              </Link>
              <Link href="/pricing" className="py-2 text-sm font-medium hover:text-primary">
                Pricing
              </Link>
              <Link href="/about" className="py-2 text-sm font-medium hover:text-primary">
                About Us
              </Link>
              <Link href="/blog" className="py-2 text-sm font-medium hover:text-primary">
                Blog
              </Link>
              <Link href="/support" className="py-2 text-sm font-medium hover:text-primary">
                Support
              </Link>
              {(!mounted || !user) && (
                <div className="flex flex-col gap-2 pt-2 border-t border-border-main">
                  <Link
                    href="/auth/signin"
                    className="w-full text-center py-2 border border-border-main rounded-xl text-sm font-medium hover:bg-muted-bg"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="w-full text-center py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover"
                  >
                    Get started
                  </Link>
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

      {/* FLOATING AI ASSISTANT CHATBOT */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatbotOpen ? (
          <div className="w-80 sm:w-96 h-[450px] border border-border-main bg-card-main text-card-text rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-primary to-indigo-600 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
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
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted-bg/30">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-muted-bg border border-border-main text-text-main rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSend} className="p-3 border-t border-border-main bg-card-main flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask me a question..."
                className="flex-1 px-3 py-1.5 border border-border-main rounded-xl bg-muted-bg text-xs text-text-main focus:outline-none focus:border-primary/50"
                suppressHydrationWarning={true}
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setChatbotOpen(true)}
            className="h-14 w-14 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 hover:rotate-6 transition-all border border-white/10"
            title="Chat with Taylor"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
