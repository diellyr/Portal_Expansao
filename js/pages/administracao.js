import { bootstrapPage } from "../app.js";
import { CityService } from "../services/city-service.js";
import { BackupService } from "../services/backup-service.js";
import { ImportHistoryRepository } from "../repositories/import-history-repository.js";
import { EXPECTED_FIELDS, suggestMapping, mapRecords, analyzeImport, commitImport, buildErrorsCSV, diffHeaders } from "../services/import-service.js";
import { parseCSV, toCSV } from "../parsers/csv-parser.js";
import { readWorkbook, listSheetNames, parseSheet } from "../parsers/excel-parser.js";
import { readFileAsText, readFileAsArrayBuffer, getFileExtension, downloadCSV } from "../utils/file-utils.js";
import { renderDataTable } from "../components/data-table.js";
import { openModal, confirmModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { el, qs, qsa, debounce, refreshIcons } from "../utils/dom-utils.js";
import { getDataMode, setDataMode, DATA_MODES } from "../services/data-mode-service.js";
import {
  getSupabaseCredentials,
  setSupabaseCredentials,
  clearSupabaseCredentials,
  isSupabaseConfigured,
} from "../services/supabase-settings-service.js";

const ok = await bootstrapPage({ activeKey: "administracao", title: "Administração" });
if (ok) init();

let cities = [];
let historyEntries = [];
let historySearch = "";

let currentAnalysis = null;
let currentFileName = "";
let currentFileFormat = "";
let duplicateStrategy = "ignorar";

async function init() {
  // Wired up first and unconditionally: if the active data source is broken
  // (e.g. Supabase misconfigured), the user must still be able to reach this
  // switch to get back to a working backend.
  setupDataMode();
  setupDropzone();
  setupTemplates();
  setupBackup();
  setupDemoData();
  setupDangerZone();

  try {
    cities = await CityService.list();
  } catch (err) {
    console.error("Falha ao carregar cidades:", err);
    toast.error("Não foi possível carregar dados do banco ativo. Verifique a fonte de dados acima.");
    cities = [];
  }
  const citySelect = qs("#delete-city-select");
  cities.forEach((c) => citySelect.appendChild(new Option(c.nome, c.id)));

  qs("#history-search").addEventListener(
    "input",
    debounce((e) => {
      historySearch = e.target.value;
      renderHistory();
    }, 250)
  );
  qs("#clear-history-btn").addEventListener("click", async () => {
    const confirmed = await confirmModal({ title: "Apagar histórico", message: "Deseja apagar todo o histórico de importações?", confirmLabel: "Apagar", danger: true });
    if (!confirmed) return;
    await BackupService.deleteImportHistory();
    toast.success("Histórico apagado.");
    await loadHistory();
  });

  await loadHistory();
}

/* ---------------- Import wizard ---------------- */

function setupDropzone() {
  const dropzone = qs("#dropzone");
  const fileInput = qs("#file-input");

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
  });
  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
    fileInput.value = "";
  });
}

async function handleFile(file) {
  const ext = getFileExtension(file.name);
  if (![".csv", ".xls", ".xlsx"].includes(ext)) {
    toast.error("Formato de arquivo inválido. Use .csv, .xls ou .xlsx.");
    return;
  }

  currentFileName = file.name;
  currentFileFormat = ext.replace(".", "");

  try {
    if (ext === ".csv") {
      const text = await readFileAsText(file);
      const { headers, records } = parseCSV(text);
      if (!records.length) return toast.error("Arquivo CSV vazio ou sem dados.");
      renderMappingStep(headers, records);
    } else {
      const buffer = await readFileAsArrayBuffer(file);
      const workbook = readWorkbook(buffer);
      const sheetNames = listSheetNames(workbook);
      if (sheetNames.length > 1) {
        renderSheetSelection(workbook, sheetNames);
      } else {
        const { headers, records } = parseSheet(workbook, sheetNames[0]);
        if (!records.length) return toast.error("Planilha vazia ou sem dados.");
        renderMappingStep(headers, records);
      }
    }
  } catch (err) {
    toast.error("Não foi possível ler o arquivo selecionado.");
  }
}

