'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function FloatingBatchProgress() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    completed: number;
    failed: number;
    total: number;
    status: string;
    positionTitle?: string;
  } | null>(null);

  useEffect(() => {
    // Check local storage for active job ID
    const checkJob = () => {
      const savedJobId = localStorage.getItem('cw_active_batch_job_id');
      if (savedJobId !== activeJobId) {
        setActiveJobId(savedJobId);
      }
    };

    checkJob();
    const interval = setInterval(checkJob, 2000);
    return () => clearInterval(interval);
  }, [activeJobId]);

  useEffect(() => {
    if (!activeJobId) {
      setProgress(null);
      return;
    }

    const fetchProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('batch_jobs')
          .select('status, completed_count, failed_count, total_count, positions(title)')
          .eq('id', activeJobId)
          .single();

        if (error) throw error;

        if (data) {
          setProgress({
            completed: data.completed_count || 0,
            failed: data.failed_count || 0,
            total: data.total_count || 0,
            status: data.status,
            positionTitle: (data as any).positions?.title
          });

          if (data.status === 'completed' || data.status === 'failed') {
            toast.success(`Question generation complete! ${data.completed_count} succeeded, ${data.failed_count} failed.`);
            setActiveJobId(null);
            localStorage.removeItem('cw_active_batch_job_id');
            setProgress(null);
            // Reload page to refresh candidate list if they are on positions detail page
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch batch job progress:', err);
      }
    };

    fetchProgress();
    const progressInterval = setInterval(fetchProgress, 3000);
    return () => clearInterval(progressInterval);
  }, [activeJobId]);

  if (!progress || progress.status === 'completed' || progress.status === 'failed') {
    return null;
  }

  const processed = progress.completed + progress.failed;
  const percentage = progress.total > 0 ? Math.round((processed / progress.total) * 100) : 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#151d1e] border border-[#06B6D4] p-4 rounded-xl shadow-2xl w-80 space-y-3 animate-fade-in select-none">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#06B6D4]"></div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">Generating Questions</span>
        </div>
        <span className="text-[10px] text-[#06B6D4] font-mono font-bold">{percentage}%</span>
      </div>

      <div>
        <p className="text-[10px] text-[#94A3B8] truncate">
          Position: <strong className="text-white">{progress.positionTitle || 'Role'}</strong>
        </p>
        <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">
          {processed} of {progress.total} candidates processed
        </p>
      </div>

      <div className="w-full bg-[#0d1515] h-1.5 rounded-full overflow-hidden">
        <div
          style={{ width: `${percentage}%` }}
          className="bg-[#06B6D4] h-full rounded-full transition-all duration-300"
        ></div>
      </div>
    </div>
  );
}
