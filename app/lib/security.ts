import crypto from 'crypto';
import { supabaseAdmin } from './supabaseAdmin';

// In-memory maps for nonces and idempotency cache
const usedNonces = new Map<string, number>(); // nonce -> timestamp
const idempotencyCache = new Map<string, any>(); // key -> response JSON

const SECRET_KEY = process.env.ADMIN_SECRET || 'codewalk_default_secure_key_2026';

/**
 * Checks if the given email or IP address is currently locked out.
 */
export async function checkLoginLockout(email: string, ip: string): Promise<{
  blocked: boolean;
  reason?: string;
  failedAttemptsCount: number;
}> {
  try {
    // 1. Check IP lockout: block IP for 1 hour after 10 failed attempts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipFailedCount, error: ipError } = await supabaseAdmin
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('success', false)
      .gt('attempted_at', oneHourAgo);

    if (ipError) {
      console.error('Error querying IP login attempts:', ipError);
    } else if (ipFailedCount && ipFailedCount >= 10) {
      return {
        blocked: true,
        reason: 'Too many requests from this IP. Please try again in 1 hour.',
        failedAttemptsCount: ipFailedCount,
      };
    }

    // 2. Check Email lockout: block email for 15 minutes after 5 failed attempts
    // Retrieve the timestamp of the last successful login for this email
    const { data: lastSuccess, error: successError } = await supabaseAdmin
      .from('login_attempts')
      .select('attempted_at')
      .eq('email', email)
      .eq('success', true)
      .order('attempted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (successError) {
      console.error('Error querying last successful login:', successError);
    }

    // Count failed attempts since the last successful login (or all time if no success)
    let emailFailedQuery = supabaseAdmin
      .from('login_attempts')
      .select('attempted_at', { count: 'exact' })
      .eq('email', email)
      .eq('success', false);

    if (lastSuccess?.attempted_at) {
      emailFailedQuery = emailFailedQuery.gt('attempted_at', lastSuccess.attempted_at);
    }

    const { count: emailFailedCount, data: failedAttemptsData, error: failedError } = await emailFailedQuery
      .order('attempted_at', { ascending: false });

    if (failedError) {
      console.error('Error querying failed login attempts:', failedError);
    }

    const count = emailFailedCount || 0;

    if (count >= 5 && failedAttemptsData && failedAttemptsData[0]) {
      const lastFailedAt = new Date(failedAttemptsData[0].attempted_at).getTime();
      const timeElapsed = Date.now() - lastFailedAt;
      const lockoutWindow = 15 * 60 * 1000; // 15 minutes

      if (timeElapsed < lockoutWindow) {
        return {
          blocked: true,
          reason: 'Too many failed attempts. Try again in 15 minutes.',
          failedAttemptsCount: count,
        };
      }
    }

    return {
      blocked: false,
      failedAttemptsCount: count,
    };
  } catch (err) {
    console.error('Lockout check exception:', err);
    return { blocked: false, failedAttemptsCount: 0 };
  }
}

/**
 * Records a login attempt (success or failure) in the database.
 */
