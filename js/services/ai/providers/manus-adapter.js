/**
 * Manus adapter -- deliberately NOT treated as "just another chat model".
 * Manus is built around asynchronous agent tasks (submit a task, poll its
 * status, fetch the result once finished) rather than a single synchronous
 * chat-completion call, so it gets its own request/response shape instead
 * of being forced through the OpenAI-compatible runtime.
 *
 * IMPORTANT: this adapter is implemented against Manus's documented
 * submit -> poll -> result task pattern as a best-effort integration.
 * Because the Estratégia AI module only ever needs a synchronous answer,
 * the gateway (ai-gateway-service.js) drives the poll loop itself and only
 * returns once the task reaches a terminal state (or times out). Before
 * relying on this in production, confirm the exact endpoint paths/payload
 * names against Manus's current API reference -- treat the paths below as
 * the best-effort default, not a guarantee.
 */
export const manusAdapter = {
  supportsListModels: false,
  isAsyncAgent: true,

  buildAuthHeaders(config) {
    return { Authorization: `Bearer ${config.apiKey || ""}` };
  },

  /** Step 1: submit the task. */
  buildSubmitRequest(provider, config, { messages, temperature, maxTokens }) {
    const prompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    const body = {
      input: prompt,
      temperature: temperature ?? 0.3,
      max_output_tokens: maxTokens ?? 900,
    };
    return { url: `${(config.baseUrl || provider.defaultEndpoint).replace(/\/$/, "")}/tasks`, headers: this.buildAuthHeaders(config), body };
  },

  parseSubmitResponse(json) {
    return { taskId: json?.id || json?.task_id || null, status: json?.status || "pending" };
  },

  /** Step 2: poll for completion. */
  buildStatusRequest(provider, config, taskId) {
    return { url: `${(config.baseUrl || provider.defaultEndpoint).replace(/\/$/, "")}/tasks/${encodeURIComponent(taskId)}`, headers: this.buildAuthHeaders(config) };
  },

  parseStatusResponse(json) {
    const status = json?.status || "pending";
    const isDone = status === "completed" || status === "succeeded" || status === "done";
    const isFailed = status === "failed" || status === "error";
    return { status, isDone, isFailed, text: isDone ? json?.output || json?.result || "" : "" };
  },
};
