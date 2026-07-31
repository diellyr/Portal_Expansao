import { bootstrapPage } from "../app.js";
import { DashboardService } from "../services/dashboard-service.js";
import { CityService } from "../services/city-service.js";
import { CongregationService } from "../services/congregation-service.js";
import { YouthService } from "../services/youth-service.js";
import { defaultFilters } from "../services/filter-service.js";
import { renderFilterBar, renderFilterChips } from "../components/filter-bar.js";
import { renderMetricCards } from "../components/metric-card.js";
import { createChartCard, createMultiLineChartCard } from "../components/chart-card.js";
import { renderLoading } from "../components/loading.js";
import { emptyState } from "../components/empty-state.js";
import { createPresentationModeToggle } from "../components/presentation-mode.js";
import { el, qs, refreshIcons } from "../utils/dom-utils.js";
import { formatDateBR } from "../utils/dates.js";
import { formatNumber } from "../utils/formatters.js";
import { YOUTH_STATUS_LABELS, AGE_RANGES } from "../config/constants.js";

const ok = await bootstrapPage({ activeKey: "dashboard", title: "Dashboard" });
if (ok) init();

let filters = defaultFilters();
let cities = [];
let congregations = [];
let instruments = [];
let selectedYear = new Date().getFullYear();
const GROWTH_DEFAULT_FROM_YEAR = 2021;
let growthFromYear = GROWTH_DEFAULT_FROM_YEAR;
let growthToYear = new Date().getFullYear();
const charts = {};
const yearCharts = {};
let growthChartCard = null;

async function init() {
  qs("#presentation-mode-slot").appendChild(createPresentationModeToggle());
  renderLoading(qs("#metric-cards"), "Carregando indicadores...");
  [cities, congregations] = await Promise.all([CityService.list(), CongregationService.list()]);
  const youth = await YouthService.list();
  instruments = [...new Set(youth.map((y) => y.instrumento).filter(Boolean))].sort();

  buildChartCards();
  buildYearChartCards();
  buildGrowthChartCard();
  renderFiltersUI();
  qs("#year-select").addEventListener("change", async (e) => {
    selectedYear = Number(e.target.value);
    await refresh();
  });
  qs("#growth-year-from").addEventListener("change", async (e) => {
    growthFromYear = Number(e.target.value);
    if (growthFromYear > growthToYear) growthToYear = growthFromYear;
    await refresh();
  });
  qs("#growth-year-to").addEventListener("change", async (e) => {
    growthToYear = Number(e.target.value);
    if (growthToYear < growthFromYear) growthFromYear = growthToYear;
    await refresh();
  });
  await refresh();
}

