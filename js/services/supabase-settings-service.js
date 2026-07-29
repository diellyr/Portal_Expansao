import { SUPABASE_URL as DEFAULT_URL, SUPABASE_ANON_KEY as DEFAULT_ANON_KEY } from "../config/supabase-config.js";

const URL_STORAGE_KEY = "portal_expansao_supabase_url";
const ANON_KEY_STORAGE_KEY = "portal_expansao_supabase_anon_key";

/**
 * Supabase credentials can come from two places: the static config file
 * (js/config/supabase-config.js, useful if you prefer to keep them in the
 * repo) or from this browser's localStorage (filled in via Administração →
 * Fonte de dados). localStorage always wins when both are set.
 */
export function getSupabaseCredentials() {
  const url = localStorage.getItem(URL_STORAGE_KEY) || DEFAULT_URL || "";
  const anonKey = localStorage.getItem(ANON_KEY_STORAGE_KEY) || DEFAULT_ANON_KEY || "";
  return { url, anonKey };
}

export function setSupabaseCredentials(url, anonKey) {
  localStorage.setItem(URL_STORAGE_KEY, (url || "").trim());
  localStorage.setItem(ANON_KEY_STORAGE_KEY, (anonKey || "").trim());
}

export function clearSupabaseCredentials() {
  localStorage.removeItem(URL_STORAGE_KEY);
  localStorage.removeItem(ANON_KEY_STORAGE_KEY);
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey);
}