function wizardStepsBar(activeIndex) {
  const steps = ["Selecionar arquivo", "Mapear colunas", "Prévia", "Concluído"];
  return el(
    "div",
    { class: "wizard-steps" },
    steps.map((label, i) =>
      el("div", { class: `wizard-step${i === activeIndex ? " active" : i < activeIndex ? " done" : ""}` }, [
        el("span", { class: "wizard-step-num" }, [el("span", {}, String(i + 1))]),
        label,
      ])
    )
  );
}

function renderSheetSelection(workbook, sheetNames) {
  const container = qs("#import-wizard");
  container.innerHTML = "";
  container.appendChild(wizardStepsBar(1));
  const select = el("select", { class: "form-control" }, sheetNames.map((n) => new Option(n, n)));
  container.appendChild(
    el("div", { class: "form-group" }, [
      el("label", {}, "Escolha a aba da planilha"),
      select,
      el("button", {
        type: "button",
        class: "btn btn-primary",
        style: "margin-top: var(--space-3);",
        onClick: () => {
          const { headers, records } = parseSheet(workbook, select.value);
          if (!records.length) return toast.error("Planilha vazia ou sem dados.");
          renderMappingStep(headers, records);
        },
      }, "Continuar"),
    ])
  );
  refreshIcons();
}

function renderMappingStep(headers, records) {
  const container = qs("#import-wizard");
  container.innerHTML = "";
  container.appendChild(wizardStepsBar(1));

  const suggested = suggestMapping(headers);
  const selects = {};

  const { missingFields, unrecognizedHeaders } = diffHeaders(headers, suggested);

  if (missingFields.length) {
    container.appendChild(
      el("div", { class: "alert alert-warning" }, [
        el("i", { "data-lucide": "alert-triangle", class: "icon icon-sm" }),
        el(
          "span",
          {},
          `Este arquivo não possui as colunas: ${missingFields.map((f) => f.label).join(", ")}. A importação pode continuar normalmente — esses campos ficarão em branco para as linhas importadas.`
        ),
      ])
    );
  }

  if (unrecognizedHeaders.length) {
    container.appendChild(
      el("div", { class: "alert alert-info" }, [
        el("i", { "data-lucide": "info", class: "icon icon-sm" }),
        el(
          "span",
          {},
          `Colunas do arquivo não reconhecidas automaticamente: ${unrecognizedHeaders.join(", ")}. Você pode mapeá-las manualmente abaixo, se corresponderem a algum campo esperado.`
        ),
      ])
    );
  }

  const grid = el(
    "div",
    { class: "form-grid" },
    EXPECTED_FIELDS.map((field) => {
      const select = el(
        "select",
        { class: "form-control" },
        [new Option("— Não mapear —", ""), ...headers.map((h) => new Option(h, h, false, h === suggested[field.key]))]
      );
      selects[field.key] = select;
      return el("div", { class: "form-group" }, [el("label", { class: field.required ? "required" : "" }, field.label), select]);
    })
  );

  container.appendChild(grid);
  container.appendChild(
    el("div", { class: "form-actions" }, [
      el("button", { type: "button", class: "btn btn-secondary", onClick: () => (container.innerHTML = "") }, "Cancelar"),
      el(
        "button",
        {
          type: "button",
          class: "btn btn-primary",
          onClick: async () => {
            const mapping = {};
            for (const field of EXPECTED_FIELDS) mapping[field.key] = selects[field.key].value || null;
            if (!mapping.nome || !mapping.cidade) {
              toast.error("Mapeie ao menos os campos obrigatórios: Nome e Cidade.");
              return;
            }
            const mapped = mapRecords(records, mapping);
            currentAnalysis = await analyzeImport(mapped);
            renderPreviewStep();
          },
        },
        "Continuar para prévia"
      ),
    ])
  );
  refreshIcons();
}

function statusBadgeForImport(status) {
  return { valida: "success", aviso: "warning", invalida: "danger", duplicada: "neutral" }[status] || "neutral";
}