function renderFiltersUI() {
  renderFilterBar(qs("#global-filters"), {
    cities,
    congregations,
    instruments,
    filters,
    onChange: async (newFilters) => {
      filters = newFilters;
      renderFiltersUI();
      await refresh();
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
    async (key) => {
      filters = { ...filters, [key]: key === "dataInicio" || key === "dataFim" ? "" : "all" };
      renderFiltersUI();
      await refresh();
    }
  );

  qs("#restore-view-btn").onclick = async () => {
    filters = defaultFilters();
    renderFiltersUI();
    await refresh();
  };
}

function buildChartCards() {
  const grid = qs("#charts-grid");
  grid.innerHTML = "";

  const specs = [
    { key: "byCity", title: "Jovens por cidade", desc: "Distribuição proporcional entre as nove cidades.", toggle: true, defaultType: "pie", clickable: true },
    { key: "byCityBar", title: "Comparativo de jovens por cidade", desc: "Comparação absoluta entre cidades.", toggle: false, defaultType: "bar", source: "byCity", clickable: true },
    { key: "statusEntries", title: "Jovens por status", desc: "Ativos, visitantes, ausentes, inativos e mais.", defaultType: "pie" },
    { key: "ageEntries", title: "Distribuição por faixa etária", desc: "Idade calculada a partir da data de nascimento.", defaultType: "pie" },
    { key: "batismoAguas", title: "Batismo nas águas", desc: "Batizados e não batizados.", defaultType: "pie" },
    { key: "batismoEs", title: "Batismo no Espírito Santo", desc: "Jovens batizados no Espírito Santo.", defaultType: "pie" },
    { key: "byCongregation", title: "Jovens por congregação", desc: "Comparação entre congregações com jovens cadastrados.", defaultType: "bar" },
    { key: "instruments", title: "Principais instrumentos", desc: "Instrumentos tocados pelos jovens.", defaultType: "bar" },
    { key: "pregacao", title: "Jovens que pregam", desc: "Proporção de jovens que pregam.", defaultType: "pie" },
    { key: "canto", title: "Jovens que cantam", desc: "Proporção de jovens que cantam.", defaultType: "pie" },
    { key: "sexoEntries", title: "Porcentagem por sexo", desc: "Distribuição de jovens por sexo.", defaultType: "pie" },
    { key: "aniversariantesPorDia", title: "Aniversariantes por dia do mês", desc: "Quantidade de aniversariantes em cada dia (1 a 31).", defaultType: "line" },
  ];

  for (const spec of specs) {
    const card = createChartCard({
      title: spec.title,
      description: spec.desc,
      defaultType: spec.defaultType,
      toggle: !!spec.toggle,
      onCategoryClick: spec.clickable
        ? (label) => {
            const city = cities.find((c) => c.nome === label);
            if (city) {
              filters = { ...filters, cidadeId: city.id, congregacaoId: "all" };
              renderFiltersUI();
              refresh();
            }
          }
        : undefined,
    });
    charts[spec.key] = card;
    grid.appendChild(card.card);
  }
}

function buildYearChartCards() {
  const grid = qs("#year-charts-grid");
  grid.innerHTML = "";

  const specs = [
    { key: "cadastrosPorMes", title: "Cadastros realizados no ano, por mês", desc: "Novos jovens cadastrados a cada mês do ano selecionado." },
    { key: "admissoesPorMes", title: "Admissões no ano, por mês", desc: "Jovens admitidos (data de entrada) a cada mês do ano selecionado." },
    { key: "batizadosPorMes", title: "Batizados no ano, por mês", desc: "Batismos nas águas a cada mês do ano selecionado." },
  ];

  for (const spec of specs) {
    const card = createChartCard({ title: spec.title, description: spec.desc, defaultType: "bar" });
    yearCharts[spec.key] = card;
    grid.appendChild(card.card);
  }
}

function populateYearSelect(years) {
  const select = qs("#year-select");
  const currentValues = Array.from(select.options).map((o) => o.value);
  const nextValues = years.map(String);
  if (currentValues.join(",") !== nextValues.join(",")) {
    select.innerHTML = "";
    years.forEach((y) => select.appendChild(new Option(String(y), String(y), false, y === selectedYear)));
  }
  select.value = String(selectedYear);
}

function buildGrowthChartCard() {
  const grid = qs("#growth-charts-grid");
  grid.innerHTML = "";
  growthChartCard = createMultiLineChartCard({
    title: "Crescimento de jovens por cidade",
    description: "Total acumulado de jovens cadastrados por cidade, ano a ano, no período selecionado.",
  });
  grid.appendChild(growthChartCard.card);
}

function fillYearSelect(select, years, selected) {
  const currentValues = Array.from(select.options).map((o) => o.value);
  const nextValues = years.map(String);
  if (currentValues.join(",") !== nextValues.join(",")) {
    select.innerHTML = "";
    years.forEach((y) => select.appendChild(new Option(String(y), String(y), false, y === selected)));
  }
  select.value = String(selected);
}

function populateGrowthYearSelects(years) {
  // Always offer 2021..hoje regardless of which years actually have data,
  // so the default range (2021 até o ano atual) is always selectable --
  // merged with any other years found in the data (e.g. older imports).
  const yearSet = new Set(years);
  for (let y = GROWTH_DEFAULT_FROM_YEAR; y <= new Date().getFullYear(); y++) yearSet.add(y);
  const ascYears = [...yearSet].sort((a, b) => a - b);
  fillYearSelect(qs("#growth-year-from"), ascYears, growthFromYear);
  fillYearSelect(qs("#growth-year-to"), ascYears, growthToYear);
}

function demografiaCard(title, icon, tiles) {
  return el("div", { class: "surface metric-card" }, [
    el("div", { class: "metric-card-top" }, [
      el("span", { class: "metric-card-title" }, title),
      el("div", { class: "metric-card-icon" }, [el("i", { "data-lucide": icon, class: "icon" })]),
    ]),
    el(
      "div",
      { class: "summary-grid", style: "margin: var(--space-2) 0 0;" },
      tiles.map(([label, value]) =>
        el("div", { class: "summary-tile" }, [
          el("div", { class: "summary-tile-value" }, formatNumber(value)),
          el("div", { class: "summary-tile-label" }, label),
        ])
      )
    ),
  ]);
}

function renderDemografia(dem) {
  const grid = qs("#demografia-grid");
  grid.innerHTML = "";
  grid.appendChild(
    demografiaCard("Total geral de membros", "users", [
      ["Total", dem.totalGeral.total],
      ["Masculino", dem.totalGeral.masculino],
      ["Feminino", dem.totalGeral.feminino],
    ])
  );
  grid.appendChild(
    demografiaCard("Total de membros ativos", "user-check", [
      ["Total", dem.totalAtivos.total],
      ["Masculino", dem.totalAtivos.masculino],
      ["Feminino", dem.totalAtivos.feminino],
    ])
  );
  grid.appendChild(
    demografiaCard("Sem igreja cadastrada", "home", [
      ["Total", dem.semCongregacao.total],
      ["Masculino", dem.semCongregacao.masculino],
      ["Feminino", dem.semCongregacao.feminino],
    ])
  );
  grid.appendChild(
    demografiaCard("Aniversariantes", "cake", [
      ["Hoje", dem.aniversariantes.hoje],
      ["Mês atual", dem.aniversariantes.mesAtual],
    ])
  );
  refreshIcons();
}

function renderFaixaEtariaSexoTable(rows) {
  const container = qs("#faixa-etaria-sexo-table");
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td>${r.faixa}</td><td>${formatNumber(r.total)}</td><td>${formatNumber(r.masculino)}</td><td>${formatNumber(r.feminino)}</td></tr>`
    )
    .join("");
  container.innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th class="no-sort">Faixa etária</th><th class="no-sort">Total</th><th class="no-sort">Masculino</th><th class="no-sort">Feminino</th></tr></thead><tbody>${bodyRows}</tbody></table></div>`;
}

async function refresh() {
  const { cards, charts: chartData, lists, demografia, yearCharts: yearChartData, growth, availableYears } = await DashboardService.build(
    filters,
    selectedYear,
    { from: growthFromYear, to: growthToYear }
  );

  renderMetricCards(qs("#metric-cards"), [
    { title: "Total de jovens", value: cards.total, icon: "users", tooltip: "Total de jovens no filtro atual" },
    { title: "Ativos", value: cards.ativos, icon: "user-check" },
    { title: "Visitantes", value: cards.visitantes, icon: "user-plus" },
    { title: "Novos convertidos", value: cards.novosConvertidos, icon: "sparkles" },
    { title: "Cidades", value: cards.totalCidades, icon: "map-pin" },
    { title: "Congregações", value: cards.totalCongregacoes, icon: "building-2" },
    { title: "Batizados nas águas", value: cards.batizadosAguas, icon: "droplet" },
    { title: "Batizados no Espírito Santo", value: cards.batizadosEspiritoSanto, icon: "flame" },
    { title: "Pregam", value: cards.pregam, icon: "mic" },
    { title: "Cantam", value: cards.cantam, icon: "music" },
    { title: "Próximos eventos", value: cards.proximosEventos, icon: "calendar-clock" },
  ]);

  charts.byCity.setData(chartData.byCity.map((c) => c.label), chartData.byCity.map((c) => c.value));
  charts.byCityBar.setData(chartData.byCity.map((c) => c.label), chartData.byCity.map((c) => c.value));
  charts.statusEntries.setData(chartData.statusEntries.map((c) => c.label), chartData.statusEntries.map((c) => c.value));
  charts.ageEntries.setData(chartData.ageEntries.map((c) => c.label), chartData.ageEntries.map((c) => c.value));
  charts.batismoAguas.setData(chartData.batismoAguas.map((c) => c.label), chartData.batismoAguas.map((c) => c.value));
  charts.batismoEs.setData(chartData.batismoEs.map((c) => c.label), chartData.batismoEs.map((c) => c.value));
  charts.byCongregation.setData(chartData.byCongregation.slice(0, 12).map((c) => c.label), chartData.byCongregation.slice(0, 12).map((c) => c.value));
  charts.instruments.setData(chartData.instruments.map((c) => c.label), chartData.instruments.map((c) => c.value));
  charts.pregacao.setData(chartData.pregacao.map((c) => c.label), chartData.pregacao.map((c) => c.value));
  charts.canto.setData(chartData.canto.map((c) => c.label), chartData.canto.map((c) => c.value));
  charts.sexoEntries.setData(chartData.sexoEntries.map((c) => c.label), chartData.sexoEntries.map((c) => c.value));
  charts.aniversariantesPorDia.setData(chartData.aniversariantesPorDia.labels, chartData.aniversariantesPorDia.values);

  renderDemografia(demografia);
  renderFaixaEtariaSexoTable(chartData.faixaEtariaPorSexo);

  populateYearSelect(availableYears);
  yearCharts.cadastrosPorMes.setData(yearChartData.cadastrosPorMes.labels, yearChartData.cadastrosPorMes.values);
  yearCharts.admissoesPorMes.setData(yearChartData.admissoesPorMes.labels, yearChartData.admissoesPorMes.values);
  yearCharts.batizadosPorMes.setData(yearChartData.batizadosPorMes.labels, yearChartData.batizadosPorMes.values);

  populateGrowthYearSelects(availableYears);
  growthChartCard.setData(growth.labels, growth.series);

  renderLists(lists);
}

function listCard(title, icon, contentNode) {
  return el("div", { class: "surface list-card" }, [
    el("div", { class: "list-card-title" }, [el("i", { "data-lucide": icon, class: "icon icon-sm" }), title]),
    contentNode,
  ]);
}

function renderLists(lists) {
  const grid = qs("#lists-grid");
  grid.innerHTML = "";

  // Aniversariantes
  const aniversariantesNode = lists.aniversariantes.length
    ? el(
        "div",
        {},
        lists.aniversariantes.map((y) =>
          el("div", { class: "list-row" }, [
            el("div", { class: "list-row-main" }, [el("span", { class: "list-row-title" }, y.nome), el("span", { class: "list-row-sub" }, formatDateBR(y.dataNascimento))]),
          ])
        )
      )
    : emptyState({ icon: "cake", title: "Nenhum aniversariante no mês" });
  grid.appendChild(listCard("Aniversariantes do mês", "cake", aniversariantesNode));

  // Próximos eventos
  const eventosNode = lists.proximosEventos.length
    ? el(
        "div",
        {},
        lists.proximosEventos.map((e) =>
          el("div", { class: "list-row" }, [
            el("div", { class: "list-row-main" }, [
              el("span", { class: "list-row-title" }, e.titulo),
              el("span", { class: "list-row-sub" }, `${e.tipoLabel} · ${formatDateBR(e.data)} · ${e.cidadeNome || ""}`),
            ]),
          ])
        )
      )
    : emptyState({ icon: "calendar-x", title: "Nenhum evento futuro" });
  grid.appendChild(listCard("Próximos eventos", "calendar", eventosNode));

  // Recentes
  const recentesNode = lists.recentes.length
    ? el(
        "div",
        {},
        lists.recentes.map((y) =>
          el("div", { class: "list-row" }, [
            el("div", { class: "list-row-main" }, [el("span", { class: "list-row-title" }, y.nome), el("span", { class: "list-row-sub" }, `${y.cidadeNome || ""} · ${y.congregacaoNome || ""}`)]),
          ])
        )
      )
    : emptyState({ icon: "user-plus", title: "Nenhum jovem cadastrado recentemente" });
  grid.appendChild(listCard("Cadastrados recentemente", "user-plus", recentesNode));

  // Ranking cidades
  const maxCidade = Math.max(1, ...lists.cidadesRanking.map((c) => c.total));
  const cidadesNode = lists.cidadesRanking.length
    ? el(
        "div",
        {},
        lists.cidadesRanking.map((c, i) =>
          el("div", { class: "list-row" }, [
            el("div", { class: "rank-list-item", style: "flex:1;" }, [
              el("span", { class: "rank-badge" }, String(i + 1)),
              el("span", { class: "list-row-title", style: "flex:1;" }, c.nome),
              el("div", { class: "rank-bar-track", style: "width:80px;" }, [el("div", { class: "rank-bar-fill", style: `width:${(c.total / maxCidade) * 100}%` })]),
              el("span", {}, formatNumber(c.total)),
            ]),
          ])
        )
      )
    : emptyState({ icon: "map-pin", title: "Sem dados de cidades" });
  grid.appendChild(listCard("Cidades com mais jovens", "trophy", cidadesNode));

  // Ranking congregações
  const congregacoesNode = lists.congregacoesRanking.length
    ? el(
        "div",
        {},
        lists.congregacoesRanking.map((c, i) =>
          el("div", { class: "list-row" }, [
            el("div", { class: "list-row-main" }, [el("span", { class: "list-row-title" }, `${i + 1}. ${c.nome}`)]),
            el("span", {}, formatNumber(c.total)),
          ])
        )
      )
    : emptyState({ icon: "building-2", title: "Sem dados de congregações" });
  grid.appendChild(listCard("Congregações com mais jovens", "building-2", congregacoesNode));

  // Instrumentos
  const instrumentEntries = Object.entries(lists.instrumentGroups);
  const instrumentosNode = instrumentEntries.length
    ? el(
        "div",
        {},
        instrumentEntries.map(([instrumento, nomes]) =>
          el("div", { class: "list-row" }, [
            el("div", { class: "list-row-main" }, [el("span", { class: "list-row-title" }, instrumento.charAt(0).toUpperCase() + instrumento.slice(1))]),
            el("span", {}, `${nomes.length} jovem(ns)`),
          ])
        )
      )
    : emptyState({ icon: "music", title: "Nenhum instrumento cadastrado" });
  grid.appendChild(listCard("Jovens por instrumento", "music", instrumentosNode));

  // Alertas
  const alertasNode = lists.incompletos.length
    ? el(
        "div",
        {},
        lists.incompletos.map((y) =>
          el("div", { class: "list-row" }, [
            el("div", { class: "list-row-main" }, [el("span", { class: "list-row-title" }, y.nome), el("span", { class: "list-row-sub" }, `Faltando: ${y.faltando.join(", ")}`)]),
          ])
        )
      )
    : emptyState({ icon: "check-circle-2", title: "Nenhum cadastro incompleto" });
  grid.appendChild(listCard("Alertas de cadastros incompletos", "alert-triangle", alertasNode));

  refreshIcons();
}
