import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { verifySessionOwnership, ForbiddenError } from '@/app/lib/ownership-check';
import { sanitizeSession } from '@/app/lib/response-sanitizer';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const { sessionId } = await params;
    const session = await verifySessionOwnership(sessionId, authResult.id, ip);

    return NextResponse.json({
      success: true,
      session: sanitizeSession(session),
    });
  } catch (err: any) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || 'Session not found' }, { status: 404 });
  }
}
