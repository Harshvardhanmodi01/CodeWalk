'use client';

import React, { useState } from 'react';
import PageHero from '@/components/landing/PageHero';
import ScrollReveal from '@/components/landing/ScrollReveal';

const faqs = [
  {
    q: 'How does CodeWalk connect to private repositories?',
    a: 'If you connect your GitHub, GitLab, or Bitbucket account under Profile Settings, CodeWalk can fetch your private repositories securely using OAuth tokens. We index files on-the-fly and do not store your code permanently.',
  },
  {
    q: 'What are token credits and how are they calculated?',
    a: 'Token credits are used when the AI reads your code files to generate slide questions. Typically, indexing a repository fetches the top 3 files, consuming roughly 2,000 to 5,000 tokens depending on the file lengths.',
  },
  {
    q: 'Can I export the interview scorecards?',
    a: 'Yes! Interviewers can rate candidate answers (Poor, Average, Good, Excellent) and type evaluator notes directly on the slides. Once completed, you can export the full report as a PDF document or copy a structured JSON payload for external applicant tracking systems.',
  },
  {
    q: 'Which programming languages are supported?',
    a: 'We support all major programming languages including TypeScript, JavaScript, Python, Java, Go, Rust, C++, Ruby, PHP, Swift, and Kotlin.',
  },
  {
    q: 'Is my source code stored on CodeWalk servers?',
    a: 'No. CodeWalk fetches and indexes your code in memory at analysis time to generate questions. We never persist raw source files to our servers or databases.',
  },
];

const quickLinks = [
  {
    label: 'Documentation',
    description: 'Guides, API reference, and tutorials',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    href: '#',
  },
  {
    label: 'Discord Community',
    description: 'Chat with developers and the team',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
      </svg>
    ),
    href: '#',
  },
  {
    label: 'GitHub',
    description: 'Open issues and feature requests',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    href: '#',
  },
];

export default function SupportPage() {
  const [ticketName, setTicketName] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketName.trim() || !ticketEmail.trim() || !ticketMsg.trim()) return;
    setSuccess(true);
    setTicketName('');
    setTicketEmail('');
    setTicketMsg('');
    setTimeout(() => setSuccess(false), 4000);
  };

  const toggleFaq = (index: number) => {
    setFaqOpenIndex(faqOpenIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <PageHero
        badge="Help Center"
        title="Support & FAQs"
        titleHighlight="Support"
        subtitle="Get help from our team, explore documentation, and find answers to common questions instantly."
      />

      {/* Quick Links */}
      <section
        className="py-10 px-4 sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--muted-background) 60%, transparent)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map((link, i) => (
            <ScrollReveal key={link.label} stagger={(i + 1) as 1 | 2 | 3}>
              <a
                href={link.href}
                className="premium-card p-5 flex items-center gap-4 cursor-pointer group no-underline"
                aria-label={link.label}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                  style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
                >
                  {link.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{link.label}</p>
                  <p className="text-xs text-muted-text mt-0.5">{link.description}</p>
                </div>
                <svg
                  className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ color: 'var(--primary)', flexShrink: 0 }}
                  aria-hidden="true"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Main content: FAQ + Form */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

          {/* FAQ Accordion */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <ScrollReveal>
              <h2
                className="text-2xl font-extrabold text-foreground mb-6"
                style={{ fontFamily: 'var(--font-dm-sans)' }}
              >
                Frequently Asked Questions
              </h2>
            </ScrollReveal>

            {faqs.map((faq, idx) => {
              const isOpen = faqOpenIndex === idx;
              return (
                <ScrollReveal key={idx} stagger={((idx % 5) + 1) as 1 | 2 | 3 | 4 | 5}>
                  <div
                    className="premium-glass rounded-2xl overflow-hidden"
                    style={{ border: isOpen ? '1px solid color-mix(in srgb, var(--primary) 30%, var(--border))' : undefined }}
                  >
                    <button
                      id={`faq-btn-${idx}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-content-${idx}`}
                      onClick={() => toggleFaq(idx)}
                      className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer transition-colors duration-200"
                      style={{ background: isOpen ? 'color-mix(in srgb, var(--primary) 4%, transparent)' : 'transparent' }}
                    >
                      <span className="text-sm font-bold text-foreground leading-snug">{faq.q}</span>
                      <div
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          background: isOpen ? 'var(--primary)' : 'color-mix(in srgb, var(--primary) 10%, transparent)',
                          color: isOpen ? '#fff' : 'var(--primary)',
                          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                        }}
                        aria-hidden="true"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </div>
                    </button>

                    {/* Smooth accordion body */}
                    <div
                      id={`faq-content-${idx}`}
                      role="region"
                      aria-labelledby={`faq-btn-${idx}`}
                      className={`faq-content ${isOpen ? 'open' : ''}`}
                    >
                      <div className="faq-inner">
                        <div
                          className="px-5 pb-5 pt-1 text-sm text-muted-text leading-relaxed"
                          style={{ borderTop: '1px solid color-mix(in srgb, var(--border) 60%, transparent)' }}
                        >
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {/* Ticket Form */}
          <div className="lg:col-span-2 lg:sticky lg:top-24">
            <ScrollReveal stagger={2}>
              <div className="premium-glass rounded-3xl p-7 flex flex-col gap-5">
                <div>
                  <h2
                    className="text-lg font-extrabold text-foreground"
                    style={{ fontFamily: 'var(--font-dm-sans)' }}
                  >
                    Submit a Ticket
                  </h2>
                  <p className="text-xs text-muted-text mt-1">We respond within 24 hours.</p>
                </div>

                {/* Success Message */}
                {success && (
                  <div
                    className="rounded-xl p-3 text-center text-sm font-bold"
                    style={{
                      background: 'color-mix(in srgb, #22C55E 10%, transparent)',
                      border: '1px solid color-mix(in srgb, #22C55E 30%, transparent)',
                      color: '#22C55E',
                    }}
                    role="status"
                    aria-live="polite"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Ticket submitted! We&apos;ll respond within 24 hours.
                  </div>
                )}

                <form onSubmit={handleTicketSubmit} className="flex flex-col gap-4" noValidate>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ticket-name" className="text-xs font-bold uppercase tracking-wider text-muted-text">
                      Your Name
                    </label>
                    <input
                      id="ticket-name"
                      type="text"
                      required
                      value={ticketName}
                      onChange={(e) => setTicketName(e.target.value)}
                      placeholder="Sarah Connor"
                      className="premium-input px-3 py-2.5 w-full text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ticket-email" className="text-xs font-bold uppercase tracking-wider text-muted-text">
                      Work Email
                    </label>
                    <input
                      id="ticket-email"
                      type="email"
                      required
                      value={ticketEmail}
                      onChange={(e) => setTicketEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="premium-input px-3 py-2.5 w-full text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ticket-message" className="text-xs font-bold uppercase tracking-wider text-muted-text">
                      Message / Issue Details
                    </label>
                    <textarea
                      id="ticket-message"
                      required
                      rows={4}
                      value={ticketMsg}
                      onChange={(e) => setTicketMsg(e.target.value)}
                      placeholder="Describe your issue or feature request in detail..."
                      className="premium-input px-3 py-2.5 w-full text-sm resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary), #6366f1)',
                      color: '#fff',
                      boxShadow: '0 4px 16px color-mix(in srgb, var(--primary) 25%, transparent)',
                    }}
                  >
                    Send Support Ticket
                  </button>
                </form>

                {/* Response Time Badge */}
                <div className="flex items-center gap-2 justify-center">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: '#22C55E' }}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] text-muted-text">Average response time: &lt;4 hours</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
