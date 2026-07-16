import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                       process.env.SERVICE_ROLE_KEY || 
                       process.env.SUPABASE_SERVICE_KEY || 
                       '';

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Supabase URL or Service Role Key is missing. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SERVICE_ROLE_KEY are set.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Enforce limit(1000) on all select queries globally via prototype modification (Fix 6)
try {
  const selectInstance = supabaseAdmin.from('_dummy_table').select();
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
          return originalLimit.apply(this, args);
        };
      }
      if (originalSingle) {
        proto.single = function (this: any, ...args: any[]) {
          this._hasSingle = true;
          return originalSingle.apply(this, args);
        };
      }
      if (originalMaybeSingle) {
        proto.maybeSingle = function (this: any, ...args: any[]) {
          this._hasSingle = true;
          return originalMaybeSingle.apply(this, args);
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
  console.error('Failed to wrap Supabase admin prototype:', err);
}