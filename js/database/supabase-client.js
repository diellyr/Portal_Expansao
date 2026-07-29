import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "../config/supabase-config.js";

const SUPABASE_JS_CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let clientPromise = null;

/** Lazily loads supabase-js from CDN and returns a singleton client. Throws a clear error if credentials aren't configured. */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase não está configurado. Preencha SUPABASE_URL e SUPABASE_ANON_KEY em js/config/supabase-config.js."
    );
  }
  if (!clientPromise) {
    clientPromise = import(/* @vite-ignore */ SUPABASE_JS_CDN_URL).then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    );
  }
  return clientPromise;
}
