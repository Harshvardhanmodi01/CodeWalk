'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';

export default function PublicPricingPage() {
  const router = useRouter();
  const { user, upgradeSubscription } = useGlobal();

  const handleCheckout = async (tier: string) => {
    if (user) {
      try {
        if (tier === 'Pro Plan') {
          await upgradeSubscription('Pro');
          alert('Successfully upgraded to Pro Plan!');
        } else if (tier === 'Business Tier') {
          await upgradeSubscription('Enterprise');
          alert('Successfully upgraded to Enterprise Business Plan!');
        } else {
          await upgradeSubscription('Free');
          alert('Subscription set to Free Plan.');
        }
        router.push('/profile');
      } catch (err) {
        alert('Failed to upgrade subscription plan.');
      }
    } else {
      router.push('/signup');
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-12 py-12 glow-effect">
      {/* Page Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="px-3 py-1 bg-primary-fixed/10 border border-primary-fixed/20 text-primary-fixed font-bold text-xs uppercase tracking-widest rounded-full">
          Pricing Plans
        </span>
        <h1 className="font-headline-lg text-4xl text-on-surface font-extrabold tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
          From individual developers exploring codebases to engineering recruitment teams running candidate screeners.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-3xl mx-auto pt-4 w-full px-4 sm:px-0">
        {/* Free Tier card */}
        <div className="bg-surface-container border border-outline-variant p-8 rounded-2xl flex flex-col justify-between hover:border-primary-fixed/30 transition-all duration-300">
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
            <ul className="space-y-4 text-xs text-on-surface-variant">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">check_circle</span>
                <span>5 analyses / month</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">check_circle</span>
                <span>50,000 tokens cap / month</span>
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
            onClick={() => handleCheckout('Free Tier')}
            className="w-full mt-10 py-3 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-lg font-label-sm text-xs font-bold uppercase tracking-wider transition-all"
          >
            Get Started For Free
          </button>
        </div>

        {/* Pro Tier card */}
        <div className="relative group rounded-xl">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-fixed to-secondary rounded-xl blur-md opacity-25 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative bg-surface-container-low border-2 border-primary-fixed p-8 rounded-2xl flex flex-col justify-between h-full glow-cyan">
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
                <span className="font-headline-lg text-4xl font-extrabold text-on-surface">$19</span>
                <span className="font-label-sm text-xs text-on-surface-variant">/mo</span>
              </div>
              <hr className="border-outline-variant/30" />
              <ul className="space-y-4 text-xs text-on-surface">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">verified</span>
                  <span>50 analyses / month</span>
                </li>
                <li className="flex items-center gap-3 font-semibold">
                  <span className="material-symbols-outlined text-primary-fixed text-lg font-bold">verified</span>
                  <span>1,000,000 tokens cap / month</span>
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
              className="w-full mt-10 py-3 bg-primary text-white rounded-lg font-label-sm text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary-hover hover:scale-[1.02] active:scale-95 transition-all shadow-md"
            >
              Upgrade to Pro
              <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Business row description */}
      <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-surface-container border border-dashed border-outline-variant text-center space-y-4 pt-8 w-full">
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
  );
}
