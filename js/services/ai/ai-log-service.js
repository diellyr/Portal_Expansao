let listeners = [];

/**
 * Tiny pub/sub for the Estratégia AI diagnostic console -- same pattern as
 * import-log-service.js. Lets ai-gateway-service.js push human-readable,
 * already-sanitized log lines that estrategia-ai.js renders live in an
 * on-screen console, so an administrator can see exactly what a failed
 * test/connection/generation attempt did (target URL, HTTP status, timing,
 * error code) without opening DevTools -- and without ever needing to paste
 * a screenshot of a raw error.
 *
 * SECURITY: callers must sanitize before calling logAi() -- this module
 * does not know which strings are safe. Use sanitizeForLog() below on any
 * URL or text that might carry a credential (e.g. Gemini's `?key=...` query
 * param) before it ever reaches here or the browser console.
 */
export function logAi(message, level = "info", meta = {}) {
  const entry = { time: new Date(), message, level, meta };
  listeners.forEach((fn) => fn(entry));
  const consoleMethod = level === "error" ? "error" : level === "warning" ? "warn" : "log";
  console[consoleMethod](`[Estratégia AI] ${message}`);
}

export function onAiLog(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

/**
 * Strips anything that looks like a credential from a URL or text before
 * it is ever logged -- query params named key/apikey/api_key/token/secret,
 * and long opaque tokens that look like API keys (sk-..., Bearer ...).
 * Never perfect, but this is defense-in-depth on top of the fact that no
 * caller should be passing a raw key into logAi() in the first place.
 */
export function sanitizeForLog(text) {
  if (!text) return "";
  let safe = String(text);
  safe = safe.replace(/([?&](?:key|apikey|api_key|token|access_token)=)[^&\s]+/gi, "$1***");
  safe = safe.replace(/\b(sk|pk)-[A-Za-z0-9_-]{8,}\b/g, "$1-***");
  safe = safe.replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, "Bearer ***");
  if (safe.length > 500) safe = `${safe.slice(0, 500)}… (truncado)`;
  return safe;
}
