import { el, refreshIcons } from "../utils/dom-utils.js";

export function emptyState({ icon = "inbox", title = "Nenhum dado encontrado", description = "" }) {
  const node = el("div", { class: "empty-state" }, [
    el("i", { "data-lucide": icon, class: "icon" }),
    el("div", { class: "empty-state-title" }, title),
    description ? el("div", {}, description) : null,
  ]);
  refreshIcons();
  return node;
}

export function renderEmptyState(container, options) {
  container.innerHTML = "";
  container.appendChild(emptyState(options));
}
