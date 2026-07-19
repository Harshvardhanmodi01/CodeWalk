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
      sessionsRes,
      candidatesRes,
      positionsRes,
      reportsRes
    ] = await Promise.all([
      supabaseAdmin
        .from('sessions')
        .select('id, repo_url, status, timer_duration_minutes, created_at, scheduled_at, link_opened_at, score_breakdown, interview_mode, candidate_id')
        .eq('recruiter_id', userId)
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('candidates')
        .select('id, name, email, github_url, linkedin_url, role_applied, status, tech_stack, years_experience, current_title, overall_score, fit_score, position_id, created_at, updated_at, notes')
        .eq('recruiter_id', userId)
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('positions')
        .select('id, title, created_at, status')
        .eq('recruiter_id', userId)
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('session_reports')
        .select('id, session_id, overall_score, hire_recommendation')
    ]);

    const rawSessions = sessionsRes.data || [];
    const candidates = candidatesRes.data || [];
    const positions = positionsRes.data || [];
    const reports = reportsRes.data || [];

    // Map candidate & position lookups in memory
    const candidateMap = new Map(candidates.map(c => [c.id, c]));
    const positionMap = new Map(positions.map(p => [p.id, p]));
    const reportMap = new Map(reports.map(r => [r.session_id || r.id, r]));

    // Attach candidate & position details to candidates list
    const enrichedCandidates = candidates.map(c => ({
      ...c,
      position: c.position_id ? positionMap.get(c.position_id) || null : null
    }));

    // Attach candidate & report details to sessions list
    const sessions = rawSessions.map(s => {
      const c = s.candidate_id ? candidateMap.get(s.candidate_id) : null;
      const r = reportMap.get(s.id);

      return {
        ...s,
        candidate: c ? {
          id: c.id,
          name: c.name,
          email: c.email,
          github_url: c.github_url,
          fit_score: c.fit_score,
          position_id: c.position_id
        } : null,
        report: r ? {
          id: r.id,
          overall_score: r.overall_score,
          hire_recommendation: r.hire_recommendation
        } : null
      };
    });

    // Calculate stats
    const totalInterviews = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'in_progress').length;
    const todaysSchedule = sessions.filter(s => {
      if (!s.created_at) return false;
      const t = new Date(s.created_at).getTime();
      return t >= todayStart.getTime() && t <= todayEnd.getTime();
    }).length;

    const scoredReports = reports.filter(r => typeof r.overall_score === 'number');
    let avgScore = 'N/A';
    if (scoredReports.length > 0) {
      const sum = scoredReports.reduce((acc, curr) => acc + (curr.overall_score || 0), 0);
      avgScore = `${Math.round(sum / scoredReports.length)}%`;
    }

    const stats = {
      totalInterviews,
      activeSessions,
      avgAiScore: avgScore,
      candidatesInterviewed: candidates.length,
      todaysSchedule
    };

    const response = NextResponse.json({
      success: true,
      sessions,
      candidates: enrichedCandidates,
      positions,
      stats
    });

    response.headers.set('Cache-Control', 'private, s-maxage=15, stale-while-revalidate=30');
    return response;

  } catch (err: any) {
    console.error('Dashboard init API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
