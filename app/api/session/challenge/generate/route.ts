import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { validateUUID } from '@/app/lib/validation';
import { requireAuth } from '@/app/lib/auth-middleware';
import { generateMicroChallenge } from '@/app/lib/challengeGenerator';
import { extractRepoInfo, fetchFileContent } from '@/app/lib/github';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the recruiter
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { sessionId, filePath, content, challengeType = 'any' } = body;

    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId is required.' }, { status: 400 });
    }

    // 3. Fetch current session details
    const { data: session, error: getErr } = await supabaseAdmin
      .from('sessions')
      .select('result, repo_url')
      .eq('id', sessionId)
      .single();

    if (getErr || !session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    let fileContent = content;
    let targetFilePath = filePath;

    // 4. Resolve file path & content if not provided
    if (!fileContent || !targetFilePath) {
      if (!session.repo_url) {
        return NextResponse.json({ error: 'Session does not have a repository URL and no content was provided.' }, { status: 400 });
      }

      const { owner, repo } = extractRepoInfo(session.repo_url);
      const token = process.env.GITHUB_TOKEN;

      // Import github functions to list contents dynamically if no path was passed
      const { fetchRepoContents } = require('@/app/lib/github');
      const files = await fetchRepoContents(owner, repo, '', undefined, token);
      const codeFiles = files.filter((f: any) => f.type === 'file' && (f.name.endsWith('.js') || f.name.endsWith('.ts') || f.name.endsWith('.py') || f.name.endsWith('.rb')));
      
      const selectedFile = codeFiles[0] || files.find((f: any) => f.type === 'file');
      if (!selectedFile) {
        return NextResponse.json({ error: 'No files found in repository to generate challenge.' }, { status: 400 });
      }

      targetFilePath = selectedFile.path;
      fileContent = await fetchFileContent(selectedFile.download_url, token);
    }

    // 5. Generate micro-challenge
    const challenge = await generateMicroChallenge(fileContent, targetFilePath, 'All', challengeType);
    if (!challenge) {
      return NextResponse.json({ error: 'Failed to generate coding challenge.' }, { status: 500 });
    }

    // 6. Update session result with the challenge
    const result = session.result || {};
    const updatedResult = {
      ...result,
      challenge
    };

    const { error: updateErr } = await supabaseAdmin
      .from('sessions')
      .update({ result: updatedResult })
      .eq('id', sessionId);

    if (updateErr) {
      console.error('[challenge-generate] Failed to update session:', updateErr);
      return NextResponse.json({ error: 'Failed to update session with challenge.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, challenge });
  } catch (err: any) {
    console.error('[challenge-generate] Error in API:', err.message);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
