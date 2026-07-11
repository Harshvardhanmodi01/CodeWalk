import { logSecurityEvent } from './security';

export function pickAllowed(
  data: any,
  allowedFields: string[],
  restrictedFields: string[] = [],
  context?: {
    eventType?: string;
    ip?: string;
    userId?: string | null;
  }
) {
  if (!data || typeof data !== 'object') return {};

  const result: any = {};
  const foundRestricted: string[] = [];

  // Log attempts to set restricted fields to security_logs table
  for (const key of Object.keys(data)) {
    if (restrictedFields.includes(key)) {
      foundRestricted.push(key);
    }
  }

  if (foundRestricted.length > 0 && context) {
    const { eventType = 'MASS_ASSIGNMENT_ATTEMPT', ip = '127.0.0.1', userId = null } = context;
    logSecurityEvent(eventType, ip, userId, {
      attemptedFields: foundRestricted,
      receivedKeys: Object.keys(data),
    }, 'warning');
  }

  for (const key of allowedFields) {
    if (key in data) {
      result[key] = data[key];
    }
  }

  return result;
}
