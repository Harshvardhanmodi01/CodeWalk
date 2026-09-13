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
    <div className="bg-white text-slate-900 min-h-screen flex flex-col overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar />

      {/* Hero */}
      <HeroSection />

      {/* Main content */}
      <div className="w-full max-w-[1280px] mx-auto px-6 md:px-12 space-y-28 pb-28 z-10 relative mt-4">
        <SocialProof />

        {/* ── Bottom CTA ── */}
        <section className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center">
          {/* Background gradient */}
          <div className="absolute inset-0 rounded-3xl"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 60%, #f97066 100%)' }} />
          {/* Soft blobs inside */}
          <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full opacity-30 pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.25)', filter: 'blur(30px)' }} />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'rgba(255,255,255,0.20)', filter: 'blur(40px)' }} />
          {/* Dot pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none rounded-3xl"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="relative z-10 space-y-4">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Ready to walk your codebases?
            </h3>
            <p className="text-white/80 text-base max-w-lg mx-auto leading-relaxed">
              Join engineering teams and technical screeners leveraging AI to map candidate capabilities with precision.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row gap-3 items-center justify-center pt-8">
            {mounted && user ? (
              <Link href="/dashboard"
                className="w-full sm:w-auto px-8 py-3.5 bg-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95"
                style={{ color: '#7c3aed' }}>
                <span className="material-symbols-outlined text-base">dashboard</span>
                Go to Recruiter Dashboard
              </Link>
            ) : (
              <Link href="/register"
                className="w-full sm:w-auto px-8 py-3.5 bg-white font-bold text-sm rounded-xl hover:shadow-lg transition-all active:scale-95"
                style={{ color: '#7c3aed' }}>
                Get Started For Free
              </Link>
            )}
            <Link href="/pricing"
              className="w-full sm:w-auto px-8 py-3.5 border-2 border-white/50 text-white font-bold text-sm rounded-xl hover:bg-white/10 transition-all active:scale-95">
              View Pricing Tiers
            </Link>
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white mt-auto">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="h-8 w-8 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-md"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                  CW
                </span>
                <span className="font-bold text-lg tracking-tight text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  CodeWalk
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                AI-powered technical interview intelligence that analyzes codebases to generate precision questions.
              </p>
              <p className="text-xs text-slate-300 mt-6">© {new Date().getFullYear()} CodeWalk AI Systems</p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Product</p>
              <div className="flex flex-col gap-3">
                {[['Workspace', '/workspace'], ['How It Works', '/how-it-works'], ['Pricing', '/pricing']].map(([l, h]) => (
                  <Link key={l} href={h} className="text-sm text-slate-500 hover:text-violet-600 transition-colors">{l}</Link>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Resources</p>
              <div className="flex flex-col gap-3">
                {[['Blog', '/blog'], ['Support', '/support'], ['About Us', '/about']].map(([l, h]) => (
                  <Link key={l} href={h} className="text-sm text-slate-500 hover:text-violet-600 transition-colors">{l}</Link>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Legal</p>
              <div className="flex flex-col gap-3">
                {[['Privacy & Terms', '/policy'], ['Cookie Policy', '/privacy']].map(([l, h]) => (
                  <Link key={l} href={h} className="text-sm text-slate-500 hover:text-violet-600 transition-colors">{l}</Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}