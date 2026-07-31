/**
 * Estratégia AI -- central catalog of every AI provider the module supports.
 * This is pure data (never executes anything): name, category, auth shape,
 * required fields, and capability flags. `js/services/ai/provider-factory.js`
 * reads this to decide which runtime/adapter to use for a given provider,
 * so no provider-specific `if`/`switch` is scattered through the UI --
 * components only ever read `provider.capabilities` and render generically.
 *
 * `authType`:
 *   - "api_key"        simple bearer/api-key header
 *   - "api_key_header" like api_key but a custom header name (e.g. Azure's api-key)
 *   - "backend_only"   cannot accept a browser-supplied secret at all --
 *                       must be configured as a platform/serverless secret
 *   - "none"           local server, no credential (Ollama/LM Studio)
 *
 * `family` tells the provider-factory which runtime engine to instantiate:
 *   - "openai-compatible" chat-completions shape (covers the large majority)
 *   - "anthropic"         Messages API shape
 *   - "gemini"            generateContent shape
 *   - "cohere"            Cohere chat shape
 *   - "manus"             async agent/task shape (submit -> poll -> result)
 *   - "backend-only"      no direct client runtime; status comes from the
 *                          serverless relay's own configuration
 */

export const PROVIDER_CATEGORIES = [
  { key: "direct", label: "APIs diretas" },
  { key: "gateway", label: "Agregadores e gateways" },
  { key: "enterprise", label: "Plataformas corporativas" },
  { key: "local", label: "Modelos locais" },
  { key: "custom", label: "Personalizado" },
];

