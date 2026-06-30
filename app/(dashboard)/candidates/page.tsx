'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';

interface Candidate {
  id: string;
  name: string;
  email: string;
  github_url: string;
  linkedin_url?: string;
  role_applied?: string;
  status: 'pending' | 'scheduled' | 'interviewed' | 'hired' | 'rejected';
  tech_stack: string[];
  years_experience?: string;
  current_title?: string;
  overall_score?: number;
  hire_recommendation?: string;
  folder_name?: string;
  created_at: string;
}

export default function CandidatesPage() {
  const router = useRouter();
  const { user } = useGlobal();

  // State Management
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'csv' | 'resume'>('csv');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [techFilter, setTechFilter] = useState('All');
  const [folderFilter, setFolderFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [page, setPage] = useState(1);
  const [folderName, setFolderName] = useState('');
  const itemsPerPage = 10;

  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  // Resume Import state
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [parsedResumes, setParsedResumes] = useState<any[]>([]);
  const [parsingProgress, setParsingProgress] = useState<Record<string, 'pending' | 'parsing' | 'success' | 'error'>>({});

  // Fetch Candidates
  const fetchCandidates = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('recruiter_id', user.id);

      if (error) throw error;
      setCandidates(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchCandidates();
    }
  }, [user]);

  // Statistics calculations
  const totalCount = candidates.length;
  const interviewedCount = candidates.filter(c => c.status === 'interviewed').length;
  const pendingCount = candidates.filter(c => c.status === 'pending').length;
  const scoredCandidates = candidates.filter(c => c.overall_score !== null && c.overall_score !== undefined);
  const avgScore = scoredCandidates.length > 0 
    ? Math.round(scoredCandidates.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / scoredCandidates.length)
    : 0;

  // Unique tech stacks list for filter dropdown
  const allTechStacks = Array.from(
    new Set(candidates.flatMap(c => c.tech_stack || []))
  ).filter(Boolean);

  // Unique folders list for filter dropdown
  const allFolders = Array.from(
    new Set(candidates.map(c => c.folder_name).filter(Boolean))
  );

  // Filter & Sort candidates
  const filteredCandidates = candidates
    .filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter.toLowerCase();
      
      const matchesTech = techFilter === 'All' || c.tech_stack?.includes(techFilter);

      const matchesFolder = folderFilter === 'All' || c.folder_name === folderFilter;

      return matchesSearch && matchesStatus && matchesTech && matchesFolder;
    })
    .sort((a, b) => {
      if (sortBy === 'Newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'Oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'Highest Score') return (b.overall_score || 0) - (a.overall_score || 0);
      if (sortBy === 'Lowest Score') return (a.overall_score || 0) - (b.overall_score || 0);
      return 0;
    });

  // Paginated candidates
  const paginatedCandidates = filteredCandidates.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage) || 1;

  // CSV Template download
  const downloadCsvTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,email,github_url,role_applied,notes\nJohn Doe,john@example.com,https://github.com/johndoe,Software Engineer,Senior backend experience\nJane Smith,jane@example.com,https://github.com/janesmith,Frontend Lead,Strong React candidate\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "codewalk_candidates_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template download started!');
  };

  // Parse CSV client-side
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvErrors([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          throw new Error('CSV file is empty or missing headers.');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const expected = ['name', 'email', 'github_url'];
        const missing = expected.filter(exp => !headers.includes(exp));
        if (missing.length > 0) {
          throw new Error(`Missing required CSV columns: ${missing.join(', ')}`);
        }

        const parsedData: any[] = [];
        const errorsList: string[] = [];
        const emailsSet = new Set<string>();

        // Row level validation
        for (let i = 1; i < lines.length; i++) {
          const columns = lines[i].split(',').map(c => c.trim());
          const rowData: Record<string, string> = {};
          headers.forEach((header, index) => {
            rowData[header] = columns[index] || '';
          });

          const rowNum = i + 1;
          if (!rowData.name) errorsList.push(`Row ${rowNum}: Name is missing.`);
          if (!rowData.email) {
            errorsList.push(`Row ${rowNum}: Email is missing.`);
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rowData.email)) {
            errorsList.push(`Row ${rowNum}: Invalid email format (${rowData.email}).`);
          } else if (emailsSet.has(rowData.email)) {
            errorsList.push(`Row ${rowNum}: Duplicate email inside CSV (${rowData.email}).`);
          } else {
            emailsSet.add(rowData.email);
          }

          if (!rowData.github_url) {
            errorsList.push(`Row ${rowNum}: GitHub URL is missing.`);
          } else if (!rowData.github_url.includes('github.com/')) {
            errorsList.push(`Row ${rowNum}: Invalid GitHub URL format.`);
          }

          parsedData.push({
            name: rowData.name || '',
            email: rowData.email || '',
            github_url: rowData.github_url || '',
            role_applied: rowData.role_applied || '',
            notes: rowData.notes || '',
            isValid: !errorsList.some(e => e.startsWith(`Row ${rowNum}:`))
          });
        }

        setCsvPreview(parsedData);
        setCsvErrors(errorsList);
      } catch (err: any) {
        toast.error(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleImportCsv = async () => {
    const validRows = csvPreview.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid candidates to import.');
      return;
    }

    setLoading(true);
    try {
      const toInsert = validRows.map(row => ({
        recruiter_id: user?.id,
        name: row.name,
        email: row.email,
        github_url: row.github_url,
        role_applied: row.role_applied,
        notes: row.notes,
        status: 'pending',
        imported_via: 'csv',
        folder_name: folderName.trim() || null
      }));

      const { error } = await supabase.from('candidates').insert(toInsert);
      if (error) throw error;

      toast.success(`Successfully imported ${validRows.length} candidates!`);
      setImportModalOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      setFolderName('');
      fetchCandidates();
    } catch (err: any) {
      toast.error(err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  // PDF Resumes parsing triggers
  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate limit (max 10, max 5MB each)
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max 5MB.`);
        return false;
      }
      const isAllowed = file.name.toLowerCase().endsWith('.pdf') || file.name.toLowerCase().endsWith('.docx');
      if (!isAllowed) {
        toast.error(`File ${file.name} must be a PDF or DOCX file.`);
        return false;
      }
      return true;
    }).slice(0, 10);

    setResumeFiles(validFiles);
    
    // Reset progress
    const initProgress: any = {};
    validFiles.forEach(f => { initProgress[f.name] = 'pending'; });
    setParsingProgress(initProgress);

    // Call API parser for each file sequentially or concurrently
    const parsedResults: any[] = [];

    for (const file of validFiles) {
      setParsingProgress(prev => ({ ...prev, [file.name]: 'parsing' }));
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/candidates/parse-resume', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to parse resume.');

        parsedResults.push({
          fileName: file.name,
          name: data.parsed.name || '',
          email: data.parsed.email || '',
          github_url: data.parsed.github_url || '',
          linkedin_url: data.parsed.linkedin_url || '',
          skills: data.parsed.skills || [],
          years_experience: data.parsed.years_experience || '',
          current_title: data.parsed.current_title || '',
          isEdited: false
        });

        setParsingProgress(prev => ({ ...prev, [file.name]: 'success' }));
      } catch (err) {
        console.error('Error parsing resume:', err);
        setParsingProgress(prev => ({ ...prev, [file.name]: 'error' }));
        // Add default empty state for correction
        parsedResults.push({
          fileName: file.name,
          name: '',
          email: '',
          github_url: '',
          linkedin_url: '',
          skills: [],
          years_experience: '',
          current_title: '',
          isEdited: true
        });
      }
    }

    setParsedResumes(parsedResults);
  };

  const handleSaveResumes = async () => {
    // Validate that all parsed resumes have required name, email, github
    const invalid = parsedResumes.find(r => !r.name.trim() || !r.email.trim() || !r.github_url.trim());
    if (invalid) {
      toast.error(`Please complete the Name, Email, and GitHub URL fields for all candidates.`);
      return;
    }

    setLoading(true);
    try {
      const toInsert = parsedResumes.map(r => ({
        recruiter_id: user?.id,
        name: r.name,
        email: r.email,
        github_url: r.github_url,
        linkedin_url: r.linkedin_url,
        role_applied: r.current_title,
        status: 'pending',
        tech_stack: r.skills,
        years_experience: r.years_experience,
        current_title: r.current_title,
        imported_via: 'resume',
        resume_extracted_data: r,
        folder_name: folderName.trim() || null
      }));

      const { error } = await supabase.from('candidates').insert(toInsert);
      if (error) throw error;

      toast.success(`Successfully imported ${parsedResumes.length} resumes!`);
      setImportModalOpen(false);
      setResumeFiles([]);
      setParsedResumes([]);
      setFolderName('');
      fetchCandidates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save resumes.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterviewFromCandidate = async (candidate: Candidate) => {
    setLoading(true);
    try {
      // 1. Create session directly in active state
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .insert({
          recruiter_id: user?.id,
          candidate_id: candidate.id,
          repo_url: candidate.github_url,
          status: 'active',
          timer_duration_minutes: 45,
          remaining_seconds: 45 * 60
        })
        .select()
        .single();

      if (sessErr) throw sessErr;

      // 2. Pre-generate questions from repo in background (or redirect to setup session with candidate pre-selected)
      // For immediate start: create a minimal empty question list and redirect to setup screen
      router.push(`/dashboard/new-session?candidateId=${candidate.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start interview.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d1515] text-[#F1F5F9] min-h-screen p-8 overflow-y-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Candidate Pipeline</h1>
          <p className="text-xs text-[#94A3B8] mt-1">Manage, import, and review candidates before initiating assessment interviews.</p>
        </div>
        <button
          onClick={() => setImportModalOpen(true)}
          className="px-4 py-2.5 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          <span>Import Candidates</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#151d1e] border border-[#3b494b] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Total Candidates</p>
            <h3 className="text-2xl font-extrabold text-white mt-1">{totalCount}</h3>
          </div>
          <span className="material-symbols-outlined text-2xl text-cyan-400 bg-cyan-950/40 p-3 rounded-xl border border-cyan-500/20">groups</span>
        </div>
        <div className="bg-[#151d1e] border border-[#3b494b] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Interviewed</p>
            <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{interviewedCount}</h3>
          </div>
          <span className="material-symbols-outlined text-2xl text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20">task_alt</span>
        </div>
        <div className="bg-[#151d1e] border border-[#3b494b] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Pending Interview</p>
            <h3 className="text-2xl font-extrabold text-[#F59E0B] mt-1">{pendingCount}</h3>
          </div>
          <span className="material-symbols-outlined text-2xl text-[#F59E0B] bg-amber-950/40 p-3 rounded-xl border border-amber-500/20">schedule</span>
        </div>
        <div className="bg-[#151d1e] border border-[#3b494b] p-5 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Average Score</p>
            <h3 className="text-2xl font-extrabold text-purple-400 mt-1">{avgScore ? `${avgScore}%` : 'N/A'}</h3>
          </div>
          <span className="material-symbols-outlined text-2xl text-purple-400 bg-purple-950/40 p-3 rounded-xl border border-purple-500/20">percent</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#151d1e] border border-[#3b494b] p-4 rounded-xl shadow-md mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">search</span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-[#0d1515] border border-[#3b494b] pl-10 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Interviewed">Interviewed</option>
            <option value="Hired">Hired</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Tech stack filter */}
          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white cursor-pointer"
          >
            <option value="All">All Technologies</option>
            {allTechStacks.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Folder filter */}
          <select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
            className="bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white cursor-pointer"
          >
            <option value="All">All Folders</option>
            {allFolders.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* Sort selection */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white cursor-pointer"
          >
            <option value="Newest">Newest First</option>
            <option value="Oldest">Oldest First</option>
            <option value="Highest Score">Highest Score</option>
            <option value="Lowest Score">Lowest Score</option>
          </select>
        </div>
      </div>

      {/* Candidates Pipeline Grid/Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 flex-1">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#06B6D4] mb-3"></div>
          <p className="text-xs text-[#94A3B8]">Loading candidate data...</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-[#151d1e] border border-dashed border-[#3b494b] p-16 rounded-xl text-center flex flex-col items-center justify-center flex-1 shadow-md">
          <span className="material-symbols-outlined text-5xl text-[#3b494b] mb-4">folder_shared</span>
          <h4 className="text-lg font-bold text-white">Import your first candidates</h4>
          <p className="text-xs text-[#94A3B8] max-w-sm mt-2 mb-6 leading-relaxed">
            Drag and drop your candidate list CSV or individual PDF resumes to instantly start generating AI code questions matching your open roles.
          </p>
          <button
            onClick={() => setImportModalOpen(true)}
            className="px-5 py-2.5 bg-[#06B6D4]/10 hover:bg-[#06B6D4]/20 border border-[#06B6D4] text-[#06B6D4] font-bold text-xs uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer"
          >
            + Import Candidates
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#3b494b]/60">
                <thead className="bg-[#0d1515]/50 select-none">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Candidate Details</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">GitHub Link</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Tech Stack</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Interview Score</th>
                    <th scope="col" className="px-6 py-4 text-right text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3b494b]/40 text-xs">
                  {paginatedCandidates.map((cand) => {
                    const initials = cand.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    return (
                      <tr key={cand.id} className="hover:bg-[#0d1515]/20 transition-colors">
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4] font-bold text-xs select-none">
                              {initials}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{cand.name}</p>
                              <p className="text-[10px] text-[#94A3B8] mt-0.5">{cand.email}</p>
                              {cand.folder_name && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/20 px-1.5 py-0.5 rounded">
                                    <span className="material-symbols-outlined text-[10px]">folder</span>
                                    {cand.folder_name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <a
                            href={cand.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#06B6D4] hover:underline flex items-center gap-1 font-mono text-[11px]"
                          >
                            <span className="material-symbols-outlined text-xs">link</span>
                            <span>{cand.github_url.replace('https://github.com/', '')}</span>
                          </a>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {cand.tech_stack && cand.tech_stack.length > 0 ? (
                              cand.tech_stack.slice(0, 3).map((tech, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-[#0d1515]/60 border border-[#3b494b] rounded text-[9px] text-[#b9cacb] font-medium">
                                  {tech}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-[#475569] italic">None</span>
                            )}
                            {cand.tech_stack && cand.tech_stack.length > 3 && (
                              <span className="text-[9px] text-cyan-400 font-bold px-1 py-0.5">
                                +{cand.tech_stack.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            cand.status === 'hired' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            cand.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            cand.status === 'interviewed' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                            cand.status === 'scheduled' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}>
                            {cand.status === 'scheduled' ? 'Scheduled' : cand.status}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          {cand.overall_score !== null && cand.overall_score !== undefined ? (
                            <span className="font-bold text-emerald-400 font-mono">{cand.overall_score}/100</span>
                          ) : (
                            <span className="text-[#475569] italic font-medium">Not evaluated</span>
                          )}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2.5">
                            <button
                              onClick={() => router.push(`/candidates/${cand.id}`)}
                              className="px-2.5 py-1.5 border border-[#3b494b] hover:border-[#94A3B8] text-[#94A3B8] hover:text-white rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                            >
                              View Profile
                            </button>
                            <button
                              onClick={() => handleStartInterviewFromCandidate(cand)}
                              className="px-2.5 py-1.5 bg-[#06B6D4]/10 hover:bg-[#06B6D4] text-[#06B6D4] hover:text-[#0d1515] border border-[#06B6D4] rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
                            >
                              Start Interview
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 select-none">
              <span className="text-xs text-[#94A3B8]">
                Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 bg-[#151d1e] border border-[#3b494b] text-[#94A3B8] hover:text-white hover:border-[#94A3B8] disabled:opacity-30 rounded-lg text-xs transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 bg-[#151d1e] border border-[#3b494b] text-[#94A3B8] hover:text-white hover:border-[#94A3B8] disabled:opacity-30 rounded-lg text-xs transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IMPORT CANDIDATES MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#3b494b] flex justify-between items-center bg-[#0d1515]/30">
              <div>
                <h3 className="text-lg font-bold text-white">Import Candidates</h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">Upload a CSV candidate roster or PDF resumes parsed automatically with Groq.</p>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1 hover:bg-[#3b494b]/30 rounded-lg text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-[#3b494b]">
              <button
                onClick={() => setImportTab('csv')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                  importTab === 'csv'
                    ? 'border-[#06B6D4] text-[#06B6D4] bg-[#0d1515]/10'
                    : 'border-transparent text-[#94A3B8] hover:text-white'
                }`}
              >
                CSV Upload
              </button>
              <button
                onClick={() => setImportTab('resume')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
                  importTab === 'resume'
                    ? 'border-[#06B6D4] text-[#06B6D4] bg-[#0d1515]/10'
                    : 'border-transparent text-[#94A3B8] hover:text-white'
                }`}
              >
                Resume Parsing (PDF)
              </button>
            </div>

            {/* Modal Content container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* TAB 1: CSV IMPORT */}
              {importTab === 'csv' && (
                <div className="space-y-6">
                  {/* Drag and drop zone */}
                  <div className="border-2 border-dashed border-[#3b494b] hover:border-[#06B6D4] rounded-xl p-8 text-center bg-[#0d1515]/30 transition-colors relative group">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="material-symbols-outlined text-4xl text-[#3b494b] group-hover:text-[#06B6D4] transition-colors mb-2">upload_file</span>
                    <h5 className="text-xs font-bold text-white mb-1">Drag and drop your candidates CSV file here</h5>
                    <p className="text-[10px] text-[#94A3B8]">Or click to browse from files</p>
                  </div>

                  {/* Folder assignment */}
                  <div className="space-y-1 bg-[#151d1e]/50 border border-[#3b494b] p-4 rounded-xl">
                    <label className="text-[10px] text-[#06B6D4] font-bold uppercase tracking-wider block">
                      Assign to Folder (Optional)
                    </label>
                    <p className="text-[9px] text-[#94A3B8] mb-2">Group this CSV batch into a virtual folder to keep candidates organized.</p>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs">folder</span>
                      <input
                        type="text"
                        placeholder="e.g. Backend Developers - Batch A"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] pl-10 pr-4 py-2.5 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Actions & Template Download */}
                  <div className="flex justify-between items-center bg-[#0d1515]/50 border border-[#3b494b] px-4 py-3 rounded-lg text-xs">
                    <span className="text-[#94A3B8]">Need the template layout? Download our starter CSV structure.</span>
                    <button
                      onClick={downloadCsvTemplate}
                      className="px-3 py-1.5 bg-[#0d1515] border border-[#3b494b] hover:border-[#94A3B8] text-white font-bold text-[10px] uppercase rounded transition-all cursor-pointer"
                    >
                      Download CSV Template
                    </button>
                  </div>

                  {/* CSV Parse Preview */}
                  {csvFile && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-[#3b494b] pb-2">
                        <h4 className="text-xs font-bold uppercase text-[#06B6D4]">Parsed Candidates Preview ({csvPreview.length})</h4>
                        {csvErrors.length > 0 && (
                          <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">error</span>
                            {csvErrors.length} issues found
                          </span>
                        )}
                      </div>

                      {csvErrors.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-[10px] text-red-400 max-h-[100px] overflow-y-auto space-y-1 custom-scrollbar">
                          {csvErrors.map((err, idx) => (
                            <p key={idx}>{err}</p>
                          ))}
                        </div>
                      )}

                      <div className="bg-[#0d1515]/40 border border-[#3b494b] rounded-lg max-h-[220px] overflow-y-auto custom-scrollbar">
                        <table className="min-w-full text-left text-[11px]">
                          <thead className="bg-[#0d1515] text-[#94A3B8] font-bold border-b border-[#3b494b]/40">
                            <tr>
                              <th className="px-4 py-2">Name</th>
                              <th className="px-4 py-2">Email</th>
                              <th className="px-4 py-2">GitHub URL</th>
                              <th className="px-4 py-2">Role</th>
                              <th className="px-4 py-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#3b494b]/30">
                            {csvPreview.map((row, idx) => (
                              <tr key={idx} className={row.isValid ? 'hover:bg-[#0d1515]/20' : 'bg-red-500/5'}>
                                <td className="px-4 py-2 font-medium text-white">{row.name || <span className="text-red-400 italic">Missing</span>}</td>
                                <td className="px-4 py-2 text-[#94A3B8]">{row.email || <span className="text-red-400 italic">Missing</span>}</td>
                                <td className="px-4 py-2 text-[#94A3B8] truncate max-w-[120px]">{row.github_url || <span className="text-red-400 italic">Missing</span>}</td>
                                <td className="px-4 py-2 text-[#b9cacb]">{row.role_applied || '-'}</td>
                                <td className="px-4 py-2 text-right">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                    row.isValid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  }`}>
                                    {row.isValid ? 'Valid' : 'Error'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: RESUME UPLOAD */}
              {importTab === 'resume' && (
                <div className="space-y-6">
                  {/* Drag and drop zone */}
                  <div className="border-2 border-dashed border-[#3b494b] hover:border-[#06B6D4] rounded-xl p-8 text-center bg-[#0d1515]/30 transition-colors relative group">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.docx"
                      onChange={handleResumeFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <span className="material-symbols-outlined text-4xl text-[#3b494b] group-hover:text-[#06B6D4] transition-colors mb-2">picture_as_pdf</span>
                    <h5 className="text-xs font-bold text-white mb-1">Drag and drop candidate resume PDFs or DOCX files here (Max 10 files)</h5>
                    <p className="text-[10px] text-[#94A3B8]">Supports PDF &amp; DOCX formats, max 5MB per file</p>
                  </div>

                  {/* Folder assignment */}
                  <div className="space-y-1 bg-[#151d1e]/50 border border-[#3b494b] p-4 rounded-xl">
                    <label className="text-[10px] text-[#06B6D4] font-bold uppercase tracking-wider block">
                      Assign to Folder (Optional)
                    </label>
                    <p className="text-[9px] text-[#94A3B8] mb-2">Group this Resume batch into a virtual folder to keep candidates organized.</p>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs">folder</span>
                      <input
                        type="text"
                        placeholder="e.g. Backend Developers - Batch A"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        className="w-full bg-[#0d1515] border border-[#3b494b] pl-10 pr-4 py-2.5 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Upload and Parsing Progress list */}
                  {resumeFiles.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase text-[#06B6D4] border-b border-[#3b494b] pb-2">Parsing Resumes Progress</h4>
                      <div className="space-y-2">
                        {resumeFiles.map((file) => {
                          const prog = parsingProgress[file.name] || 'pending';
                          return (
                            <div key={file.name} className="flex justify-between items-center bg-[#0d1515]/50 border border-[#3b494b] p-3 rounded-lg text-xs">
                              <span className="truncate max-w-sm font-medium text-white">{file.name}</span>
                              <div className="flex items-center gap-2">
                                {prog === 'parsing' && (
                                  <>
                                    <span className="material-symbols-outlined text-sm animate-spin text-[#06B6D4]">sync</span>
                                    <span className="text-[10px] text-[#06B6D4] font-medium">Extracting fields with Groq...</span>
                                  </>
                                )}
                                {prog === 'success' && (
                                  <>
                                    <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                                    <span className="text-[10px] text-emerald-400 font-medium">Success</span>
                                  </>
                                )}
                                {prog === 'error' && (
                                  <>
                                    <span className="material-symbols-outlined text-sm text-red-400">cancel</span>
                                    <span className="text-[10px] text-red-400 font-medium">Failed — Add manually below</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Extracted Profiles review list */}
                  {parsedResumes.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-[#3b494b]/60">
                      <h4 className="text-xs font-bold uppercase text-[#06B6D4]">Review Extracted Profiles</h4>
                      <div className="space-y-4">
                        {parsedResumes.map((resData, idx) => (
                          <div key={idx} className="bg-[#0d1515]/40 border border-[#3b494b] p-4 rounded-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-[#3b494b]/60 pb-2">
                              <span className="text-[10px] font-bold text-[#94A3B8] font-mono">File: {resData.fileName}</span>
                              <span className="text-[10px] text-cyan-400 italic">Verify fields before saving</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="space-y-1">
                                <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Full Name</label>
                                <input
                                  value={resData.name}
                                  onChange={(e) => {
                                    const next = [...parsedResumes];
                                    next[idx].name = e.target.value;
                                    setParsedResumes(next);
                                  }}
                                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Email</label>
                                <input
                                  value={resData.email}
                                  onChange={(e) => {
                                    const next = [...parsedResumes];
                                    next[idx].email = e.target.value;
                                    setParsedResumes(next);
                                  }}
                                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                                />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] text-[#94A3B8] uppercase font-bold flex items-center gap-1">
                                  <span>GitHub Profile URL</span>
                                  {!resData.github_url && <span className="text-red-400 font-bold text-[8px] uppercase bg-red-950/40 px-1.5 py-0.5 rounded border border-red-500/20">Required</span>}
                                </label>
                                <input
                                  required
                                  value={resData.github_url}
                                  placeholder="Paste GitHub URL e.g. https://github.com/username"
                                  onChange={(e) => {
                                    const next = [...parsedResumes];
                                    next[idx].github_url = e.target.value;
                                    setParsedResumes(next);
                                  }}
                                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded focus:outline-none focus:border-[#06B6D4] text-white font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-[#94A3B8] uppercase font-bold">LinkedIn URL</label>
                                <input
                                  value={resData.linkedin_url}
                                  placeholder="Optional link"
                                  onChange={(e) => {
                                    const next = [...parsedResumes];
                                    next[idx].linkedin_url = e.target.value;
                                    setParsedResumes(next);
                                  }}
                                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Years Experience</label>
                                <input
                                  value={resData.years_experience}
                                  placeholder="e.g. 3 years"
                                  onChange={(e) => {
                                    const next = [...parsedResumes];
                                    next[idx].years_experience = e.target.value;
                                    setParsedResumes(next);
                                  }}
                                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Most Recent Title / Role</label>
                                <input
                                  value={resData.current_title}
                                  placeholder="e.g. Fullstack Developer"
                                  onChange={(e) => {
                                    const next = [...parsedResumes];
                                    next[idx].current_title = e.target.value;
                                    setParsedResumes(next);
                                  }}
                                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Skills Tags (comma separated)</label>
                                <input
                                  value={resData.skills.join(', ')}
                                  placeholder="e.g. React, Node.js, Python"
                                  onChange={(e) => {
                                    const next = [...parsedResumes];
                                    next[idx].skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                    setParsedResumes(next);
                                  }}
                                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-1.5 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#3b494b] flex justify-end gap-3 bg-[#0d1515]/30">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 border border-[#3b494b] hover:border-[#94A3B8] text-[#94A3B8] hover:text-white rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {importTab === 'csv' ? (
                <button
                  type="button"
                  onClick={handleImportCsv}
                  disabled={loading || csvPreview.length === 0}
                  className="px-5 py-2 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  Import {csvPreview.filter(r => r.isValid).length} Candidates
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveResumes}
                  disabled={loading || parsedResumes.length === 0}
                  className="px-5 py-2 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  Save All Candidates
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
