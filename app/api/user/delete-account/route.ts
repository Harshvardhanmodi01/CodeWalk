import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { logSecurityEvent } from '@/app/lib/security';

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  try {
    // 1. Require Auth
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const body = await req.json().catch(() => ({}));
    const { confirmEmail } = body;

    // 2. Verify confirmation email matches logged-in user email
    if (!confirmEmail || confirmEmail.trim().toLowerCase() !== authResult.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Email confirmation does not match your registered email.' }, { status: 400 });
    }

    const userId = authResult.id;
    const userEmail = authResult.email;

    console.warn(`[DANGER] Account deletion initiated for user: ${userId} (${userEmail})`);

    // 3. Log deletion event first with critical severity
    await logSecurityEvent('ACCOUNT_DELETION_INITIATED', ip, userId, {
      email: userEmail,
      status: 'success'
    }, 'critical');

    // 4. Perform cascade deletion via supabaseAdmin (service role key bypasses RLS)
    
    // Step A: Delete session reports (which reference sessions)
    // First find session IDs
    const { data: userSessions } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('recruiter_id', userId);
      
    if (userSessions && userSessions.length > 0) {
      const sessionIds = userSessions.map(s => s.id);
      await supabaseAdmin.from('session_reports').delete().in('session_id', sessionIds);
      await supabaseAdmin.from('answers').delete().in('session_id', sessionIds);
      await supabaseAdmin.from('questions').delete().in('session_id', sessionIds);
    }

    // Step B: Delete sessions
    const { error: sessErr } = await supabaseAdmin
      .from('sessions')
      .delete()
      .eq('recruiter_id', userId);
    if (sessErr) console.error('Failed deleting sessions during account purge:', sessErr);

    // Step C: Delete candidates
    const { error: candErr } = await supabaseAdmin
      .from('candidates')
      .delete()
      .eq('recruiter_id', userId);
    if (candErr) console.error('Failed deleting candidates during account purge:', candErr);

    // Step D: Delete positions
    const { error: posErr } = await supabaseAdmin
      .from('positions')
      .delete()
      .eq('recruiter_id', userId);
    if (posErr) console.error('Failed deleting positions during account purge:', posErr);

    // Step E: Delete saved_questions bookmarks
    const { error: savedQErr } = await supabaseAdmin
      .from('saved_questions')
      .delete()
      .eq('recruiter_id', userId);
    if (savedQErr) console.error('Failed deleting saved_questions during account purge:', savedQErr);

    // Step F: Delete custom entries in question_bank
    const { error: qbErr } = await supabaseAdmin
      .from('question_bank')
      .delete()
      .eq('created_by', userId);
    if (qbErr) console.error('Failed deleting question_bank entries during account purge:', qbErr);

    // Step G: Delete password history records
    try {
      await supabaseAdmin
        .from('password_history')
        .delete()
        .eq('user_id', userId);
    } catch (passHistErr) {
      console.error('Failed deleting password history during account purge:', passHistErr);
    }

    // Step H: Delete recruiter details
    try {
      await supabaseAdmin
        .from('recruiters')
        .delete()
        .eq('id', userId);
    } catch (recErr) {
      console.error('Failed deleting recruiters during account purge:', recErr);
    }

    // Step I: Delete profile record
    const { error: profErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profErr) {
      console.error('Failed deleting profile during account purge:', profErr);
      return NextResponse.json({ error: 'Failed to delete profile record' }, { status: 500 });
    }

    // Step J: Delete user in Supabase Auth via Admin Client
    const { error: authPurgeErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authPurgeErr) {
      console.error('Failed to purge user from auth catalog:', authPurgeErr);
      return NextResponse.json({ error: 'Failed to complete user authentication deletion' }, { status: 500 });
    }

    await logSecurityEvent('ACCOUNT_DELETED_SUCCESSFULLY', ip, null, {
      userId,
      email: userEmail
    }, 'critical');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Account deletion API catch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
