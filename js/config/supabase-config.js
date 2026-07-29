/**
 * Fill these in with your own Supabase project's values (Project Settings → API
 * in the Supabase dashboard). The anon/public key is safe to ship in client-side
 * code — it is meant to be exposed — as long as Row Level Security policies on
 * the tables restrict what it can actually do.
 *
 * Leave both empty to keep using IndexedDB only; the Supabase toggle in
 * Administração will show a clear error instead of crashing if you switch to
 * Supabase mode before filling these in.
 */
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
