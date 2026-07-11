'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';

export default function PublicPricingPage() {
  const router = useRouter();
  const { user, upgradeSubscription } = useGlobal();

  // Load Razorpay Script dynamically on mount
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCheckout = async (tier: string) => {
    if (!user) {
      toast.error('Please sign in or sign up first to select a plan.');
      router.push('/register');
      return;
    }

    try {
      if (tier === 'Free Tier') {
        await upgradeSubscription('Free');
        toast.success('Subscription set to Free Plan.');
        router.push('/profile');
        return;
      }

      // Pro Plan or Business Tier
      const amount = tier === 'Pro Plan' ? 190000 : 990000; // in paise (e.g. 1900.00 INR or 9900.00 INR)
      const currency = 'INR';

      toast.loading('Initializing secure checkout...', { id: 'checkout' });

      // 1. Create order on the server
      const orderRes = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, receipt: `receipt_${user.id.slice(0, 8)}` })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initialize payment.');
      }

      toast.dismiss('checkout');

      // 2. Open Razorpay Checkout Popup
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '', // Prefilled from environment variables
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CodeWalk',
        description: `Upgrade to ${tier}`,
        order_id: orderData.id,
        prefill: {
          name: user.name || '',
          email: user.email || '',
        },
        theme: {
          color: '#06B6D4', // Cyan accent
        },
        handler: async function (response: any) {
          toast.loading('Verifying payment signature...', { id: 'verify' });
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.id,
                tier: tier
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Signature verification failed.');
            }

            toast.success(`Success! Upgraded to ${tier}!`, { id: 'verify' });
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } catch (err: any) {
            toast.error(`Verification Failed: ${err.message}`, { id: 'verify' });
          }
        },
        modal: {
          ondismiss: function () {
            toast.error('Payment checkout cancelled.');
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      toast.dismiss('checkout');
      toast.error(`Checkout failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-12 py-12 glow-effect text-[#F1F5F9]">
      {/* Page Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="px-3 py-1 bg-[#06B6D4]/10 border border-[#06B6D4]/20 text-[#06B6D4] font-bold text-xs uppercase tracking-widest rounded-full">
          Pricing Plans
        </span>
        <h1 className="text-4xl text-white font-extrabold tracking-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-sm text-[#94A3B8] leading-relaxed">
          From individual developers exploring codebases to engineering recruitment teams running candidate screeners.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-3xl mx-auto pt-4 w-full px-4 sm:px-0">
        {/* Free Tier card */}
        <div className="bg-[#151d1e] border border-[#3b494b] p-8 rounded-2xl flex flex-col justify-between hover:border-[#06B6D4]/30 transition-all duration-300">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl text-white font-extrabold mb-1">Free Tier</h3>
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-bold">For Individual Exploration</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white">$0</span>
              <span className="text-xs text-[#94A3B8]">/mo</span>
            </div>
            <hr className="border-[#3b494b]/30" />
            <ul className="space-y-4 text-xs text-[#94A3B8]">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#06B6D4] text-lg font-bold">check_circle</span>
                <span>5 analyses / month</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#06B6D4] text-lg font-bold">check_circle</span>
                <span>5 screening sessions limit / month</span>
              </li>
              <li className="flex items-center gap-3 opacity-35">
                <span className="material-symbols-outlined text-lg font-bold">lock</span>
                <span>Position-Based Bulk Hiring</span>
              </li>
              <li className="flex items-center gap-3 opacity-35">
                <span className="material-symbols-outlined text-lg font-bold">lock</span>
                <span>CSV &amp; Resume Bulk Import</span>
              </li>
              <li className="flex items-center gap-3 opacity-35">
                <span className="material-symbols-outlined text-lg font-bold">lock</span>
                <span>Smart Candidate Fit Scoring</span>
              </li>
              <li className="flex items-center gap-3 opacity-35">
                <span className="material-symbols-outlined text-lg font-bold">lock</span>
                <span>Candidate Comparison Tool</span>
              </li>
              <li className="flex items-center gap-3 opacity-35">
                <span className="material-symbols-outlined text-lg font-bold">lock</span>
                <span>Export Shortlist Reports</span>
              </li>
            </ul>
          </div>
          <button 
            onClick={() => handleCheckout('Free Tier')}
            className="w-full mt-10 py-3 bg-[#0d1515] hover:bg-[#0d1515]/80 text-[#94A3B8] hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-[#3b494b]"
          >
            Get Started For Free
          </button>
        </div>

        {/* Pro Tier card */}
        <div className="relative group rounded-xl">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#06B6D4] to-blue-500 rounded-xl blur-md opacity-25 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative bg-[#151d1e] border-2 border-[#06B6D4] p-8 rounded-2xl flex flex-col justify-between h-full glow-cyan">
            {/* Popular label badge */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#06B6D4] text-[#0d1515] px-4 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-md">
              Most Popular
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl text-[#06B6D4] font-extrabold mb-1">Pro Plan</h3>
                <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-bold">For Professional Hiring</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$19</span>
                <span className="text-xs text-[#94A3B8]">/mo</span>
              </div>
              <hr className="border-[#3b494b]/30" />
              <ul className="space-y-4 text-xs text-white">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#06B6D4] text-lg font-bold">verified</span>
                  <span>50 screening sessions / month</span>
                </li>
                <li className="flex items-center gap-3 font-semibold">
                  <span className="material-symbols-outlined text-[#06B6D4] text-lg font-bold">verified</span>
                  <span>Position-Based Bulk Hiring</span>
                </li>
                <li className="flex items-center gap-3 font-semibold">
                  <span className="material-symbols-outlined text-[#06B6D4] text-lg font-bold">verified</span>
                  <span>CSV &amp; Resume Bulk Import (up to 10/batch)</span>
                </li>
                <li className="flex items-center gap-3 font-semibold">
                  <span className="material-symbols-outlined text-[#06B6D4] text-lg font-bold">verified</span>
                  <span>Smart Candidate Fit Scoring</span>
                </li>
                <li className="flex items-center gap-3 font-semibold">
                  <span className="material-symbols-outlined text-[#06B6D4] text-lg font-bold">verified</span>
                  <span>Candidate Comparison Tool</span>
                </li>
                <li className="flex items-center gap-3 font-semibold">
                  <span className="material-symbols-outlined text-[#06B6D4] text-lg font-bold">verified</span>
                  <span>Export Shortlist Reports</span>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => handleCheckout('Pro Plan')}
              className="w-full mt-10 py-3 bg-[#06B6D4] text-[#0d1515] rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 hover:scale-[1.02] active:scale-95 transition-all shadow-md"
            >
              Upgrade to Pro
              <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Business row description */}
      <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-[#151d1e] border border-dashed border-[#3b494b] text-center space-y-4 pt-8 w-full">
        <div className="flex justify-center">
          <div className="w-10 h-10 rounded bg-[#0d1515] flex items-center justify-center border border-[#3b494b]">
            <span className="material-symbols-outlined text-[#06B6D4] text-xl">corporate_fare</span>
          </div>
        </div>
        <div className="space-y-1">
          <h4 className="text-sm text-white font-bold">Need custom capacity?</h4>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto leading-relaxed">
            Looking for unlimited analyses, SSO/SAML permissions, and custom rubrics templates? Our <span className="text-[#06B6D4] font-bold">Business</span> plan scales to your sizing needs.
          </p>
        </div>
        <button 
          onClick={() => handleCheckout('Business Tier')}
          className="inline-flex items-center gap-1.5 text-[#06B6D4] hover:underline text-xs font-bold uppercase tracking-wide"
        >
          Upgrade to Business
          <span className="material-symbols-outlined text-xs">arrow_outward</span>
        </button>
      </div>
    </div>
  );
}
