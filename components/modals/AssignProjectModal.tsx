'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';
import { useGlobal } from '@/app/context/GlobalContext';

// Initialize client-side Supabase client for reading candidate / positions if needed
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Candidate {
  id: string;
  name: string;
  email: string;
  role_applied?: string;
  tech_stack?: string[];
  years_experience?: string;
  position_id?: string;
  notes?: string;
}

interface AssignProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate?: Candidate | null;
  positionId?: string | null;
  onSuccess?: () => void;
}

export default function AssignProjectModal({
  isOpen,
  onClose,
  candidate,
  positionId,
  onSuccess
}: AssignProjectModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Global Recruiter State
  const { user } = useGlobal();
  const [candidatesList, setCandidatesList] = useState<any[]>([]);
  const [selectedCandId, setSelectedCandId] = useState('');

  // Fetch candidates list if no candidate is pre-filled
  useEffect(() => {
    if (isOpen && !candidate && user?.id) {
      const fetchCandidates = async () => {
        const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .eq('recruiter_id', user.id);
        if (!error && data) {
          setCandidatesList(data);
        }
      };
      fetchCandidates();
    }
  }, [isOpen, candidate, user]);

  // Step 1 States
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [yearsExperience, setYearsExperience] = useState('3');
  const [techStackInput, setTechStackInput] = useState('');
  const [techStackTags, setTechStackTags] = useState<string[]>([]);
  const [roleApplyingFor, setRoleApplyingFor] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [difficultyOverride, setDifficultyOverride] = useState('');

  // Step 2 States (AI Generated & Customizable)
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [coreReqs, setCoreReqs] = useState<string[]>([]);
  const [newCoreReq, setNewCoreReq] = useState('');
  const [bonusReqs, setBonusReqs] = useState<string[]>([]);
  const [newBonusReq, setNewBonusReq] = useState('');
  const [uniqueTwist, setUniqueTwist] = useState('');
  const [durationDays, setDurationDays] = useState(5);
  const [deadline, setDeadline] = useState('');
  const [evalCriteria, setEvalCriteria] = useState({
    code_quality: 25,
    feature_completion: 35,
    technical_choices: 20,
    readme_quality: 10,
    commit_history: 10
  });
  const [suggestedTechStack, setSuggestedTechStack] = useState<string[]>([]);
  const [exampleData, setExampleData] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [evaluationQuestions, setEvaluationQuestions] = useState<string[]>([]);

  // Step 3 States
  const [customMessage, setCustomMessage] = useState('');

  // Auto-fill from candidate prop if it exists
  useEffect(() => {
    if (candidate) {
      setCandidateName(candidate.name || '');
      setCandidateEmail(candidate.email || '');
      setRoleApplyingFor(candidate.role_applied || '');
      if (candidate.years_experience) {
        // extract digits
        const match = candidate.years_experience.match(/\d+/);
        setYearsExperience(match ? match[0] : '3');
      }
      if (candidate.tech_stack) {
        setTechStackTags(candidate.tech_stack);
      }
      if (candidate.notes) {
        setJobDescription(candidate.notes);
      }
    } else {
      // Reset form
      setCandidateName('');
      setCandidateEmail('');
      setYearsExperience('3');
      setTechStackTags([]);
      setRoleApplyingFor('');
      setJobDescription('');
    }
    setStep(1);
  }, [candidate, isOpen]);

  // Recalculate deadline whenever duration changes
  useEffect(() => {
    const days = parseInt(durationDays as any) || 5;
    const date = new Date();
    date.setDate(date.getDate() + days);
    // Format to datetime-local string (YYYY-MM-DDTHH:mm)
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
    setDeadline(localISOTime);
  }, [durationDays]);

  if (!isOpen) return null;

  // Tag Input Handlers
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = techStackInput.trim().replace(/,$/, '');
      if (val && !techStackTags.includes(val)) {
        setTechStackTags([...techStackTags, val]);
      }
      setTechStackInput('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTechStackTags(techStackTags.filter((_, i) => i !== indexToRemove));
  };

  // Step 1: Submit Form to Generate AI Brief
  const handleGenerateProject = async () => {
    if (!candidateName.trim()) {
      toast.error('Please enter candidate name.');
      return;
    }
    if (!roleApplyingFor.trim()) {
      toast.error('Please enter the role candidate is applying for.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/take-home/generate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: candidateName,
          experience_years: parseFloat(yearsExperience) || 3,
          tech_stack: techStackTags,
          role_title: roleApplyingFor,
          job_description: jobDescription,
          difficulty_override: difficultyOverride || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate project.');
      }

      const proj = data.project;
      setProjectTitle(proj.project_title || '');
      setProjectDescription(proj.project_description || '');
      setProblemStatement(proj.problem_statement || '');
      setCoreReqs(proj.core_requirements || []);
      setBonusReqs(proj.bonus_requirements || []);
      setUniqueTwist(proj.unique_twist || '');
      setSuggestedTechStack(proj.suggested_tech_stack || []);
      setExampleData(typeof proj.example_data === 'object' ? JSON.stringify(proj.example_data, null, 2) : proj.example_data || '');
      setDeliverables(proj.deliverables || '');
      setEvaluationQuestions(proj.evaluation_questions || []);
      setDurationDays(data.duration_days);

      if (proj.evaluation_criteria) {
        setEvalCriteria(proj.evaluation_criteria);
      }

      setStep(2);
      toast.success('AI Project Brief generated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'AI Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Handlers
  const handleAddCoreReq = () => {
    if (newCoreReq.trim()) {
      setCoreReqs([...coreReqs, newCoreReq.trim()]);
      setNewCoreReq('');
    }
  };

  const handleRemoveCoreReq = (idx: number) => {
    setCoreReqs(coreReqs.filter((_, i) => i !== idx));
  };

  const handleAddBonusReq = () => {
    if (newBonusReq.trim()) {
      setBonusReqs([...bonusReqs, newBonusReq.trim()]);
      setNewBonusReq('');
    }
  };

  const handleRemoveBonusReq = (idx: number) => {
    setBonusReqs(bonusReqs.filter((_, i) => i !== idx));
  };

  const handleCriteriaChange = (key: keyof typeof evalCriteria, value: number) => {
    setEvalCriteria({
      ...evalCriteria,
      [key]: isNaN(value) ? 0 : value
    });
  };

  const totalCriteriaWeight = Object.values(evalCriteria).reduce((a, b) => a + b, 0);

  const handleApproveAndCustomize = () => {
    if (!projectTitle.trim()) {
      toast.error('Project Title is required.');
      return;
    }
    if (!problemStatement.trim()) {
      toast.error('Problem Statement is required.');
      return;
    }
    if (coreReqs.length === 0) {
      toast.error('Please specify at least one core requirement.');
      return;
    }
    if (totalCriteriaWeight !== 100) {
      toast.error(`Evaluation criteria weights must sum up to exactly 100. Current sum: ${totalCriteriaWeight}`);
      return;
    }
    if (!deadline) {
      toast.error('Please specify a submission deadline.');
      return;
    }

    setStep(3);
  };

  // Step 3: Approve & Send Invitation via Resend
  const handleSendAssignment = async () => {
    const finalCandidateId = candidate?.id || selectedCandId;
    if (!finalCandidateId && (!candidateName.trim() || !candidateEmail.trim())) {
      toast.error('Please select a candidate or enter a candidate name and email.');
      return;
    }

    if (!candidateEmail.trim()) {
      toast.error('Candidate email is required to send invitation.');
      return;
    }

    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(candidateEmail)) {
      toast.error('Please enter a valid candidate email.');
      return;
    }

    setLoading(true);
    try {
      const projectBriefData = {
        project_title: projectTitle,
        project_description: projectDescription,
        problem_statement: problemStatement,
        core_requirements: coreReqs,
        bonus_requirements: bonusReqs,
        technical_constraints: [
          `Suggested technology stack: ${suggestedTechStack.join(', ')}`,
          `Must implement the unique twist`
        ],
        unique_twist: uniqueTwist,
        suggested_tech_stack: suggestedTechStack,
        example_data: exampleData,
        deliverables: deliverables,
        evaluation_questions: evaluationQuestions
      };

      const response = await fetch('/api/take-home/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: finalCandidateId,
          candidateEmail,
          candidateName,
          positionId: positionId || candidate?.position_id || null,
          projectTitle,
          projectDescription,
          techStackRequired: techStackTags,
          experienceLevel: `${yearsExperience} years`,
          difficulty: difficultyOverride || (parseFloat(yearsExperience) <= 2 ? 'junior' : parseFloat(yearsExperience) <= 5 ? 'mid' : parseFloat(yearsExperience) <= 8 ? 'senior' : 'lead'),
          durationDays,
          deadline,
          evaluationCriteria: evalCriteria,
          projectBrief: projectBriefData,
          uniqueRequirements: { twist: uniqueTwist },
          customMessage
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send take-home assignment.');
      }

      toast.success(data.warning ? `Sent with warnings: ${data.warning}` : 'Take-Home Project successfully assigned and sent!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
      <div className="bg-[#151d1e] border border-[#3b494b] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-[#3b494b] flex justify-between items-center select-none">
          <div className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded bg-gradient-to-tr from-cyan-500 to-indigo-400 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
              TH
            </span>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Assign Take-Home Project</h3>
              <p className="text-[10px] text-[#94A3B8] uppercase mt-0.5">Step {step} of 3: {
                step === 1 ? 'Candidate Setup' : step === 2 ? 'Customize AI Brief' : 'Review & Send'
              }</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs text-[#F1F5F9]">
          
          {/* STEP 1: CANDIDATE INFO */}
          {step === 1 && (
            <div className="space-y-4">
              {!candidate && (
                <div className="space-y-1.5 bg-[#0d1515]/30 p-4 border border-[#3b494b]/60 rounded-xl">
                  <label className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider block">Select Candidate to Assign</label>
                  <select
                    value={selectedCandId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedCandId(id);
                      const cand = candidatesList.find(c => c.id === id);
                      if (cand) {
                        setCandidateName(cand.name || '');
                        setCandidateEmail(cand.email || '');
                        setRoleApplyingFor(cand.role_applied || '');
                        if (cand.years_experience) {
                          const match = cand.years_experience.match(/\d+/);
                          setYearsExperience(match ? match[0] : '3');
                        }
                        if (cand.tech_stack) {
                          setTechStackTags(cand.tech_stack);
                        }
                        if (cand.notes) {
                          setJobDescription(cand.notes);
                        }
                      }
                    }}
                    className="w-full bg-[#0d1515] border border-[#06B6D4] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors text-white cursor-pointer font-bold"
                  >
                    <option value="">-- Choose Candidate from Pipeline --</option>
                    {candidatesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email}) {c.role_applied ? `— ${c.role_applied}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Candidate Name</label>
                  <input
                    required
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Enter candidate's name"
                    className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Candidate Email</label>
                  <input
                    required
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="Enter candidate's email address"
                    className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Role Applying For</label>
                  <input
                    required
                    type="text"
                    value={roleApplyingFor}
                    onChange={(e) => setRoleApplyingFor(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Difficulty (Override)</label>
                  <select
                    value={difficultyOverride}
                    onChange={(e) => setDifficultyOverride(e.target.value)}
                    className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors text-white cursor-pointer"
                  >
                    <option value="">Calculate from Experience</option>
                    <option value="junior">Junior (3 days)</option>
                    <option value="mid">Mid (5 days)</option>
                    <option value="senior">Senior (7 days)</option>
                    <option value="lead">Lead (10 days)</option>
                  </select>
                </div>
              </div>

              {/* Tag Input for Tech Stack */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Required Tech Stack</label>
                <div className="w-full bg-[#0d1515] border border-[#3b494b] p-2.5 rounded-lg min-h-[42px] flex flex-wrap gap-2 items-center focus-within:border-[#06B6D4] transition-colors">
                  {techStackTags.map((tag, idx) => (
                    <span key={idx} className="bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20 px-2 py-0.5 rounded flex items-center gap-1.5 font-medium">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(idx)} className="text-[#06B6D4] hover:text-[#fff] transition-colors text-[10px]">×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={techStackInput}
                    onChange={(e) => setTechStackInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={techStackTags.length === 0 ? "Enter tech stack (e.g. React, Node.js, PostgreSQL) and press Enter" : "Add more..."}
                    className="bg-transparent border-none outline-none flex-1 text-xs min-w-[120px] focus:ring-0"
                  />
                </div>
                <p className="text-[9px] text-[#94A3B8]">Type a technology and press Enter or comma to create a tag.</p>
              </div>

              {/* Optional Job Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Job Description / Context (Optional)</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description or role details here. The AI will use this to generate a highly aligned take-home assignment."
                  rows={5}
                  className="w-full bg-[#0d1515] border border-[#3b494b] p-4 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-[#3b494b]/40">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGenerateProject}
                  className="px-5 py-2.5 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] hover:shadow-cyan-500/10 font-bold uppercase rounded-lg active:scale-98 transition-all flex items-center justify-center gap-2 select-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      <span>Generating with Groq LLM...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      <span>Generate Project Brief</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW AND CUSTOMIZE */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-[#1a2425] border border-[#3b494b]/80 p-5 rounded-2xl shadow-inner space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#06B6D4] border-b border-[#3b494b]/40 pb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">description</span>
                  <span>AI Generated Project Assignment</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Project Title</label>
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Project Description Overview</label>
                    <input
                      type="text"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Problem Statement</label>
                  <textarea
                    value={problemStatement}
                    onChange={(e) => setProblemStatement(e.target.value)}
                    rows={3}
                    className="w-full bg-[#0d1515] border border-[#3b494b] p-4 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors"
                  />
                </div>

                {/* Core Requirements checklist manager */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Core Requirements (Must-Have)</label>
                  <div className="space-y-1.5">
                    {coreReqs.map((req, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={req}
                          onChange={(e) => {
                            const updated = [...coreReqs];
                            updated[idx] = e.target.value;
                            setCoreReqs(updated);
                          }}
                          className="flex-1 bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded-lg text-xs"
                        />
                        <button type="button" onClick={() => handleRemoveCoreReq(idx)} className="text-red-400 hover:text-red-300 p-1">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCoreReq}
                        onChange={(e) => setNewCoreReq(e.target.value)}
                        placeholder="Add new core requirement"
                        className="flex-1 bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded-lg text-xs"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCoreReq())}
                      />
                      <button type="button" onClick={handleAddCoreReq} className="px-3 bg-[#3b494b] hover:bg-[#4a5a5c] rounded-lg font-bold">Add</button>
                    </div>
                  </div>
                </div>

                {/* Bonus Requirements checklist manager */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Bonus Requirements (Nice-to-Have)</label>
                  <div className="space-y-1.5">
                    {bonusReqs.map((req, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={req}
                          onChange={(e) => {
                            const updated = [...bonusReqs];
                            updated[idx] = e.target.value;
                            setBonusReqs(updated);
                          }}
                          className="flex-1 bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded-lg text-xs"
                        />
                        <button type="button" onClick={() => handleRemoveBonusReq(idx)} className="text-red-400 hover:text-red-300 p-1">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newBonusReq}
                        onChange={(e) => setNewBonusReq(e.target.value)}
                        placeholder="Add new bonus objective"
                        className="flex-1 bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded-lg text-xs"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBonusReq())}
                      />
                      <button type="button" onClick={handleAddBonusReq} className="px-3 bg-[#3b494b] hover:bg-[#4a5a5c] rounded-lg font-bold">Add</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block text-indigo-300">Unique Twist (Anti-Plagiarism / Copy-Resistant)</label>
                  <input
                    type="text"
                    value={uniqueTwist}
                    onChange={(e) => setUniqueTwist(e.target.value)}
                    className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg text-indigo-200 focus:outline-none focus:border-[#818CF8] transition-colors font-semibold"
                  />
                </div>
              </div>

              {/* Settings: Duration, Deadline & Criteria Weights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0d1515]/30 p-4 border border-[#3b494b]/50 rounded-xl">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-white border-b border-[#3b494b]/30 pb-2">Timeline</h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Duration Days</label>
                    <select
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value))}
                      className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2 rounded-lg text-white cursor-pointer"
                    >
                      <option value="3">3 Days (Junior Default)</option>
                      <option value="5">5 Days (Mid Default)</option>
                      <option value="7">7 Days (Senior Default)</option>
                      <option value="10">10 Days (Lead Default)</option>
                      <option value="14">14 Days (Extended)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Deadline Timestamp</label>
                    <input
                      type="datetime-local"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[#3b494b]/30 pb-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-white">Evaluation Criteria Weights</h4>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      totalCriteriaWeight === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>{totalCriteriaWeight} / 100%</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { key: 'code_quality', label: 'Code Quality (Cleanliness, Organization)' },
                      { key: 'feature_completion', label: 'Feature Completion (Core Req)' },
                      { key: 'technical_choices', label: 'Technical Choices (Readme/Design)' },
                      { key: 'readme_quality', label: 'Documentation (Readme Quality)' },
                      { key: 'commit_history', label: 'Commit History (Regular commits)' }
                    ].map((item) => (
                      <div key={item.key} className="flex justify-between items-center gap-4">
                        <span className="text-[#b9cacb] text-[11px]">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={evalCriteria[item.key as keyof typeof evalCriteria]}
                            onChange={(e) => handleCriteriaChange(item.key as any, parseInt(e.target.value))}
                            className="w-16 bg-[#0d1515] border border-[#3b494b] px-2.5 py-1 rounded text-right text-xs"
                          />
                          <span className="text-[#94A3B8]">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#3b494b]/40">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 border border-[#3b494b] hover:border-[#94A3B8] hover:text-white rounded-lg uppercase font-bold cursor-pointer"
                >
                  Back
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGenerateProject}
                    className="px-4 py-2.5 bg-[#151d1e] hover:bg-[#1f2a2c] text-[#06B6D4] border border-[#06B6D4] rounded-lg uppercase font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">sync</span>
                    Regenerate Project
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveAndCustomize}
                    className="px-5 py-2.5 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold uppercase rounded-lg cursor-pointer"
                  >
                    Approve and Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SEND ASSIGNMENT */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Candidate Email Address</label>
                <input
                  required
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="Enter candidate's email address"
                  className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Custom Note / Invitation Message (Optional)</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add any specific instructions, interview timelines, or greeting for the candidate. This will be shown at the top of their email."
                  rows={4}
                  className="w-full bg-[#0d1515] border border-[#3b494b] p-4 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors"
                />
              </div>

              {/* Email Mock Preview Card */}
              <div className="bg-[#0c1011] border border-[#3b494b]/60 rounded-xl p-5 space-y-4">
                <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest block border-b border-[#3b494b]/40 pb-1.5 mb-2">Email Preview</span>
                <div className="space-y-2 text-[#b9cacb] font-sans">
                  <p><strong>From:</strong> CodeWalk Invites &lt;onboarding@resend.dev&gt;</p>
                  <p><strong>To:</strong> {candidateEmail || 'candidate@email.com'}</p>
                  <p><strong>Subject:</strong> Take Home Project Assignment — {projectTitle} — Company</p>
                  <div className="mt-4 p-4 border border-[#3b494b]/30 bg-[#0d1515] rounded-lg">
                    <p className="text-[#06B6D4] font-bold text-sm">CodeWalk</p>
                    <h3 className="text-white text-base mt-2 mb-0">Take-Home Project Assignment</h3>
                    <p className="text-[10px] text-[#94a3b8] mt-0.5">For position: {projectTitle}</p>
                    <p className="mt-3">Hi {candidateName},</p>
                    {customMessage && <p className="italic bg-[#151d1e] p-2.5 rounded border-l-2 border-[#06B6D4]">"{customMessage}"</p>}
                    <p>We have assigned you a custom take-home project: <strong>{projectTitle}</strong>.</p>
                    <p>⏰ <strong>Deadline:</strong> <span className="text-amber-400">{new Date(deadline).toLocaleString()}</span></p>
                    <p className="mt-4 text-center">
                      <span className="inline-block bg-[#06B6D4] text-[#0d1515] px-4 py-2 rounded-lg font-bold text-xs">View Project &amp; Submit Work</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-[#3b494b]/40">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 border border-[#3b494b] hover:border-[#94A3B8] hover:text-white rounded-lg uppercase font-bold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendAssignment}
                  className="px-6 py-2.5 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold uppercase rounded-lg flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      <span>Sending Assignment...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>Send Assignment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
