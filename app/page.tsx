'use client';

import React from 'react';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import BeforeAfterSection from '@/components/landing/BeforeAfterSection';
import SocialProof from '@/components/landing/SocialProof';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col selection:bg-primary-fixed selection:text-on-primary-fixed overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Hero Banner with Terminal Simulation */}
      <HeroSection />

      {/* Before / After split review details */}
      <div className="container max-w-container-max mx-auto px-margin-desktop space-y-32 pb-24">
        <BeforeAfterSection />
        
        <SocialProof />
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-outline-variant px-margin-desktop bg-surface-container-lowest mt-auto">
        <div className="container max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="font-headline-md text-headline-md font-bold text-primary-fixed">CodeWalk</span>
            <span className="text-on-surface-variant/40 text-[10px] uppercase tracking-tighter">&copy; 2026 CodeWalk AI Systems</span>
          </div>
          <div className="flex gap-8">
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors" href="#">Privacy</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors" href="#">Terms</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors" href="#">Security</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-fixed transition-colors" href="#">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}