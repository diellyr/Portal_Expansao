import { getSupabaseClient } from "../database/supabase-client.js";
import { isSupabaseMode } from "./data-mode-service.js";
import { getSession } from "./auth-service.js";
import { toCamelCaseObject } from "../utils/case-utils.js";

let cachedProfile = null;
let cachedForEmail = null;

/**
 * Resolves the logged-in user's role/city from the `user_profiles` table.
 * Only meaningful in Supabase mode -- IndexedDB has no multi-user concept,
 * so it's treated as a single implicit admin (everyone who can log in has
 * full access, matching how the app worked before roles existed).
 */
export async function getCurrentUserProfile() {
  if (!isSupabaseMode()) {
    return { role: "admin", cidadeId: null };
  }

  const session = getSession();
  if (!session) return null;
  if (cachedProfile && cachedForEmail === session.email) return cachedProfile;

  const client = await getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData?.user?.id) return null;

  const { data, error } = await client.from("user_profiles").select("*").eq("user_id", authData.user.id).maybeSingle();
  if (error || !data) return null;

  cachedProfile = toCamelCaseObject(data);
  cachedForEmail = session.email;
  return cachedProfile;
}

export function clearCachedUserProfile() {
  cachedProfile = null;
  cachedForEmail = null;
}

export function isAdminProfile(profile) {
  return profile?.role === "admin";
}
