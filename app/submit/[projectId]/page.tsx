import React from 'react';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import SubmissionClientForm from './SubmissionClientForm';

// Server-side page component (no authentication required)
export default async function CandidateSubmissionPage({
  params
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  // 1. Fetch take-home project details
  const { data: project, error: projError } = await supabaseAdmin
    .from('take_home_projects')
    .select(`
      *,
      profiles:recruiter_id (
        email,
        company_name,
        name
      ),
      candidates:candidate_id (
        name,
        email
      )
    `)
    .eq('id', projectId)
    .single();

  if (projError || !project) {
    console.error('Error fetching project for submission:', projError);
    return (
      <div className="min-h-screen bg-[#0d1515] text-[#F1F5F9] flex flex-col items-center justify-center p-4">
        <div className="bg-[#151d1e] border border-[#3b494b] p-8 rounded-2xl max-w-md w-full text-center space-y-4">
          <span className="material-symbols-outlined text-red-400 text-5xl">warning</span>
          <h1 className="text-xl font-bold">Invalid Project Invitation</h1>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            The take-home project link you followed is invalid, expired, or has been removed. Please reach out to your recruiter for a new link.
          </p>
        </div>
      </div>
    );
  }

  const recruiter = (project as any).profiles;
  const candidate = (project as any).candidates;
  const companyName = recruiter?.company_name || 'CodeWalk Partner';
  const recruiterEmail = recruiter?.email || '';

  // Parse project brief JSON
  let brief: any = {};
  try {
    brief = typeof project.project_brief === 'string' ? JSON.parse(project.project_brief) : project.project_brief || {};
  } catch {
    brief = {};
  }

  const deadlineDate = new Date(project.deadline);
  const isExpired = new Date() > deadlineDate;

  return (
    <div className="min-h-screen bg-[#0d1515] text-[#F1F5F9] p-4 md:p-8 flex flex-col items-center">
      {/* Top Header */}
      <header className="w-full max-w-4xl flex items-center justify-between pb-6 border-b border-[#3b494b]/60 mb-8 select-none">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-cyan-500/20">
            CW
          </span>
          <span className="font-bold text-base tracking-tight text-white">CodeWalk</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Candidate Portal</p>
          <p className="text-xs font-bold text-[#06B6D4]">{candidate?.name || 'Applicant'}</p>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Brief details (60% width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-2xl shadow-md space-y-4">
            <div>
              <span className="bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                Project Assignment
              </span>
              <h1 className="text-xl font-bold text-white mt-2">{project.project_title}</h1>
              <p className="text-xs text-[#94A3B8] mt-1">Assigned by <strong>{companyName}</strong></p>
            </div>

            <div className="border-t border-[#3b494b]/60 pt-4 space-y-4">
              <div>
                <h4 className="text-[11px] font-bold text-[#06B6D4] uppercase tracking-wider">Problem Statement</h4>
                <p className="text-xs text-[#F1F5F9] mt-1 leading-relaxed">{brief.problem_statement || project.project_description}</p>
              </div>

              {brief.unique_twist && (
                <div className="bg-[#818CF8]/5 border border-[#818CF8]/20 p-4 rounded-xl">
                  <h4 className="text-[11px] font-bold text-[#818CF8] uppercase tracking-wider">Your Candidate-Specific Requirement</h4>
                  <p className="text-xs text-indigo-200 mt-1 leading-relaxed">{brief.unique_twist}</p>
                </div>
              )}

              {brief.core_requirements && Array.isArray(brief.core_requirements) && (
                <div>
                  <h4 className="text-[11px] font-bold text-[#06B6D4] uppercase tracking-wider mb-2">Core Features Checklist</h4>
                  <ul className="space-y-2">
                    {brief.core_requirements.map((req: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-[#b9cacb]">
                        <span className="material-symbols-outlined text-[#94A3B8] text-base select-none mt-0.5">check_box_outline_blank</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {brief.bonus_requirements && Array.isArray(brief.bonus_requirements) && brief.bonus_requirements.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-[#06B6D4] uppercase tracking-wider mb-2">Bonus Requirements (Optional)</h4>
                  <ul className="space-y-2">
                    {brief.bonus_requirements.map((req: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-[#94A3B8]">
                        <span className="material-symbols-outlined text-[#475569] text-base select-none mt-0.5">check_box_outline_blank</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {brief.suggested_tech_stack && Array.isArray(brief.suggested_tech_stack) && (
                <div>
                  <h4 className="text-[11px] font-bold text-[#06B6D4] uppercase tracking-wider">Suggested Technologies</h4>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {brief.suggested_tech_stack.map((stack: string, idx: number) => (
                      <span key={idx} className="bg-[#151d1e] border border-[#3b494b] text-[#b9cacb] px-2 py-0.5 rounded text-[10px] font-mono">
                        {stack}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {brief.deliverables && (
                <div>
                  <h4 className="text-[11px] font-bold text-[#06B6D4] uppercase tracking-wider">Deliverables</h4>
                  <p className="text-xs text-[#b9cacb] mt-1 font-mono leading-relaxed bg-[#0d1515] p-3 border border-[#3b494b]/60 rounded-lg whitespace-pre-wrap">
                    {brief.deliverables}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Submission Form & Countdown (40% width) */}
        <div className="space-y-6">
          <SubmissionClientForm
            projectId={projectId}
            deadline={project.deadline}
            recruiterEmail={recruiterEmail}
            companyName={companyName}
            isExpired={isExpired}
            initialStatus={project.status}
          />
        </div>
      </main>

      <footer className="w-full max-w-4xl text-center text-[10px] text-[#64748b] border-t border-[#3b494b]/30 pt-8 mt-12 mb-4 select-none">
        Powered by CodeWalk. Secure Candidate Submission Portal.<br/>
        &copy; 2026 CodeWalk Inc. All rights reserved.
      </footer>
    </div>
  );
}
