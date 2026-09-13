'use client';

import React from 'react';
import ScrollReveal from './ScrollReveal';

interface PageHeroProps {
  badge: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  children?: React.ReactNode;
}

/**
 * PageHero — shared hero banner for all public marketing pages.
 * Light SaaS theme: white/lavender gradient, soft violet/pink blobs,
 * Plus Jakarta Sans headline with gradient accent.
 */
export default function PageHero({ badge, title, titleHighlight, subtitle, children }: PageHeroProps) {
  const renderTitle = () => {
    if (!titleHighlight || !title.includes(titleHighlight)) {
      return <span>{title}</span>;
    }
    const [before, after] = title.split(titleHighlight);
    return (
      <>
        {before}
        <span style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 55%, #f97066 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          {titleHighlight}
        </span>
        {after}
      </>
    );
  };

  return (
    <section className="relative w-full overflow-hidden py-20 sm:py-28 px-4"
      style={{ background: 'linear-gradient(145deg, #fafbff 0%, rgba(237,233,254,0.45) 50%, rgba(252,231,243,0.30) 100%)' }}>

      {/* Soft gradient blobs */}
      <div aria-hidden="true" className="pointer-events-none">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.20) 0%, transparent 70%)', filter: 'blur(48px)' }} />
        <div className="absolute -bottom-16 right-0 w-64 h-64 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)', filter: 'blur(56px)' }} />
        {/* Dot pattern */}
        <div className="absolute top-8 right-8 w-36 h-36 opacity-25"
          style={{ backgroundImage: 'radial-gradient(circle, #c4b5fd 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
        {/* Badge */}
        <ScrollReveal>
          <span className="page-badge shimmer-badge">
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <circle cx="5" cy="5" r="4" fill="currentColor" opacity="0.5" />
              <circle cx="5" cy="5" r="2" fill="currentColor" />
            </svg>
            {badge}
          </span>
        </ScrollReveal>

        {/* Headline */}
        <ScrollReveal stagger={2}>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            {renderTitle()}
          </h1>
        </ScrollReveal>

        {/* Subtitle */}
        <ScrollReveal stagger={3}>
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-xl">
            {subtitle}
          </p>
        </ScrollReveal>

        {/* Optional children (CTA buttons etc.) */}
        {children && (
          <ScrollReveal stagger={4} className="w-full flex flex-col items-center">
            {children}
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}
