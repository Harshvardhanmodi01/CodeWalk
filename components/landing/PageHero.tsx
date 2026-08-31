'use client';

import React from 'react';
import ScrollReveal from './ScrollReveal';

interface PageHeroProps {
  badge: string;
  title: string;
  titleHighlight?: string; // Part of title to apply gradient-text
  subtitle: string;
  /** Optional extra content (e.g. CTA buttons) below the subtitle */
  children?: React.ReactNode;
}

/**
 * PageHero — shared hero banner used by all public marketing pages.
 * Renders a mesh gradient background, floating glow orbs,
 * animated badge, DM Sans headline with gradient accent, and subtitle.
 */
export default function PageHero({
  badge,
  title,
  titleHighlight,
  subtitle,
  children,
}: PageHeroProps) {
  // Split title around the highlight if provided
  const renderTitle = () => {
    if (!titleHighlight || !title.includes(titleHighlight)) {
      return <span>{title}</span>;
    }
    const [before, after] = title.split(titleHighlight);
    return (
      <>
        {before}
        <span className="gradient-text">{titleHighlight}</span>
        {after}
      </>
    );
  };

  return (
    <section className="relative w-full overflow-hidden mesh-bg py-20 sm:py-28 px-4">
      {/* Floating glow orbs */}
      <div
        className="glow-orb w-96 h-96 -top-32 -left-32"
        style={{ background: 'radial-gradient(circle, rgba(0,219,233,0.55) 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="glow-orb w-80 h-80 -bottom-24 right-0"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.45) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
        {/* Animated badge */}
        <ScrollReveal>
          <span className="page-badge shimmer-badge">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <circle cx="5" cy="5" r="4" fill="currentColor" opacity="0.6" />
              <circle cx="5" cy="5" r="2" fill="currentColor" />
            </svg>
            {badge}
          </span>
        </ScrollReveal>

        {/* Headline */}
        <ScrollReveal stagger={2}>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]"
            style={{ fontFamily: 'var(--font-dm-sans)' }}
          >
            {renderTitle()}
          </h1>
        </ScrollReveal>

        {/* Subtitle */}
        <ScrollReveal stagger={3}>
          <p className="text-base sm:text-lg text-muted-text leading-relaxed max-w-xl">
            {subtitle}
          </p>
        </ScrollReveal>

        {/* Optional extra content */}
        {children && (
          <ScrollReveal stagger={4} className="w-full flex flex-col items-center">
            {children}
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
