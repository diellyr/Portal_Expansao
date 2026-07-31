import { bootstrapPage } from "../app.js";
import { getCurrentUserProfile, isAdminProfile } from "../services/user-profile-service.js";
import { providersByCategory, findProvider, PROVIDERS } from "../services/ai/provider-catalog.js";
import { getSessionConfig, updateSessionConfig, hasSessionKey, clearSessionKey, restoreDefaults } from "../services/ai/session-config-store.js";
import { AIGatewayService } from "../services/ai/ai-gateway-service.js";
import { ContextFunctions } from "../services/ai/context-functions.js";
import { ALLOWED_FUNCTIONS, isAllowedFunction, buildFunctionSelectionMessages, buildAnalysisMessages, wrapAsData } from "../services/ai/prompt-builder.js";
import { validateStrategicResponse, sanitizeRelatedRecordIds } from "../services/ai/response-schema.js";
import { renderAiChart } from "../services/ai/chart-adapter.js";
import { AnomalyDetectionService } from "../services/ai/anomaly-detection-service.js";
import { ScenarioSimulatorService } from "../services/ai/scenario-simulator-service.js";
import { EvolutionService } from "../services/ai/evolution-service.js";
import { SuggestedQuestionsService } from "../services/ai/suggested-questions-service.js";
import { CityService } from "../services/city-service.js";
import { openModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { renderEmptyState } from "../components/empty-state.js";
import { el, qs, refreshIcons } from "../utils/dom-utils.js";
import { formatNumber } from "../utils/formatters.js";
import { downloadJSON } from "../utils/file-utils.js";

const ok = await bootstrapPage({ activeKey: "estrategia-ai", title: "Estratégia AI" });
if (ok) init();

let profile = null;
let isAdmin = false;
let cities = [];
let currentAbortController = null;
let chatHistory = [];
let lastResult = null;

async function init() {
  profile = await getCurrentUserProfile();
  isAdmin = isAdminProfile(profile);
  cities = await CityService.list();

  if (isAdmin) {
    qs("#ai-config-section").hidden = false;
    renderConfigForm();
  }

  renderStatusBar();
  await renderSuggestedQuestions();
  renderQuickActions();

  qs("#ai-ask-btn").addEventListener("click", () => askQuestion(qs("#ai-question-input").value));
  qs("#ai-question-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) askQuestion(qs("#ai-question-input").value);
  });
  qs("#ai-cancel-btn").addEventListener("click", () => currentAbortController?.abort());

  refreshIcons();
}

function renderStatusBar() {
  const config = getSessionConfig();
  const provider = config.provider ? findProvider(config.provider) : null;
  const ready = !!(provider && config.model);
  const bar = qs("#ai-status-bar");
  bar.innerHTML = "";
  bar.appendChild(
    el("span", { class: `badge ${ready ? "badge-success" : "badge-neutral"}` }, ready ? "IA configurada" : "IA não configurada")
  );
  if (provider) {
    bar.appendChild(el("span", { class: "ai-status-item" }, [el("strong", {}, "Provedor: "), provider.label]));
    bar.appendChild(el("span", { class: "ai-status-item" }, [el("strong", {}, "Modelo: "), config.model || "—"]));
  }
  bar.appendChild(
    el("span", { class: `ai-status-item` }, [
      el("i", { "data-lucide": config.privacyReinforced ? "shield-check" : "shield-alert", class: "icon icon-sm" }),
      config.privacyReinforced ? " Privacidade reforçada ativa" : " Privacidade reforçada desativada",
    ])
  );
  if (!isAdmin) {
    bar.appendChild(el("span", { class: "ai-status-item" }, "Configuração visível apenas para administradores."));
  }
  refreshIcons();
}

/* ------------------------------------------------------------------ */
/* Configuração da Inteligência Artificial (admin only)                */
/* ------------------------------------------------------------------ */

function renderConfigForm() {
  const container = qs("#ai-config-form");
  container.innerHTML = "";
  const config = getSessionConfig();

  container.appendChild(renderProviderGrid(config));
  if (config.provider) {
    container.appendChild(renderModelAndKeySection(config));
    container.appendChild(renderAdvancedSettings(config));
  }
  refreshIcons();
}

function renderProviderGrid(config) {
  const wrap = el("div", {});
  providersByCategory().forEach((cat) => {
    if (!cat.providers.length) return;
    const grid = el(
      "div",
      { class: "ai-provider-grid" },
      cat.providers.map((p) =>
        el(
          "button",
          { type: "button", class: `ai-provider-option${config.provider === p.id ? " active" : ""}` },
          [el("span", { class: "ai-provider-option-name" }, p.label), el("span", { class: "ai-provider-option-meta" }, p.authType === "backend_only" ? "Requer backend seguro" : p.isLocal ? "Servidor local" : "Chave de API")]
        )
      )
    );
    [...grid.children].forEach((btn, i) => {
      btn.addEventListener("click", () => {
        const provider = cat.providers[i];
        updateSessionConfig({ provider: provider.id, model: "", extraFields: {}, lastTestStatus: "idle" });
        renderConfigForm();
        renderStatusBar();
      });
    });
    wrap.appendChild(el("div", { class: "ai-provider-category" }, [el("div", { class: "ai-provider-category-label" }, cat.label), grid]));
  });
  return wrap;
}

function renderModelAndKeySection(config) {
  const provider = findProvider(config.provider);
  const wrap = el("div", { class: "form-grid", style: "margin-top: var(--space-4);" });

  // Model field
  const modelSelect = el(
    "select",
    { id: "ai-model-select", class: "form-control" },
    [
      el("option", { value: "" }, "Selecione um modelo"),
      ...provider.suggestedModels.map((m) => el("option", { value: m, selected: config.model === m ? true : undefined }, m)),
      el("option", { value: "__custom__" }, "Usar identificador personalizado…"),
    ]
  );
  modelSelect.addEventListener("change", (e) => {
    if (e.target.value === "__custom__") {
      const value = prompt("Identificador do modelo:", config.model || "");
      if (value) updateSessionConfig({ model: value.trim() });
      renderConfigForm();
    } else {
      updateSessionConfig({ model: e.target.value });
    }
    renderStatusBar();
  });

  const modelField = el("div", { class: "form-group" }, [
    el("label", {}, "Modelo"),
    modelSelect,
    provider.capabilities.listModels
      ? el("button", { type: "button", class: "btn btn-secondary btn-sm", style: "margin-top: 6px;", onClick: () => fetchModelList(provider, modelSelect) }, "Buscar modelos disponíveis")
      : null,
  ].filter(Boolean));

  wrap.appendChild(modelField);

  // Provider-specific fields
  if (provider.authType === "backend_only") {
    wrap.appendChild(
      el("div", { class: "alert alert-info", style: "grid-column: 1 / -1;" }, [
        el("i", { "data-lucide": "server", class: "icon icon-sm" }),
        el("span", {}, `${provider.label} exige credenciais configuradas apenas no backend seguro (variáveis de ambiente do relay). Este campo não solicita nenhuma credencial no navegador.`),
      ])
    );
  } else if (provider.authType !== "none") {
    wrap.appendChild(renderKeyField(config));
  }

  (provider.fields || []).forEach((field) => {
    if (["apiKey"].includes(field)) return;
    if (field === "baseUrl") {
      wrap.appendChild(renderTextField("baseUrl", provider.isLocal ? "URL local" : "Base URL", config.baseUrl || provider.defaultEndpoint || ""));
    } else if (field !== "modelId") {
      wrap.appendChild(renderExtraField(field, config));
    }
  });

  // Test connection / test simple response
  const testStatus = el("span", { class: `ai-test-status ${config.lastTestStatus}` }, testStatusLabel(config));
  const testBtn = el("button", { type: "button", class: "btn btn-secondary", onClick: () => runTestConnection(testStatus) }, "Testar conexão");
  const testResponseBtn = el("button", { type: "button", class: "btn btn-secondary", onClick: () => runTestResponse() }, "Testar resposta simples");
  wrap.appendChild(el("div", { style: "grid-column: 1 / -1; display:flex; align-items:center; gap: var(--space-2); flex-wrap: wrap;" }, [testBtn, testResponseBtn, testStatus]));

  if (provider.knownLimitations) {
    wrap.appendChild(el("p", { class: "text-muted", style: "grid-column: 1 / -1; font-size: var(--font-size-xs);" }, provider.knownLimitations));
  }

  return wrap;
}

