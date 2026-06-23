'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [analysesCount, setAnalysesCount] = useState(3);

  useEffect(() => {
    const q = localStorage.getItem('cw_quota_analyses');
    if (q) setAnalysesCount(parseInt(q));
  }, []);

  const handleCheckout = (tier: string) => {
    alert(`Initiating checkout process for: ${tier}`);
    // Simulate upgrading
    localStorage.setItem('cw_quota_analyses', '0'); // Reset quota use count for mockup
    localStorage.setItem('cw_quota_tokens', '0');
    // Dispatch event to update QuotaBadge
    window.dispatchEvent(new Event('quotaUpdated'));
    router.push('/dashboard');
  };

  return (
    <div className="flex-grow flex flex-col bg-surface overflow-hidden min-h-screen">
      
      {/* Top Header Bar */}
      <header className="flex justify-between items-center px-8 py-3 bg-surface-container-low w-full border-b border-outline-variant z-10 select-none">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed text-xl">payments</span>
          <h1 className="font-headline-md text-lg text-primary-fixed font-bold tracking-tight">Upgrade Plan</h1>
        </div>
      </header>

      {/* Pricing Configuration Layout */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
        {/* Subtle grid accent */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#dce4e5 1px, transparent 1px), linear-gradient(90deg, #dce4e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-12 pb-12 select-none">
          
          {/* Section Welcome */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-surface-container-highest border border-outline-variant">
              <span className="material-symbols-outlined text-primary-fixed mr-2 text-sm">terminal</span>
              <span className="font-label-sm text-[10px] text-on-surface-variant tracking-wider uppercase font-bold">Scalable Intelligence</span>
            </div>
            <h2 className="font-headline-lg text-2xl text-on-surface font-extrabold">Choose your assessment velocity</h2>
            <p className="font-body-md text-sm text-on-surface-variant max-w-lg mx-auto leading-relaxed">
              From solo developers to engineering recruitment teams, CodeWalk scales with your technical rigorousness.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-3xl mx-auto pt-4">
            
            {/* Free Tier card */}
            <div className="glass-panel p-8 rounded-xl flex flex-col justify-between border border-outline-variant hover:border-outline transition-all duration-300">
              <div className="space-y-6">
                <div>
                  <h3 className="font-headline-md text-xl text-on-surface font-extrabold mb-1">Free Tier</h3>
                  <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">For Individual Exploration</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-lg text-4xl font-extrabold text-on-surface">$0</span>
                  <span className="font-label-sm text-xs text-on-surface-variant">/mo</span>
                </div>
                <hr className="border-outline-variant/30" />
                <ul className="space-y-4 text-sm text-on-surface-variant">
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">check_circle</span>
                    <span>5 analyses / month</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">check_circle</span>
                    <span>100,000 tokens cap / day</span>
                  </li>
                  <li className="flex items-center gap-3 opacity-35">
                    <span className="material-symbols-outlined text-lg font-bold">block</span>
                    <span>Priority GPU processing</span>
                  </li>
                  <li className="flex items-center gap-3 opacity-35">
                    <span className="material-symbols-outlined text-lg font-bold">block</span>
                    <span>PDF Scorecard Exporter</span>
                  </li>
                </ul>
              </div>
              <button 
                disabled 
                className="w-full mt-10 py-3 border border-outline-variant text-on-surface-variant/40 rounded-lg font-label-sm text-xs font-bold uppercase tracking-wider cursor-not-allowed"
              >
                Current Active Plan
              </button>
            </div>

            {/* Pro Tier card */}
            <div className="relative group rounded-xl">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-fixed to-secondary rounded-xl blur-md opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-surface-container-low border-2 border-primary-fixed p-8 rounded-xl flex flex-col justify-between h-full glow-cyan">
                {/* Popular label badge */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary-fixed text-on-primary-fixed px-4 py-1 rounded-full font-label-sm text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                  Most Popular
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-headline-md text-xl text-primary-fixed font-extrabold mb-1">Pro Plan</h3>
                    <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">For Professional Hiring</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-headline-lg text-4xl font-extrabold text-on-surface">$99</span>
                    <span className="font-label-sm text-xs text-on-surface-variant">/mo</span>
                  </div>
                  <hr className="border-outline-variant/30" />
                  <ul className="space-y-4 text-sm text-on-surface">
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">verified</span>
                      <span>50 analyses / month</span>
                    </li>
                    <li className="flex items-center gap-3 font-semibold">
                      <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">verified</span>
                      <span>Priority processing queue</span>
                    </li>
                    <li className="flex items-center gap-3 font-semibold">
                      <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">verified</span>
                      <span>PDF scorecards &amp; JSON shares</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">verified</span>
                      <span>Private branch analysis integrations</span>
                    </li>
                  </ul>
                </div>
                
                <button 
                  onClick={() => handleCheckout('Pro Plan')}
                  className="w-full mt-10 py-3 bg-primary-container text-on-primary-container rounded-lg font-label-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary-fixed hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_15px_rgba(0,219,233,0.4)]"
                >
                  Checkout with Stripe
                  <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                </button>
              </div>
            </div>

          </div>

          {/* Business row description */}
          <div className="max-w-2xl mx-auto p-6 rounded-xl bg-surface-container border border-dashed border-outline-variant text-center space-y-4 pt-8">
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center border border-outline-variant">
                <span className="material-symbols-outlined text-secondary text-xl">corporate_fare</span>
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-headline-md text-sm text-on-surface font-bold">Need custom capacity?</h4>
              <p className="text-xs text-on-surface-variant/80 max-w-md mx-auto leading-relaxed">
                Looking for unlimited analyses, SSO/SAML permissions, and custom rubrics templates? Our <span className="text-secondary font-bold">Business</span> plan scales to your sizing needs.
              </p>
            </div>
            <button 
              onClick={() => handleCheckout('Business Tier')}
              className="inline-flex items-center gap-1.5 text-primary-fixed hover:underline text-xs font-bold uppercase tracking-wide"
            >
              Contact Sales for Custom Quote
              <span className="material-symbols-outlined text-xs">arrow_outward</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
