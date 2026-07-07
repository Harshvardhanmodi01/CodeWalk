import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Named export kept for backward compatibility — safe to use in 'use client' files only
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Enforce limit(1000) on all select queries globally via prototype modification (Fix 6)
try {
  const selectInstance = supabase.from('_dummy_table').select();
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

/**
 * Browser-side Supabase client using @supabase/ssr.
 * Only call this from client components ('use client').
 */
export function getSupabaseBrowserClient() {
  return supabase;
}

// Singleton lazy instance for convenience in client components
export function getSupabase() {
  return supabase;
}
