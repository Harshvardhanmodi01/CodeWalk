'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import AssignProjectModal from '@/components/modals/AssignProjectModal';

interface PositionDetails {
  id: string;
  title: string;
  job_description: string;
  required_skills: string[];
  experience_level: string;
  department: string;
  status: 'open' | 'closed' | 'draft';
  created_at: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  github_url: string;
  linkedin_url: string;
  status: string;
  tech_stack: string[];
  years_experience: string;
  current_title: string;
  overall_score: number | null;
  fit_score: 'best_fit' | 'good_fit' | 'possible_fit' | null;
  matched_skills?: { matched: string[] };
  missing_skills?: { missing: string[] };
  notes: string;
  folder_name?: string;
  created_at: string;
  hire_recommendation?: string;
  resume_extracted_data?: any;
}

interface DuplicateCheckResult {
  candidateName: string;
  positionTitle: string;
  emailMatch: boolean;
  githubMatch: boolean;
  rowIdx: number;
}

export default function PositionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const positionId = params.positionId as string;
  const { user, refreshUserData } = useGlobal();

  const [position, setPosition] = useState<PositionDetails | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'candidates' | 'analytics' | 'details'>('candidates');

  // Edit Position state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editJd, setEditJd] = useState('');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editSkillInput, setEditSkillInput] = useState('');
  const [editExperience, setEditExperience] = useState('Mid');
  const [editDept, setEditDept] = useState('');

  // Collapsible JD state
  const [jdCollapsed, setJdCollapsed] = useState(true);

  // Modals state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [assignProjectModalOpen, setAssignProjectModalOpen] = useState(false);
  const [selectedCandidateForProject, setSelectedCandidateForProject] = useState<any>(null);

  // Import Tab states
  const [importTab, setImportTab] = useState<'csv' | 'resume'>('csv');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);
  const [csvDuplicates, setCsvDuplicates] = useState<DuplicateCheckResult[]>([]);
  const [csvDuplicateConfirmations, setCsvDuplicateConfirmations] = useState<Record<number, boolean>>({});
  const [folderName, setFolderName] = useState('');

  // Resume PDF state
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [parsedResumes, setParsedResumes] = useState<any[]>([]);
  const [parsingResumes, setParsingResumes] = useState(false);
  const [resumeDuplicates, setResumeDuplicates] = useState<DuplicateCheckResult[]>([]);
  const [resumeDuplicateConfirmations, setResumeDuplicateConfirmations] = useState<Record<number, boolean>>({});

  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFit, setFilterFit] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Active Batch Job Polling state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    completed: number;
    failed: number;
    total: number;
    status: string;
  } | null>(null);

  // Popovers state
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);

  // Export options
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exportSelection, setExportSelection] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id && positionId) {
      fetchPositionDetails();
      fetchCandidates();
      checkExistingBatchJob();
    }
  }, [user, positionId]);

  // Polling hook for background bulk operation
  useEffect(() => {
    if (!activeJobId) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('batch_jobs')
          .select('status, completed_count, failed_count, total_count')
          .eq('id', activeJobId)
          .single();

        if (error) throw error;

        if (data) {
          setBatchProgress({
            completed: data.completed_count || 0,
            failed: data.failed_count || 0,
            total: data.total_count || 0,
            status: data.status
          });

          if (data.status === 'completed' || data.status === 'failed') {
            toast.success(`Question generation complete! ${data.completed_count} succeeded, ${data.failed_count} failed.`);
            setActiveJobId(null);
            localStorage.removeItem('cw_active_batch_job_id');
            setBatchProgress(null);
            fetchCandidates();
            if (refreshUserData) refreshUserData();
          }
        }
      } catch (err) {
        console.error('Failed to poll batch job status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeJobId]);

  const checkExistingBatchJob = async () => {
    const savedJobId = localStorage.getItem('cw_active_batch_job_id');
    if (savedJobId) {
      setActiveJobId(savedJobId);
    }
  };

  const fetchPositionDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('id', positionId)
        .eq('recruiter_id', user?.id)
        .single();

      if (error) throw error;

      setPosition(data);
      setEditTitle(data.title);
      setEditJd(data.job_description);
      setEditSkills(data.required_skills || []);
      setEditExperience(data.experience_level || 'Mid');
      setEditDept(data.department || '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load position details.');
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('position_id', positionId)
        .eq('recruiter_id', user?.id);

      if (error) throw error;
      setCandidates(data || []);
      // Preset export selection to hired or top-scoring candidates
      const preSelectedExport = (data || [])
        .filter((c: any) => c.status === 'hired' || (c.overall_score && c.overall_score >= 80))
        .map((c: any) => c.id);
      setExportSelection(preSelectedExport);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'open' | 'closed' | 'draft') => {
    try {
      const { error } = await supabase
        .from('positions')
        .update({ status: newStatus })
        .eq('id', positionId);

      if (error) throw error;
      toast.success(`Position status updated to ${newStatus}`);
      setPosition(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status.');
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editJd.trim()) {
      toast.error('Title and Job Description are required.');
      return;
    }

    try {
      const { error } = await supabase
        .from('positions')
        .update({
          title: editTitle.trim(),
          job_description: editJd.trim(),
          required_skills: editSkills,
          experience_level: editExperience,
          department: editDept.trim() || null
        })
        .eq('id', positionId);

      if (error) throw error;
      toast.success('Position updated successfully!');
      setIsEditing(false);
      fetchPositionDetails();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save position edits.');
    }
  };

  // CSV Drag and drop parser
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const rows = text.split('\n').map(r => r.split(','));
      const header = rows[0].map(h => h.trim().toLowerCase());
      
      const nameIdx = header.indexOf('name');
      const emailIdx = header.indexOf('email');
      const githubIdx = header.indexOf('github_url');
      const notesIdx = header.indexOf('notes');

      if (nameIdx === -1 || emailIdx === -1 || githubIdx === -1) {
        toast.error('CSV must contain Name, Email, and github_url columns.');
        return;
      }

      const parsed: any[] = [];
      const validationErrs: string[] = [];
      const duplicateChecks: Promise<DuplicateCheckResult | null>[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 3 || !row[nameIdx]?.trim()) continue;

        const name = row[nameIdx].trim();
        const email = row[emailIdx].trim();
        const github = row[githubIdx].trim();
        const notes = row[notesIdx] ? row[notesIdx].trim() : '';

        // Basic validations
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const githubRegex = /github\.com\/[A-Za-z0-9_.-]+/;

        if (!email || !emailRegex.test(email)) {
          validationErrs.push(`Row ${i}: Invalid or missing email address.`);
        }
        if (!github || !githubRegex.test(github)) {
          validationErrs.push(`Row ${i}: Invalid github_url format.`);
        }

        const candidateRow = { name, email, github_url: github, notes, rowIdx: i };
        parsed.push(candidateRow);

        // Prep cross-position duplicate checking
        duplicateChecks.push((async () => {
          const { data } = await supabase
            .from('candidates')
            .select('id, name, email, github_url, positions:position_id(title)')
            .or(`email.eq.${email},github_url.eq.${github}`)
            .limit(1);

          if (data && data.length > 0) {
            const match = data[0];
            return {
              candidateName: match.name,
              positionTitle: (match as any).positions?.title || 'Another role',
              emailMatch: match.email.toLowerCase() === email.toLowerCase(),
              githubMatch: match.github_url.toLowerCase() === github.toLowerCase(),
              rowIdx: i
            };
          }
          return null;
        })());
      }

      setCsvPreview(parsed);
      setCsvValidationErrors(validationErrs);

      const dupResults = (await Promise.all(duplicateChecks)).filter(Boolean) as DuplicateCheckResult[];
      setCsvDuplicates(dupResults);
    };
    reader.readAsText(file);
  };

  const handleImportCSVSubmit = async () => {
    if (csvValidationErrors.length > 0) {
      toast.error('Please fix validation errors before importing.');
      return;
    }

    // Limit check for Pro Plan
    const isPro = user?.plan === 'pro';
    if (isPro && csvPreview.length > 10) {
      toast.error('Pro Plan limits bulk candidate imports to 10 candidates per batch.');
      return;
    }

    // Check duplicates confirmation
    const unconfirmedDups = csvDuplicates.filter(d => !csvDuplicateConfirmations[d.rowIdx]);
    if (unconfirmedDups.length > 0) {
      toast.error('Please confirm or skip flagged duplicate candidate rows.');
      return;
    }

    try {
      setLoading(true);
      const toInsert = csvPreview.map(row => ({
        recruiter_id: user?.id,
        position_id: positionId,
        name: row.name,
        email: row.email,
        github_url: row.github_url,
        notes: row.notes,
        status: 'pending',
        imported_via: 'csv',
        folder_name: folderName.trim() || null
      }));

      const { error } = await supabase.from('candidates').insert(toInsert);
      if (error) throw error;

      toast.success(`Successfully imported ${toInsert.length} candidates!`);
      setImportModalOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      setFolderName('');
      fetchCandidates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save imported candidates.');
    } finally {
      setLoading(false);
    }
  };

  // PDF Resume upload parser handler
  const handleResumePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Plan check for files count
    const isPro = user?.plan === 'pro';
    if (isPro && (resumeFiles.length + files.length) > 10) {
      toast.error('Pro Plan limits bulk resume parsing to 10 files per batch.');
      return;
    }

    setResumeFiles([...resumeFiles, ...files]);
    setParsingResumes(true);

    try {
      const parsedItems: any[] = [];
      const duplicateChecks: Promise<DuplicateCheckResult | null>[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} exceeds maximum 5MB file size limit.`);
          continue;
        }

        const ext = file.name.toLowerCase().split('.').pop();
        if (ext !== 'pdf' && ext !== 'docx') {
          toast.error(`${file.name} is not a PDF or DOCX file.`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/candidates/parse-resume', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to parse resume.');

        const info = data.parsed;
        parsedItems.push({
          name: info.name || '',
          email: info.email || '',
          github_url: info.github_url || '',
          linkedin_url: info.linkedin_url || '',
          skills: info.skills || [],
          years_experience: info.years_experience || '',
          current_title: info.current_title || '',
          rowIdx: i
        });

        if (info.email || info.github_url) {
          duplicateChecks.push((async () => {
            const { data: matches } = await supabase
              .from('candidates')
              .select('id, name, email, github_url, positions:position_id(title)')
              .or(`email.eq.${info.email},github_url.eq.${info.github_url}`)
              .limit(1);

            if (matches && matches.length > 0) {
              const match = matches[0];
              return {
                candidateName: match.name,
                positionTitle: (match as any).positions?.title || 'Another role',
                emailMatch: match.email.toLowerCase() === info.email.toLowerCase(),
                githubMatch: match.github_url.toLowerCase() === info.github_url.toLowerCase(),
                rowIdx: i
              };
            }
            return null;
          })());
        }
      }

      setParsedResumes(parsedItems);
      const dupResults = (await Promise.all(duplicateChecks)).filter(Boolean) as DuplicateCheckResult[];
      setResumeDuplicates(dupResults);
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse resumes.');
    } finally {
      setParsingResumes(false);
    }
  };

  const handleSaveResumes = async () => {
    // Validate required fields
    const invalid = parsedResumes.find(r => !r.name.trim() || !r.email.trim() || !r.github_url.trim());
    if (invalid) {
      toast.error('Please fill in Name, Email, and GitHub URL fields for all candidates.');
      return;
    }

    // Check duplicate confirmations
    const unconfirmedDups = resumeDuplicates.filter(d => !resumeDuplicateConfirmations[d.rowIdx]);
    if (unconfirmedDups.length > 0) {
      toast.error('Please confirm or skip flagged duplicate candidate rows.');
      return;
    }

    try {
      setLoading(true);
      const toInsert = parsedResumes.map(r => ({
        recruiter_id: user?.id,
        position_id: positionId,
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

      toast.success(`Successfully parsed & saved ${toInsert.length} candidates!`);
      setImportModalOpen(false);
      setResumeFiles([]);
      setParsedResumes([]);
      setFolderName('');
      fetchCandidates();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save parsed candidates.');
    } finally {
      setLoading(false);
    }
  };

  // Bulk operation queue starter
  const handleBulkGenerateQuestions = async () => {
    setBulkConfirmOpen(false);
    try {
      setLoading(true);
      
      const { data, error } = await fetch('/api/positions/bulk-generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds: selectedIds,
          positionId: positionId,
          recruiterId: user?.id
        })
      }).then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to start bulk generation.');
        return body;
      });

      toast.success('Bulk question generation started in the background!');
      setActiveJobId(data.batchJobId);
      localStorage.setItem('cw_active_batch_job_id', data.batchJobId);
      setBatchProgress({
        completed: 0,
        failed: 0,
        total: selectedIds.length,
        status: 'processing'
      });
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger bulk question generation.');
    } finally {
      setLoading(false);
    }
  };

  // Compare selected candidate profiles redirect
  const handleCompareCandidates = () => {
    if (selectedIds.length < 2 || selectedIds.length > 3) {
      toast.error('Please select exactly 2 or 3 candidates to compare.');
      return;
    }
    router.push(`/positions/${positionId}/compare?ids=${selectedIds.join(',')}`);
  };

  // Shortlist Export handler
  const handleExportShortlistSubmit = async () => {
    if (user?.plan === 'free') {
      setExportModalOpen(false);
      setUpgradeModalOpen(true);
      return;
    }

    if (exportSelection.length === 0) {
      toast.error('Please select at least one candidate to export.');
      return;
    }

    try {
      toast.loading('Generating export report...', { id: 'export' });
      const selectedCandidates = candidates.filter(c => exportSelection.includes(c.id));

      if (exportFormat === 'csv') {
        // Build CSV content
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Name,Email,GitHub URL,Fit Score,Overall Score,Recommendation,Status\n';

        selectedCandidates.forEach(c => {
          csvContent += `"${c.name}","${c.email}","${c.github_url}","${c.fit_score || 'N/A'}",${c.overall_score || 'N/A'},"${c.hire_recommendation || 'N/A'}","${c.status}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${position?.title.replace(/\s+/g, '_')}_Shortlist.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('CSV Shortlist exported successfully!', { id: 'export' });
      } else {
        // PDF Export - dynamic client print or API call. For absolute premium aesthetics, we generate a clean print format window
        const printWindow = window.open('', '_blank');
        if (!printWindow) throw new Error('Popup blocker prevented PDF generation.');

        const htmlContent = `
          <html>
            <head>
              <title>CodeWalk Candidate Shortlist Report</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F172A; color: #F1F5F9; padding: 40px; }
                .header { border-bottom: 2px solid #06B6D4; padding-bottom: 20px; margin-bottom: 30px; }
                .title { font-size: 28px; font-weight: 800; color: #FFFFFF; }
                .subtitle { font-size: 14px; color: #06B6D4; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; margin-top: 5px; }
                .jd { background: #1E293B; border-left: 4px solid #3b494b; padding: 15px; font-size: 13px; color: #94A3B8; margin-bottom: 40px; line-height: 1.6; }
                .cand-card { background: #151d1e; border: 1px solid #3b494b; border-radius: 12px; padding: 20px; margin-bottom: 25px; page-break-inside: avoid; }
                .cand-header { display: flex; justify-content: space-between; border-bottom: 1px solid #3b494b/40; padding-bottom: 10px; margin-bottom: 15px; }
                .cand-name { font-size: 18px; font-weight: 700; color: #FFFFFF; }
                .cand-meta { font-size: 12px; color: #94A3B8; font-family: monospace; }
                .badge { px: 8px; py: 3px; font-size: 10px; font-weight: bold; text-transform: uppercase; border-radius: 4px; border: 1px solid; display: inline-block; }
                .badge-best { background: rgba(16, 185, 129, 0.1); color: #10B981; border-color: rgba(16, 185, 129, 0.2); }
                .badge-good { background: rgba(245, 158, 11, 0.1); color: #F59E0B; border-color: rgba(245, 158, 11, 0.2); }
                .badge-possible { background: rgba(249, 115, 22, 0.1); color: #F97316; border-color: rgba(249, 115, 22, 0.2); }
                .details-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-top: 15px; }
                .sec-title { font-size: 11px; text-transform: uppercase; color: #06B6D4; font-weight: bold; letter-spacing: 0.5px; }
                .sec-content { font-size: 13px; color: #E2E8F0; line-height: 1.5; margin-top: 3px; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">${position?.title} Shortlist</div>
                <div class="subtitle">CodeWalk Recruiter Evaluation Report</div>
              </div>
              <div class="jd">
                <strong>Job Description:</strong><br/>
                ${position?.job_description.slice(0, 500)}...
              </div>
              ${selectedCandidates.map(c => `
                <div class="cand-card">
                  <div class="cand-header">
                    <div>
                      <div class="cand-name">${c.name}</div>
                      <div class="cand-meta">${c.email} · GitHub: ${c.github_url}</div>
                    </div>
                    <div>
                      <span class="badge ${
                        c.fit_score === 'best_fit' ? 'badge-best' :
                        c.fit_score === 'good_fit' ? 'badge-good' :
                        'badge-possible'
                      }">${c.fit_score?.replace('_', ' ') || 'N/A'}</span>
                    </div>
                  </div>
                  <div class="details-grid">
                    <div>
                      <div class="sec-title">Interview Score</div>
                      <div class="sec-content" style="font-size: 20px; font-weight: bold; color: #06B6D4;">
                        ${c.overall_score !== null ? `${c.overall_score}%` : 'Not Interviewed'}
                      </div>
                    </div>
                    <div>
                      <div class="sec-title">Recommendation</div>
                      <div class="sec-content" style="text-transform: capitalize; font-weight: bold;">
                        ${c.hire_recommendation || 'Pending'}
                      </div>
                    </div>
                  </div>
                  <div style="margin-top: 15px;">
                    <div class="sec-title">Candidate Notes / Summary</div>
                    <div class="sec-content">${c.notes || 'No evaluator notes added.'}</div>
                  </div>
                </div>
              `).join('')}
              <script>window.print();</script>
            </body>
          </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        toast.success('PDF report triggered successfully!', { id: 'export' });
      }
      setExportModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Export failed.', { id: 'export' });
    }
  };

  // Open import modal gating plan validation
  const handleOpenImportModal = () => {
    const plan = user?.plan || 'free';
    if (plan === 'free') {
      setUpgradeModalOpen(true);
    } else {
      setImportModalOpen(true);
    }
  };

  const handleEditSkillAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = editSkillInput.trim();
      if (val && !editSkills.includes(val)) {
        setEditSkills([...editSkills, val]);
        setEditSkillInput('');
      }
    }
  };

  const handleEditSkillRemove = (tag: string) => {
    setEditSkills(editSkills.filter(t => t !== tag));
  };

  // Sorting and filtering logic
  const filteredCandidates = candidates
    .filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' ? true : c.status === filterStatus;
      const matchFit = filterFit === 'all' ? true : c.fit_score === filterFit;
      return matchSearch && matchStatus && matchFit;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'score_desc') return (b.overall_score || 0) - (a.overall_score || 0);
      if (sortBy === 'score_asc') return (a.overall_score || 0) - (b.overall_score || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'best_fit') {
        const fitOrder: Record<string, number> = { best_fit: 3, good_fit: 2, possible_fit: 1, null: 0 };
        const scoreB = fitOrder[b.fit_score || 'null'] || 0;
        const scoreA = fitOrder[a.fit_score || 'null'] || 0;
        return scoreB - scoreA;
      }
      return 0;
    });

  // Checkbox toggle handlers
  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredCandidates.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectCandidate = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Statistics summaries
  const totalCands = candidates.length;
  const interviewedCands = candidates.filter(c => c.status === 'interviewed' || c.overall_score !== null).length;
  const bestFitCount = candidates.filter(c => c.fit_score === 'best_fit').length;
  const averageScore = interviewedCands > 0
    ? Math.round(candidates.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / interviewedCands)
    : 0;

  // Time since creation
  const createdDate = position ? new Date(position.created_at) : new Date();
  const timeSinceCreated = Math.max(1, Math.round((new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="flex-1 flex flex-col bg-[#0d1515] text-[#F1F5F9] min-h-screen p-8 overflow-y-auto">
      
      {/* Position Header Block */}
      {position && (
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-2xl p-6 mb-8 relative select-none">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#06B6D4] text-3xl">work</span>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">{position.title}</h1>
              </div>
              <p className="text-xs text-[#94A3B8] mt-1.5 flex items-center gap-3">
                <span>{position.department || 'General'}</span>
                <span>·</span>
                <span>{position.experience_level} Level</span>
                <span>·</span>
                <span className="font-mono">Created {new Date(position.created_at).toLocaleDateString()}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 border border-[#3b494b] hover:bg-[#0d1515] text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
              >
                Edit Details
              </button>
              <select
                value={position.status}
                onChange={(e) => handleUpdateStatus(e.target.value as any)}
                className="bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
              >
                <option value="open">Status: Open</option>
                <option value="draft">Status: Draft</option>
                <option value="closed">Status: Closed</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(position.required_skills || []).map((skill, sIdx) => (
                <span key={sIdx} className="px-2.5 py-0.5 bg-[#0d1515] border border-[#3b494b] text-[10px] font-mono rounded text-[#06B6D4] font-semibold">
                  {skill}
                </span>
              ))}
            </div>

            <div className="bg-[#0d1515]/50 rounded-xl p-4 border border-[#3b494b]/40">
              <button
                onClick={() => setJdCollapsed(!jdCollapsed)}
                className="flex items-center gap-1.5 text-xs text-[#06B6D4] font-bold hover:underline mb-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {jdCollapsed ? 'expand_more' : 'expand_less'}
                </span>
                {jdCollapsed ? 'View Job Description' : 'Collapse Job Description'}
              </button>
              {!jdCollapsed && (
                <p className="text-xs text-[#94A3B8] leading-relaxed whitespace-pre-wrap font-sans">
                  {position.job_description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 select-none">
        <div className="bg-[#151d1e] border border-[#3b494b] p-4 rounded-xl shadow-sm text-center">
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block mb-1">Applicants</span>
          <span className="text-xl font-extrabold text-white font-mono">{totalCands}</span>
        </div>
        <div className="bg-[#151d1e] border border-[#3b494b] p-4 rounded-xl shadow-sm text-center">
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block mb-1">Interviewed</span>
          <span className="text-xl font-extrabold text-cyan-400 font-mono">{interviewedCands}</span>
        </div>
        <div className="bg-[#151d1e] border border-[#3b494b] p-4 rounded-xl shadow-sm text-center">
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block mb-1">Avg Score</span>
          <span className="text-xl font-extrabold text-purple-400 font-mono">{averageScore}%</span>
        </div>
        <div className="bg-[#151d1e] border border-[#3b494b] p-4 rounded-xl shadow-sm text-center">
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block mb-1">Best Fit</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono">{bestFitCount}</span>
        </div>
        <div className="bg-[#151d1e] border border-[#3b494b] p-4 rounded-xl shadow-sm text-center col-span-2 md:col-span-1">
          <span className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold block mb-1">Age</span>
          <span className="text-xl font-extrabold text-amber-500 font-mono">{timeSinceCreated} days</span>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-[#3b494b] mb-6 select-none">
        <button
          onClick={() => setActiveTab('candidates')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'candidates' ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          Candidates
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'analytics' ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* TAB CONTENT: DETAILS EDIT INLINE OVERLAY */}
      {isEditing && (
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-2xl p-6 mb-8 text-[#F1F5F9]">
          <h2 className="text-base font-bold text-white mb-4">Edit Position Requirements</h2>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div>
              <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-1">Title</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-1">Department</label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-1">Experience Level</label>
                <select
                  value={editExperience}
                  onChange={(e) => setEditExperience(e.target.value)}
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
              <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-1">Job Description</label>
              <textarea
                required
                rows={6}
                value={editJd}
                onChange={(e) => setEditJd(e.target.value)}
                className="w-full bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-1">Skills</label>
              <div className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg p-2 flex flex-wrap gap-1.5">
                {editSkills.map((tag, tIdx) => (
                  <span key={tIdx} className="px-2 py-0.5 bg-[#151d1e] border border-[#3b494b] text-[9px] font-mono rounded text-white flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => handleEditSkillRemove(tag)} className="text-[#94A3B8] hover:text-red-400">×</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={editSkillInput}
                  onChange={(e) => setEditSkillInput(e.target.value)}
                  onKeyDown={handleEditSkillAdd}
                  className="flex-grow bg-transparent text-xs outline-none text-[#F1F5F9] border-none p-0.5 min-w-[120px]"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-[#3b494b] hover:bg-[#0d1515] text-[#94A3B8] hover:text-white rounded-lg text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#06B6D4] text-[#0d1515] rounded-lg text-xs font-bold uppercase"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT: CANDIDATES LIST */}
      {activeTab === 'candidates' && (
        <div className="space-y-6">
          
          {/* Controls toolbar row */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-[#151d1e] p-4 rounded-xl border border-[#3b494b] select-none">
            <div className="flex flex-col md:flex-row flex-wrap gap-2 w-full lg:w-auto">
              {/* Search */}
              <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg pl-3 pr-8 py-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                />
                <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-[#94A3B8] text-sm">search</span>
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="interviewed">Interviewed</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>

              {/* Fit score filter */}
              <select
                value={filterFit}
                onChange={(e) => setFilterFit(e.target.value)}
                className="bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
              >
                <option value="all">All Fit Grades</option>
                <option value="best_fit">Best Fit</option>
                <option value="good_fit">Good Fit</option>
                <option value="possible_fit">Possible Fit</option>
              </select>

              {/* Sorting */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#0d1515] border border-[#3b494b] text-xs rounded-lg p-2.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="score_desc">Sort: High Score</option>
                <option value="score_asc">Sort: Low Score</option>
                <option value="name">Sort: Name A-Z</option>
                <option value="best_fit">Sort: Best Fit First</option>
              </select>
            </div>

            <div className="flex gap-2 w-full lg:w-auto flex-shrink-0 justify-end">
              <button
                onClick={() => setExportModalOpen(true)}
                className="w-full sm:w-auto whitespace-nowrap flex-shrink-0 px-4 py-2.5 border border-[#3b494b] hover:border-[#06B6D4] text-xs font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all text-[#94A3B8] hover:text-[#06B6D4] cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-bold">download</span>
                Export
              </button>
              <button
                onClick={handleOpenImportModal}
                className="w-full sm:w-auto whitespace-nowrap flex-shrink-0 px-5 py-2.5 bg-[#06B6D4] text-[#0d1515] text-xs font-bold uppercase rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-bold">publish</span>
                + Import Candidates
              </button>
            </div>
          </div>

          {/* BACKGROUND BATCH PROGRESS WORKER PANEL */}
          {batchProgress && (
            <div className="bg-[#151d1e] border border-[#06B6D4]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#06B6D4]"></div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Bulk Question Generation Queue</h4>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">
                    Processing candidates in background (Max 3 in parallel). Do not close this browser tab.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-white">
                  {batchProgress.completed + batchProgress.failed} / {batchProgress.total} Complete
                </span>
                {batchProgress.failed > 0 && (
                  <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">
                    {batchProgress.failed} Failed
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Candidate Pipeline list grid */}
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-2xl overflow-hidden shadow-md">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#0d1515]/40 select-none border-b border-[#3b494b] text-[#94A3B8]">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={filteredCandidates.length > 0 && selectedIds.length === filteredCandidates.length}
                        onChange={handleToggleSelectAll}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4 uppercase font-bold text-[10px]">Candidate Details</th>
                    <th className="px-6 py-4 uppercase font-bold text-[10px] text-center">Fit Score</th>
                    <th className="px-6 py-4 uppercase font-bold text-[10px] text-center">Interview Status</th>
                    <th className="px-6 py-4 uppercase font-bold text-[10px] text-right">Overall Score</th>
                    <th className="px-6 py-4 uppercase font-bold text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3b494b]/20 text-[#94A3B8]">
                  {filteredCandidates.map((cand, idx) => {
                    const isChecked = selectedIds.includes(cand.id);
                    const initials = cand.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                    return (
                      <tr key={cand.id} className="hover:bg-[#0d1515]/20 transition-colors">
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectCandidate(cand.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#0d1515] border border-[#3b494b] flex items-center justify-center font-bold text-[#06B6D4] text-xs">
                              {initials}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-xs">{cand.name}</h4>
                              <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{cand.email}</p>
                              <a
                                href={cand.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-[#06B6D4] hover:underline mt-1 font-mono"
                              >
                                <span className="material-symbols-outlined text-[10px]">terminal</span>
                                {cand.github_url.replace(/https?:\/\/(?:www\.)?github\.com\//, '')}
                              </a>
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
                        <td className="px-6 py-4 text-center relative">
                          {cand.fit_score ? (
                            <div
                              onMouseEnter={() => setHoveredCandidateId(cand.id)}
                              onMouseLeave={() => setHoveredCandidateId(null)}
                              className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border cursor-help ${
                                cand.fit_score === 'best_fit' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                cand.fit_score === 'good_fit' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-orange-500/10 text-orange-400 border-orange-500/20'
                              }`}
                            >
                              {cand.fit_score.replace('_', ' ')}

                              {/* POP-OVER WITH MATCHED/MISSING SKILLS */}
                              {hoveredCandidateId === cand.id && (
                                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#151d1e] border border-[#3b494b] p-3 rounded-lg shadow-xl text-left w-64 text-[#F1F5F9] pointer-events-none select-none">
                                  <div className="space-y-2">
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">Matched Skills</span>
                                      <span className="text-[10px] text-[#94A3B8] block mt-0.5 leading-tight">
                                        {cand.matched_skills?.matched?.join(', ') || 'None'}
                                      </span>
                                    </div>
                                    <hr className="border-[#3b494b]/30" />
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-orange-400 font-bold block">Missing Skills</span>
                                      <span className="text-[10px] text-[#94A3B8] block mt-0.5 leading-tight">
                                        {cand.missing_skills?.missing?.join(', ') || 'None'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#94A3B8] uppercase font-semibold">Not Scored</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                            cand.status === 'hired' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            cand.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            cand.status === 'interviewed' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {cand.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-white text-xs">
                          {cand.overall_score !== null ? `${cand.overall_score}%` : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => router.push(`/candidates/${cand.id}`)}
                              className="px-2.5 py-1.5 border border-[#3b494b] hover:border-[#06B6D4] hover:text-[#06B6D4] text-[10px] font-bold uppercase rounded transition-all cursor-pointer"
                            >
                              Profile
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCandidateForProject(cand);
                                setAssignProjectModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500 text-[10px] font-bold uppercase rounded transition-all cursor-pointer"
                            >
                              Assign Project
                            </button>
                            <button
                              onClick={() => router.push(`/dashboard/new-session?candidateId=${cand.id}`)}
                              className="px-2.5 py-1.5 bg-[#06B6D4] hover:brightness-110 text-[#0d1515] text-[10px] font-bold uppercase rounded transition-all cursor-pointer"
                            >
                              Interview
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCandidates.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-xs text-[#94A3B8]">
                        No applicants found. Click "+ Import Candidates" to populate your pipeline!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-2xl">
            <h3 className="text-xs uppercase tracking-wider text-[#06B6D4] font-bold mb-4">Fit Score Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Best Fit (&gt;=70% Overlap)</span>
                  <span className="font-bold text-white">{candidates.filter(c => c.fit_score === 'best_fit').length}</span>
                </div>
                <div className="w-full bg-[#0d1515] h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${candidates.length > 0 ? (candidates.filter(c => c.fit_score === 'best_fit').length / candidates.length) * 100 : 0}%` }}
                    className="bg-emerald-500 h-full rounded-full"
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Good Fit (40-69% Overlap)</span>
                  <span className="font-bold text-white">{candidates.filter(c => c.fit_score === 'good_fit').length}</span>
                </div>
                <div className="w-full bg-[#0d1515] h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${candidates.length > 0 ? (candidates.filter(c => c.fit_score === 'good_fit').length / candidates.length) * 100 : 0}%` }}
                    className="bg-amber-400 h-full rounded-full"
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Possible Fit (&lt;40% Overlap)</span>
                  <span className="font-bold text-white">{candidates.filter(c => c.fit_score === 'possible_fit').length}</span>
                </div>
                <div className="w-full bg-[#0d1515] h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${candidates.length > 0 ? (candidates.filter(c => c.fit_score === 'possible_fit').length / candidates.length) * 100 : 0}%` }}
                    className="bg-orange-500 h-full rounded-full"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-2xl">
            <h3 className="text-xs uppercase tracking-wider text-[#06B6D4] font-bold mb-4">Top Match Candidates</h3>
            <div className="space-y-3">
              {candidates
                .filter(c => c.overall_score !== null)
                .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
                .slice(0, 3)
                .map((cand, idx) => (
                  <div key={cand.id} className="flex justify-between items-center p-3 bg-[#0d1515] rounded-xl border border-[#3b494b]/60">
                    <div>
                      <h4 className="text-xs font-bold text-white">{cand.name}</h4>
                      <span className="text-[10px] text-[#94A3B8] font-mono">{cand.email}</span>
                    </div>
                    <span className="text-sm font-extrabold text-[#06B6D4] font-mono">{cand.overall_score}%</span>
                  </div>
                ))}
              {candidates.filter(c => c.overall_score !== null).length === 0 && (
                <p className="text-xs text-[#94A3B8] text-center py-6">No candidates have completed assessments yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BOTTOM BAR FOR BULK ACTIONS */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#151d1e] border border-[#06B6D4] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-fade-in select-none">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {selectedIds.length} Candidates Selected
          </span>
          <div className="flex gap-2">
            {selectedIds.length >= 2 && selectedIds.length <= 3 && (
              <button
                onClick={handleCompareCandidates}
                className="px-4 py-2 border border-[#3b494b] hover:border-[#06B6D4] hover:bg-[#06B6D4]/10 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer text-[#06B6D4]"
              >
                Compare Profiles
              </button>
            )}
            <button
              onClick={() => setBulkConfirmOpen(true)}
              className="px-4 py-2 bg-[#06B6D4] text-[#0d1515] text-xs font-bold uppercase rounded-lg hover:brightness-110 transition-all flex items-center gap-1 active:scale-95 cursor-pointer animate-pulse"
            >
              Generate Questions ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* BULK QUESTION CONFIRMATION MODAL */}
      {bulkConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-2xl w-full max-w-md p-6 space-y-6 text-[#F1F5F9] select-none">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#06B6D4]">analytics</span>
              Confirm Bulk Question Generation
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              This will generate custom candidate-specific questions for <strong className="text-white">{selectedIds.length} candidates</strong> matching their codebases against this role's Job Description.
            </p>
            <div className="space-y-2 bg-[#0d1515] p-4 rounded-xl border border-[#3b494b]/60">
              <div className="flex justify-between text-xs">
                <span>Estimated Cost:</span>
                <span className="font-mono text-white">{selectedIds.length} Sessions</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Your Limit:</span>
                <span className="font-mono text-[#06B6D4]">
                  {user?.tokensTotal || 5} Sessions
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Used Sessions:</span>
                <span className="font-mono text-[#94A3B8]">
                  {user?.tokensUsed || 0} Sessions
                </span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setBulkConfirmOpen(false)}
                className="px-4 py-2 border border-[#3b494b] text-[#94A3B8] hover:text-white rounded-lg text-xs font-bold uppercase transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkGenerateQuestions}
                className="px-5 py-2 bg-[#06B6D4] text-[#0d1515] rounded-lg text-xs font-bold uppercase transition-all"
              >
                Confirm Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 space-y-6 text-[#F1F5F9] select-none">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[#3b494b]/40">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#06B6D4]">publish</span>
                Import Candidates to Position
              </h2>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Plan Warning info */}
            <div className="bg-[#06B6D4]/5 border border-[#06B6D4]/20 rounded-xl p-3 text-[10px] text-[#06B6D4] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm font-bold">verified_user</span>
              <span>
                {user?.plan === 'pro'
                  ? 'Pro Plan enabled: Maximum 10 candidates per batch.'
                  : 'Enterprise Plan enabled: Unlimited candidate imports per batch.'}
              </span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#3b494b]/60">
              <button
                onClick={() => setImportTab('csv')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  importTab === 'csv' ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#94A3B8] hover:text-white'
                }`}
              >
                CSV Import
              </button>
              <button
                onClick={() => setImportTab('resume')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  importTab === 'resume' ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#94A3B8] hover:text-white'
                }`}
              >
                Resume Parsing
              </button>
            </div>

            {/* TAB: CSV IMPORT */}
            {importTab === 'csv' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Upload CSV File</span>
                  <a
                    href="data:text/csv;charset=utf-8,name,email,github_url,notes%0ARachit%2Crachit%40gmail.com%2Chttps%3A%2F%2Fgithub.com%2FNikhilsingha01%2Fmovie_recommended_system%2CPython%20Developer"
                    download="candidate_template.csv"
                    className="text-[10px] text-[#06B6D4] hover:underline flex items-center gap-1 font-bold"
                  >
                    <span className="material-symbols-outlined text-[10px]">download_for_offline</span>
                    Download Template
                  </a>
                </div>

                {/* Dropzone */}
                <div className="w-full bg-[#0d1515] border-2 border-dashed border-[#3b494b] rounded-xl p-8 text-center hover:border-[#06B6D4] transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <span className="material-symbols-outlined text-3xl text-[#94A3B8] mb-2">upload_file</span>
                  <p className="text-xs text-white font-bold">{csvFile ? csvFile.name : 'Select or drag-and-drop CSV candidate list'}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Columns required: name, email, github_url</p>
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

                {/* Validation warnings */}
                {csvValidationErrors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-lg text-[10px] text-red-400 space-y-1">
                    <p className="font-bold uppercase tracking-wider">Validation Errors Found:</p>
                    {csvValidationErrors.map((err, errIdx) => (
                      <p key={errIdx}>· {err}</p>
                    ))}
                  </div>
                )}

                {/* Duplicate row warnings */}
                {csvDuplicates.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-lg text-[10px] text-amber-400 space-y-2">
                    <p className="font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm font-bold">warning</span>
                      Cross-Position Duplicate Candidates Found:
                    </p>
                    {csvDuplicates.map((dup, dIdx) => (
                      <div key={dIdx} className="flex justify-between items-center">
                        <span>
                          · <strong>{dup.candidateName}</strong> matches existing record in <strong>'{dup.positionTitle}'</strong> position.
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-white font-bold">
                          <input
                            type="checkbox"
                            checked={csvDuplicateConfirmations[dup.rowIdx] || false}
                            onChange={(e) => setCsvDuplicateConfirmations({
                              ...csvDuplicateConfirmations,
                              [dup.rowIdx]: e.target.checked
                            })}
                          />
                          Import anyway?
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview Table */}
                {csvPreview.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Preview Candidate Rows ({csvPreview.length})</span>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar border border-[#3b494b]/60 rounded-lg">
                      <table className="w-full text-[10px] text-left border-collapse">
                        <thead className="bg-[#0d1515] text-[#94A3B8] border-b border-[#3b494b]/60">
                          <tr>
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">GitHub</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3b494b]/20">
                          {csvPreview.map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td className="p-2 text-white font-bold">{row.name}</td>
                              <td className="p-2 font-mono">{row.email}</td>
                              <td className="p-2 font-mono text-[#06B6D4]">{row.github_url}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t border-[#3b494b]/40">
                  <button
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 border border-[#3b494b] text-[#94A3B8] hover:text-white rounded-lg text-xs font-bold uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportCSVSubmit}
                    disabled={csvPreview.length === 0}
                    className="px-5 py-2 bg-[#06B6D4] text-[#0d1515] rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    Import {csvPreview.length} Candidates
                  </button>
                </div>
              </div>
            )}

            {/* TAB: RESUME PARSING */}
            {importTab === 'resume' && (
              <div className="space-y-4">
                <span className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Upload Resumes</span>

                {/* Dropzone */}
                <div className="w-full bg-[#0d1515] border-2 border-dashed border-[#3b494b] rounded-xl p-8 text-center hover:border-[#06B6D4] transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    multiple
                    onChange={handleResumePDFUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <span className="material-symbols-outlined text-3xl text-[#94A3B8] mb-2">picture_as_pdf</span>
                  <p className="text-xs text-white font-bold">
                    {resumeFiles.length > 0 ? `${resumeFiles.length} resumes selected` : 'Select or drag-and-drop multiple PDF or DOCX resumes'}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Maximum 5MB per file. AI will parse values automatically.</p>
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

                {parsingResumes && (
                  <div className="flex items-center gap-2 text-xs text-[#06B6D4] py-2 animate-pulse justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#06B6D4]"></div>
                    <span>AI is reading and extracting resume contents...</span>
                  </div>
                )}

                {/* Duplicate resume warning */}
                {resumeDuplicates.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-lg text-[10px] text-amber-400 space-y-2">
                    <p className="font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm font-bold">warning</span>
                      Cross-Position Duplicate Resumes Found:
                    </p>
                    {resumeDuplicates.map((dup, dIdx) => (
                      <div key={dIdx} className="flex justify-between items-center">
                        <span>
                          · <strong>{dup.candidateName}</strong> matches existing record in <strong>'{dup.positionTitle}'</strong> position.
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-white font-bold">
                          <input
                            type="checkbox"
                            checked={resumeDuplicateConfirmations[dup.rowIdx] || false}
                            onChange={(e) => setResumeDuplicateConfirmations({
                              ...resumeDuplicateConfirmations,
                              [dup.rowIdx]: e.target.checked
                            })}
                          />
                          Import anyway?
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Previews & edit rows */}
                {parsedResumes.length > 0 && (
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar p-1">
                    {parsedResumes.map((cand, candIdx) => (
                      <div key={candIdx} className="bg-[#0d1515] p-4 rounded-xl border border-[#3b494b] space-y-3">
                        <div className="flex justify-between items-center border-b border-[#3b494b]/40 pb-2">
                          <span className="text-[10px] text-[#06B6D4] font-bold uppercase tracking-wider">Candidate #{candIdx + 1} Preview</span>
                          <button
                            onClick={() => setParsedResumes(parsedResumes.filter((_, idx) => idx !== candIdx))}
                            className="text-[#94A3B8] hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[9px] text-[#94A3B8] uppercase font-bold">Full Name</label>
                            <input
                              type="text"
                              value={cand.name}
                              onChange={(e) => {
                                const copy = [...parsedResumes];
                                copy[candIdx].name = e.target.value;
                                setParsedResumes(copy);
                              }}
                              className="w-full bg-[#151d1e] border border-[#3b494b] text-[11px] rounded p-1.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-[#94A3B8] uppercase font-bold">Email</label>
                            <input
                              type="email"
                              value={cand.email}
                              onChange={(e) => {
                                const copy = [...parsedResumes];
                                copy[candIdx].email = e.target.value;
                                setParsedResumes(copy);
                              }}
                              className="w-full bg-[#151d1e] border border-[#3b494b] text-[11px] rounded p-1.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-[#94A3B8] uppercase font-bold">
                              GitHub URL <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Required for analysis"
                              value={cand.github_url}
                              onChange={(e) => {
                                const copy = [...parsedResumes];
                                copy[candIdx].github_url = e.target.value;
                                setParsedResumes(copy);
                              }}
                              className="w-full bg-[#151d1e] border border-[#3b494b] text-[11px] rounded p-1.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] text-[#94A3B8] uppercase font-bold font-sans">Role Title</label>
                            <input
                              type="text"
                              value={cand.current_title}
                              onChange={(e) => {
                                const copy = [...parsedResumes];
                                copy[candIdx].current_title = e.target.value;
                                setParsedResumes(copy);
                              }}
                              className="w-full bg-[#151d1e] border border-[#3b494b] text-[11px] rounded p-1.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-[#94A3B8] uppercase font-bold font-sans">Experience</label>
                            <input
                              type="text"
                              value={cand.years_experience}
                              onChange={(e) => {
                                const copy = [...parsedResumes];
                                copy[candIdx].years_experience = e.target.value;
                                setParsedResumes(copy);
                              }}
                              className="w-full bg-[#151d1e] border border-[#3b494b] text-[11px] rounded p-1.5 focus:border-[#06B6D4] outline-none text-[#F1F5F9]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t border-[#3b494b]/40">
                  <button
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 border border-[#3b494b] text-[#94A3B8] hover:text-white rounded-lg text-xs font-bold uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveResumes}
                    disabled={parsedResumes.length === 0}
                    className="px-5 py-2 bg-[#06B6D4] text-[#0d1515] rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    Save All ({parsedResumes.length}) Candidates
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLAN UPGRADE MODAL */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-2xl w-full max-w-sm p-6 text-center text-[#F1F5F9] relative shadow-2xl animate-fade-in select-none">
            <button
              onClick={() => setUpgradeModalOpen(false)}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-white cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="w-12 h-12 rounded-full bg-[#06B6D4]/10 border border-[#06B6D4]/25 flex items-center justify-center mx-auto mb-4 text-[#06B6D4]">
              <span className="material-symbols-outlined text-2xl font-bold">lock</span>
            </div>
            <h3 className="text-base font-extrabold text-white">Bulk Import is a Pro Feature</h3>
            <p className="text-xs text-[#94A3B8] mt-2 mb-6 leading-relaxed">
              Import up to 10 candidates at once via CSV or resume upload, available on Pro and Enterprise plans.
            </p>
            <button
              onClick={() => {
                setUpgradeModalOpen(false);
                router.push('/pricing');
              }}
              className="w-full py-2.5 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 transition-all"
            >
              Upgrade to Pro
            </button>
            <button
              onClick={() => setUpgradeModalOpen(false)}
              className="block text-center text-[10px] text-[#94A3B8] hover:text-white uppercase tracking-wider font-bold mt-4 mx-auto"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* EXPORT SHORTLIST REPORT MODAL */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151d1e] border border-[#3b494b] rounded-2xl w-full max-w-md p-6 space-y-6 text-[#F1F5F9] select-none">
            <div className="flex justify-between items-center pb-4 border-b border-[#3b494b]/40">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#06B6D4]">download</span>
                Export Shortlist Report
              </h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-2">Export Format</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs cursor-pointer text-white font-bold">
                    <input
                      type="radio"
                      name="format"
                      checked={exportFormat === 'pdf'}
                      onChange={() => setExportFormat('pdf')}
                    />
                    PDF Report Document
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer text-white font-bold">
                    <input
                      type="radio"
                      name="format"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                    />
                    CSV Data List
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider block mb-2">Select Candidates ({exportSelection.length})</label>
                <div className="max-h-40 overflow-y-auto custom-scrollbar border border-[#3b494b]/60 rounded-lg p-2 space-y-2 bg-[#0d1515]">
                  {candidates.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={exportSelection.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExportSelection([...exportSelection, c.id]);
                          } else {
                            setExportSelection(exportSelection.filter(id => id !== c.id));
                          }
                        }}
                      />
                      <span className="truncate">{c.name} ({c.email})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-[#3b494b]/40">
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 border border-[#3b494b] text-[#94A3B8] hover:text-white rounded-lg text-xs font-bold uppercase transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleExportShortlistSubmit}
                className="px-5 py-2 bg-[#06B6D4] text-[#0d1515] rounded-lg text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all flex items-center gap-1 cursor-pointer"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
      {assignProjectModalOpen && (
        <AssignProjectModal
          isOpen={assignProjectModalOpen}
          onClose={() => {
            setAssignProjectModalOpen(false);
            setSelectedCandidateForProject(null);
          }}
          candidate={selectedCandidateForProject}
          positionId={positionId}
          onSuccess={fetchCandidates}
        />
      )}
    </div>
  );
}
