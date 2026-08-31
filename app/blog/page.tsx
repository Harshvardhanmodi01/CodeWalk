'use client';

import React, { useState } from 'react';
import PageHero from '@/components/landing/PageHero';
import ScrollReveal from '@/components/landing/ScrollReveal';

type Category = 'all' | 'announcements' | 'engineering' | 'reviews';

const categoryColors: Record<string, string> = {
  announcements: '#f59e0b',
  engineering: '#6366f1',
  reviews: '#22c55e',
};

const articles = [
  {
    title: 'How FinFlow Reduced Developer Onboarding Time by 40%',
    category: 'reviews' as Category,
    description:
      'Elena Rostova discusses how active-recall code walks replaced weekly manual walkthrough meetings for junior engineer hires.',
    date: 'June 20, 2026',
    readTime: '4 min read',
  },
  {
    title: 'Integrating Llama 3.3 for Precise Code Comprehension',
    category: 'engineering' as Category,
    description:
      'A deep dive into our prompt registry structures, line segmentation indexing, and Groq SDK configurations.',
    date: 'June 18, 2026',
    readTime: '6 min read',
  },
  {
    title: 'Announcing CodeWalk Workspace Tiers and Credit Billing',
    category: 'announcements' as Category,
    description:
      'We are officially introducing Pro and Enterprise token levels to enable larger private repository walks.',
    date: 'June 15, 2026',
    readTime: '3 min read',
  },
  {
    title: 'Why Active-Recall is the Best Way to Assess Candidates',
    category: 'engineering' as Category,
    description:
      'Sarah Chen explains why standard whiteboard coding questions fail and how walks probe deep structural comprehension.',
    date: 'June 10, 2026',
    readTime: '5 min read',
  },
];

const categories: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'engineering', label: 'Engineering' },
  { key: 'reviews', label: 'Reviews' },
];

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

export default function BlogPage() {
  const [filterCategory, setFilterCategory] = useState<Category>('all');

  const filteredArticles =
    filterCategory === 'all'
      ? articles
      : articles.filter((a) => a.category === filterCategory);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <PageHero
        badge="Latest Insights"
        title="The CodeWalk Blog"
        titleHighlight="CodeWalk"
        subtitle="Technical guides, customer case studies, and engineering deep dives from the team building the future of code comprehension."
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-12">

        {/* Filter Pills */}
        <ScrollReveal>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(({ key, label }) => {
              const isActive = filterCategory === key;
              return (
                <button
                  key={key}
                  id={`blog-filter-${key}`}
                  onClick={() => setFilterCategory(key)}
                  className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
                  style={
                    isActive
                      ? {
                          background: 'linear-gradient(135deg, var(--primary), #6366f1)',
                          color: '#fff',
                          boxShadow: '0 4px 12px color-mix(in srgb, var(--primary) 25%, transparent)',
                        }
                      : {
                          background: 'var(--muted-background)',
                          border: '1px solid var(--border)',
                          color: 'var(--muted)',
                        }
                  }
                  aria-pressed={isActive}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Featured Post */}
        <ScrollReveal stagger={1}>
          <article className="relative overflow-hidden rounded-3xl gradient-border cursor-pointer group">
            <div className="premium-glass rounded-3xl p-8 sm:p-10" style={{ border: 'none' }}>
              {/* Mesh overlay */}
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse 60% 60% at 80% 0%, color-mix(in srgb, var(--primary) 10%, transparent) 0%, transparent 70%)',
                }}
                aria-hidden="true"
              />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="shimmer-badge px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest"
                    style={{ color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}
                  >
                    Featured Post
                  </span>
                  <span className="text-[10px] text-muted-text font-semibold">Jun 21, 2026 · 8 min read</span>
                </div>

                <h2
                  className="text-2xl sm:text-3xl font-black text-foreground leading-tight group-hover:gradient-text transition-all"
                  style={{ fontFamily: 'var(--font-dm-sans)' }}
                >
                  Why Active-Recall Code Walks are Replacing LeetCode Assessments
                </h2>

                <p className="text-sm text-muted-text leading-relaxed max-w-2xl">
                  Standard algorithmic puzzle questions do not reflect day-to-day coding expectations. Senior technical interviewers are shifting focus towards codebase navigation, readability, and structural comprehension. Learn how to design a walk that tests real outcomes.
                </p>

                <div className="flex items-center gap-4 mt-2">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: 'color-mix(in srgb, #6366f1 12%, transparent)',
                      color: '#6366f1',
                    }}
                  >
                    Engineering
                  </span>
                  <button
                    className="flex items-center gap-1.5 text-xs font-bold transition-all duration-200 cursor-pointer hover:gap-2.5"
                    style={{ color: 'var(--primary)' }}
                    type="button"
                    aria-label="Read featured post"
                  >
                    Read Article <ArrowIcon />
                  </button>
                </div>
              </div>
            </div>
          </article>
        </ScrollReveal>

        {/* Article Grid */}
        {filteredArticles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredArticles.map((art, idx) => {
              const staggerVal = ((idx % 4) + 1) as 1 | 2 | 3 | 4;
              const catColor = categoryColors[art.category] || 'var(--primary)';
              return (
                <ScrollReveal key={idx} stagger={staggerVal}>
                  <article className="premium-card p-6 flex flex-col gap-4 h-full cursor-pointer group">
                    {/* Category + read time */}
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background: `color-mix(in srgb, ${catColor} 12%, transparent)`,
                          color: catColor,
                        }}
                      >
                        {art.category}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-text font-semibold">
                        <ClockIcon />
                        {art.readTime}
                      </span>
                    </div>

                    {/* Title */}
                    <h3
                      className="text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors duration-200"
                    >
                      {art.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-muted-text leading-relaxed flex-1">{art.description}</p>

                    {/* Footer */}
                    <div
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: '1px solid var(--border)', opacity: 0.8 }}
                    >
                      <span className="text-[10px] text-muted-text font-bold">{art.date}</span>
                      <button
                        className="flex items-center gap-1 text-[10px] font-bold transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 group-hover:gap-1.5"
                        style={{ color: 'var(--primary)' }}
                        type="button"
                        aria-label={`Read ${art.title}`}
                      >
                        Read <ArrowIcon />
                      </button>
                    </div>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        ) : (
          <ScrollReveal>
            <div className="premium-glass rounded-3xl p-12 text-center flex flex-col items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="text-sm font-bold text-foreground">No articles in this category yet</p>
              <p className="text-xs text-muted-text">Check back soon — we publish weekly.</p>
            </div>
          </ScrollReveal>
        )}

        {/* Newsletter CTA */}
        <ScrollReveal stagger={2}>
          <div
            className="premium-glass rounded-3xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div>
              <h3
                className="text-lg font-bold text-foreground"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Stay in the loop
              </h3>
              <p className="text-xs text-muted-text mt-1">Weekly engineering insights, zero spam.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="email"
                placeholder="you@company.com"
                className="premium-input px-4 py-2.5 text-sm flex-1 sm:w-64"
                aria-label="Email address for newsletter"
              />
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-95 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--primary), #6366f1)', color: '#fff' }}
                type="button"
              >
                Subscribe
              </button>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
