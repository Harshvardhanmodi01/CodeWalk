'use client';

import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-margin-desktop py-4 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
      <Link href="/" className="font-headline-md text-headline-md font-bold text-primary-fixed hover:opacity-90">
        CodeWalk
      </Link>
      <div className="hidden md:flex items-center gap-8">
        <a className="font-body-md text-body-md text-primary-fixed font-bold hover:opacity-80" href="#">Docs</a>
        <Link className="font-body-md text-body-md text-on-surface-variant hover:text-primary-fixed transition-colors" href="/pricing">Pricing</Link>
        <a className="font-body-md text-body-md text-on-surface-variant hover:text-primary-fixed transition-colors" href="#">Changelog</a>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/login" className="px-4 py-2 font-label-sm text-label-sm text-on-surface hover:text-primary-fixed transition-colors">Login</Link>
        <Link href="/signup" className="px-6 py-2 bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold glow-cyan hover:opacity-80 transition-all active:scale-95">Try Free</Link>
      </div>
    </nav>
  );
}
