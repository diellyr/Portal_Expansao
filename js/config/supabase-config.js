/**
 * To point this codebase at a DIFFERENT Supabase project, replace the two
 * values below with your own project's URL and anon/publishable key
 * (Project Settings → API in the Supabase dashboard). These are the only
 * two lines that need to change.
 *
 * The anon/public key is safe to ship in client-side code — it is meant to
 * be exposed — as long as Row Level Security policies on the tables
 * restrict what it can actually do (see README → Integração com Supabase).
 *
 * These values are also editable at runtime via Administração → Fonte de
 * dados (saved to this browser's localStorage, which takes priority over
 * what's defined here) — but since login itself depends on Supabase being
 * configured, and that screen lives behind the login, these two lines are
 * what make the app usable on a fresh browser/device without that chicken-
 * and-egg problem.
 */
export const SUPABASE_URL = "https://jhgzywafedwbfsbhaalr.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_T_MTGjKpk1xGYonBxNfgfw_VLxVMp5e";
