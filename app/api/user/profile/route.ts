import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { pickAllowed } from '@/app/lib/whitelist';
import { sanitizeProfile } from '@/app/lib/response-sanitizer';

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const body = await req.json().catch(() => ({}));

    // Whitelist only allowed fields. Blocked fields are ignored silently.
    const allowedFields = ['full_name', 'company', 'role', 'company_size', 'hires_per_month', 'avatar_url'];
    const whitelistedData = pickAllowed(body, allowedFields);

    if (Object.keys(whitelistedData).length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update(whitelistedData)
      .eq('id', authResult.id)
      .select()
      .single();

    if (error || !updatedProfile) {
      console.error('Profile update error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    // Keep recruiters table in sync if name or company changed
    if (whitelistedData.full_name || whitelistedData.company) {
      try {
        await supabaseAdmin
          .from('recruiters')
          .upsert({
            id: authResult.id,
            email: authResult.email || '',
            full_name: whitelistedData.full_name || updatedProfile.full_name || '',
            company: whitelistedData.company || updatedProfile.company || '',
          }, { onConflict: 'id' });
      } catch (recErr) {
        console.error('Failed to sync recruiters table:', recErr);
      }
    }

    return NextResponse.json({
      success: true,
      profile: sanitizeProfile(updatedProfile),
    });
  } catch (err: any) {
    console.error('Profile update API catch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
