import { describe, it, expect, vi } from 'vitest';
import { calculateAuthenticityScore, fetchFileCommitTimeline } from '../app/lib/authenticity';
import { fetchGitHub } from '../app/lib/github';

// Mock the github module
vi.mock('../app/lib/github', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    fetchGitHub: vi.fn(),
  };
});

describe('calculateAuthenticityScore()', () => {
  it('returns score 100 for normal incremental developer', () => {
    const result = calculateAuthenticityScore(
      25,      // commitCount
      120.0,   // spanHours
      5,       // uniqueDays
      45.0,    // averageGapMinutes
      0.05,    // genericMessageRatio
      2500,    // totalAdditions
      0.20,    // largestCommitRatio
      10,      // aiProbability
      'Likely Human'
    );
    expect(result.score).toBe(100);
    expect(result.flags).toHaveLength(0);
  });

  it('returns score 5 for single commit history', () => {
    const result = calculateAuthenticityScore(
      1,       // commitCount
      0.0,     // spanHours
      1,       // uniqueDays
      0.0,     // averageGapMinutes
      0.0,     // genericMessageRatio
      1500,    // totalAdditions
      1.0,     // largestCommitRatio
      15,      // aiProbability
      'Likely Human'
    );
    expect(result.score).toBe(5);
    expect(result.flags[0]).toContain('Single commit found');
  });

  it('detects bulk push ratios', () => {
    const result = calculateAuthenticityScore(
      10,      // commitCount
      48.0,    // spanHours
      2,       // uniqueDays
      30.0,    // averageGapMinutes
      0.10,    // genericMessageRatio
      3000,    // totalAdditions
      0.95,    // largestCommitRatio
      10,      // aiProbability
      'Likely Human'
    );
    expect(result.score).toBe(65); // 100 - 35
    expect(result.flags[0]).toContain('Bulk code insertion');
  });

  it('detects high-density fast commit speed clustering', () => {
    const result = calculateAuthenticityScore(
      8,       // commitCount
      0.5,     // spanHours
      1,       // uniqueDays
      1.5,     // averageGapMinutes
      0.10,    // genericMessageRatio
      100,     // totalAdditions
      0.25,    // largestCommitRatio
      15,      // aiProbability
      'Likely Human'
    );
    expect(result.score).toBe(90); // 100 - 10 (short span)
    expect(result.flags[0]).toContain('Short development span');
  });

  it('detects generic message ratios', () => {
    const result = calculateAuthenticityScore(
      12,      // commitCount
      72.0,    // spanHours
      3,       // uniqueDays
      60.0,    // averageGapMinutes
      0.50,    // genericMessageRatio
      100,     // totalAdditions
      0.20,    // largestCommitRatio
      10,      // aiProbability
      'Likely Human'
    );
    expect(result.score).toBe(80); // 100 - 20
    expect(result.flags[0]).toContain('Generic commit messages');
  });

  it('detects AI generation scan flags', () => {
    const result = calculateAuthenticityScore(
      15,      // commitCount
      96.0,    // spanHours
      4,       // uniqueDays
      50.0,    // averageGapMinutes
      0.05,    // genericMessageRatio
      800,     // totalAdditions
      0.15,    // largestCommitRatio
      85,      // aiProbability
      'Likely AI Generated'
    );
    expect(result.score).toBe(70); // 100 - 30
    expect(result.flags[0]).toContain('High probability of AI-assisted code generation');
  });
});

describe('fetchFileCommitTimeline()', () => {
  it('returns null if file has less than 3 commits', async () => {
    const mockCommits = [
      { sha: 'sha1', commit: { message: 'first', author: { date: '2026-07-22T08:00:00Z' } } },
      { sha: 'sha2', commit: { message: 'second', author: { date: '2026-07-22T09:00:00Z' } } },
    ];
    vi.mocked(fetchGitHub).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCommits,
    } as any);

    const result = await fetchFileCommitTimeline('owner', 'repo', 'src/file.ts');
    expect(result).toBeNull();
  });

  it('builds a structured timeline for files with 3+ commits', async () => {
    const mockCommits = [
      { sha: 'sha3', commit: { message: 'third change', author: { date: '2026-07-22T10:00:00Z' } } },
      { sha: 'sha2', commit: { message: 'second change', author: { date: '2026-07-22T09:00:00Z' } } },
      { sha: 'sha1', commit: { message: 'first introduced', author: { date: '2026-07-22T08:00:00Z' } } },
    ];

    // First call: list commits
    vi.mocked(fetchGitHub).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCommits,
    } as any);

    // Detail calls for each selected commit (for 3 commits, indices 0, 1, 2)
    vi.mocked(fetchGitHub)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ filename: 'src/file.ts', additions: 15, deletions: 2 }],
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ filename: 'src/file.ts', additions: 10, deletions: 5 }],
        }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ filename: 'src/file.ts', additions: 100, deletions: 0 }],
        }),
      } as any);

    const result = await fetchFileCommitTimeline('owner', 'repo', 'src/file.ts');
    expect(result).not.toBeNull();
    expect(result).toContain('File History Evolution');
    expect(result).toContain('Commit: sha1');
    expect(result).toContain('first introduced');
    expect(result).toContain('+100 -0 lines');
    expect(result).toContain('third change');
    expect(result).toContain('+15 -2 lines');
  });
});
