'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoadingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(12);
  const [timeRemaining, setTimeRemaining] = useState(25);
  const [activeStep, setActiveStep] = useState(1); // 1 = Fetching, 2 = Parsing, 3 = Generating, 4 = Quality Check, 5 = Done
  const [consoleLines, setConsoleLines] = useState<string[]>([
    'connection_established: origin: GitHub',
    'repo_cloned: HEAD at 14a2c91',
  ]);

  // Seeding simulated files on load
  useEffect(() => {
    const tempRepo = localStorage.getItem('cw_temp_repo') || 'github.com/johndoe/ecommerce-app';
    const tempCandidate = localStorage.getItem('cw_temp_candidate') || 'Rahul Sharma';

    // 1. Fetching repository
    const t1 = setTimeout(() => {
      setActiveStep(2);
      setProgress(35);
      setTimeRemaining(18);
      setConsoleLines((prev) => [
        ...prev,
        `parsing_entrypoint: src/index.ts ...`,
        `analyzing_ast: parsing structures for ${tempRepo}`,
      ]);
    }, 3000);

    // 2. Parsing structures
    const t2 = setTimeout(() => {
      setActiveStep(3);
      setProgress(64);
      setTimeRemaining(10);
      setConsoleLines((prev) => [
        ...prev,
        'mapping_dependencies: cycle_check: passed',
        'identifying_hooks: Found 12 custom closures and hooks',
        'generating_assessment_vector: target: candidate profiles',
      ]);
    }, 6000);

    // 3. Generating questions
    const t3 = setTimeout(() => {
      setActiveStep(4);
      setProgress(88);
      setTimeRemaining(4);
      setConsoleLines((prev) => [
        ...prev,
        'building_questions: AST context matching',
        'running_critique: score thresholds validated',
        'quality_gate: verified question integrity',
      ]);
    }, 9000);

    // 4. Quality gate & redirect
    const t4 = setTimeout(() => {
      setActiveStep(5);
      setProgress(100);
      setTimeRemaining(0);
      setConsoleLines((prev) => [
        ...prev,
        'assessment_stored: session_saved successfully',
        'redirecting_to_workspace...',
      ]);

      // Add to analyses in localStorage
      const stored = localStorage.getItem('cw_analyses');
      const analyses = stored ? JSON.parse(stored) : [];
      
      const newJobId = `job_${Date.now()}`;
      
      // Update quota count
      const q = localStorage.getItem('cw_quota_analyses');
      const currentQuota = q ? parseInt(q) : 3;
      localStorage.setItem('cw_quota_analyses', Math.min(5, currentQuota + 1).toString());

      // Update tokens count
      const t = localStorage.getItem('cw_quota_tokens');
      const currentTokens = t ? parseInt(t) : 45230;
      localStorage.setItem('cw_quota_tokens', Math.min(100000, currentTokens + 15600).toString());

      // Dispatch event to update QuotaBadge
      window.dispatchEvent(new Event('quotaUpdated'));

      const newAnalysis = {
        jobId: newJobId,
        repo: tempRepo,
        candidateName: tempCandidate,
        status: 'READY',
        createdAt: 'Just now',
        questionsCount: 6,
        score: 85
      };

      localStorage.setItem('cw_analyses', JSON.stringify([newAnalysis, ...analyses]));

      // Redirect
      router.push(`/results/${newJobId}`);
    }, 12000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [router]);

  return (
    <div className="flex-1 bg-surface min-h-screen flex flex-col relative select-none">
      
      {/* Top Navbar Header (Fixed Visual) */}
      <header className="flex justify-between items-center px-margin-desktop py-4 bg-surface/80 backdrop-blur-md border-b border-outline-variant z-10 select-none">
        <span className="font-headline-md text-headline-md font-bold text-primary-fixed">CodeWalk</span>
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-xs text-on-surface-variant">Live compiler session</span>
          <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed animate-ping"></span>
        </div>
      </header>

      {/* Moving Code Background Animation */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-[0.04] pointer-events-none code-bg-container">
        <div className="code-scroll font-code-md text-code-md text-primary-fixed-dim whitespace-pre p-10 leading-relaxed font-mono">
          <code>
            {`function initializeEnvironment() {
  const workspace = new DeveloperWorkspace();
  workspace.connectToRepository('{{DATA:REPO_URI}}');
  return workspace.prepareSession();
}

class AssessmentEngine {
  constructor(config) {
    this.aiMode = 'deterministic';
    this.parser = new SyntaxParser();
  }

  async generateQuestions(source) {
    const nodes = await this.parser.walk(source);
    return nodes.map(node => this.transform(node));
  }
}

const stack = [];
const visited = new Set();

while (queue.length > 0) {
  const current = queue.shift();
  process.stdout.write(\`Analyzing node: \${current.id}\`);
}

export const QualityGate = (results) => {
  return results.filter(r => r.score > 0.85);
};`}
          </code>
        </div>
      </div>

      {/* Main Processing Center Pane */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-margin-mobile md:px-0 py-12">
        <div className="w-full max-w-2xl space-y-8">
          
          {/* Logo / Header Area */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl border-pane bg-surface-container-low mb-6 glow-cyan">
              <span className="material-symbols-outlined text-primary-fixed-dim text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                terminal
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl text-primary font-extrabold mb-2">Preparing Workspace</h1>
            <p className="font-body-md text-sm text-on-surface-variant">Our AI is analyzing your repository to generate a custom assessment.</p>
          </div>

          {/* Steps Checklist */}
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-xl">
            <div className="p-6 sm:p-8 space-y-5">
              
              {/* Step 1: Fetching Repository */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-fixed-dim text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {activeStep > 1 ? 'check_circle' : 'hourglass_empty'}
                    </span>
                  </div>
                  <span className={`font-body-md text-sm ${activeStep === 1 ? 'text-primary font-bold animate-pulse' : 'text-on-surface'}`}>
                    Fetching Repository
                  </span>
                </div>
                <span className={`font-code-sm text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  activeStep > 1 
                    ? 'bg-primary-container/10 text-primary-fixed-dim' 
                    : 'bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20 animate-pulse'
                }`}>
                  {activeStep > 1 ? 'DONE' : 'ACTIVE'}
                </span>
              </div>

              {/* Step 2: Parsing Code Structure */}
              <div className={`flex items-center justify-between ${activeStep < 2 ? 'opacity-30' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${activeStep === 2 ? 'border-primary-fixed active-step-indicator' : 'border-outline'}`}>
                    <span className={`material-symbols-outlined text-lg ${activeStep === 2 ? 'text-primary-fixed animate-spin' : activeStep > 2 ? 'text-primary-fixed-dim font-bold' : 'text-on-surface-variant'}`}>
                      {activeStep > 2 ? 'check_circle' : activeStep === 2 ? 'sync' : 'hourglass_empty'}
                    </span>
                  </div>
                  <span className={`font-body-md text-sm ${activeStep === 2 ? 'text-primary font-bold' : 'text-on-surface'}`}>
                    Parsing Code Structure
                  </span>
                </div>
                <span className={`font-code-sm text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  activeStep > 2 
                    ? 'bg-primary-container/10 text-primary-fixed-dim' 
                    : activeStep === 2 
                      ? 'bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20 animate-pulse'
                      : 'text-on-surface-variant'
                }`}>
                  {activeStep > 2 ? 'DONE' : activeStep === 2 ? 'ACTIVE' : 'PENDING'}
                </span>
              </div>

              {/* Step 3: Generating Questions */}
              <div className={`flex items-center justify-between ${activeStep < 3 ? 'opacity-30' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${activeStep === 3 ? 'border-primary-fixed active-step-indicator' : 'border-outline'}`}>
                    <span className={`material-symbols-outlined text-lg ${activeStep === 3 ? 'text-primary-fixed animate-spin' : activeStep > 3 ? 'text-primary-fixed-dim font-bold' : 'text-on-surface-variant'}`}>
                      {activeStep > 3 ? 'check_circle' : activeStep === 3 ? 'sync' : 'hourglass_empty'}
                    </span>
                  </div>
                  <span className={`font-body-md text-sm ${activeStep === 3 ? 'text-primary font-bold' : 'text-on-surface'}`}>
                    Generating Questions
                  </span>
                </div>
                <span className={`font-code-sm text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  activeStep > 3 
                    ? 'bg-primary-container/10 text-primary-fixed-dim' 
                    : activeStep === 3 
                      ? 'bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20 animate-pulse'
                      : 'text-on-surface-variant'
                }`}>
                  {activeStep > 3 ? 'DONE' : activeStep === 3 ? 'ACTIVE' : 'PENDING'}
                </span>
              </div>

              {/* Step 4: Quality Check */}
              <div className={`flex items-center justify-between ${activeStep < 4 ? 'opacity-30' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${activeStep === 4 ? 'border-primary-fixed active-step-indicator' : 'border-outline'}`}>
                    <span className={`material-symbols-outlined text-lg ${activeStep === 4 ? 'text-primary-fixed animate-spin' : activeStep > 4 ? 'text-primary-fixed-dim font-bold' : 'text-on-surface-variant'}`}>
                      {activeStep > 4 ? 'check_circle' : activeStep === 4 ? 'sync' : 'hourglass_empty'}
                    </span>
                  </div>
                  <span className={`font-body-md text-sm ${activeStep === 4 ? 'text-primary font-bold' : 'text-on-surface'}`}>
                    Quality Check
                  </span>
                </div>
                <span className={`font-code-sm text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  activeStep > 4 
                    ? 'bg-primary-container/10 text-primary-fixed-dim' 
                    : activeStep === 4 
                      ? 'bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/20 animate-pulse'
                      : 'text-on-surface-variant'
                }`}>
                  {activeStep > 4 ? 'DONE' : activeStep === 4 ? 'ACTIVE' : 'PENDING'}
                </span>
              </div>

            </div>

            {/* Terminal Status Output Console */}
            <div className="bg-surface-container-lowest border-t border-outline-variant p-4 font-mono text-xs">
              <div className="flex items-center gap-2 mb-2 select-none opacity-50">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
                  <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
                  <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
                </div>
                <span className="font-label-sm text-[10px] uppercase tracking-wider font-bold">SYSTEM CONSOLE</span>
              </div>
              <div className="font-code-sm text-[11px] text-on-surface-variant/80 space-y-1">
                {consoleLines.map((line, index) => (
                  <div key={index}>
                    <span className="text-primary-fixed-dim select-none font-bold mr-1.5">$</span>
                    <span>{line}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <span className="text-primary-fixed-dim select-none font-bold">$</span>
                  <span className="w-2 h-3.5 bg-primary-fixed-dim animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </main>

      {/* Bottom Progress Cap Indicator */}
      <footer className="fixed bottom-0 left-0 w-full p-8 bg-surface/90 backdrop-blur-sm border-t border-outline-variant/30 select-none">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-end mb-3">
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] text-primary-fixed-dim uppercase tracking-wider font-bold mb-1">
                Overall Progress
              </span>
              <span className="font-headline-md text-2xl text-primary font-extrabold">{progress}%</span>
            </div>
            <div className="text-right">
              <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
                Estimated time remaining
              </span>
              <div className="font-body-md text-sm text-on-surface mt-1 font-semibold">{timeRemaining}s</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-fixed-dim glow-cyan rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </footer>

    </div>
  );
}