function renderPreviewStep() {
  const container = qs("#import-wizard");
  container.innerHTML = "";
  container.appendChild(wizardStepsBar(2));

  const { rows, newCityNames, newCongregations, summary } = currentAnalysis;

  container.appendChild(
    el("div", { class: "summary-grid" }, [
      summaryTile(summary.total, "Total de linhas"),
      summaryTile(summary.validas, "Válidas"),
      summaryTile(summary.avisos, "Com avisos"),
      summaryTile(summary.invalidas, "Inválidas"),
      summaryTile(summary.duplicadas, "Duplicadas"),
      summaryTile(summary.novasCidades, "Cidades novas"),
      summaryTile(summary.novasCongregacoes, "Congregações novas"),
    ])
  );

  if (newCityNames.length || newCongregations.length) {
    container.appendChild(
      el("div", { class: "alert alert-info" }, [
        el("i", { "data-lucide": "info", class: "icon icon-sm" }),
        el("span", {}, `Serão criadas ${newCityNames.length} cidade(s) e ${newCongregations.length} congregação(ões) após a confirmação.`),
      ])
    );
  }

  const strategySelect = el(
    "select",
    { class: "form-control", style: "max-width:260px;" },
    [
      new Option("Ignorar duplicados", "ignorar", false, duplicateStrategy === "ignorar"),
      new Option("Atualizar existentes", "atualizar", false, duplicateStrategy === "atualizar"),
      new Option("Importar mesmo assim", "importar", false, duplicateStrategy === "importar"),
    ]
  );
  strategySelect.addEventListener("change", (e) => (duplicateStrategy = e.target.value));

  container.appendChild(
    el("div", { class: "form-group", style: "max-width:320px;" }, [el("label", {}, "Estratégia para duplicados"), strategySelect])
  );

  const tableWrap = el("div", { id: "preview-table" });
  container.appendChild(tableWrap);

  renderDataTable(tableWrap, {
    columns: [
      { key: "nome", label: "Nome" },
      { key: "cidade", label: "Cidade" },
      { key: "congregacao", label: "Congregação" },
      {
        key: "rowStatus",
        label: "Status",
        sortable: false,
        render: (r) => `<span class="badge badge-${statusBadgeForImport(r.rowStatus)}">${r.rowStatus}</span>`,
      },
      { key: "problemas", label: "Observações", sortable: false, render: (r) => [...r.errors, ...r.warnings].join(" | ") || "—" },
    ],
    rows,
    emptyMessage: "Nenhuma linha para exibir.",
  });

  container.appendChild(
    el("div", { class: "form-actions" }, [
      el(
        "button",
        {
          type: "button",
          class: "btn btn-secondary",
          onClick: () => {
            const csv = buildErrorsCSV(rows);
            downloadCSV(csv, "portal-expansao-erros-importacao.csv");
          },
        },
        "Baixar CSV com erros"
      ),
      el("button", { type: "button", class: "btn btn-secondary", onClick: () => (container.innerHTML = "") }, "Cancelar"),
      el(
        "button",
        {
          type: "button",
          class: "btn btn-primary",
          onClick: async () => {
            const updateProgress = renderProgressStep(rows.length);
            try {
              const result = await commitImport(rows, {
                duplicateStrategy,
                fileName: currentFileName,
                fileFormat: currentFileFormat,
                onProgress: ({ processed, total }) => updateProgress(processed, total),
              });
              renderResultStep(result);
              await loadHistory();
            } catch (err) {
              console.error("Falha ao importar:", err);
              renderErrorStep(err);
            }
          },
        },
        "Confirmar importação"
      ),
    ])
  );
  refreshIcons();
}

function summaryTile(value, label) {
  return el("div", { class: "summary-tile" }, [el("div", { class: "summary-tile-value" }, String(value)), el("div", { class: "summary-tile-label" }, label)]);
}

function renderProgressStep(total) {
  const container = qs("#import-wizard");
  container.innerHTML = "";
  container.appendChild(wizardStepsBar(2));

  const percentEl = el("span", { class: "import-progress-percent" }, "0%");
  const countEl = el("span", {}, `0 de ${total} processados`);
  const fillEl = el("div", { class: "progress-fill", style: "width: 0%;" });

  container.appendChild(
    el("div", { class: "import-progress" }, [
      el("div", { class: "import-progress-label" }, [el("span", {}, "Importando registros, aguarde..."), percentEl]),
      el("div", { class: "progress-track" }, [fillEl]),
      el("p", { class: "import-progress-note" }, [countEl]),
    ])
  );
  refreshIcons();

  return (processed, totalNow) => {
    const pct = totalNow > 0 ? Math.round((processed / totalNow) * 100) : 100;
    fillEl.style.width = `${pct}%`;
    percentEl.textContent = `${pct}%`;
    countEl.textContent = `${processed} de ${totalNow} processados`;
  };
}

