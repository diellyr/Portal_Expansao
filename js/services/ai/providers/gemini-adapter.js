/**
 * Google Gemini (Generative Language API) adapter. Uses generateContent,
 * a "contents" array of { role, parts: [{ text }] } instead of "messages",
 * and puts generation options under generationConfig.
 */
export const geminiAdapter = {
  supportsListModels: true,

  buildChatRequest(provider, config, { model, messages, temperature, maxTokens, responseFormat }) {
    const systemMessage = messages.find((m) => m.role === "system");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const body = {
      contents,
      systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
      generationConfig: {
        temperature: temperature ?? 0.3,
        maxOutputTokens: maxTokens ?? 900,
        responseMimeType: responseFormat === "json" ? "application/json" : "text/plain",
      },
    };
    const base = (config.baseUrl || provider.defaultEndpoint).replace(/\/$/, "");
    const url = `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey || "")}`;
    return { url, headers: {}, body };
  },

  parseChatResponse(json) {
    const candidate = json?.candidates?.[0];
    const text = (candidate?.content?.parts || []).map((p) => p.text || "").join("");
    const usage = json?.usageMetadata
      ? { inputTokens: json.usageMetadata.promptTokenCount ?? null, outputTokens: json.usageMetadata.candidatesTokenCount ?? null }
      : { inputTokens: null, outputTokens: null };
    return { text, usage, finishReason: candidate?.finishReason ?? null };
  },

  buildModelsRequest(provider, config) {
    const base = (config.baseUrl || provider.defaultEndpoint).replace(/\/$/, "");
    return { url: `${base}/models?key=${encodeURIComponent(config.apiKey || "")}`, headers: {} };
  },

  parseModelsResponse(json) {
    return (json?.models || [])
      .map((m) => (m.name || "").replace(/^models\//, ""))
      .filter(Boolean);
  },
};
