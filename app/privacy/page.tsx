import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — CodeWalk',
  description: 'Learn how CodeWalk collects, protects, and handles your data.',
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Privacy Policy</h1>
          <p className="text-xs font-mono text-[#06B6D4]">Last Updated: July 7, 2026</p>
        </div>

        <hr className="border-[#3b494b]/50" />

        <div className="space-y-6 text-sm text-[#94A3B8] leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 1. Introduction
            </h2>
            <p>
              Welcome to CodeWalk. We value your privacy and are committed to protecting your personal data. This Privacy Policy outlines how we collect, use, store, and share your information when you use our platform, including our recruiter dashboard and automated candidate coding assessments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 2. Data We Collect
            </h2>
            <p>
              We collect information to provide better services to our users and candidates:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1.5">
              <li><strong className="text-white">Account Information:</strong> Name, email address, password, company name, and profile photos.</li>
              <li><strong className="text-white">Candidate Information:</strong> Resumes (PDF), GitHub profiles, candidate code submissions, notes, fit scores, and evaluations.</li>
              <li><strong className="text-white">Integration Data:</strong> Connected GitHub repositories, repository structures, and code files selected for walkthroughs.</li>
              <li><strong className="text-white">Usage & Cookies:</strong> Session tokens, rate limiting records, log activity, and cookie preferences.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 3. How We Use Your Data
            </h2>
            <p>
              Your data is processed strictly for the following purposes:
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1.5">
              <li>To initialize your dashboard profile and manage your assessment tokens.</li>
              <li>To parse candidate resumes using secure sandbox environments and AI engines.</li>
              <li>To evaluate candidate answers, logical reasoning, and generate detailed interview reports.</li>
              <li>To secure our APIs, detect and log potential IDOR/Mass Assignment attempts, and prevent security abuses.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 4. Data Retention & Deletion
            </h2>
            <p>
              We store your data as long as your account remains active. Under GDPR and other data protection regulations, you have the right to request deletion. You can invoke your <strong className="text-white">Right to Deletion</strong> directly through the "Danger Zone" in your Settings profile, which permanently deletes all candidate records, assessment sessions, reports, profile info, and auth credentials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 5. Security Measures
            </h2>
            <p>
              We implement industry-standard security features to protect your data, including Content Security Policy (CSP), encrypted passwords via bcrypt hashing, strict IDOR middleware checking, rate limiting, and HTTP-only cookie-based session management.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 select-none">
              <span className="text-[#06B6D4] font-mono">&gt;</span> 6. Contact Us
            </h2>
            <p>
              If you have any questions or concerns regarding our privacy practices, please contact us at <span className="text-[#06B6D4] font-mono">security@codewalk.io</span>.
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
