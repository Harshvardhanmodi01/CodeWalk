'use client';

import React, { useEffect, useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  stagger?: 1 | 2 | 3 | 4 | 5 | 6;
  threshold?: number;
}

/**
 * ScrollReveal — wraps children in a div that fades up into view when
 * the element enters the viewport. Uses IntersectionObserver + CSS classes
 * defined in globals.css (.scroll-reveal / .scroll-reveal.visible).
 */
export default function ScrollReveal({
  children,
  className = '',
  stagger,
  threshold = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const staggerClass = stagger ? `stagger-${stagger}` : '';

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${staggerClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
