import { findProvider } from "./provider-catalog.js";
import { getProviderAdapter, normalizeError } from "./provider-factory.js";
import { getSessionConfig } from "./session-config-store.js";
import { getSupabaseCredentials, isSupabaseConfigured } from "../supabase-settings-service.js";
import { getSupabaseClient } from "../../database/supabase-client.js";

/**
 * Routes every AI request to the right transport:
 *  - Local providers (Ollama/LM Studio) -- direct fetch from the browser to
 *    the user's own machine. There is no secret involved and no remote
 *    server could reach localhost anyway, so a relay would not even work.
 *  - Backend-only providers (Bedrock/Vertex) -- never build a request here;
 *    only ask the relay whether it has been configured with the right
 *    backend credentials.
 *  - Everything else (OpenAI, Anthropic, Gemini, DeepSeek, xAI, Mistral,
 *    Cohere, Perplexity, Manus, OpenRouter, Groq, Together, Fireworks,
 *    Azure OpenAI, Custom) -- relayed through the Supabase Edge Function at
 *    supabase/functions/ai-strategy-proxy, because (a) most of these APIs
 *    block direct browser CORS requests regardless of credentials, and
 *    (b) it keeps a permanently-configured (production) key from ever
 *    reaching the browser at all.
 *
 * This module never talks to Supabase tables -- it only reuses the existing
 * Supabase client to invoke the Edge Function and to read the already-
 * configured project URL, exactly like every other Supabase-aware service
 * in this app.
 */

function relayBaseUrl() {
  const { url } = getSupabaseCredentials();
  if (!url) return null;
  return `${url.replace(/\/$/, "")}/functions/v1/ai-strategy-proxy`;
}

async function relayAuthHeaders() {
  const { anonKey } = getSupabaseCredentials();
  const headers = { "Content-Type": "application/json", apikey: anonKey || "" };
  try {
    const client = await getSupabaseClient();
    const { data } = await client.auth.getSession();
    if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  } catch {
    // Falls back to the anon key alone -- the Edge Function's own
    // verify_jwt setting is the real access boundary in production.
  }
  return headers;
}

function linkExternalSignal(controller, externalSignal) {
  if (!externalSignal) return () => {};
  if (externalSignal.aborted) {
    controller.abort();
    return () => {};
  }
  const onAbort = () => controller.abort();
  externalSignal.addEventListener("abort", onAbort);
  return () => externalSignal.removeEventListener("abort", onAbort);
}

async function callRelay(payload, { timeoutMs = 30000, signal } = {}) {
  const base = relayBaseUrl();
  if (!base) {
    return { ok: false, error: { code: "relay_not_configured", message: "Configure o Supabase (Administração → Fonte de dados) para habilitar a Estratégia AI." } };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const unlink = linkExternalSignal(controller, signal);
  try {
    const headers = await relayAuthHeaders();
    const res = await fetch(base, { method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      return { ok: false, error: { code: "unknown_error", message: "O provedor retornou uma resposta inesperada." } };
    }
    if (!res.ok) {
      return { ok: false, error: normalizeError(res.status, text) };
    }
    return { ok: true, data: json };
  } catch (err) {
    if (err.name === "AbortError") {
      return signal?.aborted
        ? { ok: false, error: { code: "cancelled", message: "Geração cancelada." } }
        : { ok: false, error: { code: "timeout", message: "O provedor demorou demais para responder. Tente novamente." } };
    }
    return { ok: false, error: { code: "network_error", message: "Não foi possível contatar o provedor. Verifique a conexão e tente novamente." } };
  } finally {
    clearTimeout(timer);
    unlink();
  }
}

async function callLocalProvider(provider, config, adapter, params, { timeoutMs = 30000, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const unlink = linkExternalSignal(controller, signal);
  try {
    const { url, headers, body } = adapter.buildChatRequest(config, params);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: controller.signal });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: normalizeError(res.status, text) };
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: { code: "unknown_error", message: "A instância local retornou uma resposta inesperada." } };
    }
    return { ok: true, data: adapter.parseChatResponse(json) };
  } catch (err) {
    if (err.name === "AbortError") {
      return signal?.aborted
        ? { ok: false, error: { code: "cancelled", message: "Geração cancelada." } }
        : { ok: false, error: { code: "timeout", message: "A instância local demorou demais para responder." } };
    }
    return { ok: false, error: { code: "provider_unavailable", message: `Não foi possível conectar em ${provider.label}. Confirme que o serviço está em execução nesta máquina.` } };
  } finally {
    clearTimeout(timer);
    unlink();
  }
}

