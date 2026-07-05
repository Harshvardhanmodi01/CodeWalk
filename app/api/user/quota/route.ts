import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/app/lib/supabaseServer';
import { requireAuth } from '@/app/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const supabase = await createServerSupabaseClient();
    const userId = authResult.id;

    // Get plan (default 'free')
    let { data: planRow } = await supabase
      .from('user_plans')
      .select('plan_type, current_period_end')
      .eq('user_id', userId)
      .single();

    const planType = planRow?.plan_type || 'free';
    const limit = planType === 'pro' ? 50 : 5;

    // Get current month's usage
    const today = new Date();
    const yearMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    let { data: usageRow } = await supabase
      .from('monthly_usage')
      .select('analysis_count')
      .eq('user_id', userId)
      .eq('year_month', yearMonth)
      .single();

    const used = usageRow?.analysis_count || 0;
    const remaining = Math.max(0, limit - used);

    return NextResponse.json({
      plan: planType,
      used,
      limit,
      remaining,
      currentPeriodEnd: planRow?.current_period_end || null,
    });
  } catch (err: any) {
    console.error('API user/quota error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}