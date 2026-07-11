'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';

export default function ResumeExtractorPage() {
  const router = useRouter();
  const { user } = useGlobal();

  // State Management
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [parsingProgress, setParsingProgress] = useState<Record<string, 'pending' | 'parsing' | 'success' | 'error'>>({});
  const [parsedResumes, setParsedResumes] = useState<any[]>([]);
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);

  // File Upload & parsing handler
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

    if (validFiles.length === 0) return;

    setResumeFiles(validFiles);
    
    // Reset progress
    const initProgress: any = {};
    validFiles.forEach(f => { initProgress[f.name] = 'pending'; });
    setParsingProgress(initProgress);

    // Call API parser for each file
    const parsedResults: any[] = [];
    setLoading(true);

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
        // Clean fallback: use filename-based details
        const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-\+]/g, " ").trim();
        const capitalizedName = baseName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        
        parsedResults.push({
          fileName: file.name,
          name: capitalizedName || 'Candidate',
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
    setLoading(false);
  };

  const handleSaveResumes = async () => {
    // Validate that all parsed resumes have required name, email
    const invalid = parsedResumes.find(r => !r.name.trim() || !r.email.trim());
    if (invalid) {
      toast.error(`Please complete the Name and Email fields for all candidates.`);
      return;
    }

    // Warn about missing GitHub URLs since they are required for repo analysis
    const missingGit = parsedResumes.find(r => !r.github_url.trim());
    if (missingGit) {
      toast.error(`GitHub URL is required for all candidates to analyze their code repositories.`);
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

      toast.success(`Successfully imported ${parsedResumes.length} candidates!`);
      setResumeFiles([]);
      setParsedResumes([]);
      setFolderName('');
      router.push('/candidates');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save candidate profiles.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d1515] text-[#F1F5F9] min-h-screen p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 select-none">
          <span className="material-symbols-outlined text-[#06B6D4]">description</span>
          <span>AI Resume Extractor</span>
        </h1>
        <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed max-w-2xl">
          Upload PDF or Word resumes in batches. CodeWalk will automatically extract full names, emails, portfolios, technologies, and link their GitHub profiles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Panel (Left Column, span 1) */}
        <div className="space-y-6">
          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] flex items-center gap-1.5 border-b border-[#3b494b]/60 pb-3">
              <span className="material-symbols-outlined text-sm">upload_file</span>
              <span>Upload Batch</span>
            </h3>

            {/* Drag & Drop */}
            <div className="border-2 border-dashed border-[#3b494b] hover:border-[#06B6D4] rounded-xl p-8 text-center bg-[#0d1515]/30 transition-colors relative group cursor-pointer">
              <input
                type="file"
                multiple
                accept=".pdf,.docx"
                onChange={handleResumeFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={loading}
              />
              <span className="material-symbols-outlined text-4xl text-[#3b494b] group-hover:text-[#06B6D4] transition-colors mb-2">picture_as_pdf</span>
              <h5 className="text-xs font-bold text-white mb-1">Drag and drop resumes here</h5>
              <p className="text-[10px] text-[#94A3B8]">Supports PDF &amp; DOCX, max 5MB per file</p>
            </div>

            {/* Folder Selection */}
            <div className="space-y-1 pt-2">
              <label className="text-[10px] text-[#06B6D4] font-bold uppercase tracking-wider block">
                Assign to Folder (Optional)
              </label>
              <p className="text-[9px] text-[#94A3B8] mb-2">Organize this batch into a virtual folder (e.g. Frontend Applicants - July).</p>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs">folder</span>
                <input
                  type="text"
                  placeholder="e.g. React Developers Batch"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full bg-[#0d1515] border border-[#3b494b] pl-10 pr-4 py-2.5 rounded-lg text-xs focus:outline-none focus:border-[#06B6D4] text-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Parsing Queue / Progress */}
          {resumeFiles.length > 0 && (
            <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md space-y-4">
              <h4 className="text-[10px] font-bold uppercase text-[#06B6D4] tracking-widest border-b border-[#3b494b]/60 pb-2">Parsing Queue ({resumeFiles.length})</h4>
              <div className="divide-y divide-[#3b494b]/30 max-h-60 overflow-y-auto pr-1">
                {resumeFiles.map((file, idx) => {
                  const prog = parsingProgress[file.name] || 'pending';
                  return (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                      <span className="text-white truncate font-medium flex-1">{file.name}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0 select-none">
                        {prog === 'pending' && (
                          <span className="text-[10px] text-[#94A3B8] uppercase font-bold">Waiting</span>
                        )}
                        {prog === 'parsing' && (
                          <div className="flex items-center gap-1 text-[10px] text-[#06B6D4] font-bold uppercase animate-pulse">
                            <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                            <span>Parsing</span>
                          </div>
                        )}
                        {prog === 'success' && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase">
                            <span className="material-symbols-outlined text-xs font-bold">check_circle</span>
                            <span>Ready</span>
                          </div>
                        )}
                        {prog === 'error' && (
                          <div className="flex items-center gap-1 text-[10px] text-red-400 font-bold uppercase">
                            <span className="material-symbols-outlined text-xs">error</span>
                            <span>Fallback</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Extracted Profiles Review Panel (Right Column, span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-xl shadow-md min-h-[400px] flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#06B6D4] border-b border-[#3b494b]/60 pb-3 flex justify-between items-center">
              <span>Review Extracted Profiles</span>
              {parsedResumes.length > 0 && (
                <span className="text-[10px] text-[#94A3B8] normal-case font-medium">Verify profiles before saving to pipeline</span>
              )}
            </h3>

            {parsedResumes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-[#94A3B8]">
                <span className="material-symbols-outlined text-5xl text-[#3b494b] mb-4">document_scanner</span>
                <p className="text-xs max-w-sm">No resumes uploaded yet. Select files on the left to start extracting candidate profiles.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between space-y-6 pt-4">
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
                  {parsedResumes.map((cand, idx) => (
                    <div key={idx} className="bg-[#0d1515]/40 border border-[#3b494b] p-5 rounded-xl space-y-4 relative group">
                      <button
                        onClick={() => {
                          const nextFiles = resumeFiles.filter((_, i) => i !== idx);
                          const nextParsed = parsedResumes.filter((_, i) => i !== idx);
                          setResumeFiles(nextFiles);
                          setParsedResumes(nextParsed);
                        }}
                        className="absolute right-4 top-4 text-xs text-[#94A3B8] hover:text-red-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                        <span>Remove</span>
                      </button>

                      <div className="flex items-center gap-1.5 border-b border-[#3b494b]/60 pb-2">
                        <span className="material-symbols-outlined text-sm text-[#06B6D4]">description</span>
                        <span className="text-[10px] font-bold text-[#94A3B8] font-mono">File: {cand.fileName}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Full Name</label>
                          <input
                            type="text"
                            value={cand.name}
                            onChange={(e) => {
                              const next = [...parsedResumes];
                              next[idx].name = e.target.value;
                              setParsedResumes(next);
                            }}
                            className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Email</label>
                          <input
                            type="email"
                            value={cand.email}
                            onChange={(e) => {
                              const next = [...parsedResumes];
                              next[idx].email = e.target.value;
                              setParsedResumes(next);
                            }}
                            className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                          />
                        </div>

                        <div className="space-y-1 md:col-span-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] text-[#94A3B8] uppercase font-bold flex items-center gap-1">
                              <span>GitHub Repository URL</span>
                              <span className="text-[8px] bg-red-500/10 text-red-400 px-1 py-0.5 rounded font-normal uppercase">Required</span>
                            </label>
                            {!cand.github_url.trim() && (
                              <span className="text-[9px] text-red-400 italic">Required for code screening</span>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. https://github.com/username/repository"
                            value={cand.github_url}
                            onChange={(e) => {
                              const next = [...parsedResumes];
                              next[idx].github_url = e.target.value;
                              setParsedResumes(next);
                            }}
                            className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-[#94A3B8] uppercase font-bold">LinkedIn URL (Optional)</label>
                          <input
                            type="text"
                            placeholder="Optional link"
                            value={cand.linkedin_url}
                            onChange={(e) => {
                              const next = [...parsedResumes];
                              next[idx].linkedin_url = e.target.value;
                              setParsedResumes(next);
                            }}
                            className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Years Experience</label>
                          <input
                            type="text"
                            placeholder="e.g. 3 years"
                            value={cand.years_experience}
                            onChange={(e) => {
                              const next = [...parsedResumes];
                              next[idx].years_experience = e.target.value;
                              setParsedResumes(next);
                            }}
                            className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Most Recent Title / Role</label>
                          <input
                            type="text"
                            placeholder="e.g. Software Engineer"
                            value={cand.current_title}
                            onChange={(e) => {
                              const next = [...parsedResumes];
                              next[idx].current_title = e.target.value;
                              setParsedResumes(next);
                            }}
                            className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Skills Tags (Comma separated)</label>
                          <input
                            type="text"
                            placeholder="e.g. React, Node.js, Python"
                            value={Array.isArray(cand.skills) ? cand.skills.join(', ') : cand.skills}
                            onChange={(e) => {
                              const next = [...parsedResumes];
                              next[idx].skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              setParsedResumes(next);
                            }}
                            className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded focus:outline-none focus:border-[#06B6D4] text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#3b494b]/60 flex justify-end gap-3 select-none">
                  <button
                    onClick={() => {
                      setResumeFiles([]);
                      setParsedResumes([]);
                    }}
                    className="px-4 py-2 border border-[#3b494b] text-[#94A3B8] hover:text-white rounded-lg text-xs font-bold uppercase transition-all"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleSaveResumes}
                    disabled={loading}
                    className="px-5 py-2 bg-[#06B6D4] text-[#0d1515] rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    {loading ? 'Saving profiles...' : `Save All (${parsedResumes.length}) Candidates`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
