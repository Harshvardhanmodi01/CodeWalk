/**
 * GitHub Token Pool
 *
 * Manages a pool of GitHub PATs (GITHUB_TOKEN_1 .. GITHUB_TOKEN_4).
 * Provides round-robin selection and automatically disables exhausted tokens
 * (HTTP 403 / 429) with a 1-hour cooldown before re-enabling them.
 *
 * This module is a process-level singleton — state persists across requests
 * within a single server process and resets on restart.
 */

export interface TokenStatus {
  index: number;
  /** Masked token for safe logging */
  masked: string;
  available: boolean;
  /** ISO timestamp when the cooldown expires, or null if available */
  cooldownUntil: string | null;
  /** Total times this token was selected */
  usageCount: number;
  /** Total times this token was rate-limited */
  exhaustedCount: number;
}

interface TokenEntry {
  token: string;
  masked: string;
  available: boolean;
  cooldownUntil: number | null; // epoch ms
  usageCount: number;
  exhaustedCount: number;
}

// ─── Cooldown duration ────────────────────────────────────────────────────────
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// ─── Load tokens from environment ─────────────────────────────────────────────
function loadTokens(): TokenEntry[] {
  const entries: TokenEntry[] = [];

  for (let i = 1; i <= 4; i++) {
    const raw = process.env[`GITHUB_TOKEN_${i}`];
    if (raw && raw.trim()) {
      const t = raw.trim();
      // Mask: show first 10 and last 4 chars
      const masked =
        t.length > 14
          ? `${t.slice(0, 10)}...${t.slice(-4)}`
          : `${t.slice(0, 4)}...`;
      entries.push({
        token: t,
        masked,
        available: true,
        cooldownUntil: null,
        usageCount: 0,
        exhaustedCount: 0,
      });
    }
  }

  if (entries.length === 0) {
    console.warn('[TokenPool] No GITHUB_TOKEN_1..4 found in environment. Requests will be unauthenticated.');
  } else {
    console.log(`[TokenPool] Initialized with ${entries.length} token(s).`);
  }

  return entries;
}

// ─── Singleton state ───────────────────────────────────────────────────────────
const tokens: TokenEntry[] = loadTokens();
let roundRobinIndex = 0;

// ─── Internal helpers ──────────────────────────────────────────────────────────

/** Re-enable tokens whose cooldown has expired. */
function refreshCooldowns(): void {
  const now = Date.now();
  for (const entry of tokens) {
    if (!entry.available && entry.cooldownUntil !== null && now >= entry.cooldownUntil) {
      entry.available = true;
      entry.cooldownUntil = null;
      console.log(`[TokenPool] Token ${entry.masked} cooldown expired — re-enabled.`);
    }
  }
}

/** Return all currently available token entries. */
function availableTokens(): TokenEntry[] {
  refreshCooldowns();
  return tokens.filter((t) => t.available);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Pick the next available token using round-robin.
 * Returns `null` if every token is on cooldown (fall back to unauthenticated).
 */
export function getNextToken(): string | null {
  if (tokens.length === 0) return null;

  refreshCooldowns();

  const available = availableTokens();
  if (available.length === 0) {
    console.warn('[TokenPool] All tokens are exhausted / on cooldown. Falling back to unauthenticated.');
    return null;
  }

  // Advance round-robin pointer until we land on an available token
  let checked = 0;
  while (checked < tokens.length) {
    roundRobinIndex = roundRobinIndex % tokens.length;
    const entry = tokens[roundRobinIndex];
    roundRobinIndex++;
    checked++;

    if (entry.available) {
      entry.usageCount++;
      return entry.token;
    }
  }

  return null;
}

/**
 * Mark a token as exhausted (rate-limited).
 * Sets a 1-hour cooldown and disables the token.
 * Safe to call with a null/undefined token (no-op).
 */
export function markTokenExhausted(token: string | null | undefined): void {
  if (!token) return;

  const entry = tokens.find((t) => t.token === token);
  if (!entry) return;

  entry.available = false;
  entry.cooldownUntil = Date.now() + COOLDOWN_MS;
  entry.exhaustedCount++;

  const cooldownUntilISO = new Date(entry.cooldownUntil).toISOString();
  console.warn(
    `[TokenPool] Token ${entry.masked} exhausted. Cooldown until ${cooldownUntilISO}. ` +
    `(${entry.exhaustedCount} total exhaustion(s))`
  );
}

/**
 * Get a snapshot of all token statuses — useful for debug endpoints or logging.
 */
export function getPoolStatus(): TokenStatus[] {
  refreshCooldowns();
  return tokens.map((entry, idx) => ({
    index: idx + 1,
    masked: entry.masked,
    available: entry.available,
    cooldownUntil: entry.cooldownUntil
      ? new Date(entry.cooldownUntil).toISOString()
      : null,
    usageCount: entry.usageCount,
    exhaustedCount: entry.exhaustedCount,
  }));
}

/**
 * Returns the total number of tokens loaded (for health-check / logging).
 */
export function getTokenCount(): number {
  return tokens.length;
}
