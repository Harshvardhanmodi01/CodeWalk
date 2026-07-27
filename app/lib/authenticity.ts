import Groq from 'groq-sdk';
import { fetchGitHub } from './github';

export interface AuthenticityResult {
  score: number;
  flags: string[];
  signals: {
    commitCount: number;
    uniqueDays: number;
    spanHours: number;
    averageGapMinutes: number;
    genericMessageRatio: number;
    largestCommitRatio: number;
    aiProbability: number;
    aiVerdict: string;
    recentCommits: Array<{
      sha: string;
      message: string;
      date: string;
      additions: number;
      deletions: number;
    }>;
  };
}

/**
 * Pure function that calculates the repo authenticity score and generates flags
 * based on raw signals.
 */
export function calculateAuthenticityScore(
  commitCount: number,
  spanHours: number,
  uniqueDays: number,
  averageGapMinutes: number,
  genericMessageRatio: number,
  totalAdditions: number,
  largestCommitRatio: number,
  aiProbability: number,
  aiVerdict: string
): { score: number; flags: string[] } {
  const flags: string[] = [];

  // 1. Single Commit Case
  if (commitCount === 1) {
    return {
      score: 5,
      flags: ['Single commit found. Code was likely pushed all at once without incremental progression.']
    };
  }

  if (commitCount === 0) {
    return {
      score: 100,
      flags: ['No commit logs available for analysis.']
    };
  }

  let score = 100;

  // Signal A: Code Distribution / Bulk Ingestion (Max 35 points)
  if (totalAdditions > 500) {
    if (largestCommitRatio >= 0.85) {
      score -= 35;
      const pct = Math.round(largestCommitRatio * 100);
      flags.push(`Bulk code insertion: ${pct}% of code additions arrived in a single commit.`);
    } else if (largestCommitRatio >= 0.60) {
      score -= 15;
      const pct = Math.round(largestCommitRatio * 100);
      flags.push(`Uneven code distribution: ${pct}% of code arrived in one commit.`);
    }
  }

  // Signal B: Gaps and Speed (Max 15 points)
  if (commitCount >= 4) {
    if (spanHours < 2) {
      score -= 10;
      flags.push('Short development span: all commits made within a 2-hour window.');
    } else if (averageGapMinutes < 3) {
      score -= 5;
      flags.push('Extremely rapid commit rate: average gap between commits is under 3 minutes.');
    }
  }

  // Signal C: Commit Message Quality (Max 20 points)
  if (genericMessageRatio >= 0.40) {
    score -= 20;
    flags.push('Generic commit messages: 40%+ of commits have non-specific descriptions.');
  } else if (genericMessageRatio >= 0.20) {
    score -= 10;
    flags.push('Weak commit messaging: a significant portion of commits use generic messages.');
  }

  // Signal D: AI Code Detection (Max 30 points)
  if (aiProbability > 70) {
    score -= 30;
    flags.push('High probability of AI-assisted code generation.');
  } else if (aiProbability > 40) {
    score -= 15;
    flags.push('Potential AI-assisted formatting or code patterns detected.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, flags };
}

/**
 * Runs Repo Authenticity Check on the commit history and codebase structure.
 */
export async function runRepoAuthenticityCheck(
  owner: string,
  repo: string,
  githubToken?: string,
  combinedCodeSample?: string
): Promise<AuthenticityResult> {
  const token = githubToken || process.env.GITHUB_TOKEN;
  const groqKey = process.env.GROQ_API_KEY;

  let commitsList: any[] = [];
  try {
    const commitRes = await fetchGitHub(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
      token
    );
    if (commitRes.ok) {
      commitsList = await commitRes.json();
    }
  } catch (err: any) {
    console.warn('[authenticity] Failed to fetch commit logs:', err.message);
  }

  const commitCount = commitsList.length;

  // Defaults if no commits found or error occurred
  const defaultSignals = {
    commitCount: 0,
    uniqueDays: 0,
    spanHours: 0,
    averageGapMinutes: 0,
    genericMessageRatio: 0,
    largestCommitRatio: 0,
    aiProbability: 0,
    aiVerdict: 'Likely Human',
    recentCommits: []
  };

  if (commitCount === 0) {
    return {
      score: 100,
      flags: ['No commit logs available for analysis.'],
      signals: defaultSignals
    };
  }

  if (commitCount === 1) {
    const singleCommit = commitsList[0];
    const cDate = singleCommit.commit.author?.date || singleCommit.commit.committer?.date || new Date().toISOString();
    return {
      score: 5,
      flags: ['Single commit found. Code was likely pushed all at once without incremental progression.'],
      signals: {
        ...defaultSignals,
        commitCount: 1,
        uniqueDays: 1,
        recentCommits: [{
          sha: singleCommit.sha,
          message: singleCommit.commit.message || '',
          date: cDate,
          additions: 0,
          deletions: 0
        }]
      }
    };
  }

  // Fetch commit details for up to top 15 commits for distribution analysis
  const recentCommitsDetails: any[] = [];
  const limit = Math.min(commitCount, 15);
  for (let i = 0; i < limit; i++) {
    const c = commitsList[i];
    try {
      const detailRes = await fetchGitHub(
        `https://api.github.com/repos/${owner}/${repo}/commits/${c.sha}`,
        token
      );
      if (detailRes.ok) {
        const detail = await detailRes.json();
        recentCommitsDetails.push({
          sha: c.sha,
          message: c.commit.message || '',
          date: c.commit.author?.date || c.commit.committer?.date || '',
          additions: detail.stats?.additions || 0,
          deletions: detail.stats?.deletions || 0
        });
      } else {
        recentCommitsDetails.push({
          sha: c.sha,
          message: c.commit.message || '',
          date: c.commit.author?.date || c.commit.committer?.date || '',
          additions: 0,
          deletions: 0
        });
      }
    } catch {
      recentCommitsDetails.push({
        sha: c.sha,
        message: c.commit.message || '',
        date: c.commit.author?.date || c.commit.committer?.date || '',
        additions: 0,
        deletions: 0
      });
    }
  }

  // Parse commit dates
  const dates = commitsList.map((c: any) => new Date(c.commit.author?.date || c.commit.committer?.date).getTime());
  const latest = Math.max(...dates);
  const earliest = Math.min(...dates);
  const spanHours = (latest - earliest) / (1000 * 60 * 60);

  // Get unique calendar days
  const uniqueDays = new Set(
    commitsList.map((c: any) => new Date(c.commit.author?.date || c.commit.committer?.date).toISOString().split('T')[0])
  ).size;

  // Calculate gaps between sequential commits
  const sortedDates = [...dates].sort((a, b) => a - b);
  let totalGapsMs = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    totalGapsMs += sortedDates[i] - sortedDates[i - 1];
  }
  const averageGapMinutes = sortedDates.length > 1
    ? totalGapsMs / (sortedDates.length - 1) / (1000 * 60)
    : 0;

  // Check commit message quality
  const messages = commitsList.map((c: any) => c.commit.message || '');
  const genericTerms = ['wip', 'update', 'fix', 'commit', 'test', 'clean', 'done', 'changes', 'temp'];
  const badMessages = messages.filter((m: string) => {
    const lower = m.toLowerCase().trim();
    return lower.length < 5 || genericTerms.includes(lower) || /^(update|fix)\s+\w+$/i.test(lower);
  }).length;
  const genericMessageRatio = badMessages / commitCount;

  // Code distribution
  const totalAdditions = recentCommitsDetails.reduce((sum, item) => sum + item.additions, 0);
  const maxAdditions = recentCommitsDetails.length > 0
    ? Math.max(...recentCommitsDetails.map(c => c.additions))
    : 0;
  const largestCommitRatio = totalAdditions > 0 ? maxAdditions / totalAdditions : 0;

  // AI Plagiarism / Code Ingestion Scan (llama-3.3-70b-versatile)
  let aiProbability = 0;
  let aiVerdict = 'Likely Human';
  if (groqKey && combinedCodeSample && combinedCodeSample.trim().length > 100) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const systemPromptAI = `You are a code plagiarism and AI-generation detection specialist. Scan the given code sample from a repository. Look for signs of AI generation: unusually perfect comments on every single line, absolute consistency in formatting and conventions across files without any debug lines or TODOs, or overly generic structures. Return a valid JSON object with:
      - "ai_probability": integer between 0 and 100 (percentage probability of code being AI generated)
      - "verdict": string ("Likely Human", "Possibly AI Assisted", "Likely AI Generated")
      - "details": 1 sentence explanation.`;

      const userPromptAI = `Scan this code:
      ${combinedCodeSample.slice(0, 6000)}`;

      const completionAI = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPromptAI },
          { role: 'user', content: userPromptAI }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const resAI = completionAI.choices?.[0]?.message?.content;
      if (resAI) {
        const parsedAI = JSON.parse(resAI);
        aiProbability = parsedAI.ai_probability ?? 30;
        aiVerdict = parsedAI.verdict ?? 'Possibly AI Assisted';
      }
    } catch (err: any) {
      console.warn('[authenticity] Failed to run AI Code Detection scan:', err.message);
    }
  }

  // Invoke calculateAuthenticityScore
  const { score, flags } = calculateAuthenticityScore(
    commitCount,
    spanHours,
    uniqueDays,
    averageGapMinutes,
    genericMessageRatio,
    totalAdditions,
    largestCommitRatio,
    aiProbability,
    aiVerdict
  );

  return {
    score,
    flags,
    signals: {
      commitCount,
      uniqueDays,
      spanHours,
      averageGapMinutes,
      genericMessageRatio,
      largestCommitRatio,
      aiProbability,
      aiVerdict,
      recentCommits: recentCommitsDetails
    }
  };
}

