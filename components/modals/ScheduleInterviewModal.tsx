'use client';

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  onScheduleSuccess?: () => void;
}

export default function ScheduleInterviewModal({
  isOpen,
  onClose,
  candidateId,
  candidateName,
  candidateEmail,
  onScheduleSuccess
}: ScheduleInterviewModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  if (!isOpen) return null;

  // Get today's date formatted as YYYY-MM-DD for min date picker restriction
  const todayDateString = new Date().toISOString().split('T')[0];

  const handleSchedule = async (justGenerate: boolean) => {
    if (!date || !time) {
      toast.error('Please select both a date and a time for the interview.');
      return;
    }

    setLoading(true);
    try {
      // Combine date and time to ISO String
      const dateTime = new Date(`${date}T${time}`).toISOString();

      const response = await fetch('/api/send-interview-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId,
          dateTime,
          duration,
          notes,
          justGenerate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule interview');
      }

      if (justGenerate || data.emailSent === false) {
        setGeneratedLink(data.sessionUrl);
        if (data.warning) {
          toast(data.warning, { icon: '⚠️', duration: 6000 });
        } else {
          toast.success('Interview link generated successfully!');
        }
      } else {
        toast.success(`Interview scheduled! Invite sent to ${candidateEmail}`);
        if (onScheduleSuccess) onScheduleSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while scheduling.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4">
      {/* Modal Card */}
      <div className="bg-[#151d1e] border border-[#3b494b] w-full max-w-md rounded-xl p-6 shadow-2xl relative space-y-6">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        {/* Title */}
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#06B6D4]">calendar_today</span>
            <span>Schedule Interview</span>
          </h3>
          <p className="text-xs text-[#94A3B8] mt-1">Set up a codebase-focused coding assessment session.</p>
        </div>

        {/* Generated Link Display Mode */}
        {generatedLink ? (
          <div className="space-y-4 py-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg text-center">
              <span className="material-symbols-outlined text-emerald-400 text-3xl mb-1">check_circle</span>
              <p className="text-xs font-bold text-white">Interview Session Created!</p>
              <p className="text-[10px] text-[#94A3B8] mt-1">No email has been sent. You can share this link directly with the candidate.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-[#06B6D4] font-bold uppercase tracking-wider block">Candidate Join Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-[#0d1515] border border-[#3b494b] px-3 py-2.5 rounded-lg text-xs font-mono text-white select-all outline-none"
                />
                <button
                  onClick={handleCopyToClipboard}
                  className="px-4 py-2.5 bg-[#06B6D4] hover:brightness-110 text-[#0d1515] text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                if (onScheduleSuccess) onScheduleSuccess();
                onClose();
              }}
              className="w-full py-2.5 bg-[#3b494b]/40 hover:bg-[#3b494b]/60 text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer text-center"
            >
              Done
            </button>
          </div>
        ) : (
          /* Input Fields Form */
          <div className="space-y-4">
            {/* Candidate Info (Read Only) */}
            <div className="grid grid-cols-2 gap-4 bg-[#0d1515]/40 border border-[#3b494b] p-3 rounded-lg text-xs">
              <div>
                <span className="text-[10px] text-[#94A3B8] uppercase font-bold block">Candidate</span>
                <span className="text-white font-bold block truncate mt-0.5">{candidateName}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#94A3B8] uppercase font-bold block">Email</span>
                <span className="text-[#94A3B8] block truncate mt-0.5">{candidateEmail}</span>
              </div>
            </div>

            {/* Date and Time Pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Interview Date</label>
                <input
                  type="date"
                  min={todayDateString}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-[#06B6D4] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Start Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-[#06B6D4] cursor-pointer"
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-[#06B6D4] cursor-pointer"
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </div>

            {/* Internal Notes */}
            <div className="space-y-1">
              <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Interviewer Notes (Internal)</label>
              <textarea
                placeholder="e.g. Focus on React Hooks performance questions during review..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-[#0d1515] border border-[#3b494b] p-3 rounded-lg text-xs text-white focus:outline-none focus:border-[#06B6D4] resize-none"
              />
            </div>

            {/* Actions Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleSchedule(false)}
                disabled={loading}
                className="w-full py-2.5 bg-[#06B6D4] hover:brightness-110 text-[#0d1515] text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    <span>Scheduling...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">mail</span>
                    <span>Schedule and Send Link</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleSchedule(true)}
                disabled={loading}
                className="w-full py-2.5 border border-[#3b494b] hover:bg-[#3b494b]/30 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Just Generate Link</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
