/**
 * Anthropic Messages API adapter. Different request/response shape from the
 * OpenAI-compatible family: system prompt is a top-level field (not a
 * "system" message). Anthropic does publish a models-listing endpoint
 * (`GET /v1/models`, no beta header) -- used here so "Buscar modelos
 * disponíveis" always reflects the real, current catalog instead of the
 * hardcoded `suggestedModels` fallback in provider-catalog.js.
 */
export const anthropicAdapter = {
  supportsListModels: true,

  buildAuthHeaders(config) {
    return { "x-api-key": config.apiKey || "", "anthropic-version": "2023-06-01" };
  },

  buildChatRequest(provider, config, { model, messages, temperature, maxTokens, stream, responseFormat }) {
    const systemMessage = messages.find((m) => m.role === "system");
    const otherMessages = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));
    const body = {
      model,
      system: responseFormat === "json" && systemMessage
        ? `${systemMessage.content}\n\nResponda apenas com um objeto JSON válido, sem texto fora do JSON.`
        : systemMessage?.content,
      messages: otherMessages,
      max_tokens: maxTokens ?? 900,
      temperature: temperature ?? 0.3,
      stream: !!stream,
    };
    return { url: `${(config.baseUrl || provider.defaultEndpoint).replace(/\/$/, "")}/messages`, headers: this.buildAuthHeaders(config), body };
  },

  parseChatResponse(json) {
    const text = (json?.content || []).map((block) => block.text || "").join("");
    const usage = json?.usage
      ? { inputTokens: json.usage.input_tokens ?? null, outputTokens: json.usage.output_tokens ?? null }
      : { inputTokens: null, outputTokens: null };
    return { text, usage, finishReason: json?.stop_reason ?? null };
  },

  buildModelsRequest(provider, config) {
    return {
      url: `${(config.baseUrl || provider.defaultEndpoint).replace(/\/$/, "")}/models?limit=1000`,
      headers: this.buildAuthHeaders(config),
    };
  },

  /** Anthropic's Models API paginates with { data: [{ id }, ...], has_more }, same field name as the OpenAI shape. */
  parseModelsResponse(json) {
    return (json?.data || []).map((m) => m.id).filter(Boolean);
  },
};
