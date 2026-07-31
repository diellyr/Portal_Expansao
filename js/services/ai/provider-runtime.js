/**
 * Generic "OpenAI-compatible" runtime -- implements the AIProvider contract
 * (see provider-interface.js) once, shared by every provider whose chat-
 * completions API follows the OpenAI request/response shape (OpenAI itself,
 * DeepSeek, xAI, Mistral, OpenRouter, Groq, Together, Fireworks, Azure
 * OpenAI, Ollama, LM Studio, and Custom). This is what keeps provider logic
 * isolated in small config objects (provider-catalog.js) instead of
 * `if (provider === "openai") ... else if (...)` scattered across the UI.
 *
 * All requests go through `js/services/ai/ai-gateway-service.js`, which
 * decides whether to call this runtime directly (local providers only,
 * where there is no secret and no CORS-restricted remote API) or relay the
 * request through the serverless proxy (every remote/cloud provider, where
 * CORS and secret-handling both require a server hop).
 */

export function buildRequestUrl(provider, config, path) {
  const base = (config.baseUrl || provider.defaultEndpoint || "").replace(/\/$/, "");
  return `${base}${path}`;
}

export function buildAuthHeaders(provider, config) {
  if (provider.authType === "none") return {};
  if (provider.authType === "api_key_header") {
    return { [provider.authHeaderName || "api-key"]: config.apiKey || "" };
  }
  return { Authorization: `Bearer ${config.apiKey || ""}` };
}

/** Builds the JSON body for a chat-completions request, OpenAI shape. */
export function buildChatBody({ model, messages, temperature, maxTokens, stream, responseFormat }) {
  const body = {
    model,
    messages,
    temperature: temperature ?? 0.3,
    max_tokens: maxTokens ?? 900,
    stream: !!stream,
  };
  if (responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }
  return body;
}

/** Extracts the assistant text + usage from a non-streaming OpenAI-shape response. */
export function parseChatResponse(json) {
  const choice = json?.choices?.[0];
  const text = choice?.message?.content ?? "";
  const usage = json?.usage
    ? { inputTokens: json.usage.prompt_tokens ?? null, outputTokens: json.usage.completion_tokens ?? null }
    : { inputTokens: null, outputTokens: null };
  return { text, usage, finishReason: choice?.finish_reason ?? null };
}

/** Parses a models-list response (OpenAI shape: { data: [{ id }, ...] }). */
export function parseModelsResponse(json) {
  return (json?.data || []).map((m) => m.id).filter(Boolean);
}

/**
 * Turns a raw HTTP/network failure into one of a small set of friendly,
 * non-technical messages -- never surfaces a stack trace, raw provider
 * error body, or anything that could contain the API key.
 */
export function normalizeError(status, bodyText) {
  const safeBody = (bodyText || "").toLowerCase();
  if (status === 401 || status === 403 || safeBody.includes("invalid api key") || safeBody.includes("unauthorized")) {
    return { code: "invalid_key", message: "Não foi possível validar a chave. Verifique a credencial e tente novamente." };
  }
  if (status === 429 || safeBody.includes("rate limit") || safeBody.includes("quota")) {
    return { code: "rate_limited", message: "O provedor atingiu o limite de solicitações. Tente novamente mais tarde ou selecione outro modelo." };
  }
  if (status === 404) {
    return { code: "model_not_found", message: "O modelo informado não foi encontrado nesse provedor." };
  }
  if (status >= 500 || status === 0) {
    return { code: "provider_unavailable", message: "O provedor está indisponível no momento. Tente novamente em instantes." };
  }
  if (status === 413 || safeBody.includes("context") || safeBody.includes("too long")) {
    return { code: "context_too_large", message: "A pergunta ou os dados enviados são grandes demais para este modelo." };
  }
  return { code: "unknown_error", message: "Não foi possível concluir a solicitação. Tente novamente." };
}
