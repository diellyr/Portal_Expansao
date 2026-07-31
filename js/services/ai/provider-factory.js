import { findProvider } from "./provider-catalog.js";
import * as runtime from "./provider-runtime.js";
import { anthropicAdapter } from "./providers/anthropic-adapter.js";
import { geminiAdapter } from "./providers/gemini-adapter.js";
import { cohereAdapter } from "./providers/cohere-adapter.js";
import { manusAdapter } from "./providers/manus-adapter.js";
import { backendOnlyAdapter } from "./providers/backend-only-adapter.js";

const ADAPTERS_BY_FAMILY = {
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  cohere: cohereAdapter,
  manus: manusAdapter,
  "backend-only": backendOnlyAdapter,
};

/**
 * Builds the request-shaping adapter for a given provider id. This is the
 * single place that maps a provider to its protocol logic -- everything
 * else (UI, gateway) works against `provider.capabilities` and this
 * adapter, never against a provider-id switch statement.
 */
export function getProviderAdapter(providerId) {
  const provider = findProvider(providerId);
  if (!provider) return null;

  if (provider.family === "openai-compatible") {
    return {
      provider,
      supportsListModels: provider.capabilities.listModels,
      buildChatRequest(config, params) {
        return {
          url: runtime.buildRequestUrl(provider, config, "/chat/completions"),
          headers: runtime.buildAuthHeaders(provider, config),
          body: runtime.buildChatBody({ model: config.model, ...params }),
        };
      },
      parseChatResponse: runtime.parseChatResponse,
      buildModelsRequest(config) {
        return { url: runtime.buildRequestUrl(provider, config, "/models"), headers: runtime.buildAuthHeaders(provider, config) };
      },
      parseModelsResponse: runtime.parseModelsResponse,
    };
  }

  const adapter = ADAPTERS_BY_FAMILY[provider.family];
  if (!adapter) return null;

  // gemini/anthropic/cohere/manus adapters take `provider` as an explicit
  // first argument (they need provider.defaultEndpoint etc.), but every
  // caller in ai-gateway-service.js invokes `adapter.buildChatRequest(config,
  // params)` / `adapter.buildModelsRequest(config)` -- the same 2-arg (or
  // 1-arg) shape the openai-compatible closure above already uses. Bind
  // `provider` here via closures so every adapter, regardless of family,
  // presents that same call shape to the gateway -- this is the one place
  // that reconciles the two, so no provider-specific branching leaks into
  // the gateway or the UI.
  const wrapped = { provider, supportsListModels: !!adapter.supportsListModels, isAsyncAgent: !!adapter.isAsyncAgent };
  if (adapter.buildChatRequest) wrapped.buildChatRequest = (config, params) => adapter.buildChatRequest(provider, config, params);
  if (adapter.parseChatResponse) wrapped.parseChatResponse = (json) => adapter.parseChatResponse(json);
  if (adapter.buildModelsRequest) wrapped.buildModelsRequest = (config) => adapter.buildModelsRequest(provider, config);
  if (adapter.parseModelsResponse) wrapped.parseModelsResponse = (json) => adapter.parseModelsResponse(json);
  if (adapter.buildSubmitRequest) wrapped.buildSubmitRequest = (config, params) => adapter.buildSubmitRequest(provider, config, params);
  if (adapter.parseSubmitResponse) wrapped.parseSubmitResponse = (json) => adapter.parseSubmitResponse(json);
  if (adapter.buildStatusRequest) wrapped.buildStatusRequest = (config, taskId) => adapter.buildStatusRequest(provider, config, taskId);
  if (adapter.parseStatusResponse) wrapped.parseStatusResponse = (json) => adapter.parseStatusResponse(json);
  return wrapped;
}

export { normalizeError } from "./provider-runtime.js";
