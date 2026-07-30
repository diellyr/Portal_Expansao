import { colorsForLabels, colorForLabel, buildPercentages } from "../utils/chart-utils.js";
import { formatNumber } from "../utils/formatters.js";

const registry = new Map();

function baseTooltip(unitLabel = "jovens") {
  return {
    callbacks: {
      label(ctx) {
        const value = ctx.parsed?.y ?? ctx.parsed ?? 0;
        const dataset = ctx.chart.data.datasets[0].data;
        const total = dataset.reduce((a, b) => a + b, 0);
        const pct = total ? ((value / total) * 100).toFixed(1) : 0;
        return ` ${ctx.label}: ${formatNumber(value)} ${unitLabel} (${pct}%)`;
      },
    },
  };
}

/** Destroys any previous Chart.js instance bound to this canvas id to avoid "canvas in use" errors. */
export function destroyChart(canvasId) {
  const existing = registry.get(canvasId);
  if (existing) {
    existing.destroy();
    registry.delete(canvasId);
  }
}

export function formatChartData(labels, values) {
  return {
    labels,
    values,
    percentages: buildPercentages(values),
    total: values.reduce((a, b) => a + b, 0),
  };
}

export function createPieChart(canvasEl, { labels, values, unitLabel }) {
  destroyChart(canvasEl.id);
  const colors = colorsForLabels(labels);
  const chart = new window.Chart(canvasEl, {
    type: "pie",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 1, borderColor: "#fff" }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: baseTooltip(unitLabel),
      },
    },
  });
  registry.set(canvasEl.id, chart);
  return chart;
}

export function createBarChart(canvasEl, { labels, values, unitLabel, horizontal = false }) {
  destroyChart(canvasEl.id);
  const colors = colorsForLabels(labels);
  const chart = new window.Chart(canvasEl, {
    type: "bar",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, maxBarThickness: 40 }],
    },
    options: {
      indexAxis: horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: baseTooltip(unitLabel),
      },
      scales: {
        x: { ticks: { autoSkip: false, maxRotation: horizontal ? 0 : 45, minRotation: 0 } },
        y: { beginAtZero: true },
      },
      onClick(evt, elements, chart) {
        if (!elements.length || !chart.options.onCategoryClick) return;
        const idx = elements[0].index;
        chart.options.onCategoryClick(chart.data.labels[idx]);
      },
    },
  });
  registry.set(canvasEl.id, chart);
  return chart;
}

export function createLineChart(canvasEl, { labels, values, unitLabel }) {
  destroyChart(canvasEl.id);
  const chart = new window.Chart(canvasEl, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: "#1d4ed8",
          backgroundColor: "rgba(29, 78, 216, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: baseTooltip(unitLabel),
      },
      scales: {
        x: { ticks: { autoSkip: true, maxRotation: 0 } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
  registry.set(canvasEl.id, chart);
  return chart;
}

/** One line per entry in `series` (e.g. one per city), sharing the same X-axis labels (e.g. years). */
export function createMultiLineChart(canvasEl, { labels, series, unitLabel = "jovens" }) {
  destroyChart(canvasEl.id);
  const datasets = series.map((s) => {
    const color = colorForLabel(s.label);
    return {
      label: s.label,
      data: s.values,
      borderColor: color,
      backgroundColor: color,
      fill: false,
      tension: 0.3,
      pointRadius: 2,
      pointHoverRadius: 4,
    };
  });
  const chart = new window.Chart(canvasEl, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ` ${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)} ${unitLabel}`;
            },
          },
        },
      },
      scales: {
        x: { ticks: { autoSkip: false, maxRotation: 0 } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
  registry.set(canvasEl.id, chart);
  return chart;
}

export function updateChart(canvasId, { labels, values }) {
  const chart = registry.get(canvasId);
  if (!chart) return;
  chart.data.labels = labels;
  chart.data.datasets[0].data = values;
  chart.data.datasets[0].backgroundColor = colorsForLabels(labels);
  chart.update();
}

export function setCategoryClickHandler(canvasId, handler) {
  const chart = registry.get(canvasId);
  if (chart) chart.options.onCategoryClick = handler;
}

export function getChart(canvasId) {
  return registry.get(canvasId);
}
