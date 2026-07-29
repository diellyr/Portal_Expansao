import { getSupabaseCredentials, isSupabaseConfigured } from "../services/supabase-settings-service.js";

const SUPABASE_JS_CDN_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let clientPromise = null;
let cachedCredentialsKey = null;

/**
 * Lazily loads supabase-js from CDN and returns a client for the currently
 * configured credentials. Re-creates the client if the credentials changed
 * since the last call (e.g. the admin just saved new ones), so a full page
 * reload isn't required after configuring Supabase.
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase não está configurado. Preencha a URL e a chave anon em Administração → Fonte de dados."
    );
  }
  const { url, anonKey } = getSupabaseCredentials();
  const credentialsKey = `${url}::${anonKey}`;
  if (!clientPromise || cachedCredentialsKey !== credentialsKey) {
    cachedCredentialsKey = credentialsKey;
    clientPromise = import(/* @vite-ignore */ SUPABASE_JS_CDN_URL).then(({ createClient }) =>
      createClient(url, anonKey)
    );
  }
  return clientPromise;
}
