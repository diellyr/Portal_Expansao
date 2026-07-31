import { createChartCard } from "../../components/chart-card.js";

/**
 * Turns a validated chart spec (response-schema.js already checked its
 * shape) into real chart cards using the app's existing chart-card.js/
 * chart-service.js -- the AI never generates chart-rendering code, only
 * this small, fixed {type, title, labels, datasets} JSON shape.
 *
 * Only "bar" and "pie" map directly to what chart-service.js already
 * renders; "doughnut" is shown as pie (same underlying data, closest
 * existing visual); "stacked-bar" (which the current chart engine has no
 * multi-dataset bar support for) renders as one bar chart per dataset
 * rather than fabricating a chart type that doesn't really exist yet.
 */
export function renderAiChart(container, chartSpec) {
  container.innerHTML = "";
  if (!chartSpec || !chartSpec.datasets?.length) return;

  const type = chartSpec.type === "doughnut" ? "pie" : chartSpec.type === "line" ? "line" : "bar";
  const datasetsToRender = chartSpec.type === "stacked-bar" ? chartSpec.datasets : [chartSpec.datasets[0]];

  datasetsToRender.forEach((dataset) => {
    const chart = createChartCard({
      title: datasetsToRender.length > 1 ? `${chartSpec.title} — ${dataset.label}` : chartSpec.title,
      defaultType: type,
      unitLabel: "jovens",
    });
    container.appendChild(chart.card);
    chart.setData(chartSpec.labels || [], dataset.data || []);
  });
}
