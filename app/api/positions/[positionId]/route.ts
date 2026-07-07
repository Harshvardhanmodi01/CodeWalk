import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { verifyPositionOwnership, ForbiddenError } from '@/app/lib/ownership-check';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ positionId: string }> }
) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const { positionId } = await params;
    const position = await verifyPositionOwnership(positionId, authResult.id, ip);

    return NextResponse.json({
      success: true,
      position,
    });
  } catch (err: any) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: err.message || 'Position not found' }, { status: 404 });
  }
}