function testStatusLabel(config) {
  const labels = { idle: "Aguardando teste", testing: "Testando…", connected: `Conectado${config.lastTestAt ? " — " + new Date(config.lastTestAt).toLocaleString("pt-BR") : ""}`, error: config.lastTestMessage || "Erro" };
  return labels[config.lastTestStatus] || "Aguardando teste";
}

function renderKeyField(config) {
  const wrap = el("div", { class: "form-group" });
  wrap.appendChild(el("label", {}, "Chave da API"));
  const inputWrap = el("div", { class: "ai-key-field-wrap" });
  const input = el("input", { type: "password", id: "ai-key-input", class: "form-control", value: config.apiKey || "", placeholder: hasSessionKey() ? "•••••••••••••••• (configurada nesta sessão)" : "Cole sua chave aqui" });
  input.addEventListener("input", (e) => updateSessionConfig({ apiKey: e.target.value }));
  const toggleBtn = el("button", { type: "button", class: "ai-key-toggle-btn", "aria-label": "Mostrar/ocultar chave" }, [el("i", { "data-lucide": "eye", class: "icon icon-sm" })]);
  toggleBtn.addEventListener("click", () => {
    input.type = input.type === "password" ? "text" : "password";
    toggleBtn.innerHTML = "";
    toggleBtn.appendChild(el("i", { "data-lucide": input.type === "password" ? "eye" : "eye-off", class: "icon icon-sm" }));
    refreshIcons();
  });
  inputWrap.appendChild(input);
  inputWrap.appendChild(toggleBtn);
  wrap.appendChild(inputWrap);
  wrap.appendChild(
    el("p", { class: "text-muted", style: "font-size: var(--font-size-xs); margin-top: 4px;" },
      "Modo temporário de teste: esta chave fica apenas na memória desta aba e é perdida ao atualizar ou fechar a página -- nunca é salva no navegador. Para uso em produção, configure a chave como variável de ambiente no backend seguro."
    )
  );
  return wrap;
}

function renderTextField(key, label, value) {
  const input = el("input", { type: "text", class: "form-control", value: value || "" });
  input.addEventListener("input", (e) => updateSessionConfig({ [key]: e.target.value }));
  return el("div", { class: "form-group" }, [el("label", {}, label), input]);
}

const EXTRA_FIELD_LABELS = {
  endpoint: "Endpoint",
  deployment: "Deployment",
  apiVersion: "Versão da API",
  region: "Região",
  projectId: "Project ID",
  providerName: "Nome do provedor",
  customAuthHeader: "Cabeçalho de autenticação (opcional)",
};

function renderExtraField(field, config) {
  const input = el("input", { type: "text", class: "form-control", value: config.extraFields[field] || "" });
  input.addEventListener("input", (e) => updateSessionConfig({ extraFields: { ...getSessionConfig().extraFields, [field]: e.target.value } }));
  return el("div", { class: "form-group" }, [el("label", {}, EXTRA_FIELD_LABELS[field] || field), input]);
}

function renderAdvancedSettings(config) {
  const wrap = el("div", { class: "surface", style: "padding: var(--space-4); margin-top: var(--space-4); background: var(--color-surface-alt);" });
  wrap.appendChild(el("h4", { style: "margin: 0 0 var(--space-3);" }, "Configurações avançadas"));

  const grid = el("div", { class: "form-grid" });
  grid.appendChild(numberField("Temperatura (criatividade)", config.temperature, 0, 1, 0.1, (v) => updateSessionConfig({ temperature: v })));
  grid.appendChild(numberField("Máximo de tokens", config.maxTokens, 100, 4000, 50, (v) => updateSessionConfig({ maxTokens: v })));
  grid.appendChild(numberField("Timeout (ms)", config.timeoutMs, 5000, 120000, 1000, (v) => updateSessionConfig({ timeoutMs: v })));

  const streamingCheckbox = el("input", { type: "checkbox", checked: config.streaming || undefined });
  streamingCheckbox.addEventListener("change", (e) => updateSessionConfig({ streaming: e.target.checked }));
  grid.appendChild(el("div", { class: "form-checkbox-row" }, [streamingCheckbox, el("label", {}, "Permitir respostas em streaming")]));

  const privacyCheckbox = el("input", { type: "checkbox", checked: config.privacyReinforced ? true : undefined });
  privacyCheckbox.addEventListener("change", (e) => {
    updateSessionConfig({ privacyReinforced: e.target.checked });
    renderStatusBar();
  });
  grid.appendChild(el("div", { class: "form-checkbox-row" }, [privacyCheckbox, el("label", {}, "Privacidade reforçada (recomendado)")]));

  const langSelect = el("select", { class: "form-control" }, [
    el("option", { value: "pt", selected: config.language === "pt" ? true : undefined }, "Português"),
    el("option", { value: "es", selected: config.language === "es" ? true : undefined }, "Español"),
    el("option", { value: "en", selected: config.language === "en" ? true : undefined }, "English"),
  ]);
  langSelect.addEventListener("change", (e) => updateSessionConfig({ language: e.target.value }));
  grid.appendChild(el("div", { class: "form-group" }, [el("label", {}, "Idioma padrão"), langSelect]));

  const fallbackCandidates = PROVIDERS.filter((p) => p.id !== config.provider && p.authType !== "backend_only");
  const fallbackProviderSelect = el(
    "select",
    { class: "form-control" },
    [
      el("option", { value: "" }, "Nenhum (sem fallback)"),
      ...fallbackCandidates.map((p) => el("option", { value: p.id, selected: config.fallbackProvider === p.id ? true : undefined }, p.label)),
    ]
  );
  fallbackProviderSelect.addEventListener("change", (e) => updateSessionConfig({ fallbackProvider: e.target.value || null, fallbackModel: null }));
  grid.appendChild(el("div", { class: "form-group" }, [el("label", {}, "Provedor alternativo (fallback)"), fallbackProviderSelect]));

  const fallbackModelInput = el("input", { type: "text", class: "form-control", value: config.fallbackModel || "", placeholder: "Identificador do modelo alternativo" });
  fallbackModelInput.addEventListener("input", (e) => updateSessionConfig({ fallbackModel: e.target.value }));
  grid.appendChild(el("div", { class: "form-group" }, [el("label", {}, "Modelo alternativo"), fallbackModelInput]));

  wrap.appendChild(grid);
  wrap.appendChild(
    el("p", { class: "text-muted", style: "font-size: var(--font-size-xs); margin-top: -6px;" },
      "O fallback é usado apenas em timeout, indisponibilidade ou limite de solicitações -- nunca em caso de chave inválida, falta de permissão ou dados insuficientes."
    )
  );

  const restoreBtn = el("button", { type: "button", class: "btn btn-ghost btn-sm", onClick: () => { restoreDefaults(); toast.success("Configurações avançadas restauradas."); renderConfigForm(); } }, "Restaurar padrões");
  const clearKeyBtn = el("button", { type: "button", class: "btn btn-ghost btn-sm", onClick: () => { clearSessionKey(); toast.success("Chave removida da sessão."); renderConfigForm(); renderStatusBar(); } }, "Limpar chave da sessão");
  wrap.appendChild(el("div", { style: "display:flex; gap: var(--space-2); margin-top: var(--space-2);" }, [restoreBtn, clearKeyBtn]));

  return wrap;
}

