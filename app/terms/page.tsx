import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — CodeWalk',
  description: 'Review the terms and rules of using the CodeWalk platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0d1515] text-[#F1F5F9] font-sans flex flex-col">
      {/* Navigation Header */}
      <header className="px-8 py-4 bg-[#151d1e] border-b border-[#3b494b] flex justify-between items-center select-none">
        <Link href="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#06B6D4] text-2xl font-bold">terminal</span>
          <span className="font-mono text-base font-bold text-white tracking-wider">CodeWalk</span>
        </Link>
        <Link href="/login" className="text-xs font-bold text-[#06B6D4] hover:text-[#06B6D4]/80 transition-colors uppercase tracking-wider">
          Sign In
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Terms of Service</h1>
          <p className="text-xs font-mono text-[#06B6D4]">Last Updated: July 7, 2026</p>
        </div>

        <hr className="border-[#3b494b]/50" />

        <div className="space-y-6 text-sm text-[#94A3B8] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 1. Acceptable Use
            </h2>
            <p>
              By accessing or using CodeWalk, you agree to comply with these terms. You agree not to abuse the platform, bypass rate limits, perform unauthorized IDOR access attempts on resources you do not own, or submit files containing malicious scripts or spoofed magic byte headers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 2. Account Security
            </h2>
            <p>
              You are responsible for maintaining the security of your recruiter account and password. You agree to use strong password credentials (complying with our strength validator of at least 8 characters, with casing, digit, and symbol constraints) and to prevent unauthorized access. CodeWalk is not liable for data leakage resulting from weak credentials or credentials shared in violation of these terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 3. Subscription & Quota Limits
            </h2>
            <p>
              Default quotas (5 initial free tokens) are set for all onboarding recruiters. Attempts to update quotas, plans, or usage via unauthorized client-side query manipulation constitute a violation of service terms and will trigger account lockouts and security logging.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 4. Limitation of Liability
            </h2>
            <p>
              CodeWalk provides candidate assessment reports and code comprehension utilities for informational purposes. While we employ secure, state-of-the-art LLM evaluations, we do not guarantee specific hiring outcomes or error-free parsing of non-compliant candidate resumes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 5. Updates to Terms
            </h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of CodeWalk following any updates constitutes acceptance of the new Terms of Service.
            </p>
          </section>
        </div>

        <div className="pt-8 flex justify-center">
          <Link href="/" className="text-xs font-bold text-[#06B6D4] hover:underline uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">arrow_back</span> Back to Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 bg-[#151d1e] border-t border-[#3b494b] text-center text-[10px] text-[#94A3B8] select-none">
        &copy; 2026 CodeWalk Inc. All rights reserved.
      </footer>
    </div>
  );
}
