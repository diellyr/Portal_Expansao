import { AUTH_SESSION_KEY } from "../config/constants.js";
import { getSupabaseClient } from "../database/supabase-client.js";
import { isSupabaseConfigured } from "./supabase-settings-service.js";

/**
 * Real authentication via Supabase Auth. The admin account is created
 * directly in the Supabase dashboard (Authentication → Users) — this app
 * never stores or hardcodes a password. sessionStorage only holds a local
 * flag so pages can guard navigation without re-checking Supabase on every
 * load; the actual security boundary is Supabase's own session + RLS
 * policies scoped to the `authenticated` role.
 */
export async function login(email, password) {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase não está configurado. Configure a URL e a chave anon em Administração → Fonte de dados antes de entrar.",
    };
  }

  let client;
  try {
    client = await getSupabaseClient();
  } catch (err) {
    return { ok: false, error: err.message };
  }

  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    return { ok: false, error: error.message === "Invalid login credentials" ? "E-mail ou senha inválidos." : error.message };
  }

  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ email: data.user.email, loggedInAt: new Date().toISOString() }));
  return { ok: true };
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getSession();
}

export async function logout() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  try {
    const client = await getSupabaseClient();
    await client.auth.signOut();
  } catch {
    // Best-effort: local session is already cleared above regardless.
  }
}
