import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { verifyCandidateOwnership, ForbiddenError } from '@/app/lib/ownership-check';
import { sanitizeCandidate } from '@/app/lib/response-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const { candidateId } = await params;
    const candidate = await verifyCandidateOwnership(candidateId, authResult.id, ip);

    return NextResponse.json({
      success: true,
      candidate: sanitizeCandidate(candidate),
    });
  } catch (err: any) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || 'Candidate not found' }, { status: 404 });
  }
}