function renderErrorStep(err) {
  const container = qs("#import-wizard");
  container.innerHTML = "";
  container.appendChild(wizardStepsBar(2));
  container.appendChild(
    el("div", { class: "alert alert-danger" }, [
      el("i", { "data-lucide": "x-circle", class: "icon icon-sm" }),
      el("div", {}, [
        el("strong", {}, "Não foi possível concluir a importação."),
        el("p", { style: "margin: var(--space-1) 0 0;" }, err?.message || "Erro desconhecido."),
      ]),
    ])
  );
  container.appendChild(
    el("div", { class: "form-actions" }, [
      el("button", { type: "button", class: "btn btn-secondary", onClick: () => (container.innerHTML = "") }, "Cancelar"),
      el("button", { type: "button", class: "btn btn-primary", onClick: () => renderPreviewStep() }, "Tentar novamente"),
    ])
  );
  toast.error("A importação falhou. Veja o motivo na tela.");
  refreshIcons();
}

function renderResultStep(result) {
  const container = qs("#import-wizard");
  container.innerHTML = "";
  container.appendChild(wizardStepsBar(3));
  container.appendChild(
    el("div", { class: "alert alert-info" }, [el("i", { "data-lucide": "check-circle-2", class: "icon icon-sm" }), el("span", {}, "Importação concluída com sucesso.")])
  );
  container.appendChild(
    el("div", { class: "summary-grid" }, [
      summaryTile(result.criados, "Criados"),
      summaryTile(result.atualizados, "Atualizados"),
      summaryTile(result.ignorados, "Ignorados"),
      summaryTile(result.erros, "Erros"),
    ])
  );
  container.appendChild(
    el("button", { type: "button", class: "btn btn-secondary", onClick: () => (container.innerHTML = "") }, "Nova importação")
  );
  toast.success("Importação concluída.");
  if (result.supabaseMirrorFailed) {
    toast.error("Alguns registros não puderam ser espelhados para o Supabase — confira o console e as credenciais em Fonte de dados.");
  }
  refreshIcons();
}

/* ---------------- Templates ---------------- */

