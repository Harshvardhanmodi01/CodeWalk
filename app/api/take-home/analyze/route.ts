import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { extractRepoInfo, fetchGitHub, fetchRepoContents, fetchFileContent, isCodeFile, getReadme } from '@/app/lib/github';
import Groq from 'groq-sdk';
import { Resend } from 'resend';

// Helper to collect code files recursively up to a limit
async function collectTopCodeFiles(
  owner: string,
  repo: string,
  branch?: string,
  token?: string
): Promise<Array<{ name: string; path: string; download_url: string | null }>> {
  try {
    const root = await fetchRepoContents(owner, repo, '', branch, token);
    const collected: Array<{ name: string; path: string; download_url: string | null }> = [];

    // Filter files in root
    for (const item of root) {
      if (item.type === 'file' && isCodeFile(item.name)) {
        collected.push(item);
      } else if (item.type === 'dir') {
        const skip = ['node_modules', 'dist', 'build', '.next', 'vendor', '__pycache__', '.git', 'public', 'static', '.github'];
        if (skip.includes(item.name)) continue;
        try {
          const sub = await fetchRepoContents(owner, repo, item.path, branch, token);
          for (const s of sub) {
            if (s.type === 'file' && isCodeFile(s.name)) {
              collected.push(s);
            }
          }
        } catch {
          // ignore subdirectory errors
        }
      }
    }
    // Limit to top 5 files to avoid hitting token limits
    return collected.slice(0, 5);
  } catch (err) {
    console.error('Failed to collect code files:', err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    // 1. Fetch take-home project details
    const { data: project, error: projErr } = await supabaseAdmin
      .from('take_home_projects')
      .select(`
        *,
        profiles:recruiter_id (
          email,
          company_name,
          name
        ),
        candidates:candidate_id (
          name,
          email
        )
      `)
      .eq('id', projectId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { submission_repo_url, project_brief } = project;
    if (!submission_repo_url) {
      return NextResponse.json({ error: 'No submission repository linked to this project' }, { status: 400 });
    }

    let owner = '', repo = '';
    try {
      const info = extractRepoInfo(submission_repo_url);
      owner = info.owner;
      repo = info.repo;
    } catch {
      return NextResponse.json({ error: 'Invalid submission repository URL' }, { status: 400 });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 });
    }
    const groq = new Groq({ apiKey: groqKey });

    console.log(`[analyze] Starting analysis for project ${projectId} (${owner}/${repo})...`);

    // ==================== PART A: COMMIT HISTORY ANALYSIS ====================
    let commitHistoryScore = 5;
    let commitFeedback = 'Decent development activity.';

    try {
      const commitRes = await fetchGitHub(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
        githubToken
      );

      if (commitRes.ok) {
        const commits = await commitRes.json();
        const commitCount = commits.length;

        if (commitCount === 0) {
          commitHistoryScore = 0;
          commitFeedback = 'No commits found in the repository.';
        } else if (commitCount === 1) {
          commitHistoryScore = 0;
          commitFeedback = 'Single commit found. Code was likely pushed all at once without incremental progression.';
        } else {
          // Parse commit dates
          const dates = commits.map((c: any) => new Date(c.commit.author?.date || c.commit.committer?.date).getTime());
          const latest = Math.max(...dates);
          const earliest = Math.min(...dates);
          const spanHours = (latest - earliest) / (1000 * 60 * 60);

          // Get unique calendar days
          const uniqueDays = new Set(
            commits.map((c: any) => new Date(c.commit.author?.date || c.commit.committer?.date).toISOString().split('T')[0])
          ).size;

          // Check message quality
          const messages = commits.map((c: any) => c.commit.message || '');
          const badMessages = messages.filter((m: string) => {
            const lower = m.toLowerCase().trim();
            return lower.length < 5 || ['wip', 'update', 'fix', 'commit', 'test', 'clean'].includes(lower);
          }).length;
          const badMessageRatio = badMessages / commitCount;

          if (uniqueDays >= 3 && commitCount >= 10 && badMessageRatio < 0.25) {
            commitHistoryScore = 10;
            commitFeedback = `Excellent development practices! Commits are spread over ${uniqueDays} days with ${commitCount} total commits and descriptive commit messages.`;
          } else if (spanHours > 3 && commitCount >= 4) {
            commitHistoryScore = 5;
            commitFeedback = `Some spread in development (${commitCount} commits over ${uniqueDays} days). Commit messages show decent descriptive detail.`;
          } else {
            commitHistoryScore = 2;
            commitFeedback = 'Most commits were pushed in a short window of time (less than 3 hours). Suggests last-minute work or crammed development.';
          }
        }
      }
    } catch (err: any) {
      console.warn('[analyze] Failed to analyze commit history:', err.message);
      commitFeedback = 'Failed to fetch commit logs from GitHub API.';
    }

    // ==================== FETCH CODEBASE & README CONTENT ====================
    let readmeContent = '';
    let combinedCode = '';
    const collectedFiles = await collectTopCodeFiles(owner, repo, undefined, githubToken);

    try {
      const readme = await getReadme(owner, repo, undefined, githubToken);
      readmeContent = readme || '';
    } catch (err) {
      console.warn('[analyze] Failed to fetch README:', err);
    }

    for (const file of collectedFiles) {
      if (file.download_url) {
        try {
          const content = await fetchFileContent(file.download_url, githubToken);
          // Append with separator
          combinedCode += `\n\n--- File: ${file.path} ---\n${content.slice(0, 1000)}`; // Get first 1000 chars per file to stay within tokens
        } catch {
          // ignore file fetch failures
        }
      }
    }

    // ==================== PART B: CODE QUALITY ANALYSIS ====================
    let codeQualityScore = 70;
    let codeQualityFeedback = 'Average code structure and quality.';

    try {
      const systemPromptQuality = `You are an expert static code analysis assistant. Analyze the given code repository content for software engineering best practices. Return a valid JSON object with the fields "score" (integer between 0 and 100) and "feedback" (2-3 sentences summarizing structural, naming, error handling, DRY, and security feedback).`;
      
      const userPromptQuality = `Analyze this code from repository ${owner}/${repo}:
      ${combinedCode.slice(0, 6000)}
      
      Evaluate based on:
      1. Naming conventions
      2. Code organization & structure
      3. Error handling
      4. DRY principles & refactoring
      5. Basic security practices`;

      const completionQuality = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPromptQuality },
          { role: 'user', content: userPromptQuality }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const resQuality = completionQuality.choices?.[0]?.message?.content;
      if (resQuality) {
        const parsedQuality = JSON.parse(resQuality);
        codeQualityScore = parsedQuality.score ?? 70;
        codeQualityFeedback = parsedQuality.feedback ?? codeQualityFeedback;
      }
    } catch (err: any) {
      console.warn('[analyze] Failed to analyze code quality:', err.message);
    }

    // ==================== PART C: FEATURE COMPLETION CHECK ====================
    let featureCompletionScore = 50;
    let featureFeedback = 'Completed some of the requirements.';
    let parsedBrief: any = {};
    try {
      parsedBrief = typeof project_brief === 'string' ? JSON.parse(project_brief) : project_brief || {};
    } catch {
      parsedBrief = {};
    }
    const coreReqs = parsedBrief.core_requirements || [];

    try {
      const systemPromptFeature = `You are a technical reviewer checking project requirements. Given the requirements list and the code files/README, evaluate which requirements are met. Return a valid JSON object containing:
      - "implemented_count": number of fully implemented requirements
      - "partial_count": number of partially implemented requirements
      - "missing_count": number of missing/unimplemented requirements
      - "feedback": 2 sentences summary of requirement compliance.`;

      const userPromptFeature = `
      Core Requirements to check:
      ${coreReqs.map((r: string, idx: number) => `${idx + 1}. ${r}`).join('\n')}

      Codebase overview:
      README:
      ${readmeContent.slice(0, 1500)}

      Code files:
      ${combinedCode.slice(0, 5000)}`;

      const completionFeature = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPromptFeature },
          { role: 'user', content: userPromptFeature }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const resFeature = completionFeature.choices?.[0]?.message?.content;
      if (resFeature) {
        const parsedFeature = JSON.parse(resFeature);
        const imp = parsedFeature.implemented_count || 0;
        const part = parsedFeature.partial_count || 0;
        const total = coreReqs.length || 1;
        const compPercent = ((imp + (part * 0.5)) / total) * 100;
        
        featureCompletionScore = Math.min(100, Math.max(0, Math.round(compPercent)));
        featureFeedback = parsedFeature.feedback || featureFeedback;
      }
    } catch (err: any) {
      console.warn('[analyze] Failed to analyze feature completion:', err.message);
    }

    // ==================== PART D: AI DETECTION SCAN ====================
    let aiDetectionScore = 0; // percentage likelihood of AI assistance
    let aiVerdict = 'Likely Human';

    try {
      const systemPromptAI = `You are a code plagiarism and AI-generation detection specialist. Scan the given code and readme. Look for signs of AI generation: unusually perfect comments on every single line, absolute consistency in formatting and conventions across files without any debug lines or TODOs, or overly generic structures. Return a valid JSON object with:
      - "ai_probability": integer between 0 and 100 (percentage probability of code being AI generated)
      - "verdict": string ("Likely Human", "Possibly AI Assisted", "Likely AI Generated")
      - "details": 1 sentence explanation.`;

      const userPromptAI = `Scan this code:
      ${combinedCode.slice(0, 6000)}`;

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
        aiDetectionScore = parsedAI.ai_probability ?? 30;
        aiVerdict = parsedAI.verdict ?? aiVerdict;
      }
    } catch (err: any) {
      console.warn('[analyze] Failed to analyze AI detection:', err.message);
    }

    // ==================== FINAL SCORE CALCULATIONS ====================
    // Compute weighted scores based on evaluation_criteria
    const weights = project.evaluation_criteria || {
      code_quality: 25,
      feature_completion: 35,
      technical_choices: 20,
      readme_quality: 10,
      commit_history: 10
    };

    // Calculate score components out of 100
    // commitHistoryScore is out of 10, scale to 100
    const scaledCommitHistory = commitHistoryScore * 10;
    // Assume readme quality matches code quality or is slightly correlated
    const readmeScore = readmeContent.length > 500 ? 90 : readmeContent.length > 100 ? 70 : 30;
    // Assume technical choices score matches code quality or features average
    const technicalChoicesScore = Math.round((codeQualityScore + featureCompletionScore) / 2);

    const overallScore = Math.round(
      (codeQualityScore * (weights.code_quality || 25) +
       featureCompletionScore * (weights.feature_completion || 35) +
       technicalChoicesScore * (weights.technical_choices || 20) +
       readmeScore * (weights.readme_quality || 10) +
       scaledCommitHistory * (weights.commit_history || 10)) / 100
    );

    // Save scores to database
    const { error: saveErr } = await supabaseAdmin
      .from('take_home_projects')
      .update({
        ai_analysis_score: overallScore,
        commit_history_score: scaledCommitHistory,
        code_quality_score: codeQualityScore,
        ai_detection_score: aiDetectionScore,
        feature_completion_score: featureCompletionScore,
        overall_project_score: overallScore,
        status: 'evaluated'
      })
      .eq('id', projectId);

    if (saveErr) {
      console.error('[analyze] Failed to save final evaluation scores:', saveErr.message);
    }

    // ==================== PART E: PLAGIARISM CHECK ====================
    try {
      const positionId = project.position_id;
      if (positionId) {
        // Query other projects for the same position
        const { data: siblingProjects } = await supabaseAdmin
          .from('take_home_projects')
          .select('id, submission_repo_url, candidate_id, candidates(name)')
          .eq('position_id', positionId)
          .eq('status', 'evaluated')
          .neq('id', projectId);

        if (siblingProjects && siblingProjects.length > 0) {
          console.log(`[analyze] Found ${siblingProjects.length} sibling projects for position ${positionId} to check plagiarism.`);
          
          for (const sib of siblingProjects) {
            if (sib.submission_repo_url) {
              const sibInfo = extractRepoInfo(sib.submission_repo_url);
              const sibFiles = await collectTopCodeFiles(sibInfo.owner, sibInfo.repo, undefined, githubToken);
              let sibCode = '';
              for (const f of sibFiles) {
                if (f.download_url) {
                  try {
                    const content = await fetchFileContent(f.download_url, githubToken);
                    sibCode += `\n--- File: ${f.path} ---\n${content.slice(0, 1000)}`;
                  } catch {}
                }
              }

              // Send to Groq for similarity comparison
              const plagiarismPrompt = `You are a plagiarism detection assistant. Compare these two codebase files from separate candidate submissions. Determine if they are copies or significantly derived from each other. Take into account code structure, comments, variables, and logic. Return a valid JSON object with:
              - "similarity_score": integer between 0 and 100
              - "evidence": array of strings listing specific copy evidence
              - "verdict": string ("likely_original", "possibly_copied", "likely_copied")`;

              const userPlagiarismPrompt = `
              Submission A (${project.candidates?.name || 'Current Candidate'}):
              ${combinedCode.slice(0, 4000)}

              Submission B (${(sib as any).candidates?.name || 'Other Candidate'}):
              ${sibCode.slice(0, 4000)}`;

              const completionPlagiarism = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                  { role: 'system', content: plagiarismPrompt },
                  { role: 'user', content: userPlagiarismPrompt }
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' }
              });

              const resPlag = completionPlagiarism.choices?.[0]?.message?.content;
              if (resPlag) {
                const parsedPlag = JSON.parse(resPlag);
                const similarity = parsedPlag.similarity_score || 0;

                if (similarity >= 70) {
                  console.warn(`[analyze] Plagiarism flagged! Similarity: ${similarity}% between ${projectId} and ${sib.id}`);
                  
                  // Flag BOTH submissions
                  await supabaseAdmin
                    .from('take_home_projects')
                    .update({
                      plagiarism_flagged: true,
                      plagiarism_details: {
                        match_project_id: sib.id,
                        match_candidate_name: (sib as any).candidates?.name || 'Other Candidate',
                        similarity_score: similarity,
                        evidence: parsedPlag.evidence || [],
                        verdict: parsedPlag.verdict || 'likely_copied'
                      }
                    })
                    .eq('id', projectId);

                  await supabaseAdmin
                    .from('take_home_projects')
                    .update({
                      plagiarism_flagged: true,
                      plagiarism_details: {
                        match_project_id: projectId,
                        match_candidate_name: project.candidates?.name || 'Current Candidate',
                        similarity_score: similarity,
                        evidence: parsedPlag.evidence || [],
                        verdict: parsedPlag.verdict || 'likely_copied'
                      }
                    })
                    .eq('id', sib.id);

                  // Send Plagiarism Alert Email to Recruiter
                  const resendApiKey = process.env.RESEND_API_KEY;
                  if (resendApiKey && project.profiles?.email) {
                    const resend = new Resend(resendApiKey);
                    await resend.emails.send({
                      from: 'CodeWalk Invites <onboarding@resend.dev>',
                      to: project.profiles.email,
                      subject: `[PLAGIARISM ALERT] Similarity Detected between Submissions`,
                      html: `
                        <div style="background-color: #0d1515; color: #F1F5F9; font-family: sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #ef4444;">
                          <h2 style="color: #ef4444; font-size: 20px; border-bottom: 1px solid #3b494b; padding-bottom: 10px;">High Similarity Detected</h2>
                          <p>We found a high similarity score of <strong>${similarity}%</strong> between the submissions of:</p>
                          <ul style="color: #ffffff;">
                            <li><strong>Candidate A:</strong> ${project.candidates?.name}</li>
                            <li><strong>Candidate B:</strong> ${(sib as any).candidates?.name}</li>
                          </ul>
                          <p><strong>Verdict:</strong> ${parsedPlag.verdict}</p>
                          <p><strong>Evidence Found:</strong></p>
                          <ul style="color: #b9cacb; font-size: 13px;">
                            ${(parsedPlag.evidence || []).map((ev: string) => `<li>${ev}</li>`).join('')}
                          </ul>
                          <p>Please review these submissions in your dashboard to make a final decision.</p>
                        </div>
                      `
                    }).catch(err => console.warn('Failed to send plagiarism alert email:', err));
                  }
                }
              }
            }
          }
        }
      }
    } catch (plagErr: any) {
      console.warn('[analyze] Plagiarism analysis failed (graceful bypass):', plagErr.message);
    }

    // ==================== RECRUITER NOTIFICATION EMAIL ====================
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && project.profiles?.email) {
      try {
        const resend = new Resend(resendApiKey);
        const candidateName = project.candidates?.name || 'Candidate';
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const projectDashboardUrl = `${siteUrl}/take-home`;

        await resend.emails.send({
          from: 'CodeWalk Invites <onboarding@resend.dev>',
          to: project.profiles.email,
          subject: `[Analysis Complete] ${candidateName} — Score: ${overallScore}/100`,
          html: `
            <div style="background-color: #0d1515; color: #F1F5F9; font-family: sans-serif; padding: 40px; border-radius: 8px; max-width: 600px; margin: 0 auto; border: 1px solid #3b494b;">
              <h2 style="color: #06B6D4; font-size: 20px;">Analysis Complete</h2>
              <p>The automated analysis for candidate <strong>${candidateName}</strong>'s take-home project is complete.</p>
              
              <div style="background-color: #151d1e; border: 1px solid #3b494b; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; font-size: 16px;"><strong>Overall Project Score:</strong> <span style="color: #10B981; font-weight: bold; font-size: 20px;">${overallScore}/100</span></p>
                <p style="margin: 0; font-size: 13px; color: #b9cacb;"><strong>Code Quality:</strong> ${codeQualityScore}/100</p>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #b9cacb;"><strong>Feature Completion:</strong> ${featureCompletionScore}/100</p>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #b9cacb;"><strong>Commit Logs Score:</strong> ${scaledCommitHistory}/100</p>
                <p style="margin: 5px 0 0 0; font-size: 13px; color: #b9cacb;"><strong>AI Assistance Likelihood:</strong> ${aiVerdict} (${aiDetectionScore}% probability)</p>
              </div>

              <p style="font-size: 14px;"><strong>Review Summary:</strong><br/>Candidate completed ${Math.round(featureCompletionScore * coreReqs.length / 100)} of ${coreReqs.length} core features. Commit history suggests ${commitHistoryScore >= 7 ? 'active incremental development' : 'last-minute pushed code'}.</p>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${projectDashboardUrl}" style="background-color: #06B6D4; color: #0d1515; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                  View Detailed Report
                </a>
              </div>
            </div>
          `
        });
      } catch (err: any) {
        console.warn('Failed to send recruiter analysis complete email:', err.message);
      }
    }

    console.log(`[analyze] Analysis completed successfully for project ${projectId}.`);
    return NextResponse.json({
      success: true,
      projectId,
      overallScore
    });
  } catch (err: any) {
    console.error('[analyze] Fatal analysis engine error:', err);
    return NextResponse.json({ error: err.message || 'Fatal analysis error' }, { status: 500 });
  }
}
