'use client';

import React, { useState } from 'react';

export default function PolicyPage() {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-10 py-10 glow-effect">
      {/* HEADER */}
      <div className="border-b border-border-main pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-text-main">Legal Policies</h1>
          <p className="text-xs text-muted-text mt-1">Review the Privacy Policy and Terms of Service governing the use of CodeWalk.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-muted-bg border border-border-main p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'privacy' ? 'bg-primary text-white' : 'text-muted-text hover:text-text-main'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'terms' ? 'bg-primary text-white' : 'text-muted-text hover:text-text-main'
            }`}
          >
            Terms of Service
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* SIDEBAR TABLE OF CONTENTS */}
        <div className="md:col-span-1 hidden md:block">
          <div className="sticky top-24 flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-main mb-2">Sections</h4>
            <a href="#introduction" className="text-xs text-muted-text hover:text-primary transition-colors">1. Introduction</a>
            <a href="#data-collection" className="text-xs text-muted-text hover:text-primary transition-colors">2. Data Indexation</a>
            <a href="#security" className="text-xs text-muted-text hover:text-primary transition-colors">3. Security Audits</a>
            <a href="#cookies" className="text-xs text-muted-text hover:text-primary transition-colors">4. Web Cookies</a>
            <a href="#contact" className="text-xs text-muted-text hover:text-primary transition-colors">5. Contact Legal</a>
          </div>
        </div>

        {/* CONTENT */}
        <div className="md:col-span-3 bg-card-main border border-border-main rounded-3xl p-8 shadow-sm text-sm text-muted-text leading-relaxed space-y-6">
          {activeTab === 'privacy' ? (
            <>
              <h2 id="introduction" className="text-lg font-bold text-text-main">1. Introduction</h2>
              <p>
                At CodeWalk, accessible from codewalk.com, one of our main priorities is the privacy of our visitors and users. This Privacy Policy document contains types of information that is collected and recorded by CodeWalk and how we use it.
              </p>
              
              <h2 id="data-collection" className="text-lg font-bold text-text-main">2. Repository Data Indexation</h2>
              <p>
                When you input a GitHub repository URL, we fetch file names, directories, and code contents to generate question materials using LLM models. CodeWalk does not cache, sell, or permanently store repository code files in any databases. All code parsing runs ephemeral in memory and is discarded immediately after question generation is compiled.
              </p>

              <h2 id="security" className="text-lg font-bold text-text-main">3. Data Security and Transit</h2>
              <p>
                All data transit between our servers, the GitHub API, and your local browser is fully encrypted via TLS/HTTPS. We enforce strict role-based access for token generation and API key actions. If you connection your account to GitLab or Bitbucket, credentials are encrypted at rest.
              </p>

              <h2 id="cookies" className="text-lg font-bold text-text-main">4. Cookies and Web Storage</h2>
              <p>
                We use localStorage to persist your active theme, guest token usage, user session configurations, and local scorecards. You can wipe this local data anytime by clearing your browser cache.
              </p>

              <h2 id="contact" className="text-lg font-bold text-text-main">5. Contact Legal Desk</h2>
              <p>
                If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact our legal desk at <span className="text-primary font-semibold">legal@codewalk.com</span>.
              </p>
            </>
          ) : (
            <>
              <h2 id="introduction" className="text-lg font-bold text-text-main">1. Terms of Agreement</h2>
              <p>
                These Terms of Service govern your use of the CodeWalk application. By accessing our platform, you accept these terms in full. If you disagree with any part of these terms, please do not use our services.
              </p>

              <h2 id="data-collection" className="text-lg font-bold text-text-main">2. User Account and API Tokens</h2>
              <p>
                You are responsible for safeguarding your personal user accounts and developer API tokens. CodeWalk is not liable for unauthorized access or credit consumption caused by exposed API keys.
              </p>

              <h2 id="security" className="text-lg font-bold text-text-main">3. Subscription Billing and Refunds</h2>
              <p>
                Pro plans are charged monthly or annually. You can cancel your subscription at any time. Canceled accounts will retain Pro access until the end of the billing period. We do not offer prorated refunds for partially consumed billing months.
              </p>

              <h2 id="cookies" className="text-lg font-bold text-text-main">4. Ephemeral Repository Clause</h2>
              <p>
                You must possess the legal right or permission to index the repositories you analyze on CodeWalk. CodeWalk disclaims liability for any indexations that violate copyright agreements or corporate repository policies.
              </p>

              <h2 id="contact" className="text-lg font-bold text-text-main">5. Changes to Terms</h2>
              <p>
                We reserve the right to revise these terms at any time. We will post notification of changes on the landing page, and continued use of the platform constitutes agreement to the updated clauses.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