/**
 * Fetches the commit history timeline for a specific file.
 * Returns a clean formatted string summary, or null if history is insufficient (<3 commits).
 */
export async function fetchFileCommitTimeline(
  owner: string,
  repo: string,
  filePath: string,
  token?: string
): Promise<string | null> {
  const tokenToUse = token || process.env.GITHUB_TOKEN;

  // 1. Fetch last 30 commits touching the file
  let commits: any[] = [];
  try {
    const res = await fetchGitHub(
      `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(filePath)}&per_page=30`,
      tokenToUse
    );
    if (res.ok) {
      commits = await res.json();
    }
  } catch (err: any) {
    console.warn(`[timeline] Failed to fetch commits for ${filePath}:`, err.message);
  }

  if (commits.length < 3) {
    console.log(`[timeline] Skip evolution for ${filePath}: only ${commits.length} commits found`);
    return null;
  }

  // 2. Select 3-5 most significant commits:
  // - Latest (index 0)
  // - Oldest (last index)
  // - Up to 3 intermediate commits
  const indices = new Set<number>();
  indices.add(0);
  indices.add(commits.length - 1);

  if (commits.length > 2) {
    const step = (commits.length - 1) / 4;
    for (let i = 1; i <= 3; i++) {
      const idx = Math.round(step * i);
      if (idx > 0 && idx < commits.length - 1) {
        indices.add(idx);
      }
    }
  }

  const selectedIndices = Array.from(indices).sort((a, b) => a - b);
  const timelineEntries: Array<{ date: string; sha: string; message: string; additions: number; deletions: number }> = [];

  // 3. Fetch detailed commit stats sequentially with a small delay (Option A: Rate limit strategy)
  for (const idx of selectedIndices) {
    const c = commits[idx];
    try {
      // Small sleep delay (200ms) to prevent secondary rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));

      const detailRes = await fetchGitHub(
        `https://api.github.com/repos/${owner}/${repo}/commits/${c.sha}`,
        tokenToUse
      );
      if (detailRes.ok) {
        const detail = await detailRes.json();
        const fileDetail = detail.files?.find((f: any) => f.filename === filePath);
        timelineEntries.push({
          date: c.commit.author?.date || c.commit.committer?.date || '',
          sha: c.sha,
          message: c.commit.message || '',
          additions: fileDetail?.additions || 0,
          deletions: fileDetail?.deletions || 0
        });
      }
    } catch (err: any) {
      console.warn(`[timeline] Detailed fetch failed for SHA ${c.sha}:`, err.message);
    }
  }

  if (timelineEntries.length < 2) {
    return null;
  }

  const sortedEntries = timelineEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let output = `File History Evolution (total commits touching file: ${commits.length}):\n`;
  for (const entry of sortedEntries) {
    const dateStr = new Date(entry.date).toISOString().split('T')[0];
    const cleanMsg = entry.message.split('\n')[0].slice(0, 80);
    output += `- Date: ${dateStr} | Commit: ${entry.sha.slice(0, 7)} | Changes: +${entry.additions} -${entry.deletions} lines\n  Message: "${cleanMsg}"\n`;
  }

  return output;
}
