let listeners = [];

/**
 * Tiny pub/sub so any layer (import-service, dual-write-service, repositories)
 * can push human-readable log lines that the Administração page renders live
 * in an on-screen console — useful for diagnosing Supabase issues (bad
 * credentials, RLS blocking a write, network failure) without opening the
 * browser DevTools.
 */
export function logImport(message, level = "info") {
  const entry = { time: new Date(), message, level };
  listeners.forEach((fn) => fn(entry));
  const consoleMethod = level === "error" ? "error" : level === "warning" ? "warn" : "log";
  console[consoleMethod](`[Importação] ${message}`);
}

export function onImportLog(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
