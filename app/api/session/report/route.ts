import { NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { validateUUID } from '@/app/lib/validation';
import { verifySessionOwnership, ForbiddenError } from '@/app/lib/ownership-check';
import { compileAndSaveReport } from '@/app/lib/reportCompiler';

export async function POST(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const body = await req.json().catch(() => ({}));
    const { sessionId, forceRefresh } = body;
    
    if (!sessionId || !validateUUID(sessionId)) {
      return NextResponse.json({ error: 'Valid sessionId is required' }, { status: 400 });
    }

    try {
      await verifySessionOwnership(sessionId, authResult.id, ip);
    } catch (err: any) {
      if (err instanceof ForbiddenError) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

    const report = await compileAndSaveReport(sessionId, forceRefresh ?? false);
    return NextResponse.json(report);
  } catch (err: any) {
    console.error('Session report API error:', err);
    return NextResponse.json({ error: err.message || 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
