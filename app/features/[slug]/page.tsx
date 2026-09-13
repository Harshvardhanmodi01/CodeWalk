import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

/* ─── Feature content map ──────────────────────────────────────────── */
const features: Record<string, {
  title: string;
  tagline: string;
  icon: string;
  description: string;
  bullets: string[];
  cta: string;
  ctaHref: string;
}> = {
  'repo-based-questioning': {
    title: 'Repo-Based Questioning',
    tagline: 'AI that actually reads your codebase',
    icon: '🔍',
    description:
      'CodeWalk indexes any GitHub repository in seconds and generates precise, context-aware questions based on the actual code — architecture, patterns, edge cases, and all. No generic trivia, just questions tailored to your stack.',
    bullets: [
      'Indexes public & private repos via GitHub OAuth',
      'Understands file structure, dependencies, and coding patterns',
      'Generates questions from real code: functions, classes, tests',
      'Covers architecture decisions, performance, and security',
      'Auto-adjusts difficulty based on seniority level',
    ],
    cta: 'Try Repo-Based Questioning',
    ctaHref: '/workspace',
  },
  'jd-based-assessment': {
    title: 'JD-Based Assessment',
    tagline: 'Turn a job description into a full interview',
    icon: '📋',
    description:
      'Paste any job description and CodeWalk instantly generates a complete, role-specific assessment covering all listed skills, responsibilities, and experience expectations — saving hours of manual question writing.',
    bullets: [
      'Parses skills, tools, and requirements from any JD format',
      'Maps requirements to targeted technical questions',
      'Covers both hard skills (languages, frameworks) and soft skills',
      'Generates structured rubrics aligned to the JD',
      'Supports multiple seniority levels from the same JD',
    ],
    cta: 'Start a JD-Based Assessment',
    ctaHref: '/workspace',
  },
  'live-ai-interview': {
    title: 'Live AI Interview',
    tagline: 'A real-time interviewer that never sleeps',
    icon: '🎙️',
    description:
      'The Live AI Interview conducts a full, voice-driven technical interview in real time. It asks follow-up questions, adapts based on the candidate\'s answers, and evaluates responses on the fly — just like a senior engineer would.',
    bullets: [
      'Real-time voice interaction with natural conversation flow',
      'Adaptive follow-up questions based on candidate responses',
      'Covers live coding, system design, and behavioral scenarios',
      'Instant scoring and feedback after each answer',
      'Full transcript and recording available post-interview',
    ],
    cta: 'Launch a Live AI Interview',
    ctaHref: '/workspace',
  },
  'technical-assessment': {
    title: 'Technical Assessment',
    tagline: 'Deep technical evaluation, automated',
    icon: '⚙️',
    description:
      'Run rigorous technical assessments covering algorithms, data structures, system design, debugging, and code review — all evaluated automatically with detailed rubric-based scoring.',
    bullets: [
      'Multi-topic coverage: DSA, system design, code review, debugging',
      'Auto-graded coding challenges with test case evaluation',
      'Configurable time limits and difficulty tiers',
      'Detailed score breakdown per topic and question',
      'Benchmark scores against top performers in your pipeline',
    ],
    cta: 'Run a Technical Assessment',
    ctaHref: '/workspace',
  },
  'behavioral-assessment': {
    title: 'Behavioral Assessment',
    tagline: 'Evaluate culture fit and soft skills at scale',
    icon: '🧠',
    description:
      'Go beyond technical skills. CodeWalk\'s behavioral assessment uses STAR-based structured questions to evaluate communication, leadership, conflict resolution, and teamwork — then scores responses with AI.',
    bullets: [
      'STAR-format behavioral questions (Situation, Task, Action, Result)',
      'Covers communication, collaboration, ownership, and adaptability',
      'AI scoring aligned to your company\'s values and competencies',
      'Identifies red flags and standout candidates automatically',
      'Side-by-side comparison of behavioral scores across candidates',
    ],
    cta: 'Run Behavioral Assessment',
    ctaHref: '/workspace',
  },
  'ai-proctoring': {
    title: 'AI Proctoring',
    tagline: 'Integrity-first remote assessment',
    icon: '🛡️',
    description:
      'Ensure assessment integrity with AI-powered proctoring — tab-switch detection, copy-paste blocking, unusual activity flags, and real-time alerts — without invasive surveillance of candidates.',
    bullets: [
      'Detects tab switching, window focus loss, and screen sharing',
      'Blocks copy-paste within the coding environment',
      'Flags unusual pause patterns and typing speed anomalies',
      'Real-time recruiter alerts for suspicious activity',
      'Post-interview integrity report with evidence snapshots',
    ],
    cta: 'Enable AI Proctoring',
    ctaHref: '/pricing',
  },
  'high-volume-hiring': {
    title: 'High-Volume Hiring',
    tagline: 'Screen hundreds of candidates in hours, not weeks',
    icon: '🚀',
    description:
      'Built for teams processing hundreds of applicants per role. CodeWalk automates the entire first-round screening — from assessment delivery to ranking — so your team only reviews the best.',
    bullets: [
      'Send assessments to unlimited candidates simultaneously',
      'Auto-rank candidates by composite score',
      'Custom knockout filters to instantly eliminate disqualified candidates',
      'ATS integrations for seamless candidate import/export',
      'Recruiter dashboard with real-time pipeline progress',
    ],
    cta: 'Scale Your Hiring',
    ctaHref: '/pricing',
  },
  'campus-recruiting': {
    title: 'Campus Recruiting',
    tagline: 'Find top student talent before competitors do',
    icon: '🎓',
    description:
      'Run structured, fair campus assessments that identify high-potential students early — with tools built for the unique challenges of internship and new-grad hiring.',
    bullets: [
      'Entry-level and internship-specific question banks',
      'University-specific cohort benchmarking',
      'Bulk invite and track candidates from multiple campuses',
      'Diversity-aware screening with bias reduction controls',
      'Structured offer-readiness reports for each candidate',
    ],
    cta: 'Start Campus Hiring',
    ctaHref: '/pricing',
  },
  'software-engineering': {
    title: 'Built for Software Engineering',
    tagline: 'Every layer of the SWE interview, covered',
    icon: '💻',
    description:
      'From frontend to backend, mobile to DevOps — CodeWalk covers the full breadth of software engineering roles with role-specific question banks, live coding environments, and system design scenarios.',
    bullets: [
      'Role-specific tracks: frontend, backend, full-stack, mobile, DevOps',
      'Live coding environment with real-time syntax highlighting',
      'System design whiteboards for senior+ roles',
      'Language-specific questions: Python, JavaScript, Go, Rust, Java, and more',
      'Codebase walkthroughs using the candidate\'s own GitHub projects',
    ],
    cta: 'Hire Software Engineers',
    ctaHref: '/workspace',
  },
  'data-science': {
    title: 'Built for Data Science',
    tagline: 'Assess real data skills, not just theory',
    icon: '📊',
    description:
      'Evaluate data scientists on the skills that matter: statistical thinking, model building, SQL proficiency, data wrangling, and ML intuition — with practical, hands-on assessments.',
    bullets: [
      'SQL and pandas data manipulation challenges',
      'Statistics, probability, and hypothesis testing questions',
      'ML model selection and evaluation scenarios',
      'Python/R data analysis coding exercises',
      'Case study assessments using real datasets',
    ],
    cta: 'Hire Data Scientists',
    ctaHref: '/workspace',
  },
  'machine-learning': {
    title: 'Built for Machine Learning',
    tagline: 'Deep evaluation for ML engineers and researchers',
    icon: '🤖',
    description:
      'Go deep on ML fundamentals, model architecture, training pipelines, and deployment — with assessments designed specifically for ML engineers, applied scientists, and AI researchers.',
    bullets: [
      'Deep learning architecture and backpropagation questions',
      'Model training, regularization, and hyperparameter tuning scenarios',
      'MLOps and deployment pipeline assessment',
      'Paper-reading comprehension for research roles',
      'PyTorch/TensorFlow coding exercises',
    ],
    cta: 'Hire ML Engineers',
    ctaHref: '/workspace',
  },
};

