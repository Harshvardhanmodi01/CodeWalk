import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-side Supabase client using @supabase/ssr.
 *
 * @supabase/ssr manages auth tokens via chunked cookies (sb-*-auth-token.0, .1 …).
 * A module-level singleton is correct for browser clients — one instance per browser
 * tab, never shared across server requests. We guard against SSR instantiation so
 * the module-level `supabase` export is only ever hydrated on the client.
 *
 * Only import this in 'use client' components.
 */

// Lazy singleton — created once per browser context, never on the server.
let _client: ReturnType<typeof createBrowserClient> | null = null;

function getClient() {
  if (typeof window === 'undefined') {
    // SSR guard: return a fresh client for any accidental server-side import.
    // This client cannot write cookies but will not pollute the singleton.
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  if (!_client) {
    _client = createBrowserClient(supabaseUrl, supabaseAnonKey);
    // Disable fragile global prototype patching that causes production queries to hang
    // applyQueryLimitPatch(_client);
  }
  return _client;
}

/**
 * Enforce limit(1000) on all select queries globally via prototype modification.
 * Only applied once to the singleton client prototype.
 */
function applyQueryLimitPatch(client: ReturnType<typeof createBrowserClient>) {
  try {
    const selectInstance = client.from('_dummy_table').select();
    let proto = Object.getPrototypeOf(selectInstance);
    while (proto && proto !== Object.prototype) {
      if (proto.then && !proto.then.__isWrapped) {
        const originalThen = proto.then;
        const originalLimit = proto.limit;
        const originalSingle = proto.single;
        const originalMaybeSingle = proto.maybeSingle;

        if (originalLimit) {
          proto.limit = function (this: any, ...args: any[]) {
            this._hasLimit = true;
            const res = originalLimit.apply(this, args);
            if (res) res._hasLimit = true;
            return res;
          };
        }
        if (originalSingle) {
          proto.single = function (this: any, ...args: any[]) {
            this._hasSingle = true;
            const res = originalSingle.apply(this, args);
            if (res) res._hasSingle = true;
            return res;
          };
        }
        if (originalMaybeSingle) {
          proto.maybeSingle = function (this: any, ...args: any[]) {
            this._hasSingle = true;
            const res = originalMaybeSingle.apply(this, args);
            if (res) res._hasSingle = true;
            return res;
          };
        }

        proto.then = function (this: any, onfulfilled: any, onrejected: any) {
          if (!this._hasLimit && !this._hasSingle && !this._isLimitApplied && originalLimit) {
            this._isLimitApplied = true;
            return originalLimit.call(this, 1000).then(onfulfilled, onrejected);
          }
          return originalThen.call(this, onfulfilled, onrejected);
        };
        proto.then.__isWrapped = true;
        break;
      }
      proto = Object.getPrototypeOf(proto);
    }
  } catch (err) {
    console.error('Failed to wrap Supabase browser prototype:', err);
  }
}

/**
 * Named export for backward compatibility — safe to use in 'use client' files only.
 * Accessing this triggers lazy initialization on first call (browser-only).
 */
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_target, prop) {
    return (getClient() as any)[prop];
  },
});

/** Explicit factory — preferred over the `supabase` named export for new code. */
export function getSupabaseBrowserClient() {
  return getClient();
}

/** Alias kept for legacy callers. */
export function getSupabase() {
  return getClient();
}
