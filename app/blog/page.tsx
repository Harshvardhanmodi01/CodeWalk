'use client';

import React, { useState } from 'react';

export default function BlogPage() {
  const [filterCategory, setFilterCategory] = useState<'all' | 'announcements' | 'engineering' | 'reviews'>('all');

  const articles = [
    {
      title: 'How FinFlow Reduced Developer Onboarding Time by 40%',
      category: 'reviews',
      description: 'Elena Rostova discusses how active-recall code walks replaced weekly manual walkthrough meetings for junior engineer hires.',
      date: 'June 20, 2026',
      readTime: '4 min read'
    },
    {
      title: 'Integrating Llama 3.3 for Precise Code Comprehension',
      category: 'engineering',
      description: 'A deep dive into our prompt registry structures, line segmentation indexing, and Groq SDK configurations.',
      date: 'June 18, 2026',
      readTime: '6 min read'
    },
    {
      title: 'Announcing CodeWalk Workspace Tiers and Credit Billing',
      category: 'announcements',
      description: 'We are officially introducing Pro and Enterprise token levels to enable larger private repository walks.',
      date: 'June 15, 2026',
      readTime: '3 min read'
    },
    {
      title: 'Why Active-Recall is the Best Way to Assess Candidates',
      category: 'engineering',
      description: 'Sarah Chen explains why standard whiteboard coding questions fail and how walks probe deep structural comprehension.',
      date: 'June 10, 2026',
      readTime: '5 min read'
    }
  ];

  const filteredArticles = filterCategory === 'all'
    ? articles
    : articles.filter(a => a.category === filterCategory);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-10 py-10 glow-effect">
      {/* HEADER */}
      <div className="border-b border-border-main pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-main">CodeWalk Blog</h1>
          <p className="text-xs text-muted-text mt-1">Read features articles, technical guides, and customer reviews/case studies.</p>
        </div>

        {/* Filter */}
        <div className="flex bg-muted-bg border border-border-main p-1 rounded-xl flex-wrap gap-1">
          {['all', 'announcements', 'engineering', 'reviews'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat as any)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                filterCategory === cat ? 'bg-primary text-white' : 'text-muted-text hover:text-text-main'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FEATURED POST */}
      <section className="bg-gradient-to-tr from-primary/5 via-indigo-500/5 to-transparent border border-border-main rounded-3xl p-8 flex flex-col gap-4 shadow-sm">
        <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold rounded-full w-max uppercase tracking-wider">
          Featured Post
        </span>
        <h2 className="text-2xl font-black text-text-main">
          Why Active-Recall Code Walks are Replacing LeetCode Assessments
        </h2>
        <p className="text-sm text-muted-text leading-relaxed">
          Standard algorithmic puzzle questions do not reflect day-to-day coding expectations. Senior technical interviewers are shifting focus towards codebase navigation, readability, and structural comprehension. Learn how to design a walk that tests real outcomes.
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-text mt-2 font-semibold">
          <span>June 21, 2026</span>
          <span>•</span>
          <span>8 min read</span>
          <span>•</span>
          <span className="text-primary capitalize">Engineering</span>
        </div>
      </section>

      {/* LIST GRID */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArticles.map((art, idx) => (
          <div
            key={idx}
            className="bg-card-main border border-border-main rounded-2xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow justify-between"
          >
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                <span className="text-primary">{art.category}</span>
                <span className="text-muted-text">{art.readTime}</span>
              </div>
              <h3 className="text-base font-bold text-text-main leading-snug">
                {art.title}
              </h3>
              <p className="text-xs text-muted-text leading-relaxed mt-1">
                {art.description}
              </p>
            </div>
            <span className="text-[10px] text-muted-text font-bold block pt-2 border-t border-border-main/50">
              {art.date}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
