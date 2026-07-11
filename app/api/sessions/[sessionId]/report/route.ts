import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { verifySessionOwnership, ForbiddenError } from '@/app/lib/ownership-check';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

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
    // Verify recruiter owns the session before returning report
    await verifySessionOwnership(sessionId, authResult.id, ip);

    const { data: report, error } = await supabaseAdmin
      .from('session_reports')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || 'Session not found' }, { status: 404 });
  }
}