export const AIGatewayService = {
  /** True once Supabase (and therefore the relay) is reachable at all. */
  isRelayAvailable() {
    return isSupabaseConfigured();
  },

  /** Asks the relay whether a server-side (production) secret is configured for this provider, without ever exposing it. */
  async checkServerStatus(providerId) {
    const result = await callRelay({ mode: "status", providerId });
    if (!result.ok) return { configured: false, model: null };
    return { configured: !!result.data?.configured, model: result.data?.model || null };
  },

  async testConnection(config) {
    const provider = findProvider(config.provider);
    if (!provider) return { ok: false, error: { code: "unknown_provider", message: "Provedor não reconhecido." } };
    if (provider.family === "backend-only") {
      const status = await this.checkServerStatus(provider.id);
      return status.configured
        ? { ok: true, data: { text: "Credenciais de backend configuradas." } }
        : { ok: false, error: { code: "backend_not_configured", message: "Este provedor exige configuração no backend seguro (variáveis de ambiente/secrets) -- ainda não configurado." } };
    }

    const adapter = getProviderAdapter(provider.id);
    if (!adapter) return { ok: false, error: { code: "unsupported_provider", message: "Este provedor ainda não possui um adaptador implementado." } };

    const params = {
      model: config.model,
      messages: [{ role: "user", content: "Responda apenas com a palavra: ok" }],
      temperature: 0,
      maxTokens: 10,
      responseFormat: "text",
    };

    if (provider.isLocal) {
      return callLocalProvider(provider, config, adapter, params, { timeoutMs: config.timeoutMs });
    }

    const request = adapter.buildChatRequest(config, params);
    return callRelay({ mode: "test", providerId: provider.id, request }, { timeoutMs: config.timeoutMs });
  },

  async listModels(config) {
    const provider = findProvider(config.provider);
    if (!provider) return { ok: false, error: { code: "unknown_provider", message: "Provedor não reconhecido." } };
    const adapter = getProviderAdapter(provider.id);
    if (!adapter?.supportsListModels || !adapter.buildModelsRequest) {
      return { ok: false, error: { code: "not_supported", message: "Este provedor não permite listar modelos automaticamente." } };
    }

    if (provider.isLocal) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs || 10000);
      try {
        const { url, headers } = adapter.buildModelsRequest(config);
        const res = await fetch(url, { headers, signal: controller.signal });
        const json = await res.json();
        if (!res.ok) return { ok: false, error: normalizeError(res.status, JSON.stringify(json)) };
        return { ok: true, data: adapter.parseModelsResponse(json) };
      } catch {
        return { ok: false, error: { code: "provider_unavailable", message: `Não foi possível conectar em ${provider.label}.` } };
      } finally {
        clearTimeout(timer);
      }
    }

    const request = adapter.buildModelsRequest(config);
    const result = await callRelay({ mode: "models", providerId: provider.id, request });
    if (!result.ok) return result;
    return { ok: true, data: adapter.parseModelsResponse(result.data) };
  },

  /**
   * Generates a response. `responseFormat: "json"` is used for the
   * structured strategic-analysis payload; validated by
   * response-schema.js before the caller trusts it.
   */
  async generateResponse({ messages, responseFormat = "text", maxTokens, temperature, signal } = {}) {
    const config = getSessionConfig();
    const attempt = async (providerId, model) => {
      const provider = findProvider(providerId);
      if (!provider) return { ok: false, error: { code: "unknown_provider", message: "Provedor não configurado." } };
      if (provider.family === "backend-only") {
        return { ok: false, error: { code: "backend_not_configured", message: "Este provedor exige configuração no backend seguro." } };
      }
      const adapter = getProviderAdapter(provider.id);
      if (!adapter) return { ok: false, error: { code: "unsupported_provider", message: "Provedor sem adaptador implementado." } };

      const params = {
        model,
        messages,
        temperature: temperature ?? config.temperature,
        maxTokens: maxTokens ?? config.maxTokens,
        responseFormat: provider.capabilities.structuredJson ? responseFormat : "text",
      };

      if (provider.isLocal) {
        const result = await callLocalProvider(provider, { ...config, model }, adapter, params, { timeoutMs: config.timeoutMs, signal });
        return result.ok ? { ok: true, data: { ...result.data, usedFallback: false, provider: provider.id, model } } : result;
      }

      const request = adapter.buildChatRequest({ ...config, model }, params);
      const result = await callRelay({ mode: "generate", providerId: provider.id, request }, { timeoutMs: config.timeoutMs, signal });
      if (!result.ok) return result;
      const parsed = adapter.parseChatResponse(result.data);
      return { ok: true, data: { ...parsed, usedFallback: false, provider: provider.id, model } };
    };

    if (!config.provider || !config.model) {
      return { ok: false, error: { code: "not_configured", message: "Configure um provedor de inteligência artificial para utilizar as análises estratégicas." } };
    }

    const primary = await attempt(config.provider, config.model);
    const retryableCodes = ["timeout", "provider_unavailable", "rate_limited", "network_error"];
    if (primary.ok || !config.fallbackProvider || !retryableCodes.includes(primary.error?.code)) {
      return primary;
    }

    const fallback = await attempt(config.fallbackProvider, config.fallbackModel || config.model);
    if (fallback.ok) {
      return { ok: true, data: { ...fallback.data, usedFallback: true } };
    }
    return fallback;
  },

  /**
   * Streaming variant used by "Pergunte à Estratégia AI" for plain-text
   * answers (structured-JSON requests always use generateResponse(), since
   * a partial JSON object can't be safely rendered token-by-token).
   * `onChunk(text)` fires per token; returns an { abort() } handle so the
   * caller can wire a "Cancelar geração" button.
   */
  generateStreamingResponse({ messages, onChunk, onDone, onError }) {
    const config = getSessionConfig();
    const provider = findProvider(config.provider);
    const controller = new AbortController();

    (async () => {
      if (!provider || !config.model) {
        onError?.({ code: "not_configured", message: "Configure um provedor de inteligência artificial para utilizar as análises estratégicas." });
        return;
      }
      if (!provider.capabilities.streaming || provider.family === "backend-only") {
        const result = await this.generateResponse({ messages });
        if (result.ok) onChunk?.(result.data.text);
        else return onError?.(result.error);
        return onDone?.(result.ok ? result.data : null);
      }

      const adapter = getProviderAdapter(provider.id);
      const params = { model: config.model, messages, temperature: config.temperature, maxTokens: config.maxTokens, stream: true, responseFormat: "text" };
      const relayBase = relayBaseUrl();

      try {
        let response;
        if (provider.isLocal) {
          const { url, headers, body } = adapter.buildChatRequest(config, params);
          response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: controller.signal });
        } else {
          if (!relayBase) return onError?.({ code: "relay_not_configured", message: "Configure o Supabase para habilitar a Estratégia AI." });
          const request = adapter.buildChatRequest(config, params);
          const headers = await relayAuthHeaders();
          response = await fetch(relayBase, { method: "POST", headers, body: JSON.stringify({ mode: "generate", providerId: provider.id, request, stream: true }), signal: controller.signal });
        }

        if (!response.ok || !response.body) {
          const text = await response.text().catch(() => "");
          return onError?.(normalizeError(response.status, text));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content || json?.delta?.text || "";
              if (delta) {
                accumulated += delta;
                onChunk?.(delta);
              }
            } catch {
              // Ignore malformed SSE fragments rather than aborting the whole stream.
            }
          }
        }
        onDone?.({ text: accumulated, provider: provider.id, model: config.model });
      } catch (err) {
        if (err.name === "AbortError") return onDone?.(null);
        onError?.({ code: "network_error", message: "A conexão foi interrompida. Tente novamente." });
      }
    })();

    return { abort: () => controller.abort() };
  },
};
