/**
 * Holds the "temporary strategy for testing" AI configuration described in
 * the Estratégia AI spec: provider, model and API key live ONLY in this
 * module-level variable for the lifetime of the current page/tab. There is
 * no `localStorage`/`sessionStorage`/cookie write anywhere in this file --
 * a refresh or closed tab loses everything, which is the explicit,
 * intentional trade-off of this mode (the UI must say so, see
 * estrategia-ai.js). This is the ONLY place in the whole module allowed to
 * hold an API key in memory; nothing else should cache it.
 *
 * In production, an administrator instead configures the provider as a
 * secret on the serverless relay itself (see supabase/functions/
 * ai-strategy-proxy) -- in that mode this store only ever holds the
 * non-secret status the relay reports (provider/model/configured), never a
 * key, and `hasSessionKey()` is false.
 */
let state = {
  provider: null,
  model: null,
  apiKey: "",
  baseUrl: "",
  extraFields: {},
  temperature: 0.3,
  maxTokens: 900,
  timeoutMs: 30000,
  streaming: true,
  language: "pt",
  fallbackProvider: null,
  fallbackModel: null,
  privacyReinforced: true,
  lastTestAt: null,
  lastTestStatus: "idle", // idle | testing | connected | error
  lastTestMessage: "",
  usingServerSecret: false,
};

export function getSessionConfig() {
  return { ...state, extraFields: { ...state.extraFields } };
}

export function updateSessionConfig(patch) {
  state = { ...state, ...patch };
  return getSessionConfig();
}

export function hasSessionKey() {
  return !!state.apiKey || state.usingServerSecret;
}

export function clearSessionKey() {
  state = { ...state, apiKey: "", lastTestStatus: "idle", lastTestMessage: "", lastTestAt: null };
}

export function restoreDefaults() {
  state = {
    ...state,
    temperature: 0.3,
    maxTokens: 900,
    timeoutMs: 30000,
    streaming: true,
    language: "pt",
    fallbackProvider: null,
    fallbackModel: null,
    privacyReinforced: true,
  };
  return getSessionConfig();
}
