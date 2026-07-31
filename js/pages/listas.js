import { bootstrapPage } from "../app.js";
import { YouthService } from "../services/youth-service.js";
import { CityService } from "../services/city-service.js";
import { CongregationService } from "../services/congregation-service.js";
import { BackupService } from "../services/backup-service.js";
import { defaultFilters, applyYouthFilters } from "../services/filter-service.js";
import { applySegment, segmentCounts } from "../services/segmentation-service.js";
import { buildNamesText, buildWhatsAppListText, buildPrintableList } from "../services/list-generator-service.js";
import { renderFilterBar, renderFilterChips } from "../components/filter-bar.js";
import { renderDataTable, sortRows } from "../components/data-table.js";
import { renderPagination } from "../components/pagination.js";
import { openYouthFicha, statusBadge } from "../components/youth-ficha-modal.js";
import { toast } from "../components/toast.js";
import { printNode } from "../utils/print-utils.js";
import { el, qs, refreshIcons } from "../utils/dom-utils.js";
import { calculateAge } from "../utils/dates.js";
import { YOUTH_STATUS_LABELS, AGE_RANGES } from "../config/constants.js";

const ok = await bootstrapPage({ activeKey: "listas", title: "Gerador de Listas para Eventos" });
if (ok) init();

let allYouth = [];
let cities = [];
let congregations = [];
let instruments = [];
let filters = defaultFilters();
let completude = "all";
let activeSegment = "all";
let sort = { key: "nome", dir: "asc" };
let page = 1;
const pageSize = 15;

