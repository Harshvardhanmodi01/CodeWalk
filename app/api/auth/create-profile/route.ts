import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { userId, name, email, company, tokensTotal } = await req.json();

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
        plan: 'enterprise',
        tokens_total: typeof tokensTotal === 'number' ? tokensTotal : 999999,
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
        { error: `Profile: ${profileError.message} | Recruiter: ${recruiterError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Create profile catch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}