function setupTemplates() {
  qs("#download-csv-template").addEventListener("click", () => {
    const headers = EXPECTED_FIELDS.map((f) => f.key);
    const example = {
      codigo: "1", nome: "Maria Silva", data_nascimento: "15/03/2005", naturalidade: "Praia Grande - SP", sexo: "feminino",
      telefone: "(13) 99999-0000", celular: "(13) 98888-0000", endereco: "Rua da Amizade", numero: "185",
      bairro: "Centro", cep: "11700-000", cidade: "Praia Grande", congregacao: "Praia Grande - Sede", status: "ativo",
      rg: "99.999.999-9", orgao_emissor: "SSP", cpf: "999.999.999-99", escolaridade: "Superior completo",
      profissao: "Administrador", cargo: "Membro", estado_civil: "solteiro(a)", outro_estado_civil: "", conjuge: "",
      conselheiro_local: "João Souza", conselheiro_cidade: "Pedro Lima", pastor: "Pr. Carlos",
      pai: "José Silva", mae: "Ana Silva", data_batismo_aguas: "10/01/2020", batizado_espirito_santo: "sim",
      instrumento: "violão", prega: "não", canta: "sim", outros_talentos: "",
      qtd: "1", lider_expansao: "não", se_lider: "", qual_departamento: "louvor",
      nome_dirigente: "Pr. Carlos", recebido_por: "Secretaria", tipo_admissao: "batismo",
      observacoes: "",
    };
    downloadCSV(toCSV([example], headers), "modelo-importacao-portal-expansao.csv");
  });

  qs("#download-excel-template").addEventListener("click", () => {
    if (!window.XLSX) return toast.error("Biblioteca SheetJS não carregada.");
    const example = {
      Código: "1", Nome: "Maria Silva", "Data de Nascimento": "15/03/2005", Naturalidade: "Praia Grande - SP", Sexo: "feminino",
      Telefone: "(13) 99999-0000", Celular: "(13) 98888-0000", Endereço: "Rua da Amizade", Número: "185",
      Bairro: "Centro", CEP: "11700-000", Cidade: "Praia Grande", Congregação: "Praia Grande - Sede", Status: "ativo",
      RG: "99.999.999-9", "Órgão Emissor": "SSP", CPF: "999.999.999-99", Escolaridade: "Superior completo",
      Profissão: "Administrador", Cargo: "Membro", "Estado Civil": "solteiro(a)", "Outro (qual)?": "", Cônjuge: "",
      "Conselheiro Local": "João Souza", "Conselheiro da Cidade": "Pedro Lima", Pastor: "Pr. Carlos",
      "Nome do Pai": "José Silva", "Nome da Mãe": "Ana Silva", "Data de Batismo nas Águas": "10/01/2020",
      "Batizado no Espírito Santo": "sim", Instrumento: "violão", Prega: "não", Canta: "sim",
      "Outros Talentos": "",
      Qtd: "1", "Líder de Expansão?": "não", "Se líder, qual?": "", "Qual Departamento?": "louvor",
      "Nome do Dirigente": "Pr. Carlos", "Cadastro Recebido Por": "Secretaria", "Tipo de Admissão": "batismo",
      Observações: "",
    };
    const worksheet = window.XLSX.utils.json_to_sheet([example]);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo");
    window.XLSX.writeFile(workbook, "modelo-importacao-portal-expansao.xlsx");
  });
}

/* ---------------- History ---------------- */

async function loadHistory() {
  try {
    historyEntries = await ImportHistoryRepository.list();
  } catch (err) {
    console.error("Falha ao carregar histórico de importações:", err);
    historyEntries = [];
  }
  renderHistory();
}

function renderHistory() {
  const filtered = historyEntries
    .filter((h) => !historySearch || h.nomeArquivo.toLowerCase().includes(historySearch.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  renderDataTable(qs("#history-table"), {
    columns: [
      { key: "nomeArquivo", label: "Arquivo" },
      { key: "formato", label: "Formato", render: (r) => r.formato.toUpperCase() },
      { key: "createdAt", label: "Data", render: (r) => new Date(r.createdAt).toLocaleString("pt-BR") },
      { key: "totalLinhas", label: "Linhas" },
      { key: "criados", label: "Criados" },
      { key: "atualizados", label: "Atualizados" },
      { key: "ignorados", label: "Ignorados" },
      { key: "erros", label: "Erros" },
    ],
    rows: filtered,
    actions: (row) => [{ icon: "trash-2", label: "Remover do histórico", onClick: () => removeHistoryEntry(row) }],
    emptyMessage: "Nenhuma importação registrada ainda.",
  });
}

async function removeHistoryEntry(entry) {
  await ImportHistoryRepository.remove(entry.id);
  await loadHistory();
}

/* ---------------- Backup ---------------- */

function setupBackup() {
  qs("#export-backup-btn").addEventListener("click", async () => {
    await BackupService.exportBackup();
    toast.success("Backup criado com sucesso.");
  });

  qs("#restore-backup-btn").addEventListener("click", () => qs("#backup-file-input").click());
  qs("#backup-file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const backup = BackupService.parseBackupFile(text);
      const body = el("div", { class: "detail-grid" }, [
        detailItem("Data do backup", new Date(backup.exportedAt).toLocaleString("pt-BR")),
        detailItem("Cidades", String(backup.counts?.cities ?? backup.data.cities.length)),
        detailItem("Congregações", String(backup.counts?.congregations ?? backup.data.congregations.length)),
        detailItem("Jovens", String(backup.counts?.youth ?? backup.data.youth.length)),
        detailItem("Eventos", String(backup.counts?.events ?? backup.data.events.length)),
      ]);
      openModal({
        title: "Restaurar backup",
        body: el("div", {}, [el("p", {}, "Esta ação substituirá todos os dados atuais pelos dados do backup selecionado. Recomendamos exportar um backup atual antes de continuar."), body]),
        actions: [
          { label: "Cancelar", className: "btn btn-secondary" },
          {
            label: "Restaurar",
            className: "btn btn-danger",
            onClick: async () => {
              await BackupService.restoreBackup(backup);
              toast.success("Restauração concluída.");
              window.location.href = "dashboard.html";
            },
          },
        ],
      });
    } catch (err) {
      toast.error("Arquivo de backup inválido.");
    }
  });
}

