import { supabaseAdmin } from './supabaseAdmin';
import { logSecurityEvent } from './security';
import { createServerSupabaseClient } from './supabaseServer';

export class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export async function verifySessionOwnership(sessionId: string, userId: string, ip: string = '127.0.0.1') {
  let session = null;
  let error = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error: err } = await supabase
      .from('sessions')
      .select('id, recruiter_id, candidate_id, status, timer_duration_minutes, repo_url, remaining_seconds, started_at, ended_at, created_at')
      .eq('id', sessionId)
      .single();
    session = data;
    error = err;
  } catch (e) {
    const { data, error: err } = await supabaseAdmin
      .from('sessions')
      .select('id, recruiter_id, candidate_id, status, timer_duration_minutes, repo_url, remaining_seconds, started_at, ended_at, created_at')
      .eq('id', sessionId)
      .single();
    session = data;
    error = err;
  }

  if (error || !session) {
    throw new Error('Session not found');
  }

  if (session.recruiter_id !== userId) {
    await logSecurityEvent('IDOR_ATTEMPT', ip, userId, {
      resourceType: 'session',
      resourceId: sessionId,
      ownerId: session.recruiter_id,
    }, 'critical');
    throw new ForbiddenError('Access denied');
  }

  return session;
}

export async function verifyCandidateOwnership(candidateId: string, userId: string, ip: string = '127.0.0.1') {
  let candidate = null;
  let error = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error: err } = await supabase
      .from('candidates')
      .select('id, recruiter_id, name, email, github_url, tech_stack, status, fit_score, overall_score, hire_recommendation, imported_via, created_at')
      .eq('id', candidateId)
      .single();
    candidate = data;
    error = err;
  } catch (e) {
    const { data, error: err } = await supabaseAdmin
      .from('candidates')
      .select('id, recruiter_id, name, email, github_url, tech_stack, status, fit_score, overall_score, hire_recommendation, imported_via, created_at')
      .eq('id', candidateId)
      .single();
    candidate = data;
    error = err;
  }

  if (error || !candidate) {
    throw new Error('Candidate not found');
  }

  if (candidate.recruiter_id !== userId) {
    await logSecurityEvent('IDOR_ATTEMPT', ip, userId, {
      resourceType: 'candidate',
      resourceId: candidateId,
      ownerId: candidate.recruiter_id,
    }, 'critical');
    throw new ForbiddenError('Access denied');
  }

  return candidate;
}

export async function verifyPositionOwnership(positionId: string, userId: string, ip: string = '127.0.0.1') {
  let position = null;
  let error = null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error: err } = await supabase
      .from('positions')
      .select('id, recruiter_id, title, job_description, required_skills, experience_level, department, status, created_at, updated_at')
      .eq('id', positionId)
      .single();
    position = data;
    error = err;
  } catch (e) {
    const { data, error: err } = await supabaseAdmin
      .from('positions')
      .select('id, recruiter_id, title, job_description, required_skills, experience_level, department, status, created_at, updated_at')
      .eq('id', positionId)
      .single();
    position = data;
    error = err;
  }

  if (error || !position) {
    throw new Error('Position not found');
  }

  if (position.recruiter_id !== userId) {
    await logSecurityEvent('IDOR_ATTEMPT', ip, userId, {
      resourceType: 'position',
      resourceId: positionId,
      ownerId: position.recruiter_id,
    }, 'critical');
    throw new ForbiddenError('Access denied');
  }

  return position;
}