export const PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    category: "direct",
    family: "openai-compatible",
    authType: "api_key",
    defaultEndpoint: "https://api.openai.com/v1",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: true, agentTasks: false },
    knownLimitations: "Requer chave com créditos ativos; alguns modelos exigem verificação de organização.",
    suggestedModels: ["gpt-5", "gpt-5-mini", "gpt-4o", "gpt-4o-mini", "o3-mini"],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    category: "direct",
    family: "gemini",
    authType: "api_key",
    defaultEndpoint: "https://generativelanguage.googleapis.com/v1beta",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: true, agentTasks: false },
    knownLimitations: "Listagem de modelos reflete a chave (Google AI Studio) e pode variar por região.",
    suggestedModels: ["gemini-3-pro", "gemini-3-flash", "gemini-2.0-flash", "gemini-1.5-pro"],
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    category: "direct",
    family: "anthropic",
    authType: "api_key",
    defaultEndpoint: "https://api.anthropic.com/v1",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: true, agentTasks: false },
    knownLimitations: "",
    suggestedModels: ["claude-sonnet-5", "claude-opus-5", "claude-fable-5", "claude-haiku-4-5"],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    category: "direct",
    family: "openai-compatible",
    authType: "api_key",
    defaultEndpoint: "https://api.deepseek.com/v1",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: true, agentTasks: false },
    knownLimitations: "",
    suggestedModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "xai",
    label: "xAI Grok",
    category: "direct",
    family: "openai-compatible",
    authType: "api_key",
    defaultEndpoint: "https://api.x.ai/v1",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: true, agentTasks: false },
    knownLimitations: "",
    suggestedModels: ["grok-2-latest", "grok-beta"],
  },
  {
    id: "mistral",
    label: "Mistral AI",
    category: "direct",
    family: "openai-compatible",
    authType: "api_key",
    defaultEndpoint: "https://api.mistral.ai/v1",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: true, agentTasks: false },
    knownLimitations: "",
    suggestedModels: ["mistral-large-latest", "mistral-small-latest"],
  },
  {
    id: "cohere",
    label: "Cohere",
    category: "direct",
    family: "cohere",
    authType: "api_key",
    defaultEndpoint: "https://api.cohere.com/v2",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: true, agentTasks: false },
    knownLimitations: "",
    suggestedModels: ["command-r-plus", "command-r"],
  },
  {
    id: "perplexity",
    label: "Perplexity",
    category: "direct",
    family: "openai-compatible",
    authType: "api_key",
    defaultEndpoint: "https://api.perplexity.ai",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: false, tools: false, listModels: false, agentTasks: false },
    knownLimitations: "Focado em respostas com busca; suporte a JSON estruturado é limitado -- respostas podem cair para texto simples.",
    suggestedModels: ["sonar", "sonar-pro"],
  },
  {
    id: "manus",
    label: "Manus",
    category: "direct",
    family: "manus",
    authType: "api_key",
    defaultEndpoint: "https://api.manus.im/v1",
    fields: ["apiKey"],
    capabilities: { streaming: false, structuredJson: true, tools: true, listModels: false, agentTasks: true },
    knownLimitations: "Integração preparada para o fluxo assíncrono de tarefas/agente do Manus (enviar tarefa -> consultar status -> obter resultado). Como a Estratégia AI só precisa de respostas síncronas, o adaptador aguarda a conclusão da tarefa antes de retornar -- confirme o contrato de API mais recente do provedor antes de usar em produção.",
    suggestedModels: [],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    category: "gateway",
    family: "openai-compatible",
    authType: "api_key",
    defaultEndpoint: "https://openrouter.ai/api/v1",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: true, agentTasks: false },
    knownLimitations: "Repassa para dezenas de modelos de terceiros -- capacidades reais variam conforme o modelo escolhido.",
    suggestedModels: ["openai/gpt-4o", "anthropic/claude-sonnet-5"],
  },
  {
    id: "groq",
    label: "Groq",
    category: "gateway",
    family: "openai-compatible",
    authType: "api_key",
    defaultEndpoint: "https://api.groq.com/openai/v1",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: true, agentTasks: false },
    knownLimitations: "",
    suggestedModels: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
  },
  {
    id: "together",
    label: "Together AI",
    category: "gateway",
    family: "openai-compatible",
    authType: "api_key",
    defaultEndpoint: "https://api.together.xyz/v1",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: false, listModels: true, agentTasks: false },
    knownLimitations: "",
    suggestedModels: ["meta-llama/Llama-3.3-70B-Instruct-Turbo"],
  },
  {
    id: "fireworks",
    label: "Fireworks AI",
    category: "gateway",
    family: "openai-compatible",
    authType: "api_key",
    defaultEndpoint: "https://api.fireworks.ai/inference/v1",
    fields: ["apiKey"],
    capabilities: { streaming: true, structuredJson: true, tools: false, listModels: true, agentTasks: false },
    knownLimitations: "",
    suggestedModels: ["accounts/fireworks/models/llama-v3p3-70b-instruct"],
  },
  {
    id: "azure_openai",
    label: "Azure OpenAI",
    category: "enterprise",
    family: "openai-compatible",
    authType: "api_key_header",
    authHeaderName: "api-key",
    fields: ["endpoint", "apiKey", "deployment", "apiVersion"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: false, agentTasks: false },
    knownLimitations: "O endpoint, deployment e versão de API são específicos do recurso Azure do administrador -- não há um endpoint padrão universal.",
    suggestedModels: [],
  },
  {
    id: "bedrock",
    label: "AWS Bedrock",
    category: "enterprise",
    family: "backend-only",
    authType: "backend_only",
    fields: ["region", "modelId"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: false, agentTasks: false },
    knownLimitations: "Requer credenciais AWS (role/IAM) configuradas apenas no backend seguro -- o front-end nunca solicita access key/secret key permanentes.",
    suggestedModels: [],
  },
  {
    id: "vertex_ai",
    label: "Google Vertex AI",
    category: "enterprise",
    family: "backend-only",
    authType: "backend_only",
    fields: ["projectId", "region", "modelId"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: false, agentTasks: false },
    knownLimitations: "Requer uma conta de serviço (service account) configurada apenas no backend seguro -- o front-end nunca recebe essa credencial.",
    suggestedModels: [],
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    category: "local",
    family: "openai-compatible",
    authType: "none",
    isLocal: true,
    defaultEndpoint: "http://localhost:11434/v1",
    fields: ["baseUrl"],
    capabilities: { streaming: true, structuredJson: true, tools: false, listModels: true, agentTasks: false },
    knownLimitations: "Depende de uma instância local acessível pelo navegador -- indisponível se o Ollama não estiver em execução na máquina do usuário.",
    suggestedModels: [],
  },
  {
    id: "lmstudio",
    label: "LM Studio (local)",
    category: "local",
    family: "openai-compatible",
    authType: "none",
    isLocal: true,
    defaultEndpoint: "http://localhost:1234/v1",
    fields: ["baseUrl"],
    capabilities: { streaming: true, structuredJson: true, tools: false, listModels: true, agentTasks: false },
    knownLimitations: "Depende de uma instância local acessível pelo navegador -- indisponível se o LM Studio não estiver em execução na máquina do usuário.",
    suggestedModels: [],
  },
  {
    id: "custom_openai",
    label: "API personalizada (compatível com OpenAI)",
    category: "custom",
    family: "openai-compatible",
    authType: "api_key",
    fields: ["providerName", "baseUrl", "apiKey", "modelId", "customAuthHeader"],
    capabilities: { streaming: true, structuredJson: true, tools: true, listModels: true, agentTasks: false },
    knownLimitations: "Capacidades reais dependem do endpoint informado -- confirme que ele segue o formato de chat completions da OpenAI.",
    suggestedModels: [],
  },
];

export function findProvider(id) {
  return PROVIDERS.find((p) => p.id === id) || null;
}

export function providersByCategory() {
  return PROVIDER_CATEGORIES.map((cat) => ({
    ...cat,
    providers: PROVIDERS.filter((p) => p.category === cat.key),
  }));
}