function numberField(label, value, min, max, step, onChange) {
  const input = el("input", { type: "number", class: "form-control", value, min, max, step });
  input.addEventListener("change", (e) => onChange(Number(e.target.value)));
  return el("div", { class: "form-group" }, [el("label", {}, label), input]);
}

async function fetchModelList(provider, selectEl) {
  toast.info("Buscando modelos disponíveis…");
  const result = await AIGatewayService.listModels(getSessionConfig());
  if (!result.ok) return toast.error(result.error.message);
  selectEl.innerHTML = "";
  selectEl.appendChild(el("option", { value: "" }, "Selecione um modelo"));
  result.data.forEach((m) => selectEl.appendChild(new Option(m, m)));
  selectEl.appendChild(el("option", { value: "__custom__" }, "Usar identificador personalizado…"));
  toast.success(`${result.data.length} modelo(s) encontrado(s).`);
}

async function runTestConnection(statusEl) {
  updateSessionConfig({ lastTestStatus: "testing" });
  statusEl.className = "ai-test-status testing";
  statusEl.textContent = "Testando…";
  const result = await AIGatewayService.testConnection(getSessionConfig());
  const now = new Date().toISOString();
  if (result.ok) {
    updateSessionConfig({ lastTestStatus: "connected", lastTestAt: now, lastTestMessage: "" });
    toast.success("Conexão validada com sucesso.");
  } else {
    updateSessionConfig({ lastTestStatus: "error", lastTestAt: now, lastTestMessage: result.error.message });
    toast.error(result.error.message);
  }
  renderConfigForm();
  renderStatusBar();
}

async function runTestResponse() {
  toast.info("Enviando pergunta de teste…");
  const result = await AIGatewayService.generateResponse({ messages: [{ role: "user", content: "Responda em uma frase curta: você está funcionando?" }] });
  if (!result.ok) return toast.error(result.error.message);
  toast.success(`Resposta: ${result.data.text.slice(0, 140)}`);
}

/* ------------------------------------------------------------------ */
/* Pergunte à Estratégia AI                                            */
/* ------------------------------------------------------------------ */

async function renderSuggestedQuestions() {
  const container = qs("#ai-suggested-questions");
  container.innerHTML = "";
  const suggestions = await SuggestedQuestionsService.getSuggestions();
  suggestions.forEach((q) => {
    const chip = el("button", { type: "button", class: "ai-suggested-chip" }, q);
    chip.addEventListener("click", () => {
      qs("#ai-question-input").value = q;
      askQuestion(q);
    });
    container.appendChild(chip);
  });
}

const CONTEXT_FUNCTION_DISPATCH = {
  getRegionalSummary: () => ContextFunctions.getRegionalSummary(),
  getCityComparison: (p) => ContextFunctions.getCityComparison(p.cityIds),
  getRegistrationQuality: () => ContextFunctions.getRegistrationQuality(),
  getBirthdays: (p) => ContextFunctions.getBirthdays({ period: p.period }),
  getYouthWithoutCounselor: () => ContextFunctions.getYouthWithoutCounselor(),
  getMinistryCoverage: (p) => ContextFunctions.getMinistryCoverage(p.cidadeId),
  getAgeDistribution: (p) => ContextFunctions.getAgeDistribution(p.cidadeId),
  getAvailableMusicians: (p) => ContextFunctions.getAvailableMusicians(p.cidadeId),
  getIncompleteRegistrations: () => ContextFunctions.getIncompleteRegistrations(),
  getCongregationDistribution: (p) => ContextFunctions.getCongregationDistribution(p.cityIds),
};

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text?.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function setGenerating(isGenerating) {
  qs("#ai-ask-btn").disabled = isGenerating;
  qs("#ai-cancel-btn").hidden = !isGenerating;
}

async function askQuestion(question) {
  if (!question || !question.trim()) return;
  const config = getSessionConfig();
  if (!config.provider || !config.model) {
    return renderNotConfigured();
  }

  setGenerating(true);
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;

  try {
    const scope = await ContextFunctions.getCurrentUserScope();
    const selectionResult = await AIGatewayService.generateResponse({ messages: buildFunctionSelectionMessages(question, scope.data), responseFormat: "json", signal });
    if (!selectionResult.ok) return renderError(selectionResult.error);

    const selection = tryParseJson(selectionResult.data.text);
    if (!selection || !selection.function) return renderInsufficientData(selection?.reason);
    if (!isAllowedFunction(selection.function)) return renderInsufficientData("A função solicitada não está disponível.");

    const functionResult = await CONTEXT_FUNCTION_DISPATCH[selection.function](selection.params || {});
    if (!functionResult || functionResult.meta?.insufficientData) return renderInsufficientData();

    let analysisMessages = buildAnalysisMessages(question, functionResult, selection.params);
    let analysisResult = await AIGatewayService.generateResponse({ messages: analysisMessages, responseFormat: "json", signal });
    if (!analysisResult.ok) return renderError(analysisResult.error);

    let parsed = tryParseJson(analysisResult.data.text);
    let validation = parsed ? validateStrategicResponse(parsed) : { valid: false, problems: ["Resposta não é um JSON válido."] };

    if (!validation.valid) {
      analysisMessages = [
        ...analysisMessages,
        { role: "assistant", content: analysisResult.data.text },
        { role: "user", content: wrapAsData(`Sua resposta anterior não seguiu o formato esperado (${validation.problems.join("; ")}). Responda novamente SOMENTE com o objeto JSON válido.`) },
      ];
      analysisResult = await AIGatewayService.generateResponse({ messages: analysisMessages, responseFormat: "json", signal });
      if (analysisResult.ok) {
        parsed = tryParseJson(analysisResult.data.text);
        validation = parsed ? validateStrategicResponse(parsed) : { valid: false, problems: ["Resposta não é um JSON válido."] };
      }
    }

    if (!validation.valid || !parsed) {
      return renderPlainTextFallback(analysisResult.data?.text || "");
    }

    const allowedIds = Array.isArray(functionResult.data) ? functionResult.data.map((r) => r.id).filter(Boolean) : [];
    parsed.relatedRecordIds = sanitizeRelatedRecordIds(parsed.relatedRecordIds, allowedIds);

    renderStructuredResult(parsed, {
      provider: analysisResult.data.provider,
      model: analysisResult.data.model,
      usedFallback: analysisResult.data.usedFallback,
      functionUsed: selection.function,
      functionMeta: functionResult.meta,
    });
    chatHistory.push({ question, result: parsed });
  } finally {
    setGenerating(false);
  }
}

