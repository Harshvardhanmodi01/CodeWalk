'use client';

import React from 'react';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import SocialProof from '@/components/landing/SocialProof';
import Link from 'next/link';

import { useGlobal } from '@/app/context/GlobalContext';

export default function LandingPage() {
  const { user } = useGlobal();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-background text-foreground font-body-md min-h-screen flex flex-col selection:bg-primary selection:text-white overflow-x-hidden transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Hero Banner with Terminal Simulation */}
      <HeroSection />

      {/* Social Proof & Feature Bento Grid */}
      <div className="container max-w-container-max mx-auto px-margin-desktop space-y-24 pb-24 z-10 relative">
        <SocialProof />
        
        {/* Bottom CTA Card */}
        <section className="relative rounded-3xl overflow-hidden border border-border-main bg-card-main p-8 sm:p-12 text-center space-y-6 max-w-4xl mx-auto glow-cyan shadow-xl">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary-container/15 rounded-full blur-3xl" />
          
          <div className="relative z-10 space-y-3">
            <h3 className="font-headline-lg text-2xl sm:text-3xl text-foreground font-extrabold">Ready to walk your codebases?</h3>
            <p className="font-body-md text-xs sm:text-sm text-muted-text max-w-lg mx-auto leading-relaxed">
              Join professional engineering teams and technical screeners leveraging automated intelligence to map candidate capabilities.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-center justify-center pt-2">
            {mounted && user ? (
              <Link 
                href="/dashboard" 
                className="w-full sm:w-auto px-8 py-3 bg-primary text-white font-label-sm text-label-sm font-bold shadow-[0_0_15px_rgba(0,219,233,0.3)] hover:opacity-90 transition-all active:scale-95 rounded-lg flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm font-bold">dashboard</span>
                Go to Recruiter Dashboard
              </Link>
            ) : (
              <Link 
                href="/register" 
                className="w-full sm:w-auto px-8 py-3 bg-primary text-white font-label-sm text-label-sm font-bold shadow-[0_0_15px_rgba(0,219,233,0.3)] hover:opacity-90 transition-all active:scale-95 rounded-lg"
              >
                Get Started For Free
              </Link>
            )}
            <Link 
              href="/pricing" 
              className="w-full sm:w-auto px-8 py-3 border border-border-main text-foreground hover:bg-muted-background font-label-sm text-label-sm font-bold transition-all active:scale-95 rounded-lg"
            >
              View Pricing Tiers
            </Link>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-border-main px-margin-desktop bg-muted-background mt-auto z-10 relative transition-colors duration-300">
        <div className="container max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md animate-pulse">
                CW
              </span>
              <span className="font-headline-md text-headline-md font-bold text-primary">CodeWalk</span>
            </div>
            <span className="text-muted-text text-[10px] uppercase tracking-tighter pt-1">&copy; {new Date().getFullYear()} CodeWalk AI Systems</span>
          </div>
          <div className="flex gap-8">
            <Link className="font-label-sm text-label-sm text-muted-text hover:text-primary transition-colors" href="/policy">Privacy &amp; Terms</Link>
            <Link className="font-label-sm text-label-sm text-muted-text hover:text-primary transition-colors" href="/support">Support</Link>
            <Link className="font-label-sm text-label-sm text-muted-text hover:text-primary transition-colors" href="/about">About</Link>
            <Link className="font-label-sm text-label-sm text-muted-text hover:text-primary transition-colors" href="/blog">Blog</Link>
            <Link className="font-label-sm text-label-sm text-muted-text hover:text-primary transition-colors" href="/how-it-works">How it Works</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}