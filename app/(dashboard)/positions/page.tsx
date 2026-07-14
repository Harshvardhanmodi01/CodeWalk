'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface Position {
  id: string;
  title: string;
  job_description: string;
  required_skills: string[];
  experience_level: string;
  department: string;
  status: 'open' | 'closed' | 'draft';
  created_at: string;
  candidate_count?: number;
}

const ROLE_TEMPLATES = [
  {
    name: 'Backend Developer',
    title: 'Backend Developer',
    description: 'We are looking for a Senior Backend Developer to join our core engineering team. You will build and scale high-performance, fault-tolerant REST and GraphQL APIs using Node.js, Go, or Python. Responsibilities include database optimization (PostgreSQL/Redis), system architecture design, and integrating third-party APIs. Requirements: 5+ years of software development experience, deep knowledge of distributed systems, and strong SQL query optimization skills.',
    skills: ['Node.js', 'Go', 'PostgreSQL', 'REST API', 'GraphQL', 'Redis', 'Docker'],
    experience: 'Senior',
    department: 'Engineering'
  },
  {
    name: 'Frontend Developer',
    title: 'Frontend Developer',
    description: 'We are seeking a Frontend Developer to build clean, high-performance web applications. You will work closely with designers and product managers to create interactive interfaces in React, Next.js, and TypeScript. Responsibilities include optimizing web performance, building reusable UI components, and writing clean, accessible HTML/CSS. Requirements: 3+ years experience with React/Next.js, mastery of responsive CSS/Tailwind, and experience with client-side state management.',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'HTML5', 'Web Performance'],
    experience: 'Mid',
    department: 'Engineering'
  },
  {
    name: 'Full Stack Developer',
    title: 'Full Stack Developer',
    description: 'We are looking for a Full Stack Developer to build end-to-end features. You will work on both React/Next.js client code and Node.js backend endpoints. Responsibilities include designing database schemas, building frontend UI components, writing unit/integration tests, and maintaining CI/CD pipelines. Requirements: 4+ years of full stack software engineering experience, familiarity with SQL/NoSQL databases, and experience deploying apps to AWS/Vercel.',
    skills: ['React', 'Node.js', 'Next.js', 'PostgreSQL', 'TypeScript', 'AWS', 'CI/CD'],
    experience: 'Mid',
    department: 'Engineering'
  },
  {
    name: 'DevOps Engineer',
    title: 'DevOps Engineer',
    description: 'We are seeking a DevOps Engineer to manage our cloud infrastructure and deployment pipelines. You will design, build, and optimize automated CI/CD workflows, manage Kubernetes clusters on AWS/GCP, and ensure maximum system uptime and monitoring. Requirements: 3+ years in a DevOps/SRE role, proficiency with Terraform/Infrastructure as Code, Docker/Kubernetes container orchestration, and Bash/Python scripting.',
    skills: ['Terraform', 'Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux', 'Prometheus'],
    experience: 'Senior',
    department: 'Infrastructure'
  },
  {
    name: 'Data Scientist',
    title: 'Data Scientist',
    description: 'We are looking for a Data Scientist to analyze datasets and build machine learning models. You will design ETL data pipelines, perform exploratory data analysis, and train predictive models to drive business insights. Requirements: 3+ years of experience with Python/R, strong familiarity with PyTorch/TensorFlow, pandas, scikit-learn, and experience with SQL databases and big data platforms.',
    skills: ['Python', 'Machine Learning', 'PyTorch', 'SQL', 'pandas', 'ETL', 'data-analysis'],
    experience: 'Mid',
    department: 'Analytics'
  },
  {
    name: 'Mobile Developer',
    title: 'Mobile Developer',
    description: 'We are seeking a Mobile Developer to build cross-platform or native apps. You will use React Native or Flutter to develop, test, and release features to iOS and Android App Stores. Responsibilities include building responsive mobile UIs, integrating device APIs, and optimizing app performance. Requirements: 3+ years mobile development experience, familiarity with Apple/Google submission guidelines, and strong JavaScript/Dart skills.',
    skills: ['React Native', 'iOS', 'Android', 'TypeScript', 'App Store', 'API Integration'],
    experience: 'Mid',
    department: 'Mobile'
  }
];