/* ------------------------------------------------------------------ */
/* Result rendering                                                    */
/* ------------------------------------------------------------------ */

function showResultSection() {
  qs("#ai-result-section").hidden = false;
  qs("#ai-result-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderNotConfigured() {
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  renderEmptyState(card, {
    icon: "sparkles",
    title: "Configure um provedor de inteligência artificial para utilizar as análises estratégicas.",
    description: isAdmin ? "Use o card de Configuração no topo desta página." : "Peça a um administrador para configurar um provedor.",
  });
}

function renderInsufficientData(reason) {
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  renderEmptyState(card, { icon: "search-x", title: "Não existem dados suficientes no sistema para responder com segurança.", description: reason || "" });
}

function renderError(error) {
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  card.appendChild(el("div", { class: "alert alert-danger" }, [el("i", { "data-lucide": "alert-triangle", class: "icon icon-sm" }), el("span", {}, error.message)]));
  refreshIcons();
}

function renderPlainTextFallback(text) {
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  card.appendChild(el("div", { class: "alert alert-warning" }, "A resposta não seguiu o formato estruturado esperado -- exibindo como texto simples."));
  card.appendChild(el("p", { style: "white-space: pre-wrap;" }, text || "(resposta vazia)"));
  refreshIcons();
}

const SEVERITY_LABELS = { info: "Informativo", attention: "Atenção necessária", opportunity: "Oportunidade" };
const PRIORITY_LABELS = { high: "Alta", medium: "Média", low: "Baixa" };

function renderStructuredResult(payload, extra) {
  lastResult = payload;
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";

  const header = el("div", { class: "ai-result-header" }, [
    el("div", {}, [
      el("h4", { class: "ai-result-title" }, payload.title || "Análise"),
      el("div", { class: "ai-result-meta" }, `Provedor: ${extra.provider || "—"} · Modelo: ${extra.model || "—"}${extra.usedFallback ? " · (modelo alternativo usado)" : ""} · Dados analisados via ${extra.functionMeta?.source || extra.functionUsed || "—"} (${formatNumber(extra.functionMeta?.recordCount || 0)} registro(s))`),
    ]),
    el("div", { class: "ai-result-actions" }, [
      actionButton("copy", "Copiar resposta", () => copyResultText(payload)),
      actionButton("download", "Exportar relatório", () => downloadJSON(payload, `estrategia-ai-${Date.now()}.json`)),
    ]),
  ]);
  card.appendChild(header);

  if (payload.directAnswer) card.appendChild(el("p", { style: "font-size: var(--font-size-md); font-weight: 600;" }, payload.directAnswer));
  if (payload.summary) card.appendChild(el("p", { class: "text-muted" }, payload.summary));

  if (payload.findings?.length) {
    card.appendChild(el("h5", {}, "Principais descobertas"));
    payload.findings.forEach((f) => {
      card.appendChild(
        el("div", { class: `ai-finding severity-${f.severity || "info"}` }, [
          el("div", { class: "ai-finding-title" }, `${f.title || ""}${f.percentage !== undefined ? ` — ${f.percentage}%` : ""}`),
          el("div", {}, f.description || ""),
          el("div", { class: "text-muted", style: "font-size: var(--font-size-xs); margin-top: 2px;" }, SEVERITY_LABELS[f.severity] || ""),
        ])
      );
    });
  }

  if (payload.evidence?.length) {
    card.appendChild(el("h5", {}, "Evidências numéricas"));
    const table = el("table", { class: "ai-evidence-table" }, [
      el("thead", {}, el("tr", {}, [el("th", {}, "Indicador"), el("th", {}, "Valor"), el("th", {}, "Fonte")])),
      el("tbody", {}, payload.evidence.map((e) => el("tr", {}, [el("td", {}, e.metric || ""), el("td", {}, String(e.value ?? "")), el("td", {}, e.source || "")]))),
    ]);
    card.appendChild(table);
  }

  if (payload.chart) {
    const chartContainer = el("div", { class: "grid grid-charts", style: "margin: var(--space-4) 0;" });
    card.appendChild(chartContainer);
    renderAiChart(chartContainer, payload.chart);
  }

  if (payload.recommendations?.length) {
    card.appendChild(el("h5", {}, "Recomendações práticas"));
    payload.recommendations.forEach((r) => {
      card.appendChild(
        el("div", { class: "ai-recommendation" }, [
          el("div", { class: `ai-recommendation-priority ${r.priority || "medium"}` }, `Prioridade ${PRIORITY_LABELS[r.priority] || "média"}`),
          el("div", { style: "font-weight: 600;" }, r.action || ""),
          el("div", { class: "text-muted" }, r.reason || ""),
          el("div", { class: "ai-recommendation-note" }, "A decisão final pertence à liderança -- nenhuma ação é executada automaticamente."),
        ])
      );
    });
  }

  if (payload.filters && Object.keys(payload.filters).length) {
    card.appendChild(el("h5", {}, "Critérios e filtros utilizados"));
    card.appendChild(el("p", { class: "text-muted", style: "font-size: var(--font-size-sm);" }, JSON.stringify(payload.filters)));
  }

  if (payload.limitations?.length) {
    card.appendChild(el("h5", {}, "Limitações"));
    card.appendChild(el("ul", { class: "ai-limitations-list" }, payload.limitations.map((l) => el("li", {}, l))));
  }

  refreshIcons();
}

function actionButton(icon, label, onClick) {
  return el("button", { type: "button", class: "btn btn-secondary btn-sm", onClick }, [el("i", { "data-lucide": icon, class: "icon icon-sm" }), ` ${label}`]);
}

async function copyResultText(payload) {
  const lines = [payload.title, payload.directAnswer, payload.summary].filter(Boolean);
  (payload.recommendations || []).forEach((r) => lines.push(`- ${r.action}`));
  try {
    await navigator.clipboard.writeText(lines.join("\n\n"));
    toast.success("Resposta copiada.");
  } catch {
    toast.error("Não foi possível copiar automaticamente.");
  }
}

/* ------------------------------------------------------------------ */
/* Ações rápidas (13 cards covering the 15 features)                   */
/* ------------------------------------------------------------------ */

function quickActionCard({ icon, title, description, onClick }) {
  const card = el("button", { type: "button", class: "surface metric-card ai-quick-action-card", onClick }, [
    el("div", { class: "metric-card-top" }, [el("span", { class: "metric-card-title" }, title), el("div", { class: "metric-card-icon" }, [el("i", { "data-lucide": icon, class: "icon" })])]),
    el("div", { class: "metric-card-meta" }, description),
  ]);
  return card;
}

function renderQuickActions() {
  const container = qs("#ai-quick-actions");
  container.innerHTML = "";
  const actions = [
    { icon: "file-text", title: "Resumo executivo", description: "Regional, por cidade, administrativo ou para reunião com pastores.", onClick: openExecutiveSummaryModal },
    { icon: "lightbulb", title: "Recomendações estratégicas", description: "Transforma indicadores em ações sugeridas.", onClick: () => runAiCard("Recomendações estratégicas", buildRecommendationsData) },
    { icon: "calendar-plus", title: "Planejar evento", description: "Estimativas de público, líderes e checklist.", onClick: openEventPlannerModal },
    { icon: "list-checks", title: "Gerar pauta de reunião", description: "Pautas para reuniões regionais, locais ou administrativas.", onClick: openAgendaModal },
    { icon: "file-check-2", title: "Prestação de contas", description: "Relatório textual para liderança, pastores ou conselheiros.", onClick: openAccountabilityModal },
    { icon: "shield-check", title: "Qualidade dos dados", description: "Explica duplicados, datas incoerentes e campos ausentes.", onClick: runDataQualityCard },
    { icon: "activity", title: "Padrões incomuns", description: "Detecção estatística explicável -- sempre disponível, sem IA.", onClick: runAnomalyCard },
    { icon: "users", title: "Distribuir responsabilidades", description: "Sugestão de distribuição de jovens sem conselheiro.", onClick: runDistributionCard },
    { icon: "map-pin", title: "Planejar acompanhamento", description: "Lista priorizada de contatos e atualizações pendentes.", onClick: runVisitPlanningCard },
    { icon: "message-square-text", title: "Criar comunicação", description: "Textos para jovens, pais, conselheiros ou pastores.", onClick: openCommunicationModal },
    { icon: "music", title: "Cobertura ministerial", description: "Músicos, pregadores, cantores e diversidade por cidade.", onClick: runMinistryCoverageCard },
    { icon: "calculator", title: "Simular cenário", description: "Cálculos determinísticos: conselheiros, ônibus, distribuição.", onClick: openSimulatorModal },
    { icon: "trending-up", title: "Histórico de evolução", description: "Cadastros ao longo do tempo + comparação com arquivo importado.", onClick: openEvolutionModal },
  ];
  actions.forEach((a) => container.appendChild(quickActionCard(a)));
}

async function requestAiOrShowUnconfigured(messages, onOk) {
  const config = getSessionConfig();
  if (!config.provider || !config.model) return renderNotConfigured();
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  card.appendChild(el("p", { class: "text-muted" }, "Gerando análise…"));
  const result = await AIGatewayService.generateResponse({ messages, responseFormat: "json" });
  if (!result.ok) return renderError(result.error);
  const parsed = tryParseJson(result.data.text);
  const validation = parsed ? validateStrategicResponse(parsed) : { valid: false, problems: [] };
  if (!validation.valid || !parsed) return renderPlainTextFallback(result.data.text);
  onOk(parsed, result.data);
}

async function runAiCard(title, buildDataFn) {
  const { systemPrompt, data, filters } = await buildDataFn();
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Filtros: ${JSON.stringify(filters || {})}\n\nDados:\n${wrapAsData(JSON.stringify(data))}` },
  ];
  await requestAiOrShowUnconfigured(messages, (parsed, extra) => renderStructuredResult(parsed, { provider: extra.provider, model: extra.model, functionMeta: { source: title, recordCount: Array.isArray(data) ? data.length : 1 } }));
}

const RECOMMENDATION_SYSTEM_PROMPT =
  "Você é o assistente de estratégia do Portal Expansão. Gere recomendações práticas a partir dos indicadores fornecidos, seguindo o formato JSON padrão " +
  "(title, directAnswer, summary, findings, recommendations com action/reason/priority/requiresApproval, limitations). Nunca transforme correlação em causalidade. " +
  "A decisão final é sempre da liderança -- toda recomendação deve ter requiresApproval=true.";

async function buildRecommendationsData() {
  const [quality, withoutCounselor, anomalies] = await Promise.all([
    ContextFunctions.getRegistrationQuality(),
    ContextFunctions.getYouthWithoutCounselor(),
    AnomalyDetectionService.detect(),
  ]);
  return { systemPrompt: RECOMMENDATION_SYSTEM_PROMPT, data: { quality: quality.data.summary, withoutCounselor: withoutCounselor.data, anomalies: anomalies.anomalies }, filters: {} };
}

function openExecutiveSummaryModal() {
  const options = [
    ["regional", "Resumo regional"],
    ["cidade", "Resumo por cidade"],
    ["congregacao", "Resumo por congregação"],
    ["administrativo", "Resumo administrativo"],
    ["pastores", "Resumo para reunião com pastores"],
    ["semanal", "Resumo semanal"],
    ["mensal", "Resumo mensal"],
  ];
  const select = el("select", { class: "form-control" }, options.map(([v, l]) => el("option", { value: v }, l)));
  openModal({
    title: "Gerar análise estratégica",
    body: el("div", { class: "ai-modal-field" }, [el("label", {}, "Tipo de resumo"), select]),
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      { label: "Gerar", className: "btn btn-primary", onClick: () => generateExecutiveSummary(select.value, options.find((o) => o[0] === select.value)[1]) },
    ],
  });
}

const SUMMARY_SYSTEM_PROMPT =
  "Você é o assistente de estratégia do Portal Expansão. Gere um resumo executivo do tipo solicitado, com base apenas nos dados fornecidos, seguindo o " +
  "formato JSON padrão (title, directAnswer, summary, findings, evidence, recommendations, limitations). Nunca use os termos \"melhor cidade\", \"pior cidade\", " +
  "\"cidade vencedora\" ou \"último lugar\". Use frases como \"os dados mostram\" e nunca invente motivos para variações.";

async function generateExecutiveSummary(type, label) {
  const [summary, quality, withoutCounselor, birthdays] = await Promise.all([
    ContextFunctions.getRegionalSummary(),
    ContextFunctions.getRegistrationQuality(),
    ContextFunctions.getYouthWithoutCounselor(),
    ContextFunctions.getBirthdays({ period: "month" }),
  ]);
  const messages = [
    { role: "system", content: SUMMARY_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Tipo de resumo solicitado: ${label}\n\nDados:\n${wrapAsData(JSON.stringify({
        resumo: summary.data,
        qualidade: quality.data.summary,
        semConselheiro: withoutCounselor.data.total,
        aniversariantesNoMes: birthdays.data.length,
      }))}`,
    },
  ];
  await requestAiOrShowUnconfigured(messages, (parsed, extra) => renderStructuredResult(parsed, { provider: extra.provider, model: extra.model, functionMeta: { source: "getRegionalSummary + getRegistrationQuality", recordCount: summary.meta.recordCount } }));
}

