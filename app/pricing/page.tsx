'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';
import PageHero from '@/components/landing/PageHero';
import ScrollReveal from '@/components/landing/ScrollReveal';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--primary)', flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.4, flexShrink: 0 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const socialProof = [
  { label: 'Engineering teams', value: '500+' },
  { label: 'Interviews run', value: '12k+' },
  { label: 'Avg. time saved', value: '4 hrs' },
  { label: 'Satisfaction', value: '4.9★' },
];

export default function PublicPricingPage() {
  const router = useRouter();
  const { user, upgradeSubscription } = useGlobal();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
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

      const amount = tier === 'Pro Plan' ? 190000 : 990000;
      const currency = 'INR';

      toast.loading('Initializing secure checkout...', { id: 'checkout' });

      const orderRes = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, receipt: `receipt_${user.id.slice(0, 8)}` }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to initialize payment.');

      toast.dismiss('checkout');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CodeWalk',
        description: `Upgrade to ${tier}`,
        order_id: orderData.id,
        prefill: { name: user.name || '', email: user.email || '' },
        theme: { color: '#00DBE9' },
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
                tier,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Signature verification failed.');
            toast.success(`Success! Upgraded to ${tier}!`, { id: 'verify' });
            setTimeout(() => window.location.reload(), 1000);
          } catch (err: any) {
            toast.error(`Verification Failed: ${err.message}`, { id: 'verify' });
          }
        },
        modal: { ondismiss: () => toast.error('Payment checkout cancelled.') },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.dismiss('checkout');
      toast.error(`Checkout failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <PageHero
        badge="Pricing Plans"
        title="Simple, transparent pricing"
        titleHighlight="transparent pricing"
        subtitle="From individual developers exploring codebases to engineering recruitment teams running candidate screeners."
      />

      {/* Social Proof Strip */}
      <ScrollReveal>
        <div
          className="py-6 px-4"
          style={{ background: 'color-mix(in srgb, var(--muted-background) 70%, transparent)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {socialProof.map((s) => (
              <div key={s.label}>
                <p
                  className="text-2xl font-black"
                  style={{ fontFamily: 'var(--font-dm-sans)', color: 'var(--primary)' }}
                >
                  {s.value}
                </p>
                <p className="text-xs text-muted-text mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Pricing Cards */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">

          {/* Free Tier */}
          <ScrollReveal stagger={1}>
            <div className="premium-card p-8 flex flex-col justify-between h-full cursor-default">
              <div className="space-y-6">
                <div>
                  <h3
                    className="text-xl font-extrabold text-foreground mb-1"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    Free Tier
                  </h3>
                  <p className="text-[10px] text-muted-text uppercase tracking-wider font-bold">For Individual Exploration</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-foreground" style={{ fontFamily: 'var(--font-dm-sans)' }}>$0</span>
                  <span className="text-sm text-muted-text">/mo</span>
                </div>
                <hr style={{ borderColor: 'var(--border)', opacity: 0.4 }} />
                <ul className="space-y-3">
                  {[
                    { text: '5 analyses / month', locked: false },
                    { text: '5 screening sessions / month', locked: false },
                    { text: 'Position-Based Bulk Hiring', locked: true },
                    { text: 'CSV & Resume Bulk Import', locked: true },
                    { text: 'Smart Candidate Fit Scoring', locked: true },
                    { text: 'Candidate Comparison Tool', locked: true },
                    { text: 'Export Shortlist Reports', locked: true },
                  ].map((item) => (
                    <li key={item.text} className={`flex items-center gap-3 text-sm ${item.locked ? 'opacity-40' : ''}`}>
                      {item.locked ? <LockIcon /> : <CheckIcon />}
                      <span className={item.locked ? 'text-muted-text' : 'text-foreground'}>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleCheckout('Free Tier')}
                className="w-full mt-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer hover:opacity-80"
                style={{ background: 'var(--muted-background)', border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                Get Started For Free
              </button>
            </div>
          </ScrollReveal>

          {/* Pro Plan */}
          <ScrollReveal stagger={2}>
            <div className="relative h-full">
              {/* Animated glow halo */}
              <div
                className="absolute -inset-1 rounded-2xl opacity-30 blur-md"
                style={{ background: 'linear-gradient(135deg, var(--primary), #6366f1, #a855f7)' }}
                aria-hidden="true"
              />
              <div className="relative h-full gradient-border rounded-2xl">
                <div
                  className="h-full premium-glass rounded-2xl p-8 flex flex-col justify-between"
                  style={{ border: 'none' }}
                >
                  {/* Popular badge */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span
                      className="shimmer-badge px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-lg"
                      style={{ color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)' }}
                    >
                      Most Popular
                    </span>
                  </div>

                  <div className="space-y-6 pt-2">
                    <div>
                      <h3
                        className="text-xl font-extrabold mb-1 gradient-text"
                        style={{ fontFamily: 'var(--font-dm-sans)' }}
                      >
                        Pro Plan
                      </h3>
                      <p className="text-[10px] text-muted-text uppercase tracking-wider font-bold">For Professional Hiring</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-foreground" style={{ fontFamily: 'var(--font-dm-sans)' }}>$19</span>
                      <span className="text-sm text-muted-text">/mo</span>
                    </div>
                    <hr style={{ borderColor: 'var(--border)', opacity: 0.4 }} />
                    <ul className="space-y-3">
                      {[
                        '50 screening sessions / month',
                        'Position-Based Bulk Hiring',
                        'CSV & Resume Bulk Import (up to 10/batch)',
                        'Smart Candidate Fit Scoring',
                        'Candidate Comparison Tool',
                        'Export Shortlist Reports',
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-3 text-sm font-medium text-foreground">
                          <CheckIcon />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleCheckout('Pro Plan')}
                    className="w-full mt-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:brightness-110 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, var(--primary), #6366f1)', color: '#fff', boxShadow: '0 4px 20px color-mix(in srgb, var(--primary) 30%, transparent)' }}
                  >
                    Upgrade to Pro
                    <ArrowRightIcon />
                  </button>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Business Tier */}
        <ScrollReveal stagger={3} className="mt-8">
          <div
            className="premium-glass rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{ border: '1px dashed color-mix(in srgb, var(--primary) 25%, var(--border))' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Need custom capacity?</h4>
                <p className="text-xs text-muted-text mt-0.5 max-w-sm leading-relaxed">
                  Unlimited analyses, SSO/SAML permissions, and custom rubric templates —{' '}
                  <span className="font-bold" style={{ color: 'var(--primary)' }}>Business</span> scales to your team.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCheckout('Business Tier')}
              className="flex-shrink-0 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: 'var(--primary)' }}
            >
              Upgrade to Business
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
              </svg>
            </button>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
