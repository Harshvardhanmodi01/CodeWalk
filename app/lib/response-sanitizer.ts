export function sanitizeProfile(profile: any): any {
  if (!profile) return null;
  if (Array.isArray(profile)) {
    return profile.map(p => sanitizeProfile(p));
  }

  const allowed = [
    'id',
    'full_name',
    'company',
    'role',
    'plan',
    'tokens_used',
    'tokens_total',
    'github_connected',
    'github_username',
    'avatar_url',
    'created_at'
  ];

  const sanitized: any = {};
  for (const key of allowed) {
    if (key in profile) {
      sanitized[key] = profile[key];
    }
  }
  return sanitized;
}

export function sanitizeSession(session: any): any {
  if (!session) return null;
  if (Array.isArray(session)) {
    return session.map(s => sanitizeSession(s));
  }

  const allowed = [
    'id',
    'candidate_id',
    'status',
    'started_at',
    'ended_at',
    'timer_duration_minutes',
    'interview_mode',
    'scheduled_at',
    'created_at',
    'repo_url',           // functionally required by both recruiter & candidate sessions
    'remaining_seconds'   // functionally required by candidate session timer
  ];

  const sanitized: any = {};
  for (const key of allowed) {
    if (key in session) {
      sanitized[key] = session[key];
    }
  }
  return sanitized;
}

export function sanitizeCandidate(candidate: any): any {
  if (!candidate) return null;
  if (Array.isArray(candidate)) {
    return candidate.map(c => sanitizeCandidate(c));
  }

  const allowed = [
    'id',
    'name',
    'email',
    'github_url',
    'tech_stack',
    'status',
    'fit_score',
    'overall_score',
    'hire_recommendation',
    'imported_via',
    'created_at',
    'notes',              // functionally required by recruiter dashboard
    'current_title',      // functionally required by recruiter dashboard
    'years_experience',   // functionally required by recruiter dashboard
    'role_applied',       // functionally required by recruiter dashboard
    'linkedin_url',       // functionally required by recruiter dashboard
    'position_id'         // functionally required by recruiter dashboard
  ];

  const sanitized: any = {};
  for (const key of allowed) {
    if (key in candidate) {
      sanitized[key] = candidate[key];
    }
  }
  return sanitized;
}
