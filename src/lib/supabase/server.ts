import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Thrown when the Supabase environment variables are missing.
 *
 * Without this guard, `createServiceClient()` passed `undefined!` into supabase-js,
 * which throws its own opaque `"supabaseUrl is required"` — surfaced to callers as a
 * generic 500 (e.g. POST /api/persona). Naming the failure and pointing at the fix
 * turns that cryptic crash into self-service guidance. See issue #5 (Supabase setup).
 */
export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
      '(Vercel → Project → Settings → Environment Variables), then redeploy. See issue #5.'
    )
    this.name = 'SupabaseNotConfiguredError'
  }
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new SupabaseNotConfiguredError()
  return createSupabaseClient(url, key)
}
