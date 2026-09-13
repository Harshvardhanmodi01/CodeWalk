'use client';

import React from 'react';
import Link from 'next/link';
import ScrollReveal from './ScrollReveal';

/* ── Feature grid (top 6 boxes) ────────────────────────────────── */
const featureGrid = [
  { icon: 'forum',       iconClass: 'icon-bg-coral',   title: 'Repo-Based Questioning',  desc: 'Generate questions from any GitHub repository. Understand code, architecture.' },
  { icon: 'description', iconClass: 'icon-bg-violet',  title: 'Job Description Based',   desc: 'Create role-specific questions tailored to your job description.' },
  { icon: 'videocam',    iconClass: 'icon-bg-pink',    title: 'Live Interview',           desc: 'Conduct real-time interviews with AI or human interviewers.' },
  { icon: 'code',        iconClass: 'icon-bg-yellow',  title: 'Live Coding',             desc: 'Evaluate candidates with real-time coding in our powerful IDE.' },
  { icon: 'psychology',  iconClass: 'icon-bg-green',   title: 'Technical Assessment',    desc: 'Assess DSA, system design, and real-world problem solving.' },
  { icon: 'verified',    iconClass: 'icon-bg-violet',  title: 'Behavioral Assessment',   desc: 'Understand soft skills, communication & leadership.' },
];

/* ── Stats ──────────────────────────────────────────────────────── */
const stats = [
  { value: '90 Hrs', label: 'Saved per Interviewer', sub: 'Per quarter on average', icon: '⏱️' },
  { value: '98.7%', label: 'Question Accuracy',       sub: 'Verified by expert engineers', icon: '🎯' },
  { value: '12K+',  label: 'Interviews Conducted',   sub: 'Across 500+ teams', icon: '🚀' },
  { value: '4.9/5', label: 'User Rating',             sub: 'Based on 2,000+ reviews', icon: '⭐' },
];

/* ── Advanced Capabilities ──────────────────────────────────────── */
const advancedCaps = [
  {
    icon: 'terminal',
    iconClass: 'icon-bg-violet',
    title: 'Deep Repo Crawl',
    desc: "We don't just look at file names. We parse ASTs, inspect hook lifecycles, read schemas, and identify true architectural patterns.",
    badge: 'AST Parsing',
  },
  {
    icon: 'psychology',
    iconClass: 'icon-bg-coral',
    title: 'AI Interviewer',
    desc: 'Generate line-level and codebase-wide questions mapping to code logic, project architecture, and real-world domain expertise.',
    badge: 'LLM-Powered',
  },
  {
    icon: 'verified',
    iconClass: 'icon-bg-green',
    title: 'Skill Verification',
    desc: 'Generate PDF scorecards, rate response categories, log interviewer remarks, and compile a clear technical capability index.',
    badge: 'PDF Export',
  },
  {
    icon: 'auto_awesome',
    iconClass: 'icon-bg-pink',
    title: 'Recruiter Copilot',
    desc: 'Real-time AI suggestions during the interview — follow-up questions, scoring hints, and red-flag detection as candidates answer.',
    badge: 'Real-time AI',
  },
  {
    icon: 'lock_open',
    iconClass: 'icon-bg-yellow',
    title: 'AI Proctoring',
    desc: 'Ensure integrity with AI-powered proctoring, tab-switch detection, and suspicious activity alerts during live sessions.',
    badge: 'Zero Cheating',
  },
  {
    icon: 'analytics',
    iconClass: 'icon-bg-violet',
    title: 'Hiring Analytics',
    desc: 'Track pipeline velocity, pass rates, interviewer calibration, and skill-gap trends across your entire hiring org.',
    badge: 'Dashboards',
  },
];

/* ── How It Works steps ──────────────────────────────────────────── */
const howItWorks = [
  {
    step: '01',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>
    ),
    color: 'icon-bg-violet',
    title: 'Connect Repository',
    desc: 'Paste any public GitHub repo URL or connect your private repos via OAuth. Supports all major languages.',
  },
  {
    step: '02',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    color: 'icon-bg-coral',
    title: 'AI Deep Analysis',
    desc: 'Our AI crawls the full file tree, parses ASTs, reads key source files, and identifies unique architectural decisions.',
  },
  {
    step: '03',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    color: 'icon-bg-pink',
    title: 'Generate Questions',
    desc: 'Precision interview questions are generated with difficulty tags, code snippets, category labels, and AI answer keys.',
  },
  {
    step: '04',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    color: 'icon-bg-green',
    title: 'Run Live Interview',
    desc: 'Launch AI or human-led interviews with live coding, behavioral assessments, and real-time copilot assistance.',
  },
  {
    step: '05',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'icon-bg-yellow',
    title: 'Score & Export',
    desc: 'Rate candidate responses, capture notes, and generate a professional PDF scorecard — shareable with your entire hiring team.',
  },
];

/* ── Blog posts ──────────────────────────────────────────────────── */
const blogs = [
  {
    tag: 'AI Hiring',
    tagColor: 'text-violet-600 bg-violet-50',
    title: 'How AI is Transforming Technical Interviews in 2026',
    desc: 'Explore how AI-powered platforms are making interviews more objective, scalable, and data-driven.',
    date: 'May 2, 2026',
    read: '6 min read',
    gradient: 'from-violet-500 to-pink-500',
  },
  {
    tag: 'Best Practices',
    tagColor: 'text-coral-600 bg-orange-50',
    title: 'Top 10 AI Interview Questions for Software Engineers',
    desc: 'A curated list of must-know AI-generated questions asked by top tech companies in senior engineer interviews.',
    date: 'Apr 26, 2026',
    read: '8 min read',
    gradient: 'from-pink-500 to-orange-400',
  },
  {
    tag: 'Innovation',
    tagColor: 'text-green-700 bg-green-50',
    title: 'Repo-Based Interviews: The Future of Candidate Evaluation',
    desc: 'Why analyzing real codebases leads to better hiring decisions and deeper technical validation.',
    date: 'Apr 13, 2026',
    read: '7 min read',
    gradient: 'from-emerald-500 to-cyan-500',
  },
];

