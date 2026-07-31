import { bootstrapPage } from "../app.js";
import { CityComparisonService } from "../services/city-comparison-service.js";
import { renderMetricCards } from "../components/metric-card.js";
import { renderDataTable } from "../components/data-table.js";
import { createChartCard } from "../components/chart-card.js";
import { averageCompleteness } from "../utils/completeness-utils.js";
import { qs, refreshIcons } from "../utils/dom-utils.js";
import { POUCOS_JOVENS_LIMITE } from "../config/constants.js";

/**
 * Regional overview across every city. Deliberately avoids any
 * competitive/comparative-shaming language ("melhor cidade", "pior cidade",
 * "cidade vencedora", "último lugar" are never used) -- extremes are framed
 * as "maior/menor quantidade registrada", "maior necessidade de
 * atualização", "região que pode precisar de apoio" and "oportunidade de
 * acompanhamento" instead, and the page always reminds that these numbers
 * only reflect what's registered in the system.
 */
const ok = await bootstrapPage({ activeKey: "cobertura-regional", title: "Painel de Cobertura Regional" });
if (ok) init();

async function init() {
  const data = await CityComparisonService.load();
  const cityIds = data.cities.map((c) => c.id);
  const rows = CityComparisonService.compare(cityIds, data);
  const congRows = CityComparisonService.congregationBreakdown(cityIds, data);

  renderSummary(data, rows);
  renderHighlights(rows);
  renderChart(rows);
  renderCityTable(rows);
  renderFaixaEtariaTable(rows);
  renderCongregationTable(congRows);
  refreshIcons();
}

function renderSummary(data, rows) {
  const comConselheiro = data.youth.filter((y) => !!y.conselheiroLocal).length;
  const percentualComConselheiro = data.youth.length ? Math.round((comConselheiro / data.youth.length) * 100) : 0;

  renderMetricCards(qs("#regional-summary-cards"), [
    { title: "Total de jovens na região", value: data.youth.length, icon: "users" },
    { title: "Cidades", value: rows.length, icon: "map-pin" },
    { title: "Congregações", value: data.congregations.length, icon: "building-2" },
    { title: "Completude média regional", value: averageCompleteness(data.youth), suffix: "%", icon: "gauge" },
    { title: "% regional com conselheiro local", value: percentualComConselheiro, suffix: "%", icon: "user-check" },
  ]);
}

function renderHighlights(rows) {
  const maxTotal = Math.max(...rows.map((r) => r.total));
  const minTotal = Math.min(...rows.map((r) => r.total));
  const maiorQtd = rows.filter((r) => r.total === maxTotal).map((r) => r.cidade);
  const menorQtd = rows.filter((r) => r.total === minTotal).map((r) => r.cidade);

  const comRegistros = rows.filter((r) => r.total > 0);
  let maiorCompletude = null;
  let menorCompletude = null;
  if (comRegistros.length) {
    const maxComp = Math.max(...comRegistros.map((r) => r.completudeMedia));
    const minComp = Math.min(...comRegistros.map((r) => r.completudeMedia));
    maiorCompletude = { cidades: comRegistros.filter((r) => r.completudeMedia === maxComp).map((r) => r.cidade), valor: maxComp };
    menorCompletude = { cidades: comRegistros.filter((r) => r.completudeMedia === minComp).map((r) => r.cidade), valor: minComp };
  }

  const oportunidade = rows.filter((r) => r.total <= POUCOS_JOVENS_LIMITE);

  renderMetricCards(qs("#regional-highlight-cards"), [
    {
      title: "Maior quantidade de jovens registrados",
      value: maiorQtd.join(", "),
      meta: `${maxTotal} jovem(ns) registrados`,
      icon: "trending-up",
    },
    {
      title: "Menor quantidade de jovens registrados",
      value: menorQtd.join(", "),
      meta: `${minTotal} jovem(ns) registrados`,
      icon: "trending-down",
    },
    {
      title: "Cadastro com maior índice de completude",
      value: maiorCompletude ? maiorCompletude.cidades.join(", ") : "Sem dados suficientes",
      meta: maiorCompletude ? `${maiorCompletude.valor}% de completude média` : "",
      icon: "badge-check",
    },
    {
      title: "Região que pode precisar de apoio",
      value: menorCompletude ? menorCompletude.cidades.join(", ") : "Sem dados suficientes",
      meta: menorCompletude ? `Completude média de ${menorCompletude.valor}% -- maior necessidade de atualização de cadastro` : "",
      icon: "hand-heart",
    },
    {
      title: "Oportunidade de acompanhamento",
      value: oportunidade.length,
      meta:
        oportunidade.length > 0
          ? `Cidade(s) com ${POUCOS_JOVENS_LIMITE} jovem(ns) ou menos registrados: ${oportunidade.map((r) => r.cidade).join(", ")}`
          : `Nenhuma cidade com ${POUCOS_JOVENS_LIMITE} jovem(ns) ou menos registrados`,
      icon: "heart-handshake",
    },
  ]);
}

function renderChart(rows) {
  const container = qs("#regional-chart");
  container.innerHTML = "";
  const chart = createChartCard({
    title: "Jovens registrados por cidade",
    description: "Reflete apenas os cadastros no sistema.",
    defaultType: "bar",
    unitLabel: "jovens",
  });
  container.appendChild(chart.card);
  chart.setData(rows.map((r) => r.cidade), rows.map((r) => r.total));
}

function renderCityTable(rows) {
  renderDataTable(qs("#regional-city-table"), {
    columns: [
      { key: "cidade", label: "Cidade" },
      { key: "total", label: "Jovens registrados" },
      { key: "congregacoes", label: "Congregações" },
      { key: "percentualComConselheiro", label: "% com conselheiro", render: (r) => `${r.percentualComConselheiro}%` },
      { key: "completudeMedia", label: "Completude média", render: (r) => `${r.completudeMedia}%` },
      { key: "musicos", label: "Músicos" },
      { key: "pregadores", label: "Pregadores" },
      { key: "cantores", label: "Cantores" },
    ],
    rows,
    emptyMessage: "Nenhuma cidade cadastrada.",
  });
}

function renderFaixaEtariaTable(rows) {
  const tableRows = CityComparisonService.ageDistributionRows(rows);
  renderDataTable(qs("#regional-faixa-etaria-table"), {
    columns: [
      { key: "faixa", label: "Faixa etária", sortable: false },
      ...rows.map((r) => ({ key: r.cidadeId, label: r.cidade, sortable: false })),
    ],
    rows: tableRows,
    emptyMessage: "Sem dados de faixa etária.",
  });
}

function renderCongregationTable(congRows) {
  renderDataTable(qs("#regional-congregacoes-table"), {
    columns: [
      { key: "congregacao", label: "Congregação" },
      { key: "cidade", label: "Cidade" },
      { key: "total", label: "Jovens" },
      { key: "comConselheiro", label: "Com conselheiro" },
      { key: "completudeMedia", label: "Completude média", render: (r) => `${r.completudeMedia}%` },
    ],
    rows: congRows,
    emptyMessage: "Nenhuma congregação cadastrada.",
  });
}

refreshIcons();
