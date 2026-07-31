/**
 * Cohere Chat API (v2) adapter -- messages shape is close to OpenAI's, but
 * the endpoint path, response envelope and JSON-mode flag differ enough to
 * warrant its own thin adapter instead of forcing it through the generic
 * OpenAI-compatible runtime.
 */
export const cohereAdapter = {
  supportsListModels: true,

  buildAuthHeaders(config) {
    return { Authorization: `Bearer ${config.apiKey || ""}` };
  },

  buildChatRequest(provider, config, { model, messages, temperature, maxTokens, responseFormat }) {
    const body = {
      model,
      messages,
      temperature: temperature ?? 0.3,
      max_tokens: maxTokens ?? 900,
      response_format: responseFormat === "json" ? { type: "json_object" } : undefined,
    };
    return { url: `${(config.baseUrl || provider.defaultEndpoint).replace(/\/$/, "")}/chat`, headers: this.buildAuthHeaders(config), body };
  },

  parseChatResponse(json) {
    const text = (json?.message?.content || []).map((c) => c.text || "").join("") || json?.text || "";
    const usage = json?.usage?.tokens
      ? { inputTokens: json.usage.tokens.input_tokens ?? null, outputTokens: json.usage.tokens.output_tokens ?? null }
      : { inputTokens: null, outputTokens: null };
    return { text, usage, finishReason: json?.finish_reason ?? null };
  },

  buildModelsRequest(provider, config) {
    return { url: `${(config.baseUrl || provider.defaultEndpoint).replace(/\/$/, "")}/models`, headers: this.buildAuthHeaders(config) };
  },

  parseModelsResponse(json) {
    return (json?.models || []).map((m) => m.name).filter(Boolean);
  },
};
