import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/lib/auth-middleware';
import { supabaseAdmin } from '@/app/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const userId = authResult.id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      { count: totalInterviews },
      { count: activeSessions },
      { count: candidatesCount },
      { count: todaysSchedule },
      { data: recentSessions },
      { data: scoreData }
    ] = await Promise.all([
      supabaseAdmin
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('recruiter_id', userId),
      supabaseAdmin
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('recruiter_id', userId)
        .eq('status', 'in_progress'),
      supabaseAdmin
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .eq('recruiter_id', userId),
      supabaseAdmin
        .from('sessions')
        .select('id', { count: 'exact', head: true })
        .eq('recruiter_id', userId)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString()),
      supabaseAdmin
        .from('sessions')
        .select('id, candidate_name, position_title, status, created_at, overall_score')
        .eq('recruiter_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('sessions')
        .select('overall_score')
        .eq('recruiter_id', userId)
        .not('overall_score', 'is', null)
    ]);

    let avgScore = 0;
    if (scoreData && scoreData.length > 0) {
      const sum = scoreData.reduce((acc, curr) => acc + (curr.overall_score || 0), 0);
      avgScore = Math.round(sum / scoreData.length);
    }

    const response = NextResponse.json({
      success: true,
      stats: {
        totalInterviews: totalInterviews || 0,
        activeSessions: activeSessions || 0,
        candidatesCount: candidatesCount || 0,
        todaysSchedule: todaysSchedule || 0,
        avgScore,
        recentSessions: recentSessions || []
      }
    });

    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;

  } catch (err: any) {
    console.error('Dashboard stats API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