function openEventPlannerModal() {
  const objectives = ["Encontro de adolescentes", "Ensaio regional", "Reunião de conselheiros", "Evento para músicos", "Culto regional", "Treinamento de lideranças", "Atualização cadastral", "Visita a uma cidade"];
  const select = el("select", { class: "form-control" }, objectives.map((o) => el("option", { value: o }, o)));
  const citySelect = el("select", { class: "form-control" }, [el("option", { value: "" }, "Todas as cidades"), ...cities.map((c) => el("option", { value: c.id }, c.nome))]);
  openModal({
    title: "Planejador de ações e eventos",
    body: el("div", {}, [
      el("div", { class: "ai-modal-field" }, [el("label", {}, "Objetivo"), select]),
      el("div", { class: "ai-modal-field" }, [el("label", {}, "Cidade (opcional)"), citySelect]),
    ]),
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      { label: "Planejar", className: "btn btn-primary", onClick: () => generateEventPlan(select.value, citySelect.value || null) },
    ],
  });
}

const EVENT_PLANNER_SYSTEM_PROMPT =
  "Você é o assistente de planejamento do Portal Expansão. Com base nos dados agregados fornecidos, sugira público estimado, programação, checklist e " +
  "comunicação inicial para o evento descrito, seguindo o formato JSON padrão. Nenhum convite é enviado automaticamente -- deixe isso claro nas limitations.";

