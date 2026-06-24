'use client';

import React, { useState } from 'react';

export default function SupportPage() {
  const [ticketName, setTicketName] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does CodeWalk connect to private repositories?',
      a: 'If you connect your GitHub, GitLab, or Bitbucket account under Profile Settings, CodeWalk can fetch your private repositories securely using OAuth tokens. We index files on-the-fly and do not store your code permanently.'
    },
    {
      q: 'What are token credits and how are they calculated?',
      a: 'Token credits are used when the AI reads your code files to generate slide questions. Typically, indexing a repository fetches the top 3 files, consuming roughly 2,000 to 5,000 tokens depending on the file lengths.'
    },
    {
      q: 'Can I export the interview scorecards?',
      a: 'Yes! Interviewers can rate candidate answers (Poor, Average, Good, Excellent) and type evaluator notes directly on the slides. Once completed, you can export the full report as a PDF document or copy a structured JSON payload for external applicant tracking systems.'
    },
    {
      q: 'Which programming languages are supported?',
      a: 'We support all major programming languages including TypeScript, JavaScript, Python, Java, Go, Rust, C++, Ruby, PHP, Swift, and Kotlin.'
    }
  ];

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
    <div className="max-w-4xl mx-auto flex flex-col gap-12 py-10 glow-effect">
      {/* HEADER */}
      <div className="border-b border-border-main pb-4">
        <h1 className="text-3xl font-extrabold text-text-main">Support & FAQs</h1>
        <p className="text-xs text-muted-text mt-1">Get help from our support team, explore documentation, and read typical queries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* FAQ ACCORDION */}
        <div className="md:col-span-3 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-text-main">Frequently Asked Questions</h2>
          <div className="flex flex-col gap-3">
            {faqs.map((faq, idx) => {
              const open = faqOpenIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-card-main border border-border-main rounded-2xl overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left p-4 flex items-center justify-between font-bold text-sm text-text-main hover:bg-muted-bg/50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <svg
                      className={`w-4 h-4 text-primary transition-transform ${open ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 text-xs text-muted-text leading-relaxed border-t border-border-main/50 pt-3 bg-muted-bg/10">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* TICKET FORM */}
        <div className="md:col-span-2 bg-card-main border border-border-main rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-text-main mb-4 uppercase tracking-wider">Submit a Ticket</h2>
          
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-500 text-xs rounded-xl p-3 text-center mb-4 animate-pulse">
              ✓ Ticket submitted! We will respond within 24 hours.
            </div>
          )}

          <form onSubmit={handleTicketSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1 uppercase tracking-wide">Your Name</label>
              <input
                type="text"
                required
                value={ticketName}
                onChange={(e) => setTicketName(e.target.value)}
                placeholder="Sarah Connor"
                className="w-full px-3 py-2 bg-muted-bg border border-border-main rounded-xl text-sm text-text-main focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1 uppercase tracking-wide">Work Email</label>
              <input
                type="email"
                required
                value={ticketEmail}
                onChange={(e) => setTicketEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 bg-muted-bg border border-border-main rounded-xl text-sm text-text-main focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-text mb-1 uppercase tracking-wide">Message / Issue Details</label>
              <textarea
                required
                rows={4}
                value={ticketMsg}
                onChange={(e) => setTicketMsg(e.target.value)}
                placeholder="Describe your issue or feature request in detail..."
                className="w-full px-3 py-2 bg-muted-bg border border-border-main rounded-xl text-sm text-text-main focus:outline-none focus:border-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary/10"
            >
              Send Support Ticket
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