function detailItem(label, value) {
  return el("div", { class: "detail-item" }, [el("span", { class: "detail-item-label" }, label), el("span", { class: "detail-item-value" }, value)]);
}

/* ---------------- Data source (IndexedDB / Supabase) ---------------- */

function setupDataMode() {
  const toggle = qs("#data-mode-toggle");
  const badge = qs("#supabase-status-badge");
  const form = qs("#supabase-credentials-form");
  const urlInput = qs("#supabase-url-input");
  const anonKeyInput = qs("#supabase-anon-key-input");

  function render() {
    const mode = getDataMode();
    const isSupabase = mode === DATA_MODES.SUPABASE;
    toggle.classList.toggle("is-supabase", isSupabase);
    toggle.setAttribute("aria-checked", isSupabase ? "true" : "false");
    if (isSupabaseConfigured()) {
      badge.textContent = "Supabase configurado";
      badge.className = "badge badge-success";
    } else {
      badge.textContent = "Supabase não configurado";
      badge.className = "badge badge-neutral";
    }
  }

  const { url, anonKey } = getSupabaseCredentials();
  urlInput.value = url;
  anonKeyInput.value = anonKey;

  toggle.addEventListener("click", () => {
    const switchingToSupabase = getDataMode() !== DATA_MODES.SUPABASE;
    if (switchingToSupabase && !isSupabaseConfigured()) {
      toast.error("Preencha e salve a URL e a chave anon do Supabase abaixo antes de ativar o Supabase.");
      return;
    }
    setDataMode(switchingToSupabase ? DATA_MODES.SUPABASE : DATA_MODES.INDEXEDDB);
    toast.success(`Fonte de dados alterada para ${switchingToSupabase ? "Supabase" : "IndexedDB"}.`);
    window.location.reload();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!urlInput.value.trim() || !anonKeyInput.value.trim()) {
      toast.error("Preencha a URL e a chave anon do Supabase.");
      return;
    }
    setSupabaseCredentials(urlInput.value, anonKeyInput.value);
    toast.success("Credenciais do Supabase salvas neste navegador.");
    render();
  });

  qs("#clear-supabase-credentials-btn").addEventListener("click", () => {
    clearSupabaseCredentials();
    urlInput.value = "";
    anonKeyInput.value = "";
    toast.success("Credenciais do Supabase removidas.");
    render();
    if (getDataMode() === DATA_MODES.SUPABASE) {
      setDataMode(DATA_MODES.INDEXEDDB);
      toast.error("Fonte de dados voltou para IndexedDB porque o Supabase ficou sem credenciais.");
      window.location.reload();
    }
  });

  render();
}

/* ---------------- Demo data ---------------- */

function setupDemoData() {
  qs("#load-demo-btn").addEventListener("click", async () => {
    const confirmed = await confirmModal({
      title: "Carregar dados de demonstração",
      message: "Serão adicionadas nove cidades fictícias, congregações, jovens e eventos de demonstração. Deseja continuar?",
      confirmLabel: "Carregar",
    });
    if (!confirmed) return;
    const counts = await BackupService.loadDemoData();
    toast.success(`Dados de demonstração carregados: ${counts.cities} cidades, ${counts.congregations} congregações, ${counts.youth} jovens, ${counts.events} eventos.`);
    window.location.href = "dashboard.html";
  });

  qs("#remove-demo-btn").addEventListener("click", async () => {
    const confirmed = await confirmModal({
      title: "Remover dados de demonstração",
      message: "Todos os registros marcados como demonstração serão removidos. Cadastros reais não serão afetados.",
      confirmLabel: "Remover",
      danger: true,
    });
    if (!confirmed) return;
    const removed = await BackupService.removeDemoData();
    toast.success(`${removed} registro(s) de demonstração removido(s).`);
  });
}

