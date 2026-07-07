import vm from 'vm';

/**
 * Security validation and sanitization utilities for incoming API payloads.
 */

/**
 * Runs a regular expression check inside a VM context with a strict timeout (default 100ms)
 * and pre-validates length to completely prevent ReDoS (Regular Expression Denial of Service).
 */
export function testRegexWithTimeout(regex: RegExp, input: string, timeoutMs: number = 100): boolean {
  // Reject long inputs immediately before running regex
  if (input.length > 1000) return false;
  
  try {
    const sandbox = { regex, input, result: false };
    vm.runInNewContext('result = regex.test(input);', sandbox, { timeout: timeoutMs });
    return sandbox.result;
  } catch (err) {
    console.warn('Regex execution timed out or failed:', err);
    return false;
  }
}

/**
 * Sanitizes an input string to remove SQL injection characters/patterns,
 * strips dangerous control/invisible characters, trims whitespace, removes script tags, and limits length.
 */
export function sanitizeString(input: any, ip: string = 'unknown'): string {
  if (typeof input !== 'string') return '';
  
  let str = input.trim();
  
  // Log suspicious patterns to console if input contains SQL/XSS keywords
  const suspiciousSql = /\b(UNION|DROP|DELETE|SELECT|INSERT|UPDATE|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b|<script>/i;
  if (suspiciousSql.test(str)) {
    console.warn(`[SECURITY WARNING] SQL/XSS keyword pattern detected from IP: ${ip} | Input prefix: "${str.substring(0, 100)}"`);
  }

  // Remove dangerous SQL characters
  str = str.replace(/['";]/g, '');
  str = str.replace(/(--|\/\*|\*\/)/g, '');
  
  // Remove SQL keywords
  str = str.replace(/\bUNION\b/gi, '');
  str = str.replace(/\bDROP\b/gi, '');
  str = str.replace(/\bDELETE\b/gi, '');
  
  // Remove script tags
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  str = str.replace(/<script>/gi, '');
  
  // Strip control characters (\x00-\x1F, \x7F)
  str = str.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Truncate to maximum length of 10000 characters
  return str.slice(0, 10000);
}

/**
 * Validates email format using split('@') logic instead of complex regex to prevent ReDoS.
 * Also limits length to maximum 254 characters (RFC 5321).
 */
export function validateEmail(email: any): boolean {
  if (typeof email !== 'string') return false;
  if (email.length > 254) return false;
  
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const [local, domain] = parts;
  if (!local || !domain) return false;
  
  // Minimal checks: local/domain length and domain contains dot
  if (local.length > 64 || domain.length > 189) return false;
  if (!domain.includes('.')) return false;
  
  return true;
}

/**
 * Validates GitHub repository URL format using URL constructor instead of complex regex to prevent ReDoS.
 * Limits length to maximum 1000 characters.
 */
export function validateGithubUrl(url: any): boolean {
  if (typeof url !== 'string') return false;
  if (url.length > 1000) return false;
  
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    
    const host = parsed.hostname.toLowerCase();
    if (host !== 'github.com' && host !== 'www.github.com') return false;
    
    // Check path: /owner/repo
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts.length !== 2) return false;
    
    const [owner, repo] = pathParts;
    // Basic alphanumeric/hyphen/underscore validation (non-backtracking)
    const isValidPart = (part: string) => /^[a-zA-Z0-9_.-]+$/.test(part);
    return isValidPart(owner) && isValidPart(repo);
  } catch {
    return false;
  }
}

/**
 * Validates UUID v4 format using ReDoS-proof regex run in sandbox.
 */
export function validateUUID(id: any): boolean {
  if (typeof id !== 'string') return false;
  if (id.length > 100) return false;
  
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return testRegexWithTimeout(re, id);
}

/**
 * Validates subscription plan type.
 */
export function validatePlan(plan: any): boolean {
  if (typeof plan !== 'string') return false;
  if (plan.length > 50) return false;
  return ['free', 'pro', 'enterprise'].includes(plan.toLowerCase());
}

/**
 * Validates difficulty level.
 */
export function validateDifficulty(d: any): boolean {
  if (typeof d !== 'string') return false;
  if (d.length > 50) return false;
  return ['easy', 'medium', 'hard'].includes(d.toLowerCase());
}

/**
 * Validates whether a value is a positive integer.
 */
export function validatePositiveInt(n: any): boolean {
  if (n === null || n === undefined) return false;
  const val = typeof n === 'number' ? n : parseInt(n, 10);
  return Number.isInteger(val) && val > 0 && val < 2147483647;
}

/**
 * Sanitizes clipboard input text by stripping zero-width spaces, RTL override,
 * and other invisible/control characters.
 */
export function sanitizeClipboardInput(input: string): { sanitized: string; wasSanitized: boolean } {
  if (typeof input !== 'string') return { sanitized: '', wasSanitized: false };
  
  // zero-width spaces: U+200B, U+200C, U+200D, U+FEFF
  // RTL override: U+202E
  // Other control/invisible ranges
  const dangerousUnicodeRegex = /[\u200B-\u200D\uFEFF\u202E\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
  
  const hasDangerous = dangerousUnicodeRegex.test(input);
  const sanitized = input.replace(dangerousUnicodeRegex, '');
  
  return {
    sanitized,
    wasSanitized: hasDangerous
  };
}

/**
 * Validates password strength according to security standards.
 * Minimum 8 characters, maximum 72 characters, with at least:
 * 1 uppercase, 1 lowercase, 1 digit, 1 special character (!@#$%^&*()).
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 72) {
    return { valid: false, error: 'Password must be at most 72 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*()]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character from: !@#$%^&*().' };
  }
  return { valid: true };
}
