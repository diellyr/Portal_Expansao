import { el, refreshIcons } from "../utils/dom-utils.js";
import { createPieChart, createBarChart, createLineChart, createMultiLineChart, destroyChart, setCategoryClickHandler } from "../services/chart-service.js";
import { emptyState } from "./empty-state.js";
import { formatNumber, formatPercent } from "../utils/formatters.js";

let cardCounter = 0;

/**
 * Renders a chart card. `toggle: true` shows a Pizza/Barras switch (used for
 * datasets with many categories, e.g. the nine cities).
 */
export function createChartCard({ title, description, defaultType = "pie", toggle = false, unitLabel = "jovens", onCategoryClick }) {
  cardCounter += 1;
  const canvasId = `chart-${cardCounter}-${Date.now()}`;
  let currentType = defaultType;
  let currentLabels = [];
  let currentValues = [];

  const canvasWrap = el("div", { class: "chart-card-canvas-wrap" });
  const totalEl = el("div", { class: "chart-card-total" });
  const srTableWrap = el("div", { class: "chart-card-sr-table visually-hidden" });

  const pieBtn = el("button", { type: "button", class: currentType === "pie" ? "active" : "" }, "Pizza");
  const barBtn = el("button", { type: "button", class: currentType === "bar" ? "active" : "" }, "Barras");
  pieBtn.addEventListener("click", () => switchType("pie"));
  barBtn.addEventListener("click", () => switchType("bar"));

  const toggleEl = toggle ? el("div", { class: "chart-card-toggle" }, [pieBtn, barBtn]) : null;

  const card = el("div", { class: "surface chart-card" }, [
    el("div", { class: "chart-card-header" }, [
      el("div", {}, [
        el("div", { class: "chart-card-title" }, title),
        description ? el("p", { class: "chart-card-desc" }, description) : null,
      ]),
      el("div", { class: "chart-card-actions" }, [toggleEl].filter(Boolean)),
    ]),
    canvasWrap,
    totalEl,
    srTableWrap,
  ]);

  function renderCanvas() {
    canvasWrap.innerHTML = "";
    const canvas = el("canvas", { id: canvasId, role: "img", "aria-label": title });
    canvasWrap.appendChild(canvas);
    return canvas;
  }

  function renderSRTable(labels, values, total) {
    if (!labels.length) {
      srTableWrap.innerHTML = "";
      return;
    }
    const rows = labels
      .map(
        (label, i) =>
          `<tr><th scope="row">${label}</th><td>${formatNumber(values[i])}</td><td>${formatPercent(values[i], total)}</td></tr>`
      )
      .join("");
    srTableWrap.innerHTML = `<table class="sr-table"><caption>Tabela equivalente ao gráfico "${title}"</caption><thead><tr><th>Categoria</th><th>Quantidade</th><th>%</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function switchType(type) {
    currentType = type;
    pieBtn.classList.toggle("active", type === "pie");
    barBtn.classList.toggle("active", type === "bar");
    render();
  }

  function render() {
    destroyChart(canvasId);
    if (!currentValues.length || currentValues.every((v) => v === 0)) {
      canvasWrap.innerHTML = "";
      canvasWrap.appendChild(emptyState({ icon: "pie-chart", title: "Sem dados para este gráfico" }));
      totalEl.textContent = "";
      renderSRTable([], [], 0);
      return;
    }
    const canvas = renderCanvas();
    const total = currentValues.reduce((a, b) => a + b, 0);
    if (currentType === "pie") {
      createPieChart(canvas, { labels: currentLabels, values: currentValues, unitLabel });
    } else if (currentType === "line") {
      createLineChart(canvas, { labels: currentLabels, values: currentValues, unitLabel });
    } else {
      createBarChart(canvas, { labels: currentLabels, values: currentValues, unitLabel, horizontal: currentLabels.length > 6 });
    }
    if (onCategoryClick) setCategoryClickHandler(canvasId, onCategoryClick);
    totalEl.textContent = `Total considerado: ${formatNumber(total)} ${unitLabel}`;
    renderSRTable(currentLabels, currentValues, total);
    refreshIcons();
  }

  function setData(labels, values) {
    currentLabels = labels;
    currentValues = values;
    render();
  }

  return { card, setData, canvasId };
}

/**
 * Line chart with one line per entry in `series` (e.g. one per city) sharing
 * the same X-axis labels (e.g. years) -- used to compare trends across
 * categories instead of showing a single breakdown at one point in time.
 */
export function createMultiLineChartCard({ title, description, unitLabel = "jovens" }) {
  cardCounter += 1;
  const canvasId = `chart-${cardCounter}-${Date.now()}`;
  let currentLabels = [];
  let currentSeries = [];

  const canvasWrap = el("div", { class: "chart-card-canvas-wrap" });
  const srTableWrap = el("div", { class: "chart-card-sr-table visually-hidden" });

  const card = el("div", { class: "surface chart-card" }, [
    el("div", { class: "chart-card-header" }, [
      el("div", {}, [
        el("div", { class: "chart-card-title" }, title),
        description ? el("p", { class: "chart-card-desc" }, description) : null,
      ]),
    ]),
    canvasWrap,
    srTableWrap,
  ]);

  function renderCanvas() {
    canvasWrap.innerHTML = "";
    const canvas = el("canvas", { id: canvasId, role: "img", "aria-label": title });
    canvasWrap.appendChild(canvas);
    return canvas;
  }

  function renderSRTable() {
    if (!currentLabels.length || !currentSeries.length) {
      srTableWrap.innerHTML = "";
      return;
    }
    const headerCols = currentSeries.map((s) => `<th>${s.label}</th>`).join("");
    const rows = currentLabels
      .map((label, i) => {
        const cells = currentSeries.map((s) => `<td>${formatNumber(s.values[i] ?? 0)}</td>`).join("");
        return `<tr><th scope="row">${label}</th>${cells}</tr>`;
      })
      .join("");
    srTableWrap.innerHTML = `<table class="sr-table"><caption>Tabela equivalente ao gráfico "${title}"</caption><thead><tr><th>Ano</th>${headerCols}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  function render() {
    destroyChart(canvasId);
    const hasData = currentSeries.some((s) => s.values.some((v) => v > 0));
    if (!currentLabels.length || !currentSeries.length || !hasData) {
      canvasWrap.innerHTML = "";
      canvasWrap.appendChild(emptyState({ icon: "trending-up", title: "Sem dados para este gráfico" }));
      renderSRTable();
      return;
    }
    const canvas = renderCanvas();
    createMultiLineChart(canvas, { labels: currentLabels, series: currentSeries, unitLabel });
    renderSRTable();
    refreshIcons();
  }

  function setData(labels, series) {
    currentLabels = labels;
    currentSeries = series;
    render();
  }

  return { card, setData, canvasId };
}