/* ---------------- Danger zone ---------------- */

function setupDangerZone() {
  qs("#delete-youth-btn").addEventListener("click", () => simpleDanger("Apagar somente jovens", "Todos os jovens cadastrados serão removidos permanentemente.", () => BackupService.deleteYouthOnly()));
  qs("#delete-events-btn").addEventListener("click", () => simpleDanger("Apagar somente eventos", "Todos os eventos cadastrados serão removidos permanentemente.", () => BackupService.deleteEventsOnly()));
  qs("#delete-history-btn").addEventListener("click", () => simpleDanger("Apagar histórico de importações", "O histórico de importações será removido permanentemente.", () => BackupService.deleteImportHistory()));

  qs("#delete-city-btn").addEventListener("click", () => {
    const cityId = qs("#delete-city-select").value;
    const city = cities.find((c) => c.id === cityId);
    if (!city) return;
    simpleDanger("Apagar dados da cidade", `Todos os jovens, congregações e eventos de <strong>${city.nome}</strong> serão removidos permanentemente.`, () => BackupService.deleteCityData(cityId));
  });

  qs("#delete-demo-btn").addEventListener("click", () => simpleDanger("Apagar dados de demonstração", "Todos os registros marcados como demonstração serão removidos.", () => BackupService.removeDemoData()));

  qs("#delete-all-btn").addEventListener("click", openDeleteAllModal);
}

async function simpleDanger(title, message, action) {
  const confirmed = await confirmModal({ title, message, confirmLabel: "Apagar", danger: true });
  if (!confirmed) return;
  await action();
  toast.success("Dados apagados com sucesso.");
  window.location.reload();
}

function openDeleteAllModal() {
  const REQUIRED_TEXT = "APAGAR TODOS OS DADOS";
  const body = el("div", {}, [
    el("div", { class: "alert alert-danger" }, [
      el("i", { "data-lucide": "alert-triangle", class: "icon icon-sm" }),
      el("span", {}, "Esta ação apagará permanentemente todas as cidades, congregações, jovens, eventos, histórico e configurações. Não pode ser desfeita."),
    ]),
    el("p", {}, "Recomendamos exportar um backup antes de continuar."),
    el("div", { class: "form-group" }, [
      el("label", { for: "confirm-text" }, `Digite "${REQUIRED_TEXT}" para confirmar`),
      el("input", { type: "text", id: "confirm-text", class: "form-control" }),
    ]),
    el("div", { class: "form-checkbox-row" }, [
      el("input", { type: "checkbox", id: "confirm-checkbox" }),
      el("label", { for: "confirm-checkbox" }, "Eu entendo que esta ação não pode ser desfeita."),
    ]),
  ]);

  const { bodyEl, close } = openModal({
    title: "Apagar todos os dados",
    body,
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      {
        label: "Apagar todos os dados",
        className: "btn btn-danger",
        closeOnClick: false,
        onClick: async () => {
          const input = qs("#confirm-text", bodyEl);
          const checkbox = qs("#confirm-checkbox", bodyEl);
          if (input.value !== REQUIRED_TEXT || !checkbox.checked) return;
          await BackupService.deleteAllData();
          toast.success("Todos os dados foram apagados.");
          close();
          window.location.href = "dashboard.html";
        },
      },
    ],
  });

  updateDeleteAllButtonState(bodyEl);
  qs("#confirm-text", bodyEl).addEventListener("input", () => updateDeleteAllButtonState(bodyEl));
  qs("#confirm-checkbox", bodyEl).addEventListener("change", () => updateDeleteAllButtonState(bodyEl));

  function updateDeleteAllButtonState(scope) {
    const requiredMatch = qs("#confirm-text", scope).value === REQUIRED_TEXT;
    const checked = qs("#confirm-checkbox", scope).checked;
    const confirmBtn = qsa(".modal-footer .btn-danger", scope.closest(".modal"))[0];
    if (confirmBtn) confirmBtn.disabled = !(requiredMatch && checked);
  }
}

refreshIcons();
