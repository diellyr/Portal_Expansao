import { bootstrapPage } from "../app.js";
import { CityService } from "../services/city-service.js";
import { CongregationService } from "../services/congregation-service.js";
import { YouthService } from "../services/youth-service.js";
import { ReportService } from "../services/report-service.js";
import { defaultFilters } from "../services/filter-service.js";
import { renderFilterBar, renderFilterChips } from "../components/filter-bar.js";
import { renderDataTable, sortRows } from "../components/data-table.js";
import { createChartCard } from "../components/chart-card.js";
import { el, qs, refreshIcons } from "../utils/dom-utils.js";
import { downloadCSV } from "../utils/file-utils.js";
import { toCSV } from "../parsers/csv-parser.js";
import { formatDateBR } from "../utils/dates.js";
import { YOUTH_STATUS_LABELS, AGE_RANGES } from "../config/constants.js";
import { toast } from "../components/toast.js";

const ok = await bootstrapPage({ activeKey: "relatorios", title: "Relatórios" });
if (ok) init();

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const REPORTS = [
  { key: "porCidade", label: "1. Jovens por cidade" },
  { key: "porCongregacao", label: "2. Jovens por congregação" },
  { key: "porStatus", label: "3. Jovens por status" },
  { key: "porFaixaEtaria", label: "4. Faixa etária" },
  { key: "batismoAguas", label: "5. Batismo nas águas" },
  { key: "batismoEspiritoSanto", label: "6. Batismo no Espírito Santo" },
  { key: "talentos", label: "7. Talentos" },
  { key: "aniversariantes", label: "8. Aniversariantes" },
  { key: "dadosIncompletos", label: "9. Dados incompletos" },
  { key: "comparativoCidades", label: "10. Comparativo de cidades" },
];

let cities = [];
let congregations = [];
let instruments = [];
let pendingFilters = defaultFilters();
let appliedFilters = defaultFilters();
let activeReport = "porCidade";
let currentMonth = new Date().getMonth() + 1;
let tableSort = { key: null, dir: "asc" };
let currentExport = { headers: [], rows: [] };

