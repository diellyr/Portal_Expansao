import { el } from "../utils/dom-utils.js";

export function loadingOverlay(text = "Carregando...") {
  return el("div", { class: "loading-overlay", role: "status", "aria-live": "polite" }, [
    el("span", { class: "spinner" }),
    el("span", {}, text),
  ]);
}

export function skeletonCards(count = 4) {
  const wrap = el("div", { class: "grid grid-cards" });
  for (let i = 0; i < count; i++) wrap.appendChild(el("div", { class: "skeleton skeleton-card" }));
  return wrap;
}

export function skeletonLines(count = 3) {
  const wrap = el("div", {});
  for (let i = 0; i < count; i++) wrap.appendChild(el("div", { class: "skeleton skeleton-line" }));
  return wrap;
}

export function renderLoading(container, text) {
  container.innerHTML = "";
  container.appendChild(loadingOverlay(text));
}
