import { el, refreshIcons } from "../utils/dom-utils.js";
import { formatNumber } from "../utils/formatters.js";

export function metricCard({ title, value, icon, meta, tooltip }) {
  const node = el("div", { class: "surface metric-card", "data-tooltip": tooltip || undefined }, [
    el("div", { class: "metric-card-top" }, [
      el("span", { class: "metric-card-title" }, title),
      el("div", { class: "metric-card-icon" }, [el("i", { "data-lucide": icon, class: "icon" })]),
    ]),
    el("div", { class: "metric-card-value" }, formatNumber(value)),
    meta ? el("div", { class: "metric-card-meta" }, meta) : null,
  ]);
  refreshIcons();
  return node;
}

export function renderMetricCards(container, cards) {
  container.innerHTML = "";
  cards.forEach((card) => container.appendChild(metricCard(card)));
  refreshIcons();
}
