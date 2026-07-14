/**
 * BullMQ Queue producer (Vercel / Next.js side).
 *
 * The Railway worker consumes from this same 'code-analysis' queue.
 * This module is only ever imported in Node.js API routes (runtime = 'nodejs').
 */
import { Queue, type JobsOptions } from 'bullmq';

let _queue: Queue | null = null;

/**
 * Returns a singleton BullMQ Queue instance connected via REDIS_URL.
 * Lazy-initialised on first call so it doesn't attempt to connect at module-load time.
 */
export function getAnalysisQueue(): Queue {
  if (!_queue) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error(
        '[queue] REDIS_URL environment variable is not set. ' +
        'Add it to your Vercel environment variables.'
      );
    }
    _queue = new Queue('code-analysis', {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return _queue;
}

/** Enqueue a repo-analysis job. Returns the BullMQ Job object. */
export async function enqueueAnalysis(
  payload: { repoUrl: string; jobId: string; sessionId?: string | null },
  opts?: JobsOptions
) {
  const queue = getAnalysisQueue();
  return queue.add('analyze', payload, {
    jobId: payload.jobId, // Use Supabase UUID as BullMQ job id for deduplication
    ...opts,
  });
}
