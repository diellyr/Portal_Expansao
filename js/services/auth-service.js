import { AUTH_SESSION_KEY, DEMO_CREDENTIALS } from "../config/constants.js";

/**
 * Demonstration-only "authentication". Credentials live in the frontend and
 * there is no real security — see README for the Supabase migration plan.
 */
export function login(email, password) {
  if (email.trim().toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ email, loggedInAt: new Date().toISOString() }));
    return true;
  }
  return false;
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

export function logout() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}
