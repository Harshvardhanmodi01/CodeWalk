'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Job {
  id: string;
  repo_url: string;
  status: string;
  created_at: string;
  result?: any;
}

interface Quota {
  plan: string;
  used: number;
  limit: number;
  remaining: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/auth/login');
      } else {
        setUser(session.user);
        fetchDashboardData();
      }
    });
  }, []);

  async function fetchDashboardData() {
    try {
      // 1. Fetch quota from API
      const quotaRes = await fetch('/api/user/quota');
      if (quotaRes.ok) {
        const quotaData = await quotaRes.json();
        setQuota(quotaData);
      }

      // 2. Fetch user's jobs (past analyses)
      const supabaseClient = supabase;
      const { data, error } = await supabaseClient
        .from('jobs')
        .select('id, repo_url, status, created_at, result')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setJobs(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpgrade = () => {
    // TODO: Integrate Razorpay checkout
    alert('Upgrade to Pro – payment integration coming soon');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading dashboard...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Welcome back, {user.email}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold transition"
            >
              New Analysis →
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/auth/login');
              }}
              className="px-4 py-2 bg-red-600/70 hover:bg-red-600 rounded-lg text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Quota & Plan Card */}
        {quota && (
          <div className="bg-[#0f1424] border border-[#1f2937] rounded-2xl p-6 mb-8">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-sm text-gray-400">Current Plan</p>
                <p className="text-2xl font-bold capitalize">
                  {quota.plan === 'pro' ? '✅ Pro' : '🔓 Free'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {quota.remaining} of {quota.limit} analyses remaining this month
                </p>
              </div>
              {quota.plan !== 'pro' && (
                <button
                  onClick={handleUpgrade}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg font-semibold shadow-lg hover:scale-105 transition"
                >
                  Upgrade to Pro → 
                </button>
              )}
            </div>
            {/* Progress bar */}
            <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${(quota.used / quota.limit) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Past Analyses Table */}
        <div className="bg-[#0f1424] border border-[#1f2937] rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#1f2937]">
            <h2 className="text-xl font-semibold">Analysis History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0a0f1e] text-gray-400">
                <tr>
                  <th className="text-left p-3">Repository</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      No analyses yet. <Link href="/" className="text-purple-400 underline">Start now</Link>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-t border-[#1f2937] hover:bg-[#1a1f2e]">
                      <td className="p-3 font-mono text-xs truncate max-w-md">
                        {job.repo_url}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.status === 'completed'
                              ? 'bg-green-500/20 text-green-300'
                              : job.status === 'failed'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400">
                        {new Date(job.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {job.status === 'completed' && job.result ? (
                          <Link
                            href={`/?resume=${job.id}`} // optional: pass job ID to main page
                            className="text-purple-400 hover:underline"
                          >
                            View Report
                          </Link>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}