async function init() {
  [cities, congregations] = await Promise.all([CityService.list(), CongregationService.list()]);
  const youth = await YouthService.list();
  instruments = [...new Set(youth.map((y) => y.instrumento).filter(Boolean))].sort();

  const monthSelect = qs("#filter-month");
  MONTHS.forEach((m, i) => monthSelect.appendChild(new Option(m, i + 1, false, i + 1 === currentMonth)));
  monthSelect.addEventListener("change", (e) => {
    currentMonth = Number(e.target.value);
    renderReport();
  });

  renderTabs();
  renderFiltersUI();

  qs("#filter-completude").addEventListener("change", (e) => {
    pendingFilters = { ...pendingFilters, completude: e.target.value };
  });

  qs("#apply-filters-btn").addEventListener("click", () => {
    appliedFilters = { ...pendingFilters };
    renderReport();
  });

  qs("#clear-filters-btn").addEventListener("click", () => {
    pendingFilters = defaultFilters();
    appliedFilters = defaultFilters();
    qs("#filter-completude").value = "all";
    renderFiltersUI();
    renderReport();
  });

  qs("#export-csv-btn").addEventListener("click", () => {
    if (!currentExport.rows.length) return toast.warning("Não há dados para exportar.");
    downloadCSV(toCSV(currentExport.rows, currentExport.headers), `relatorio-${activeReport}-${new Date().toISOString().slice(0, 10)}.csv`);
  });

  qs("#export-excel-btn").addEventListener("click", () => {
    if (!currentExport.rows.length) return toast.warning("Não há dados para exportar.");
    if (!window.XLSX) return toast.error("Biblioteca SheetJS não carregada.");
    const worksheet = window.XLSX.utils.json_to_sheet(currentExport.rows);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
    window.XLSX.writeFile(workbook, `relatorio-${activeReport}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  });

  qs("#print-btn").addEventListener("click", () => window.print());

  await renderReport();
}

function renderTabs() {
  const container = qs("#report-tabs");
  container.innerHTML = "";
  REPORTS.forEach((r) => {
    const btn = el("button", { type: "button", class: `wizard-step${activeReport === r.key ? " active" : ""}` }, r.label);
    btn.addEventListener("click", () => {
      activeReport = r.key;
      renderTabs();
      qs("#month-field").hidden = r.key !== "aniversariantes";
      renderReport();
    });
    container.appendChild(btn);
  });
  qs("#month-field").hidden = activeReport !== "aniversariantes";
}

function renderFiltersUI() {
  renderFilterBar(qs("#global-filters"), {
    cities,
    congregations,
    instruments,
    filters: pendingFilters,
    onChange: (f) => {
      pendingFilters = f;
    },
  });
  renderFilterChips(
    qs("#filter-chips"),
    appliedFilters,
    {
      cityName: (id) => cities.find((c) => c.id === id)?.nome || "",
      congregationName: (id) => congregations.find((c) => c.id === id)?.nome || "",
      statusLabel: (key) => YOUTH_STATUS_LABELS[key] || key,
      ageRangeLabel: (key) => AGE_RANGES.find((r) => r.key === key)?.label || key,
    },
    (key) => {
      appliedFilters = { ...appliedFilters, [key]: key === "dataInicio" || key === "dataFim" ? "" : "all" };
      pendingFilters = { ...appliedFilters };
      renderFiltersUI();
      renderReport();
    }
  );
}

function content() {
  return qs("#report-content");
}

function reportShell(chartCards, tableNode) {
  const wrap = el("div", {});
  if (chartCards.length) {
    wrap.appendChild(el("div", { class: "grid grid-charts", style: "margin-bottom: var(--space-5);" }, chartCards));
  }
  wrap.appendChild(tableNode);
  return wrap;
}

function tableContainer() {
  return el("div", { class: "surface", style: "padding: var(--space-4);" }, [el("div", { id: "report-table" })]);
}

function renderTable(columns, rows, exportHeaders) {
  tableSort = { key: null, dir: "asc" };
  const container = qs("#report-table");
  function draw() {
    renderDataTable(container, {
      columns,
      rows: sortRows(rows, tableSort),
      sort: tableSort,
      onSortChange: (key) => {
        tableSort = { key, dir: tableSort.key === key && tableSort.dir === "asc" ? "desc" : "asc" };
        draw();
      },
      emptyMessage: "Nenhum dado encontrado para os filtros atuais.",
    });
  }
  draw();
  currentExport = { headers: exportHeaders || columns.map((c) => c.key), rows };
}

async function renderReport() {
  const container = content();
  container.innerHTML = "";

  switch (activeReport) {
    case "porCidade":
      await renderPorCidade(container);
      break;
    case "porCongregacao":
      await renderPorCongregacao(container);
      break;
    case "porStatus":
      await renderPorStatus(container);
      break;
    case "porFaixaEtaria":
      await renderPorFaixaEtaria(container);
      break;
    case "batismoAguas":
      await renderBatismoAguas(container);
      break;
    case "batismoEspiritoSanto":
      await renderBatismoES(container);
      break;
    case "talentos":
      await renderTalentos(container);
      break;
    case "aniversariantes":
      await renderAniversariantes(container);
      break;
    case "dadosIncompletos":
      await renderDadosIncompletos(container);
      break;
    case "comparativoCidades":
      await renderComparativo(container);
      break;
  }
  refreshIcons();
}

async function renderPorCidade(container) {
  const rows = await ReportService.porCidade(appliedFilters);
  const chart = createChartCard({ title: "Jovens por cidade", description: "Todas as nove cidades da região.", toggle: true, defaultType: "pie" });
  container.appendChild(reportShell([chart.card], tableContainer()));
  chart.setData(rows.map((r) => r.cidade), rows.map((r) => r.quantidade));
  renderTable(
    [{ key: "cidade", label: "Cidade" }, { key: "quantidade", label: "Quantidade" }, { key: "percentual", label: "%", sortable: false }],
    rows
  );
}

async function renderPorCongregacao(container) {
  const rows = await ReportService.porCongregacao(appliedFilters);
  const chart = createChartCard({ title: "Jovens por congregação", description: "Congregações com ao menos um jovem cadastrado.", defaultType: "bar" });
  container.appendChild(reportShell([chart.card], tableContainer()));
  chart.setData(rows.map((r) => r.congregacao), rows.map((r) => r.quantidade));
  renderTable(
    [
      { key: "congregacao", label: "Congregação" },
      { key: "cidade", label: "Cidade" },
      { key: "quantidade", label: "Quantidade" },
      { key: "percentual", label: "%", sortable: false },
    ],
    rows
  );
}

async function renderPorStatus(container) {
  const rows = await ReportService.porStatus(appliedFilters);
  const chart = createChartCard({ title: "Jovens por status", description: "Ativo, visitante, novo convertido, ausente, transferido e inativo.", defaultType: "pie" });
  container.appendChild(reportShell([chart.card], tableContainer()));
  chart.setData(rows.map((r) => r.status), rows.map((r) => r.quantidade));
  renderTable([{ key: "status", label: "Status" }, { key: "quantidade", label: "Quantidade" }, { key: "percentual", label: "%", sortable: false }], rows);
}

async function renderPorFaixaEtaria(container) {
  const rows = await ReportService.porFaixaEtaria(appliedFilters);
  const chart = createChartCard({ title: "Distribuição por faixa etária", description: "Idade calculada a partir da data de nascimento.", toggle: true, defaultType: "pie" });
  container.appendChild(reportShell([chart.card], tableContainer()));
  chart.setData(rows.map((r) => r.faixa), rows.map((r) => r.quantidade));
  renderTable([{ key: "faixa", label: "Faixa etária" }, { key: "quantidade", label: "Quantidade" }, { key: "percentual", label: "%", sortable: false }], rows);
}

async function renderBatismoAguas(container) {
  const rows = await ReportService.batismoAguas(appliedFilters);
  const chart = createChartCard({ title: "Batismo nas águas", description: "Batizados, não batizados e não informado.", defaultType: "pie" });
  container.appendChild(reportShell([chart.card], tableContainer()));
  chart.setData(rows.map((r) => r.situacao), rows.map((r) => r.quantidade));
  renderTable([{ key: "situacao", label: "Situação" }, { key: "quantidade", label: "Quantidade" }, { key: "percentual", label: "%", sortable: false }], rows);
}

async function renderBatismoES(container) {
  const rows = await ReportService.batismoEspiritoSanto(appliedFilters);
  const chart = createChartCard({ title: "Batismo no Espírito Santo", description: "Sim, não e não informado.", defaultType: "pie" });
  container.appendChild(reportShell([chart.card], tableContainer()));
  chart.setData(rows.map((r) => r.situacao), rows.map((r) => r.quantidade));
  renderTable([{ key: "situacao", label: "Situação" }, { key: "quantidade", label: "Quantidade" }, { key: "percentual", label: "%", sortable: false }], rows);
}

async function renderTalentos(container) {
  const data = await ReportService.talentos(appliedFilters);
  const summary = el("div", { class: "surface", style: "padding: var(--space-4); margin-bottom: var(--space-5);" }, [
    el("div", { class: "summary-grid" }, [
      summaryTile(data.pregam, "Pregam"),
      summaryTile(data.cantam, "Cantam"),
      summaryTile(data.instrumentos.reduce((a, i) => a + i.quantidade, 0), "Músicos"),
      summaryTile(data.outrosTalentos.length, "Outros talentos"),
    ]),
  ]);

  const chart = createChartCard({ title: "Instrumentos", description: "Quantidade de jovens por instrumento.", defaultType: "bar" });
  container.appendChild(summary);
  container.appendChild(reportShell([chart.card], tableContainer()));
  chart.setData(data.instrumentos.map((i) => i.instrumento), data.instrumentos.map((i) => i.quantidade));
  renderTable([{ key: "instrumento", label: "Instrumento" }, { key: "quantidade", label: "Quantidade" }], data.instrumentos);
}

function summaryTile(value, label) {
  return el("div", { class: "summary-tile" }, [el("div", { class: "summary-tile-value" }, String(value)), el("div", { class: "summary-tile-label" }, label)]);
}

async function renderAniversariantes(container) {
  const rows = await ReportService.aniversariantes(appliedFilters, currentMonth);
  container.appendChild(tableContainer());
  renderTable(
    [
      { key: "nome", label: "Nome" },
      { key: "dataNascimento", label: "Data de nascimento", render: (r) => formatDateBR(r.dataNascimento) },
      { key: "cidade", label: "Cidade" },
      { key: "congregacao", label: "Congregação" },
    ],
    rows,
    ["nome", "dataNascimento", "cidade", "congregacao"]
  );
}

async function renderDadosIncompletos(container) {
  const rows = await ReportService.dadosIncompletos(appliedFilters);
  container.appendChild(tableContainer());
  renderTable(
    [
      { key: "nome", label: "Nome" },
      { key: "cidade", label: "Cidade" },
      { key: "congregacao", label: "Congregação" },
      { key: "camposFaltando", label: "Campos faltando", sortable: false },
    ],
    rows
  );
}

async function renderComparativo(container) {
  const rows = await ReportService.comparativoCidades(appliedFilters);
  container.appendChild(tableContainer());
  renderTable(
    [
      { key: "cidade", label: "Cidade" },
      { key: "total", label: "Total" },
      { key: "ativos", label: "Ativos" },
      { key: "visitantes", label: "Visitantes" },
      { key: "congregacoes", label: "Congregações" },
      { key: "batizadosAguas", label: "Bat. Águas" },
      { key: "batizadosEspiritoSanto", label: "Bat. Esp. Santo" },
      { key: "pregadores", label: "Pregadores" },
      { key: "cantores", label: "Cantores" },
      { key: "musicos", label: "Músicos" },
      { key: "percentualRegional", label: "% Regional", sortable: false },
    ],
    rows
  );
}

refreshIcons();