export default function PositionsPage() {
  const router = useRouter();
  const { user } = useGlobal();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'open' | 'closed' | 'draft'>('open');

  useEffect(() => {
    if (user?.id) {
      fetchPositions();
    }
  }, [user]);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      // Fetch positions
      const { data: posData, error: posErr } = await supabase
        .from('positions')
        .select('*')
        .eq('recruiter_id', user?.id)
        .order('created_at', { ascending: false });

      if (posErr) throw posErr;

      // For each position, fetch its candidate count
      const updatedPositions = await Promise.all(
        (posData || []).map(async (pos: any) => {
          const { count, error: countErr } = await supabase
            .from('candidates')
            .select('*', { count: 'exact', head: true })
            .eq('position_id', pos.id);

          return {
            ...pos,
            candidate_count: countErr ? 0 : (count || 0)
          };
        })
      );

      setPositions(updatedPositions);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load positions.');
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill fields from template selection
  const handleApplyTemplate = (tpl: typeof ROLE_TEMPLATES[0] | 'scratch') => {
    if (tpl === 'scratch') {
      setTitle('');
      setJobDescription('');
      setSkills([]);
      setExperienceLevel('Mid');
      setDepartment('');
    } else {
      setTitle(tpl.title);
      setJobDescription(tpl.description);
      setSkills(tpl.skills);
      setExperienceLevel(tpl.experience);
      setDepartment(tpl.department);
    }
  };

  // Add Skill Tag on Enter
  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = skillInput.trim();
      if (val && !skills.includes(val)) {
        setSkills([...skills, val]);
        setSkillInput('');
      }
    }
  };

  // Remove Skill Tag
  const handleRemoveSkill = (tagToRemove: string) => {
    setSkills(skills.filter(t => t !== tagToRemove));
  };

  // Handle Save
  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !jobDescription.trim()) {
      toast.error('Title and Job Description are required.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('positions')
        .insert({
          recruiter_id: user?.id,
          title: title.trim(),
          job_description: jobDescription.trim(),
          required_skills: skills,
          experience_level: experienceLevel,
          department: department.trim() || null,
          status: status
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Position created successfully!');
      setModalOpen(false);
      
      // Reset form
      handleApplyTemplate('scratch');
      
      fetchPositions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create position.');
      setLoading(false);
    }
  };

  // Statistics calculation
  const totalPositions = positions.length;
  const activePositions = positions.filter(p => p.status === 'open').length;
  const totalCandidates = positions.reduce((acc, curr) => acc + (curr.candidate_count || 0), 0);
  const avgTimeToFill = 'N/A'; // Mock stats or placeholder

  return (
    <div className="flex-grow flex flex-col bg-[#0d1515] overflow-hidden min-h-screen text-[#F1F5F9] p-8">
      {/* Header Row */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Open Positions</h1>
          <p className="text-xs text-[#94A3B8] mt-1">Manage positions, job descriptions, and evaluate candidate pipelines.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          Create Position
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 select-none">
        <div className="bg-[#151d1e] border border-[#3b494b] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">Total Positions</span>
            <h3 className="text-2xl font-extrabold mt-1 text-[#F1F5F9] font-mono">{totalPositions}</h3>
          </div>
          <span className="material-symbols-outlined text-3xl text-[#06B6D4] opacity-80">work</span>
        </div>
        <div className="bg-[#151d1e] border border-[#3b494b] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">Active Positions</span>
            <h3 className="text-2xl font-extrabold mt-1 text-emerald-400 font-mono">{activePositions}</h3>
          </div>
          <span className="material-symbols-outlined text-3xl text-emerald-400 opacity-80">play_circle</span>
        </div>
        <div className="bg-[#151d1e] border border-[#3b494b] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">Total Candidates</span>
            <h3 className="text-2xl font-extrabold mt-1 text-cyan-400 font-mono">{totalCandidates}</h3>
          </div>
          <span className="material-symbols-outlined text-3xl text-cyan-400 opacity-80">groups</span>
        </div>
        <div className="bg-[#151d1e] border border-[#3b494b] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">Avg Time to Fill</span>
            <h3 className="text-2xl font-extrabold mt-1 text-purple-400 font-mono">{avgTimeToFill}</h3>
          </div>
          <span className="material-symbols-outlined text-3xl text-purple-400 opacity-80">timer</span>
        </div>
      </div>

      {/* Main Grid Content */}
      {loading && positions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#06B6D4] mb-3"></div>
          <p className="text-xs text-[#94A3B8]">Loading open positions...</p>
        </div>
      ) : positions.length === 0 ? (
        <div className="flex-grow bg-[#151d1e]/50 border border-dashed border-[#3b494b] rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#0d1515] border border-[#3b494b] flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-3xl text-[#94A3B8]">work_outline</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Create your first position</h3>
          <p className="text-xs text-[#94A3B8] max-w-sm mb-8 leading-relaxed">
            Organize candidates under specific job positions, bulk-import applicants, and perform candidate matching.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
          >
            Create Your First Position
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12">
          {positions.map((pos) => {
            const dateStr = new Date(pos.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={pos.id}
                className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-6 flex flex-col justify-between hover:border-[#06B6D4]/30 transition-all shadow-sm"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wide font-bold rounded ${
                      pos.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                      pos.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' :
                      'bg-red-500/10 text-red-400 border border-red-500/25'
                    }`}>
                      {pos.status}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] font-mono">{dateStr}</span>
                  </div>
                  <h3 className="text-base font-bold text-white line-clamp-1 mb-1">{pos.title}</h3>
                  <span className="text-[10px] text-[#06B6D4] uppercase tracking-wider font-semibold block mb-3">
                    {pos.department || 'General'} · {pos.experience_level} Level
                  </span>
                  
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {(pos.required_skills || []).slice(0, 4).map((skill, sIdx) => (
                      <span key={sIdx} className="px-2 py-0.5 bg-[#0d1515] border border-[#3b494b] text-[9px] font-mono rounded text-[#94A3B8]">
                        {skill}
                      </span>
                    ))}
                    {(pos.required_skills || []).length > 4 && (
                      <span className="px-1.5 py-0.5 bg-[#0d1515] border border-[#3b494b] text-[9px] font-mono rounded text-[#06B6D4] font-bold">
                        +{pos.required_skills.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <hr className="border-[#3b494b]/30 mb-4" />
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-[#94A3B8]">Applicants:</span>
                    <span className="text-xs font-bold text-white font-mono">{pos.candidate_count || 0}</span>
                  </div>
                  <button
                    onClick={() => router.push(`/positions/${pos.id}`)}
                    className="w-full py-2 bg-[#0d1515] hover:bg-[#06B6D4] hover:text-[#0d1515] text-[#06B6D4] text-xs font-bold uppercase rounded-lg border border-[#06B6D4]/30 hover:border-transparent transition-all active:scale-95"
                  >
                    View Position
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE POSITION MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 space-y-6 relative shadow-2xl animate-fade-in text-[#F1F5F9]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[#3b494b]/40">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#06B6D4]">work</span>
                Create New Position
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Template Selector Row */}
            <div>
              <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-2">
                Start from Template (Recommended)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ROLE_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="p-2 border border-[#3b494b] hover:border-[#06B6D4] hover:bg-[#06B6D4]/5 rounded text-left text-xs transition-colors flex flex-col justify-between"
                  >
                    <span className="font-bold text-white block truncate">{tpl.name}</span>
                    <span className="text-[9px] text-[#94A3B8]">{tpl.skills.length} skills</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('scratch')}
                  className="p-2 border border-dashed border-[#3b494b] hover:border-[#06B6D4] rounded text-left text-xs transition-colors flex flex-col justify-center items-center text-[#94A3B8] hover:text-white"
                >
                  <span className="material-symbols-outlined text-sm mb-0.5">restart_alt</span>
                  <span className="text-[10px] font-bold">Start Scratch</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreatePosition} className="space-y-4">
              <div>
                <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-1">
                  Position Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering, Product"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-1">
                    Experience Level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                  >
                    <option value="Entry">Entry Level</option>
                    <option value="Mid">Mid Level</option>
                    <option value="Senior">Senior Level</option>
                    <option value="Lead">Lead / Architect</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block">
                    Job Description <span className="text-red-400">*</span>
                  </label>
                  <span className={`text-[9px] font-mono ${jobDescription.length > 5000 ? 'text-red-400 font-bold' : 'text-[#94A3B8]'}`}>
                    {jobDescription.length} / 5000 chars
                  </span>
                </div>
                <textarea
                  required
                  rows={6}
                  placeholder="Paste the job description details here. AI will match candidates against these requirements."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9] font-sans resize-y"
                  maxLength={5000}
                />
              </div>

              <div>
                <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-1">
                  Required Skills (Type and press Enter)
                </label>
                <div className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg p-2 flex flex-wrap gap-1.5 focus-within:border-[#06B6D4]">
                  {skills.map((skill, sIdx) => (
                    <span key={sIdx} className="px-2 py-0.5 bg-[#151d1e] border border-[#3b494b] text-[9px] font-mono rounded text-white flex items-center gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-[#94A3B8] hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder={skills.length === 0 ? "e.g. React, Node.js" : ""}
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    className="flex-grow bg-transparent text-xs outline-none text-[#F1F5F9] border-none p-0.5 min-w-[120px]"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-[#3b494b]/40">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-1.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                  >
                    <option value="open">Open</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 border border-[#3b494b] hover:bg-[#0d1515] text-[#94A3B8] hover:text-white rounded-lg text-xs font-bold uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#06B6D4] text-[#0d1515] rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1.5"
                  >
                    Save Position
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