export default function SocialProof() {
  return (
    <div className="w-full space-y-28 z-10 relative">

      {/* ── POWERFUL FEATURES SECTION ── */}
      <section className="py-16 relative">
        <ScrollReveal>
          <div className="text-center mb-4">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#f97066' }}>
              Powerful Features
            </span>
          </div>
        </ScrollReveal>

        <ScrollReveal stagger={2}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4 leading-tight"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0f172a' }}>
            Everything you need to{' '}
            <span style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 55%, #f97066 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              hire better
            </span>
          </h2>
        </ScrollReveal>
        <ScrollReveal stagger={3}>
          <p className="text-slate-600 font-medium text-base text-center max-w-xl mx-auto mb-12">
            From deep code analysis to live AI interviews — CodeWalk gives your team an unfair advantage in technical hiring.
          </p>
        </ScrollReveal>

        {/* 6-col feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureGrid.map((f, i) => (
            <ScrollReveal key={f.title} stagger={((i % 4) + 1) as 1|2|3|4}>
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 cursor-default group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.iconClass}`}>
                  <span className="material-symbols-outlined text-xl">{f.icon}</span>
                </div>
                <h3 className="text-sm font-bold mb-1.5 group-hover:text-violet-700 transition-colors"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0f172a' }}>
                  {f.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">{f.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── STATS / SPECIFICATIONS BAR ── */}
      <section className="relative">
        <div className="rounded-3xl overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 55%, #f97066 100%)' }}>
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/20 divide-y lg:divide-y-0">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center justify-center gap-1 py-10 px-6 text-center">
                <span className="text-3xl mb-1">{s.icon}</span>
                <p className="text-4xl font-extrabold text-white tracking-tight"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {s.value}
                </p>
                <p className="text-sm font-bold text-white/90">{s.label}</p>
                <p className="text-xs text-white/60 font-medium">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ADVANCED CAPABILITIES ── */}
      <section className="relative">
        <div className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.03) 0%, rgba(236,72,153,0.03) 100%)',
            border: '1px solid rgba(124,58,237,0.08)',
          }} />
        <div className="relative py-14 px-8 sm:px-12 rounded-3xl">
          <ScrollReveal>
            <div className="text-center mb-4">
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#7c3aed' }}>
                Advanced Capabilities
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-4"
              style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0f172a' }}>
              Built for precision at every layer
            </h2>
            <p className="text-slate-600 font-medium text-base text-center max-w-xl mx-auto mb-12">
              Six deep capabilities working in concert to eliminate bad hires and accelerate your pipeline.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advancedCaps.map((f, i) => (
              <ScrollReveal key={f.title} stagger={((i % 4) + 1) as 1|2|3|4}>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.iconClass}`}>
                      <span className="material-symbols-outlined text-2xl">{f.icon}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                      style={{ background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.20)', color: '#7c3aed' }}>
                      {f.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-base mb-2 group-hover:text-violet-700 transition-colors"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0f172a' }}>
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — FULL PROCESS ── */}
      <section className="py-4">
        <ScrollReveal>
          <div className="text-center mb-4">
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#ec4899' }}>
              How It Works
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-4"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0f172a' }}>
            From repo to hire — in minutes
          </h2>
          <p className="text-slate-600 font-medium text-base text-center max-w-xl mx-auto mb-14">
            Our end-to-end process replaces hours of manual prep with a precise, AI-driven workflow.
          </p>
        </ScrollReveal>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-0.5 mx-[10%]"
            style={{ background: 'linear-gradient(90deg, #7c3aed, #ec4899, #f97066, #10b981, #f59e0b)' }} />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {howItWorks.map((step, i) => (
              <ScrollReveal key={step.step} stagger={((i % 4) + 1) as 1|2|3|4}>
                <div className="flex flex-col items-center text-center gap-4 group">
                  {/* Icon bubble */}
                  <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-lg ${step.color}`}>
                    <span className="text-lg">{step.icon}</span>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center text-[9px] font-black"
                      style={{ borderColor: '#7c3aed', color: '#7c3aed' }}>
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#7c3aed' }}>
                      Step {step.step}
                    </p>
                    <h3 className="font-bold text-sm mb-1.5" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0f172a' }}>
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── BLOGS ── */}
      <section className="py-4">
        <ScrollReveal>
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#f97066' }}>
                Latest from the Blog
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0f172a' }}>
                Insights & Resources
              </h2>
            </div>
            <Link href="/blog"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold transition-colors hover:text-violet-600"
              style={{ color: '#7c3aed' }}>
              View all blogs
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogs.map((b, i) => (
            <ScrollReveal key={b.title} stagger={((i % 3) + 1) as 1|2|3}>
              <Link href="/blog" className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300">
                {/* Gradient image placeholder */}
                <div className={`h-36 bg-gradient-to-br ${b.gradient} relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                  <div className="absolute bottom-3 left-4">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${b.tagColor}`}>
                      {b.tag}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-sm leading-snug mb-2 group-hover:text-violet-700 transition-colors"
                    style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#0f172a' }}>
                    {b.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">{b.desc}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                    <span>{b.date}</span>
                    <span>·</span>
                    <span>{b.read}</span>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        <div className="text-center mt-8 sm:hidden">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: '#7c3aed' }}>
            View all blogs
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </section>

    </div>
  );
}
