import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/job-status?jobId=xxx
 *
 * Returns the current status of an analysis job.
 * Jobs are written into the module-level Map by the analyze route
 * (or by the client via POST /api/job-status for mock flows).
 *
 * Response shape:
 *   { status: 'pending' | 'completed' | 'failed', jobId: string }
 */

// In-memory job store (shared across requests in the same server process).
// For production you'd use Redis/DB; for this frontend demo it works fine.
export const jobStore = new Map<
  string,
  { status: 'pending' | 'completed' | 'failed'; createdAt: number }
>();

// Automatically clean up jobs older than 30 minutes
function pruneOldJobs() {
  const now = Date.now();
  for (const [id, job] of jobStore.entries()) {
    if (now - job.createdAt > 30 * 60 * 1000) {
      jobStore.delete(id);
    }
  }
}

export async function GET(request: NextRequest) {
  pruneOldJobs();

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { error: 'Missing jobId query parameter' },
      { status: 400 }
    );
  }

  const job = jobStore.get(jobId);

  if (!job) {
    // Unknown job — treat as pending so the UI keeps polling briefly
    return NextResponse.json({ status: 'pending', jobId });
  }

  return NextResponse.json({ status: job.status, jobId });
}

/**
 * POST /api/job-status
 * Body: { jobId: string; status: 'pending' | 'completed' | 'failed' }
 *
 * Allows the client (or analyze route) to register / update a job's status.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, status } = body ?? {};

    if (!jobId || !['pending', 'completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'jobId and valid status required' },
        { status: 400 }
      );
    }

    jobStore.set(jobId as string, {
      status: status as 'pending' | 'completed' | 'failed',
      createdAt: Date.now(),
    });

    return NextResponse.json({ ok: true, jobId, status });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
