import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireAuth } from '@/app/lib/auth-middleware';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import { validatePassword } from '@/app/lib/validation';
import { logSecurityEvent } from '@/app/lib/security';

export async function POST(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  try {
    // 1. Get logged-in user
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;

    const body = await req.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 });
    }

    // 2. Re-authenticate user to verify current password
    // We sign in with email and current password using the user's client
    const userSupabase = await createServerSupabaseClient();
    const { error: signInError } = await userSupabase.auth.signInWithPassword({
      email: authResult.email || '',
      password: currentPassword
    });

    if (signInError) {
      await logSecurityEvent('PASSWORD_CHANGE_FAILED_AUTH', ip, authResult.id, {
        email: authResult.email,
        reason: 'Incorrect current password'
      }, 'warning');
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    // 3. Enforce password strength check on the new password
    const strengthCheck = validatePassword(newPassword);
    if (!strengthCheck.valid) {
      return NextResponse.json({ error: strengthCheck.error }, { status: 400 });
    }

    // 4. Retrieve password history (last 5 passwords)
    const { data: history, error: historyError } = await supabaseAdmin
      .from('password_history')
      .select('password_hash')
      .eq('user_id', authResult.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (historyError) {
      console.error('Failed to fetch password history:', historyError);
    }

    // 5. Compare new password against history
    if (history && history.length > 0) {
      for (const row of history) {
        if (bcrypt.compareSync(newPassword, row.password_hash)) {
          await logSecurityEvent('PASSWORD_REUSE_REJECTED', ip, authResult.id, {
            email: authResult.email,
            reason: 'Password matches one of the last 5 passwords'
          }, 'warning');
          return NextResponse.json({ error: 'You cannot reuse your last 5 passwords' }, { status: 400 });
        }
      }
    }

    // 6. Update user password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authResult.id, {
      password: newPassword
    });

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return NextResponse.json({ error: updateError.message || 'Failed to update password' }, { status: 500 });
    }

    // 7. Save new password hash to history
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);
    const { error: insertHistoryErr } = await supabaseAdmin
      .from('password_history')
      .insert({
        user_id: authResult.id,
        password_hash: hash,
        created_at: new Date().toISOString()
      });

    if (insertHistoryErr) {
      console.error('Failed to save to password history:', insertHistoryErr);
    }

    // 8. Force re-login: invalidate other sessions
    try {
      await supabaseAdmin.auth.admin.signOut(authResult.id, 'others');
    } catch (signOutErr) {
      console.error('Failed to invalidate other sessions:', signOutErr);
    }

    // 9. Log successful password change
    await logSecurityEvent('PASSWORD_CHANGED', ip, authResult.id, {
      email: authResult.email
    }, 'info');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Password change API catch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