async function generateEventPlan(objective, cidadeId) {
  const [ministryCoverage, ageDistribution, musicians] = await Promise.all([
    ContextFunctions.getMinistryCoverage(cidadeId),
    ContextFunctions.getAgeDistribution(cidadeId),
    ContextFunctions.getAvailableMusicians(cidadeId),
  ]);
  const messages = [
    { role: "system", content: EVENT_PLANNER_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Objetivo: ${wrapAsData(objective)}\n\nDados agregados:\n${wrapAsData(JSON.stringify({ cobertura: ministryCoverage.data, faixaEtaria: ageDistribution.data, musicosDisponiveis: musicians.data.length }))}`,
    },
  ];
  await requestAiOrShowUnconfigured(messages, (parsed, extra) => renderStructuredResult(parsed, { provider: extra.provider, model: extra.model, functionMeta: { source: "getMinistryCoverage + getAgeDistribution", recordCount: musicians.data.length } }));
}

function openAgendaModal() {
  const types = ["Reunião regional", "Reunião por cidade", "Reunião administrativa", "Reunião de conselheiros", "Reunião com pastores", "Reunião com músicos", "Planejamento de eventos"];
  const select = el("select", { class: "form-control" }, types.map((t) => el("option", { value: t }, t)));
  openModal({
    title: "Gerador de pauta para reunião",
    body: el("div", { class: "ai-modal-field" }, [el("label", {}, "Tipo de reunião"), select]),
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      { label: "Gerar pauta", className: "btn btn-primary", onClick: () => generateAgenda(select.value) },
    ],
  });
}

const AGENDA_SYSTEM_PROMPT =
  "Você é o assistente de reuniões do Portal Expansão. Gere uma pauta objetiva com base nos indicadores fornecidos: objetivo, indicadores principais, " +
  "problemas que precisam de decisão, pontos informativos, ações propostas (com responsáveis e prazos A DEFINIR pela liderança), e perguntas que a " +
  "liderança precisa responder. Use o formato JSON padrão.";

async function generateAgenda(meetingType) {
  const [summary, quality, withoutCounselor] = await Promise.all([ContextFunctions.getRegionalSummary(), ContextFunctions.getRegistrationQuality(), ContextFunctions.getYouthWithoutCounselor()]);
  const messages = [
    { role: "system", content: AGENDA_SYSTEM_PROMPT },
    { role: "user", content: `Tipo de reunião: ${wrapAsData(meetingType)}\n\nDados:\n${wrapAsData(JSON.stringify({ resumo: summary.data, qualidade: quality.data.summary, semConselheiro: withoutCounselor.data.total }))}` },
  ];
  await requestAiOrShowUnconfigured(messages, (parsed, extra) => renderStructuredResult(parsed, { provider: extra.provider, model: extra.model, functionMeta: { source: "getRegionalSummary + getRegistrationQuality", recordCount: summary.meta.recordCount } }));
}

function openAccountabilityModal() {
  const audiences = ["Liderança regional", "Pastores", "Conselheiros", "Administração", "Apresentação pública (dados agregados)"];
  const select = el("select", { class: "form-control" }, audiences.map((a) => el("option", { value: a }, a)));
  openModal({
    title: "Prestação de contas automática",
    body: el("div", { class: "ai-modal-field" }, [el("label", {}, "Destinatário"), select]),
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      { label: "Gerar relatório", className: "btn btn-primary", onClick: () => generateAccountabilityReport(select.value) },
    ],
  });
}

const ACCOUNTABILITY_SYSTEM_PROMPT =
  "Você é o assistente de prestação de contas do Portal Expansão. Gere um relatório textual profissional para o destinatário indicado, com escopo da " +
  "análise, quantidade de cadastros, indicadores, pendências, ações sugeridas e limitações. Nunca invente motivos para aumentos, reduções ou diferenças " +
  "-- use frases como \"os dados mostram\", nunca \"isso aconteceu porque\" sem evidência real. Use o formato JSON padrão.";

async function generateAccountabilityReport(audience) {
  const [summary, quality] = await Promise.all([ContextFunctions.getRegionalSummary(), ContextFunctions.getRegistrationQuality()]);
  const messages = [
    { role: "system", content: ACCOUNTABILITY_SYSTEM_PROMPT },
    { role: "user", content: `Destinatário: ${wrapAsData(audience)}\n\nDados:\n${wrapAsData(JSON.stringify({ resumo: summary.data, qualidade: quality.data.summary }))}` },
  ];
  await requestAiOrShowUnconfigured(messages, (parsed, extra) => renderStructuredResult(parsed, { provider: extra.provider, model: extra.model, functionMeta: { source: "getRegionalSummary + getRegistrationQuality", recordCount: summary.meta.recordCount } }));
}

async function runDataQualityCard() {
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  const quality = await ContextFunctions.getRegistrationQuality();
  const s = quality.data.summary;
  card.appendChild(el("h4", { class: "ai-result-title" }, "Qualidade dos dados"));
  card.appendChild(
    el("ul", {}, [
      el("li", {}, `Completude média: ${s.completudeMedia}%`),
      el("li", {}, `Cadastros incompletos: ${s.incompletos}`),
      el("li", {}, `Possíveis duplicados por nome: ${s.duplicidadesNome}`),
      el("li", {}, `Possíveis duplicados por telefone: ${s.duplicidadesTelefone}`),
      el("li", {}, `Inconsistências de data: ${s.inconsistenciasData}`),
      el("li", {}, `Cidades com grafia semelhante: ${s.cidadesSemelhantes}`),
      el("li", {}, `Congregações com grafia semelhante: ${s.congregacoesSemelhantes}`),
    ])
  );
  card.appendChild(el("p", { class: "text-muted" }, "Estes números vêm da Central de Qualidade dos Cadastros -- nada é corrigido automaticamente."));
  const aiBtn = el("button", { type: "button", class: "btn btn-secondary" }, "Pedir à IA para explicar em texto");
  aiBtn.addEventListener("click", () =>
    runAiCard("Qualidade dos cadastros", async () => ({
      systemPrompt: "Você é o assistente de qualidade de dados do Portal Expansão. Explique os indicadores fornecidos e sugira, sem aplicar, uma padronização. Use o formato JSON padrão.",
      data: s,
      filters: {},
    }))
  );
  card.appendChild(aiBtn);
  refreshIcons();
}

async function runAnomalyCard() {
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  const { anomalies, insufficientData } = await AnomalyDetectionService.detect();
  card.appendChild(el("h4", { class: "ai-result-title" }, "Detecção de padrões incomuns"));
  if (insufficientData || !anomalies.length) {
    renderEmptyState(card, { icon: "check-circle", title: "Nenhum padrão incomum identificado com os critérios estatísticos atuais." });
    return;
  }
  anomalies.forEach((a) => {
    card.appendChild(
      el("div", { class: "ai-finding severity-attention" }, [
        el("div", { class: "ai-finding-title" }, a.rule),
        el("div", {}, a.value),
        el("div", { class: "text-muted", style: "font-size: var(--font-size-xs);" }, a.reference),
        el("div", { style: "margin-top: 4px;" }, `Possíveis explicações: ${a.possibleExplanations.join("; ")}`),
        el("div", { style: "font-weight: 600; margin-top: 4px;" }, a.recommendation),
      ])
    );
  });
  refreshIcons();
}

async function runDistributionCard() {
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  const withoutCounselor = await ContextFunctions.getYouthWithoutCounselor();
  card.appendChild(el("h4", { class: "ai-result-title" }, "Distribuição de jovens sem conselheiro"));
  card.appendChild(el("p", {}, `Critério: jovens sem conselheiro local definido, agrupados por cidade (${withoutCounselor.data.total} no total).`));
  const rows = Object.entries(withoutCounselor.data.porCidade);
  if (!rows.length) {
    renderEmptyState(card, { icon: "check-circle", title: "Nenhum jovem sem conselheiro no momento." });
    return;
  }
  const table = el("table", { class: "ai-evidence-table" }, [
    el("thead", {}, el("tr", {}, [el("th", {}, "Cidade"), el("th", {}, "Jovens sem conselheiro")])),
    el("tbody", {}, rows.map(([cidade, qtd]) => el("tr", {}, [el("td", {}, cidade), el("td", {}, String(qtd))]))),
  ]);
  card.appendChild(table);
  card.appendChild(el("p", { class: "ai-recommendation-note" }, "Sugestão de distribuição para revisão -- nenhuma atribuição é feita automaticamente no sistema."));
  refreshIcons();
}

async function runVisitPlanningCard() {
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  const [withoutCounselor, incomplete, birthdays] = await Promise.all([
    ContextFunctions.getYouthWithoutCounselor(),
    ContextFunctions.getIncompleteRegistrations(),
    ContextFunctions.getBirthdays({ period: "week" }),
  ]);
  card.appendChild(el("h4", { class: "ai-result-title" }, "Planejamento de acompanhamento"));
  const priorityList = [
    ...withoutCounselor.data.registros.map((r) => ({ nome: r.nome, motivo: "Oportunidade de contato (sem conselheiro)" })),
    ...incomplete.data.map((r) => ({ nome: r.nome, motivo: `Necessidade de atualização (faltando: ${r.camposFaltando.join(", ")})` })),
    ...birthdays.data.map((r) => ({ nome: r.nome, motivo: "Aniversário nesta semana" })),
  ].slice(0, 30);
  if (!priorityList.length) {
    renderEmptyState(card, { icon: "check-circle", title: "Nenhuma pendência de acompanhamento no momento." });
    return;
  }
  const table = el("table", { class: "ai-evidence-table" }, [
    el("thead", {}, el("tr", {}, [el("th", {}, "#"), el("th", {}, "Nome"), el("th", {}, "Motivo")])),
    el("tbody", {}, priorityList.map((r, i) => el("tr", {}, [el("td", {}, String(i + 1)), el("td", {}, r.nome), el("td", {}, r.motivo)]))),
  ]);
  card.appendChild(table);
  refreshIcons();
}

function openCommunicationModal() {
  const audiences = ["Jovens", "Pais", "Conselheiros", "Pastores", "Dirigentes", "Músicos", "Administração"];
  const goals = ["Convite para evento", "Lembrete", "Atualização cadastral", "Agradecimento", "Resumo de reunião"];
  const tones = ["Formal", "Acolhedor", "Neutro"];
  const channels = ["WhatsApp", "E-mail", "Aviso", "Relatório"];
  const audienceSelect = el("select", { class: "form-control" }, audiences.map((a) => el("option", { value: a }, a)));
  const goalSelect = el("select", { class: "form-control" }, goals.map((g) => el("option", { value: g }, g)));
  const toneSelect = el("select", { class: "form-control" }, tones.map((t) => el("option", { value: t }, t)));
  const channelSelect = el("select", { class: "form-control" }, channels.map((c) => el("option", { value: c }, c)));
  const citySelect = el("select", { class: "form-control" }, [el("option", { value: "" }, "Todas as cidades"), ...cities.map((c) => el("option", { value: c.id }, c.nome))]);
  openModal({
    title: "Assistente de comunicação",
    body: el("div", {}, [
      el("div", { class: "ai-modal-field" }, [el("label", {}, "Público"), audienceSelect]),
      el("div", { class: "ai-modal-field" }, [el("label", {}, "Objetivo"), goalSelect]),
      el("div", { class: "ai-modal-field" }, [el("label", {}, "Tom"), toneSelect]),
      el("div", { class: "ai-modal-field" }, [el("label", {}, "Canal"), channelSelect]),
      el("div", { class: "ai-modal-field" }, [el("label", {}, "Cidade (opcional)"), citySelect]),
    ]),
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      { label: "Gerar texto", className: "btn btn-primary", onClick: () => generateCommunication(audienceSelect.value, goalSelect.value, toneSelect.value, channelSelect.value, citySelect.value || null) },
    ],
  });
}

const COMMUNICATION_SYSTEM_PROMPT =
  "Você é o assistente de comunicação do Portal Expansão. Gere um texto para o público, objetivo, tom e canal indicados, usando apenas dados agregados. " +
  "Nunca envie a mensagem -- apenas gere o texto para revisão humana. Use o formato JSON padrão, colocando o texto gerado em directAnswer.";

async function generateCommunication(audience, goal, tone, channel, cidadeId) {
  const summary = cidadeId ? await ContextFunctions.getMinistryCoverage(cidadeId) : await ContextFunctions.getRegionalSummary();
  const messages = [
    { role: "system", content: COMMUNICATION_SYSTEM_PROMPT },
    { role: "user", content: `Público: ${wrapAsData(audience)} | Objetivo: ${wrapAsData(goal)} | Tom: ${wrapAsData(tone)} | Canal: ${wrapAsData(channel)}\n\nContexto:\n${wrapAsData(JSON.stringify(summary.data))}` },
  ];
  await requestAiOrShowUnconfigured(messages, (parsed, extra) => renderStructuredResult(parsed, { provider: extra.provider, model: extra.model, functionMeta: { source: "getRegionalSummary/getMinistryCoverage", recordCount: 1 } }));
}

async function runMinistryCoverageCard() {
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  const coverage = await ContextFunctions.getMinistryCoverage();
  card.appendChild(el("h4", { class: "ai-result-title" }, "Cobertura ministerial"));
  card.appendChild(el("p", {}, `Total de músicos: ${coverage.data.totalMusicos} · Pregadores: ${coverage.data.totalPregadores} · Cantores: ${coverage.data.totalCantores}`));
  const chartContainer = el("div", { class: "grid grid-charts" });
  card.appendChild(chartContainer);
  renderAiChart(chartContainer, {
    type: "bar",
    title: "Músicos por cidade",
    labels: coverage.data.porCidade.map((c) => c.cidade),
    datasets: [{ label: "Músicos", data: coverage.data.porCidade.map((c) => c.musicos) }],
  });
  refreshIcons();
}

const SIMULATOR_FIELD_LABELS = {
  counselors: { input1: "Jovens por conselheiro", input2: null, input1Default: "10" },
  percentage: { input1: "Percentual enviado por cidade (%)", input2: null, input1Default: "20" },
  musicians: { input1: "Número de eventos", input2: null, input1Default: "3" },
  completeness: { input1: null, input2: null, input1Default: "10" },
  groups: { input1: "Total de participantes", input2: "Número de grupos", input1Default: "80", input2Default: "4" },
  capacity: { input1: "Total de participantes", input2: "Capacidade por ônibus/sala", input1Default: "80", input2Default: "40" },
};

function openSimulatorModal() {
  const scenarios = [
    ["counselors", "Quantos conselheiros seriam necessários?"],
    ["percentage", "Quantas pessoas participariam se cada cidade enviasse X%?"],
    ["musicians", "Como dividir músicos entre eventos?"],
    ["completeness", "Completude se metade das pendências fosse corrigida"],
    ["groups", "Dividir participantes entre grupos"],
    ["capacity", "Quantos ônibus/salas seriam necessários?"],
  ];
  const select = el("select", { class: "form-control", id: "sim-scenario" }, scenarios.map(([v, l]) => el("option", { value: v }, l)));
  const input1 = el("input", { type: "number", class: "form-control", id: "sim-input1", value: "10" });
  const input2 = el("input", { type: "number", class: "form-control", id: "sim-input2", value: "3" });
  const input1Label = el("label", {}, "Valor principal");
  const input2Label = el("label", {}, "Valor secundário");
  const input1Field = el("div", { class: "ai-modal-field" }, [input1Label, input1]);
  const input2Field = el("div", { class: "ai-modal-field" }, [input2Label, input2]);

  function applyScenarioFields(scenario) {
    const cfg = SIMULATOR_FIELD_LABELS[scenario] || {};
    input1Field.hidden = !cfg.input1;
    if (cfg.input1) {
      input1Label.textContent = cfg.input1;
      input1.value = cfg.input1Default || input1.value;
    }
    input2Field.hidden = !cfg.input2;
    if (cfg.input2) {
      input2Label.textContent = cfg.input2;
      input2.value = cfg.input2Default || input2.value;
    }
  }
  select.addEventListener("change", (e) => applyScenarioFields(e.target.value));
  applyScenarioFields(select.value);

  openModal({
    title: "Simulador de cenários",
    body: el("div", {}, [
      el("div", { class: "ai-modal-field" }, [el("label", {}, "Cenário"), select]),
      input1Field,
      input2Field,
    ]),
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      { label: "Simular", className: "btn btn-primary", onClick: () => runScenario(select.value, Number(input1.value), Number(input2.value)) },
    ],
  });
}

async function runScenario(scenario, val1, val2) {
  let result;
  if (scenario === "counselors") result = await ScenarioSimulatorService.counselorsNeeded(val1 || 10);
  else if (scenario === "percentage") result = await ScenarioSimulatorService.participantsIfCitiesSendPercentage(val1 || 20);
  else if (scenario === "musicians") result = await ScenarioSimulatorService.distributeMusiciansAcrossEvents(val1 || 3);
  else if (scenario === "completeness") result = await ScenarioSimulatorService.completenessIfHalfPendingFixed();
  else if (scenario === "groups") result = ScenarioSimulatorService.distributeIntoGroups(val1 || 10, val2 || 3);
  else if (scenario === "capacity") result = ScenarioSimulatorService.capacityNeeded(val1 || 10, val2 || 40);

  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  card.appendChild(el("h4", { class: "ai-result-title" }, "Simulação de cenário"));
  card.appendChild(el("p", { style: "font-family: monospace; font-size: var(--font-size-sm);" }, result.formula));
  card.appendChild(el("p", {}, [el("strong", {}, "Valores de entrada: "), JSON.stringify(result.inputs)]));
  card.appendChild(el("p", {}, [el("strong", {}, "Resultado: "), JSON.stringify(result.result)]));
  if (result.assumptions?.length) {
    card.appendChild(el("h5", {}, "Premissas"));
    card.appendChild(el("ul", { class: "ai-limitations-list" }, result.assumptions.map((a) => el("li", {}, a))));
  }
  refreshIcons();
}

function openEvolutionModal() {
  const fileInput = el("input", { type: "file", accept: ".csv,.xlsx,.xls,.json", class: "form-control" });
  openModal({
    title: "Histórico de evolução",
    body: el("div", {}, [
      el("p", { class: "text-muted" }, "Veja a evolução real de cadastros por mês, ou compare com um arquivo histórico (processado apenas neste navegador, nunca salvo)."),
      el("div", { class: "ai-modal-field" }, [el("label", {}, "Arquivo histórico (opcional) -- CSV, XLSX ou JSON"), fileInput]),
    ]),
    actions: [
      { label: "Fechar", className: "btn btn-secondary" },
      {
        label: "Analisar",
        className: "btn btn-primary",
        onClick: () => {
          if (fileInput.files[0]) runEvolutionWithFile(fileInput.files[0]);
          else runEvolutionReal();
        },
      },
    ],
  });
}

async function runEvolutionReal() {
  showResultSection();
  const card = qs("#ai-result-card");
  card.innerHTML = "";
  const evolution = await EvolutionService.getRegistrationEvolution({});
  card.appendChild(el("h4", { class: "ai-result-title" }, "Evolução de cadastros"));
  if (evolution.insufficientData) {
    renderEmptyState(card, { icon: "history", title: "Sem histórico suficiente", description: evolution.message });
    return;
  }
  evolution.byYear.forEach((y) => {
    const chartContainer = el("div", { class: "grid grid-charts", style: "margin-bottom: var(--space-3);" });
    card.appendChild(el("h5", {}, `Cadastros em ${y.year}`));
    card.appendChild(chartContainer);
    renderAiChart(chartContainer, { type: "line", title: `Cadastros por mês (${y.year})`, labels: evolution.labels, datasets: [{ label: "Cadastros", data: y.cadastros }] });
  });
  card.appendChild(el("h5", {}, "Limitações"));
  card.appendChild(el("ul", { class: "ai-limitations-list" }, evolution.limitations.map((l) => el("li", {}, l))));
  refreshIcons();
}

async function runEvolutionWithFile(file) {
  try {
    const { rows } = await EvolutionService.parseHistoricalFile(file);
    const comparison = await EvolutionService.compareWithImportedSnapshot(rows);
    showResultSection();
    const card = qs("#ai-result-card");
    card.innerHTML = "";
    card.appendChild(el("h4", { class: "ai-result-title" }, "Comparação com arquivo histórico"));
    card.appendChild(el("p", {}, `Total no arquivo: ${comparison.totalAnterior} · Total atual: ${comparison.totalAtual} · Diferença: ${comparison.diferencaTotal}${comparison.percentualCrescimento !== null ? ` (${comparison.percentualCrescimento}%)` : ""}`));
    const table = el("table", { class: "ai-evidence-table" }, [
      el("thead", {}, el("tr", {}, [el("th", {}, "Cidade"), el("th", {}, "Anterior"), el("th", {}, "Atual"), el("th", {}, "Diferença")])),
      el("tbody", {}, comparison.perCity.map((c) => el("tr", {}, [el("td", {}, c.cidade), el("td", {}, String(c.anterior)), el("td", {}, String(c.atual)), el("td", {}, String(c.diferenca))]))),
    ]);
    card.appendChild(table);
    card.appendChild(el("h5", {}, "Limitações"));
    card.appendChild(el("ul", { class: "ai-limitations-list" }, comparison.limitations.map((l) => el("li", {}, l))));
    refreshIcons();
  } catch (err) {
    toast.error(err.message || "Não foi possível processar o arquivo.");
  }
}

refreshIcons();
