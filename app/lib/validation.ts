/**
 * Security validation and sanitization utilities for incoming API payloads.
 */

/**
 * Sanitizes an input string to remove SQL injection characters/patterns,
 * strips dangerous control characters, trims whitespace, and limits length.
 */
export function sanitizeString(input: any): string {
  if (typeof input !== 'string') return '';
  
  let str = input.trim();
  
  // Remove common SQL comment injection sequences
  str = str.replace(/(--|\/\*|\*\/)/g, '');
  
  // Strip control characters (\x00-\x1F, \x7F)
  str = str.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Truncate to maximum length of 10000 characters
  return str.slice(0, 10000);
}

/**
 * Validates email format.
 */
export function validateEmail(email: any): boolean {
  if (typeof email !== 'string') return false;
  
  // Standard RFC 5322 email regex
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return re.test(email);
}

/**
 * Validates GitHub repository URL format.
 * Matches: https://github.com/owner/repo (allowing optional trailing slash).
 */
export function validateGithubUrl(url: any): boolean {
  if (typeof url !== 'string') return false;
  
  // Regex matches https://github.com/[owner]/[repo] format specifically
  const re = /^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\/?$/;
  return re.test(url);
}

/**
 * Validates UUID v4 format.
 */
export function validateUUID(id: any): boolean {
  if (typeof id !== 'string') return false;
  
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(id);
}

/**
 * Validates subscription plan type.
 */
export function validatePlan(plan: any): boolean {
  if (typeof plan !== 'string') return false;
  
  return ['free', 'pro', 'enterprise'].includes(plan.toLowerCase());
}

/**
 * Validates difficulty level.
 */
export function validateDifficulty(d: any): boolean {
  if (typeof d !== 'string') return false;
  
  return ['easy', 'medium', 'hard'].includes(d.toLowerCase());
}

/**
 * Validates whether a value is a positive integer.
 */
export function validatePositiveInt(n: any): boolean {
  const val = typeof n === 'number' ? n : parseInt(n, 10);
  return Number.isInteger(val) && val > 0;
}
