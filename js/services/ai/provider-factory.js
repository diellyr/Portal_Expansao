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
  return { provider, supportsListModels: !!adapter.supportsListModels, ...adapter };
}

export { normalizeError } from "./provider-runtime.js";
