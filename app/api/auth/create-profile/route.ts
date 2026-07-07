import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { pickAllowed } from '@/app/lib/whitelist';

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  try {
    const body = await req.json().catch(() => ({}));
    const allowedFields = ['userId', 'name', 'email', 'company'];
    const restrictedFields = ['plan', 'tokensTotal', 'tokens_total', 'tokens_used', 'role', 'is_admin'];
    const whitelistedData = pickAllowed(body, allowedFields, restrictedFields, {
      eventType: 'MASS_ASSIGNMENT_ATTEMPT_CREATE_PROFILE',
      ip,
      userId: body.userId || null
    });

    const { userId, name, email, company } = whitelistedData;

    if (!userId || !email) {
      return NextResponse.json({ error: 'userId and email are required' }, { status: 400 });
    }

    // 1. Upsert into public.profiles (uses service role key — bypasses RLS)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        name,
        full_name: name,
        company: company || '',
        company_name: company || '',
        plan: 'free',
        tokens_total: 5,
        tokens_used: 0,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      // Don't fail completely — try to continue with recruiter insert
    }

    // 2. Upsert into public.recruiters (uses service role key — bypasses RLS)
    const { error: recruiterError } = await supabaseAdmin
      .from('recruiters')
      .upsert({
        id: userId,
        email,
        full_name: name,
        company: company || '',
      }, { onConflict: 'id' });

    if (recruiterError) {
      console.error('Recruiter upsert error:', recruiterError);
    }

    if (profileError && recruiterError) {
      return NextResponse.json(
        { error: 'Failed to initialize user profile. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Create profile catch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}