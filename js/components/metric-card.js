import { el, refreshIcons } from "../utils/dom-utils.js";
import { formatNumber } from "../utils/formatters.js";

export function metricCard({ title, value, icon, meta, tooltip, onClick, suffix = "" }) {
  const node = el(
    onClick ? "button" : "div",
    {
      type: onClick ? "button" : undefined,
      class: `surface metric-card${onClick ? " metric-card-clickable" : ""}`,
      "data-tooltip": tooltip || undefined,
      onClick: onClick || undefined,
    },
    [
      el("div", { class: "metric-card-top" }, [
        el("span", { class: "metric-card-title" }, title),
        el("div", { class: "metric-card-icon" }, [el("i", { "data-lucide": icon, class: "icon" })]),
      ]),
      el("div", { class: "metric-card-value" }, `${formatNumber(value)}${suffix}`),
      meta ? el("div", { class: "metric-card-meta" }, meta) : null,
    ]
  );
  refreshIcons();
  return node;
}

export function renderMetricCards(container, cards) {
  container.innerHTML = "";
  cards.forEach((card) => container.appendChild(metricCard(card)));
  refreshIcons();
}
