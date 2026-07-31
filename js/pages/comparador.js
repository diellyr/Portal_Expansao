import { bootstrapPage } from "../app.js";
import { CityComparisonService } from "../services/city-comparison-service.js";
import { renderDataTable } from "../components/data-table.js";
import { renderEmptyState } from "../components/empty-state.js";
import { createChartCard } from "../components/chart-card.js";
import { el, qs, refreshIcons } from "../utils/dom-utils.js";

const ok = await bootstrapPage({ activeKey: "comparador", title: "Comparador de Cidades" });
if (ok) init();

let cities = [];
let congregations = [];
let youth = [];
let selectedCityIds = [];

async function init() {
  ({ cities, congregations, youth } = await CityComparisonService.load());
  renderCityChips();
  renderContent();
}

function renderCityChips() {
  const container = qs("#city-select-chips");
  container.innerHTML = "";
  cities.forEach((c) => {
    const active = selectedCityIds.includes(c.id);
    const chip = el(
      "button",
      { type: "button", class: `segment-chip${active ? " active" : ""}` },
      [el("i", { "data-lucide": "map-pin", class: "icon icon-sm" }), el("span", {}, c.nome)]
    );
    chip.addEventListener("click", () => {
      selectedCityIds = active ? selectedCityIds.filter((id) => id !== c.id) : [...selectedCityIds, c.id];
      renderCityChips();
      renderContent();
    });
    container.appendChild(chip);
  });
  refreshIcons();
}

function renderContent() {
  const data = { cities, congregations, youth };
  const emptyContainer = qs("#comparador-empty");
  const content = qs("#comparador-content");

  if (selectedCityIds.length < 2) {
    content.hidden = true;
    renderEmptyState(emptyContainer, {
      icon: "map-pin",
      title: "Selecione ao menos 2 cidades para comparar",
      description: "Os indicadores refletem apenas o que está registrado no sistema para cada cidade.",
    });
    return;
  }

  emptyContainer.innerHTML = "";
  content.hidden = false;

  const rows = CityComparisonService.compare(selectedCityIds, data);
  renderSummaryTable(rows);
  renderCharts(rows);
  renderFaixaEtariaTable(rows);
  renderCongregacoesTable();
}

function renderSummaryTable(rows) {
  renderDataTable(qs("#summary-table"), {
    columns: [
      { key: "cidade", label: "Cidade" },
      { key: "total", label: "Total" },
      { key: "ativos", label: "Ativos" },
      { key: "congregacoes", label: "Congregações" },
      { key: "batizadosAguas", label: "Bat. águas" },
      { key: "batizadosEspiritoSanto", label: "Bat. Esp. Santo" },
      { key: "pregadores", label: "Pregadores" },
      { key: "cantores", label: "Cantores" },
      { key: "musicos", label: "Músicos" },
      { key: "percentualComConselheiro", label: "% com conselheiro", render: (r) => `${r.percentualComConselheiro}%` },
      { key: "completudeMedia", label: "Completude média", render: (r) => `${r.completudeMedia}%` },
    ],
    rows,
    emptyMessage: "Sem dados para as cidades selecionadas.",
  });
}

function renderCharts(rows) {
  const container = qs("#comparador-charts");
  container.innerHTML = "";

  const charts = [
    { title: "Total de jovens por cidade", key: "total", unitLabel: "jovens" },
    { title: "Completude média de cadastro por cidade", key: "completudeMedia", unitLabel: "%" },
    { title: "% com conselheiro local por cidade", key: "percentualComConselheiro", unitLabel: "%" },
    { title: "Batizados nas águas por cidade", key: "batizadosAguas", unitLabel: "jovens" },
  ];

  charts.forEach(({ title, key, unitLabel }) => {
    const chart = createChartCard({ title, defaultType: "bar", unitLabel });
    container.appendChild(chart.card);
    chart.setData(
      rows.map((r) => r.cidade),
      rows.map((r) => r[key])
    );
  });
}

function renderFaixaEtariaTable(rows) {
  const tableRows = CityComparisonService.ageDistributionRows(rows);

  renderDataTable(qs("#faixa-etaria-table"), {
    columns: [
      { key: "faixa", label: "Faixa etária", sortable: false },
      ...rows.map((r) => ({ key: r.cidadeId, label: r.cidade, sortable: false })),
    ],
    rows: tableRows,
    emptyMessage: "Sem dados de faixa etária.",
  });
}

function renderCongregacoesTable() {
  const rows = CityComparisonService.congregationBreakdown(selectedCityIds, { cities, congregations, youth });
  renderDataTable(qs("#congregacoes-table"), {
    columns: [
      { key: "congregacao", label: "Congregação" },
      { key: "cidade", label: "Cidade" },
      { key: "total", label: "Jovens" },
      { key: "comConselheiro", label: "Com conselheiro" },
      { key: "completudeMedia", label: "Completude média", render: (r) => `${r.completudeMedia}%` },
    ],
    rows,
    emptyMessage: "Nenhuma congregação cadastrada nas cidades selecionadas.",
  });
}

refreshIcons();
