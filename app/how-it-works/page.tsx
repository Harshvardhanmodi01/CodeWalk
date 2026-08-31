'use client';

import React from 'react';
import PageHero from '@/components/landing/PageHero';
import ScrollReveal from '@/components/landing/ScrollReveal';
import BeforeAfterSection from '@/components/landing/BeforeAfterSection';

const steps = [
  {
    number: '01',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    title: 'Paste Repository URL',
    description:
      'Drop any public or private GitHub, GitLab, or Bitbucket repository link into our interactive command terminal interface.',
  },
  {
    number: '02',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
      </svg>
    ),
    title: 'AST Graph Indexing',
    description:
      'Our backend parsing system analyzes codebase ASTs, checks file imports, and maps structural data junctions in under a minute.',
  },
  {
    number: '03',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M7 8h10M7 12h6" />
      </svg>
    ),
    title: 'Interactive Slides',
    description:
      'Walk through files slide-by-slide, rate candidate responses, read evaluator rubrics, and download technical scorecards.',
  },
];

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Zero Code Storage',
    description: 'We index on-the-fly and never store your source code permanently.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Under 60 Seconds',
    description: 'Repository indexing and slide generation complete in under a minute.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Real Code Lines',
    description: 'Questions target actual visible lines — no vague conceptual summaries.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: 'PDF Scorecards',
    description: 'Export fully structured candidate reports for ATS and HR pipelines.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <PageHero
        badge="Product Walkthrough"
        title="How CodeWalk Works"
        titleHighlight="CodeWalk"
        subtitle="From repository code indexing to precision interview questions and automated candidate scorecard evaluations."
      />

      {/* Steps Timeline */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <ScrollReveal className="text-center mb-14">
          <p className="page-badge mx-auto mb-4">Step by Step</p>
          <h2
            className="text-3xl sm:text-4xl font-extrabold text-foreground"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Three steps to your first walk
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line (desktop only) */}
          <div
            className="hidden md:block absolute top-16 left-1/3 right-1/3 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
              opacity: 0.3,
            }}
            aria-hidden="true"
          />

          {steps.map((step, i) => (
            <ScrollReveal
              key={step.number}
              stagger={(i + 1) as 1 | 2 | 3}
              className="group"
            >
              <div className="premium-card p-8 flex flex-col gap-5 h-full cursor-default relative overflow-hidden">
                {/* Big number watermark */}
                <span
                  className="absolute right-4 top-4 text-6xl font-black font-mono select-none pointer-events-none"
                  style={{ color: 'var(--primary)', opacity: 0.07 }}
                  aria-hidden="true"
                >
                  {step.number}
                </span>

                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--primary) 22%, transparent)',
                    color: 'var(--primary)',
                  }}
                >
                  {step.icon}
                </div>

                {/* Connector number badge */}
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black"
                  style={{
                    background: 'var(--primary)',
                    color: '#fff',
                  }}
                >
                  {parseInt(step.number)}
                </span>

                <div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-text leading-relaxed">{step.description}</p>
                </div>

                {/* Hover accent line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                  style={{ background: 'linear-gradient(90deg, var(--primary), #6366f1)' }}
                  aria-hidden="true"
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Feature Highlights */}
      <section
        className="py-16 px-4 sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--muted-background) 60%, transparent)' }}
      >
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-foreground"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Built for speed &amp; precision
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} stagger={((i % 4) + 1) as 1 | 2 | 3 | 4}>
                <div className="premium-glass rounded-2xl p-5 flex flex-col gap-3 cursor-default h-full">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                      color: 'var(--primary)',
                    }}
                  >
                    {f.icon}
                  </div>
                  <h4 className="text-sm font-bold text-foreground">{f.title}</h4>
                  <p className="text-xs text-muted-text leading-relaxed">{f.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Video Walkthrough */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
        <ScrollReveal className="text-center mb-10">
          <span className="page-badge mx-auto mb-4 block w-max">Interactive Walkthrough</span>
          <h2
            className="text-3xl font-extrabold text-foreground"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            See it in action
          </h2>
          <p className="text-sm text-muted-text mt-2">Watch our 2-minute product video.</p>
        </ScrollReveal>

        <ScrollReveal stagger={2}>
          <div className="relative group rounded-3xl overflow-hidden gradient-border">
            <div className="premium-glass rounded-3xl p-4">
              <div className="aspect-video w-full rounded-2xl overflow-hidden relative flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--muted-background) 80%, transparent)' }}
              >
                {/* Ambient glows */}
                <div
                  className="absolute -top-20 -left-20 w-60 h-60 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent) 0%, transparent 70%)', filter: 'blur(40px)' }}
                  aria-hidden="true"
                />

                {/* Play button */}
                <div
                  className="relative z-10 flex flex-col items-center gap-5"
                  role="img"
                  aria-label="Video walkthrough placeholder"
                >
                  <button
                    className="w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all duration-300 group-hover:scale-110 cursor-pointer"
                    style={{
                      background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--primary) 50%, transparent)',
                      color: 'var(--primary)',
                      boxShadow: '0 0 40px color-mix(in srgb, var(--primary) 20%, transparent)',
                    }}
                    aria-label="Play product walkthrough video"
                    type="button"
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-foreground">Product Walkthrough</p>
                    <p className="text-xs text-muted-text font-mono">2:30 • Coming Soon</p>
                  </div>
                </div>

                {/* HUD overlay */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none flex items-end justify-between p-3"
                  style={{ border: '1px solid color-mix(in srgb, var(--primary) 10%, transparent)' }}
                  aria-hidden="true"
                >
                  <span className="text-[9px] font-mono" style={{ color: 'color-mix(in srgb, var(--primary) 50%, transparent)' }}>
                    SYS.WALK_ACTIVE: TRUE
                  </span>
                  <span className="text-[9px] font-mono" style={{ color: 'color-mix(in srgb, var(--primary) 50%, transparent)' }}>
                    00:00 / 02:30
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Before / After */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <ScrollReveal className="text-center mb-12">
          <h2
            className="text-3xl font-extrabold text-foreground"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Visual Code Assessment
          </h2>
          <p className="text-sm text-muted-text mt-2 max-w-md mx-auto">
            Compare the manual reviewer chaos to the precision of CodeWalk scorecard walks.
          </p>
        </ScrollReveal>
        <ScrollReveal stagger={2}>
          <BeforeAfterSection />
        </ScrollReveal>
      </section>
    </div>
  );
}