/* ─── Dynamic Metadata ─────────────────────────────────────────────── */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const feature = features[slug];
  if (!feature) return { title: 'Feature Not Found | CodeWalk' };
  return {
    title: `${feature.title} | CodeWalk`,
    description: feature.description.slice(0, 155),
  };
}

export function generateStaticParams() {
  return Object.keys(features).map((slug) => ({ slug }));
}

/* ─── Page Component ───────────────────────────────────────────────── */
export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = features[slug];
  if (!feature) notFound();

  return (
    <main className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">

      {/* Back breadcrumb */}
      <Link href="/"
        className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-[#06B6D4] transition-colors mb-10 group">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="group-hover:-translate-x-0.5 transition-transform" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to home
      </Link>

      {/* Hero */}
      <div className="mb-12">
        <div className="text-5xl mb-5" role="img" aria-label={feature.title}>{feature.icon}</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-3">
          {feature.title}
        </h1>
        <p className="text-lg text-[#06B6D4] font-medium mb-6">{feature.tagline}</p>
        <p className="text-base text-on-surface-variant leading-relaxed max-w-2xl">
          {feature.description}
        </p>
      </div>

      {/* Key capabilities */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-foreground mb-5">Key Capabilities</h2>
        <ul className="flex flex-col gap-3">
          {feature.bullets.map((bullet) => (
            <li key={bullet}
              className="flex items-start gap-3 p-4 rounded-xl border border-outline-variant bg-card-main/60">
              <span className="mt-0.5 h-5 w-5 rounded-full bg-[#06B6D4]/15 flex items-center justify-center flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#06B6D4"
                  strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span className="text-sm text-foreground leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={feature.ctaHref}
          className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#06B6D4,#6366f1)' }}>
          {feature.cta}
        </Link>
        <Link href="/pricing"
          className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold border border-outline-variant text-foreground hover:bg-white/5 transition-all">
          View Pricing
        </Link>
      </div>

    </main>
  );
}
