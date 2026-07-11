'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface SubmissionClientFormProps {
  projectId: string;
  deadline: string;
  recruiterEmail: string;
  companyName: string;
  isExpired: boolean;
  initialStatus: string;
}

export default function SubmissionClientForm({
  projectId,
  deadline,
  recruiterEmail,
  companyName,
  isExpired: initialExpired,
  initialStatus
}: SubmissionClientFormProps) {
  const [githubUrl, setGithubUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  
  // Timer States
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: initialExpired
  });

  // Countdown logic
  useEffect(() => {
    if (status === 'submitted' || status === 'evaluated' || timeLeft.expired) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(prev => ({ ...prev, expired: true }));
        clearInterval(timer);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, expired: false });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, status, timeLeft.expired]);

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) {
      toast.error('GitHub Repository URL is required.');
      return;
    }

    // Github URL validation regex
    const githubRegex = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/?#]+)/i;
    if (!githubRegex.test(githubUrl.trim())) {
      toast.error('Invalid GitHub URL. Format must match: https://github.com/owner/repo');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/take-home/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          githubUrl: githubUrl.trim(),
          notes: notes.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit project.');
      }

      toast.success('Project submitted successfully! Recruiter has been notified.');
      setStatus('submitted');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Submission failed. Please check repository public accessibility.');
    } finally {
      setLoading(false);
    }
  };

  // If already submitted
  if (status === 'submitted' || status === 'evaluated') {
    return (
      <div className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-2xl shadow-md text-center space-y-4">
        <span className="material-symbols-outlined text-[#06B6D4] text-5xl select-none animate-bounce">check_circle</span>
        <h3 className="text-base font-bold text-white uppercase tracking-wider">Submission Completed</h3>
        <p className="text-xs text-[#b9cacb] leading-relaxed">
          Your take-home project repository has been successfully submitted to <strong>{companyName}</strong>. 
        </p>
        <p className="text-[10px] text-[#94A3B8] leading-relaxed bg-[#0d1515] p-3 border border-[#3b494b]/60 rounded-lg">
          Our Auto-Analysis engine is now scanning the codebase, features implemented, and commit logs. The recruiter will review your project and get in touch with next steps.
        </p>
      </div>
    );
  }

  // If expired
  if (timeLeft.expired) {
    return (
      <div className="bg-[#151d1e] border border-red-500/20 p-6 rounded-2xl shadow-md text-center space-y-4">
        <span className="material-symbols-outlined text-red-400 text-5xl select-none">hourglass_empty</span>
        <h3 className="text-base font-bold text-white uppercase tracking-wider">Deadline Has Passed</h3>
        <p className="text-xs text-[#b9cacb] leading-relaxed">
          The submission deadline for this take-home project assignment has expired. 
        </p>
        {recruiterEmail && (
          <div className="p-3.5 bg-[#0d1515] border border-red-500/10 rounded-lg">
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Contact Recruiter</p>
            <a href={`mailto:${recruiterEmail}`} className="text-xs font-bold text-[#06B6D4] hover:underline mt-1 block">
              {recruiterEmail}
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Countdown Card */}
      <div className="bg-[#151d1e] border border-[#3b494b] p-5 rounded-2xl shadow-md space-y-3">
        <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">alarm</span>
          <span>Time Remaining</span>
        </h4>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-[#0d1515] border border-[#3b494b]/60 p-2.5 rounded-lg">
            <span className="text-lg font-bold text-white font-mono">{timeLeft.days}</span>
            <span className="text-[8px] text-[#94A3B8] uppercase tracking-wide block mt-0.5">Days</span>
          </div>
          <div className="bg-[#0d1515] border border-[#3b494b]/60 p-2.5 rounded-lg">
            <span className="text-lg font-bold text-white font-mono">{timeLeft.hours}</span>
            <span className="text-[8px] text-[#94A3B8] uppercase tracking-wide block mt-0.5">Hours</span>
          </div>
          <div className="bg-[#0d1515] border border-[#3b494b]/60 p-2.5 rounded-lg">
            <span className="text-lg font-bold text-white font-mono">{timeLeft.minutes}</span>
            <span className="text-[8px] text-[#94A3B8] uppercase tracking-wide block mt-0.5">Mins</span>
          </div>
          <div className="bg-[#0d1515] border border-[#3b494b]/60 p-2.5 rounded-lg">
            <span className="text-lg font-bold text-white font-mono">{timeLeft.seconds}</span>
            <span className="text-[8px] text-[#94A3B8] uppercase tracking-wide block mt-0.5">Secs</span>
          </div>
        </div>
        <p className="text-[9px] text-[#94A3B8] text-center mt-1">Due: {new Date(deadline).toLocaleString()}</p>
      </div>

      {/* Submission Form Card */}
      <form onSubmit={handleSubmit} className="bg-[#151d1e] border border-[#3b494b] p-6 rounded-2xl shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-[#3b494b]/60 pb-2">Submit Work</h3>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">GitHub Repository URL</label>
          <input
            required
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/username/repo"
            className="w-full bg-[#0d1515] border border-[#3b494b] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors text-xs font-mono text-white"
          />
          <p className="text-[9px] text-[#94A3B8]">The repository must be <strong>public</strong> so our analysis engine can read the codebase and commit history.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Submission Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain architectural decisions, instructions to run locally, or any other notes for the reviewer..."
            rows={5}
            className="w-full bg-[#0d1515] border border-[#3b494b] p-4 rounded-lg focus:outline-none focus:border-[#06B6D4] transition-colors text-xs text-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold uppercase rounded-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 select-none cursor-pointer"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
              <span>Validating Repository...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">cloud_upload</span>
              <span>Submit Project</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