export async function recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
  try {
    await supabaseAdmin.from('login_attempts').insert({
      email,
      ip_address: ip,
      success,
      attempted_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to record login attempt:', err);
  }
}

/**
 * Logs a security event into the `security_logs` table.
 */
export async function logSecurityEvent(
  eventType: string,
  ip: string,
  userId: string | null,
  details: any,
  severity: 'info' | 'warning' | 'critical' = 'info'
): Promise<void> {
  try {
    const sanitizedDetails = sanitizeLogData(details);
    
    // Log to console for observability
    console.warn(`[SECURITY EVENT] [${severity.toUpperCase()}] Type: ${eventType} | IP: ${ip} | User: ${userId || 'N/A'} | Details:`, JSON.stringify(sanitizedDetails));

    const logObj: any = {
      event_type: eventType,
      ip_address: ip,
      user_id: userId,
      details: { ...sanitizedDetails, severity },
      severity,
      created_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin.from('security_logs').insert(logObj);
    
    if (error) {
      if (error.message.includes('severity') || error.code === 'PGRST204') {
        // Fallback: Database does not have severity column yet
        delete logObj.severity;
        const { error: fallbackErr } = await supabaseAdmin.from('security_logs').insert(logObj);
        if (fallbackErr) {
          console.error('Failed fallback security log insert:', fallbackErr);
        }
      } else {
        console.error('Failed security log insert:', error);
      }
    }
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
}

/**
 * Generates a simple math CAPTCHA question and a cryptographically signed token.
 */
export function generateCaptcha(): { question: string; captchaToken: string } {
  const num1 = Math.floor(Math.random() * 10) + 1; // 1-10
  const num2 = Math.floor(Math.random() * 10) + 1; // 1-10
  const question = `What is ${num1} + ${num2}?`;
  const answer = num1 + num2;
  const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${num1}+${num2}=${answer}:${expiry}`)
    .digest('hex');

  const captchaToken = `${num1}:${num2}:${expiry}:${signature}`;
  return { question, captchaToken };
}

/**
 * Verifies the user's CAPTCHA answer against the signed token.
 */
export function verifyCaptcha(captchaToken: string, userAnswer: string | number): boolean {
  if (!captchaToken) return false;
  
  try {
    const [num1Str, num2Str, expiryStr, signature] = captchaToken.split(':');
    if (!num1Str || !num2Str || !expiryStr || !signature) return false;
    
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) {
      return false; // Token expired
    }
    
    const num1 = parseInt(num1Str, 10);
    const num2 = parseInt(num2Str, 10);
    const expectedAnswer = num1 + num2;
    
    const expectedSig = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(`${num1}+${num2}=${expectedAnswer}:${expiry}`)
      .digest('hex');
      
    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig)
    );
    
    const isAnswerCorrect = parseInt(userAnswer as string, 10) === expectedAnswer;
    
    return isSignatureValid && isAnswerCorrect;
  } catch (err) {
    console.error('CAPTCHA verification exception:', err);
    return false;
  }
}

/**
 * Validates a request nonce and timestamp to prevent replay attacks.
 */
export function validateNonceAndTimestamp(
  nonce: string | null,
  timestampStr: string | null
): { success: boolean; status: number; error?: string } {
  if (!timestampStr) {
    return { success: false, status: 400, error: 'Missing X-Request-Timestamp header' };
  }
  if (!nonce) {
    return { success: false, status: 400, error: 'Missing X-Request-Nonce header' };
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { success: false, status: 400, error: 'Invalid X-Request-Timestamp header' };
  }

  const now = Date.now();
  // Reject requests older than 5 minutes (or 5 minutes in the future to account for clock drift)
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return { success: false, status: 400, error: 'Request timestamp is outside the 5-minute validity window' };
  }

  // Purge old nonces (older than 10 minutes)
  const tenMinutesAgo = now - 10 * 60 * 1000;
  for (const [key, time] of usedNonces.entries()) {
    if (time < tenMinutesAgo) {
      usedNonces.delete(key);
    }
  }

  // Check duplicate nonce
  if (usedNonces.has(nonce)) {
    return { success: false, status: 409, error: 'Duplicate request detected (nonce already used)' };
  }

  // Cache new nonce
  usedNonces.set(nonce, now);
  return { success: true, status: 200 };
}

/**
 * Retrieve cached response for an idempotency key.
 */
export function getIdempotencyResponse(key: string | null): any | null {
  if (!key) return null;
  return idempotencyCache.get(key) || null;
}

/**
 * Store response for an idempotency key.
 */
export function setIdempotencyResponse(key: string | null, response: any): void {
  if (!key) return;
  idempotencyCache.set(key, response);
  
  // Clean up cache entry after 10 minutes
  setTimeout(() => {
    idempotencyCache.delete(key);
  }, 10 * 60 * 1000);
}

/**
 * Mask email address into j***@domain.com format.
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

/**
 * Sanitize log details to prevent leakage of credentials or sensitive data.
 */
export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data !== 'object') {
    if (typeof data === 'string') {
      if (data.startsWith('eyJ') || data.length > 80) {
        return '[REDACTED_SENSITIVE_STRING]';
      }
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }
  
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = [
    'password', 'token', 'apikey', 'secret', 'key', 
    'access_token', 'refresh_token', 'serviceRoleKey', 'authorization', 'cookie'
  ];
  
  for (const [key, val] of Object.entries(data)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (key.toLowerCase() === 'email' && typeof val === 'string') {
      sanitized[key] = maskEmail(val);
    } else {
      sanitized[key] = sanitizeLogData(val);
    }
  }
  
  return sanitized;
}

/**
 * Constant-time comparison function for secure checks.
 */
export function safeCompare(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
