'use client';

import React from 'react';
import PageHero from '@/components/landing/PageHero';
import ScrollReveal from '@/components/landing/ScrollReveal';

const team = [
  {
    name: 'Dr. Taylor Griggs',
    role: 'Chief AI Architect',
    bio: 'Former senior research scientist at DeepMind. Expert in codebase graph models and large-scale ML inference.',
    initials: 'TG',
    color: 'from-cyan-500 to-teal-400',
  },
  {
    name: 'Aria Sterling',
    role: 'Head of Product',
    bio: 'Product veteran from Stripe and Glean. Passionate about developer workflows and reducing engineering toil.',
    initials: 'AS',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    name: 'Devon Keanu',
    role: 'Lead Frontend Engineer',
    bio: 'Builds beautiful, accessible, and fast web products. Design system geek and open source contributor.',
    initials: 'DK',
    color: 'from-violet-500 to-pink-500',
  },
];

const pillars = [
  {
    number: '01',
    title: 'Precision',
    description: 'We target actual, visible code lines. We avoid vague summaries and instead generate questions about concrete logic flows.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Breadth',
    description: 'We cover code logic, structural project patterns, markdown documentation, and real-world domain use cases.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Openness',
    description: 'We integrate with GitHub, GitLab, and Bitbucket. Developers get full access to code data and scorecards via open JSON APIs.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
];

const timeline = [
  { year: '2024', event: 'Research begins on AST-based code comprehension models' },
  { year: 'Jan 2025', event: 'Private beta launched with 12 engineering teams' },
  { year: 'Apr 2025', event: 'Groq + Llama 3.3 integration for sub-second question generation' },
  { year: 'Jan 2026', event: 'CodeWalk publicly launched — 500+ teams onboarded in 30 days' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <PageHero
        badge="About Us"
        title="The mission behind CodeWalk"
        titleHighlight="CodeWalk"
        subtitle="We believe codebase comprehension should be instant, interactive, and accessible to every engineering team on the planet."
      />

      {/* Vision & Mission */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <ScrollReveal>
            <div className="flex flex-col gap-5">
              <span className="page-badge w-max">Our Story</span>
              <h2
                className="text-3xl font-extrabold text-foreground leading-tight"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                The Code Comprehension Challenge
              </h2>
              <p className="text-sm text-muted-text leading-relaxed">
                Modern software engineering spends more time reading and understanding code than writing it. Whether it is onboarding new hires, reviewing pull requests, or evaluating technical candidates, understanding the files and architectural intent is a massive manual effort.
              </p>
              <p className="text-sm text-muted-text leading-relaxed">
                CodeWalk was founded in 2026 to automate codebase comprehension. By indexing repositories and leveraging Llama 3.3 models via Groq, we create slide-by-slide active-recall walks, making it easy for interviewers and developers to test comprehension instantly.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal stagger={2}>
            <div
              className="premium-glass rounded-3xl p-8 relative overflow-hidden"
            >
              {/* Glow decoration */}
              <div
                className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 25%, transparent) 0%, transparent 70%)', filter: 'blur(30px)' }}
                aria-hidden="true"
              />
              <div
                className="w-1 h-full absolute left-0 top-0 rounded-l-3xl"
                style={{ background: 'linear-gradient(180deg, var(--primary), #6366f1)' }}
                aria-hidden="true"
              />
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>
                Our Vision
              </p>
              <blockquote className="text-lg font-bold text-foreground leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                &ldquo;To democratize software architecture comprehension, transforming codebases into living, teaching narratives that anyone can navigate in seconds.&rdquo;
              </blockquote>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Timeline */}
      <section
        className="py-16 px-4 sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--muted-background) 60%, transparent)' }}
      >
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <h2
              className="text-3xl font-extrabold text-foreground"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Our journey so far
            </h2>
          </ScrollReveal>
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px"
              style={{ background: 'linear-gradient(180deg, var(--primary), #6366f1, transparent)', opacity: 0.3 }}
              aria-hidden="true"
            />
            <div className="flex flex-col gap-8">
              {timeline.map((item, i) => (
                <ScrollReveal key={item.year} stagger={((i % 4) + 1) as 1 | 2 | 3 | 4}>
                  <div className={`flex items-start gap-6 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'} sm:items-center`}>
                    <div className="sm:flex-1 sm:text-right pl-12 sm:pl-0">
                      {i % 2 === 0 && (
                        <div className="premium-glass rounded-2xl p-5 inline-block text-left sm:text-right">
                          <p className="text-xs font-black" style={{ color: 'var(--primary)', fontFamily: 'var(--font-dm-sans)' }}>{item.year}</p>
                          <p className="text-sm text-foreground font-medium mt-1">{item.event}</p>
                        </div>
                      )}
                    </div>
                    {/* Dot */}
                    <div
                      className="absolute left-1.5 sm:left-1/2 sm:-translate-x-1/2 w-5 h-5 rounded-full border-2 border-background flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--primary), #6366f1)' }}
                      aria-hidden="true"
                    />
                    <div className="sm:flex-1 pl-12 sm:pl-0">
                      {i % 2 !== 0 && (
                        <div className="premium-glass rounded-2xl p-5 inline-block">
                          <p className="text-xs font-black" style={{ color: 'var(--primary)', fontFamily: 'var(--font-dm-sans)' }}>{item.year}</p>
                          <p className="text-sm text-foreground font-medium mt-1">{item.event}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <ScrollReveal className="text-center mb-12">
          <h2
            className="text-3xl font-extrabold text-foreground"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            Core Pillars
          </h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar, i) => (
            <ScrollReveal key={pillar.title} stagger={(i + 1) as 1 | 2 | 3}>
              <div className="premium-card p-7 flex flex-col gap-4 h-full cursor-default group relative overflow-hidden">
                {/* Number watermark */}
                <span
                  className="absolute right-4 top-4 text-5xl font-black font-mono select-none pointer-events-none"
                  style={{ color: 'var(--primary)', opacity: 0.06 }}
                  aria-hidden="true"
                >
                  {pillar.number}
                </span>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                    color: 'var(--primary)',
                  }}
                >
                  {pillar.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-2">{pillar.title}</h3>
                  <p className="text-xs text-muted-text leading-relaxed">{pillar.description}</p>
                </div>
                {/* Bottom accent */}
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

      {/* Team */}
      <section
        className="py-20 px-4 sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--muted-background) 50%, transparent)' }}
      >
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-12">
            <span className="page-badge mx-auto mb-4 block w-max">The People</span>
            <h2
              className="text-3xl font-extrabold text-foreground"
              style={{ fontFamily: 'var(--font-dm-sans)' }}
            >
              Our Leadership
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map((member, i) => (
              <ScrollReveal key={member.name} stagger={(i + 1) as 1 | 2 | 3}>
                <div className="premium-glass rounded-3xl p-7 flex flex-col items-center text-center gap-4 cursor-default">
                  {/* Avatar */}
                  <div className="relative">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${member.color} flex items-center justify-center text-white font-extrabold text-xl shadow-lg`}
                    >
                      {member.initials}
                    </div>
                    {/* Online indicator */}
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background"
                      style={{ background: '#22C55E' }}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{member.name}</h4>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--primary)' }}>{member.role}</p>
                  </div>
                  <p className="text-xs text-muted-text leading-relaxed">{member.bio}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
