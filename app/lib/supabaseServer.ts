import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase server client that properly reads auth session
 * from the HTTP request cookies (compatible with Next.js App Router).
 * Use this in Server Components and API Route Handlers.
 * 
 * MANUAL SUPABASE DASHBOARD CONFIGURATION (Fix 6):
 * 1. Navigate to your Supabase Project Settings > Authentication.
 * 2. Set "JWT Expiry" (access_token lifespan) to 3600 seconds (1 hour).
 * 3. Under "Session Settings", toggle "Enable Refresh Token Rotation" to ON.
 * 4. Client-side authentication tokens are kept in HttpOnly cookies by @supabase/ssr.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Do not override sameSite — Supabase OAuth callbacks are cross-origin
              // (from *.supabase.co) and require at minimum 'lax' to work correctly.
              // Forcing 'strict' silently drops the session cookie on the redirect.
              cookieStore.set(name, value, {
                ...options,
                secure: true,
              });
            });
          } catch {
            // setAll may throw in Server Components; safe to ignore in Route Handlers
          }
        },
      },
    }
  );

  // Enforce limit(1000) on all select queries globally via prototype modification (Fix 6)
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
    console.error('Failed to wrap Supabase server prototype:', err);
  }

  return client;
}