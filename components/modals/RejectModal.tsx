'use client';

import React, { useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateIds: string[];
  onRejectSuccess?: () => void;
}

export default function RejectModal({
  isOpen,
  onClose,
  candidateIds,
  onRejectSuccess
}: RejectModalProps) {
  const { user } = useGlobal();
  const [reason, setReason] = useState('Not a fit');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (candidateIds.length === 0) return;
    setLoading(true);

    try {
      // 1. Fetch details of all candidates to be rejected to update their notes field correctly
      const { data: candidates, error: fetchErr } = await supabase
        .from('candidates')
        .select('id, notes, email')
        .in('id', candidateIds);

      if (fetchErr || !candidates) {
        throw new Error(fetchErr?.message || 'Failed to fetch candidate details.');
      }

      // 2. Perform updates for each candidate (batch update with customized notes append)
      for (const cand of candidates) {
        const appendedNotes = `${cand.notes || ''}\n[Rejected: ${new Date().toLocaleDateString()}] Reason: ${reason}.${notes ? ` Notes: ${notes}` : ''}`;
        
        // Update candidates table
        const { error: updateErr } = await supabase
          .from('candidates')
          .update({
            status: 'rejected',
            notes: appendedNotes
          })
          .eq('id', cand.id);

        if (updateErr) throw updateErr;

        // Log 'candidate_rejected' event in candidate_events
        await supabase
          .from('candidate_events')
          .insert({
            candidate_id: cand.id,
            recruiter_id: user?.id,
            event_type: 'candidate_rejected',
            event_description: `Candidate rejected. Reason: ${reason}.${notes ? ` Details: ${notes}` : ''}`
          });
      }

      toast.success(`Successfully rejected ${candidateIds.length} candidate(s).`);
      if (onRejectSuccess) onRejectSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject candidates.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4">
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
          <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-400">person_remove</span>
            <span>Reject Candidates</span>
          </h3>
          <p className="text-xs text-[#94A3B8] mt-1">Move {candidateIds.length} candidate(s) to the Rejected stage.</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Rejection Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0d1515] border border-[#3b494b] px-3 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-[#06B6D4] cursor-pointer"
            >
              <option value="Not a fit">Not a fit</option>
              <option value="Overqualified">Overqualified</option>
              <option value="Position filled">Position filled</option>
              <option value="No response">No response</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-[#94A3B8] uppercase font-bold">Feedback / Notes (Optional)</label>
            <textarea
              placeholder="e.g. Skillset was not aligned with our current engineering needs..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#0d1515] border border-[#3b494b] p-3 rounded-lg text-xs text-white focus:outline-none focus:border-[#06B6D4] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#3b494b]/40 hover:bg-[#3b494b]/60 text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  <span>Rejecting...</span>
                </>
              ) : (
                <>
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
