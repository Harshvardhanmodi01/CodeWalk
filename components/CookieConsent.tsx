'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag: (...args: any[]) => void;
    'ga-loaded'?: boolean;
  }
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem('consent_given');
    if (!consent) {
      setShowBanner(true);
    } else if (consent === 'all') {
      loadGoogleAnalytics();
    }
  }, []);

  const loadGoogleAnalytics = () => {
    // Avoid loading Google Analytics script multiple times
    if (window['ga-loaded']) return;
    window['ga-loaded'] = true;

    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (!gaId) {
      console.warn('Google Analytics Measurement ID is not defined in environment variables.');
      return;
    }

    console.log('[SECURITY] Cookie Consent: Loading Google Analytics...');

    // Load gtag script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script.async = true;

    // Retrieve active request nonce from the layout meta tag (Fix 1)
    const nonce = document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content');
    if (nonce) {
      script.nonce = nonce;
    }
    document.head.appendChild(script);

    // Initialize gtag
    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){window.dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', { 'anonymize_ip': true });
    `;
    if (nonce) {
      inlineScript.nonce = nonce;
    }
    document.head.appendChild(inlineScript);
  };

  const handleAcceptAll = () => {
    localStorage.setItem('consent_given', 'all');
    setShowBanner(false);
    loadGoogleAnalytics();
  };

  const handleNecessaryOnly = () => {
    localStorage.setItem('consent_given', 'necessary');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-[#151d1e]/95 backdrop-blur-md border border-[#3b494b] p-5 rounded-xl z-50 text-white shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom duration-300 select-none">
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-[#06B6D4] text-xl mt-0.5">cookie</span>
        <div className="space-y-1">
          <h5 className="font-bold text-xs text-white uppercase tracking-wider">Cookie Preferences</h5>
          <p className="text-[11px] leading-relaxed text-[#94A3B8]">
            We use cookies to improve your experience. By continuing, you agree to our{' '}
            <Link href="/privacy" className="text-[#06B6D4] hover:underline font-semibold">
              Privacy Policy
            </Link>.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-1">
        <button
          onClick={handleNecessaryOnly}
          className="px-3.5 py-1.5 border border-[#3b494b] rounded text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          Necessary Only
        </button>
        <button
          onClick={handleAcceptAll}
          className="px-3.5 py-1.5 bg-[#06B6D4] text-[#0d1515] rounded text-[10px] font-bold uppercase tracking-wider hover:bg-[#06B6D4]/80 transition-all cursor-pointer shadow-md shadow-cyan-500/10"
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