async function init() {
  [cities, congregations] = await Promise.all([CityService.list(), CongregationService.list()]);
  const youth = await YouthService.list();
  const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
  const congMap = Object.fromEntries(congregations.map((c) => [c.id, c.nome]));
  allYouth = youth.map((y) => ({
    ...y,
    idade: calculateAge(y.dataNascimento),
    cidadeNome: cityMap[y.cidadeId] || "",
    congregacaoNome: congMap[y.congregacaoId] || "",
  }));
  instruments = [...new Set(allYouth.map((y) => y.instrumento).filter(Boolean))].sort();

  renderFiltersUI();

  qs("#filter-completude").addEventListener("change", (e) => {
    completude = e.target.value;
    page = 1;
    render();
  });

  qs("#export-excel-btn").addEventListener("click", async () => {
    const rows = getFilteredSorted();
    if (!rows.length) return toast.warning("Não há jovens na lista atual para exportar.");
    try {
      await BackupService.exportYouthExcel(rows, cities, congregations);
      toast.success("Exportação Excel concluída.");
    } catch {
      toast.error("Não foi possível exportar em Excel.");
    }
  });

  qs("#print-btn").addEventListener("click", () => {
    const rows = getFilteredSorted();
    if (!rows.length) return toast.warning("Não há jovens na lista atual para imprimir.");
    printNode(buildPrintableList(rows, listTitle()));
    toast.info('Na tela de impressão, escolha "Salvar como PDF" para gerar um arquivo.');
  });

  qs("#copy-names-btn").addEventListener("click", async () => {
    const rows = getFilteredSorted();
    if (!rows.length) return toast.warning("Não há jovens na lista atual para copiar.");
    try {
      await navigator.clipboard.writeText(buildNamesText(rows));
      toast.success("Nomes copiados!");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  });

  qs("#copy-whatsapp-btn").addEventListener("click", async () => {
    const rows = getFilteredSorted();
    if (!rows.length) return toast.warning("Não há jovens na lista atual para copiar.");
    try {
      await navigator.clipboard.writeText(buildWhatsAppListText(rows, listTitle()));
      toast.success("Texto copiado! Cole no WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  });

  render();
}

function listTitle() {
  return qs("#list-title").value.trim() || "Lista de jovens";
}

function renderFiltersUI() {
  renderFilterBar(qs("#global-filters"), {
    cities,
    congregations,
    instruments,
    filters,
    onChange: (newFilters) => {
      filters = newFilters;
      page = 1;
      renderFiltersUI();
      render();
    },
  });
  renderFilterChips(
    qs("#filter-chips"),
    filters,
    {
      cityName: (id) => cities.find((c) => c.id === id)?.nome || "",
      congregationName: (id) => congregations.find((c) => c.id === id)?.nome || "",
      statusLabel: (key) => YOUTH_STATUS_LABELS[key] || key,
      ageRangeLabel: (key) => AGE_RANGES.find((r) => r.key === key)?.label || key,
    },
    (key) => {
      filters = { ...filters, [key]: key === "dataInicio" || key === "dataFim" ? "" : "all" };
      page = 1;
      renderFiltersUI();
      render();
    }
  );
}

function getFilteredBeforeSegment() {
  let rows = applyYouthFilters(allYouth, filters);
  if (completude === "completos") rows = rows.filter((y) => YouthService.isIncomplete(y).length === 0);
  else if (completude === "incompletos") rows = rows.filter((y) => YouthService.isIncomplete(y).length > 0);
  return rows;
}

function getFilteredSorted() {
  const rows = applySegment(getFilteredBeforeSegment(), activeSegment);
  return sortRows(rows, sort);
}

function renderSegmentChips() {
  const container = qs("#segment-chips");
  container.innerHTML = "";
  const baseRows = getFilteredBeforeSegment();
  const counts = segmentCounts(baseRows);

  const allChip = el(
    "button",
    { type: "button", class: `segment-chip${activeSegment === "all" ? " active" : ""}` },
    [el("span", {}, "Todos"), el("span", { class: "segment-chip-count" }, String(baseRows.length))]
  );
  allChip.addEventListener("click", () => {
    activeSegment = "all";
    page = 1;
    render();
  });
  container.appendChild(allChip);

  counts.forEach((s) => {
    const chip = el(
      "button",
      { type: "button", class: `segment-chip${activeSegment === s.key ? " active" : ""}`, "data-tooltip": s.tooltip },
      [el("i", { "data-lucide": s.icon, class: "icon icon-sm" }), el("span", {}, s.label), el("span", { class: "segment-chip-count" }, String(s.count))]
    );
    chip.addEventListener("click", () => {
      activeSegment = activeSegment === s.key ? "all" : s.key;
      page = 1;
      render();
    });
    container.appendChild(chip);
  });
  refreshIcons();
}

function render() {
  renderSegmentChips();
  const rows = getFilteredSorted();
  qs("#list-count").textContent = `${rows.length} jovem(ns) na lista atual`;

  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  renderDataTable(qs("#lista-table"), {
    columns: [
      {
        key: "nome",
        label: "Nome",
        render: (r) =>
          el("button", { type: "button", class: "name-cell-link", onClick: () => openYouthFicha(r, r.cidadeNome || "Não informado", r.congregacaoNome || "Sem igreja cadastrada") }, r.nome),
      },
      { key: "idade", label: "Idade", render: (r) => (r.idade === null ? "Não informado" : `${r.idade} anos`) },
      { key: "cidadeNome", label: "Cidade" },
      { key: "congregacaoNome", label: "Congregação" },
      { key: "telefone", label: "Telefone", render: (r) => r.telefone || r.celular || "—" },
      { key: "conselheiroLocal", label: "Conselheiro local", render: (r) => r.conselheiroLocal || "—" },
      {
        key: "status",
        label: "Status",
        render: (r) => `<span class="badge badge-${statusBadge(r.status)}">${YOUTH_STATUS_LABELS[r.status] || r.status}</span>`,
      },
    ],
    rows: pageRows,
    sort,
    onSortChange: (key) => {
      sort = { key, dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc" };
      render();
    },
    emptyMessage: "Nenhum jovem encontrado com os filtros/segmentos atuais.",
  });

  renderPagination(qs("#lista-pagination"), {
    page,
    pageSize,
    total: rows.length,
    onPageChange: (p) => {
      page = p;
      render();
    },
  });
}

refreshIcons();
