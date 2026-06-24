import React from 'react';

export default function AboutPage() {
  const team = [
    { name: 'Dr. Taylor Griggs', role: 'Chief AI Architect', bio: 'Former senior research scientist at DeepMind. Expert in codebase graph models.', initials: 'TG' },
    { name: 'Aria Sterling', role: 'Head of Product', bio: 'Product veteran from Stripe and Glean. Passionate about developer workflows.', initials: 'AS' },
    { name: 'Devon Keanu', role: 'Lead Frontend Engineer', bio: 'Builds beautiful, accessible, and fast web products. Design system geek.', initials: 'DK' }
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-12 glow-effect">
      {/* HEADER */}
      <div className="border-b border-border-main pb-4">
        <h1 className="text-3xl font-extrabold text-text-main">About CodeWalk</h1>
        <p className="text-xs text-muted-text mt-1">Our mission is to make codebase comprehension fast, interactive, and seamless.</p>
      </div>

      {/* VISION & MISSION */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-text-main">The Code Comprehension Challenge</h2>
          <p className="text-sm text-muted-text leading-relaxed">
            Modern software engineering spends more time reading and understanding code than writing it. Whether it is onboarding new hires, reviewing pull requests, or evaluating technical candidates, understanding the files and architectural intent is a massive manual effort.
          </p>
          <p className="text-sm text-muted-text leading-relaxed">
            CodeWalk was founded in 2026 to automate codebase comprehension. By indexing repositories and leveraging Llama 3.3 models via Groq, we create slide-by-slide active-recall walks, making it easy for interviewers and developers to test comprehension instantly.
          </p>
        </div>
        <div className="p-8 bg-primary/5 border border-primary/10 rounded-3xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <h3 className="text-primary font-bold uppercase tracking-wider text-xs mb-2">Our Vision</h3>
          <p className="text-base text-text-main font-bold leading-relaxed">
            &ldquo;To democratize software architecture comprehension, transforming codebases into living, teaching narratives that anyone can navigate in seconds.&rdquo;
          </p>
        </div>
      </section>

      {/* TIMELINE / VALUES */}
      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-text-main text-center">Core Pillars</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-card-main border border-border-main rounded-2xl flex flex-col gap-2">
            <span className="text-lg font-bold text-primary">01. Precision</span>
            <p className="text-xs text-muted-text leading-relaxed">
              We target actual, visible code lines. We avoid vague summaries and instead generate questions about concrete logic flows.
            </p>
          </div>
          <div className="p-5 bg-card-main border border-border-main rounded-2xl flex flex-col gap-2">
            <span className="text-lg font-bold text-primary">02. Breadth</span>
            <p className="text-xs text-muted-text leading-relaxed">
              We cover code logic, structural project patterns, markdown documentation, and real-world domain use cases.
            </p>
          </div>
          <div className="p-5 bg-card-main border border-border-main rounded-2xl flex flex-col gap-2">
            <span className="text-lg font-bold text-primary">03. Openness</span>
            <p className="text-xs text-muted-text leading-relaxed">
              We integrate with GitHub, GitLab, and Bitbucket. Developers get full access to code data and scorecards via open JSON APIs.
            </p>
          </div>
        </div>
      </section>

      {/* TEAM SECTION */}
      <section className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-text-main text-center">Our Leadership</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {team.map((member) => (
            <div key={member.name} className="p-5 bg-card-main border border-border-main rounded-2xl flex flex-col items-center text-center gap-3">
              <span className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center text-white font-extrabold text-md shadow-md shadow-primary/10">
                {member.initials}
              </span>
              <div>
                <h4 className="text-sm font-bold text-text-main">{member.name}</h4>
                <p className="text-[10px] text-primary font-semibold mt-0.5">{member.role}</p>
              </div>
              <p className="text-xs text-muted-text leading-relaxed mt-2">{member.bio}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
